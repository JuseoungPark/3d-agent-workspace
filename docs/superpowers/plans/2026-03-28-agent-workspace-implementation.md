# Agent Workspace — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Build a desktop Electron app that renders a 3D isometric LEGO-character workspace visualizing Claude Code / OMC multi-agent sessions in real time.

**Architecture:** Electron main process runs an HTTP server (port 7379) that receives hook POSTs from Claude Code and forwards events to the renderer via IPC. The renderer uses React + React Three Fiber to render animated LEGO characters in a Zustand-driven scene. Hook script `agent-workspace-hook.py` reads Claude's JSON stdin payload and POSTs to the server.

**Tech Stack:** Electron 30, React 18, React Three Fiber 8, Three.js 0.165, Zustand 4, Vite + electron-vite, TypeScript, Tailwind CSS 3, electron-builder

---

## File Map

```
3d-agent-workspace/
├── package.json
├── electron-builder.config.cjs
├── electron.vite.config.ts
├── tsconfig.json
├── tsconfig.node.json
├── tsconfig.web.json
├── src/
│   ├── main/
│   │   ├── index.ts            # Electron entry — creates windows, starts server
│   │   ├── server.ts           # HTTP POST /event server on port 7379
│   │   ├── ipc.ts              # IPC handlers (relay events to renderer)
│   │   └── mini-window.ts      # Always-on-top mini BrowserWindow
│   ├── preload/
│   │   └── index.ts            # contextBridge: exposes onEvent / sendToMain
│   └── renderer/
│       ├── index.html
│       ├── main.tsx            # React root
│       ├── App.tsx             # Layout: scene + stream bar + keyboard shortcuts
│       ├── types.ts            # Shared TypeScript types
│       ├── store/
│       │   └── workspace.ts    # Zustand store (agent state machine)
│       ├── scene/
│       │   ├── Scene.tsx       # R3F Canvas, camera, floor, lights
│       │   ├── AgentBlock.tsx  # Per-agent: LEGO + animation + bubble
│       │   ├── LegoCharacter.tsx # Three.js LEGO geometry builder
│       │   ├── HairPiece.tsx   # 8 hair style geometries
│       │   └── SpeechBubble.tsx # HTML overlay bubble (solo + meeting)
│       └── ui/
│           ├── StreamBar.tsx   # Bottom 34px activity feed
│           └── MiniContent.tsx # Mini window: agent dots + last event
├── scripts/
│   └── agent-workspace-hook.py # Claude Code hook script
└── docs/
    └── superpowers/
        └── specs/2026-03-27-agent-workspace-design.md
```

---

## Task 1: Project Scaffolding

**Files:**
- Create: `package.json`
- Create: `electron.vite.config.ts`
- Create: `tsconfig.json`, `tsconfig.node.json`, `tsconfig.web.json`
- Create: `src/renderer/index.html`
- Create: `src/renderer/main.tsx`
- Create: `src/main/index.ts` (stub)
- Create: `src/preload/index.ts` (stub)

- [ ] **Step 1: Init project with electron-vite**

```bash
cd /Users/parkjuseoung/3d-agent-workspace
npm create @quick-start/electron@latest . -- --template react-ts --skip
```

If that fails, manually scaffold:

```bash
cd /Users/parkjuseoung/3d-agent-workspace
npm init -y
npm install --save-dev electron@30 electron-vite vite @vitejs/plugin-react typescript
npm install --save-dev electron-builder
npm install react@18 react-dom@18
npm install @react-three/fiber@8 @react-three/drei three@0.165
npm install zustand
npm install tailwindcss @tailwindcss/forms
npm install --save-dev @types/react @types/react-dom @types/three
```

- [ ] **Step 2: Create `package.json` scripts**

```json
{
  "name": "agent-workspace",
  "version": "0.1.0",
  "description": "3D Agent Workspace — visualize Claude Code sessions",
  "main": "out/main/index.js",
  "scripts": {
    "dev": "electron-vite dev",
    "build": "electron-vite build",
    "preview": "electron-vite preview",
    "package": "npm run build && electron-builder"
  }
}
```

- [ ] **Step 3: Create `electron.vite.config.ts`**

```typescript
import { defineConfig, externalizeDepsPlugin } from 'electron-vite'
import react from '@vitejs/plugin-react'

export default defineConfig({
  main: {
    plugins: [externalizeDepsPlugin()]
  },
  preload: {
    plugins: [externalizeDepsPlugin()]
  },
  renderer: {
    plugins: [react()]
  }
})
```

- [ ] **Step 4: Create `src/renderer/index.html`**

```html
<!DOCTYPE html>
<html>
  <head>
    <meta charset="UTF-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1.0" />
    <title>Agent Workspace</title>
  </head>
  <body>
    <div id="root"></div>
    <script type="module" src="/main.tsx"></script>
  </body>
</html>
```

- [ ] **Step 5: Create stub `src/renderer/main.tsx`**

```tsx
import React from 'react'
import ReactDOM from 'react-dom/client'
import App from './App'

ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>
)
```

- [ ] **Step 6: Run dev mode — verify blank window appears**

```bash
npm run dev
```

Expected: Electron window opens with blank/stub content. No crash.

- [ ] **Step 7: Commit**

```bash
git add -A
git commit -m "chore: scaffold Electron + React Three Fiber project"
```

---

## Task 2: TypeScript Types

**Files:**
- Create: `src/renderer/types.ts`
- Create: `src/main/types.ts`

- [ ] **Step 1: Write `src/renderer/types.ts`**

```typescript
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
```

- [ ] **Step 2: Write `src/main/types.ts`**

```typescript
export interface WSEvent {
  type: string
  agentId: string
  agentType: string
  tool?: string
  input?: Record<string, unknown>
  text?: string
  ts: number
}
```

- [ ] **Step 3: Commit**

```bash
git add src/renderer/types.ts src/main/types.ts
git commit -m "feat: add shared TypeScript types and role config"
```

---

## Task 3: HTTP Server (Main Process)

**Files:**
- Create: `src/main/server.ts`

- [ ] **Step 1: Write `src/main/server.ts`**

```typescript
import http from 'http'
import { WSEvent } from './types'

const MAX_BUFFER = 200  // keep last 200 events (60s rolling)
const eventBuffer: WSEvent[] = []
let onEventCallback: ((event: WSEvent) => void) | null = null
let actualPort = 7379

export function setEventHandler(cb: (event: WSEvent) => void) {
  onEventCallback = cb
}

export function getEventBuffer(): WSEvent[] {
  return [...eventBuffer]
}

export function getActualPort(): number {
  return actualPort
}

function startOnPort(port: number, attempt: number): Promise<http.Server> {
  return new Promise((resolve, reject) => {
    const server = http.createServer((req, res) => {
      if (req.method === 'POST' && req.url === '/event') {
        let body = ''
        req.on('data', chunk => { body += chunk })
        req.on('end', () => {
          try {
            const event: WSEvent = JSON.parse(body)
            // Rolling buffer
            eventBuffer.push(event)
            if (eventBuffer.length > MAX_BUFFER) eventBuffer.shift()
            onEventCallback?.(event)
            res.writeHead(200)
            res.end('ok')
          } catch {
            res.writeHead(400)
            res.end('bad json')
          }
        })
      } else {
        res.writeHead(404)
        res.end()
      }
    })

    server.on('error', (err: NodeJS.ErrnoException) => {
      if (err.code === 'EADDRINUSE' && attempt < 3) {
        resolve(startOnPort(port + 1, attempt + 1))
      } else {
        reject(err)
      }
    })

    server.listen(port, '127.0.0.1', () => {
      actualPort = port
      console.log(`[agent-workspace] HTTP server on port ${port}`)
      resolve(server)
    })
  })
}

export async function startServer(): Promise<http.Server | null> {
  try {
    return await startOnPort(7379, 0)
  } catch (err) {
    console.error('[agent-workspace] Could not start server:', err)
    return null
  }
}
```

- [ ] **Step 2: Test server manually**

```bash
# In one terminal, start dev mode (so main process runs)
npm run dev

# In another terminal, send a test event
curl -X POST http://localhost:7379/event \
  -H 'Content-Type: application/json' \
  -d '{"type":"agent_start","agentId":"test-1","agentType":"analyst","ts":1234567890}'
```

Expected: `ok` response, server logs the event.

- [ ] **Step 3: Commit**

```bash
git add src/main/server.ts
git commit -m "feat(main): HTTP server on port 7379 with port fallback and event buffer"
```

---

## Task 4: Preload + IPC Bridge

**Files:**
- Create: `src/preload/index.ts`
- Modify: `src/main/index.ts`
- Create: `src/main/ipc.ts`

- [ ] **Step 1: Write `src/preload/index.ts`**

```typescript
import { contextBridge, ipcRenderer } from 'electron'

contextBridge.exposeInMainWorld('electronAPI', {
  // Renderer subscribes to events
  onAgentEvent: (callback: (event: unknown) => void) => {
    ipcRenderer.on('agent-event', (_evt, data) => callback(data))
    return () => ipcRenderer.removeAllListeners('agent-event')
  },
  // Get buffered events on load
  getEventBuffer: (): Promise<unknown[]> =>
    ipcRenderer.invoke('get-event-buffer'),
  // Get server port
  getServerPort: (): Promise<number> =>
    ipcRenderer.invoke('get-server-port'),
  // Mini window toggle
  toggleMini: () => ipcRenderer.send('toggle-mini'),
})
```

- [ ] **Step 2: Write `src/main/ipc.ts`**

```typescript
import { ipcMain, BrowserWindow } from 'electron'
import { getEventBuffer, getActualPort, setEventHandler } from './server'
import { WSEvent } from './types'

export function setupIPC(mainWindow: BrowserWindow) {
  // Relay events from HTTP server → renderer
  setEventHandler((event: WSEvent) => {
    mainWindow.webContents.send('agent-event', event)
  })

  ipcMain.handle('get-event-buffer', () => getEventBuffer())
  ipcMain.handle('get-server-port', () => getActualPort())
}
```

- [ ] **Step 3: Update `src/main/index.ts` to wire everything**

```typescript
import { app, BrowserWindow, shell } from 'electron'
import { join } from 'path'
import { startServer } from './server'
import { setupIPC } from './ipc'

let mainWindow: BrowserWindow | null = null

function createMainWindow() {
  mainWindow = new BrowserWindow({
    width: 1200,
    height: 800,
    minWidth: 800,
    minHeight: 600,
    backgroundColor: '#020617',
    titleBarStyle: 'hiddenInset',
    webPreferences: {
      preload: join(__dirname, '../preload/index.js'),
      contextIsolation: true,
      nodeIntegration: false,
    },
  })

  if (process.env.ELECTRON_RENDERER_URL) {
    mainWindow.loadURL(process.env.ELECTRON_RENDERER_URL)
  } else {
    mainWindow.loadFile(join(__dirname, '../renderer/index.html'))
  }

  setupIPC(mainWindow)
}

app.whenReady().then(async () => {
  await startServer()
  createMainWindow()
})

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') app.quit()
})
```

- [ ] **Step 4: Run dev and verify IPC works**

```bash
npm run dev
```

Open DevTools in renderer, run:
```javascript
window.electronAPI.getServerPort().then(console.log)
// Expected: 7379
```

- [ ] **Step 5: Commit**

```bash
git add src/preload/index.ts src/main/ipc.ts src/main/index.ts
git commit -m "feat(main): IPC bridge — relay HTTP events to renderer via contextBridge"
```

---

## Task 5: Zustand Store (Agent State Machine)

**Files:**
- Create: `src/renderer/store/workspace.ts`

- [ ] **Step 1: Write `src/renderer/store/workspace.ts`**

```typescript
import { create } from 'zustand'
import { AgentState, WSEvent, StreamEvent, ViewMode, getRoleConfig } from '../types'

interface WorkspaceStore {
  agents: Record<string, AgentState>
  streamEvents: StreamEvent[]
  viewMode: ViewMode
  serverConnected: boolean

  handleEvent: (event: WSEvent) => void
  setViewMode: (mode: ViewMode) => void
  setServerConnected: (v: boolean) => void
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
}))
```

- [ ] **Step 2: Write a quick manual test in browser console**

After connecting the store to the renderer (Task 6), open DevTools and run:
```javascript
// Simulate agent_start
window.__testEvent({type:'agent_start',agentId:'a1',agentType:'analyst',ts:Date.now()})
// After 500ms, simulate tool_use
setTimeout(()=>window.__testEvent({type:'tool_use',agentId:'a1',agentType:'analyst',tool:'Read',input:{},ts:Date.now()}),500)
```

Expected: store `agents.a1` transitions spawning → working with `currentTool: 'Read'`.

- [ ] **Step 3: Commit**

```bash
git add src/renderer/store/workspace.ts
git commit -m "feat(store): Zustand agent state machine with status transitions and stream events"
```

---

## Task 6: App Shell + Event Wiring

**Files:**
- Create: `src/renderer/App.tsx`
- Modify: `src/renderer/main.tsx`

- [ ] **Step 1: Write `src/renderer/App.tsx`**

```tsx
import React, { useEffect } from 'react'
import { useWorkspaceStore } from './store/workspace'
import { WSEvent } from './types'

// Placeholders — replaced in later tasks
const Scene = () => <div style={{flex:1,background:'#020617',color:'#334155',display:'flex',alignItems:'center',justifyContent:'center'}}>3D Scene (Task 7)</div>
const StreamBar = () => <div style={{height:34,background:'#080d14',borderTop:'1px solid #0f172a',color:'#334155',fontSize:11,display:'flex',alignItems:'center',padding:'0 12px'}}>Stream bar (Task 10)</div>

export default function App() {
  const handleEvent = useWorkspaceStore(s => s.handleEvent)
  const setServerConnected = useWorkspaceStore(s => s.setServerConnected)

  useEffect(() => {
    // Replay buffered events from before renderer loaded
    window.electronAPI.getEventBuffer().then((events: unknown[]) => {
      ;(events as WSEvent[]).forEach(handleEvent)
      setServerConnected(true)
    })

    // Live events
    const unsub = window.electronAPI.onAgentEvent((event: unknown) => {
      handleEvent(event as WSEvent)
    })

    // Dev helper
    ;(window as any).__testEvent = handleEvent

    return () => { unsub?.() }
  }, [handleEvent, setServerConnected])

  // Keyboard shortcuts
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'f' || e.key === 'F') {
        useWorkspaceStore.getState().setViewMode('fullscreen')
      }
      if ((e.metaKey || e.ctrlKey) && e.key === 'm') {
        window.electronAPI.toggleMini()
      }
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [])

  return (
    <div style={{ display: 'flex', flexDirection: 'column', height: '100vh', background: '#020617' }}>
      <Scene />
      <StreamBar />
    </div>
  )
}
```

- [ ] **Step 2: Add `electronAPI` type to `window`**

Add to `src/renderer/types.ts`:

```typescript
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
```

- [ ] **Step 3: Run dev — verify window renders with placeholders**

```bash
npm run dev
```

Expected: Window shows "3D Scene (Task 7)" and "Stream bar (Task 10)".

In DevTools:
```javascript
window.__testEvent({type:'agent_start',agentId:'x1',agentType:'writer',ts:Date.now()})
// Check store: no error thrown
```

- [ ] **Step 4: Commit**

```bash
git add src/renderer/App.tsx src/renderer/main.tsx src/renderer/types.ts
git commit -m "feat(renderer): App shell wired to IPC event stream + keyboard shortcuts"
```

---

## Task 7: LEGO Character Geometry

**Files:**
- Create: `src/renderer/scene/LegoCharacter.tsx`
- Create: `src/renderer/scene/HairPiece.tsx`

- [ ] **Step 1: Write `src/renderer/scene/HairPiece.tsx`**

```tsx
import React, { useMemo } from 'react'
import * as THREE from 'three'

export type HairStyle = 'SHORT' | 'LONG' | 'SPIKY' | 'BUN' | 'CURLY' | 'HELMET' | 'PONYTAIL' | 'BALD'

interface HairPieceProps {
  style: HairStyle
  color: string
}

export function HairPiece({ style, color }: HairPieceProps) {
  const mat = useMemo(() => new THREE.MeshLambertMaterial({ color }), [color])
  const dark = useMemo(() => new THREE.MeshLambertMaterial({ color: new THREE.Color(color).lerp(new THREE.Color(0), 0.2) }), [color])
  const holeMat = useMemo(() => new THREE.MeshLambertMaterial({ color: 0x0a0a12 }), [])

  // Clip base: sits over the head stud
  const ClipBase = () => (
    <group>
      <mesh position={[0, 0.024, 0]}>
        <cylinderGeometry args={[0.268, 0.268, 0.048, 24]} />
        <primitive object={mat} attach="material" />
      </mesh>
      <mesh position={[0, 0.026, 0]}>
        <cylinderGeometry args={[0.098, 0.098, 0.052, 16]} />
        <primitive object={holeMat} attach="material" />
      </mesh>
    </group>
  )

  if (style === 'BALD') return null

  return (
    <group>
      <ClipBase />
      {style === 'SHORT' && (
        <>
          <mesh position={[0, 0.079, 0]}><cylinderGeometry args={[0.262, 0.262, 0.11, 24]} /><primitive object={mat} attach="material" /></mesh>
          {[-1, 1].map(s => (
            <mesh key={s} position={[s * 0.262, -0.055, 0]}><boxGeometry args={[0.09, 0.2, 0.28]} /><primitive object={dark} attach="material" /></mesh>
          ))}
        </>
      )}
      {style === 'LONG' && (
        <>
          <mesh position={[0, 0.069, 0]}><cylinderGeometry args={[0.265, 0.265, 0.09, 24]} /><primitive object={mat} attach="material" /></mesh>
          {[-1, 1].map(s => (
            <mesh key={s} position={[s * 0.268, -0.21, 0]}><boxGeometry args={[0.088, 0.54, 0.27]} /><primitive object={mat} attach="material" /></mesh>
          ))}
          <mesh position={[0, -0.18, -0.218]}><boxGeometry args={[0.52, 0.46, 0.078]} /><primitive object={mat} attach="material" /></mesh>
        </>
      )}
      {style === 'SPIKY' && (
        <>
          <mesh position={[0, 0.059, 0]}><cylinderGeometry args={[0.265, 0.265, 0.07, 24]} /><primitive object={mat} attach="material" /></mesh>
          {[[-0.14, 0.36, 0.02], [0, 0.42, 0.01], [0.14, 0.36, 0.02], [-0.07, 0.32, -0.09], [0.07, 0.32, -0.09]].map(([x, h, z], i) => (
            <mesh key={i} position={[x, 0.048 + h / 2, z]}><coneGeometry args={[0.055, h, 6]} /><primitive object={mat} attach="material" /></mesh>
          ))}
        </>
      )}
      {style === 'BUN' && (
        <>
          <mesh position={[0, 0.069, 0]}><cylinderGeometry args={[0.265, 0.265, 0.09, 24]} /><primitive object={mat} attach="material" /></mesh>
          <mesh position={[0, 0.29, 0]}><sphereGeometry args={[0.178, 16, 12]} /><primitive object={mat} attach="material" /></mesh>
        </>
      )}
      {style === 'CURLY' && (
        <>
          <mesh position={[0, 0.129, 0]}><cylinderGeometry args={[0.308, 0.288, 0.21, 24]} /><primitive object={mat} attach="material" /></mesh>
          {[[0.27,0.1,0.1],[-0.27,0.1,0.1],[0.27,0.1,-0.1],[-0.27,0.1,-0.1],[0,0.3,0.22],[0,0.3,-0.22]].map(([x,y,z],i) => (
            <mesh key={i} position={[x, y, z]}><sphereGeometry args={[0.098, 8, 8]} /><primitive object={mat} attach="material" /></mesh>
          ))}
        </>
      )}
      {style === 'HELMET' && (
        <>
          <mesh position={[0, 0.16, 0]}><cylinderGeometry args={[0.285, 0.275, 0.54, 32]} /><primitive object={mat} attach="material" /></mesh>
          <mesh position={[0, 0.04, 0.276]}>
            <boxGeometry args={[0.44, 0.15, 0.06]} />
            <meshLambertMaterial color={0x111122} transparent opacity={0.82} />
          </mesh>
        </>
      )}
      {style === 'PONYTAIL' && (
        <>
          <mesh position={[0, 0.069, 0]}><cylinderGeometry args={[0.265, 0.265, 0.09, 24]} /><primitive object={mat} attach="material" /></mesh>
          <mesh position={[0, 0.02, -0.3]} rotation={[-0.26, 0, 0]}><cylinderGeometry args={[0.07, 0.04, 0.58, 12]} /><primitive object={mat} attach="material" /></mesh>
        </>
      )}
    </group>
  )
}
```

- [ ] **Step 2: Write `src/renderer/scene/LegoCharacter.tsx`**

```tsx
import React, { useMemo, useRef } from 'react'
import { useFrame } from '@react-three/fiber'
import * as THREE from 'three'
import { HairPiece, HairStyle } from './HairPiece'

interface LegoCharacterProps {
  color: string                  // torso + arms color (role color)
  hairStyle?: HairStyle
  hairColor?: string
  walking?: boolean
  scale?: number
}

function makeFaceTexture(emoji = '😐'): THREE.CanvasTexture {
  const W = 256, H = 256
  const cv = document.createElement('canvas')
  cv.width = W; cv.height = H
  const ctx = cv.getContext('2d')!
  ctx.fillStyle = '#ffd700'
  ctx.fillRect(0, 0, W, H)
  // Draw eyes
  ctx.fillStyle = '#1a1a2e'
  ;[[75, 100], [181, 100]].forEach(([x, y]) => {
    ctx.beginPath(); ctx.ellipse(x, y, 22, 26, 0, 0, Math.PI * 2); ctx.fill()
    ctx.fillStyle = 'white'; ctx.beginPath(); ctx.arc(x - 7, y - 7, 8, 0, Math.PI * 2); ctx.fill()
    ctx.fillStyle = '#1a1a2e'
  })
  // Smile
  ctx.beginPath()
  ctx.arc(128, 155, 38, 0.15, Math.PI - 0.15)
  ctx.strokeStyle = '#3a2200'; ctx.lineWidth = 7; ctx.lineCap = 'round'; ctx.stroke()
  return new THREE.CanvasTexture(cv)
}

export function LegoCharacter({
  color,
  hairStyle = 'SHORT',
  hairColor = '#1a1a1a',
  walking = false,
  scale = 1,
}: LegoCharacterProps) {
  const groupRef = useRef<THREE.Group>(null)
  const armLRef = useRef<THREE.Group>(null)
  const armRRef = useRef<THREE.Group>(null)
  const headRef = useRef<THREE.Group>(null)
  const phaseRef = useRef(Math.random() * Math.PI * 2)

  const skinMat = useMemo(() => new THREE.MeshLambertMaterial({ color: 0xffd700 }), [])
  const roleMat = useMemo(() => new THREE.MeshLambertMaterial({ color }), [color])
  const darkMat = useMemo(() => new THREE.MeshLambertMaterial({ color: new THREE.Color(color).lerp(new THREE.Color(0), 0.25) }), [color])
  const legMat  = useMemo(() => new THREE.MeshLambertMaterial({ color: 0x1a1a2e }), [])
  const faceTex = useMemo(() => makeFaceTexture(), [])
  const faceMat = useMemo(() => new THREE.MeshLambertMaterial({ map: faceTex, side: THREE.DoubleSide }), [faceTex])

  useFrame(({ clock }) => {
    const t = clock.getElapsedTime()
    const ph = t * 8 + phaseRef.current
    if (walking) {
      if (armLRef.current) armLRef.current.rotation.x = -Math.sin(ph) * 0.42
      if (armRRef.current) armRRef.current.rotation.x =  Math.sin(ph) * 0.42
      if (groupRef.current) groupRef.current.position.y = Math.abs(Math.sin(ph * 0.5)) * 0.05
    } else {
      if (armLRef.current) armLRef.current.rotation.x *= 0.88
      if (armRRef.current) armRRef.current.rotation.x *= 0.88
      if (groupRef.current) groupRef.current.position.y = Math.sin(t * 1.8 + phaseRef.current) * 0.024
      if (headRef.current) headRef.current.rotation.y = Math.sin(t * 0.62 + phaseRef.current) * 0.12
    }
  })

  return (
    <group ref={groupRef} scale={scale}>
      {/* Legs */}
      <group position={[0, 0.38, 0]}>
        <mesh position={[0, 0.01, 0]}><boxGeometry args={[0.65, 0.1, 0.33]} /><primitive object={darkMat} attach="material" /></mesh>
        <mesh position={[0, -0.16, 0]}><boxGeometry args={[0.1, 0.28, 0.31]} /><meshLambertMaterial color={0x0d1020} /></mesh>
        {[-1, 1].map(s => (
          <group key={s}>
            <mesh position={[s * 0.19, -0.28, 0]} castShadow><boxGeometry args={[0.265, 0.46, 0.31]} /><primitive object={legMat} attach="material" /></mesh>
            <mesh position={[s * 0.19, -0.52, 0.045]} castShadow><boxGeometry args={[0.265, 0.115, 0.38]} /><meshLambertMaterial color={0x0f0f1e} /></mesh>
          </group>
        ))}
      </group>

      {/* Torso */}
      <group position={[0, 0.92, 0]}>
        <mesh castShadow><boxGeometry args={[0.65, 0.52, 0.32]} /><primitive object={roleMat} attach="material" /></mesh>
        <mesh position={[0, 0.295, 0]}><boxGeometry args={[0.72, 0.07, 0.35]} /><primitive object={darkMat} attach="material" /></mesh>
        <mesh position={[0, 0.31, 0]}><cylinderGeometry args={[0.115, 0.115, 0.1, 16]} /><meshLambertMaterial color={new THREE.Color(color).lerp(new THREE.Color(0xffd700), 0.5).getHex()} /></mesh>
        {[-0.165, 0.165].map((x, i) => (
          <mesh key={i} position={[x, 0.345, 0]}><cylinderGeometry args={[0.078, 0.078, 0.065, 12]} /><primitive object={roleMat} attach="material" /></mesh>
        ))}
        <mesh position={[0, -0.325, 0]}><boxGeometry args={[0.63, 0.13, 0.33]} /><primitive object={darkMat} attach="material" /></mesh>
        {[-1, 1].map(s => (
          <group key={s}>
            <mesh position={[s * 0.38, 0.12, 0]} rotation={[0, 0, Math.PI / 2]}><cylinderGeometry args={[0.1, 0.1, 0.14, 16]} /><primitive object={darkMat} attach="material" /></mesh>
          </group>
        ))}
      </group>

      {/* Arms */}
      {[-1, 1].map((s, i) => (
        <group key={i} ref={i === 0 ? armLRef : armRRef} position={[s * 0.425, 1.04, 0]}>
          <mesh><sphereGeometry args={[0.098, 10, 8]} /><primitive object={roleMat} attach="material" /></mesh>
          <mesh position={[0, -0.17, 0]}><cylinderGeometry args={[0.095, 0.085, 0.3, 14]} /><primitive object={roleMat} attach="material" /></mesh>
          <mesh position={[0, -0.38, 0]}><cylinderGeometry args={[0.08, 0.07, 0.2, 12]} /><primitive object={roleMat} attach="material" /></mesh>
          <mesh position={[0, -0.46, 0]}><cylinderGeometry args={[0.055, 0.06, 0.06, 10]} /><primitive object={skinMat} attach="material" /></mesh>
          {/* C-shaped hand */}
          <mesh position={[0, -0.51, 0]} rotation={[Math.PI / 2, Math.PI * 0.08, 0]}>
            <torusGeometry args={[0.078, 0.034, 10, 18, Math.PI * 1.55]} />
            <primitive object={skinMat} attach="material" />
          </mesh>
        </group>
      ))}

      {/* Head */}
      <group ref={headRef} position={[0, 1.52, 0]}>
        {/* Cylinder with face texture on front (+Z after PI rotation) */}
        <mesh rotation={[0, Math.PI, 0]}>
          <cylinderGeometry args={[0.24, 0.25, 0.46, 32, 1, true]} />
          <primitive object={faceMat} attach="material" />
        </mesh>
        {/* Caps */}
        <mesh position={[0, 0.23, 0]} rotation={[-Math.PI / 2, 0, 0]}><circleGeometry args={[0.24, 32]} /><primitive object={skinMat} attach="material" /></mesh>
        <mesh position={[0, -0.23, 0]} rotation={[Math.PI / 2, 0, 0]}><circleGeometry args={[0.25, 32]} /><primitive object={skinMat} attach="material" /></mesh>
        {/* Dome */}
        <mesh position={[0, 0.2, 0]}><sphereGeometry args={[0.24, 32, 16, 0, Math.PI * 2, 0, Math.PI / 2.1]} /><primitive object={skinMat} attach="material" /></mesh>
        {/* Neck peg */}
        <mesh position={[0, -0.31, 0]}><cylinderGeometry args={[0.105, 0.105, 0.16, 16]} /><primitive object={skinMat} attach="material" /></mesh>
        {/* Stud */}
        <mesh position={[0, 0.345, 0]}><cylinderGeometry args={[0.098, 0.098, 0.09, 16]} /><primitive object={skinMat} attach="material" /></mesh>
      </group>

      {/* Hair */}
      <group position={[0, 1.755, 0]}>
        <HairPiece style={hairStyle} color={hairColor} />
      </group>
    </group>
  )
}
```

- [ ] **Step 3: Quick visual smoke-test in Scene placeholder**

Temporarily render one `<LegoCharacter>` in the Scene stub to verify geometry is correct. Fix any TypeScript errors.

- [ ] **Step 4: Commit**

```bash
git add src/renderer/scene/LegoCharacter.tsx src/renderer/scene/HairPiece.tsx
git commit -m "feat(scene): LEGO character geometry — head, torso, arms, legs, C-hands, 8 hair styles"
```

---

## Task 8: 3D Scene (R3F Canvas + Floor + Camera)

**Files:**
- Create: `src/renderer/scene/Scene.tsx`

- [ ] **Step 1: Write `src/renderer/scene/Scene.tsx`**

```tsx
import React, { Suspense } from 'react'
import { Canvas } from '@react-three/fiber'
import { OrthographicCamera } from '@react-three/drei'
import * as THREE from 'three'
import { useWorkspaceStore } from '../store/workspace'
import { AgentBlock } from './AgentBlock'

function Floor() {
  const tiles = []
  for (let x = -7; x <= 7; x++) {
    for (let z = -7; z <= 7; z++) {
      tiles.push(
        <mesh key={`${x}-${z}`} position={[x, -0.05, z]} receiveShadow>
          <boxGeometry args={[0.97, 0.1, 0.97]} />
          <meshLambertMaterial color={(x + z) % 2 === 0 ? 0x0b1728 : 0x0d1e35} />
        </mesh>
      )
    }
  }
  return <>{tiles}</>
}

export function Scene() {
  const agents = useWorkspaceStore(s => s.agents)

  return (
    <div style={{ flex: 1, position: 'relative' }}>
      <Canvas
        shadows
        camera={{ position: [10, 13, 10], fov: 40 }}
        gl={{ antialias: true }}
        style={{ background: '#020617' }}
      >
        <fog attach="fog" args={['#020617', 30, 80]} />
        <ambientLight intensity={2.5} color={0x1a2a4a} />
        <directionalLight
          position={[8, 18, 8]}
          intensity={3.5}
          castShadow
          shadow-mapSize={[2048, 2048]}
          shadow-camera-near={0.1}
          shadow-camera-far={60}
          shadow-camera-left={-16}
          shadow-camera-right={16}
          shadow-camera-top={16}
          shadow-camera-bottom={-16}
          shadow-bias={-0.001}
        />
        <directionalLight position={[-4, 5, -6]} intensity={1.0} color={0x3355bb} />

        <Suspense fallback={null}>
          <Floor />
          {Object.values(agents).map(agent => (
            <AgentBlock key={agent.id} agent={agent} />
          ))}
        </Suspense>
      </Canvas>
    </div>
  )
}
```

- [ ] **Step 2: Update `App.tsx`** — import real `Scene` instead of placeholder

```tsx
import { Scene } from './scene/Scene'
```

- [ ] **Step 3: Run dev — verify floor grid and LEGO characters appear**

Send test events via DevTools:
```javascript
window.__testEvent({type:'agent_start',agentId:'a1',agentType:'analyst',ts:Date.now()})
window.__testEvent({type:'agent_start',agentId:'a2',agentType:'writer',ts:Date.now()})
```

Expected: Two LEGO characters appear on the floor, idle-bobbing.

- [ ] **Step 4: Commit**

```bash
git add src/renderer/scene/Scene.tsx src/renderer/App.tsx
git commit -m "feat(scene): R3F Canvas with isometric floor, lights, shadows"
```

---

## Task 9: AgentBlock (Per-Agent Animation + State)

**Files:**
- Create: `src/renderer/scene/AgentBlock.tsx`

- [ ] **Step 1: Write `src/renderer/scene/AgentBlock.tsx`**

```tsx
import React, { useRef, useEffect } from 'react'
import { useFrame } from '@react-three/fiber'
import * as THREE from 'three'
import { AgentState, getRoleConfig } from '../types'
import { LegoCharacter } from './LegoCharacter'

interface AgentBlockProps {
  agent: AgentState
}

const PATROL_INTERVAL = 2200  // ms between patrol moves

export function AgentBlock({ agent }: AgentBlockProps) {
  const groupRef = useRef<THREE.Group>(null)
  const posRef = useRef({ x: agent.pos.x, z: agent.pos.z })
  const targetRef = useRef({ x: agent.target.x, z: agent.target.z })
  const scaleRef = useRef(agent.status === 'spawning' ? 0 : 1)
  const { color } = getRoleConfig(agent.type)

  // Sync target when agent.target changes
  useEffect(() => {
    targetRef.current = { x: agent.target.x, z: agent.target.z }
  }, [agent.target.x, agent.target.z])

  // Spawn scale-in
  useEffect(() => {
    if (agent.status === 'spawning') {
      scaleRef.current = 0
    }
  }, [agent.status])

  // Done fade-out (handled by store removing the agent after 3s)

  useFrame((_, delta) => {
    if (!groupRef.current) return
    const dt = Math.min(delta, 0.05)

    // Lerp toward target
    const dx = targetRef.current.x - posRef.current.x
    const dz = targetRef.current.z - posRef.current.z
    const dist = Math.sqrt(dx * dx + dz * dz)
    if (dist > 0.04) {
      const speed = 2.2 * dt
      const step = Math.min(dist, speed)
      posRef.current.x += (dx / dist) * step
      posRef.current.z += (dz / dist) * step
      groupRef.current.rotation.y = Math.atan2(dx, dz)
    }

    groupRef.current.position.x = posRef.current.x
    groupRef.current.position.z = posRef.current.z

    // Spawn scale-in
    if (scaleRef.current < 1) {
      scaleRef.current = Math.min(1, scaleRef.current + dt * 2.5)
      groupRef.current.scale.setScalar(scaleRef.current)
    }
  })

  const walking = (() => {
    const dx = agent.target.x - agent.pos.x
    const dz = agent.target.z - agent.pos.z
    return Math.sqrt(dx * dx + dz * dz) > 0.06
  })()

  return (
    <group ref={groupRef} position={[agent.pos.x, 0, agent.pos.z]}>
      <LegoCharacter
        color={color}
        walking={walking}
        hairStyle="SHORT"
        hairColor="#1a1a1a"
      />
    </group>
  )
}
```

- [ ] **Step 2: Test agent spawn + walk**

```javascript
// DevTools
window.__testEvent({type:'agent_start',agentId:'a1',agentType:'analyst',ts:Date.now()})
setTimeout(()=>window.__testEvent({type:'tool_use',agentId:'a1',agentType:'analyst',tool:'Read',input:{},ts:Date.now()}),1000)
```

Expected: character scales in, then walks toward a zone position.

- [ ] **Step 3: Commit**

```bash
git add src/renderer/scene/AgentBlock.tsx
git commit -m "feat(scene): AgentBlock — per-agent lerp movement, spawn animation, walking state"
```

---

## Task 10: Speech Bubble System

**Files:**
- Create: `src/renderer/scene/SpeechBubble.tsx`
- Modify: `src/renderer/scene/AgentBlock.tsx`
- Modify: `src/renderer/scene/Scene.tsx`

- [ ] **Step 1: Write `src/renderer/scene/SpeechBubble.tsx`**

```tsx
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
```

- [ ] **Step 2: Add bubble CSS animation** to `src/renderer/index.html`

```html
<style>
@keyframes bubble-dot {
  0%, 60%, 100% { opacity: 0.2; transform: scale(0.8); }
  30% { opacity: 1; transform: scale(1); }
}
</style>
```

- [ ] **Step 3: Add SpeechBubble to AgentBlock**

In `AgentBlock.tsx`, add bubble rendering:
```tsx
import { SpeechBubble } from './SpeechBubble'

// Inside return, after <LegoCharacter>:
{(agent.currentTool || agent.lastMessage) && (
  <SpeechBubble
    text={agent.currentTool ? `${agent.currentTool}...` : agent.lastMessage ?? ''}
    type={agent.status === 'meeting' ? 'meeting' : 'solo'}
  />
)}
```

- [ ] **Step 4: Test bubbles**

```javascript
window.__testEvent({type:'tool_use',agentId:'a1',agentType:'analyst',tool:'Read',input:{},ts:Date.now()})
```

Expected: "Read..." bubble appears above agent.

- [ ] **Step 5: Commit**

```bash
git add src/renderer/scene/SpeechBubble.tsx src/renderer/scene/AgentBlock.tsx src/renderer/scene/Scene.tsx
git commit -m "feat(scene): speech bubbles — solo tool display + typing indicator"
```

---

## Task 11: Bottom Stream Bar

**Files:**
- Create: `src/renderer/ui/StreamBar.tsx`
- Modify: `src/renderer/App.tsx`

- [ ] **Step 1: Write `src/renderer/ui/StreamBar.tsx`**

```tsx
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
```

- [ ] **Step 2: Add `slideIn` animation to `index.html`**

```css
@keyframes slideIn { from { opacity: 0; transform: translateX(20px); } to { opacity: 1; transform: translateX(0); } }
```

- [ ] **Step 3: Replace StreamBar stub in App.tsx**

```tsx
import { StreamBar } from './ui/StreamBar'
```

- [ ] **Step 4: Test stream bar**

```javascript
for(let i=0;i<6;i++) setTimeout(()=>window.__testEvent({type:'tool_use',agentId:'a1',agentType:'analyst',tool:'Read',input:{},ts:Date.now()}), i*300)
```

Expected: Events slide in from right, last 5 visible.

- [ ] **Step 5: Commit**

```bash
git add src/renderer/ui/StreamBar.tsx src/renderer/App.tsx
git commit -m "feat(ui): bottom stream bar — last 5 events, slide-in animation"
```

---

## Task 12: Hook Script

**Files:**
- Create: `scripts/agent-workspace-hook.py`

- [ ] **Step 1: Write `scripts/agent-workspace-hook.py`** (from spec verbatim)

```python
#!/usr/bin/env python3
import sys, json, urllib.request, urllib.error, time

def main():
    event_type = sys.argv[1] if len(sys.argv) > 1 else "unknown"
    try:
        payload = json.loads(sys.stdin.read())
    except Exception:
        sys.exit(0)

    session_id  = payload.get("session_id", "")
    agent_id    = payload.get("agent_id", session_id)
    agent_type  = payload.get("agent_type", "default")
    tool_name   = payload.get("tool_name", "")

    if event_type == "pre_tool":
        if tool_name == "Agent":
            ws_event = {"type": "agent_start", "agentId": agent_id,
                        "agentType": agent_type, "tool": tool_name}
        else:
            ws_event = {"type": "tool_use", "agentId": agent_id,
                        "agentType": agent_type, "tool": tool_name,
                        "input": payload.get("tool_input", {})}
    elif event_type == "post_tool":
        ws_event = {"type": "tool_done", "agentId": agent_id,
                    "agentType": agent_type, "tool": tool_name}
    elif event_type == "stop":
        ws_event = {"type": "agent_done", "agentId": agent_id,
                    "agentType": agent_type}
    else:
        sys.exit(0)

    ws_event["ts"] = int(time.time() * 1000)

    try:
        data = json.dumps(ws_event).encode()
        req  = urllib.request.Request(
            "http://localhost:7379/event",
            data=data, method="POST",
            headers={"Content-Type": "application/json"}
        )
        urllib.request.urlopen(req, timeout=1)
    except Exception:
        pass  # Never block Claude Code

if __name__ == "__main__":
    main()
```

- [ ] **Step 2: Make hook executable**

```bash
chmod +x scripts/agent-workspace-hook.py
cp scripts/agent-workspace-hook.py ~/.claude/agent-workspace-hook.py
```

- [ ] **Step 3: Test hook manually**

```bash
# With app running on port 7379
echo '{"session_id":"test","agent_type":"analyst","tool_name":"Read","tool_input":{}}' \
  | python3 scripts/agent-workspace-hook.py pre_tool
```

Expected: App shows a new agent/event in the scene.

- [ ] **Step 4: Configure settings.json**

Add to `~/.claude/settings.json` (merge, don't overwrite):

```json
{
  "hooks": {
    "PreToolUse": [{"matcher":"","hooks":[{"type":"command","command":"python3 ~/.claude/agent-workspace-hook.py pre_tool","timeout":2}]}],
    "PostToolUse": [{"matcher":"","hooks":[{"type":"command","command":"python3 ~/.claude/agent-workspace-hook.py post_tool","timeout":2}]}],
    "Stop": [{"matcher":"","hooks":[{"type":"command","command":"python3 ~/.claude/agent-workspace-hook.py stop","timeout":2}]}]
  }
}
```

- [ ] **Step 5: Live test — run Claude Code in another terminal**

```bash
cd /tmp && claude "list the files here"
```

Expected: Agent appears in workspace, walks, shows tool bubbles, disappears when done.

- [ ] **Step 6: Commit**

```bash
git add scripts/agent-workspace-hook.py
git commit -m "feat: Claude Code hook script — POSTs events to port 7379"
```

---

## Task 13: Mini Mode Window

**Files:**
- Create: `src/main/mini-window.ts`
- Create: `src/renderer/ui/MiniContent.tsx`
- Modify: `src/main/ipc.ts`

- [ ] **Step 1: Write `src/main/mini-window.ts`**

```typescript
import { BrowserWindow, app } from 'electron'
import { join } from 'path'

let miniWindow: BrowserWindow | null = null

export function toggleMiniWindow() {
  if (miniWindow && !miniWindow.isDestroyed()) {
    miniWindow.close()
    miniWindow = null
    return
  }

  miniWindow = new BrowserWindow({
    width: 300,
    height: 200,
    alwaysOnTop: true,
    transparent: true,
    frame: false,
    hasShadow: true,
    resizable: false,
    ...(process.platform === 'darwin' ? { vibrancy: 'under-window' } : {}),
    webPreferences: {
      preload: join(__dirname, '../preload/index.js'),
      contextIsolation: true,
      nodeIntegration: false,
    },
  })

  const url = process.env.ELECTRON_RENDERER_URL
  if (url) {
    miniWindow.loadURL(`${url}?mini=1`)
  } else {
    miniWindow.loadFile(join(__dirname, '../renderer/index.html'), {
      query: { mini: '1' },
    })
  }
}
```

- [ ] **Step 2: Wire toggle in `src/main/ipc.ts`**

```typescript
import { toggleMiniWindow } from './mini-window'
// In setupIPC:
ipcMain.on('toggle-mini', () => toggleMiniWindow())
```

- [ ] **Step 3: Write `src/renderer/ui/MiniContent.tsx`**

```tsx
import React from 'react'
import { useWorkspaceStore } from '../store/workspace'
import { getRoleConfig } from '../types'

export function MiniContent() {
  const agents = useWorkspaceStore(s => s.agents)
  const lastEvent = useWorkspaceStore(s => s.streamEvents.at(-1))

  return (
    <div style={{
      background: 'rgba(2,6,23,0.92)',
      borderRadius: 12,
      padding: '10px 14px',
      color: '#94a3b8',
      fontFamily: 'monospace',
      fontSize: 11,
      backdropFilter: 'blur(16px)',
      border: '1px solid #0f172a',
      height: '100%',
    }}>
      <div style={{ fontSize: 9, color: '#334155', letterSpacing: 2, marginBottom: 8 }}>
        AGENT WORKSPACE
      </div>
      {Object.values(agents).slice(0, 6).map(agent => {
        const { emoji, color } = getRoleConfig(agent.type)
        return (
          <div key={agent.id} style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 4 }}>
            <span style={{ fontSize: 8, width: 6, height: 6, borderRadius: '50%', background: color, display: 'inline-block' }} />
            <span>{emoji} {agent.type}</span>
            <span style={{ color: '#475569', marginLeft: 'auto' }}>{agent.status}</span>
          </div>
        )
      })}
      {lastEvent && (
        <div style={{ marginTop: 8, color: '#475569', fontSize: 10, borderTop: '1px solid #0f172a', paddingTop: 6 }}>
          {lastEvent.label}
        </div>
      )}
    </div>
  )
}
```

- [ ] **Step 4: In App.tsx, detect mini mode from URL param**

```tsx
const isMini = new URLSearchParams(location.search).get('mini') === '1'
if (isMini) return <MiniContent />
```

- [ ] **Step 5: Test mini mode**

Press `Cmd+M` → small floating window appears always-on-top with agent dots.

- [ ] **Step 6: Commit**

```bash
git add src/main/mini-window.ts src/renderer/ui/MiniContent.tsx
git commit -m "feat: Cmd+M mini mode — always-on-top floating window with agent status dots"
```

---

## Task 14: Packaging

**Files:**
- Create: `electron-builder.config.cjs`

- [ ] **Step 1: Write `electron-builder.config.cjs`**

```javascript
module.exports = {
  appId: 'com.agentworkspace.app',
  productName: 'Agent Workspace',
  directories: { output: 'dist' },
  files: ['out/**/*'],
  mac: {
    target: [{ target: 'dmg', arch: ['arm64', 'x64'] }],
    category: 'public.app-category.developer-tools',
  },
  win: { target: 'nsis' },
  linux: { target: 'AppImage' },
}
```

- [ ] **Step 2: Build and package**

```bash
npm run package
```

Expected: `dist/` folder contains `.dmg` (macOS) or equivalent. App opens, server starts, hook script works.

- [ ] **Step 3: Commit**

```bash
git add electron-builder.config.cjs
git commit -m "chore: electron-builder config for macOS dmg packaging"
```

---

## Success Checklist

- [ ] Agents appear on screen within 200ms of a hook POST
- [ ] Characters walk between zones, idle-bob when still
- [ ] Speech bubbles show current tool, update in real time
- [ ] Meeting bubble triggers when Agent/SendMessage tool is used
- [ ] Bottom stream bar shows last 5 events with slide-in animation
- [ ] `Cmd+M` opens always-on-top mini window
- [ ] `F` toggles fullscreen
- [ ] Port 7379 conflict handled gracefully (no crash)
- [ ] App builds to `.dmg` / `.exe` with `npm run package`
- [ ] All 19 OMC roles have unique colors (verified via types.ts table)
