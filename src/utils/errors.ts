/**
 * Tauri command error wrapper.
 * Carries a machine-readable code for i18n and a human-readable message for display.
 */
export class TauriError extends Error {
  constructor(
    message: string,
    public readonly code: string,
  ) {
    super(message)
    this.name = 'TauriError'
  }

  /**
   * Parse a Tauri error string (which may include a [CODE] bracket prefix from Rust `thiserror`)
   * and return a TauriError with the extracted code and cleaned message.
   *
   * Format:  `[NETWORK_ERROR] Connection refused`
   *           `[FILE_NOT_FOUND] /path: No such file`
   *
   * If no bracket prefix is found, falls back to the provided defaultCode.
   */
  static from(rawError: unknown, defaultCode = 'UNKNOWN'): TauriError {
    const msg = String(rawError)
    const match = msg.match(/^\[([A-Z_]+)\]\s*(.*)$/s)
    if (match) {
      return new TauriError(match[2] || msg, match[1])
    }
    return new TauriError(msg, defaultCode)
  }
}
