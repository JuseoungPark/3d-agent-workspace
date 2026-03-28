export type AgentStatus = 'spawning' | 'idle' | 'working' | 'meeting' | 'done' | 'celebrating'

export interface AgentState {
  id: string
  type: string
  status: AgentStatus
  currentTool: string | null
  lastMessage: string | null
  progress: number        // 0–1
  pos: { x: number; z: number }    // current 3D position (xz plane)
  target: { x: number; z: number } // target position
  meetingWith: string[]   // agent_ids in same meeting
  spawnedAt: number       // timestamp
  hitAt?: number          // timestamp of last hit (triggers hit reaction)
  voiceId?: string        // fish.audio reference_id assigned at spawn
}

export type WSEventType = 'agent_start' | 'tool_use' | 'tool_done' | 'message' | 'agent_done' | 'agent_idle' | 'agent_celebrate'

export interface WSEvent {
  type: WSEventType
  agentId: string
  agentType: string
  tool?: string
  input?: Record<string, unknown>
  text?: string
  ts: number
}

export interface StreamEvent {
  id: string
  agentId: string
  agentType: string
  label: string       // display text
  ts: number
}

export type ViewMode = 'default' | 'fullscreen' | 'mini'

// Role → color + emoji + face
export const ROLE_CONFIG: Record<string, { color: string; emoji: string; face: string }> = {
  analyst:            { color: '#7c3aed', emoji: '🔬', face: '🤔' },
  writer:             { color: '#059669', emoji: '✍️', face: '🙂' },
  reviewer:           { color: '#d97706', emoji: '🔍', face: '🧐' },
  'code-reviewer':    { color: '#d97706', emoji: '🔍', face: '🧐' },
  executor:           { color: '#2563eb', emoji: '⚙️', face: '😐' },
  debugger:           { color: '#dc2626', emoji: '🐛', face: '😤' },
  planner:            { color: '#0891b2', emoji: '🗺️', face: '🙂' },
  architect:          { color: '#6d28d9', emoji: '🏛️', face: '😎' },
  explore:            { color: '#65a30d', emoji: '🧭', face: '🙂' },
  verifier:           { color: '#0d9488', emoji: '✅', face: '🧐' },
  tracer:             { color: '#c2410c', emoji: '🔎', face: '😤' },
  'security-reviewer':{ color: '#be185d', emoji: '🛡️', face: '😈' },
  'test-engineer':    { color: '#8b5cf6', emoji: '🧪', face: '🤔' },
  designer:           { color: '#db2777', emoji: '🎨', face: '🥳' },
  'qa-tester':        { color: '#b45309', emoji: '🎯', face: '😎' },
  scientist:          { color: '#0369a1', emoji: '🧬', face: '🧐' },
  'document-specialist':{ color: '#4338ca', emoji: '📚', face: '😴' },
  'git-master':       { color: '#166534', emoji: '🌿', face: '🙂' },
  'code-simplifier':  { color: '#6b7280', emoji: '✂️', face: '😐' },
  critic:             { color: '#9f1239', emoji: '⚖️', face: '😡' },
}

export function getRoleConfig(agentType: string): { color: string; emoji: string; face: string } {
  if (ROLE_CONFIG[agentType]) return ROLE_CONFIG[agentType]
  let hash = 0
  for (const ch of agentType) hash = (hash * 31 + ch.charCodeAt(0)) & 0xffff
  return { color: `hsl(${hash % 360}, 65%, 45%)`, emoji: '🤖', face: '🤖' }
}

declare global {
  interface Window {
    electronAPI: {
      onAgentEvent: (cb: (event: unknown) => void) => (() => void)
      getEventBuffer: () => Promise<unknown[]>
      getServerPort: () => Promise<number>
      toggleMini: () => void
      openTerminal: () => Promise<void>
      setFloatMode: (enabled: boolean) => Promise<void>
    }
  }
}
