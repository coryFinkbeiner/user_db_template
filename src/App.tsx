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
  // In-app MP4 player state
  const [videoUrl, setVideoUrl] = useState('')
  const [fileSrc, setFileSrc] = useState<string | null>(null)
  const [playerError, setPlayerError] = useState<string | null>(null)

  // Revoke object URL when fileSrc changes or on unmount
  useEffect(() => {
    return () => {
      if (fileSrc) URL.revokeObjectURL(fileSrc)
    }
  }, [fileSrc])

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
          <p className="muted">Paste an MP4 URL or pick a local file.</p>
          <form className="player-form" onSubmit={e => e.preventDefault()}>
            <input
              type="url"
              placeholder="https://example.com/video.mp4"
              value={videoUrl}
              onChange={(e) => { setVideoUrl(e.target.value); setFileSrc(null); setPlayerError(null) }}
              style={{ minWidth: 280, flex: 1 }}
            />
            <input
              type="file"
              accept="video/mp4"
              onChange={(e) => {
                const f = e.target.files?.[0]
                if (!f) { setFileSrc(null); return }
                const url = URL.createObjectURL(f)
                setFileSrc(url)
                setVideoUrl('')
                setPlayerError(null)
              }}
            />
          </form>
          {playerError && <p className="error">{playerError}</p>}
          <div className="player">
            <VideoPlayer
              source={fileSrc || (videoUrl ? videoUrl : null)}
              onError={(msg) => setPlayerError(msg)}
            />
          </div>
        </div>
      </div>
    </main>
  )
}

export default App
