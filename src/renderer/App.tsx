import React, { useEffect, useState } from 'react'
import { useWorkspaceStore } from './store/workspace'
import { WSEvent } from './types'
import { Scene } from './scene/Scene'
import { StreamBar } from './ui/StreamBar'
import { MiniContent } from './ui/MiniContent'
import { ChatInput } from './ui/ChatInput'
import { AvatarEditor } from './ui/AvatarEditor'
import { WindowControls } from './ui/WindowControls'

const MOVE_STEP = 0.9

export default function App() {
  const isMini = new URLSearchParams(location.search).get('mini') === '1'

  const handleEvent = useWorkspaceStore(s => s.handleEvent)
  const setServerConnected = useWorkspaceStore(s => s.setServerConnected)
  const bgOpacity = useWorkspaceStore(s => s.bgOpacity)
  const [compact, setCompact] = useState(window.innerWidth < 600)

  useEffect(() => {
    const onResize = () => setCompact(window.innerWidth < 600)
    window.addEventListener('resize', onResize)
    return () => window.removeEventListener('resize', onResize)
  }, [])

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

      // Agent movement (WASD / arrow keys) + spacebar punch
      const { selectedAgentId, agents, setAgentTarget, hitAgent } = useWorkspaceStore.getState()
      if (!selectedAgentId) return
      const agent = agents[selectedAgentId]
      if (!agent) return

      // Ignore if user is typing in an input
      if ((e.target as HTMLElement).tagName === 'INPUT') return

      const { x, z } = agent.target
      if (e.key === 'ArrowUp'    || e.key === 'w' || e.key === 'W') { e.preventDefault(); setAgentTarget(selectedAgentId, x, z - MOVE_STEP) }
      if (e.key === 'ArrowDown'  || e.key === 's' || e.key === 'S') { e.preventDefault(); setAgentTarget(selectedAgentId, x, z + MOVE_STEP) }
      if (e.key === 'ArrowLeft'  || e.key === 'a' || e.key === 'A') { e.preventDefault(); setAgentTarget(selectedAgentId, x - MOVE_STEP, z) }
      if (e.key === 'ArrowRight' || e.key === 'd' || e.key === 'D') { e.preventDefault(); setAgentTarget(selectedAgentId, x + MOVE_STEP, z) }

      if (e.key === ' ') {
        e.preventDefault()
        // Find nearest other agent within punch range
        const pos = agent.pos
        let nearest: string | null = null
        let nearestDist = 2.2
        for (const other of Object.values(agents)) {
          if (other.id === selectedAgentId) continue
          const dx = other.pos.x - pos.x
          const dz = other.pos.z - pos.z
          const dist = Math.sqrt(dx * dx + dz * dz)
          if (dist < nearestDist) { nearestDist = dist; nearest = other.id }
        }
        if (nearest) hitAgent(nearest)
      }
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [])

  if (isMini) return <MiniContent />

  return (
    <div style={{ display: 'flex', flexDirection: 'column', height: '100vh', background: `rgba(2,6,23,${bgOpacity})` }}>
      <Scene />
      {!compact && <StreamBar />}
      {!compact && <ChatInput />}
      {!compact && <AvatarEditor />}
      <WindowControls />
    </div>
  )
}
