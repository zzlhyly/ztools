mod m3u8;

use std::collections::HashMap;
use std::sync::Mutex;
use tauri::State;
use m3u8::playlist;
use serde::{Deserialize, Serialize};

pub struct DownloadState {
    pub active_downloads: Mutex<HashMap<String, bool>>,
}

impl DownloadState {
    pub fn new() -> Self {
        Self {
            active_downloads: Mutex::new(HashMap::new()),
        }
    }
}

#[derive(Debug, Serialize)]
pub struct FetchPageResult {
    html: String,
    final_url: String,
}

#[tauri::command]
async fn fetch_page(
    url: String,
    headers: HashMap<String, String>,
) -> Result<FetchPageResult, String> {
    let client = reqwest::Client::builder()
        .build()
        .map_err(|e| format!("Failed to build HTTP client: {}", e))?;

    let mut request = client.get(&url);
    for (key, value) in &headers {
        request = request.header(key.as_str(), value.as_str());
    }

    let response = request
        .send()
        .await
        .map_err(|e| format!("HTTP request failed: {}", e))?;

    let final_url = response.url().to_string();
    let html = response
        .text()
        .await
        .map_err(|e| format!("Failed to read response body: {}", e))?;

    Ok(FetchPageResult { html, final_url })
}

#[tauri::command]
async fn parse_m3u8_urls(
    html: String,
    base_url: String,
) -> Result<Vec<playlist::M3u8UrlInfo>, String> {
    Ok(playlist::extract_m3u8_urls(&html, &base_url))
}

#[derive(Debug, Serialize)]
pub struct ParseM3u8Result {
    playlist_type: String,
    qualities: Vec<playlist::M3u8Quality>,
    segment_count: usize,
    has_encryption: bool,
}

#[tauri::command]
async fn parse_m3u8(
    url: String,
    headers: HashMap<String, String>,
) -> Result<ParseM3u8Result, String> {
    let client = reqwest::Client::builder()
        .build()
        .map_err(|e| format!("Failed to build HTTP client: {}", e))?;

    let mut request = client.get(&url);
    for (key, value) in &headers {
        request = request.header(key.as_str(), value.as_str());
    }

    let response = request
        .send()
        .await
        .map_err(|e| format!("Failed to fetch M3U8: {}", e))?;

    let content = response
        .text()
        .await
        .map_err(|e| format!("Failed to read M3U8 content: {}", e))?;

    let info = playlist::parse_m3u8(&content);

    if !info.has_endlist {
        return Err("Live streams are not supported".to_string());
    }

    for key in &info.keys {
        if key.method != "AES-128" && key.method != "NONE" {
            return Err(format!(
                "Encryption method not supported: {}",
                key.method
            ));
        }
    }

    let playlist_type = match info.playlist_type {
        playlist::PlaylistType::Master => "master".to_string(),
        playlist::PlaylistType::Media => "media".to_string(),
    };

    Ok(ParseM3u8Result {
        playlist_type,
        qualities: info.qualities,
        segment_count: info.segments.len(),
        has_encryption: info.has_encryption,
    })
}

#[derive(Debug, Deserialize)]
pub struct DownloadConfig {
    pub task_id: String,
    pub m3u8_url: String,
    pub output_dir: String,
    pub filename: String,
    pub headers: HashMap<String, String>,
    pub ffmpeg_path: String,
    pub max_segment_concurrent: usize,
}

#[tauri::command]
async fn start_download(
    config: DownloadConfig,
    state: State<'_, DownloadState>,
    app_handle: tauri::AppHandle,
) -> Result<(), String> {
    {
        let mut active = state.active_downloads.lock().map_err(|e| e.to_string())?;
        active.insert(config.task_id.clone(), false);
    }

    let task_id_clone = config.task_id.clone();
    let app_handle_clone = app_handle.clone();

    // Spawn async download in background
    tauri::async_runtime::spawn(async move {
        let result = m3u8::downloader::run_download(
            &config,
            &app_handle_clone,
        ).await;

        if let Err(e) = result {
            use tauri::Emitter;
            let _ = app_handle_clone.emit("download-error", serde_json::json!({
                "task_id": task_id_clone,
                "error": e,
            }));
        }
    });

    Ok(())
}

#[tauri::command]
async fn cancel_download(
    task_id: String,
    state: State<'_, DownloadState>,
) -> Result<(), String> {
    let mut active = state.active_downloads.lock().map_err(|e| e.to_string())?;
    if let Some(cancel_flag) = active.get_mut(&task_id) {
        *cancel_flag = true;
    }
    Ok(())
}

#[derive(serde::Serialize)]
struct HashResults {
    sha1: String,
    sha256: String,
    sha384: String,
    sha512: String,
}

/// Hash a file once, computing all 4 algorithms in a single pass.
/// Runs on a dedicated blocking thread to avoid freezing the UI.
#[tauri::command]
async fn hash_file(path: String) -> Result<HashResults, String> {
    tokio::task::spawn_blocking(move || {
        use std::io::Read;
        use sha1::{Sha1, Digest};
        use sha2::{Sha256, Sha384, Sha512};

        let file = std::fs::File::open(&path)
            .map_err(|e| format!("Failed to open file: {}", e))?;
        let mut reader = std::io::BufReader::new(file);
        let mut buffer = [0u8; 65536];

        let mut sha1_hasher = Sha1::new();
        let mut sha256_hasher = Sha256::new();
        let mut sha384_hasher = Sha384::new();
        let mut sha512_hasher = Sha512::new();

        loop {
            let n = reader.read(&mut buffer).map_err(|e| format!("Read error: {}", e))?;
            if n == 0 { break; }
            let chunk = &buffer[..n];
            sha1_hasher.update(chunk);
            sha256_hasher.update(chunk);
            sha384_hasher.update(chunk);
            sha512_hasher.update(chunk);
        }

        Ok(HashResults {
            sha1: format!("{:x}", sha1_hasher.finalize()),
            sha256: format!("{:x}", sha256_hasher.finalize()),
            sha384: format!("{:x}", sha384_hasher.finalize()),
            sha512: format!("{:x}", sha512_hasher.finalize()),
        })
    })
    .await
    .map_err(|e| format!("Hash task panicked: {}", e))?
}

#[tauri::command]
fn get_default_download_dir() -> String {
    dirs_next::download_dir()
        .map(|d| d.to_string_lossy().to_string())
        .unwrap_or_default()
}

#[tauri::command]
async fn check_ffmpeg(ffmpeg_path: String) -> Result<bool, String> {
    let output = std::process::Command::new(&ffmpeg_path)
        .arg("-version")
        .output();
    Ok(output.is_ok())
}

#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn run() {
    tauri::Builder::default()
        .plugin(tauri_plugin_opener::init())
        .plugin(tauri_plugin_shell::init())
        .plugin(tauri_plugin_dialog::init())
        .manage(DownloadState::new())
        .invoke_handler(tauri::generate_handler![
            fetch_page,
            parse_m3u8_urls,
            parse_m3u8,
            start_download,
            cancel_download,
            check_ffmpeg,
            get_default_download_dir,
            hash_file,
        ])
        .run(tauri::generate_context!())
        .expect("error while running tauri application");
}
