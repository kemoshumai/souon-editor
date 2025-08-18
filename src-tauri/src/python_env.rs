use std::path::PathBuf;
use tauri::Manager;

// Python環境をダウンロードして展開する関数
pub async fn download_and_extract_python(local_python_dir: &std::path::Path) -> Result<(), String> {
    log::info!("Downloading Python environment from URL...");
    
    const PYTHON_URL: &str = "https://www.python.org/ftp/python/3.13.6/python-3.13.6-embed-amd64.zip";
    
    // 一時ファイルのパスを生成
    let temp_zip_path = local_python_dir.parent()
        .ok_or("Failed to get parent directory")?
        .join("python_temp.zip");
    
    // AppLocalDataディレクトリが存在しない場合は作成
    if let Some(parent) = local_python_dir.parent() {
        tokio::fs::create_dir_all(parent).await
            .map_err(|e| format!("Failed to create AppLocalData directory: {}", e))?;
    }
    
    // Pythonのzipファイルをダウンロード
    log::info!("Downloading Python from: {}", PYTHON_URL);
    let response = reqwest::get(PYTHON_URL).await
        .map_err(|e| format!("Failed to download Python: {}", e))?;
    
    if !response.status().is_success() {
        return Err(format!("Failed to download Python: HTTP {}", response.status()));
    }
    
    let content = response.bytes().await
        .map_err(|e| format!("Failed to read download content: {}", e))?;
    
    // 一時ファイルに保存
    log::info!("Saving downloaded file to: {}", temp_zip_path.display());
    tokio::fs::write(&temp_zip_path, &content).await
        .map_err(|e| format!("Failed to write to temporary file: {}", e))?;
    
    // zipファイルを展開
    log::info!("Extracting Python to: {}", local_python_dir.display());
    let temp_zip_path_clone = temp_zip_path.clone();
    let local_python_dir_clone = local_python_dir.to_path_buf();
    
    tokio::task::spawn_blocking(move || {
        let file = std::fs::File::open(&temp_zip_path_clone)
            .map_err(|e| format!("Failed to open zip file: {}", e))?;
        let mut archive = zip::ZipArchive::new(file)
            .map_err(|e| format!("Failed to read zip archive: {}", e))?;
        
        std::fs::create_dir_all(&local_python_dir_clone)
            .map_err(|e| format!("Failed to create Python directory: {}", e))?;
        
        for i in 0..archive.len() {
            let mut file = archive.by_index(i)
                .map_err(|e| format!("Failed to read file from archive: {}", e))?;
            let outpath = match file.enclosed_name() {
                Some(path) => local_python_dir_clone.join(path),
                None => continue,
            };
            
            if file.name().ends_with('/') {
                std::fs::create_dir_all(&outpath)
                    .map_err(|e| format!("Failed to create directory: {}", e))?;
            } else {
                if let Some(p) = outpath.parent() {
                    if !p.exists() {
                        std::fs::create_dir_all(p)
                            .map_err(|e| format!("Failed to create parent directory: {}", e))?;
                    }
                }
                let mut outfile = std::fs::File::create(&outpath)
                    .map_err(|e| format!("Failed to create output file: {}", e))?;
                std::io::copy(&mut file, &mut outfile)
                    .map_err(|e| format!("Failed to extract file: {}", e))?;
            }
        }
        Ok::<(), String>(())
    }).await.map_err(|e| format!("Task join error: {}", e))??;
    
    // 一時ファイルを削除
    let _ = tokio::fs::remove_file(&temp_zip_path).await;
    
    log::info!("Python environment downloaded and extracted successfully");
    Ok(())
}


#[tauri::command]
pub async fn check_python(app_handle: tauri::AppHandle) -> Result<String, String> {
    log::info!("Checking Python environment...");

    // AppLocalDataのPython環境パスを取得
    let local_python_path = app_handle
        .path()
        .resolve(
            "python_env/python.exe",
            tauri::path::BaseDirectory::AppLocalData,
        )
        .expect("Failed to resolve local Python executable path");



    // AppLocalDataにPython環境が存在しない場合、URLからダウンロード
    if !local_python_path.exists() {
        log::info!("Local Python environment not found, downloading from URL...");

        let local_python_dir = app_handle
            .path()
            .resolve("python_env", tauri::path::BaseDirectory::AppLocalData)
            .expect("Failed to resolve local Python directory path");

        // Python環境をダウンロードして展開
        download_and_extract_python(&local_python_dir).await
            .map_err(|e| format!("Failed to download and extract Python environment: {}", e))?;

        log::info!(
            "Python environment downloaded to: {}",
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

        // get-pip.pyが存在しない場合はダウンロード
        if !python_script.exists() {
            log::info!("get-pip.py not found, downloading...");
            const GET_PIP_URL: &str = "https://bootstrap.pypa.io/get-pip.py";
            
            let response = reqwest::get(GET_PIP_URL).await
                .map_err(|e| format!("Failed to download get-pip.py: {}", e))?;
            
            if !response.status().is_success() {
                return Err(format!("Failed to download get-pip.py: HTTP {}", response.status()));
            }
            
            let content = response.text().await
                .map_err(|e| format!("Failed to read get-pip.py content: {}", e))?;
            
            tokio::fs::write(&python_script, content).await
                .map_err(|e| format!("Failed to save get-pip.py: {}", e))?;
            
            log::info!("get-pip.py downloaded successfully");
        }

        // python313._pthファイルに"import site"を追記してpipを有効化
        let pth_file_path = app_handle
            .path()
            .resolve(
                "python_env/python313._pth",
                tauri::path::BaseDirectory::AppLocalData,
            )
            .expect("Failed to resolve python313._pth path");

        log::info!("Checking python313._pth file at: {}", pth_file_path.display());
        
        if pth_file_path.exists() {
            // python313._pthの内容を標準的な形式に設定
            let correct_pth_content = "python313.zip\n.\nimport site";
            
            log::info!("Setting python313._pth to standard format");
            tokio::fs::write(&pth_file_path, correct_pth_content).await
                .map_err(|e| format!("Failed to update python313._pth: {}", e))?;
            log::info!("Successfully updated python313._pth with standard content");
        } else {
            log::warn!("python313._pth file not found at: {}", pth_file_path.display());
        }

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
        let mut command = tokio::process::Command::new(&local_python_path);
        let command = command.arg(&python_script);

        #[cfg(target_os = "windows")]
        {
            const CREATE_NO_WINDOW: u32 = 0x08000000;
            command.creation_flags(CREATE_NO_WINDOW);
        }

        let output = command.output().await.map_err(|e| {
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
pub async fn check_demucs(app_handle: tauri::AppHandle) -> Result<String, String> {
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
        let mut command = tokio::process::Command::new(&local_python_path);
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
            .output().await
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
        let mut command = tokio::process::Command::new(&local_python_path);

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

        let output = command.output().await.map_err(|e| {
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
