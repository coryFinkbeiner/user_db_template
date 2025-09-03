import { useEffect, useMemo, useRef, useState } from 'react'
import { io, Socket } from 'socket.io-client'

type Props = {
  source: string | null
  poster?: string
  className?: string
  onError?: (message: string) => void
  room?: string | null // provide a room ID to enable sync
}

export default function VideoPlayer({ source, poster, className, onError, room }: Props) {
  const videoRef = useRef<HTMLVideoElement | null>(null)
  const [socket, setSocket] = useState<Socket | null>(null)
  const remoteRef = useRef(false) // guard to prevent event echo-loops

  // Force <video> to reload when source changes by using a key
  const key = useMemo(() => (source ? `vid:${source}` : 'vid:none'), [source])

  useEffect(() => {
    const el = videoRef.current
    if (!el) return
    const onErr = () => onError?.('Failed to load video. Check URL, CORS, or format (use MP4/H.264 + AAC).')
    el.addEventListener('error', onErr)
    return () => el.removeEventListener('error', onErr)
  }, [onError, source])

  // Sync: connect to Socket.IO and wire events when a room is provided
  useEffect(() => {
    const el = videoRef.current
    if (!room || !el) {
      // clean up any existing socket
      if (socket) {
        socket.disconnect()
        setSocket(null)
      }
      return
    }

    const s = io('/', { path: '/socket.io', transports: ['websocket'] })
    setSocket(s)
    s.emit('join', { room })

    const onRequestState = () => {
      const state = {
        src: source,
        time: el.currentTime || 0,
        playing: !el.paused && !el.ended,
        rate: el.playbackRate || 1,
      }
      s.emit('state', { room, state })
    }

    const onPlay = async ({ time }: { time: number }) => {
      remoteRef.current = true
      try {
        if (Math.abs(el.currentTime - time) > 0.3) el.currentTime = time
        await el.play().catch(() => {})
      } finally {
        setTimeout(() => { remoteRef.current = false }, 0)
      }
    }
    const onPause = ({ time }: { time: number }) => {
      remoteRef.current = true
      if (Math.abs(el.currentTime - time) > 0.3) el.currentTime = time
      el.pause()
      setTimeout(() => { remoteRef.current = false }, 0)
    }
    const onSeek = ({ time }: { time: number }) => {
      remoteRef.current = true
      el.currentTime = time
      setTimeout(() => { remoteRef.current = false }, 0)
    }
    const onRate = ({ rate }: { rate: number }) => {
      remoteRef.current = true
      el.playbackRate = rate
      setTimeout(() => { remoteRef.current = false }, 0)
    }
    const onState = async ({ src, time, playing, rate }: { src?: string | null; time: number; playing: boolean; rate: number }) => {
      // We do not auto-change the src. Ensure both sides use the same URL for perfect sync.
      remoteRef.current = true
      try {
        el.playbackRate = rate || 1
        if (Math.abs(el.currentTime - time) > 0.3) el.currentTime = time
        if (playing) await el.play().catch(() => {})
        else el.pause()
      } finally {
        setTimeout(() => { remoteRef.current = false }, 0)
      }
    }

    s.on('request_state', onRequestState)
    s.on('play', onPlay)
    s.on('pause', onPause)
    s.on('seek', onSeek)
    s.on('rate', onRate)
    s.on('state', onState)

    // Emit events when local actions happen
    const emitPlay = () => { if (!remoteRef.current) s.emit('play', { room, time: el.currentTime }) }
    const emitPause = () => { if (!remoteRef.current) s.emit('pause', { room, time: el.currentTime }) }
    const emitSeeked = () => { if (!remoteRef.current) s.emit('seek', { room, time: el.currentTime }) }
    const emitRate = () => { if (!remoteRef.current) s.emit('rate', { room, rate: el.playbackRate }) }

    el.addEventListener('play', emitPlay)
    el.addEventListener('pause', emitPause)
    el.addEventListener('seeked', emitSeeked)
    el.addEventListener('ratechange', emitRate)

    return () => {
      el.removeEventListener('play', emitPlay)
      el.removeEventListener('pause', emitPause)
      el.removeEventListener('seeked', emitSeeked)
      el.removeEventListener('ratechange', emitRate)

      s.off('request_state', onRequestState)
      s.off('play', onPlay)
      s.off('pause', onPause)
      s.off('seek', onSeek)
      s.off('rate', onRate)
      s.off('state', onState)
      s.disconnect()
      setSocket(null)
    }
  }, [room, source])

  if (!source) return null

  return (
    <video
      key={key}
      ref={videoRef}
      className={className}
      controls
      playsInline
      preload="metadata"
      poster={poster}
      src={source}
      style={{ width: '100%', maxHeight: 420, background: 'black', borderRadius: 8 }}
    />
  )
}
