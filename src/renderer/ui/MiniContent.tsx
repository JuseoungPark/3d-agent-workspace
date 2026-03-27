import React from 'react'
import { useWorkspaceStore } from '../store/workspace'
import { getRoleConfig } from '../types'

export function MiniContent() {
  const agents = useWorkspaceStore(s => s.agents)
  const lastEvent = useWorkspaceStore(s => s.streamEvents.at(-1))

  return (
    <div style={{
      background: 'rgba(2,6,23,0.92)',
      borderRadius: 12,
      padding: '10px 14px',
      color: '#94a3b8',
      fontFamily: 'monospace',
      fontSize: 11,
      backdropFilter: 'blur(16px)',
      border: '1px solid #0f172a',
      height: '100%',
    }}>
      <div style={{ fontSize: 9, color: '#334155', letterSpacing: 2, marginBottom: 8 }}>
        AGENT WORKSPACE
      </div>
      {Object.values(agents).slice(0, 6).map(agent => {
        const { emoji, color } = getRoleConfig(agent.type)
        return (
          <div key={agent.id} style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 4 }}>
            <span style={{ fontSize: 8, width: 6, height: 6, borderRadius: '50%', background: color, display: 'inline-block' }} />
            <span>{emoji} {agent.type}</span>
            <span style={{ color: '#475569', marginLeft: 'auto' }}>{agent.status}</span>
          </div>
        )
      })}
      {lastEvent && (
        <div style={{ marginTop: 8, color: '#475569', fontSize: 10, borderTop: '1px solid #0f172a', paddingTop: 6 }}>
          {lastEvent.label}
        </div>
      )}
    </div>
  )
}
