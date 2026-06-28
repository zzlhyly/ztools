/**
 * Tauri 窗口控制工具
 */

import { getCurrentWindow } from '@tauri-apps/api/window'

export async function minimizeWindow(): Promise<void> {
  try {
    await getCurrentWindow().minimize()
  } catch (e) {
    console.error('minimizeWindow failed:', e)
  }
}

export async function maximizeWindow(): Promise<void> {
  try {
    const win = getCurrentWindow()
    const isMaximized = await win.isMaximized()
    if (isMaximized) {
      await win.unmaximize()
    } else {
      await win.maximize()
    }
  } catch (e) {
    console.error('maximizeWindow failed:', e)
  }
}

export async function closeWindow(): Promise<void> {
  try {
    await getCurrentWindow().close()
  } catch (e) {
    console.error('closeWindow failed:', e)
  }
}

export async function isWindowMaximized(): Promise<boolean> {
  try {
    return getCurrentWindow().isMaximized()
  } catch {
    return false
  }
}
