use crate::DownloadConfig;
use crate::m3u8::playlist::{self, KeyInfo};
use crate::m3u8::decrypt;
use crate::m3u8::converter;
use serde::Serialize;
use std::collections::HashMap;
use std::path::PathBuf;
use std::sync::Arc;
use tauri::AppHandle;
use tauri::Emitter;
use tokio::sync::Semaphore;

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

#[derive(Debug, Clone, Serialize)]
struct ErrorEvent {
    task_id: String,
    error: String,
}

pub async fn run_download(
    config: &DownloadConfig,
    app_handle: &AppHandle,
) -> Result<(), String> {
    let task_id = config.task_id.clone();

    // Step 1: Fetch and parse M3U8 playlist
    let client = reqwest::Client::builder()
        .build()
        .map_err(|e| format!("Failed to build HTTP client: {}", e))?;

    let mut request = client.get(&config.m3u8_url);
    for (key, value) in &config.headers {
        request = request.header(key.as_str(), value.as_str());
    }

    let response = request
        .send()
        .await
        .map_err(|e| format!("Failed to fetch M3U8: {}", e))?;

    let content = response
        .text()
        .await
        .map_err(|e| format!("Failed to read M3U8: {}", e))?;

    let info = playlist::parse_m3u8(&content);

    if !info.has_endlist {
        let _ = app_handle.emit("download-error", ErrorEvent {
            task_id: task_id.clone(),
            error: "Live streams are not supported".to_string(),
        });
        return Err("Live streams are not supported".to_string());
    }

    let segments = info.segments.clone();
    let total = segments.len();
    if total == 0 {
        let _ = app_handle.emit("download-error", ErrorEvent {
            task_id: task_id.clone(),
            error: "No segments found in playlist".to_string(),
        });
        return Err("No segments found in playlist".to_string());
    }

    // Step 2: Fetch encryption keys
    let mut key_data: HashMap<usize, Vec<u8>> = HashMap::new();
    for (idx, key_info) in info.keys.iter().enumerate() {
        if key_info.method == "AES-128" {
            if let Some(ref uri) = key_info.uri {
                let key_response = client
                    .get(uri)
                    .headers(build_header_map(&config.headers))
                    .send()
                    .await
                    .map_err(|e| format!("Failed to fetch key: {}", e))?;

                let key_bytes = key_response
                    .bytes()
                    .await
                    .map_err(|e| format!("Failed to read key: {}", e))?;

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
        .map_err(|e| format!("Failed to create temp dir: {}", e))?;

    // Save playlist snapshot for resume
    let snapshot_dir = std::env::temp_dir().join("ztools").join(&task_id);
    std::fs::create_dir_all(&snapshot_dir).ok();
    let snapshot_path = snapshot_dir.join("playlist.m3u8");
    std::fs::write(&snapshot_path, &content).ok();

    // Step 4: Download segments concurrently
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
        let start_time = start_time;
        let total = total;

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

            if let Some(ref ki) = active_key {
                match &ki.iv {
                    Some(iv_hex) => {
                        match decrypt::parse_iv(iv_hex) {
                            Ok(arr) => Some(arr.to_vec()),
                            Err(_) => Some(decrypt::default_iv(i as u32 + 1).to_vec()),
                        }
                    }
                    None => Some(decrypt::default_iv(i as u32 + 1).to_vec()),
                }
            } else {
                None
            }
        } else {
            None
        };

        let handle = tokio::spawn(async move {
            let _permit = semaphore.acquire().await.unwrap();

            // Resume: skip if segment already exists
            if output_path.exists() {
                let mut d = downloaded.lock().unwrap();
                *d += 1;
                return Ok::<usize, String>(output_path.metadata().map(|m| m.len()).unwrap_or(0) as usize);
            }

            // Download with 3 retries
            let mut last_error = String::new();
            for retry in 0..3 {
                let mut req = client.get(&segment_url);
                for (k, v) in &headers {
                    req = req.header(k.as_str(), v.as_str());
                }

                match req.send().await {
                    Ok(resp) => {
                        match resp.bytes().await {
                            Ok(data) => {
                                let decrypted = if let (Some(ref key), Some(ref iv_arr)) = (&key_bytes, &iv) {
                                    decrypt::decrypt_aes128_cbc(&data, key, iv_arr)?
                                } else {
                                    data.to_vec()
                                };

                                std::fs::write(&output_path, &decrypted)
                                    .map_err(|e| format!("Failed to write segment: {}", e))?;

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
                                let _ = app_handle.emit("download-progress", ProgressEvent {
                                    task_id: task_id.clone(),
                                    percent,
                                    speed,
                                    downloaded: *d,
                                    total,
                                });

                                return Ok(data.len());
                            }
                            Err(e) => {
                                last_error = format!("Failed to read segment body: {}", e);
                                if retry < 2 {
                                    tokio::time::sleep(std::time::Duration::from_secs(1)).await;
                                }
                            }
                        }
                    }
                    Err(e) => {
                        last_error = format!("Segment download failed: {}", e);
                        if retry < 2 {
                            tokio::time::sleep(std::time::Duration::from_secs(1)).await;
                        }
                    }
                }
            }

            Err(last_error)
        });

        handles.push(handle);
    }

    // Wait for all downloads
    let mut has_error = false;
    let mut error_msg = String::new();
    for handle in handles {
        match handle.await {
            Ok(Ok(_)) => {}
            Ok(Err(e)) => {
                has_error = true;
                error_msg = e;
            }
            Err(e) => {
                has_error = true;
                error_msg = format!("Task join error: {}", e);
            }
        }
    }

    if has_error {
        let _ = app_handle.emit("download-error", ErrorEvent {
            task_id: task_id.clone(),
            error: error_msg.clone(),
        });
        return Err(error_msg);
    }

    // Step 5: Convert to MP4
    let output_dir = if config.output_dir.is_empty() {
        dirs_next::download_dir()
            .map(|d| d.to_string_lossy().to_string())
            .unwrap_or_else(|| ".".to_string())
    } else {
        config.output_dir.clone()
    };

    let output_path = PathBuf::from(&output_dir).join(&config.filename);

    let _ = app_handle.emit("download-progress", ProgressEvent {
        task_id: task_id.clone(),
        percent: 100,
        speed: "Converting...".to_string(),
        downloaded: total,
        total,
    });

    match converter::convert_to_mp4(&temp_dir, &output_path, &config.ffmpeg_path) {
        Ok(()) => {
            let _ = std::fs::remove_dir_all(temp_dir.parent().unwrap_or(&temp_dir));
            let _ = app_handle.emit("download-complete", CompleteEvent {
                task_id: task_id.clone(),
                output_path: output_path.to_string_lossy().to_string(),
            });
        }
        Err(e) => {
            let _ = app_handle.emit("download-error", ErrorEvent {
                task_id: task_id.clone(),
                error: format!("FFmpeg failed: {}. Temp files preserved at {:?}", e, temp_dir.parent()),
            });
            return Err(e);
        }
    }

    Ok(())
}

fn resolve_url(base_url: &str, segment_url: &str) -> String {
    if segment_url.starts_with("http://") || segment_url.starts_with("https://") {
        return segment_url.to_string();
    }

    match url::Url::parse(base_url) {
        Ok(base) => {
            match base.join(segment_url) {
                Ok(resolved) => resolved.to_string(),
                Err(_) => {
                    let base_path = base.path();
                    let base_dir = base_path.rsplit_once('/')
                        .map(|(dir, _)| dir)
                        .unwrap_or("");
                    format!("{}://{}{}/{}", base.scheme(), base.host_str().unwrap_or(""), base_dir, segment_url.trim_start_matches('/'))
                }
            }
        }
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
