/**
 * Tauri 窗口控制工具
 */

import { getCurrentWindow } from '@tauri-apps/api/window'

export async function minimizeWindow(): Promise<void> {
  await getCurrentWindow().minimize()
}

export async function maximizeWindow(): Promise<void> {
  const win = getCurrentWindow()
  const isMaximized = await win.isMaximized()
  if (isMaximized) {
    await win.unmaximize()
  } else {
    await win.maximize()
  }
}

export async function closeWindow(): Promise<void> {
  await getCurrentWindow().close()
}

export async function isWindowMaximized(): Promise<boolean> {
  try {
    return getCurrentWindow().isMaximized()
  } catch {
    return false
  }
}
