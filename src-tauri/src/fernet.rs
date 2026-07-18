use aes::Aes128;
use base64::engine::general_purpose::URL_SAFE;
use base64::Engine;
use cbc::cipher::block_padding::Pkcs7;
use cbc::cipher::{BlockDecryptMut, KeyIvInit};
use regex::Regex;
use ring::hmac;
use serde::{Deserialize, Serialize};
use std::collections::HashMap;
use std::sync::LazyLock;

/// External site configuration loaded from sites.json.
#[derive(Debug, Clone, Deserialize)]
struct SitesConfig {
    #[serde(flatten)]
    sites: HashMap<String, SiteEntry>,
}

#[derive(Debug, Clone, Deserialize)]
#[allow(dead_code)]
pub(crate) struct SiteEntry {
    fernet_key: String,
    api_base: String,
    page_domain: String,
    referer: String,
    origin: String,
}

/// Load site configs from sites.json. Panics if file is missing or invalid.
static SITES: LazyLock<HashMap<String, SiteEntry>> = LazyLock::new(|| {
    let config_path = std::path::Path::new("sites.json");
    let content = std::fs::read_to_string(config_path)
        .expect("sites.json not found. Copy sites.example.json to sites.json and fill in values.");
    let config: SitesConfig = serde_json::from_str(&content).expect("Invalid sites.json format");
    config.sites
});

/// Get the site entry for a given site key.
pub(crate) fn get_site(key: &str) -> &SiteEntry {
    SITES
        .get(key)
        .unwrap_or_else(|| panic!("Site '{}' not found in sites.json", key))
}

/// Get the Fernet key for a site.
pub fn fernet_key_for(site_key: &str) -> &str {
    &get_site(site_key).fernet_key
}

/// Site-level configuration extracted from page CONFIG.
#[derive(Debug, Clone, Deserialize, Serialize)]
pub struct SiteConfig {
    pub api_url: Option<String>,
    pub site_id: Option<u32>,
    pub channel_id: Option<u32>,
    pub video_play_url_list: Option<Vec<PlayLine>>,
    pub video_download_url: Option<Vec<String>>,
}

#[derive(Debug, Clone, Deserialize, Serialize)]
pub struct PlayLine {
    pub name: Option<String>,
    pub url: Option<Vec<String>>,
    pub sort: Option<u32>,
    #[serde(rename = "is_vip")]
    pub is_vip: Option<bool>,
}

/// Video detail data from the API response (decrypted x-data).
#[derive(Debug, Clone, Deserialize)]
pub struct VideoData {
    pub data: Option<VideoInfo>,
}

#[derive(Debug, Clone, Deserialize)]
#[allow(dead_code)]
pub struct VideoInfo {
    pub id: u64,
    pub name: Option<String>,
    pub play_url: Option<String>,
    pub preview_play_url: Option<String>,
    pub down_url: Option<String>,
    pub duration: Option<u64>,
    pub pic: Option<String>,
    pub source: Option<String>,
    pub pubdate: Option<String>,
    pub tag: Option<Vec<TagInfo>>,
}

#[derive(Debug, Clone, Deserialize)]
#[allow(dead_code)]
pub struct TagInfo {
    pub id: u32,
    pub name: Option<String>,
}

/// API response wrapper (the x-data is Fernet-encrypted).
#[derive(Debug, Clone, Deserialize)]
struct ApiResponse {
    #[serde(rename = "x-data")]
    x_data: Option<String>,
}

type Aes128Cbc = cbc::Decryptor<Aes128>;

/// Decrypt a Fernet token using the given URL-safe base64 key.
/// Returns the decrypted plaintext bytes.
pub fn decrypt_fernet(key_b64: &str, token_b64: &str) -> Result<Vec<u8>, String> {
    // Decode the key (URL-safe base64, 32 bytes)
    let key_bytes = URL_SAFE
        .decode(key_b64)
        .map_err(|e| format!("Invalid key: {}", e))?;
    if key_bytes.len() != 32 {
        return Err(format!("Key must be 32 bytes, got {}", key_bytes.len()));
    }

    let signing_key = hmac::Key::new(hmac::HMAC_SHA256, &key_bytes[16..]);
    let encryption_key = &key_bytes[..16];

    // Decode the token
    let token_bytes = URL_SAFE
        .decode(token_b64)
        .map_err(|e| format!("Invalid token: {}", e))?;

    if token_bytes.len() < 57 {
        // 1 (version) + 8 (timestamp) + 16 (IV) + min 0 (ciphertext) + 32 (HMAC)
        return Err("Token too short".to_string());
    }

    // Verify HMAC
    let hmac_end = token_bytes.len();
    let hmac_start = hmac_end - 32;
    let hmac_value = &token_bytes[hmac_start..];
    let signed_data = &token_bytes[..hmac_start];

    hmac::verify(&signing_key, signed_data, hmac_value)
        .map_err(|_| "HMAC verification failed".to_string())?;

    // Check version
    if token_bytes[0] != 0x80 {
        return Err(format!("Unsupported version: {}", token_bytes[0]));
    }

    // Extract IV and ciphertext
    let iv = &token_bytes[9..25];
    let ciphertext = &token_bytes[25..hmac_start];

    // Decrypt with AES-128-CBC + PKCS7 unpadding
    let mut buf = ciphertext.to_vec();
    let cipher = Aes128Cbc::new(encryption_key.into(), iv.into());
    let decrypted = cipher
        .decrypt_padded_mut::<Pkcs7>(&mut buf)
        .map_err(|e| format!("Decryption failed: {}", e))?;

    Ok(decrypted.to_vec())
}

/// Extract and decrypt the site CONFIG from a page HTML.
pub fn extract_site_config(html: &str, site_key: &str) -> Result<SiteConfig, String> {
    let key = fernet_key_for(site_key);
    let re = Regex::new(r"window\.CONFIG\s*=\s*'([^']+)'").unwrap();
    let caps = re
        .captures(html)
        .ok_or_else(|| "No window.CONFIG found in page".to_string())?;
    let token = caps.get(1).unwrap().as_str();
    let json = decrypt_fernet(key, token)?;
    serde_json::from_slice::<SiteConfig>(&json)
        .map_err(|e| format!("Failed to parse site config: {}", e))
}

/// Fetch video detail from the API and return the decrypted video info.
pub async fn fetch_video_detail(
    site_key: &str,
    api_url: &str,
    site_id: u32,
    channel_id: u32,
    video_id: u64,
) -> Result<VideoInfo, String> {
    let site = get_site(site_key);
    let client = reqwest::Client::builder()
        .build()
        .map_err(|e| format!("Failed to build client: {}", e))?;

    let url = format!(
        "https://{}/api/vod/video/{}?channel_id={}&site_id={}",
        api_url, video_id, channel_id, site_id
    );

    let response = client
        .get(&url)
        .header("Referer", &site.referer)
        .header("Origin", &site.origin)
        .send()
        .await
        .map_err(|e| format!("API request failed: {}", e))?;

    let api_resp: ApiResponse = response
        .json()
        .await
        .map_err(|e| format!("Failed to parse API response: {}", e))?;

    let x_data = api_resp
        .x_data
        .ok_or_else(|| "No x-data in API response".to_string())?;

    let json = decrypt_fernet(&site.fernet_key, &x_data)?;
    let video_data: VideoData =
        serde_json::from_slice(&json).map_err(|e| format!("Failed to parse video data: {}", e))?;

    video_data
        .data
        .ok_or_else(|| "No video data in response".to_string())
}

/// Construct the full M3U8 URL from CDN domain and play_url path.
pub fn build_m3u8_url(cdn_domain: &str, play_url: &str) -> String {
    let path = play_url.strip_prefix('/').unwrap_or(play_url);
    format!("https://{}/{}", cdn_domain.trim_end_matches('/'), path)
}

/// Video list item from the list API response.
#[derive(Debug, Clone, Deserialize, Serialize)]
pub struct VideoListItem {
    pub id: u64,
    pub name: Option<String>,
    pub pubdate: Option<String>,
    pub duration: Option<u64>,
    pub hits: Option<u64>,
    pub pic: Option<String>,
    #[serde(rename = "product_type")]
    pub product_type: Option<u32>,
}

/// Video list response wrapper (decrypted x-data).
#[derive(Debug, Clone, Deserialize)]
struct VideoListResponse {
    data: Option<VideoListData>,
}

#[derive(Debug, Clone, Deserialize)]
struct VideoListData {
    items: Option<Vec<VideoListItem>>,
}

/// Fetch video list from the site API.
pub async fn fetch_video_list(
    site_key: &str,
    api_url: &str,
    site_id: u32,
    channel_id: u32,
    tag_id: u32,
) -> Result<Vec<VideoListItem>, String> {
    let site = get_site(site_key);
    let client = reqwest::Client::builder()
        .build()
        .map_err(|e| format!("Failed to build client: {}", e))?;

    let url = format!(
        "https://{}/api/vod/video?tag={}&channel_id={}&site_id={}",
        api_url, tag_id, channel_id, site_id
    );

    let response = client
        .get(&url)
        .header("Referer", &site.referer)
        .header("Origin", &site.origin)
        .send()
        .await
        .map_err(|e| format!("List API request failed: {}", e))?;

    let api_resp: ApiResponse = response
        .json()
        .await
        .map_err(|e| format!("Failed to parse list API response: {}", e))?;

    let x_data = api_resp
        .x_data
        .ok_or_else(|| "No x-data in list API response".to_string())?;

    let json = decrypt_fernet(&site.fernet_key, &x_data)?;
    let list_data: VideoListResponse =
        serde_json::from_slice(&json).map_err(|e| format!("Failed to parse video list: {}", e))?;

    Ok(list_data.data.and_then(|d| d.items).unwrap_or_default())
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn test_decrypt_key_length() {
        // Fernet key must be 32 bytes URL-safe base64 encoded
        let key = "abcdefghijklmnopqrstuvwxyz0123456789ABCDEFGHIJKLMNOPQRSTUVWXYZab"; // 64 chars = junk, just test decode
        let result = URL_SAFE.decode(key);
        assert!(result.is_ok());
    }

    #[test]
    fn test_invalid_key_length() {
        let result = decrypt_fernet("short", "gAAAAAB...");
        assert!(result.is_err());
    }
}
