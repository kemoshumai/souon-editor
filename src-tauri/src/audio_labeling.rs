use base64::{engine::general_purpose, Engine};
use symphonia::core::audio::{AudioBufferRef, Signal};
use symphonia::core::codecs::{DecoderOptions, CODEC_TYPE_VORBIS};
use symphonia::core::formats::FormatOptions;
use symphonia::core::io::MediaSourceStream;
use symphonia::core::meta::MetadataOptions;
use symphonia::core::probe::Hint;
use std::io::Cursor;
use aubio_rs::{Notes, Onset, OnsetMode, Smpl, Tempo};

// 改善された定数の定義
const BUF_SIZE: usize = 1024;  // より大きなバッファサイズで精度向上
const HOP_SIZE: usize = 512;   // バッファサイズの半分に設定
const I16_TO_SMPL: Smpl = 1.0 / (1 << 16) as Smpl;
const SILENCE_THRESHOLD: f32 = -50.0;  // dBでの無音閾値
const MIN_INTER_ONSET_INTERVAL: f64 = 0.05;  // 最小オンセット間隔（50ms）

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
    log::info!("Running improved onset detection with input base64 OGG Vorbis data");

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
    
    log::info!("Creating improved Notes analyzer...");
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

    // オンセット検出器も追加で使用
    log::info!("Creating Onset detector...");
    let mut onset_detector = match Onset::new(OnsetMode::Complex, BUF_SIZE, HOP_SIZE, sample_rate) {
        Ok(detector) => {
            log::info!("Onset detector created successfully");
            Some(detector)
        }
        Err(e) => {
            log::warn!("Failed to create Onset detector: {:?}", e);
            None
        }
    };
    
    // テンポ検出器も追加
    log::info!("Creating Tempo detector...");
    let _tempo_detector = match Tempo::new(OnsetMode::Complex, BUF_SIZE, HOP_SIZE, sample_rate) {
        Ok(detector) => {
            log::info!("Tempo detector created successfully");
            Some(detector)
        }
        Err(e) => {
            log::warn!("Failed to create Tempo detector: {:?}", e);
            None
        }
    };

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

    // 音声の前処理：正規化
    normalize_audio(&mut audio_samples);
    
    // ローパスフィルタを適用してノイズを除去
    apply_lowpass_filter(&mut audio_samples, sample_rate as f32);

    let mut results_f64: Vec<[f64; 3]> = Vec::new();
    let mut onset_times: Vec<f64> = Vec::new();

    // HOP_SIZEずつ処理
    let mut sample_index = 0;
    while sample_index + BUF_SIZE <= audio_samples.len() {
        let block = &audio_samples[sample_index..sample_index + BUF_SIZE];
        
        // 無音部分をスキップ
        if is_silence(block) {
            sample_index += HOP_SIZE;
            continue;
        }
        
        let time = sample_index as f64 / sample_rate as f64;
        
        // Notes検出
        let note_results = notes.do_result(block)
            .map_err(|e| format!("Notes processing error: {:?}", e))?;
            
        // オンセット検出（利用可能な場合のみ）
        let onset_detected = if let Some(ref mut detector) = onset_detector {
            match detector.do_result(block) {
                Ok(result) => result > 0.0,
                Err(_) => false,
            }
        } else {
            false
        };
        
        // オンセットが検出された場合
        if onset_detected {
            // 最小間隔チェック
            if onset_times.is_empty() || time - onset_times.last().unwrap() > MIN_INTER_ONSET_INTERVAL {
                onset_times.push(time);
                
                // このタイミングでのノート情報を優先的に記録
                for note in note_results {
                    if note.velocity > 0.3 {  // 閾値を設定して弱いノートを除外
                        results_f64.push([note.pitch as f64, note.velocity as f64, time]);
                    }
                }
            }
        } else {
            // オンセットがない場合でも、強いノートは記録
            for note in note_results {
                if note.velocity > 0.5 {  // より高い閾値
                    results_f64.push([note.pitch as f64, note.velocity as f64, time]);
                }
            }
        }

        sample_index += HOP_SIZE;
    }

    // 結果を時間順にソート
    results_f64.sort_by(|a, b| a[2].partial_cmp(&b[2]).unwrap());
    
    // 重複する近いタイミングのノートを統合
    let results_f64 = merge_close_notes(results_f64);

    log::info!("Detected {} notes/onsets", results_f64.len());
    Ok(results_f64)
}

// 音声正規化関数
fn normalize_audio(samples: &mut [f32]) {
    let max_amplitude = samples.iter().map(|&s| s.abs()).fold(0.0f32, f32::max);
    if max_amplitude > 0.0 {
        let scale = 0.95 / max_amplitude;
        for sample in samples.iter_mut() {
            *sample *= scale;
        }
    }
}

// 簡単なローパスフィルタ
fn apply_lowpass_filter(samples: &mut [f32], sample_rate: f32) {
    let cutoff = 8000.0; // 8kHzでカットオフ
    let rc = 1.0 / (2.0 * std::f32::consts::PI * cutoff);
    let dt = 1.0 / sample_rate;
    let alpha = dt / (rc + dt);
    
    if samples.len() > 1 {
        for i in 1..samples.len() {
            samples[i] = samples[i-1] + alpha * (samples[i] - samples[i-1]);
        }
    }
}

// 無音判定関数
fn is_silence(block: &[f32]) -> bool {
    let rms = (block.iter().map(|&s| s * s).sum::<f32>() / block.len() as f32).sqrt();
    let db = 20.0 * rms.log10();
    db < SILENCE_THRESHOLD
}

// 近いタイミングのノートを統合
fn merge_close_notes(notes: Vec<[f64; 3]>) -> Vec<[f64; 3]> {
    if notes.is_empty() {
        return notes;
    }
    
    let mut merged: Vec<[f64; 3]> = Vec::new();
    let mut current = notes[0];
    
    for note in notes.into_iter().skip(1) {
        // 時間差が50ms以内で、ピッチが近い場合は統合
        if (note[2] - current[2]).abs() < 0.05 && (note[0] - current[0]).abs() < 2.0 {
            // より強いベロシティを採用
            if note[1] > current[1] {
                current = note;
            }
        } else {
            merged.push(current);
            current = note;
        }
    }
    merged.push(current);
    
    merged
}
