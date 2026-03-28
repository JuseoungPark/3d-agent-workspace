import { ipcMain, BrowserWindow } from 'electron'
import { getEventBuffer, getActualPort, setEventHandler } from './server'
import { WSEvent } from './types'
import { toggleMiniWindow, getMiniWindow } from './mini-window'

export function setupIPC(mainWindow: BrowserWindow) {
  // Relay events from HTTP server → renderer
  setEventHandler((event: WSEvent) => {
    mainWindow.webContents.send('agent-event', event)
    const mini = getMiniWindow()
    if (mini) mini.webContents.send('agent-event', event)
  })

  ipcMain.handle('get-event-buffer', () => getEventBuffer())
  ipcMain.handle('get-server-port', () => getActualPort())
  ipcMain.on('toggle-mini', () => toggleMiniWindow())
}
