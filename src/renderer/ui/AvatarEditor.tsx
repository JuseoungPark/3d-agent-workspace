import React from 'react'
import { useWorkspaceStore } from '../store/workspace'
import { getRoleConfig } from '../types'
import { HairStyle } from '../scene/HairPiece'

const FACE_OPTIONS = ['😐', '🙂', '🤔', '😤', '😡', '😎', '🧐', '🥳', '😈', '😴']

const HAIR_STYLES: HairStyle[] = ['SHORT', 'LONG', 'SPIKY', 'BUN', 'CURLY', 'HELMET', 'PONYTAIL', 'BALD']

const HAIR_COLORS = [
  '#1a1a1a', '#3d2b1f', '#8b5e3c', '#c8a96e', '#f4d03f',
  '#e74c3c', '#9b59b6', '#2980b9', '#27ae60', '#ecf0f1',
]

export function AvatarEditor() {
  const selectedAgentId = useWorkspaceStore(s => s.selectedAgentId)
  const agents = useWorkspaceStore(s => s.agents)
  const avatarOverrides = useWorkspaceStore(s => s.avatarOverrides)
  const setAvatarOverride = useWorkspaceStore(s => s.setAvatarOverride)

  if (!selectedAgentId) return null
  const agent = agents[selectedAgentId]
  if (!agent) return null

  const { color, face: defaultFace } = getRoleConfig(agent.type)
  const override = avatarOverrides[selectedAgentId] ?? {}
  const currentFace = override.face ?? defaultFace
  const currentHair = override.hairStyle ?? 'SHORT'
  const currentHairColor = override.hairColor ?? '#1a1a1a'
  const voiceEnabled = override.voiceEnabled ?? true

  const panelStyle: React.CSSProperties = {
    position: 'fixed',
    right: 16,
    top: '50%',
    transform: 'translateY(-50%)',
    background: 'rgba(2,6,23,0.92)',
    border: `1px solid ${color}44`,
    borderRadius: 12,
    padding: '14px 16px',
    zIndex: 200,
    width: 180,
    backdropFilter: 'blur(12px)',
    display: 'flex',
    flexDirection: 'column',
    gap: 14,
    color: '#e2e8f0',
    fontFamily: 'monospace',
  }

  const labelStyle: React.CSSProperties = {
    fontSize: 10,
    color: color,
    fontWeight: 'bold',
    letterSpacing: 1,
    marginBottom: 6,
    textTransform: 'uppercase',
  }

  return (
    <div style={panelStyle} onPointerDown={e => e.stopPropagation()}>
      {/* Header */}
      <div style={{ fontSize: 12, fontWeight: 'bold', color, borderBottom: `1px solid ${color}33`, paddingBottom: 8 }}>
        {agent.type}
      </div>

      {/* Face */}
      <div>
        <div style={labelStyle}>Face</div>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(5, 1fr)', gap: 4 }}>
          {FACE_OPTIONS.map(f => (
            <button
              key={f}
              onClick={() => setAvatarOverride(selectedAgentId, { face: f })}
              style={{
                background: currentFace === f ? `${color}33` : 'transparent',
                border: currentFace === f ? `1px solid ${color}` : '1px solid #334155',
                borderRadius: 6,
                fontSize: 16,
                cursor: 'pointer',
                padding: '3px 0',
                lineHeight: 1,
              }}
            >
              {f}
            </button>
          ))}
        </div>
      </div>

      {/* Hair Style */}
      <div>
        <div style={labelStyle}>Hair</div>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 3 }}>
          {HAIR_STYLES.map(s => (
            <button
              key={s}
              onClick={() => setAvatarOverride(selectedAgentId, { hairStyle: s })}
              style={{
                background: currentHair === s ? `${color}33` : 'transparent',
                border: currentHair === s ? `1px solid ${color}` : '1px solid #334155',
                borderRadius: 5,
                color: currentHair === s ? color : '#94a3b8',
                fontSize: 11,
                fontFamily: 'monospace',
                cursor: 'pointer',
                padding: '3px 8px',
                textAlign: 'left',
              }}
            >
              {s}
            </button>
          ))}
        </div>
      </div>

      {/* Hair Color */}
      <div>
        <div style={labelStyle}>Hair Color</div>
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: 5 }}>
          {HAIR_COLORS.map(c => (
            <button
              key={c}
              onClick={() => setAvatarOverride(selectedAgentId, { hairColor: c })}
              style={{
                width: 22,
                height: 22,
                background: c,
                border: currentHairColor === c ? `2px solid ${color}` : '2px solid transparent',
                borderRadius: 4,
                cursor: 'pointer',
                padding: 0,
                outline: currentHairColor === c ? `1px solid ${color}` : 'none',
              }}
            />
          ))}
        </div>
      </div>

      {/* Voice toggle */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
        <div style={labelStyle}>Voice</div>
        <div
          onClick={() => setAvatarOverride(selectedAgentId, { voiceEnabled: !voiceEnabled })}
          style={{
            width: 36,
            height: 20,
            borderRadius: 10,
            background: voiceEnabled ? color : '#334155',
            cursor: 'pointer',
            position: 'relative',
            transition: 'background 0.2s',
            flexShrink: 0,
          }}
        >
          <div style={{
            position: 'absolute',
            top: 2,
            left: voiceEnabled ? 18 : 2,
            width: 16,
            height: 16,
            borderRadius: '50%',
            background: '#fff',
            transition: 'left 0.2s',
          }} />
        </div>
      </div>
    </div>
  )
}
