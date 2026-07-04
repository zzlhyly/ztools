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
}
