#!/usr/bin/env python3
"""Unit tests for agent-workspace-hook.py"""
import json
import sys
import threading
import unittest
from http.server import BaseHTTPRequestHandler, HTTPServer
from io import StringIO
from unittest.mock import patch

# ── helpers ────────────────────────────────────────────────────────────────────

def run_hook(event_type: str, payload: dict) -> None:
    """Run main() as if invoked by Claude Code with argv[1]=event_type."""
    import importlib, types

    # Reload fresh module each call so module-level state is clean
    import importlib.util, pathlib
    spec = importlib.util.spec_from_file_location(
        "hook",
        pathlib.Path(__file__).parent / "agent-workspace-hook.py",
    )
    mod = importlib.util.load_from_spec(spec) if hasattr(importlib.util, "load_from_spec") else None
    # Fallback for standard Python
    spec2 = importlib.util.spec_from_file_location("hook",
        str(pathlib.Path(__file__).parent / "agent-workspace-hook.py"))
    mod = importlib.util.module_from_spec(spec2)
    spec2.loader.exec_module(mod)

    with patch.object(sys, "argv", ["hook.py", event_type]):
        with patch("sys.stdin", StringIO(json.dumps(payload))):
            try:
                mod.main()
            except SystemExit:
                pass


class CaptureHandler(BaseHTTPRequestHandler):
    """Minimal HTTP server that records received requests."""
    received: list = []

    def do_POST(self):
        length = int(self.headers.get("Content-Length", 0))
        body = self.rfile.read(length)
        CaptureHandler.received.append({"path": self.path, "body": body})
        self.send_response(200)
        self.end_headers()
        self.wfile.write(b"ok")

    def log_message(self, *_):
        pass  # silence output


def start_capture_server(port: int) -> HTTPServer:
    CaptureHandler.received = []
    srv = HTTPServer(("127.0.0.1", port), CaptureHandler)
    t = threading.Thread(target=srv.serve_forever, daemon=True)
    t.start()
    return srv


# ── tests ──────────────────────────────────────────────────────────────────────

class TestHookEvents(unittest.TestCase):

    def setUp(self):
        self.srv = start_capture_server(7379)

    def tearDown(self):
        self.srv.shutdown()

    def _last_event(self) -> dict:
        self.assertTrue(CaptureHandler.received, "No request received")
        return json.loads(CaptureHandler.received[-1]["body"])

    def test_prompt_sends_thinking_tool_use(self):
        run_hook("prompt", {"session_id": "s1", "agent_type": "executor"})
        ev = self._last_event()
        self.assertEqual(ev["type"], "tool_use")
        self.assertEqual(ev["tool"], "thinking")
        self.assertEqual(ev["agentId"], "s1")

    def test_pre_tool_agent_sends_agent_start(self):
        run_hook("pre_tool", {
            "session_id": "s1", "agent_type": "planner", "tool_name": "Agent"
        })
        ev = self._last_event()
        self.assertEqual(ev["type"], "agent_start")
        self.assertEqual(ev["agentType"], "planner")

    def test_pre_tool_other_sends_tool_use(self):
        run_hook("pre_tool", {
            "session_id": "s1", "agent_type": "executor",
            "tool_name": "Bash", "tool_input": {"command": "ls"}
        })
        ev = self._last_event()
        self.assertEqual(ev["type"], "tool_use")
        self.assertEqual(ev["tool"], "Bash")

    def test_post_tool_sends_tool_done(self):
        run_hook("post_tool", {
            "session_id": "s1", "agent_type": "executor", "tool_name": "Bash"
        })
        ev = self._last_event()
        self.assertEqual(ev["type"], "tool_done")
        self.assertEqual(ev["tool"], "Bash")

    def test_stop_sends_agent_celebrate(self):
        run_hook("stop", {"session_id": "s1", "agent_type": "executor"})
        ev = self._last_event()
        self.assertEqual(ev["type"], "agent_celebrate")

    def test_unknown_event_sends_nothing(self):
        before = len(CaptureHandler.received)
        run_hook("unknown_xyz", {"session_id": "s1"})
        self.assertEqual(len(CaptureHandler.received), before)

    def test_event_has_timestamp(self):
        run_hook("stop", {"session_id": "s1", "agent_type": "executor"})
        ev = self._last_event()
        self.assertIn("ts", ev)
        self.assertIsInstance(ev["ts"], int)


class TestShutdownEvent(unittest.TestCase):
    """session_end should POST to /shutdown, not /event."""

    def setUp(self):
        self.srv = start_capture_server(7379)

    def tearDown(self):
        self.srv.shutdown()

    def test_session_end_posts_to_shutdown(self):
        run_hook("session_end", {"session_id": "s1", "agent_type": "executor"})
        paths = [r["path"] for r in CaptureHandler.received]
        self.assertIn("/shutdown", paths)
        # Must NOT send a regular /event
        self.assertNotIn("/event", paths)


if __name__ == "__main__":
    unittest.main(verbosity=2)
