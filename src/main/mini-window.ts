import { BrowserWindow } from 'electron'
import { join } from 'path'

let miniWindow: BrowserWindow | null = null

export function getMiniWindow(): BrowserWindow | null {
  return miniWindow && !miniWindow.isDestroyed() ? miniWindow : null
}

export function toggleMiniWindow() {
  if (miniWindow && !miniWindow.isDestroyed()) {
    miniWindow.close()
    miniWindow = null
    return
  }

  miniWindow = new BrowserWindow({
    width: 300,
    height: 200,
    alwaysOnTop: true,
    transparent: true,
    frame: false,
    hasShadow: true,
    resizable: false,
    ...(process.platform === 'darwin' ? { vibrancy: 'under-window' } : {}),
    webPreferences: {
      preload: join(__dirname, '../preload/index.js'),
      contextIsolation: true,
      nodeIntegration: false,
    },
  })

  const url = process.env.ELECTRON_RENDERER_URL
  if (url) {
    miniWindow.loadURL(`${url}?mini=1`)
  } else {
    miniWindow.loadFile(join(__dirname, '../renderer/index.html'), {
      query: { mini: '1' },
    })
  }
}
