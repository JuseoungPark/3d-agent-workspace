import { contextBridge, ipcRenderer } from 'electron'

contextBridge.exposeInMainWorld('electronAPI', {
  // Renderer subscribes to events
  onAgentEvent: (callback: (event: unknown) => void) => {
    const handler = (_evt: Electron.IpcRendererEvent, data: unknown) => callback(data)
    ipcRenderer.on('agent-event', handler)
    return () => ipcRenderer.removeListener('agent-event', handler)
  },
  // Get buffered events on load
  getEventBuffer: (): Promise<unknown[]> =>
    ipcRenderer.invoke('get-event-buffer'),
  // Get server port
  getServerPort: (): Promise<number> =>
    ipcRenderer.invoke('get-server-port'),
  // Mini window toggle
  toggleMini: () => ipcRenderer.send('toggle-mini'),
  // Open terminal app
  openTerminal: (): Promise<void> =>
    ipcRenderer.invoke('open-terminal'),
  // Window controls
  setFloatMode: (enabled: boolean): Promise<void> =>
    ipcRenderer.invoke('set-float-mode', enabled),
})
