import express from 'express'
import { PrismaClient } from '@prisma/client'

const app = express()
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
    const users = await prisma.user.findMany({ orderBy: { createdAt: 'desc' } })
    res.json(users)
  } catch (e: any) {
    res.status(500).json({ error: e?.message || 'failed to fetch users' })
  }
})

app.post('/api/users', async (req, res) => {
  const { email, name } = req.body
  if (!email) return res.status(400).json({ error: 'email is required' })
  try {
    const user = await prisma.user.create({ data: { email, name } })
    res.status(201).json(user)
  } catch (err: any) {
    if (err.code === 'P2002') {
      return res.status(409).json({ error: 'email already exists' })
    }
    res.status(500).json({ error: 'internal error' })
  }
})

const port = Number(process.env.PORT || 5174)
app.listen(port, () => {
  console.log(`API server listening on http://localhost:${port}`)
})
