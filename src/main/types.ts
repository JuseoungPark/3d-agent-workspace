export interface WSEvent {
  type: string
  agentId: string
  agentType: string
  tool?: string
  input?: Record<string, unknown>
  text?: string
  ts: number
}
