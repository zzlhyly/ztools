use std::path::Path;
use std::process::Command;
use tracing::{debug, error, info};

/// Convert TS segments in `temp_dir` to an MP4 file at `output_path` using ffmpeg.
/// Returns Ok(()) on success.
pub fn convert_to_mp4(
    temp_dir: &Path,
    output_path: &Path,
    ffmpeg_path: &str,
) -> Result<(), String> {
    debug!(
        "Converting TS segments from {:?} to {:?}",
        temp_dir, output_path
    );
    let concat_file = temp_dir.join("concat.txt");
    let mut entries: Vec<_> = std::fs::read_dir(temp_dir)
        .map_err(|e| format!("Failed to read temp dir: {}", e))?
        .filter_map(|entry| entry.ok())
        .filter(|e| e.path().extension().map(|ext| ext == "ts").unwrap_or(false))
        .collect();
    entries.sort_by_key(|e| e.file_name());

    let mut content = String::new();
    for entry in &entries {
        let path = entry.path();
        content.push_str(&format!("file '{}'\n", path.to_string_lossy()));
    }

    std::fs::write(&concat_file, &content)
        .map_err(|e| format!("Failed to write concat file: {}", e))?;

    if let Some(parent) = output_path.parent() {
        std::fs::create_dir_all(parent)
            .map_err(|e| format!("Failed to create output dir: {}", e))?;
    }

    let output = Command::new(ffmpeg_path)
        .args([
            "-f",
            "concat",
            "-safe",
            "0",
            "-i",
            concat_file.to_string_lossy().as_ref(),
            "-c",
            "copy",
            "-y",
            output_path.to_string_lossy().as_ref(),
        ])
        .output()
        .map_err(|e| format!("Failed to execute ffmpeg: {}", e))?;

    std::fs::remove_file(&concat_file).ok();

    if !output.status.success() {
        let stderr = String::from_utf8_lossy(&output.stderr);
        error!("FFmpeg conversion failed: {}", stderr);
        return Err(format!("ffmpeg failed: {}", stderr));
    }

    info!("Conversion complete: {:?}", output_path);
    Ok(())
}

#[cfg(test)]
mod tests {
    use super::*;
    use std::fs;

    #[test]
    fn test_concat_file_generation() {
        let tmp = std::env::temp_dir().join("ztools_conv_test");
        fs::create_dir_all(&tmp).unwrap();

        // Create dummy TS files
        fs::write(tmp.join("00001.ts"), b"dummy").unwrap();
        fs::write(tmp.join("00002.ts"), b"dummy").unwrap();
        fs::write(tmp.join("note.txt"), b"not a ts file").unwrap();

        let output = tmp.join("output.mp4");

        // Use a non-existent ffmpeg — this will fail but the concat file
        // should have been generated correctly before ffmpeg runs.
        let _result = convert_to_mp4(&tmp, &output, "nonexistent_ffmpeg");

        // Verify concat file was created with correct entries
        let concat = tmp.join("concat.txt");
        let content = fs::read_to_string(&concat).unwrap_or_default();
        assert!(content.contains("file '"));
        assert!(content.contains("00001.ts"));
        assert!(content.contains("00002.ts"));
        assert!(!content.contains("note.txt"));

        // Should fail because ffmpeg doesn't exist
        assert!(_result.is_err());

        fs::remove_dir_all(&tmp).ok();
    }

    #[test]
    fn test_empty_temp_dir() {
        let tmp = std::env::temp_dir().join("ztools_conv_empty");
        fs::create_dir_all(&tmp).unwrap();
        let output = tmp.join("output.mp4");

        let _result = convert_to_mp4(&tmp, &output, "nonexistent_ffmpeg");
        let concat = tmp.join("concat.txt");
        let content = fs::read_to_string(&concat).unwrap_or_default();
        // Empty dir — no TS files, so concat should be empty
        assert_eq!(content, "");

        fs::remove_dir_all(&tmp).ok();
    }
}
