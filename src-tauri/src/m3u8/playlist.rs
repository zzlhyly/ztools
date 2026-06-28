use serde::{Deserialize, Serialize};
use regex::Regex;

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct M3u8Quality {
    pub bandwidth: u64,
    pub resolution: String,
    pub url: String,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct KeyInfo {
    pub method: String,
    pub uri: Option<String>,
    pub iv: Option<String>,
    pub start_segment: usize,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct SegmentInfo {
    pub url: String,
    pub duration: f64,
    pub index: usize,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub enum PlaylistType {
    Master,
    Media,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct PlaylistInfo {
    pub playlist_type: PlaylistType,
    pub qualities: Vec<M3u8Quality>,
    pub segments: Vec<SegmentInfo>,
    pub keys: Vec<KeyInfo>,
    pub has_encryption: bool,
    pub has_endlist: bool,
    pub raw: String,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct M3u8UrlInfo {
    pub url: String,
    pub label: String,
}

/// Parse an M3U8 playlist string and return structured info.
pub fn parse_m3u8(content: &str) -> PlaylistInfo {
    let lines: Vec<&str> = content.lines().map(|l| l.trim()).collect();

    let has_master = lines.iter().any(|l| l.starts_with("#EXT-X-STREAM-INF"));
    let has_endlist = lines.iter().any(|l| l.starts_with("#EXT-X-ENDLIST"));

    if has_master {
        parse_master_playlist(&lines)
    } else {
        parse_media_playlist(&lines, has_endlist, content)
    }
}

fn parse_master_playlist(lines: &[&str]) -> PlaylistInfo {
    let mut qualities = Vec::new();
    let mut i = 0;

    while i < lines.len() {
        if lines[i].starts_with("#EXT-X-STREAM-INF") {
            let mut bandwidth: u64 = 0;
            let mut resolution = String::from("unknown");

            let line = lines[i];
            if let Some(bw_start) = line.find("BANDWIDTH=") {
                let bw_part = &line[bw_start + 10..];
                let bw_end = bw_part.find(',').unwrap_or(bw_part.len());
                bandwidth = bw_part[..bw_end].parse().unwrap_or(0);
            }
            if let Some(res_start) = line.find("RESOLUTION=") {
                let res_part = &line[res_start + 11..];
                let res_end = res_part.find(',').unwrap_or(res_part.len());
                resolution = res_part[..res_end].to_string();
            }

            for j in i + 1..lines.len() {
                if !lines[j].is_empty() && !lines[j].starts_with('#') {
                    qualities.push(M3u8Quality {
                        bandwidth,
                        resolution: resolution.clone(),
                        url: lines[j].to_string(),
                    });
                    i = j;
                    break;
                }
            }
        }
        i += 1;
    }

    PlaylistInfo {
        playlist_type: PlaylistType::Master,
        qualities,
        segments: vec![],
        keys: vec![],
        has_encryption: false,
        has_endlist: true,
        raw: String::new(),
    }
}

fn parse_media_playlist(lines: &[&str], has_endlist: bool, raw: &str) -> PlaylistInfo {
    let mut segments = Vec::new();
    let mut keys = Vec::new();
    let mut has_encryption = false;
    let mut seg_index = 0;

    for (i, line) in lines.iter().enumerate() {
        if line.starts_with("#EXT-X-KEY") {
            let mut method = String::new();
            let mut uri: Option<String> = None;
            let mut iv: Option<String> = None;

            if let Some(m_start) = line.find("METHOD=") {
                let m_part = &line[m_start + 7..];
                let m_end = m_part.find(',').unwrap_or(m_part.len());
                method = m_part[..m_end].to_string();
            }

            if let Some(u_start) = line.find("URI=\"") {
                let u_part = &line[u_start + 5..];
                if let Some(u_end) = u_part.find('"') {
                    uri = Some(u_part[..u_end].to_string());
                }
            }

            if let Some(iv_start) = line.find("IV=0x") {
                let iv_part = &line[iv_start + 5..];
                let iv_end = iv_part.find(',').unwrap_or(iv_part.len());
                iv = Some(iv_part[..iv_end].to_string());
            }

            if method == "AES-128" {
                has_encryption = true;
                let ki = KeyInfo {
                    method,
                    uri,
                    iv,
                    start_segment: seg_index,
                };
                keys.push(ki);
            }
        }

        if line.starts_with("#EXTINF") {
            let duration: f64 = line
                .trim_start_matches("#EXTINF:")
                .split(',')
                .next()
                .unwrap_or("0")
                .parse()
                .unwrap_or(0.0);

            segments.push(SegmentInfo {
                url: String::new(), // placeholder, filled below
                duration,
                index: seg_index,
            });

            // Look ahead for the URL on the next lines
            for j in i + 1..lines.len() {
                if !lines[j].is_empty() && !lines[j].starts_with('#') {
                    if let Some(seg) = segments.last_mut() {
                        seg.url = lines[j].to_string();
                    }
                    break;
                }
            }
            seg_index += 1;
        }
    }

    PlaylistInfo {
        playlist_type: PlaylistType::Media,
        qualities: vec![],
        segments,
        keys,
        has_encryption,
        has_endlist,
        raw: raw.to_string(),
    }
}

/// Extract M3U8 URLs from HTML content.
pub fn extract_m3u8_urls(html: &str, _base_url: &str) -> Vec<M3u8UrlInfo> {
    let mut results = Vec::new();

    // Strategy 1: Regex for .m3u8 patterns in the HTML
    let re = Regex::new(r#"https?://[^\s"'<>]+\.m3u8[^\s"'<>]*"#).unwrap();
    for cap in re.find_iter(html) {
        let url = cap.as_str().to_string();
        if !results.iter().any(|r: &M3u8UrlInfo| r.url == url) {
            results.push(M3u8UrlInfo {
                url,
                label: String::new(),
            });
        }
    }

    // Strategy 2: Parse <video> and <source> tags with scraper
    let document = scraper::Html::parse_document(html);
    let video_selector = scraper::Selector::parse("video source, video[src]").unwrap();

    for element in document.select(&video_selector) {
        if let Some(src) = element.value().attr("src") {
            if !src.starts_with("http") {
                continue;
            }
            if src.contains(".m3u8") || src.contains("m3u8") {
                let label = element.value().attr("title").unwrap_or("").to_string();
                if let Some(existing) = results.iter_mut().find(|r| r.url == src) {
                    if existing.label.is_empty() {
                        existing.label = label;
                    }
                } else {
                    results.push(M3u8UrlInfo {
                        url: src.to_string(),
                        label,
                    });
                }
            }
        }
    }

    results
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn test_parse_master_playlist() {
        let content = "#EXTM3U\n#EXT-X-STREAM-INF:BANDWIDTH=2000000,RESOLUTION=1920x1080\nhttps://example.com/high.m3u8\n#EXT-X-STREAM-INF:BANDWIDTH=1000000,RESOLUTION=1280x720\nhttps://example.com/low.m3u8\n";
        let info = parse_m3u8(content);

        assert!(matches!(info.playlist_type, PlaylistType::Master));
        assert_eq!(info.qualities.len(), 2);
        assert_eq!(info.qualities[0].bandwidth, 2000000);
        assert_eq!(info.qualities[0].resolution, "1920x1080");
        assert_eq!(info.qualities[0].url, "https://example.com/high.m3u8");
        assert_eq!(info.qualities[1].bandwidth, 1000000);
        assert_eq!(info.qualities[1].resolution, "1280x720");
    }

    #[test]
    fn test_parse_media_playlist_with_aes_encryption() {
        let content = "#EXTM3U\n#EXT-X-VERSION:3\n#EXT-X-KEY:METHOD=AES-128,URI=\"https://example.com/key.bin\",IV=0x00000000000000000000000000000001\n#EXTINF:10.0,\nhttps://example.com/seg-1.ts\n#EXTINF:10.0,\nhttps://example.com/seg-2.ts\n#EXT-X-ENDLIST\n";
        let info = parse_m3u8(content);

        assert!(matches!(info.playlist_type, PlaylistType::Media));
        assert_eq!(info.segments.len(), 2);
        assert!(info.has_encryption);
        assert_eq!(info.keys.len(), 1);
        assert_eq!(info.keys[0].method, "AES-128");
        assert_eq!(info.keys[0].uri.as_deref(), Some("https://example.com/key.bin"));
        assert_eq!(info.keys[0].iv.as_deref(), Some("00000000000000000000000000000001"));
        assert!(info.has_endlist);
    }

    #[test]
    fn test_parse_media_playlist_no_encryption() {
        let content = "#EXTM3U\n#EXTINF:5.0,\nhttps://example.com/seg-1.ts\n#EXTINF:5.0,\nhttps://example.com/seg-2.ts\n#EXT-X-ENDLIST\n";
        let info = parse_m3u8(content);

        assert_eq!(info.segments.len(), 2);
        assert!(!info.has_encryption);
        assert!(info.keys.is_empty());
    }

    #[test]
    fn test_parse_rotating_keys() {
        let content = "#EXTM3U\n#EXT-X-KEY:METHOD=AES-128,URI=\"key1.bin\"\n#EXTINF:10.0,\nseg1.ts\n#EXT-X-KEY:METHOD=AES-128,URI=\"key2.bin\"\n#EXTINF:10.0,\nseg2.ts\n#EXT-X-ENDLIST\n";
        let info = parse_m3u8(content);

        assert_eq!(info.keys.len(), 2);
        assert_eq!(info.keys[0].uri.as_deref(), Some("key1.bin"));
        assert_eq!(info.keys[0].start_segment, 0);
        assert_eq!(info.keys[1].uri.as_deref(), Some("key2.bin"));
        assert_eq!(info.keys[1].start_segment, 1);
    }

    #[test]
    fn test_extract_m3u8_from_html() {
        let html = r#"<html><body><video><source src="https://example.com/video.m3u8" title="Main Video"></video></body></html>"#;
        let urls = extract_m3u8_urls(html, "https://example.com/");

        assert!(!urls.is_empty());
        assert_eq!(urls[0].url, "https://example.com/video.m3u8");
        assert_eq!(urls[0].label, "Main Video");
    }

    #[test]
    fn test_extract_m3u8_from_raw_text() {
        let html = r#"<script>var src = "https://cdn.example.com/stream/index.m3u8?token=abc";</script>"#;
        let urls = extract_m3u8_urls(html, "https://cdn.example.com/");

        assert_eq!(urls.len(), 1);
        assert!(urls[0].url.contains("index.m3u8"));
    }

    #[test]
    fn test_parse_media_playlist_with_iv() {
        let content = "#EXTM3U\n#EXT-X-KEY:METHOD=AES-128,URI=\"key.bin\",IV=0xABCDEF1234567890ABCDEF1234567890\n#EXTINF:10.0,\nseg1.ts\n#EXT-X-ENDLIST\n";
        let info = parse_m3u8(content);

        assert_eq!(info.keys[0].iv.as_deref(), Some("ABCDEF1234567890ABCDEF1234567890"));
    }
}
