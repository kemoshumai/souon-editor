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
            .max_tokens(4000)  // 譜面生成に十分な長さに設定
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

#[tauri::command]
pub async fn call_google_ai(model_name: &str, query: &str, api_key: &str) -> Result<String, String> {
    // ヘルパー関数を定義してSendの問題を回避
    async fn make_google_ai_request(model_name: &str, query: &str, api_key: &str) -> Result<String, String> {
        let llm = LLMBuilder::new()
            .backend(llm::builder::LLMBackend::Google)
            .model(model_name)
            .api_key(api_key)
            .max_tokens(8000)  // Geminiは長い出力に対応しているので大きく設定
            .temperature(0.7)
            .stream(false)
            .build()
            .map_err(|e| format!("Failed to build LLM (Google): {}", e))?;

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
                Err(format!("Google AI Studio request failed: {}", err))
            }
        }
    }

    make_google_ai_request(model_name, query, api_key).await
}

#[tauri::command]
pub async fn is_ollama_installed() -> Result<bool, String> {
    let mut command = std::process::Command::new("ollama");
    command.arg("--version");

    #[cfg(target_os = "windows")]
    {
        const CREATE_NO_WINDOW: u32 = 0x08000000;
        command.creation_flags(CREATE_NO_WINDOW);
    }

    match command.output() {
        Ok(output) => {
            Ok(output.status.success())
        },
        Err(_) => {
            // コマンドが見つからない場合はfalseを返す
            Ok(false)
        }
    }
}

#[tauri::command]
pub async fn get_vram() -> Result<f32, String> {
    // まずnvidia-smiを試す
    if let Ok(vram) = get_vram_from_nvidia_smi().await {
        return Ok(vram);
    }

    // 次にdxdiagを試す
    get_vram_from_dxdiag().await
}

async fn get_vram_from_nvidia_smi() -> Result<f32, String> {
    let mut nvidia_command = std::process::Command::new("nvidia-smi");
    nvidia_command.arg("--query-gpu=memory.total").arg("--format=csv,noheader,nounits");

    #[cfg(target_os = "windows")]
    {
        const CREATE_NO_WINDOW: u32 = 0x08000000;
        nvidia_command.creation_flags(CREATE_NO_WINDOW);
    }

    if let Ok(nvidia_output) = nvidia_command.output() {
        if nvidia_output.status.success() {
            let vram_str = String::from_utf8_lossy(&nvidia_output.stdout);
            let mut max_vram = 0.0f32;
            
            // 複数行の出力を処理（複数GPUの場合）
            for line in vram_str.lines() {
                if let Ok(vram_mb) = line.trim().parse::<f32>() {
                    let vram_gb = vram_mb / 1024.0; // MBからGBに変換
                    if vram_gb > max_vram {
                        max_vram = vram_gb;
                    }
                }
            }
            
            if max_vram > 0.0 {
                return Ok(max_vram);
            }
        }
    }
    
    Err("Failed to get VRAM from nvidia-smi".to_string())
}

async fn get_vram_from_dxdiag() -> Result<f32, String> {
    let mut command = std::process::Command::new("powershell");
    command.arg("-Command").arg(r#"
        $xmlPath = Join-Path $env:TEMP "dxdiag_temp.xml"
        try {
            Start-Process dxdiag -ArgumentList "/x","$xmlPath" -Wait -NoNewWindow
            Start-Sleep -Seconds 2
            if (Test-Path $xmlPath) {
                $content = Get-Content $xmlPath -Raw
                $maxVramMB = 0
                
                # 複数のDedicatedMemoryエントリを検索
                $matches = [regex]::Matches($content, '<DedicatedMemory>(\d+)\s*MB</DedicatedMemory>')
                foreach ($match in $matches) {
                    $vramMB = [int]$match.Groups[1].Value
                    if ($vramMB -gt $maxVramMB) {
                        $maxVramMB = $vramMB
                    }
                }
                
                if ($maxVramMB -gt 0) {
                    [math]::Round($maxVramMB / 1024, 2)
                } else {
                    "0"
                }
            } else {
                "0"
            }
        } catch {
            "0"
        } finally {
            if (Test-Path $xmlPath) {
                Remove-Item $xmlPath -ErrorAction SilentlyContinue
            }
        }
    "#);

    #[cfg(target_os = "windows")]
    {
        const CREATE_NO_WINDOW: u32 = 0x08000000;
        command.creation_flags(CREATE_NO_WINDOW);
    }

    match command.output() {
        Ok(output) => {
            if output.status.success() {
                let vram_str = String::from_utf8_lossy(&output.stdout);
                if let Ok(vram) = vram_str.trim().parse::<f32>() {
                    if vram > 0.0 {
                        Ok(vram)
                    } else {
                        Err("No VRAM detected".into())
                    }
                } else {
                    Err("Failed to parse VRAM value from dxdiag".into())
                }
            } else {
                Err(format!("dxdiag error: {}", String::from_utf8_lossy(&output.stderr)))
            }
        },
        Err(e) => Err(format!("Failed to execute dxdiag: {}", e)),
    }
}