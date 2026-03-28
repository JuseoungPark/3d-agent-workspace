import { create } from 'zustand'
import { AgentState, WSEvent, StreamEvent, ViewMode, getRoleConfig } from '../types'
import { HairStyle } from '../scene/HairPiece'

export interface AvatarOverride {
  face?: string
  hairStyle?: HairStyle
  hairColor?: string
  voiceEnabled?: boolean
}

interface WorkspaceStore {
  agents: Record<string, AgentState>
  streamEvents: StreamEvent[]
  viewMode: ViewMode
  serverConnected: boolean
  selectedAgentId: string | null
  cameraMode: 'face' | 'overview'
  bgOpacity: number
  avatarOverrides: Record<string, AvatarOverride>

  handleEvent: (event: WSEvent) => void
  setViewMode: (mode: ViewMode) => void
  setServerConnected: (v: boolean) => void
  selectAgent: (id: string | null) => void
  setCameraMode: (mode: 'face' | 'overview') => void
  setBgOpacity: (v: number) => void
  setAgentChatMessage: (id: string, text: string | null) => void
  setAgentTarget: (id: string, x: number, z: number) => void
  setAgentPos: (id: string, x: number, z: number) => void
  hitAgent: (id: string) => void
  setAvatarOverride: (id: string, override: Partial<AvatarOverride>) => void
}

const SIMPSONS_VOICES = ['homer', 'marge', 'bart', 'lisa']

function randomVoice(): string {
  return SIMPSONS_VOICES[Math.floor(Math.random() * SIMPSONS_VOICES.length)]
}

// Zone assignment: each role gets a 3×3 area on the 8×8 grid
const ROLE_ZONES: Record<string, { cx: number; cz: number }> = {
  analyst: { cx: -3, cz: -3 }, writer: { cx: 0, cz: -3 },
  executor: { cx: 3, cz: -3 }, debugger: { cx: -3, cz: 0 },
  reviewer: { cx: 3, cz: 0 }, planner: { cx: -3, cz: 3 },
  architect: { cx: 0, cz: 3 }, default: { cx: 0, cz: 0 },
}

function getZone(agentType: string): { cx: number; cz: number } {
  return ROLE_ZONES[agentType] ?? ROLE_ZONES.default
}

function randomInZone(zone: { cx: number; cz: number }): { x: number; z: number } {
  return {
    x: zone.cx + (Math.random() - 0.5) * 2.5,
    z: zone.cz + (Math.random() - 0.5) * 2.5,
  }
}

function makeStreamLabel(event: WSEvent): string {
  const { emoji } = getRoleConfig(event.agentType)
  switch (event.type) {
    case 'agent_start': return `${emoji} ${event.agentType} joined`
    case 'tool_use':    return `${emoji} ${event.agentType} › ${event.tool}`
    case 'tool_done':   return `${emoji} ${event.agentType} ✓ ${event.tool}`
    case 'message':     return `${emoji} ${event.agentType} › ${(event.text ?? '').slice(0, 40)}`
    case 'agent_done':  return `${emoji} ${event.agentType} done`
    default:            return `${emoji} ${event.agentType} ${event.type}`
  }
}

export const useWorkspaceStore = create<WorkspaceStore>((set, get) => ({
  agents: {},
  streamEvents: [],
  viewMode: 'default',
  serverConnected: false,
  selectedAgentId: null,
  cameraMode: 'overview',
  bgOpacity: 1,
  avatarOverrides: {},

  handleEvent(event: WSEvent) {
    const { agents } = get()
    const existing = agents[event.agentId]

    // Stream bar update
    const streamEvent: StreamEvent = {
      id: `${event.ts}-${event.agentId}`,
      agentId: event.agentId,
      agentType: event.agentType,
      label: makeStreamLabel(event),
      ts: event.ts,
    }

    set(state => ({
      streamEvents: [...state.streamEvents.slice(-49), streamEvent],
    }))

    // Agent state machine
    if (event.type === 'agent_start') {
      const zone = getZone(event.agentType)
      const spawnPos = randomInZone(zone)
      const newAgent: AgentState = {
        id: event.agentId,
        type: event.agentType,
        status: existing?.status === 'done' ? 'working' : 'spawning',
        currentTool: null,
        lastMessage: null,
        progress: 0,
        pos: existing?.pos ?? spawnPos,
        target: spawnPos,
        meetingWith: [],
        spawnedAt: event.ts,
        voiceId: existing?.voiceId ?? randomVoice(),
      }
      set(state => ({ agents: { ...state.agents, [event.agentId]: newAgent } }))

      // Auto-transition spawning → idle after 2s if no tool_use
      setTimeout(() => {
        set(state => {
          const a = state.agents[event.agentId]
          if (a?.status === 'spawning') {
            return { agents: { ...state.agents, [event.agentId]: { ...a, status: 'idle' } } }
          }
          return {}
        })
      }, 2000)
      return
    }

    if (!existing && event.type !== 'agent_done') {
      // Late arrival — create agent implicitly
      get().handleEvent({ ...event, type: 'agent_start' })
      return
    }

    if (event.type === 'tool_use') {
      // Detect meeting (Agent tool or SendMessage)
      const isMeetingTool = event.tool === 'Agent' || event.tool === 'SendMessage'
      const zone = getZone(event.agentType)

      set(state => {
        const a = state.agents[event.agentId] ?? existing
        if (!a) return {}
        return {
          agents: {
            ...state.agents,
            [event.agentId]: {
              ...a,
              status: isMeetingTool ? 'meeting' : 'working',
              currentTool: event.tool ?? null,
              target: randomInZone(zone),
              progress: Math.min(a.progress + 0.08, 0.95),
            },
          },
        }
      })
    }

    if (event.type === 'tool_done') {
      set(state => {
        const a = state.agents[event.agentId]
        if (!a) return {}
        return {
          agents: {
            ...state.agents,
            [event.agentId]: { ...a, status: 'idle', currentTool: null },
          },
        }
      })
    }

    if (event.type === 'message') {
      set(state => {
        const a = state.agents[event.agentId]
        if (!a) return {}
        return {
          agents: {
            ...state.agents,
            [event.agentId]: { ...a, lastMessage: event.text ?? null },
          },
        }
      })
    }

    if (event.type === 'agent_idle') {
      if (!existing) return
      set(state => {
        const a = state.agents[event.agentId]
        if (!a) return {}
        return {
          agents: {
            ...state.agents,
            [event.agentId]: { ...a, status: 'idle', currentTool: null },
          },
        }
      })
    }

    if (event.type === 'agent_celebrate') {
      if (!existing) return
      set(state => {
        const a = state.agents[event.agentId]
        if (!a) return {}
        return {
          agents: {
            ...state.agents,
            [event.agentId]: { ...a, status: 'celebrating', currentTool: null, lastMessage: '완료! 확인해봐 👀' },
          },
        }
      })
      // Back to idle after 4s
      setTimeout(() => {
        set(state => {
          const a = state.agents[event.agentId]
          if (!a || a.status !== 'celebrating') return {}
          return {
            agents: {
              ...state.agents,
              [event.agentId]: { ...a, status: 'idle', lastMessage: null },
            },
          }
        })
      }, 4000)
    }

    if (event.type === 'agent_done') {
      if (!existing) return
      set(state => {
        const a = state.agents[event.agentId]
        if (!a) return {}
        return {
          agents: {
            ...state.agents,
            [event.agentId]: { ...a, status: 'done', currentTool: null, progress: 1 },
          },
        }
      })
      // Fade out after 3s
      setTimeout(() => {
        set(state => {
          const updated = { ...state.agents }
          delete updated[event.agentId]
          return { agents: updated }
        })
      }, 3000)
    }
  },

  setViewMode: (mode) => set({ viewMode: mode }),
  setServerConnected: (v) => set({ serverConnected: v }),
  selectAgent: (id) => set({ selectedAgentId: id, cameraMode: id ? 'face' : 'overview' }),
  setCameraMode: (mode) => set({ cameraMode: mode }),
  setBgOpacity: (v) => set({ bgOpacity: v }),
  setAvatarOverride: (id, override) => set(state => ({
    avatarOverrides: { ...state.avatarOverrides, [id]: { ...state.avatarOverrides[id], ...override } },
  })),
  setAgentChatMessage: (id, text) => set(state => {
    const a = state.agents[id]
    if (!a) return {}
    return { agents: { ...state.agents, [id]: { ...a, lastMessage: text } } }
  }),
  setAgentTarget: (id, x, z) => set(state => {
    const a = state.agents[id]
    if (!a) return {}
    return { agents: { ...state.agents, [id]: { ...a, target: { x, z } } } }
  }),
  setAgentPos: (id, x, z) => set(state => {
    const a = state.agents[id]
    if (!a) return {}
    return { agents: { ...state.agents, [id]: { ...a, pos: { x, z } } } }
  }),
  hitAgent: (id) => {
    set(state => {
      const a = state.agents[id]
      if (!a) return {}
      return { agents: { ...state.agents, [id]: { ...a, hitAt: Date.now(), lastMessage: '아야!' } } }
    })
    setTimeout(() => set(state => {
      const a = state.agents[id]
      if (!a || a.lastMessage !== '아야!') return {}
      return { agents: { ...state.agents, [id]: { ...a, lastMessage: null } } }
    }), 1400)
  },
}))
