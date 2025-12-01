use base64::{engine::general_purpose, Engine as _};
use tauri::Manager;

#[tauri::command]
pub async fn demucs(
    app_handle: tauri::AppHandle,
    input_base64: String,
    mime_type: String,
) -> Result<String, String> {
    log::info!(
        "Running Demucs with input base64 and MIME type: {}",
        mime_type
    );
    log::info!("Input data base64 length: {}", input_base64.len());
    // 入力のbase64をデコード
    let input_data = general_purpose::STANDARD
        .decode(&input_base64)
        .map_err(|e| format!("Failed to decode base64: {}", e))?;

    log::info!("Decoded input data length: {}", input_data.len());

    // 拡張子を取得
    let extension = match mime_type.as_str() {
        "audio/mpeg" | "audio/mp3" => "mp3",
        "audio/wav" | "audio/wave" => "wav",
        "audio/flac" => "flac",
        "audio/ogg" => "ogg",
        "audio/aac" => "aac",
        _ => mime_type.split('/').next_back().unwrap_or("wav"),
    };

    log::info!("Using extension: {}", extension);

    // 一時ファイルのパスを生成
    let temp_file = app_handle
        .path()
        .resolve(
            format!("demucs_input.{}", extension),
            tauri::path::BaseDirectory::AppLocalData,
        )
        .expect("Failed to resolve temporary file path");

    // 一時ファイルにデータを書き込む
    tokio::fs::write(&temp_file, input_data)
        .await
        .map_err(|e| format!("Failed to write temporary file: {}", e))?;

    // demucs.exeのパスを取得（AppLocalData）
    let demucs_path = app_handle
        .path()
        .resolve(
            "python_env/Scripts/demucs.exe",
            tauri::path::BaseDirectory::AppLocalData,
        )
        .expect("Failed to resolve demucs executable path");

    // 出力先を取得（AppLocalData）
    let output_dir = app_handle
        .path()
        .resolve("demucs_output", tauri::path::BaseDirectory::AppLocalData)
        .expect("Failed to resolve demucs_output directory");

    // AppLocalDataにoutputディレクトリが存在しない場合は作成
    if !tokio::fs::try_exists(&output_dir)
        .await
        .map_err(|e| format!("Failed to check if output directory exists: {}", e))?
    {
        tokio::fs::create_dir_all(&output_dir)
            .await
            .map_err(|e| format!("Failed to create demucs_output directory: {}", e))?;
    }

    // 出力先のフォルダ内にフォルダが存在する場合は削除
    let mut entries = tokio::fs::read_dir(&output_dir)
        .await
        .map_err(|e| format!("Failed to read demucs_output directory: {}", e))?;

    while let Some(entry) = entries
        .next_entry()
        .await
        .map_err(|e| format!("Failed to read entry in demucs_output directory: {}", e))?
    {
        let metadata = entry
            .metadata()
            .await
            .map_err(|e| format!("Failed to get metadata: {}", e))?;
        if metadata.is_dir() {
            tokio::fs::remove_dir_all(entry.path())
                .await
                .map_err(|e| format!("Failed to remove directory: {}", e))?;
        }
    }

    log::info!("Running Demucs...");

    // demucsを実行
    let mut command = tokio::process::Command::new(&demucs_path);
    command
        .arg(&temp_file)
        .arg("-o")
        .arg(&output_dir)
        .env("PYTHONUSERBASE", "") // ユーザーサイトパッケージを無効化
        .env("PYTHONPATH", ""); // PYTHONPATH をクリア

    #[cfg(target_os = "windows")]
    {
        const CREATE_NO_WINDOW: u32 = 0x08000000;
        command.creation_flags(CREATE_NO_WINDOW);
    }

    let output = command
        .output()
        .await
        .map_err(|e| format!("Failed to execute demucs: {}", e))?;

    log::info!("Done.");

    if !output.status.success() {
        return Err(format!(
            "Failed to run demucs: {}",
            String::from_utf8_lossy(&output.stderr)
        ));
    }

    // 出力先のフォルダ内に存在するwavファイルを再帰的に検索
    let mut output_files = Vec::new();
    search_wav_files(&output_dir, &mut output_files).await?;

    if output_files.is_empty() {
        return Err("No output files found".to_string());
    }

    if output_files.len() != 4 {
        return Err("Unexpected number of output files found".to_string());
    }

    // bass,drums,other,vocalsの順で出力ファイルを並べ替え
    output_files.sort_by(|a, b| {
        let a_path = std::path::Path::new(a);
        let b_path = std::path::Path::new(b);
        let a_name = a_path.file_stem().unwrap_or_default();
        let b_name = b_path.file_stem().unwrap_or_default();
        a_name.cmp(b_name)
    });

    // その順番でvorbis形式に変換しbase64にする
    let mut vorbis_files = Vec::new();
    for wav_file in output_files {
        let wav_path = std::path::Path::new(&wav_file);
        let output_base64 = tokio::task::spawn_blocking({
            let wav_path = wav_path.to_owned();
            move || convert_to_vorbis(&wav_path)
        })
        .await
        .map_err(|e| format!("Failed to convert to vorbis: {}", e))?;
        vorbis_files.push(output_base64);
    }

    // output_filesを\nで結合して返す
    Ok(vorbis_files.join("\n"))
}

pub fn convert_to_vorbis(wav_path: &std::path::Path) -> String {
    // WAVファイルを読み込み
    let mut wav_reader = match hound::WavReader::open(wav_path) {
        Ok(reader) => reader,
        Err(e) => {
            log::info!("Failed to open WAV file {}: {}", wav_path.display(), e);
            return String::new();
        }
    };

    let spec = wav_reader.spec();
    log::info!(
        "WAV spec: channels={}, sample_rate={}, bits_per_sample={}",
        spec.channels,
        spec.sample_rate,
        spec.bits_per_sample
    );

    // サンプルデータを読み取り
    let samples: Result<Vec<f32>, _> = wav_reader
        .samples::<i16>()
        .map(|s| s.map(|sample| sample as f32 / 32768.0))
        .collect();

    let samples = match samples {
        Ok(samples) => samples,
        Err(e) => {
            log::info!("Failed to read samples from WAV file: {}", e);
            return String::new();
        }
    };

    // Vorbisエンコーダーを作成
    let mut encoder = match vorbis_encoder::Encoder::new(
        spec.channels as u32,
        spec.sample_rate as u64,
        1.0, // Maximum quality (0.0 to 1.0)
    ) {
        Ok(encoder) => encoder,
        Err(e) => {
            log::info!("Failed to create Vorbis encoder: {}", e);
            return String::new();
        }
    };

    // エンコード用のバッファを準備
    let mut output_data = Vec::new();

    // f32サンプルをi16に変換
    let i16_samples: Vec<i16> = samples
        .iter()
        .map(|&sample| (sample * 32767.0).clamp(-32768.0, 32767.0) as i16)
        .collect();

    // エンコード実行
    match encoder.encode(&i16_samples) {
        Ok(data) => output_data.extend_from_slice(&data),
        Err(e) => {
            log::info!("Failed to encode audio data: {}", e);
            return String::new();
        }
    }

    // ファイナライズ
    match encoder.flush() {
        Ok(data) => output_data.extend_from_slice(&data),
        Err(e) => {
            log::info!("Failed to flush encoder: {}", e);
            return String::new();
        }
    }
    // Base64エンコード
    general_purpose::STANDARD.encode(&output_data)
}

pub async fn search_wav_files(
    dir: &std::path::Path,
    output_files: &mut Vec<String>,
) -> Result<(), String> {
    search_wav_files_impl(dir, output_files).await
}

fn search_wav_files_impl<'a>(
    dir: &'a std::path::Path,
    output_files: &'a mut Vec<String>,
) -> std::pin::Pin<Box<dyn std::future::Future<Output = Result<(), String>> + Send + 'a>> {
    Box::pin(async move {
        let mut entries = tokio::fs::read_dir(dir)
            .await
            .map_err(|e| format!("Failed to read directory {}: {}", dir.display(), e))?;

        while let Some(entry) = entries
            .next_entry()
            .await
            .map_err(|e| format!("Failed to read entry in directory {}: {}", dir.display(), e))?
        {
            let path = entry.path();
            let metadata = entry
                .metadata()
                .await
                .map_err(|e| format!("Failed to get metadata: {}", e))?;
            if metadata.is_dir() {
                search_wav_files_impl(&path, output_files).await?;
            } else if path.extension().and_then(|s| s.to_str()) == Some("wav") {
                output_files.push(path.to_string_lossy().to_string());
            }
        }
        Ok(())
    })
}
