import { useEffect, useMemo, useState } from 'react'
import VideoPlayer from './components/VideoPlayer'

type User = {
  id: string
  email: string
  name?: string | null
  createdAt: string
}

function App() {
  const [dbOk, setDbOk] = useState<boolean | null>(null)
  const [dbError, setDbError] = useState<string | null>(null)
  const [users, setUsers] = useState<User[] | null>(null)
  const [loadingUsers, setLoadingUsers] = useState(false)
  const [email, setEmail] = useState('')
  const [name, setName] = useState('')
  const [creating, setCreating] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [password, setPassword] = useState('')
  // In-app MP4 player: fixed, code-defined source (no user input)
  const [videoUrl] = useState('https://interactive-examples.mdn.mozilla.net/media/cc0-videos/flower.mp4')
  const [playerError, setPlayerError] = useState<string | null>(null)
  const [roomInput, setRoomInput] = useState('')
  const [room, setRoom] = useState<string | null>(null)

  // No file object URLs used when source is code-defined

  useEffect(() => {
    const load = async () => {
      try {
        const health = await fetch('/api/health').then(r => r.json())
        setDbOk(Boolean(health?.db))
        setDbError(health?.db ? null : health?.error || null)
      } catch (e: any) {
        setDbOk(false)
        setDbError(e?.message || 'Failed to reach API')
      }

      setLoadingUsers(true)
      try {
        const data = await fetch('/api/users').then(async r => {
          if (!r.ok) throw new Error((await r.json())?.error || r.statusText)
          return r.json()
        })
        setUsers(data)
      } catch (e: any) {
        setError(e?.message || 'Failed to load users')
        setUsers([])
      } finally {
        setLoadingUsers(false)
      }
    }
    load()
  }, [])

  const statusText = useMemo(() => {
    if (dbOk === null) return 'Checking...'
    if (dbOk) return 'Connected'
    return 'Not connected'
  }, [dbOk])

  const onCreate = async (ev: React.FormEvent) => {
    ev.preventDefault()
    setCreating(true)
    setError(null)
    try {
      const res = await fetch('/api/users', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, name: name || undefined, password })
      })
      const body = await res.json()
      if (!res.ok) throw new Error(body?.error || 'Create failed')
      setUsers(u => [body as User, ...(u || [])])
      setEmail('')
      setName('')
      setPassword('')
    } catch (e: any) {
      setError(e?.message || 'Create failed')
    } finally {
      setCreating(false)
    }
  }

  return (
    <main className="rainbow">
      <div className="panel">
        <h1>User DB Status</h1>
        <p>
          DB: <span className={`chip ${dbOk ? 'ok' : dbOk === false ? 'bad' : 'wait'}`}>{statusText}</span>
        </p>
        {dbError && <p className="muted">{dbError}</p>}

        <h2>Users</h2>
        {loadingUsers ? (
          <p className="muted">Loading users…</p>
        ) : error ? (
          <p className="error">{error}</p>
        ) : users && users.length > 0 ? (
          <ul className="list">
            {users.map(u => (
              <li key={u.id}>
                <strong>{u.email}</strong>
                {u.name ? ` — ${u.name}` : ''}
              </li>
            ))}
          </ul>
        ) : (
          <p className="muted">No users yet.</p>
        )}

        <h3>Create User</h3>
        <form onSubmit={onCreate} className="form">
          <input
            type="email"
            placeholder="email@example.com"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            required
          />
          <input
            type="text"
            placeholder="Name (optional)"
            value={name}
            onChange={(e) => setName(e.target.value)}
          />
          <input
            type="password"
            placeholder="Password (min 8 chars)"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            required
            minLength={8}
          />
        <button type="submit" disabled={creating}>{creating ? 'Creating…' : 'Create'}</button>
        </form>

        <div className="player-panel">
          <h2>MP4 Player</h2>
          <p className="muted">Using built-in sample video (flower.mp4).</p>
          <form className="player-form" onSubmit={(e) => { e.preventDefault(); setRoom(roomInput || null) }}>
            <input
              type="text"
              placeholder="Room ID (e.g., room-123)"
              value={roomInput}
              onChange={(e) => setRoomInput(e.target.value)}
              style={{ minWidth: 220 }}
            />
            <button onClick={() => setRoom(roomInput || null)} disabled={!roomInput}>Join Room</button>
            <button onClick={() => setRoom(null)} disabled={!room}>Leave</button>
          </form>
          <p className="muted">Open this page in two windows, join the same room, then play/pause/seek to test sync.</p>
          {playerError && <p className="error">{playerError}</p>}
          <div className="player">
            <VideoPlayer
              source={videoUrl}
              onError={(msg) => setPlayerError(msg)}
              room={room}
            />
          </div>
        </div>
      </div>
    </main>
  )
}

export default App
