import type { ExamMeta, ExamPaper, ExamRecord, ExamSession } from './types'

const SESSION_KEY = 'hsk_exam_session'
const HISTORY_KEY = 'hsk_exam_history'
const HISTORY_MAX = 60

function read<T>(key: string, fallback: T): T {
  try {
    const raw = localStorage.getItem(key)
    return raw ? (JSON.parse(raw) as T) : fallback
  } catch {
    return fallback
  }
}

/** Bản ghi của bộ đề cũ (đề HSK 4 dạng chữ) không còn mở được: bỏ qua. */
const current = (file: string | undefined) => !!file && file.endsWith('/paper.json')

/** Lượt thi đang làm dở (chỉ giữ một lượt). */
export const loadSession = () => {
  const s = read<ExamSession | null>(SESSION_KEY, null)
  return s && current(s.file) ? s : null
}
export const saveSession = (s: ExamSession) => localStorage.setItem(SESSION_KEY, JSON.stringify(s))
export const clearSession = () => localStorage.removeItem(SESSION_KEY)

/** Lịch sử các lượt đã nộp, mới nhất trước. */
export const loadHistory = () => read<ExamRecord[]>(HISTORY_KEY, []).filter((r) => current(r.file))
export function addRecord(r: ExamRecord) {
  const list = [r, ...loadHistory().filter((x) => x.id !== r.id)].slice(0, HISTORY_MAX)
  localStorage.setItem(HISTORY_KEY, JSON.stringify(list))
}
export function updateRecord(r: ExamRecord) {
  localStorage.setItem(HISTORY_KEY, JSON.stringify(loadHistory().map((x) => (x.id === r.id ? r : x))))
}
export function removeRecord(id: string) {
  localStorage.setItem(HISTORY_KEY, JSON.stringify(loadHistory().filter((x) => x.id !== id)))
}

/** Nơi lưu bộ đề khi chạy bản build (trang thật). */
const HSK_DATA_HOST = ''

/**
 * Bộ đề (ảnh trang đề + tệp nghe, ~ vài trăm MB) không nằm trong repo app mà ở một nơi lưu riêng.
 * VITE_HSK_DATA_URL là địa chỉ nơi đó (vd https://hsk-data.pages.dev); để trống thì đọc /hsk-exams của chính app
 * (thư mục public/hsk-exams trên máy, không đưa lên git).
 */
const DATA_URL = ((import.meta.env.VITE_HSK_DATA_URL as string | undefined) ?? (import.meta.env.PROD ? HSK_DATA_HOST : '')).replace(/\/+$/, '')
const dataUrl = (path: string) => (path && path.startsWith('/') ? DATA_URL + path : path)

let indexCache: Promise<ExamMeta[]> | null = null
const paperCache = new Map<string, Promise<ExamPaper>>()

export function loadIndex(): Promise<ExamMeta[]> {
  indexCache ??= fetch(dataUrl('/hsk-exams/index.json')).then((r) => {
    if (!r.ok) throw new Error(String(r.status))
    return r.json()
  })
  indexCache.catch(() => (indexCache = null))
  return indexCache
}

export function loadPaper(file: string): Promise<ExamPaper> {
  let p = paperCache.get(file)
  if (!p) {
    p = fetch(dataUrl(file))
      .then((r) => {
        if (!r.ok) throw new Error(String(r.status))
        return r.json() as Promise<ExamPaper>
      })
      .then((x) => ({ ...x, base: dataUrl(x.base), audio: x.audio ? dataUrl(x.audio) : null }))
    p.catch(() => paperCache.delete(file))
    paperCache.set(file, p)
  }
  return p
}
