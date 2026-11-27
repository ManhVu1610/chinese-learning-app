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

  useEffect(() => {
    let cancelled = false
    setReady(false)
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
            setReady(true)
            setDuration(playerRef.current?.getDuration() ?? 0)
            setTitle(playerRef.current?.getVideoData?.()?.title ?? '')
          },
        },
      })
    })
    return () => {
      cancelled = true
      playerRef.current?.destroy()
      playerRef.current = null
    }
  }, [videoId])

  return { hostRef, player: playerRef, ready, title, duration }
}
