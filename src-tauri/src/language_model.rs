use llm::{builder::LLMBuilder, chat::ChatMessage};

#[cfg(target_os = "windows")]
use std::os::windows::process::CommandExt;

#[tauri::command]
pub async fn call_llm(model_name: &str, query: &str) -> Result<String, String> {
    // ヘルパー関数を定義してSendの問題を回避
    async fn make_llm_request(model_name: &str, query: &str) -> Result<String, String> {
        let base_url = std::env::var("OLLAMA_URL").unwrap_or("http://127.0.0.1:11434".into());

        let llm = LLMBuilder::new()
            .backend(llm::builder::LLMBackend::Ollama)
            .base_url(base_url)
            .model(model_name)
            .max_tokens(1000)
            .temperature(0.7)
            .stream(false)
            .build()
            .expect("Failed to build LLM (Ollama)");

        let messages = vec![
            ChatMessage::user()
                .content(query)
                .build(),
        ];

        match llm.chat(&messages).await {
            Ok(response) => {
                let text = response.text().unwrap_or_default().to_string();
                Ok(text)
            },
            Err(err) => {
                Err(format!("LLM request failed: {}", err))
            }
        }
    }

    // 最初のリクエストを試行
    match make_llm_request(model_name, query).await {
        Ok(text) => Ok(text),
        Err(err_msg) => {
            // 404エラーの場合はモデルをダウンロード
            if err_msg.contains("404") {
                // ollama pull <model_name>を実行してモデルを取得する
                let mut command = std::process::Command::new("ollama");
                command.arg("pull").arg(model_name);

                #[cfg(target_os = "windows")]
                {
                    const CREATE_NO_WINDOW: u32 = 0x08000000;
                    command.creation_flags(CREATE_NO_WINDOW);
                }

                let output = command
                    .output()
                    .expect("Failed to execute ollama pull");

                log::info!(
                    "Ollama pull output: {}",
                    String::from_utf8_lossy(&output.stdout)
                );

                if !output.status.success() {
                    log::error!(
                        "Ollama pull failed: {}",
                        String::from_utf8_lossy(&output.stderr)
                    );
                    return Err("Failed to pull model from Ollama".to_string());
                }

                // モデルのダウンロード後に再度リクエストを試行
                match make_llm_request(model_name, query).await {
                    Ok(text) => Ok(text),
                    Err(e) => Err(format!("Failed to get response from LLM after pull: {}", e))
                }
            } else {
                Err(err_msg)
            }
        }
    }
}
