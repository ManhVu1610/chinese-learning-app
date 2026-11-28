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

/** Lượt thi đang làm dở (chỉ giữ một lượt). */
export const loadSession = () => read<ExamSession | null>(SESSION_KEY, null)
export const saveSession = (s: ExamSession) => localStorage.setItem(SESSION_KEY, JSON.stringify(s))
export const clearSession = () => localStorage.removeItem(SESSION_KEY)

/** Lịch sử các lượt đã nộp, mới nhất trước. */
export const loadHistory = () => read<ExamRecord[]>(HISTORY_KEY, [])
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

let indexCache: Promise<ExamMeta[]> | null = null
const paperCache = new Map<string, Promise<ExamPaper>>()

export function loadIndex(): Promise<ExamMeta[]> {
  indexCache ??= fetch('/hsk-exams/index.json').then((r) => {
    if (!r.ok) throw new Error(String(r.status))
    return r.json()
  })
  indexCache.catch(() => (indexCache = null))
  return indexCache
}

export function loadPaper(file: string): Promise<ExamPaper> {
  let p = paperCache.get(file)
  if (!p) {
    p = fetch(file).then((r) => {
      if (!r.ok) throw new Error(String(r.status))
      return r.json()
    })
    p.catch(() => paperCache.delete(file))
    paperCache.set(file, p)
  }
  return p
}
