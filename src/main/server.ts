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
