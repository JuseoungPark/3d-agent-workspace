import React, { useEffect, useRef } from 'react'
import { useWorkspaceStore } from '../store/workspace'

export function StreamBar() {
  const events = useWorkspaceStore(s => s.streamEvents)
  const last5 = events.slice(-5)
  const barRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    if (barRef.current) barRef.current.scrollLeft = barRef.current.scrollWidth
  }, [events.length])

  return (
    <div style={{
      height: 34,
      background: '#080d14',
      borderTop: '1px solid #0f172a',
      display: 'flex',
      alignItems: 'center',
      padding: '0 12px',
      gap: 20,
      overflow: 'hidden',
    }} ref={barRef}>
      {last5.map((ev, i) => (
        <span
          key={ev.id}
          style={{
            fontSize: 11,
            fontFamily: 'monospace',
            color: i === last5.length - 1 ? '#94a3b8' : '#334155',
            whiteSpace: 'nowrap',
            transition: 'color 0.2s',
            animation: i === last5.length - 1 ? 'slideIn 0.2s ease-out' : undefined,
          }}
        >
          {ev.label}
        </span>
      ))}
    </div>
  )
}
