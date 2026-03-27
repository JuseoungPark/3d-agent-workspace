import { contextBridge, ipcRenderer } from 'electron'

contextBridge.exposeInMainWorld('electronAPI', {
  // Renderer subscribes to events
  onAgentEvent: (callback: (event: unknown) => void) => {
    ipcRenderer.on('agent-event', (_evt, data) => callback(data))
    return () => ipcRenderer.removeAllListeners('agent-event')
  },
  // Get buffered events on load
  getEventBuffer: (): Promise<unknown[]> =>
    ipcRenderer.invoke('get-event-buffer'),
  // Get server port
  getServerPort: (): Promise<number> =>
    ipcRenderer.invoke('get-server-port'),
  // Mini window toggle
  toggleMini: () => ipcRenderer.send('toggle-mini'),
})
