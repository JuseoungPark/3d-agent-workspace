import React, { useEffect, useRef, useState } from 'react'
import { useWorkspaceStore } from '../store/workspace'

const GREETINGS = ['...응?', '뭐야.', '찹츄?', '왜 불러요', '바빠요', '니옹스?', '...', '으잉?']

const ROLE_REPLIES: Record<string, string[]> = {
  analyst:   ['찹츄... 잠깐?', '흠... 봐봐야겠어', '어 이거 신기한데?', '잠깐 분석해볼게'],
  writer:    ['오 재밌겠다!', '찹츄~ 써줄게', '고고!', '바로 해볼게요'],
  executor:  ['ㅇㅋ 바로 ㄱ', '찹츄 시작!', '금방임', '잠깐만'],
  debugger:  ['어디서 터진겨...', '찹츄? 버그야?', '으음... 봐볼게', '잠깐 파볼게'],
  reviewer:  ['흠... 좀 봐야겠어', '찹츄~ 확인해볼게', '이거 좀 수상한데', '잠깐만요'],
  planner:   ['찹츄... 계획 세워야지', '오케이 생각해볼게', '흠 어떻게 할까', '잠깐 그려볼게'],
  architect: ['찹츄~ 설계해볼게', '오 재밌는 문제네', '흠... 구조를 봐야겠어', '잠깐'],
  default:   ['찹츄?', '오케이~', '잠깐만', '어 알겠어', '응응!', '찹츄~'],
}

function getReplies(type: string): string[] {
  return ROLE_REPLIES[type] ?? ROLE_REPLIES.default
}

export function ChatInput() {
  const selectedAgentId = useWorkspaceStore(s => s.selectedAgentId)
  const agents = useWorkspaceStore(s => s.agents)
  const selectAgent = useWorkspaceStore(s => s.selectAgent)
  const setCameraMode = useWorkspaceStore(s => s.setCameraMode)
  const setAgentChatMessage = useWorkspaceStore(s => s.setAgentChatMessage)
  const inputRef = useRef<HTMLInputElement>(null)
  const [visible, setVisible] = useState(true)

  const selected = selectedAgentId ? agents[selectedAgentId] : null

  // Show greeting and reset visibility when agent selected
  useEffect(() => {
    if (!selectedAgentId || !selected) return
    setVisible(true)
    const greeting = GREETINGS[Math.floor(Math.random() * GREETINGS.length)]
    setAgentChatMessage(selectedAgentId, greeting)
    setTimeout(() => inputRef.current?.focus(), 60)
  }, [selectedAgentId])

  if (!selected || !visible) return null

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Escape') { selectAgent(null); return }
    if (e.key !== 'Enter') return
    e.preventDefault()
    const txt = inputRef.current?.value.trim()
    if (!txt || !selectedAgentId) return

    // Hide input, zoom out, open terminal
    setVisible(false)
    setCameraMode('overview')

    // Show random reply then open terminal
    setAgentChatMessage(selectedAgentId, '__typing__')
    const replies = getReplies(selected.type)
    const reply = replies[Math.floor(Math.random() * replies.length)]
    setTimeout(() => {
      setAgentChatMessage(selectedAgentId, reply)
      setTimeout(() => setAgentChatMessage(selectedAgentId, null), 2800)
    }, 500 + Math.random() * 400)

    window.electronAPI.openTerminal()
  }

  return (
    <div style={{
      position: 'fixed',
      bottom: 46,
      left: '50%',
      transform: 'translateX(-50%)',
      zIndex: 100,
      display: 'flex',
      alignItems: 'center',
      gap: 8,
    }}>
      <div style={{
        color: '#64748b',
        fontSize: 12,
        fontFamily: 'monospace',
      }}>
        {selected.type} ›
      </div>
      <input
        ref={inputRef}
        onKeyDown={handleKeyDown}
        placeholder="말 걸어봐요..."
        style={{
          background: 'rgba(15,20,40,0.92)',
          border: '1px solid #334155',
          borderRadius: 8,
          color: '#e2e8f0',
          fontSize: 13,
          fontFamily: 'monospace',
          padding: '6px 14px',
          width: 280,
          outline: 'none',
          backdropFilter: 'blur(8px)',
        }}
      />
      <button
        onClick={() => selectAgent(null)}
        style={{
          background: 'transparent',
          border: 'none',
          color: '#475569',
          cursor: 'pointer',
          fontSize: 16,
        }}
      >✕</button>
    </div>
  )
}
