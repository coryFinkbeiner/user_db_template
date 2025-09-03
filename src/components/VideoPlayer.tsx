import { useEffect, useMemo, useRef } from 'react'

type Props = {
  source: string | null
  poster?: string
  className?: string
  onError?: (message: string) => void
}

export default function VideoPlayer({ source, poster, className, onError }: Props) {
  const videoRef = useRef<HTMLVideoElement | null>(null)

  // Force <video> to reload when source changes by using a key
  const key = useMemo(() => (source ? `vid:${source}` : 'vid:none'), [source])

  useEffect(() => {
    const el = videoRef.current
    if (!el) return
    const onErr = () => onError?.('Failed to load video. Check URL, CORS, or format (use MP4/H.264 + AAC).')
    el.addEventListener('error', onErr)
    return () => el.removeEventListener('error', onErr)
  }, [onError, source])

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

