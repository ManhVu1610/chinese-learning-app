import { useCallback, useEffect, useState } from 'react'

/** Một câu (đoạn) trong video: từ giây start đến giây end. */
export interface ShadowSegment {
  id: string
  start: number
  end: number
  text: string
  /** Nghĩa tiếng Việt (tuỳ chọn, người dùng tự nhập) */
  meaning?: string
  starred?: boolean
  /** Lần tự chấm gần nhất: 0 chưa đúng, 1 tạm được, 2 chuẩn */
  grade?: 0 | 1 | 2
}

/** Một bài shadowing = một video YouTube + các câu đã chia. Lưu trong localStorage 'shadowing_v1'. */
export interface ShadowLesson {
  id: string
  videoId: string
  title: string
  segments: ShadowSegment[]
  createdAt: number
  updatedAt: number
  /** Bài nhúng sẵn trong app (không xoá được, chỉ đặt lại) */
  preset?: boolean
  channel?: string
  /** Tên playlist (nhóm bài nhúng sẵn) */
  playlist?: string
  /** Phiên bản file bài đã nạp (so với index.json để biết khi nào cần nạp lại) */
  rev?: number
}

const KEY = 'shadowing_v1'
const EVENT = 'shadowing_change'

/**
 * Bài nhúng sẵn: public/shadowing/index.json (danh sách) + public/shadowing/<videoId>.json (các câu).
 * Hai file này do scripts/shadowing/make-lesson.mjs tạo tự động từ link YouTube.
 */
export interface PresetInfo {
  videoId: string
  title: string
  channel?: string
  /** Số câu có sẵn trong file bài (0 = chưa có phụ đề) */
  count: number
  playlist?: string
  /** Đổi mỗi khi file bài được tạo lại → app tự nạp bản mới */
  rev?: number
}
let presetIndex: PresetInfo[] = []
let presetPromise: Promise<void> | null = null
const loadPresets = () =>
  (presetPromise ??= fetch('/shadowing/index.json')
    .then((r) => (r.ok ? r.json() : []))
    .then((list) => {
      presetIndex = Array.isArray(list) ? list : []
      window.dispatchEvent(new Event(EVENT))
    })
    .catch(() => {}))

/** Tải các câu của một bài nhúng sẵn. */
export async function fetchPresetSegments(
  videoId: string,
): Promise<{ title?: string; channel?: string; segments: ShadowSegment[] } | null> {
  try {
    const r = await fetch(`/shadowing/${videoId}.json`)
    if (!r.ok) return null
    const data = await r.json()
    const segments: ShadowSegment[] = (data.segments ?? []).map((x: { start: number; end: number; text: string; meaning?: string }) => ({
      id: newId(),
      start: x.start,
      end: x.end,
      text: x.text,
      meaning: x.meaning || undefined,
    }))
    return { title: data.title, channel: data.channel, segments }
  } catch {
    return null
  }
}
export const presetInfo = (videoId: string) => presetIndex.find((p) => p.videoId === videoId)

const newId = () => Math.random().toString(36).slice(2, 10)

/** Lấy mã video từ link YouTube (watch?v=, youtu.be/, shorts/, embed/) hoặc chính mã 11 ký tự. */
export function parseYouTubeId(input: string): string | null {
  const s = input.trim()
  if (/^[\w-]{11}$/.test(s)) return s
  try {
    const u = new URL(s)
    const host = u.hostname.replace(/^www\.|^m\./, '')
    if (host === 'youtu.be') return u.pathname.slice(1, 12) || null
    if (host.endsWith('youtube.com') || host.endsWith('youtube-nocookie.com')) {
      const v = u.searchParams.get('v')
      if (v && /^[\w-]{11}$/.test(v)) return v
      const m = u.pathname.match(/\/(?:shorts|embed|live|v)\/([\w-]{11})/)
      if (m) return m[1]
    }
  } catch {
    /* không phải URL */
  }
  return null
}

const read = (): ShadowLesson[] => {
  let list: ShadowLesson[] = []
  try {
    const v = JSON.parse(localStorage.getItem(KEY) ?? '[]')
    if (Array.isArray(v)) list = v
  } catch {
    /* rỗng */
  }
  // Luôn có các bài nhúng sẵn (đứng đầu).
  const presets = presetIndex.map((p): ShadowLesson => {
    const stored = list.find((l) => l.preset && l.videoId === p.videoId)
    // Tên, kênh, playlist theo index.json (đặt tên lại ở index là app đổi theo).
    if (stored) return { ...stored, title: p.title, channel: p.channel, playlist: p.playlist }
    return {
      id: `preset-${p.videoId}`,
      videoId: p.videoId,
      title: p.title,
      channel: p.channel,
      playlist: p.playlist,
      segments: [],
      createdAt: 0,
      updatedAt: 0,
      preset: true,
    }
  })
  return [...presets, ...list.filter((l) => !l.preset)]
}

export function useShadowing() {
  const [lessons, setLessons] = useState<ShadowLesson[]>(read)
  const [presetsLoaded, setPresetsLoaded] = useState(presetIndex.length > 0)
  useEffect(() => {
    loadPresets().then(() => setPresetsLoaded(true))
  }, [])

  useEffect(() => {
    const sync = () => setLessons(read())
    const onStorage = (e: StorageEvent) => e.key === KEY && sync()
    window.addEventListener(EVENT, sync)
    window.addEventListener('storage', onStorage)
    return () => {
      window.removeEventListener(EVENT, sync)
      window.removeEventListener('storage', onStorage)
    }
  }, [])

  const save = useCallback((next: ShadowLesson[]) => {
    localStorage.setItem(KEY, JSON.stringify(next))
    setLessons(next)
    window.dispatchEvent(new Event(EVENT))
  }, [])

  /** Tạo bài từ link; nếu video đã có bài thì trả về bài cũ. */
  const create = (videoId: string, title: string) => {
    const cur = read()
    const found = cur.find((l) => l.videoId === videoId)
    if (found) return found.id
    const id = newId()
    save([...cur, { id, videoId, title, segments: [], createdAt: Date.now(), updatedAt: Date.now() }])
    return id
  }

  const patch = (id: string, p: Partial<ShadowLesson>) => save(read().map((l) => (l.id === id ? { ...l, ...p, updatedAt: Date.now() } : l)))

  const patchSegment = (id: string, segId: string, p: Partial<ShadowSegment>) =>
    save(read().map((l) => (l.id === id ? { ...l, segments: l.segments.map((s) => (s.id === segId ? { ...s, ...p } : s)) } : l)))

  const remove = (id: string) => save(read().filter((l) => l.id !== id))

  return { lessons, presetsLoaded, create, patch, patchSegment, remove }
}

// ---- Đọc bản chép lời ----

const toSeconds = (t: string) => {
  const parts = t.replace(',', '.').split(':').map(Number)
  return parts.reduce((acc, n) => acc * 60 + n, 0)
}
const TIME = /^(\d{1,2}:)?\d{1,2}:\d{2}([.,]\d{1,3})?$/

/**
 * Tách bản chép lời thành từng câu. Nhận:
 * - Bản chép lời chép từ YouTube ("0:05" một dòng, lời ở dòng sau; hoặc "0:05 lời" cùng dòng)
 * - Phụ đề SRT / VTT ("00:00:05,000 --> 00:00:07,500")
 * Câu không có giờ kết thúc thì kết thúc ở đầu câu sau.
 */
export function parseTranscript(raw: string, videoEnd?: number): ShadowSegment[] {
  const lines = raw
    .replace(/\r/g, '')
    .split('\n')
    .map((l) => l.trim())
  const out: { start: number; end?: number; text: string }[] = []
  let cur: { start: number; end?: number; text: string } | null = null
  const push = () => {
    if (cur && cur.text.trim()) out.push({ ...cur, text: cur.text.trim() })
    cur = null
  }
  for (const line of lines) {
    if (!line || line === 'WEBVTT' || /^\d+$/.test(line) || /^(NOTE|STYLE|Kind:|Language:)/.test(line)) {
      if (!line) {
        // dòng trống trong SRT/VTT kết thúc một câu
        if (cur?.end !== undefined) push()
      }
      continue
    }
    const range = line.match(/^([\d:.,]+)\s*-->\s*([\d:.,]+)/)
    if (range) {
      push()
      cur = { start: toSeconds(range[1]), end: toSeconds(range[2]), text: '' }
      continue
    }
    const inline = line.match(/^((?:\d{1,2}:)?\d{1,2}:\d{2})\s+(.+)$/)
    if (inline) {
      push()
      cur = { start: toSeconds(inline[1]), text: inline[2] }
      continue
    }
    // Nhãn đọc màn hình YouTube chép kèm ("1 phút, 5 giây", "2 seconds", "5秒"): bỏ qua.
    if (/^(\d+\s*(giờ|phút|giây|hours?|minutes?|seconds?|小时|分钟|秒)[,\s]*)+$/i.test(line)) continue
    if (TIME.test(line)) {
      push()
      cur = { start: toSeconds(line), text: '' }
      continue
    }
    if (cur) {
      const add = line.replace(/<[^>]+>/g, '')
      // Lời tiếng Trung xuống dòng thì nối liền, chữ Latin thì cách nhau một dấu cách.
      const joint = cur.text && !(/\p{Script=Han}|[，。！？、]$/u.test(cur.text.slice(-1)) && /^\p{Script=Han}/u.test(add)) ? ' ' : ''
      cur.text += joint + add
    }
  }
  push()
  out.sort((a, b) => a.start - b.start)
  return out.map((s, i) => ({
    id: newId(),
    start: s.start,
    end: s.end ?? out[i + 1]?.start ?? videoEnd ?? s.start + 5,
    text: s.text,
  }))
}

export const newSegmentId = newId

/** 75.3 → "1:15" */
export const formatTime = (sec: number) => {
  const s = Math.max(0, Math.floor(sec))
  const h = Math.floor(s / 3600)
  const m = Math.floor((s % 3600) / 60)
  const r = String(s % 60).padStart(2, '0')
  return h ? `${h}:${String(m).padStart(2, '0')}:${r}` : `${m}:${r}`
}
