import { app, BrowserWindow } from 'electron'
import { join } from 'path'
import { readFileSync } from 'fs'
import http from 'http'
import { startServer } from './server'
import { setupIPC } from './ipc'

const PID_FILE = '/tmp/claude-agent-workspace.pid'

let mainWindow: BrowserWindow | null = null
let httpServer: http.Server | null = null
let pidWatcher: ReturnType<typeof setInterval> | null = null

function startPidWatcher() {
  pidWatcher = setInterval(() => {
    let content: string
    try {
      content = readFileSync(PID_FILE, 'utf8').trim()
    } catch {
      return // PID file not yet created — no sessions started
    }

    const pids = content.split('\n')
      .map(s => parseInt(s.trim(), 10))
      .filter(n => !isNaN(n))

    if (pids.length === 0) return

    const anyAlive = pids.some(pid => {
      try {
        process.kill(pid, 0) // signal 0 = probe only
        return true
      } catch (err: any) {
        return err.code === 'EPERM' // process exists, no permission → treat as alive
      }
    })

    if (!anyAlive) {
      console.log('[agent-workspace] all Claude Code sessions gone, quitting')
      app.quit()
    }
  }, 5000)
}

function createMainWindow() {
  mainWindow = new BrowserWindow({
    width: 1200,
    height: 800,
    minWidth: 360,
    minHeight: 260,
    transparent: true,
    titleBarStyle: 'hiddenInset',
    webPreferences: {
      preload: join(__dirname, '../preload/index.js'),
      contextIsolation: true,
      nodeIntegration: false,
    },
  })

  if (process.env.ELECTRON_RENDERER_URL) {
    mainWindow.loadURL(process.env.ELECTRON_RENDERER_URL)
  } else {
    mainWindow.loadFile(join(__dirname, '../renderer/index.html'))
  }

  mainWindow.setAlwaysOnTop(true, 'floating')
  setupIPC(mainWindow)
}

// Prevent multiple Electron instances from stacking up
if (!app.requestSingleInstanceLock()) {
  app.quit()
}

app.whenReady().then(async () => {
  httpServer = await startServer()
  createMainWindow()
  startPidWatcher()
})

app.on('before-quit', () => {
  if (pidWatcher) {
    clearInterval(pidWatcher)
    pidWatcher = null
  }
  if (httpServer) {
    httpServer.close()
    httpServer = null
  }
})

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') app.quit()
})
