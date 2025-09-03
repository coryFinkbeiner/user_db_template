import 'dotenv/config'
import express from 'express'
import { createServer } from 'http'
import { Server as SocketIOServer } from 'socket.io'
import { PrismaClient } from '@prisma/client'
import * as bcrypt from 'bcryptjs'

const app = express()
const server = createServer(app)
const io = new SocketIOServer(server, {
  // Allow dev from Vite (5173). In prod, same-origin is used.
  cors: { origin: true, credentials: false },
})
const prisma = new PrismaClient()

app.use(express.json())

app.get('/api/health', async (_req, res) => {
  try {
    await prisma.$queryRaw`SELECT 1`;
    res.json({ ok: true, db: true });
  } catch (e: any) {
    res.json({ ok: true, db: false, error: e?.message || 'DB error' });
  }
})

app.get('/api/users', async (_req, res) => {
  try {
    const users = await prisma.user.findMany({
      orderBy: { createdAt: 'desc' },
      select: { id: true, email: true, name: true, createdAt: true },
    })
    res.json(users)
  } catch (e: any) {
    res.status(500).json({ error: e?.message || 'failed to fetch users' })
  }
})

app.post('/api/users', async (req, res) => {
  const { email, name, password } = req.body as { email?: string; name?: string; password?: string }
  if (!email) return res.status(400).json({ error: 'email is required' })
  if (!password) return res.status(400).json({ error: 'password is required' })
  if (typeof password !== 'string' || password.length < 8) {
    return res.status(400).json({ error: 'password must be at least 8 characters' })
  }
  try {
    const passwordHash = await bcrypt.hash(password, 12)
    const user = await prisma.user.create({
      data: { email, name, passwordHash },
      select: { id: true, email: true, name: true, createdAt: true },
    })
    res.status(201).json(user)
  } catch (err: any) {
    if (err.code === 'P2002') {
      return res.status(409).json({ error: 'email already exists' })
    }
    res.status(500).json({ error: 'internal error' })
  }
})

// --- Socket.IO: simple room-based sync for watch-together ---
type RoomPayload = { room: string }
type PlayPayload = RoomPayload & { time: number; ts?: number }
type PausePayload = RoomPayload & { time: number; ts?: number }
type SeekPayload = RoomPayload & { time: number; ts?: number }
type RatePayload = RoomPayload & { rate: number }
type StatePayload = RoomPayload & { state: { src?: string | null; time: number; playing: boolean; rate: number } }

io.on('connection', (socket) => {
  socket.on('join', ({ room }: RoomPayload) => {
    if (!room) return
    socket.join(room)
    // Ask others for their current state to sync the newcomer
    socket.to(room).emit('request_state')
  })

  socket.on('play', ({ room, time, ts }: PlayPayload) => {
    if (!room) return
    socket.to(room).emit('play', { time, ts: ts ?? Date.now() })
  })
  socket.on('pause', ({ room, time, ts }: PausePayload) => {
    if (!room) return
    socket.to(room).emit('pause', { time, ts: ts ?? Date.now() })
  })
  socket.on('seek', ({ room, time, ts }: SeekPayload) => {
    if (!room) return
    socket.to(room).emit('seek', { time, ts: ts ?? Date.now() })
  })
  socket.on('rate', ({ room, rate }: RatePayload) => {
    if (!room) return
    socket.to(room).emit('rate', { rate })
  })
  socket.on('state', ({ room, state }: StatePayload) => {
    if (!room) return
    socket.to(room).emit('state', state)
  })
})

const port = Number(process.env.PORT || 5174)
server.listen(port, () => {
  console.log(`API + WS server listening on http://localhost:${port}`)
})
