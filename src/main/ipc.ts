import { ipcMain, BrowserWindow, screen } from 'electron'
import { spawn } from 'child_process'
import { getEventBuffer, getActualPort, setEventHandler } from './server'
import { WSEvent } from './types'
import { toggleMiniWindow, getMiniWindow } from './mini-window'

export function setupIPC(mainWindow: BrowserWindow) {
  let normalBounds: Electron.Rectangle | null = null

  setEventHandler((event: WSEvent) => {
    mainWindow.webContents.send('agent-event', event)
    const mini = getMiniWindow()
    if (mini) mini.webContents.send('agent-event', event)
  })

  ipcMain.handle('get-event-buffer', () => getEventBuffer())
  ipcMain.handle('get-server-port', () => getActualPort())
  ipcMain.on('toggle-mini', () => toggleMiniWindow())

  // Float mode: small window pinned to top-right, always on top
  ipcMain.handle('set-float-mode', (_: Electron.IpcMainInvokeEvent, enabled: boolean) => {
    if (enabled) {
      normalBounds = mainWindow.getBounds()
      const { workArea } = screen.getPrimaryDisplay()
      mainWindow.setAlwaysOnTop(true, 'floating')
      const w = 480, h = 360
      mainWindow.setBounds({ x: workArea.x + workArea.width - w - 12, y: workArea.y + 8, width: w, height: h }, true)
    } else {
      mainWindow.setAlwaysOnTop(false)
      if (normalBounds) mainWindow.setBounds(normalBounds, true)
      normalBounds = null
    }
  })

  // Open terminal (Ghostty → iTerm2 → Terminal)
  ipcMain.handle('open-terminal', () => {
    const proc = spawn('open', ['-a', 'Ghostty'])
    proc.on('close', (code: number) => {
      if (code !== 0) {
        const fallback = spawn('open', ['-a', 'iTerm2'])
        fallback.on('close', (code2: number) => {
          if (code2 !== 0) spawn('open', ['-a', 'Terminal'])
        })
      }
    })
  })
}
