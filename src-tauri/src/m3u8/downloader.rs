use crate::m3u8::converter;
use crate::m3u8::decrypt;
use crate::m3u8::playlist::{self, KeyInfo};
use crate::AppError;
use crate::DownloadConfig;
use serde::Serialize;
use std::collections::HashMap;
use std::path::PathBuf;
use std::sync::{Arc, Mutex};
use tauri::AppHandle;
use tauri::Emitter;
use tokio::sync::Semaphore;
use tracing::{error, info};

#[derive(Debug, Clone, Serialize)]
struct ProgressEvent {
    task_id: String,
    percent: u32,
    speed: String,
    downloaded: usize,
    total: usize,
}

#[derive(Debug, Clone, Serialize)]
struct CompleteEvent {
    task_id: String,
    output_path: String,
}

/// 标记分段任务因用户取消而返回的错误，聚合阶段据此安静退出。
const CANCEL_MARKER: &str = "TASK_CANCELLED";

fn is_task_cancelled(cancel_flags: &Mutex<HashMap<String, bool>>, task_id: &str) -> bool {
    cancel_flags
        .lock()
        .map(|flags| flags.get(task_id).copied().unwrap_or(false))
        .unwrap_or(false)
}

pub async fn run_download(
    config: &DownloadConfig,
    app_handle: &AppHandle,
    cancel_flags: Arc<Mutex<HashMap<String, bool>>>,
) -> Result<(), AppError> {
    let task_id = config.task_id.clone();
    info!(
        "Starting download: task_id={}, url={}",
        task_id, config.m3u8_url
    );

    // Check if output already exists (retry after partial completion)
    let output_dir = if config.output_dir.is_empty() {
        dirs_next::download_dir()
            .map(|d| d.to_string_lossy().to_string())
            .unwrap_or_else(|| ".".to_string())
    } else {
        config.output_dir.clone()
    };
    let output_path = PathBuf::from(&output_dir).join(&config.filename);
    if output_path.exists() {
        info!("Output already exists, skipping: {}", output_path.display());
        let _ = app_handle.emit(
            "download-complete",
            CompleteEvent {
                task_id: task_id.clone(),
                output_path: output_path.to_string_lossy().to_string(),
            },
        );
        return Ok(());
    }

    // Step 1: Fetch and parse M3U8 playlist
    let client = reqwest::Client::builder()
        .connect_timeout(std::time::Duration::from_secs(10))
        .timeout(std::time::Duration::from_secs(60))
        .build()
        .map_err(AppError::Http)?;

    let mut request = client.get(&config.m3u8_url);
    for (key, value) in &config.headers {
        request = request.header(key.as_str(), value.as_str());
    }

    let response = request.send().await.map_err(AppError::Http)?;

    let content = response.text().await.map_err(AppError::Http)?;

    let info = playlist::parse_m3u8(&content);

    if !info.has_endlist {
        return Err(AppError::Unsupported(
            "Live streams are not supported".into(),
        ));
    }

    let segments = info.segments.clone();
    let total = segments.len();
    if total == 0 {
        return Err(AppError::Parse("No segments found in playlist".into()));
    }

    // Step 2: Fetch encryption keys
    let mut key_data: HashMap<usize, Vec<u8>> = HashMap::new();
    for (idx, key_info) in info.keys.iter().enumerate() {
        if key_info.method == "AES-128" {
            if let Some(ref uri) = key_info.uri {
                let key_url = resolve_url(&config.m3u8_url, uri);
                let key_response = client
                    .get(&key_url)
                    .headers(build_header_map(&config.headers))
                    .send()
                    .await
                    .map_err(AppError::Http)?;

                let key_bytes = key_response.bytes().await.map_err(AppError::Http)?;

                key_data.insert(idx, key_bytes.to_vec());
            }
        }
    }

    // Step 3: Prepare temp directory
    let temp_dir = std::env::temp_dir()
        .join("ztools")
        .join(&task_id)
        .join("segments");
    std::fs::create_dir_all(&temp_dir)
        .map_err(|e| AppError::Unknown(format!("Failed to create temp dir: {}", e)))?;

    // Save playlist snapshot for resume
    let snapshot_dir = std::env::temp_dir().join("ztools").join(&task_id);
    std::fs::create_dir_all(&snapshot_dir).ok();
    let snapshot_path = snapshot_dir.join("playlist.m3u8");
    std::fs::write(&snapshot_path, &content).ok();

    // Step 4: Download segments concurrently
    info!(
        "Downloading {} segments (concurrent={}), task_id={}",
        total, config.max_segment_concurrent, task_id
    );
    let semaphore = Arc::new(Semaphore::new(config.max_segment_concurrent.max(1)));
    let downloaded = Arc::new(std::sync::Mutex::new(0usize));
    let total_bytes = Arc::new(std::sync::Mutex::new(0u64));
    let start_time = std::time::Instant::now();

    let mut handles = Vec::new();

    for (i, segment) in segments.iter().enumerate() {
        let client = client.clone();
        let headers = config.headers.clone();
        let segment_url = resolve_url(&config.m3u8_url, &segment.url);
        let output_path = temp_dir.join(format!("{:05}.ts", i));
        let semaphore = semaphore.clone();
        let downloaded = downloaded.clone();
        let total_bytes = total_bytes.clone();
        let app_handle = app_handle.clone();
        let task_id = task_id.clone();

        // Determine key for this segment
        let key_bytes: Option<Vec<u8>> = if info.has_encryption {
            let mut active_key_idx: Option<usize> = None;
            for (idx, ki) in info.keys.iter().enumerate() {
                if ki.start_segment <= i {
                    active_key_idx = Some(idx);
                }
            }
            active_key_idx.and_then(|idx| key_data.get(&idx).cloned())
        } else {
            None
        };

        // Determine IV for this segment
        let iv: Option<Vec<u8>> = if info.has_encryption {
            let mut active_key: Option<&KeyInfo> = None;
            for ki in &info.keys {
                if ki.start_segment <= i {
                    active_key = Some(ki);
                }
            }

            if let Some(ki) = active_key {
                // RFC 8216 §5.2：未提供 IV 时使用分段的媒体序列号（media_sequence + 序号）
                let seq = info.media_sequence + i as u64;
                match &ki.iv {
                    Some(iv_hex) => match decrypt::parse_iv(iv_hex) {
                        Ok(arr) => Some(arr.to_vec()),
                        Err(_) => Some(decrypt::default_iv(seq).to_vec()),
                    },
                    None => Some(decrypt::default_iv(seq).to_vec()),
                }
            } else {
                None
            }
        } else {
            None
        };

        let cancel_flags = cancel_flags.clone();

        let handle = tokio::spawn(async move {
            let _permit = semaphore.acquire().await.unwrap();

            if is_task_cancelled(&cancel_flags, &task_id) {
                return Err(AppError::Unsupported(CANCEL_MARKER.to_string()));
            }

            // Resume: skip if segment already exists
            if output_path.exists() {
                let mut d = downloaded.lock().unwrap();
                *d += 1;
                return Ok::<usize, AppError>(
                    output_path.metadata().map(|m| m.len()).unwrap_or(0) as usize
                );
            }

            // Download with 3 retries
            let mut last_error = String::new();
            for retry in 0..3 {
                if is_task_cancelled(&cancel_flags, &task_id) {
                    return Err(AppError::Unsupported(CANCEL_MARKER.to_string()));
                }

                let mut req = client.get(&segment_url);
                for (k, v) in &headers {
                    req = req.header(k.as_str(), v.as_str());
                }

                match req.send().await {
                    Ok(resp) => match resp.bytes().await {
                        Ok(data) => {
                            let decrypted =
                                if let (Some(ref key), Some(ref iv_arr)) = (&key_bytes, &iv) {
                                    decrypt::decrypt_aes128_cbc(&data, key, iv_arr)?
                                } else {
                                    data.to_vec()
                                };

                            std::fs::write(&output_path, &decrypted).map_err(|e| {
                                AppError::from(format!("Failed to write segment: {}", e))
                            })?;

                            let mut d = downloaded.lock().unwrap();
                            *d += 1;
                            let mut tb = total_bytes.lock().unwrap();
                            *tb += output_path.metadata().map(|m| m.len()).unwrap_or(0) as u64;

                            let elapsed = start_time.elapsed().as_secs_f64();
                            let speed = if elapsed > 0.0 {
                                let mbps = (*tb as f64 / 1_000_000.0) / elapsed;
                                format!("{:.1} MB/s", mbps)
                            } else {
                                String::new()
                            };

                            let percent = ((*d as f64 / total as f64) * 100.0) as u32;
                            let _ = app_handle.emit(
                                "download-progress",
                                ProgressEvent {
                                    task_id: task_id.clone(),
                                    percent,
                                    speed,
                                    downloaded: *d,
                                    total,
                                },
                            );

                            return Ok(data.len());
                        }
                        Err(e) => {
                            last_error = format!("Failed to read segment body: {}", e);
                            if retry < 2 {
                                tokio::time::sleep(std::time::Duration::from_secs(1)).await;
                            }
                        }
                    },
                    Err(e) => {
                        last_error = format!("Segment download failed: {}", e);
                        if retry < 2 {
                            tokio::time::sleep(std::time::Duration::from_secs(1)).await;
                        }
                    }
                }
            }

            Err(AppError::from(last_error))
        });

        handles.push(handle);
    }

    // Wait for all downloads
    let mut first_err: Option<AppError> = None;
    let mut cancelled = false;
    for handle in handles {
        match handle.await {
            Ok(Ok(_)) => {}
            Ok(Err(AppError::Unsupported(msg))) if msg == CANCEL_MARKER => {
                cancelled = true;
            }
            Ok(Err(e)) => {
                // 保留第一个原始错误，避免二次包装丢失错误码
                if first_err.is_none() {
                    first_err = Some(e);
                }
            }
            Err(e) => {
                if first_err.is_none() {
                    first_err = Some(AppError::Unknown(format!("Task join error: {}", e)));
                }
            }
        }
    }

    if cancelled {
        info!("Download cancelled: task_id={}", task_id);
        return Ok(());
    }

    if let Some(e) = first_err {
        return Err(e);
    }

    // Step 5: Convert to MP4 with FFmpeg
    if is_task_cancelled(&cancel_flags, &task_id) {
        info!("Download cancelled before conversion: task_id={}", task_id);
        return Ok(());
    }

    let _ = app_handle.emit(
        "download-progress",
        ProgressEvent {
            task_id: task_id.clone(),
            percent: 100,
            speed: "Converting...".to_string(),
            downloaded: total,
            total,
        },
    );

    let conv_dir = temp_dir.clone();
    let conv_output = output_path.clone();
    let ffmpeg_path = config.ffmpeg_path.clone();
    let convert_result = tokio::task::spawn_blocking(move || {
        converter::convert_to_mp4(&conv_dir, &conv_output, &ffmpeg_path)
    })
    .await;

    match convert_result {
        Ok(Ok(())) => {
            let _ = std::fs::remove_dir_all(temp_dir.parent().unwrap_or(&temp_dir));
            info!(
                "Download complete: task_id={}, output={}",
                task_id,
                output_path.display()
            );
            let _ = app_handle.emit(
                "download-complete",
                CompleteEvent {
                    task_id: task_id.clone(),
                    output_path: output_path.to_string_lossy().to_string(),
                },
            );
        }
        Ok(Err(e)) => {
            // 转换失败时保留已下载的分段文件，用户修正 FFmpeg 路径后重试可断点续传
            error!("FFmpeg conversion failed: task_id={}, error={}", task_id, e);
            return Err(AppError::Ffmpeg(format!(
                "FFmpeg conversion failed: {}. The downloaded segments are kept, fix the FFmpeg path and retry to resume.",
                e
            )));
        }
        Err(e) => {
            error!("Conversion task panicked: task_id={}, error={}", task_id, e);
            return Err(AppError::Unknown(format!(
                "Conversion task panicked: {}",
                e
            )));
        }
    }

    Ok(())
}

fn resolve_url(base_url: &str, segment_url: &str) -> String {
    if segment_url.starts_with("http://") || segment_url.starts_with("https://") {
        return segment_url.to_string();
    }

    match url::Url::parse(base_url) {
        Ok(base) => match base.join(segment_url) {
            Ok(resolved) => resolved.to_string(),
            Err(_) => {
                let base_path = base.path();
                let base_dir = base_path.rsplit_once('/').map(|(dir, _)| dir).unwrap_or("");
                format!(
                    "{}://{}{}/{}",
                    base.scheme(),
                    base.host_str().unwrap_or(""),
                    base_dir,
                    segment_url.trim_start_matches('/')
                )
            }
        },
        Err(_) => segment_url.to_string(),
    }
}

fn build_header_map(headers: &HashMap<String, String>) -> reqwest::header::HeaderMap {
    let mut map = reqwest::header::HeaderMap::new();
    for (k, v) in headers {
        if let (Ok(key), Ok(value)) = (
            reqwest::header::HeaderName::from_bytes(k.as_bytes()),
            reqwest::header::HeaderValue::from_str(v),
        ) {
            map.insert(key, value);
        }
    }
    map
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn test_resolve_url_absolute() {
        let result = resolve_url("https://cdn.com/playlist.m3u8", "https://other.com/seg.ts");
        assert_eq!(result, "https://other.com/seg.ts");
    }

    #[test]
    fn test_resolve_url_relative() {
        let result = resolve_url("https://cdn.com/path/playlist.m3u8", "segment-1.ts");
        assert_eq!(result, "https://cdn.com/path/segment-1.ts");
    }

    #[test]
    fn test_resolve_url_subdirectory() {
        let result = resolve_url("https://cdn.com/a/b/playlist.m3u8", "../videos/seg.ts");
        assert_eq!(result, "https://cdn.com/a/videos/seg.ts");
    }

    #[test]
    fn test_resolve_url_with_port() {
        let result = resolve_url("https://cdn.com:8443/path/playlist.m3u8", "seg.ts");
        assert_eq!(result, "https://cdn.com:8443/path/seg.ts");
    }

    #[test]
    fn test_resolve_url_with_query() {
        let result = resolve_url("https://cdn.com/playlist.m3u8?token=abc", "seg.ts");
        assert_eq!(result, "https://cdn.com/seg.ts");
    }

    #[test]
    fn test_resolve_url_invalid_base() {
        let result = resolve_url("not-a-url", "seg.ts");
        assert_eq!(result, "seg.ts");
    }

    #[test]
    fn test_build_header_map_normal() {
        let mut headers = HashMap::new();
        headers.insert("User-Agent".to_string(), "Mozilla/5.0".to_string());
        headers.insert("Accept".to_string(), "*/*".to_string());
        let map = build_header_map(&headers);
        assert_eq!(map.get("User-Agent").unwrap(), "Mozilla/5.0");
        assert_eq!(map.get("Accept").unwrap(), "*/*");
    }

    #[test]
    fn test_build_header_map_empty() {
        let headers = HashMap::new();
        let map = build_header_map(&headers);
        assert!(map.is_empty());
    }
}
