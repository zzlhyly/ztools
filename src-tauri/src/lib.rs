mod fernet;
mod m3u8;

use m3u8::playlist;
use serde::{Deserialize, Serialize};
use std::collections::HashMap;
use std::sync::Mutex;
use tauri::State;
use tracing::{debug, error, info};

/// Unified application error with machine-readable codes for the frontend `TauriError` contract.
#[derive(Debug, thiserror::Error)]
pub enum AppError {
    #[error("[NETWORK_ERROR] {0}")]
    Http(#[from] reqwest::Error),

    #[error("[FILE_NOT_FOUND] {0}")]
    FileNotFound(String),

    #[error("[PERMISSION_DENIED] {0}")]
    PermissionDenied(String),

    #[error("[PARSE_ERROR] {0}")]
    Parse(String),

    #[error("[ENCRYPTION_ERROR] {0}")]
    Encryption(String),

    #[error("[FFMPEG_ERROR] {0}")]
    Ffmpeg(String),

    #[error("[INVALID_INPUT] {0}")]
    InvalidInput(String),

    #[error("[UNSUPPORTED] {0}")]
    Unsupported(String),

    #[error("[UNKNOWN] {0}")]
    Unknown(String),
}

// Tauri v2 requires error types to implement Serialize.
// We serialize as the Display string which already contains the [CODE] prefix.
impl serde::Serialize for AppError {
    fn serialize<S: serde::Serializer>(&self, serializer: S) -> Result<S::Ok, S::Error> {
        serializer.serialize_str(&self.to_string())
    }
}

// Manual impls for when we need to chain non-reqwest errors
impl From<String> for AppError {
    fn from(s: String) -> Self {
        AppError::Unknown(s)
    }
}

impl AppError {
    pub fn io(e: std::io::Error, path: &str) -> Self {
        match e.kind() {
            std::io::ErrorKind::NotFound => AppError::FileNotFound(format!("{}: {}", path, e)),
            std::io::ErrorKind::PermissionDenied => {
                AppError::PermissionDenied(format!("{}: {}", path, e))
            }
            _ => AppError::Unknown(format!("I/O error on {}: {}", path, e)),
        }
    }
}

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

impl Default for DownloadState {
    fn default() -> Self {
        Self::new()
    }
}

#[derive(Debug, Serialize)]
pub struct FetchPageResult {
    html: String,
    final_url: String,
}

#[tracing::instrument]
#[tauri::command]
async fn fetch_page(
    url: String,
    headers: HashMap<String, String>,
) -> Result<FetchPageResult, AppError> {
    debug!("Fetching page: {}", url);
    let client = reqwest::Client::builder()
        .connect_timeout(std::time::Duration::from_secs(10))
        .timeout(std::time::Duration::from_secs(30))
        .build()?;

    let mut request = client.get(&url);
    for (key, value) in &headers {
        request = request.header(key.as_str(), value.as_str());
    }

    let response = request.send().await.map_err(|e| {
        error!("HTTP request failed for {}: {}", url, e);
        AppError::Http(e)
    })?;

    let status = response.status();
    let final_url = response.url().to_string();
    debug!("Response status: {} for {}", status, final_url);
    let html = response.text().await.map_err(|e| {
        error!("Failed to read response body: {}", e);
        AppError::Http(e)
    })?;

    info!("Fetched page: {} ({} bytes)", final_url, html.len());
    Ok(FetchPageResult { html, final_url })
}

#[tauri::command]
async fn parse_m3u8_urls(
    html: String,
    base_url: String,
) -> Result<Vec<playlist::M3u8UrlInfo>, AppError> {
    Ok(playlist::extract_m3u8_urls(&html, &base_url))
}

#[derive(Debug, Serialize)]
pub struct ParseM3u8Result {
    playlist_type: String,
    qualities: Vec<playlist::M3u8Quality>,
    segment_count: usize,
    has_encryption: bool,
}

#[tracing::instrument]
#[tauri::command]
async fn parse_m3u8(
    url: String,
    headers: HashMap<String, String>,
) -> Result<ParseM3u8Result, AppError> {
    debug!("Parsing M3U8: {}", url);
    let client = reqwest::Client::builder()
        .connect_timeout(std::time::Duration::from_secs(10))
        .timeout(std::time::Duration::from_secs(30))
        .build()
        .map_err(|e| {
            error!("Failed to build HTTP client: {}", e);
            AppError::Http(e)
        })?;

    let mut request = client.get(&url);
    for (key, value) in &headers {
        request = request.header(key.as_str(), value.as_str());
    }

    let response = request.send().await.map_err(|e| {
        error!("Failed to fetch M3U8 {}: {}", url, e);
        AppError::Http(e)
    })?;

    let content = response.text().await.map_err(|e| {
        error!("Failed to read M3U8 content: {}", e);
        AppError::Http(e)
    })?;

    debug!("Parsing M3U8 content ({} bytes)", content.len());
    let info = playlist::parse_m3u8(&content);

    if !info.has_endlist {
        return Err(AppError::Unsupported(
            "Live streams are not supported".into(),
        ));
    }

    for key in &info.keys {
        if key.method != "AES-128" && key.method != "NONE" {
            return Err(AppError::Unsupported(format!(
                "Encryption method not supported: {}",
                key.method
            )));
        }
    }

    let playlist_type = match info.playlist_type {
        playlist::PlaylistType::Master => "master".to_string(),
        playlist::PlaylistType::Media => "media".to_string(),
    };

    info!(
        "Parsed M3U8: type={}, segments={}, encrypted={}",
        playlist_type,
        info.segments.len(),
        info.has_encryption
    );
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

#[tracing::instrument(skip(config, state, app_handle))]
#[tauri::command]
async fn start_download(
    config: DownloadConfig,
    state: State<'_, DownloadState>,
    app_handle: tauri::AppHandle,
) -> Result<(), AppError> {
    info!(
        "Starting download: task_id={}, url={}",
        config.task_id, config.m3u8_url
    );
    {
        let mut active = state.active_downloads.lock().map_err(|e| {
            error!("Failed to lock download state: {}", e);
            AppError::Unknown(e.to_string())
        })?;
        active.insert(config.task_id.clone(), false);
    }

    let task_id_clone = config.task_id.clone();
    let app_handle_clone = app_handle.clone();

    // Spawn async download in background
    tauri::async_runtime::spawn(async move {
        let result = m3u8::downloader::run_download(&config, &app_handle_clone).await;

        if let Err(e) = result {
            error!("Download failed: task_id={}, error={}", task_id_clone, e);
            use tauri::Emitter;
            let _ = app_handle_clone.emit(
                "download-error",
                serde_json::json!({
                    "task_id": task_id_clone,
                    "error": e.to_string(),
                }),
            );
        }
    });

    Ok(())
}

#[tracing::instrument(skip(state))]
#[tauri::command]
async fn cancel_download(task_id: String, state: State<'_, DownloadState>) -> Result<(), AppError> {
    info!("Cancelling download: task_id={}", task_id);
    let mut active = state
        .active_downloads
        .lock()
        .map_err(|e| AppError::Unknown(e.to_string()))?;
    if let Some(cancel_flag) = active.get_mut(&task_id) {
        *cancel_flag = true;
        info!("Download cancelled: task_id={}", task_id);
    }
    Ok(())
}

/// List all available site keys and their page domains from sites.json.
#[derive(Debug, Serialize)]
struct SiteInfo {
    key: String,
    page_domain: String,
    list_url_pattern: String,
    detail_url_pattern: String,
}

#[tauri::command]
fn list_sites() -> Vec<SiteInfo> {
    crate::fernet::load_sites()
        .into_iter()
        .map(|(k, v)| SiteInfo {
            key: k.clone(),
            page_domain: v.page_domain.clone(),
            list_url_pattern: v.list_url_pattern.clone(),
            detail_url_pattern: v.detail_url_pattern.clone(),
        })
        .collect()
}

/// Decrypt a Fernet-encrypted CONFIG token.
#[tauri::command]
fn decrypt_fernet_config(token: String, site_key: String) -> Result<String, AppError> {
    let key = crate::fernet::fernet_key_for(&site_key)
        .ok_or_else(|| AppError::Unknown(format!("Site '{}' not found", site_key)))?;
    let bytes = crate::fernet::decrypt_fernet(&key, &token).map_err(AppError::Unknown)?;
    String::from_utf8(bytes).map_err(|e| AppError::Unknown(e.to_string()))
}

/// Extract and decrypt site config from a page's HTML.
#[tauri::command]
fn extract_config_from_page(
    html: String,
    site_key: String,
) -> Result<crate::fernet::SiteConfig, AppError> {
    crate::fernet::extract_site_config(&html, &site_key).map_err(AppError::Unknown)
}

/// Fetch video detail from the site API and return M3U8 info.
#[derive(Debug, Serialize)]
struct CrawlResult {
    video_id: u64,
    title: String,
    m3u8_url: String,
    #[serde(skip_serializing_if = "Option::is_none")]
    duration: Option<u64>,
}

#[tauri::command]
async fn crawl_video_detail(
    html: String,
    video_id: u64,
    site_key: String,
) -> Result<CrawlResult, AppError> {
    crawl_video_detail_inner(&html, video_id, &site_key).await
}

/// Fetch video detail by first fetching the detail page, then calling the API.
#[tauri::command]
async fn crawl_video_from_url(
    page_url: String,
    video_id: u64,
    site_key: String,
) -> Result<CrawlResult, AppError> {
    let site = crate::fernet::get_site(&site_key)
        .ok_or_else(|| AppError::Unknown(format!("Site '{}' not found", site_key)))?;
    let client = reqwest::Client::builder()
        .build()
        .map_err(|e| AppError::Unknown(e.to_string()))?;
    let response = client
        .get(&page_url)
        .header("User-Agent", "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/150.0.0.0 Safari/537.36")
        .header("Referer", &site.referer)
        .header("Accept", "text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8")
        .header("Accept-Language", "zh-CN,zh;q=0.9")
        .send()
        .await
        .map_err(|e| AppError::Unknown(format!("Failed to fetch page: {}", e)))?;
    let html = response
        .text()
        .await
        .map_err(|e| AppError::Unknown(format!("Failed to read page: {}", e)))?;
    crawl_video_detail_inner(&html, video_id, &site_key).await
}

async fn crawl_video_detail_inner(
    html: &str,
    video_id: u64,
    site_key: &str,
) -> Result<CrawlResult, AppError> {
    let config = crate::fernet::extract_site_config(html, site_key).map_err(AppError::Unknown)?;
    let api_url = config
        .api_url
        .ok_or_else(|| AppError::Unknown("No api_url in config".into()))?;
    let site_id = config
        .site_id
        .ok_or_else(|| AppError::Unknown("No site_id in config".into()))?;
    let channel_id = config
        .channel_id
        .ok_or_else(|| AppError::Unknown("No channel_id in config".into()))?;
    let first_line = config
        .video_play_url_list
        .as_ref()
        .and_then(|v| v.first())
        .and_then(|l| l.url.as_ref())
        .and_then(|u| u.first())
        .ok_or_else(|| AppError::Unknown("No CDN domain in config".into()))?;

    let video =
        crate::fernet::fetch_video_detail(site_key, &api_url, site_id, channel_id, video_id)
            .await
            .map_err(AppError::Unknown)?;

    let play_url = video
        .play_url
        .ok_or_else(|| AppError::Unknown("No play_url in video data".into()))?;
    let m3u8_url = crate::fernet::build_m3u8_url(first_line, &play_url);

    Ok(CrawlResult {
        video_id,
        title: video.name.unwrap_or_default(),
        m3u8_url,
        duration: video.duration,
    })
}

/// Crawl the video list directly from a URL (fetches page + parses + calls API).
#[tauri::command]
async fn crawl_list_from_url(
    url: String,
    tag_id: u32,
    site_key: String,
) -> Result<Vec<crate::fernet::VideoListItem>, AppError> {
    let site = crate::fernet::get_site(&site_key)
        .ok_or_else(|| AppError::Unknown(format!("Site '{}' not found", site_key)))?;

    let client = reqwest::Client::builder()
        .build()
        .map_err(|e| AppError::Unknown(e.to_string()))?;

    let response = client
        .get(&url)
        .header("User-Agent", "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/150.0.0.0 Safari/537.36")
        .header("Referer", &site.referer)
        .header("Accept", "text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8")
        .header("Accept-Language", "zh-CN,zh;q=0.9")
        .send()
        .await
        .map_err(|e| AppError::Unknown(format!("Failed to fetch page: {}", e)))?;

    let html = response
        .text()
        .await
        .map_err(|e| AppError::Unknown(format!("Failed to read page: {}", e)))?;

    let config = crate::fernet::extract_site_config(&html, &site_key).map_err(AppError::Unknown)?;
    let api_url = config
        .api_url
        .ok_or_else(|| AppError::Unknown("No api_url in config".into()))?;
    let site_id = config
        .site_id
        .ok_or_else(|| AppError::Unknown("No site_id in config".into()))?;
    let channel_id = config
        .channel_id
        .ok_or_else(|| AppError::Unknown("No channel_id in config".into()))?;

    crate::fernet::fetch_video_list(&site_key, &api_url, site_id, channel_id, tag_id)
        .await
        .map_err(AppError::Unknown)
}

/// Crawl the video list from a tag page (HTML already fetched).
#[tauri::command]
async fn crawl_list_page(
    html: String,
    tag_id: u32,
    site_key: String,
) -> Result<Vec<crate::fernet::VideoListItem>, AppError> {
    let config = crate::fernet::extract_site_config(&html, &site_key).map_err(AppError::Unknown)?;
    let api_url = config
        .api_url
        .ok_or_else(|| AppError::Unknown("No api_url in config".into()))?;
    let site_id = config
        .site_id
        .ok_or_else(|| AppError::Unknown("No site_id in config".into()))?;
    let channel_id = config
        .channel_id
        .ok_or_else(|| AppError::Unknown("No channel_id in config".into()))?;

    crate::fernet::fetch_video_list(&site_key, &api_url, site_id, channel_id, tag_id)
        .await
        .map_err(AppError::Unknown)
}

/// Hash a file with the specified algorithm using ring (SHA-NI) for hardware acceleration.
#[tracing::instrument]
#[tauri::command]
async fn hash_file(path: String, algorithm: String) -> Result<String, AppError> {
    debug!("Hashing file: path={}, algorithm={}", path, algorithm);
    tokio::task::spawn_blocking(move || {
        use ring::digest::{Context, SHA1_FOR_LEGACY_USE_ONLY, SHA256, SHA384, SHA512};
        use std::io::Read;

        let mut file = std::fs::File::open(&path).map_err(|e| AppError::io(e, &path))?;

        let mut buf = [0u8; 1_048_576];

        let hash = match algorithm.as_str() {
            "SHA-1" => {
                let mut ctx = Context::new(&SHA1_FOR_LEGACY_USE_ONLY);
                loop {
                    let n = file.read(&mut buf).map_err(|e| AppError::io(e, &path))?;
                    if n == 0 {
                        break;
                    }
                    ctx.update(&buf[..n]);
                }
                hex::encode(ctx.finish().as_ref())
            }
            "SHA-256" => {
                let mut ctx = Context::new(&SHA256);
                loop {
                    let n = file.read(&mut buf).map_err(|e| AppError::io(e, &path))?;
                    if n == 0 {
                        break;
                    }
                    ctx.update(&buf[..n]);
                }
                hex::encode(ctx.finish().as_ref())
            }
            "SHA-384" => {
                let mut ctx = Context::new(&SHA384);
                loop {
                    let n = file.read(&mut buf).map_err(|e| AppError::io(e, &path))?;
                    if n == 0 {
                        break;
                    }
                    ctx.update(&buf[..n]);
                }
                hex::encode(ctx.finish().as_ref())
            }
            "SHA-512" => {
                let mut ctx = Context::new(&SHA512);
                loop {
                    let n = file.read(&mut buf).map_err(|e| AppError::io(e, &path))?;
                    if n == 0 {
                        break;
                    }
                    ctx.update(&buf[..n]);
                }
                hex::encode(ctx.finish().as_ref())
            }
            _ => {
                return Err(AppError::InvalidInput(format!(
                    "Unsupported hash algorithm: {}",
                    algorithm
                )))
            }
        };

        Ok(hash)
    })
    .await
    .map_err(|e| AppError::Unknown(format!("Hash task panicked: {}", e)))?
}

#[tauri::command]
fn get_default_download_dir() -> String {
    dirs_next::download_dir()
        .map(|d| d.to_string_lossy().to_string())
        .unwrap_or_default()
}

#[tauri::command]
async fn check_ffmpeg(ffmpeg_path: String) -> Result<bool, AppError> {
    let output = std::process::Command::new(&ffmpeg_path)
        .arg("-version")
        .output();
    Ok(output.is_ok())
}

/// Convert an image file between formats using the `image` crate.
#[tauri::command]
fn convert_image(input_path: String, output_format: String) -> Result<serde_json::Value, AppError> {
    use image::GenericImageView;
    let img = image::open(&input_path)
        .map_err(|e| AppError::Parse(format!("Failed to open image: {}", e)))?;
    let (w, h) = img.dimensions();
    let original_size = std::fs::metadata(&input_path)
        .map_err(|e| AppError::io(e, &input_path))?
        .len();

    let output_path =
        std::env::temp_dir().join(format!("ztools_output.{}", output_format.to_lowercase()));

    let format = match output_format.to_lowercase().as_str() {
        "jpeg" | "jpg" => image::ImageFormat::Jpeg,
        "png" => image::ImageFormat::Png,
        "webp" => image::ImageFormat::WebP,
        _ => {
            return Err(AppError::InvalidInput(format!(
                "Unsupported format: {}",
                output_format
            )))
        }
    };

    img.save_with_format(&output_path, format)
        .map_err(|e| AppError::Parse(format!("Failed to save image: {}", e)))?;

    let output_size = std::fs::metadata(&output_path)
        .map_err(|e| AppError::io(e, &output_path.to_string_lossy()))?
        .len();

    Ok(serde_json::json!({
        "output_path": output_path.to_string_lossy(),
        "original_size": original_size,
        "output_size": output_size,
        "width": w,
        "height": h,
    }))
}

/// Detect the encoding of a text file (BOM-based + basic heuristic).
#[tauri::command]
fn detect_encoding(file_path: String) -> Result<serde_json::Value, AppError> {
    let bytes = std::fs::read(&file_path).map_err(|e| AppError::io(e, &file_path))?;
    let (encoding, confidence) =
        encoding_rs::Encoding::for_bom(&bytes).unwrap_or((encoding_rs::UTF_8, 1));
    Ok(serde_json::json!({
        "encoding": encoding.name(),
        "confidence": confidence,
    }))
}

/// Convert a text file from its detected encoding to a target encoding.
#[tauri::command]
fn convert_encoding(
    file_path: String,
    target_encoding: String,
) -> Result<serde_json::Value, AppError> {
    let bytes = std::fs::read(&file_path).map_err(|e| AppError::io(e, &file_path))?;
    let (source_encoding, _) =
        encoding_rs::Encoding::for_bom(&bytes).unwrap_or((encoding_rs::UTF_8, 1));
    let (decoded, _actual_encoding, had_errors) = source_encoding.decode(&bytes);

    let target_enc =
        encoding_rs::Encoding::for_label(target_encoding.as_bytes()).ok_or_else(|| {
            AppError::InvalidInput(format!("Unsupported target encoding: {}", target_encoding))
        })?;
    let (encoded, _enc, _errors) = target_enc.encode(&decoded);

    let output_path = std::env::temp_dir().join("ztools_encoding_output.txt");
    std::fs::write(&output_path, &encoded)
        .map_err(|e| AppError::io(e, &output_path.to_string_lossy()))?;

    Ok(serde_json::json!({
        "output_path": output_path.to_string_lossy(),
        "source_encoding": source_encoding.name(),
        "had_errors": had_errors,
    }))
}

#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn run() {
    tracing_subscriber::fmt()
        .with_env_filter(
            tracing_subscriber::EnvFilter::try_from_default_env()
                .unwrap_or_else(|_| tracing_subscriber::EnvFilter::new("warn")),
        )
        .init();

    info!("ztools backend starting");

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
            convert_image,
            detect_encoding,
            convert_encoding,
            decrypt_fernet_config,
            list_sites,
            extract_config_from_page,
            crawl_video_detail,
            crawl_video_from_url,
            crawl_list_page,
            crawl_list_from_url,
        ])
        .run(tauri::generate_context!())
        .expect("error while running tauri application");
}

#[cfg(test)]
mod tests {
    use super::*;
    use std::io::Write;

    #[test]
    fn test_hash_file_sha256() {
        let tmp = std::env::temp_dir().join("ztools_hash_test.txt");
        let mut f = std::fs::File::create(&tmp).unwrap();
        f.write_all(b"hello world").unwrap();
        f.sync_all().unwrap();

        // hash_file is async, so use tokio runtime
        let rt = tokio::runtime::Runtime::new().unwrap();
        let result = rt.block_on(hash_file(
            tmp.to_string_lossy().to_string(),
            "SHA-256".to_string(),
        ));
        std::fs::remove_file(&tmp).ok();
        assert!(result.is_ok());
        // SHA-256 of "hello world" is b94d27b9...
        assert!(result.unwrap().starts_with("b94d27b9"));
    }

    #[test]
    fn test_hash_file_not_found() {
        let rt = tokio::runtime::Runtime::new().unwrap();
        let result = rt.block_on(hash_file(
            "/nonexistent/file/path.txt".to_string(),
            "SHA-256".to_string(),
        ));
        assert!(result.is_err());
    }

    #[test]
    fn test_hash_file_unsupported_algorithm() {
        let rt = tokio::runtime::Runtime::new().unwrap();
        let result = rt.block_on(hash_file("any.txt".to_string(), "MD5".to_string()));
        assert!(result.is_err());
    }

    // --- convert_image tests ---

    #[test]
    fn test_convert_image_png_to_jpeg() {
        let tmp_dir = std::env::temp_dir();
        let input_path = tmp_dir.join("ztools_test_input.png");
        let img = image::RgbImage::new(10, 10);
        img.save(&input_path).unwrap();

        let result = convert_image(input_path.to_string_lossy().to_string(), "jpeg".to_string());
        assert!(result.is_ok());

        let val = result.unwrap();
        let output_path = val["output_path"].as_str().unwrap().to_string();
        let output_size = val["output_size"].as_u64().unwrap();
        let width = val["width"].as_u64().unwrap();
        let height = val["height"].as_u64().unwrap();

        assert!(std::fs::metadata(&output_path).is_ok());
        assert!(output_size > 0);
        assert_eq!(width, 10);
        assert_eq!(height, 10);

        // Clean up
        std::fs::remove_file(&input_path).ok();
        std::fs::remove_file(&output_path).ok();
    }

    #[test]
    fn test_convert_image_unsupported_format() {
        let tmp_dir = std::env::temp_dir();
        let input_path = tmp_dir.join("ztools_test_unsupported.png");
        let img = image::RgbImage::new(1, 1);
        img.save(&input_path).unwrap();

        let result = convert_image(input_path.to_string_lossy().to_string(), "gif".to_string());
        std::fs::remove_file(&input_path).ok();
        assert!(result.is_err());
    }

    #[test]
    fn test_convert_image_file_not_found() {
        let result = convert_image(
            "/nonexistent/path/image.png".to_string(),
            "jpeg".to_string(),
        );
        assert!(result.is_err());
    }

    // --- detect_encoding tests ---

    #[test]
    fn test_detect_encoding_utf8_bom() {
        let tmp = std::env::temp_dir().join("ztools_test_bom.txt");
        let mut f = std::fs::File::create(&tmp).unwrap();
        // UTF-8 BOM: 0xEF, 0xBB, 0xBF then "hello"
        f.write_all(&[0xEF, 0xBB, 0xBF]).unwrap();
        f.write_all(b"hello").unwrap();
        f.sync_all().unwrap();

        let result = detect_encoding(tmp.to_string_lossy().to_string());
        std::fs::remove_file(&tmp).ok();
        assert!(result.is_ok());

        let val = result.unwrap();
        assert_eq!(val["encoding"].as_str().unwrap(), "UTF-8");
        assert!(val["confidence"].as_u64().unwrap() >= 1);
    }

    #[test]
    fn test_detect_encoding_no_bom() {
        let tmp = std::env::temp_dir().join("ztools_test_nobom.txt");
        let mut f = std::fs::File::create(&tmp).unwrap();
        f.write_all(b"hello").unwrap();
        f.sync_all().unwrap();

        let result = detect_encoding(tmp.to_string_lossy().to_string());
        std::fs::remove_file(&tmp).ok();
        assert!(result.is_ok());

        let val = result.unwrap();
        assert_eq!(val["encoding"].as_str().unwrap(), "UTF-8");
    }

    // --- convert_encoding tests ---

    #[test]
    fn test_convert_encoding_utf8_to_utf8() {
        let tmp = std::env::temp_dir().join("ztools_test_conv.txt");
        let mut f = std::fs::File::create(&tmp).unwrap();
        f.write_all(b"hello world").unwrap();
        f.sync_all().unwrap();

        let result = convert_encoding(tmp.to_string_lossy().to_string(), "UTF-8".to_string());
        std::fs::remove_file(&tmp).ok();
        assert!(result.is_ok());

        let val = result.unwrap();
        let output_path = val["output_path"].as_str().unwrap();
        assert!(std::fs::metadata(output_path).is_ok());
        assert_eq!(val["source_encoding"].as_str().unwrap(), "UTF-8");
        assert!(!val["had_errors"].as_bool().unwrap());

        std::fs::remove_file(output_path).ok();
    }

    #[test]
    fn test_convert_encoding_invalid_target() {
        let tmp = std::env::temp_dir().join("ztools_test_invalid_target.txt");
        let mut f = std::fs::File::create(&tmp).unwrap();
        f.write_all(b"hello").unwrap();
        f.sync_all().unwrap();

        let result = convert_encoding(
            tmp.to_string_lossy().to_string(),
            "INVALID-ENCODING".to_string(),
        );
        std::fs::remove_file(&tmp).ok();
        assert!(result.is_err());
    }
}
