import { useEffect, useRef, useState } from 'react'

/** Phần nhỏ của YouTube IFrame Player API mà app dùng. */
export interface YTPlayer {
  playVideo(): void
  pauseVideo(): void
  seekTo(seconds: number, allowSeekAhead: boolean): void
  getCurrentTime(): number
  getDuration(): number
  getPlayerState(): number
  setPlaybackRate(rate: number): void
  mute(): void
  unMute(): void
  isMuted(): boolean
  getVideoData?(): { title?: string }
  destroy(): void
}

declare global {
  interface Window {
    YT?: { Player: new (el: HTMLElement, opts: object) => YTPlayer }
    onYouTubeIframeAPIReady?: () => void
  }
}

let apiPromise: Promise<void> | null = null
/** Nạp thư viện trình phát chính thức của YouTube (một lần). */
function loadApi() {
  if (window.YT?.Player) return Promise.resolve()
  if (!apiPromise)
    apiPromise = new Promise((resolve) => {
      const prev = window.onYouTubeIframeAPIReady
      window.onYouTubeIframeAPIReady = () => {
        prev?.()
        resolve()
      }
      const s = document.createElement('script')
      s.src = 'https://www.youtube.com/iframe_api'
      document.head.appendChild(s)
    })
  return apiPromise
}

/** Gắn trình phát YouTube vào một thẻ div. */
export function useYouTubePlayer(videoId: string) {
  const hostRef = useRef<HTMLDivElement>(null)
  const playerRef = useRef<YTPlayer | null>(null)
  const [ready, setReady] = useState(false)
  const [title, setTitle] = useState('')
  const [duration, setDuration] = useState(0)
  /** Mã lỗi YouTube (2, 5, 100, 101, 150...) hoặc 'stuck' khi trình phát không chạy được (vd. YouTube bắt "xác nhận không phải robot"). */
  const [problem, setProblem] = useState<number | 'stuck' | null>(null)
  const playTimer = useRef<number | undefined>(undefined)

  /** Gọi sau mỗi lần ra lệnh phát: nếu 8 giây sau vẫn không chạy thì báo 'stuck'. */
  const expectPlay = () => {
    window.clearTimeout(playTimer.current)
    playTimer.current = window.setTimeout(() => {
      const st = playerRef.current?.getPlayerState?.()
      if (st !== 1 && st !== 2 && st !== 0) setProblem((p) => p ?? 'stuck')
    }, 8000)
  }

  useEffect(() => {
    let cancelled = false
    setReady(false)
    setProblem(null)
    // Trình phát không sẵn sàng sau 15 giây: nhiều khả năng bị YouTube chặn.
    const readyTimer = window.setTimeout(() => !cancelled && setProblem((p) => p ?? 'stuck'), 15000)
    loadApi().then(() => {
      if (cancelled || !hostRef.current || !window.YT) return
      const mount = document.createElement('div')
      hostRef.current.replaceChildren(mount)
      playerRef.current = new window.YT.Player(mount, {
        videoId,
        width: '100%',
        height: '100%',
        host: 'https://www.youtube-nocookie.com',
        playerVars: { rel: 0, modestbranding: 1, playsinline: 1, cc_load_policy: 0 },
        events: {
          onReady: () => {
            if (cancelled) return
            window.clearTimeout(readyTimer)
            setReady(true)
            setDuration(playerRef.current?.getDuration() ?? 0)
            setTitle(playerRef.current?.getVideoData?.()?.title ?? '')
          },
          onStateChange: (e: { data: number }) => {
            if (e.data === 1) {
              window.clearTimeout(playTimer.current)
              setProblem(null)
            }
          },
          onError: (e: { data: number }) => {
            if (!cancelled) setProblem(e.data)
          },
        },
      })
    })
    return () => {
      cancelled = true
      window.clearTimeout(readyTimer)
      window.clearTimeout(playTimer.current)
      playerRef.current?.destroy()
      playerRef.current = null
    }
  }, [videoId])

  return { hostRef, player: playerRef, ready, title, duration, problem, expectPlay }
}
