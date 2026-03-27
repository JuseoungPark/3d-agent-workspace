import React from 'react'
import { Html } from '@react-three/drei'

interface SpeechBubbleProps {
  text: string
  type?: 'solo' | 'meeting'
  isTyping?: boolean
}

export function SpeechBubble({ text, type = 'solo', isTyping = false }: SpeechBubbleProps) {
  return (
    <Html position={[0, 2.4, 0]} center style={{ pointerEvents: 'none' }}>
      <div style={{
        background: 'white',
        color: '#1a1a1a',
        padding: '5px 10px',
        borderRadius: '10px 10px 10px 3px',
        border: '2px solid #222',
        fontSize: 12,
        fontFamily: 'monospace',
        fontWeight: 'bold',
        whiteSpace: 'nowrap',
        maxWidth: 180,
        overflow: 'hidden',
        textOverflow: 'ellipsis',
        boxShadow: '2px 2px 0 #222',
        transform: 'translate(-50%, -100%)',
      }}>
        {isTyping ? (
          <span style={{ display: 'inline-flex', gap: 3, alignItems: 'center' }}>
            {[0, 0.2, 0.4].map(delay => (
              <span key={delay} style={{
                width: 6, height: 6, borderRadius: '50%',
                background: '#6366f1', display: 'inline-block',
                animation: `bubble-dot 1.1s ${delay}s infinite`,
              }} />
            ))}
          </span>
        ) : text}
      </div>
    </Html>
  )
}
