use serde::{Deserialize, Serialize};
use serde_json::Value;
use std::fs;
use std::path::PathBuf;

#[derive(Debug, Deserialize, Serialize)]
struct SofFileMeta {
    name: String,
    #[serde(rename = "musicLength")]
    music_length: f64,
    charts: Vec<ChartMeta>,
    #[serde(rename = "musicTempoList")]
    music_tempo_list: Vec<TempoEvent>,
}

#[derive(Debug, Deserialize, Serialize)]
struct ChartMeta {
    uuid: String,
    #[serde(rename = "laneNumber")]
    lane_number: i32,
    label: String,
}

#[derive(Debug, Deserialize, Serialize)]
struct TempoEvent {
    uuid: String,
    tempo: f64,
    beat: i32,
    length: f64,
}

/// SOFファイルからメタ情報を抽出する
///
/// # Arguments
/// * `sof_content` - SOFファイルの内容（JSON文字列）
///
/// # Returns
/// 抽出されたメタ情報のJSON文字列、またはエラー
pub fn extract_meta_from_sof(sof_content: &str) -> Result<String, Box<dyn std::error::Error>> {
    // SOFファイル全体をパース
    let full_data: Value = serde_json::from_str(sof_content)?;

    // Charts情報から必要な情報だけを抽出
    let charts_data = full_data["charts"]
        .as_array()
        .ok_or("charts is not an array")?;
    let charts: Vec<ChartMeta> = charts_data
        .iter()
        .map(|chart| ChartMeta {
            uuid: chart["uuid"].as_str().unwrap_or("").to_string(),
            lane_number: chart["laneNumber"].as_i64().unwrap_or(0) as i32,
            label: chart["label"].as_str().unwrap_or("").to_string(),
        })
        .collect();

    // メタ情報だけを抽出
    let meta = SofFileMeta {
        name: full_data["name"].as_str().unwrap_or("Unknown").to_string(),
        music_length: full_data["musicLength"].as_f64().unwrap_or(0.0),
        charts,
        music_tempo_list: serde_json::from_value(full_data["musicTempoList"].clone())?,
    };

    // JSON文字列に変換して返す
    Ok(serde_json::to_string_pretty(&meta)?)
}

pub fn handle_export_meta(files: Vec<PathBuf>) {
    for file_path in files {
        println!("Processing file: {:?}", file_path);

        match fs::read_to_string(&file_path) {
            Ok(content) => {
                match extract_meta_from_sof(&content) {
                    Ok(meta_json) => {
                        // 出力ファイル名を作成（元のファイル名 + .meta.json）
                        let output_path = file_path.with_extension("meta.json");

                        match fs::write(&output_path, meta_json) {
                            Ok(_) => println!("Meta information exported to: {:?}", output_path),
                            Err(e) => eprintln!("Failed to write meta file: {}", e),
                        }
                    }
                    Err(e) => {
                        eprintln!("Failed to extract meta from {}: {}", file_path.display(), e)
                    }
                }
            }
            Err(e) => eprintln!("Failed to read file {}: {}", file_path.display(), e),
        }
    }
}
