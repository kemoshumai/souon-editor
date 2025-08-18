use base64::{engine::general_purpose, Engine};
use symphonia::core::audio::{AudioBufferRef, Signal};
use symphonia::core::codecs::{DecoderOptions, CODEC_TYPE_VORBIS};
use symphonia::core::formats::FormatOptions;
use symphonia::core::io::MediaSourceStream;
use symphonia::core::meta::MetadataOptions;
use symphonia::core::probe::Hint;
use std::io::Cursor;
use aubio_rs::{Notes, Smpl};

// 定数の定義
const BUF_SIZE: usize = 512;
const HOP_SIZE: usize = 256;
const I16_TO_SMPL: Smpl = 1.0 / (1 << 16) as Smpl;

#[tauri::command]
pub async fn onset(
    _app_handle: tauri::AppHandle,
    input_base64_ogg_vorbis: String
) -> Result<Vec<[f64; 3]>, String> {
    // 重い処理を別スレッドで実行
    tokio::task::spawn_blocking(move || {
        onset_blocking(input_base64_ogg_vorbis)
    })
    .await
    .map_err(|e| format!("Task join error: {}", e))?
}

fn onset_blocking(input_base64_ogg_vorbis: String) -> Result<Vec<[f64; 3]>, String> {
    log::info!("Running onset detection with input base64 OGG Vorbis data");

    log::info!("Starting base64 decode...");
    // Data URLのプレフィックス "data:audio/ogg;base64," を除去
    let base64_data = if let Some(stripped) = input_base64_ogg_vorbis.strip_prefix("data:audio/ogg;base64,") {
        log::info!("Removing data URL prefix");
        stripped
    } else {
        log::info!("No data URL prefix found, using input as-is");
        &input_base64_ogg_vorbis
    };
    
    let input_data = match general_purpose::STANDARD.decode(base64_data) {
        Ok(data) => {
            log::info!("Base64 decode completed, data size: {} bytes", data.len());
            data
        }
        Err(e) => {
            log::error!("Failed to decode base64: {}", e);
            return Err(format!("Failed to decode base64: {}", e));
        }
    };

    // Symphoniaを使用してOGGファイルを読み込む
    log::info!("Creating media source stream...");
    let cursor = Cursor::new(input_data);
    let media_source = MediaSourceStream::new(Box::new(cursor), Default::default());
    
    let mut hint = Hint::new();
    hint.with_extension("ogg");

    let meta_opts: MetadataOptions = Default::default();
    let fmt_opts: FormatOptions = Default::default();

    log::info!("Starting format probing...");
    let probed = match symphonia::default::get_probe()
        .format(&hint, media_source, &fmt_opts, &meta_opts) {
        Ok(probed) => {
            log::info!("Format probing completed");
            probed
        }
        Err(e) => {
            log::error!("Failed to probe format: {}", e);
            return Err(format!("Failed to probe format: {}", e));
        }
    };

    let mut format = probed.format;
    
    log::info!("Searching for Vorbis track...");
    let track = format
        .tracks()
        .iter()
        .find(|t| t.codec_params.codec == CODEC_TYPE_VORBIS)
        .ok_or("No Vorbis track found")?;
    log::info!("Vorbis track found");

    let track_id = track.id;
    let sample_rate = track.codec_params.sample_rate.unwrap_or(44100);
    log::info!("Track ID: {}, Sample rate: {}", track_id, sample_rate);

    log::info!("Creating decoder...");
    let mut decoder = match symphonia::default::get_codecs()
        .make(&track.codec_params, &DecoderOptions { verify: false }) {
        Ok(decoder) => {
            log::info!("Decoder created successfully");
            decoder
        }
        Err(e) => {
            log::error!("Failed to create decoder: {}", e);
            return Err(format!("Failed to create decoder: {}", e));
        }
    };
    
    log::info!("Creating Notes analyzer...");
    let mut notes = match Notes::new(BUF_SIZE, HOP_SIZE, sample_rate) {
        Ok(notes) => {
            log::info!("Notes analyzer created successfully");
            notes
        }
        Err(e) => {
            log::error!("Failed to create Notes: {:?}", e);
            return Err(format!("Failed to create Notes: {:?}", e));
        }
    };
    let period = 1.0 / sample_rate as Smpl;

    let mut time = 0.0;
    let mut offset = 0;
    let mut audio_samples: Vec<f32> = Vec::new();

    log::info!("Decoding audio samples");

    // すべてのオーディオデータをデコード
    while let Ok(packet) = format.next_packet() {
        if packet.track_id() != track_id {
            continue;
        }

        match decoder.decode(&packet) {
            Ok(audio_buf) => {
                // AudioBufferRefからサンプルを抽出
                match audio_buf {
                    AudioBufferRef::F32(buf) => {
                        // チャンネル0のデータを取得（モノラル化）
                        let channel_data = buf.chan(0);
                        audio_samples.extend_from_slice(channel_data);
                    }
                    AudioBufferRef::S16(buf) => {
                        // S16をf32に変換
                        let channel_data = buf.chan(0);
                        for &sample in channel_data {
                            audio_samples.push(sample as f32 * I16_TO_SMPL);
                        }
                    }
                    _ => {
                        return Err("Unsupported audio format".to_string());
                    }
                }
            }
            Err(e) => {
                return Err(format!("Decode error: {}", e));
            }
        }
    }

    log::info!("Finished decoding audio samples");

    log::info!("Extracted audio samples: {}", audio_samples.len());

    let mut results_f64: Vec<[f64; 3]> = Vec::new();

    // HOP_SIZEずつ処理
    let mut sample_index = 0;
    while sample_index + HOP_SIZE <= audio_samples.len() {
        let block = &audio_samples[sample_index..sample_index + HOP_SIZE];
        
        let results = notes.do_result(block)
            .map_err(|e| format!("Notes processing error: {:?}", e))?;
            
        for note in results {
            results_f64.push([note.pitch as f64, note.velocity as f64, time]);
        }

        offset += HOP_SIZE;
        time = (offset as Smpl * period) as f64;
        sample_index += HOP_SIZE;
    }

    log::info!("{}", time);
    Ok(results_f64)
}
