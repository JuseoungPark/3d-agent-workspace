export type AgentStatus = 'spawning' | 'idle' | 'working' | 'meeting' | 'done'

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
}

export type WSEventType = 'agent_start' | 'tool_use' | 'tool_done' | 'message' | 'agent_done'

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

// Role → color + emoji
export const ROLE_CONFIG: Record<string, { color: string; emoji: string }> = {
  analyst:            { color: '#7c3aed', emoji: '🔬' },
  writer:             { color: '#059669', emoji: '✍️' },
  reviewer:           { color: '#d97706', emoji: '🔍' },
  'code-reviewer':    { color: '#d97706', emoji: '🔍' },
  executor:           { color: '#2563eb', emoji: '⚙️' },
  debugger:           { color: '#dc2626', emoji: '🐛' },
  planner:            { color: '#0891b2', emoji: '🗺️' },
  architect:          { color: '#6d28d9', emoji: '🏛️' },
  explore:            { color: '#65a30d', emoji: '🧭' },
  verifier:           { color: '#0d9488', emoji: '✅' },
  tracer:             { color: '#c2410c', emoji: '🔎' },
  'security-reviewer':{ color: '#be185d', emoji: '🛡️' },
  'test-engineer':    { color: '#8b5cf6', emoji: '🧪' },
  designer:           { color: '#db2777', emoji: '🎨' },
  'qa-tester':        { color: '#b45309', emoji: '🎯' },
  scientist:          { color: '#0369a1', emoji: '🧬' },
  'document-specialist':{ color: '#4338ca', emoji: '📚' },
  'git-master':       { color: '#166534', emoji: '🌿' },
  'code-simplifier':  { color: '#6b7280', emoji: '✂️' },
  critic:             { color: '#9f1239', emoji: '⚖️' },
}

export function getRoleConfig(agentType: string): { color: string; emoji: string } {
  if (ROLE_CONFIG[agentType]) return ROLE_CONFIG[agentType]
  // deterministic hash for unknown roles
  let hash = 0
  for (const ch of agentType) hash = (hash * 31 + ch.charCodeAt(0)) & 0xffff
  return { color: `hsl(${hash % 360}, 65%, 45%)`, emoji: '🤖' }
}

declare global {
  interface Window {
    electronAPI: {
      onAgentEvent: (cb: (event: unknown) => void) => (() => void)
      getEventBuffer: () => Promise<unknown[]>
      getServerPort: () => Promise<number>
      toggleMini: () => void
    }
  }
}
