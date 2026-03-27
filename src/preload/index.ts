// Preload stub — expanded in Task 4
import { contextBridge } from 'electron'

contextBridge.exposeInMainWorld('electronAPI', {})
