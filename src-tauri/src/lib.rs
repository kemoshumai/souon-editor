use std::{process::exit, sync::Mutex};
use tauri::{Manager, State};
use tauri_plugin_dialog::DialogExt;

mod python_env;
mod stem;
mod audio_labeling;

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
            python_env::check_python,
            python_env::check_demucs,
            stem::demucs,
            audio_labeling::onset
        ])
        .run(tauri::generate_context!())
        .expect("error while running tauri application");
}

struct AppState {
    saved: bool,
}
