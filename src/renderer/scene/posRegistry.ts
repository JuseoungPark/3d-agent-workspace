// Shared real-time position registry — each AgentBlock writes its live position every frame
export const posRegistry = new Map<string, { x: number; z: number }>()
