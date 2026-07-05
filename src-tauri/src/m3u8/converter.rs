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
