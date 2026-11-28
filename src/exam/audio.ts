import { getMandarinVoice } from '../hooks/useSpeech'
import type { ExamQuestion } from './types'

export interface Playback {
  stop: () => void
  /** Xong khi phát hết (hoặc bị dừng); false nếu không phát được */
  done: Promise<boolean>
}

const ttsSupported = typeof window !== 'undefined' && 'speechSynthesis' in window

/** Có gì để nghe cho câu này không (tệp âm thanh hoặc lời thoại để đọc bằng giọng máy). */
export const hasListening = (q: ExamQuestion) => !!q.audio || (!!q.transcript && ttsSupported)

/** Lời đọc của một câu: lời thoại, kèm câu hỏi "问：…" ở phần 2, 3 như đề thật. */
function script(q: ExamQuestion) {
  const lines: { text: string; who?: 'm' | 'f' }[] = []
  for (const raw of (q.transcript ?? '').split('\n')) {
    const m = raw.trim().match(/^(男|女)\s*[:：]\s*(.*)$/)
    if (m) lines.push({ text: m[2], who: m[1] === '男' ? 'm' : 'f' })
    else if (raw.trim()) lines.push({ text: raw.trim() })
  }
  if (q.type === 'listening_choice' && q.question) lines.push({ text: `问：${q.question}` })
  // Chrome cắt câu đọc quá dài: chia nhỏ theo dấu câu.
  return lines.flatMap((l) => (l.text.match(/[^。！？!?；]+[。！？!?；]?/g) ?? [l.text]).map((text) => ({ ...l, text })))
}

function speakAll(q: ExamQuestion, rate: number): Playback {
  let stopped = false
  const parts = script(q)
  const done = new Promise<boolean>((resolve) => {
    if (!ttsSupported || !parts.length) return resolve(false)
    speechSynthesis.cancel()
    const voice = getMandarinVoice()
    let i = 0
    const next = () => {
      if (stopped) return resolve(true)
      if (i >= parts.length) return resolve(true)
      const p = parts[i++]
      const u = new SpeechSynthesisUtterance(p.text)
      if (voice) {
        u.voice = voice
        u.lang = voice.lang
      } else u.lang = 'zh-CN'
      u.rate = rate
      // Chỉ có một giọng: đổi cao độ để phân biệt người nói nam / nữ.
      u.pitch = p.who === 'm' ? 0.7 : p.who === 'f' ? 1.3 : 1
      // Một số máy không báo xong (không có giọng, trình duyệt treo): tự qua câu sau khi quá lâu.
      let moved = false
      const go = (delay: number) => {
        if (moved) return
        moved = true
        clearTimeout(guard)
        setTimeout(next, delay)
      }
      const guard = setTimeout(() => go(0), 4000 + (p.text.length * 450) / rate)
      u.onend = () => go(p.who ? 350 : 150)
      u.onerror = () => go(50)
      speechSynthesis.speak(u)
    }
    next()
  })
  return {
    stop: () => {
      stopped = true
      if (ttsSupported) speechSynthesis.cancel()
    },
    done,
  }
}

/** Phát phần nghe của một câu: tệp âm thanh nếu có, không thì đọc lời thoại bằng giọng máy. */
export function playQuestion(q: ExamQuestion, rate = 0.9): Playback {
  if (!q.audio) return speakAll(q, rate)
  const el = new Audio(q.audio)
  el.preload = 'auto'
  let fallback: Playback | null = null
  let stopped = false
  const done = new Promise<boolean>((resolve) => {
    const fail = () => {
      if (stopped) return resolve(true)
      // Tệp lỗi: đọc lời thoại nếu có.
      if (q.transcript) {
        fallback = speakAll(q, rate)
        fallback.done.then(resolve)
      } else resolve(false)
    }
    el.onended = () => resolve(true)
    el.onerror = fail
    el.play().catch(fail)
  })
  return {
    stop: () => {
      stopped = true
      el.pause()
      fallback?.stop()
    },
    done,
  }
}
