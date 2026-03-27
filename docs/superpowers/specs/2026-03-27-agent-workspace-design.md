# Agent Workspace — Design Spec
**Date:** 2026-03-27
**Status:** Approved

---

## Overview

A 3D isometric desktop app that visualizes Claude Code / OMC multi-agent activity in real time. Agents walk around a shared space, speech bubbles show what they're doing, and a bottom stream shows live conversation and tool activity. Designed to beat Claw3D on both visual quality and practical usefulness.

---

## Goals

1. See what agents are doing at a glance — without reading logs
2. Watch sub-agents communicate in real time with speech bubbles
3. Keep working on other things while agents run (mini mode)
4. Feel like a real desktop app, not a dashboard

---

## Tech Stack

| Layer | Choice | Reason |
|---|---|---|
| App shell | Electron | npm ecosystem, Node.js backend, easy packaging |
| 3D rendering | React Three Fiber + Three.js | Declarative 3D as React components — agent state maps naturally to React state |
| UI | React + Tailwind CSS | Component-based, fast iteration |
| State | Zustand | Lightweight, outside React tree (accessible from WS handler) |
| IPC / data | WebSocket server (Node.js, port 7379) | Sub-100ms latency, in-memory, no file I/O |
| Packaging | electron-builder | Standard, cross-platform |

---

## Architecture

```
Claude Code + OMC running
        │
        │  PreToolUse / PostToolUse / Stop hooks
        │  (configured in .claude/settings.json)
        │  → hook command reads JSON from stdin
        │  → POSTs event to localhost:7379/event
        ▼
  HTTP Server  (Electron main process, Node.js)
  port: 7379   (POST /event)
        │
        │  event queued, broadcast to renderer
        ▼
  Zustand store  (agent state machine)
        │
        ├──▶  R3F Scene  (3D isometric viewport)
        │        └── AgentBlock walks, animates, shows bubbles
        │
        └──▶  Bottom Stream Bar
                 └── Live scrolling activity feed
```

**No file watcher in v1.** Hooks are sufficient (proven by existing `notch_hook.py`). Add file watcher in v2 only if hook gaps are observed in practice.

---

## Hook Configuration

Hooks are configured in `.claude/settings.json` (or `.claude/settings.local.json`), NOT in `CLAUDE.md`. Hook commands receive a JSON payload on **stdin**.

### settings.json

```json
{
  "hooks": {
    "PreToolUse": [
      {
        "matcher": "",
        "hooks": [{
          "type": "command",
          "command": "python3 ~/.claude/agent-workspace-hook.py pre_tool",
          "timeout": 2
        }]
      }
    ],
    "PostToolUse": [
      {
        "matcher": "",
        "hooks": [{
          "type": "command",
          "command": "python3 ~/.claude/agent-workspace-hook.py post_tool",
          "timeout": 2
        }]
      }
    ],
    "Stop": [
      {
        "matcher": "",
        "hooks": [{
          "type": "command",
          "command": "python3 ~/.claude/agent-workspace-hook.py stop",
          "timeout": 2
        }]
      }
    ]
  }
}
```

### agent-workspace-hook.py

```python
#!/usr/bin/env python3
import sys, json, urllib.request, urllib.error

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

    # Map hook event to workspace event type
    if event_type == "pre_tool":
        # Detect agent spawn (Agent tool invocation)
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

    import time
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

The `try/except` at the POST call ensures hook failure never blocks Claude Code.

---

## WebSocket / HTTP Server Lifecycle

The Electron main process starts an HTTP server on port 7379 on app launch.

**Port conflict:** If 7379 is in use, try 7380, 7381 up to 3 times, then log and disable event ingestion gracefully. The app still renders but shows a "not connected" indicator.

**Event buffer:** Server keeps a 60-second rolling buffer of received events in memory. On renderer (re)connect, the server replays buffered events so the scene can reconstruct recent state.

**Renderer reconnect:** The renderer connects to the main process via Electron IPC (not raw WebSocket). The IPC channel is always available; no reconnect needed.

**App closed while Claude runs:** Events are lost. This is acceptable for v1. The scene rebuilds from the next event received when the app reopens.

---

## Agent Identity Model

Claude Code hooks provide two fields:
- `agent_id`: UUID or session ID — unique per agent instance
- `agent_type`: role string — "analyst", "writer", "executor", etc.

The 3D scene uses `agent_id` as the unique key for each agent block. `agent_type` determines color and emoji.

### Role → Color + Emoji (all 19 OMC roles)

| agent_type | Emoji | Top color |
|---|---|---|
| analyst | 🔬 | `#7c3aed` purple |
| writer | ✍️ | `#059669` green |
| reviewer / code-reviewer | 🔍 | `#d97706` amber |
| executor | ⚙️ | `#2563eb` blue |
| debugger | 🐛 | `#dc2626` red |
| planner | 🗺️ | `#0891b2` cyan |
| architect | 🏛️ | `#6d28d9` deep purple |
| explore | 🧭 | `#65a30d` lime |
| verifier | ✅ | `#0d9488` teal |
| tracer | 🔎 | `#c2410c` orange |
| security-reviewer | 🛡️ | `#be185d` pink |
| test-engineer | 🧪 | `#8b5cf6` violet |
| designer | 🎨 | `#db2777` fuchsia |
| qa-tester | 🎯 | `#b45309` yellow |
| scientist | 🧬 | `#0369a1` sky |
| document-specialist | 📚 | `#4338ca` indigo |
| git-master | 🌿 | `#166534` dark green |
| code-simplifier | ✂️ | `#6b7280` slate |
| critic | ⚖️ | `#9f1239` rose |
| *(unknown)* | 🤖 | deterministic hash of agent_type string → hue |

For unknown roles, use: `hsl(hash(agent_type) % 360, 65%, 45%)` for a consistent color.

---

## Zustand Store Schema

```ts
interface AgentState {
  id: string;            // agent_id (UUID)
  type: string;          // agent_type (role name)
  status: 'spawning' | 'idle' | 'working' | 'meeting' | 'done';
  currentTool: string | null;
  lastMessage: string | null;
  progress: number;      // 0–1, estimated from tool call count
  pos: { x: number; y: number };   // current grid position (float)
  target: { x: number; y: number }; // target grid position
  meetingWith: string[];  // agent_ids in same meeting
}

interface WorkspaceStore {
  agents: Record<string, AgentState>;
  streamEvents: StreamEvent[];        // last 50 events for bottom bar
  viewMode: 'default' | 'fullscreen' | 'mini';

  // Actions
  upsertAgent: (event: WSEvent) => void;
  removeAgent: (agentId: string) => void;
  pushStream: (event: StreamEvent) => void;
  setViewMode: (mode: ViewMode) => void;
}
```

### Agent Status Transitions

```
             agent_start
  (none) ──────────────▶ spawning
                              │  (first tool_use or 2s timeout)
                              ▼
              tool_use   working ◀──────────────┐
  idle ◀─────────────── working                │
  idle ──▶ working ──────────────────────────── ┘
                              │  (meeting_start)
                              ▼
                           meeting
                              │  (meeting_end)
                              ▼
                           working / idle
                              │  (agent_done)
                              ▼
                            done ──▶ fade out after 3s ──▶ removed
```

If an `agent_done` event arrives for an unknown `agent_id`, ignore it.
If events arrive for a `done` agent, resurrect it to `working`.

---

## View Modes

| Mode | Key | Description |
|---|---|---|
| **Default** | — | 3D viewport (large) + bottom stream bar |
| **Fullscreen** | `F` | 3D only, no chrome |
| **Mini** | `Cmd+M` (not Tab — avoids focus navigation conflict) | Always-on-top floating widget |

Mini mode uses a separate Electron `BrowserWindow`:
```js
new BrowserWindow({
  width: 300, height: 200,
  alwaysOnTop: true,
  transparent: true,
  frame: false,
  hasShadow: true,
  vibrancy: 'under-window',  // macOS
  resizable: false,
  webPreferences: { preload: '...' }
})
```

No 3D rendering in mini mode. Shows only: agent list with status dots + last stream event.

---

## 3D Scene

**Grid:** 8×8 isometric tiles. If more than 8 agents are active simultaneously, expand grid dynamically to 10×10. Max supported: 16 simultaneous agents.

**Camera:** Fixed isometric angle (no user rotation in v1). Scroll-wheel zoom.

**Agent block:**
- Idle: sinusoidal bob (±3px, 0.5Hz)
- Walking: smooth lerp to target grid cell at 0.04 grid units/frame (~2.4 cells/sec at 60fps)
- Spawn: scale-in animation (0 → 1, 400ms, ease-out)
- Done: scale-out + fade (400ms), then remove from scene

**Patrol (idle movement):** Each agent type has a designated zone (3×3 tile area). When idle, agent picks a random point in its zone and walks there. Zones are assigned by role to avoid crowding.

---

## Speech Bubble System

### 1. Simple Bubble (default, solo working)
Single line: current tool or last message.
Max width: 180px, truncated with ellipsis.

### 2. Info Card (on click)
Panel showing: agent name, role, current tool + input path, progress bar (0–100%), last 3 messages.
Dismissed by clicking elsewhere or pressing `Esc`.

### 3. Meeting Bubble (2+ agents collaborating)

**Trigger:** Two or more agents have `meetingWith` containing each other's IDs. This is set when:
- An `Agent` tool call is detected in the same session (parent spawns child)
- A `SendMessage` tool call is detected (OMC team communication)

When meeting is detected: agents walk toward a shared "meeting zone" (center of their combined zone). The shared bubble appears above the meeting point.

Content: scrolling dialogue, color-coded by agent. Last 6 lines visible. Typing indicator when a new event is expected.

**Meeting ends:** when all agents in the group receive `agent_done` or 60s of inactivity.

### State Machine
```
SOLO ──(group detected)──▶ MEETING
     ◀──(group dissolved)──
SOLO ──(click)──▶ CARD ──(click away / Esc)──▶ SOLO
MEETING ──(click agent)──▶ CARD (for that agent)
```

---

## Bottom Stream Bar

- **Height:** 34px, always visible in default mode
- **Content:** Last 5 events, newest on the right
- **Format:** `[emoji] [role] › [action] [detail]`
- **New event:** slides in from right with 200ms ease-in
- **Old event:** fades out when pushed off left edge
- **Latency target:** visible within 200ms of hook POST received by server

---

## WebSocket Event Schema

All events sent as JSON via POST to `http://localhost:7379/event`.

```ts
// Agent spawned (detected via Agent tool invocation)
{ type: "agent_start",  agentId: string, agentType: string, ts: number }

// Tool call started
{ type: "tool_use",     agentId: string, agentType: string, tool: string, input: object, ts: number }

// Tool call completed
{ type: "tool_done",    agentId: string, agentType: string, tool: string, ts: number }

// Agent sent a message (output text)
{ type: "message",      agentId: string, agentType: string, text: string, ts: number }

// Agent session ended
{ type: "agent_done",   agentId: string, agentType: string, ts: number }
```

Meeting start/end are **derived** from agent state (not explicit events), to avoid the problem of defining a trigger for them in hooks.

---

## Success Criteria

- [ ] Agents visibly walk between positions when Claude Code is running
- [ ] Speech bubbles update within 200ms of the server receiving a hook POST
- [ ] Meeting bubble appears automatically when OMC spawns sub-agents
- [ ] Mini mode (`Cmd+M`) stays on top across all app switches
- [ ] Fullscreen ↔ default ↔ mini transition completes in under 100ms
- [ ] App does not crash or block Claude Code if server is unavailable
- [ ] All 19 OMC agent roles display a unique color (no two roles share exact same color)
- [ ] Port conflict on 7379 is handled gracefully (no crash, "not connected" shown)

---

## LEGO Character System

### Base Character

Each agent is a Three.js LEGO minifigure built from BoxGeometry / CylinderGeometry primitives:
- Head (box) — front face accepts custom texture
- Head stud (cylinder)
- Torso (box) — color = agent role color
- Arms x2 (box)
- Hands x2 (sphere)
- Legs x2 (box)
- Feet x2 (box)
- Hair piece (swappable geometry, see below)

Walk animation: legs/arms swing sinusoidally. Idle: head bobs + slow head rotation.

### Face Texture

The head's front face (material index 4 in BoxGeometry) takes any Three.js texture:
- Default: canvas-drawn emoji face
- Custom: image file → cropped face region → CanvasTexture applied to front face only

### Avatar Customization from Photo

User provides a portrait image. The app automatically generates a LEGO avatar via Canvas 2D image analysis:

```
Image input (portrait)
  │
  ├── Face region (center ~40% of image height, upper 60%)
  │     → crop → apply as head front face texture
  │
  ├── Hair region (top ~20% of image)
  │     → sample dominant color → set hair piece color
  │     → detect rough length (pixel density near top) → pick hair style
  │
  ├── Shirt region (lower ~35% of image)
  │     → sample dominant color → set torso + arm material color
  │
  └── Skin region (face area color average)
        → set hand + neck material color
```

**Hair piece styles** (pre-built geometries, one selected per character):
`SHORT` / `LONG` / `CURLY` / `PONYTAIL` / `BUN` / `SPIKY` / `BALD` / `HELMET`

Selection logic: hair pixel density at top → length estimate → style bucket.
Color: HSL-matched to sampled hair color.

### Configuration

Each agent entry in `settings.json` (app-level config, not Claude settings):

```json
{
  "agents": {
    "analyst": {
      "avatarImage": "~/.config/agent-workspace/faces/analyst.jpg",
      "hairStyle": "SHORT",
      "roleColor": "#7c3aed"
    }
  }
}
```

`avatarImage` is optional. If omitted, default emoji face + role color torso is used.

**Hot-swap:** Changing `avatarImage` while the app is running reloads the texture without restart.

---

## Out of Scope (v1)

- Authentication / multi-user
- Remote agent connections (only local Claude Code sessions)
- Voice / ElevenLabs integration
- File watcher fallback (v2 if needed)
- Agent "gym" / skill training UI
- Mobile / web version
- Accessibility (screen reader, high-contrast)
- Performance optimization / LOD (address if >8 agents cause frame drops)

---

## File Structure

```
agent-workspace/
├── electron/
│   ├── main.ts              # App entry, BrowserWindow, HTTP server on 7379
│   ├── preload.ts           # IPC bridge to renderer
│   └── mini-window.ts       # Always-on-top mini BrowserWindow
├── src/
│   ├── App.tsx              # Root, mode switching (default/fullscreen/mini)
│   ├── store/
│   │   └── agents.ts        # Zustand store (AgentState, WorkspaceStore)
│   ├── scene/
│   │   ├── IsometricScene.tsx     # R3F scene root, camera, lighting
│   │   ├── AgentBlock.tsx         # Per-agent block, walk lerp, bob, spawn/done anim
│   │   ├── FloorGrid.tsx          # 8×8 tile floor
│   │   └── BubbleOverlay.tsx      # HTML overlay for speech bubbles (not WebGL)
│   ├── ui/
│   │   ├── BottomStream.tsx       # 34px stream bar
│   │   ├── HUD.tsx                # Top-right agent cards
│   │   └── MiniOverlay.tsx        # Mini mode content (no 3D)
│   └── hooks/
│       └── useAgentEvents.ts      # IPC listener → Zustand dispatch
├── scripts/
│   └── agent-workspace-hook.py   # Hook script (copied to ~/.claude/)
├── docs/superpowers/specs/
│   └── 2026-03-27-agent-workspace-design.md
├── electron-builder.json
└── package.json
```
