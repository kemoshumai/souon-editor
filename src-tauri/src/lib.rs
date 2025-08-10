use std::{process::exit, sync::Mutex};

use tauri::{Manager, State};
use tauri_plugin_dialog::DialogExt;

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

    println!("Checking Python environment...");

    // Pythonの同梱先を取得
    let resource_path = app_handle.path()
        .resolve("python_env/python.exe", tauri::path::BaseDirectory::Resource)
        .expect("Failed to resolve Python executable path");

    println!("Python executable path: {}", resource_path.to_string_lossy());

    // pipのパスを取得
    let pip_path = app_handle.path()
        .resolve("python_env/Scripts/pip.exe", tauri::path::BaseDirectory::Resource)
        .expect("Failed to resolve pip executable path");

    println!("Pip executable path: {}", pip_path.to_string_lossy());

    // pipが存在しない場合インストール
    if !pip_path.exists() {

        println!("Pip not found, installing...");

        let python_script = app_handle.path()
            .resolve("python_env/get-pip.py", tauri::path::BaseDirectory::Resource)
            .expect("Failed to resolve get-pip.py script path");

        // Pythonを実行してpipをインストール
        let output = std::process::Command::new(&resource_path)
            .arg(python_script)
            .output()
            .map_err(|e| format!("Failed to execute Python script: {}", e))?;

        if !output.status.success() {
            return Err(format!("Failed to install pip: {}", String::from_utf8_lossy(&output.stderr)));
        }
        
    }

    // python.exeの絶対パスを返す
    Ok(resource_path.to_string_lossy().to_string())
}

#[tauri::command]
fn check_demucs(app_handle: tauri::AppHandle) -> Result<String, String> {

    println!("Checking Demucs environment...");

    // demucsのパスを取得（python_env/Scripts/demucs.exe）
    let demucs_path = app_handle.path()
        .resolve("python_env/Scripts/demucs.exe", tauri::path::BaseDirectory::Resource)
        .expect("Failed to resolve demucs executable path");

    println!("Demucs executable path: {}", demucs_path.to_string_lossy());

    // demucsが存在しない場合インストール
    if !demucs_path.exists() {
        // Pythonの同梱先を取得
        let resource_path = app_handle.path()
            .resolve("python_env/python.exe", tauri::path::BaseDirectory::Resource)
            .expect("Failed to resolve Python executable path");

        println!("Demucs not found, installing...");

        // Pythonを実行し依存関係をインストール（python.exe -m pip install --upgrade setuptools wheel）
        let output = std::process::Command::new(&resource_path)
            .arg("-m")
            .arg("pip")
            .arg("install")
            .arg("--upgrade")
            .arg("setuptools")
            .arg("wheel")
            .arg("soundfile")
            .output()
            .map_err(|e| format!("Failed to execute Python script: {}", e))?;

        if !output.status.success() {
            return Err(format!("Failed to install dependencies: {}", String::from_utf8_lossy(&output.stderr)));
        }

        // demucsをインストール
        let output = std::process::Command::new(&resource_path)
            .arg("-m")
            .arg("pip")
            .arg("install")
            .arg("--upgrade")
            .arg("demucs")
            .output()
            .map_err(|e| format!("Failed to execute Python script: {}", e))?;

        // stdoutとstderrを出力
        let stdout = String::from_utf8_lossy(&output.stdout);
        let stderr = String::from_utf8_lossy(&output.stderr);
        
        if !stdout.is_empty() {
            println!("[STDOUT] {}", stdout);
        }
        
        if !stderr.is_empty() {
            println!("[STDERR] {}", stderr);
        }

        if !output.status.success() {
            return Err(format!("Failed to install demucs: exit code {}. Error: {}", 
                output.status.code().unwrap_or(-1), stderr));
        }
    }

    println!("Demucs is ready at: {}", demucs_path.to_string_lossy());

    // demucs.exeの絶対パスを返す
    Ok(demucs_path.to_string_lossy().to_string())
}

#[tauri::command]
fn demucs(app_handle: tauri::AppHandle, input_base64: &str, mime_type: &str) -> Result<String, String> {

    println!("Running Demucs with input base64 and MIME type: {}", mime_type);
    println!("Input data base64 length: {}", input_base64.len());

    // 入力のbase64をデコード
    let input_data = base64::decode(input_base64).map_err(|e| format!("Failed to decode base64: {}", e))?;

    println!("Decoded input data length: {}", input_data.len());

    // 拡張子を取得
    let extension = match mime_type {
        "audio/mpeg" | "audio/mp3" => "mp3",
        "audio/wav" | "audio/wave" => "wav",
        "audio/flac" => "flac",
        "audio/ogg" => "ogg",
        "audio/aac" => "aac",
        _ => mime_type.split('/').next_back().unwrap_or("wav")
    };

    println!("Using extension: {}", extension);

    // 一時ファイルのパスを生成
    let temp_file = app_handle.path()
        .resolve(format!("demucs_input.{}", extension), tauri::path::BaseDirectory::AppLocalData)
        .expect("Failed to resolve temporary file path");

    // 一時ファイルにデータを書き込む
    std::fs::write(&temp_file, input_data).map_err(|e| format!("Failed to write temporary file: {}", e))?;

    // demucs.exeのパスを取得
    let demucs_path = app_handle.path()
        .resolve("python_env/Scripts/demucs.exe", tauri::path::BaseDirectory::Resource)
        .expect("Failed to resolve demucs executable path");

    // 出力先を取得（AppLocalData）
    let output_dir = app_handle.path()
        .resolve("demucs_output", tauri::path::BaseDirectory::AppLocalData)
        .expect("Failed to resolve demucs_output directory");

    // AppLocalDataにoutputディレクトリが存在しない場合は作成
    if !output_dir.exists() {
        std::fs::create_dir_all(&output_dir)
            .map_err(|e| format!("Failed to create demucs_output directory: {}", e))?;
    }

    // 出力先のフォルダ内にフォルダが存在する場合は削除
    for entry in std::fs::read_dir(&output_dir).map_err(|e| format!("Failed to read demucs_output directory: {}", e))? {
        let entry = entry.map_err(|e| format!("Failed to read entry in demucs_output directory: {}", e))?;
        if entry.file_type().map_err(|e| format!("Failed to get file type: {}", e))?.is_dir() {
            std::fs::remove_dir_all(entry.path())
                .map_err(|e| format!("Failed to remove directory: {}", e))?;
        }
    }

    println!("Running Demucs...");

    // demucsを実行
    let output = std::process::Command::new(&demucs_path)
        .arg(&temp_file)
        .arg("-o")
        .arg(&output_dir)
        .output()
        .map_err(|e| format!("Failed to execute demucs: {}", e))?;

    println!("Done.");

    if !output.status.success() {
        return Err(format!("Failed to run demucs: {}", String::from_utf8_lossy(&output.stderr)));
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

    // TODO: その順番でmp3形式に変換しbase64にする

    // output_filesを\nで結合して返す
    Ok(output_files.join("\n"))
}

fn search_wav_files(dir: &std::path::Path, output_files: &mut Vec<String>) -> Result<(), String> {
    for entry in std::fs::read_dir(dir).map_err(|e| format!("Failed to read directory {}: {}", dir.display(), e))? {
        let entry = entry.map_err(|e| format!("Failed to read entry in directory {}: {}", dir.display(), e))?;
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
        .manage(Mutex::new(AppState { saved: false }))
        .on_window_event(|window, event| if let tauri::WindowEvent::CloseRequested { api, .. } = event {
            let state = window.try_state::<Mutex<AppState>>().unwrap();
            {
                let state = state.lock().unwrap();
                if state.saved {
                    exit(0);
                } else {
                    let answer = window.dialog()
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
        })
        .plugin(tauri_plugin_shell::init())
        .plugin(tauri_plugin_dialog::init())
        .plugin(tauri_plugin_opener::init())
        .plugin(tauri_plugin_fs::init())
        .invoke_handler(tauri::generate_handler![set_title, set_saved, check_python, check_demucs, demucs])
        .run(tauri::generate_context!())
        .expect("error while running tauri application");
}

struct AppState {
    saved: bool,
}