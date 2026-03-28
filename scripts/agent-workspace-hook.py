#!/usr/bin/env python3
import os, sys, json, urllib.request, urllib.error, time

PID_FILE = "/tmp/claude-agent-workspace.pid"

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

    if event_type == "prompt":
        # Record Claude Code's PID so Electron can watch for process exit
        try:
            with open(PID_FILE, "w") as f:
                f.write(str(os.getppid()))
        except Exception:
            pass
        ws_event = {"type": "tool_use", "agentId": agent_id,
                    "agentType": agent_type, "tool": "thinking"}
    elif event_type == "pre_tool":
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
        ws_event = {"type": "agent_celebrate", "agentId": agent_id,
                    "agentType": agent_type}
    elif event_type == "session_end":
        for port in [7379, 7380, 7381]:
            try:
                req = urllib.request.Request(
                    f"http://localhost:{port}/shutdown",
                    data=b"", method="POST",
                    headers={"Content-Type": "application/json"}
                )
                urllib.request.urlopen(req, timeout=1)
            except Exception:
                continue
        sys.exit(0)
    else:
        sys.exit(0)

    ws_event["ts"] = int(time.time() * 1000)

    for port in [7379, 7380, 7381]:
        try:
            data = json.dumps(ws_event).encode()
            req = urllib.request.Request(
                f"http://localhost:{port}/event",
                data=data, method="POST",
                headers={"Content-Type": "application/json"}
            )
            urllib.request.urlopen(req, timeout=1)
            break  # success — stop trying
        except Exception:
            continue  # try next port

if __name__ == "__main__":
    main()
