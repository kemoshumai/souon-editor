use std::{path::PathBuf, process::exit, sync::Mutex};

use base64::{engine::general_purpose, Engine as _};
use tauri::{Manager, State};
use tauri_plugin_dialog::DialogExt;

#[cfg(target_os = "windows")]
use std::os::windows::process::CommandExt;

// ディレクトリを再帰的にコピーするヘルパー関数
fn copy_dir_recursive(src: &std::path::Path, dst: &std::path::Path) -> std::io::Result<()> {
    std::fs::create_dir_all(dst)?;

    for entry in std::fs::read_dir(src)? {
        let entry = entry?;
        let path = entry.path();
        let dest_path = dst.join(entry.file_name());

        if path.is_dir() {
            copy_dir_recursive(&path, &dest_path)?;
        } else {
            std::fs::copy(&path, &dest_path)?;
        }
    }

    Ok(())
}

#[tauri::command]
async fn set_title(window: tauri::Window, title: &str) -> Result<(), tauri::Error> {
    println!("Setting title to: {}", title);
    window.set_title(title)
}

#[tauri::command]
fn set_saved(saved: bool, state: State<'_, Mutex<AppState>>) {
    let mut state = state.lock().unwrap();
    state.saved = saved;
}

#[tauri::command]
fn check_python(app_handle: tauri::AppHandle) -> Result<String, String> {
    log::info!("Checking Python environment...");

    // AppLocalDataのPython環境パスを取得
    let local_python_path = app_handle
        .path()
        .resolve(
            "python_env/python.exe",
            tauri::path::BaseDirectory::AppLocalData,
        )
        .expect("Failed to resolve local Python executable path");



    // AppLocalDataにPython環境が存在しない場合、Resourceからコピー
    if !local_python_path.exists() {
        log::info!("Local Python environment not found, copying from bundle...");

        let resource_python_dir = app_handle
            .path()
            .resolve("python_env", tauri::path::BaseDirectory::Resource)
            .expect("Failed to resolve bundled Python directory path");

        let local_python_dir = app_handle
            .path()
            .resolve("python_env", tauri::path::BaseDirectory::AppLocalData)
            .expect("Failed to resolve local Python directory path");

        if !resource_python_dir.exists() {
            return Err(format!(
                "Bundled Python environment not found at: {}",
                resource_python_dir.to_string_lossy()
            ));
        }

        // AppLocalDataディレクトリが存在しない場合は作成
        if let Some(parent) = local_python_dir.parent() {
            std::fs::create_dir_all(parent)
                .map_err(|e| format!("Failed to create AppLocalData directory: {}", e))?;
        }

        // Python環境をコピー
        copy_dir_recursive(&resource_python_dir, &local_python_dir)
            .map_err(|e| format!("Failed to copy Python environment: {}", e))?;

        log::info!(
            "Python environment copied to: {}",
            local_python_dir.to_string_lossy()
        );
    }

    let local_pip_path = app_handle
        .path()
        .resolve(
            "python_env/Scripts/pip.exe",
            tauri::path::BaseDirectory::AppLocalData,
        )
        .expect("Failed to resolve pip executable path");

    log::info!(
        "Python executable path: {}",
        local_python_path.to_string_lossy()
    );
    log::info!("Python executable exists: {}", local_python_path.exists());
    log::info!("Pip executable path: {}", local_pip_path.to_string_lossy());
    log::info!("Pip executable exists: {}", local_pip_path.exists());

    // pipが存在しない場合インストール
    let python_script = if !local_pip_path.exists() {
        log::info!("Pip not found, installing...");

        let python_script = app_handle
            .path()
            .resolve(
                "python_env/get-pip.py",
                tauri::path::BaseDirectory::AppLocalData,
            )
            .expect("Failed to resolve get-pip.py script path");

        log::info!("get-pip.py path: {}", python_script.to_string_lossy());
        log::info!("get-pip.py exists: {}", python_script.exists());

        // Pythonの実行可能性をチェック
        if !local_python_path.exists() {
            return Err(format!(
                "Python executable not found at: {}",
                local_python_path.to_string_lossy()
            ));
        }

        if !python_script.exists() {
            return Err(format!(
                "get-pip.py script not found at: {}",
                python_script.to_string_lossy()
            ));
        }

        // Pythonを実行してpipをインストール
        let mut command = std::process::Command::new(&local_python_path);
        let command = command.arg(&python_script);

        #[cfg(target_os = "windows")]
        {
            const CREATE_NO_WINDOW: u32 = 0x08000000;
            command.creation_flags(CREATE_NO_WINDOW);
        }

        let output = command.output().map_err(|e| {
            format!(
                "Failed to execute Python script: {} (command: {} {})",
                e,
                local_python_path.to_string_lossy(),
                python_script.to_string_lossy()
            )
        })?;

        log::info!(
            "pip install stdout: {}",
            String::from_utf8_lossy(&output.stdout)
        );
        log::info!(
            "pip install stderr: {}",
            String::from_utf8_lossy(&output.stderr)
        );

        if !output.status.success() {
            return Err(format!(
                "Failed to install pip: {}",
                String::from_utf8_lossy(&output.stderr)
            ));
        }

        python_script
    } else {
        PathBuf::new()
    };

    // 全部の絶対パスを"\n"区切りで返す
    Ok(format!(
        "{}\n{}",
        local_python_path.to_string_lossy(),
        python_script.to_string_lossy()
    ))
}

#[tauri::command]
fn check_demucs(app_handle: tauri::AppHandle) -> Result<String, String> {
    log::info!("Checking Demucs environment...");

    // demucsのパスを取得（AppLocalDataのpython_env/Scripts/demucs.exe）
    let demucs_path = app_handle
        .path()
        .resolve(
            "python_env/Scripts/demucs.exe",
            tauri::path::BaseDirectory::AppLocalData,
        )
        .expect("Failed to resolve demucs executable path");

    log::info!("Demucs executable path: {}", demucs_path.to_string_lossy());
    log::info!("Demucs executable exists: {}", demucs_path.exists());

    // demucsが存在しない場合インストール
    if !demucs_path.exists() {
        // Pythonの同梱先を取得（AppLocalData）
        let local_python_path = app_handle
            .path()
            .resolve(
                "python_env/python.exe",
                tauri::path::BaseDirectory::AppLocalData,
            )
            .expect("Failed to resolve Python executable path");

        log::info!("Demucs not found, installing...");
        log::info!("Using Python at: {}", local_python_path.to_string_lossy());

        // Pythonの実行可能性をチェック
        if !local_python_path.exists() {
            return Err(format!(
                "Python executable not found at: {}",
                local_python_path.to_string_lossy()
            ));
        }

        // pipの直接パスを取得
        // pipを実行し依存関係をインストール（python.exe -m pip install --upgrade setuptools wheel）
        let mut command = std::process::Command::new(&local_python_path);
        command
            .arg("-m")
            .arg("pip")
            .arg("install")
            .arg("--isolated")
            .arg("--ignore-installed")
            .arg("--upgrade")
            .arg("setuptools")
            .arg("wheel")
            .arg("soundfile");

        #[cfg(target_os = "windows")]
        {
            const CREATE_NO_WINDOW: u32 = 0x08000000;
            command.creation_flags(CREATE_NO_WINDOW);
        }

        let output = command
            .output()
            .map_err(|e| format!("Failed to execute pip for dependencies: {} (command: {} -m pip install --upgrade setuptools wheel soundfile)", 
                e, local_python_path.to_string_lossy()))?;

        log::info!(
            "Dependencies install stdout: {}",
            String::from_utf8_lossy(&output.stdout)
        );
        log::info!(
            "Dependencies install stderr: {}",
            String::from_utf8_lossy(&output.stderr)
        );

        if !output.status.success() {
            return Err(format!(
                "Failed to install dependencies: {}",
                String::from_utf8_lossy(&output.stderr)
            ));
        }

        // demucsをインストール
        let mut command = std::process::Command::new(&local_python_path);

        command
            .arg("-m")
            .arg("pip")
            .arg("install")
            .arg("--isolated")
            .arg("--ignore-installed")
            .arg("--upgrade")
            .arg("demucs")
            .env("PYTHONUSERBASE", "") // ユーザーサイトパッケージを無効化
            .env("PYTHONPATH", ""); // PYTHONPATH をクリア

        #[cfg(target_os = "windows")]
        {
            const CREATE_NO_WINDOW: u32 = 0x08000000;
            command.creation_flags(CREATE_NO_WINDOW);
        }

        let output = command.output().map_err(|e| {
            format!(
                "Failed to execute pip for demucs: {} (command: {} -m pip install --upgrade demucs)",
                e,
                local_python_path.to_string_lossy()
            )
        })?;

        // stdoutとstderrを出力
        let stdout = String::from_utf8_lossy(&output.stdout);
        let stderr = String::from_utf8_lossy(&output.stderr);

        if !stdout.is_empty() {
            log::info!("[DEMUCS INSTALL STDOUT] {}", stdout);
        }

        if !stderr.is_empty() {
            log::info!("[DEMUCS INSTALL STDERR] {}", stderr);
        }

        if !output.status.success() {
            return Err(format!(
                "Failed to install demucs: exit code {}. Error: {}",
                output.status.code().unwrap_or(-1),
                stderr
            ));
        }
    }

    log::info!("Demucs is ready at: {}", demucs_path.to_string_lossy());

    // demucs.exeの絶対パスを返す
    Ok(demucs_path.to_string_lossy().to_string())
}

#[tauri::command]
fn demucs(
    app_handle: tauri::AppHandle,
    input_base64: &str,
    mime_type: &str,
) -> Result<String, String> {
    log::info!(
        "Running Demucs with input base64 and MIME type: {}",
        mime_type
    );
    log::info!("Input data base64 length: {}", input_base64.len());
    // 入力のbase64をデコード
    let input_data = general_purpose::STANDARD
        .decode(input_base64)
        .map_err(|e| format!("Failed to decode base64: {}", e))?;

    log::info!("Decoded input data length: {}", input_data.len());

    // 拡張子を取得
    let extension = match mime_type {
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
    std::fs::write(&temp_file, input_data)
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
    if !output_dir.exists() {
        std::fs::create_dir_all(&output_dir)
            .map_err(|e| format!("Failed to create demucs_output directory: {}", e))?;
    }

    // 出力先のフォルダ内にフォルダが存在する場合は削除
    for entry in std::fs::read_dir(&output_dir)
        .map_err(|e| format!("Failed to read demucs_output directory: {}", e))?
    {
        let entry =
            entry.map_err(|e| format!("Failed to read entry in demucs_output directory: {}", e))?;
        if entry
            .file_type()
            .map_err(|e| format!("Failed to get file type: {}", e))?
            .is_dir()
        {
            std::fs::remove_dir_all(entry.path())
                .map_err(|e| format!("Failed to remove directory: {}", e))?;
        }
    }

    log::info!("Running Demucs...");

    // demucsを実行
    let output = std::process::Command::new(&demucs_path)
        .arg(&temp_file)
        .arg("-o")
        .arg(&output_dir)
        .env("PYTHONUSERBASE", "") // ユーザーサイトパッケージを無効化
        .env("PYTHONPATH", "") // PYTHONPATH をクリア
        .output()
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
    search_wav_files(&output_dir, &mut output_files)?;

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
        let output_base64 = convert_to_vorbis(wav_path);
        vorbis_files.push(output_base64);
    }

    // output_filesを\nで結合して返す
    Ok(vorbis_files.join("\n"))
}

fn convert_to_vorbis(wav_path: &std::path::Path) -> String {
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
        spec.channels, spec.sample_rate, spec.bits_per_sample
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

fn search_wav_files(dir: &std::path::Path, output_files: &mut Vec<String>) -> Result<(), String> {
    for entry in std::fs::read_dir(dir)
        .map_err(|e| format!("Failed to read directory {}: {}", dir.display(), e))?
    {
        let entry = entry
            .map_err(|e| format!("Failed to read entry in directory {}: {}", dir.display(), e))?;
        let path = entry.path();
        if path.is_dir() {
            search_wav_files(&path, output_files)?;
        } else if path.extension().and_then(|s| s.to_str()) == Some("wav") {
            output_files.push(path.to_string_lossy().to_string());
        }
    }
    Ok(())
}

#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn run() {
    tauri::Builder::default()
        .plugin(tauri_plugin_log::Builder::new().build())
        .manage(Mutex::new(AppState { saved: false }))
        .on_window_event(|window, event| {
            if let tauri::WindowEvent::CloseRequested { api, .. } = event {
                let state = window.try_state::<Mutex<AppState>>().unwrap();
                {
                    let state = state.lock().unwrap();
                    if state.saved {
                        exit(0);
                    } else {
                        let answer = window
                            .dialog()
                            .message("本当に終了しますか？")
                            .title("変更が保存されていません。")
                            .buttons(tauri_plugin_dialog::MessageDialogButtons::OkCancel)
                            .blocking_show();
                        if answer {
                            exit(0);
                        } else {
                            api.prevent_close();
                        }
                    }
                }
            }
        })
        .plugin(tauri_plugin_shell::init())
        .plugin(tauri_plugin_dialog::init())
        .plugin(tauri_plugin_opener::init())
        .plugin(tauri_plugin_fs::init())
        .plugin(
            tauri_plugin_log::Builder::new()
                .target(tauri_plugin_log::Target::new(
                    tauri_plugin_log::TargetKind::Webview,
                ))
                .build()
        )
        .invoke_handler(tauri::generate_handler![
            set_title,
            set_saved,
            check_python,
            check_demucs,
            demucs
        ])
        .run(tauri::generate_context!())
        .expect("error while running tauri application");
}

struct AppState {
    saved: bool,
}
