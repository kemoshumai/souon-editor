use std::{path::PathBuf, process::exit, sync::Mutex};
use tauri::{AppHandle, Manager, State};
use tauri_plugin_dialog::DialogExt;
use tauri_plugin_fs::FsExt;

mod audio_labeling;
mod export_meta;
mod language_model;
mod python_env;
mod stem;

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
fn get_preserved_opened_file(state: State<'_, Mutex<AppState>>) -> Option<String> {
    let mut state = state.lock().unwrap();

    if let OpenAction::OpenFile(preserved_opened_file) = &state.preserved_open_action {
        let file_path = preserved_opened_file.clone();
        state.preserved_open_action = OpenAction::None;
        Some(file_path)
    } else {
        None
    }
}

fn handle_file_associations(app: AppHandle, files: Vec<PathBuf>) {
    // 最初のファイルのみを処理
    if let Some(first_file) = files.first() {
        let file_path = first_file.to_string_lossy().to_string();

        // filepathにアクセスする権限を与える
        let scope = app.fs_scope();
        scope
            .allow_file(&file_path)
            .expect("Failed to allow file access");

        let state = app.state::<Mutex<AppState>>();
        let mut state = state.lock().unwrap();
        state.preserved_open_action = OpenAction::OpenFile(file_path);
    }
}

#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn run() {
    // もし--export-metaオプションがあれば、画面は起動せずにメタ情報分離処理を行う
    {
        let args: Vec<String> = std::env::args().skip(1).collect();
        let mut files = Vec::new();
        let mut is_export_meta = false;
        for arg in args.iter() {
            if arg == "--export-meta" {
                is_export_meta = true;
            } else if !arg.starts_with('-') {
                files.push(PathBuf::from(arg));
            }
        }
        if is_export_meta && !files.is_empty() {
            export_meta::handle_export_meta(files);
            exit(0);
        }
    }

    tauri::Builder::default()
        .plugin(tauri_plugin_process::init())
        .plugin(tauri_plugin_updater::Builder::new().build())
        .plugin(tauri_plugin_log::Builder::new().build())
        .manage(Mutex::new(AppState {
            saved: false,
            preserved_open_action: OpenAction::None,
        }))
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
        .plugin(tauri_plugin_clipboard_manager::init())
        .plugin(
            tauri_plugin_log::Builder::new()
                .target(tauri_plugin_log::Target::new(
                    tauri_plugin_log::TargetKind::Webview,
                ))
                .build(),
        )
        .invoke_handler(tauri::generate_handler![
            set_title,
            set_saved,
            python_env::check_python,
            python_env::check_demucs,
            stem::demucs,
            audio_labeling::onset,
            language_model::call_llm,
            language_model::call_google_ai,
            language_model::is_ollama_installed,
            language_model::get_vram,
            get_preserved_opened_file,
        ])
        .setup(|app| {
            let args: Vec<String> = std::env::args().skip(1).collect();
            let mut files = Vec::new();

            for arg in args.iter() {
                if !arg.starts_with('-') {
                    files.push(PathBuf::from(arg));
                }
            }

            if !files.is_empty() {
                handle_file_associations(app.handle().clone(), files);
            }

            Ok(())
        })
        .run(tauri::generate_context!())
        .expect("error while running tauri application");
}

struct AppState {
    saved: bool,
    preserved_open_action: OpenAction,
}

enum OpenAction {
    None,
    OpenFile(String),
}
