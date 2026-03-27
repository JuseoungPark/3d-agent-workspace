import React, { useEffect } from 'react'
import { useWorkspaceStore } from './store/workspace'
import { WSEvent } from './types'
import { Scene } from './scene/Scene'
import { StreamBar } from './ui/StreamBar'

export default function App() {
  const handleEvent = useWorkspaceStore(s => s.handleEvent)
  const setServerConnected = useWorkspaceStore(s => s.setServerConnected)

  useEffect(() => {
    // Replay buffered events from before renderer loaded
    window.electronAPI.getEventBuffer().then((events: unknown[]) => {
      ;(events as WSEvent[]).forEach(handleEvent)
      setServerConnected(true)
    })

    // Live events
    const unsub = window.electronAPI.onAgentEvent((event: unknown) => {
      handleEvent(event as WSEvent)
    })

    // Dev helper
    ;(window as any).__testEvent = handleEvent

    return () => { unsub?.() }
  }, [handleEvent, setServerConnected])

  // Keyboard shortcuts
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'f' || e.key === 'F') {
        useWorkspaceStore.getState().setViewMode('fullscreen')
      }
      if ((e.metaKey || e.ctrlKey) && e.key === 'm') {
        window.electronAPI.toggleMini()
      }
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [])

  return (
    <div style={{ display: 'flex', flexDirection: 'column', height: '100vh', background: '#020617' }}>
      <Scene />
      <StreamBar />
    </div>
  )
}
