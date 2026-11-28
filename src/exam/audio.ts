import { useCallback, useEffect, useRef, useState } from 'react'

export interface ListenAudio {
  playing: boolean
  time: number
  duration: number
  ended: boolean
  failed: boolean
  /** Phát từ vị trí hiện tại; false nếu trình duyệt chặn hoặc tệp lỗi */
  play: () => Promise<boolean>
  pause: () => void
  seek: (sec: number) => void
}

/** Tệp nghe của cả đề (một tệp cho toàn bộ phần Nghe, như băng thi thật). */
export function useListenAudio(src: string | null, startAt = 0): ListenAudio {
  const el = useRef<HTMLAudioElement | null>(null)
  const [playing, setPlaying] = useState(false)
  const [time, setTime] = useState(startAt)
  const [duration, setDuration] = useState(0)
  const [ended, setEnded] = useState(false)
  const [failed, setFailed] = useState(!src)

  useEffect(() => {
    if (!src) return
    const a = new Audio(src)
    a.preload = 'auto'
    el.current = a
    const onMeta = () => {
      setDuration(a.duration || 0)
      if (startAt > 0 && startAt < a.duration) a.currentTime = startAt
    }
    const onTime = () => setTime(a.currentTime)
    const onPlay = () => setPlaying(true)
    const onPause = () => setPlaying(false)
    const onEnded = () => {
      setPlaying(false)
      setEnded(true)
    }
    const onError = () => setFailed(true)
    a.addEventListener('loadedmetadata', onMeta)
    a.addEventListener('timeupdate', onTime)
    a.addEventListener('play', onPlay)
    a.addEventListener('pause', onPause)
    a.addEventListener('ended', onEnded)
    a.addEventListener('error', onError)
    return () => {
      a.pause()
      a.removeAttribute('src')
      a.load()
      el.current = null
    }
    // Vị trí bắt đầu chỉ dùng lúc mở tệp.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [src])

  const play = useCallback(async () => {
    const a = el.current
    if (!a) return false
    try {
      setEnded(false)
      await a.play()
      return true
    } catch {
      return false
    }
  }, [])
  const pause = useCallback(() => el.current?.pause(), [])
  const seek = useCallback((sec: number) => {
    const a = el.current
    if (!a) return
    a.currentTime = Math.max(0, Math.min(sec, a.duration || sec))
    setTime(a.currentTime)
    setEnded(false)
  }, [])

  return { playing, time, duration, ended, failed, play, pause, seek }
}
