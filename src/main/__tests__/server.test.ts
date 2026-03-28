import { describe, it, expect, vi, beforeAll, afterAll, beforeEach } from 'vitest'
import http from 'http'
import { startServer, getEventBuffer, clearBuffer, setEventHandler, getActualPort } from '../server'

// electron is stubbed via vitest.config.ts alias → __mocks__/electron.ts

function makeRequest(
  server: http.Server,
  method: string,
  path: string,
  body?: string,
): Promise<{ status: number; body: string }> {
  return new Promise((resolve, reject) => {
    const addr = server.address() as { port: number }
    const headers: Record<string, string | number> = {
      Connection: 'close',  // prevent keep-alive so server.close() resolves cleanly
    }
    if (body) {
      headers['Content-Type'] = 'application/json'
      headers['Content-Length'] = Buffer.byteLength(body)
    }
    const req = http.request(
      { hostname: '127.0.0.1', port: addr.port, path, method, headers },
      (res) => {
        let data = ''
        res.on('data', (c) => (data += c))
        res.on('end', () => resolve({ status: res.statusCode ?? 0, body: data }))
      },
    )
    req.on('error', reject)
    if (body) req.write(body)
    req.end()
  })
}

function closeServer(srv: http.Server | null): Promise<void> {
  return new Promise<void>((r) => {
    if (srv && srv.listening) srv.close(() => r())
    else r()
  })
}

// ── /event endpoint ────────────────────────────────────────────────────────────

describe('/event endpoint', () => {
  let server: http.Server | null

  beforeAll(async () => {
    server = await startServer()
  })

  afterAll(() => closeServer(server))

  beforeEach(() => {
    clearBuffer()
    setEventHandler(null)
  })

  it('returns 200 and buffers a valid event', async () => {
    const event = { type: 'tool_use', agentId: 'a1', agentType: 'executor', ts: 1 }
    const res = await makeRequest(server!, 'POST', '/event', JSON.stringify(event))

    expect(res.status).toBe(200)
    expect(res.body).toBe('ok')
    expect(getEventBuffer()).toHaveLength(1)
    expect(getEventBuffer()[0].agentId).toBe('a1')
  })

  it('calls the event handler callback', async () => {
    const cb = vi.fn()
    setEventHandler(cb)

    await makeRequest(server!, 'POST', '/event',
      JSON.stringify({ type: 'tool_use', agentId: 'a2', agentType: 'executor', ts: 2 }))

    expect(cb).toHaveBeenCalledOnce()
    expect(cb.mock.calls[0][0].agentId).toBe('a2')
  })

  it('returns 400 on malformed JSON', async () => {
    const res = await makeRequest(server!, 'POST', '/event', 'not-json{{{')
    expect(res.status).toBe(400)
  })

  it('rolls over at MAX_BUFFER (200) — oldest entry evicted', async () => {
    for (let i = 0; i < 201; i++) {
      await makeRequest(server!, 'POST', '/event',
        JSON.stringify({ type: 'tool_use', agentId: `id-${i}`, agentType: 'executor', ts: i }))
    }
    const buf = getEventBuffer()
    expect(buf).toHaveLength(200)
    expect(buf[0].agentId).toBe('id-1')     // id-0 evicted
    expect(buf[199].agentId).toBe('id-200')
  })

  it('returns 404 for unknown routes', async () => {
    const res = await makeRequest(server!, 'GET', '/unknown')
    expect(res.status).toBe(404)
  })
})

// ── /shutdown endpoint ─────────────────────────────────────────────────────────

describe('/shutdown endpoint', () => {
  it('returns 200 with body "bye" and calls app.quit()', async () => {
    const { app } = await import('electron')
    const quitSpy = vi.spyOn(app, 'quit').mockImplementation(() => {})

    const srv = await startServer()
    const res = await makeRequest(srv!, 'POST', '/shutdown')

    expect(res.status).toBe(200)
    expect(res.body).toBe('bye')
    await new Promise((r) => setTimeout(r, 50))
    expect(quitSpy).toHaveBeenCalledOnce()

    quitSpy.mockRestore()
    await closeServer(srv)  // no-op if shutdown already closed it
  })
})

// ── port fallback ──────────────────────────────────────────────────────────────

describe('port fallback', () => {
  it('binds to next port when 7379 is occupied', async () => {
    const blocker = http.createServer()
    await new Promise<void>((r) => blocker.listen(7379, '127.0.0.1', r))

    const srv = await startServer()
    const port = getActualPort()

    await closeServer(srv)
    await closeServer(blocker)

    expect(port).toBe(7380)
  })
})
