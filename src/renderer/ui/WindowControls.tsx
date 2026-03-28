import React, { useState } from 'react'
import { useWorkspaceStore } from '../store/workspace'
import { setTTSVolume, getTTSVolume } from '../utils/tts'
import { setSFXVolume, getSFXVolume } from '../utils/sounds'

export function WindowControls() {
  const setBgOpacity = useWorkspaceStore(s => s.setBgOpacity)
  const [opacity, setOpacity] = useState(1)
  const [floated, setFloated] = useState(false)
  const [volume, setVolume] = useState(getTTSVolume())
  const [sfxVol, setSfxVol] = useState(getSFXVolume())

  const handleOpacity = (v: number) => {
    setOpacity(v)
    setBgOpacity(v)
  }

  const handleVolume = (v: number) => {
    setVolume(v)
    setTTSVolume(v)
  }

  const handleSfxVol = (v: number) => {
    setSfxVol(v)
    setSFXVolume(v)
  }

  const handleFloat = () => {
    const next = !floated
    setFloated(next)
    window.electronAPI.setFloatMode(next)
  }

  return (
    <div
      style={{
        position: 'fixed',
        top: 10,
        right: 16,
        zIndex: 999,
        display: 'flex',
        alignItems: 'center',
        gap: 8,
        background: 'rgba(2,6,23,0.75)',
        border: '1px solid #1e293b',
        borderRadius: 20,
        padding: '4px 10px',
        backdropFilter: 'blur(8px)',
        WebkitAppRegion: 'no-drag',
      } as React.CSSProperties}
      onPointerDown={e => e.stopPropagation()}
    >
      <span style={{ fontSize: 11, color: '#475569', userSelect: 'none' }}>◑</span>
      <input
        type="range"
        min={0.05}
        max={1}
        step={0.05}
        value={opacity}
        onChange={e => handleOpacity(parseFloat(e.target.value))}
        style={{ width: 56, accentColor: '#3b82f6', cursor: 'pointer' }}
        title="배경 투명도"
      />
      <span style={{ fontSize: 10, color: '#475569', userSelect: 'none' }}>🎵</span>
      <input
        type="range"
        min={0}
        max={1}
        step={0.05}
        value={sfxVol}
        onChange={e => handleSfxVol(parseFloat(e.target.value))}
        style={{ width: 48, accentColor: '#f59e0b', cursor: 'pointer' }}
        title="효과음 볼륨"
      />
      <span style={{ fontSize: 11, color: '#475569', userSelect: 'none' }}>🔊</span>
      <input
        type="range"
        min={0}
        max={1}
        step={0.05}
        value={volume}
        onChange={e => handleVolume(parseFloat(e.target.value))}
        style={{ width: 48, accentColor: '#10b981', cursor: 'pointer' }}
        title="목소리 볼륨"
      />
      <button
        onClick={handleFloat}
        title={floated ? '일반 모드' : '미니멀 모드 (항상 위)'}
        style={{
          background: floated ? '#3b82f622' : 'transparent',
          border: floated ? '1px solid #3b82f6' : '1px solid transparent',
          borderRadius: 6,
          color: floated ? '#3b82f6' : '#475569',
          fontSize: 13,
          cursor: 'pointer',
          padding: '1px 5px',
          lineHeight: 1,
        }}
      >
        📌
      </button>
    </div>
  )
}
