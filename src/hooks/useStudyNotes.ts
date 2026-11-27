import { useCallback, useEffect, useState } from 'react'

/** Một ghi chú học tập. Lưu trong localStorage 'study_notes_v1' (chưa đồng bộ cloud). */
export interface StudyNote {
  id: string
  title: string
  body: string
  pinned: boolean
  createdAt: number
  updatedAt: number
}

const KEY = 'study_notes_v1'
const EVENT = 'study_notes_change'

const read = (): StudyNote[] => {
  try {
    const v = JSON.parse(localStorage.getItem(KEY) ?? '[]')
    return Array.isArray(v) ? v : []
  } catch {
    return []
  }
}

export function useStudyNotes() {
  const [notes, setNotes] = useState<StudyNote[]>(read)

  // Đồng bộ giữa các tab và các trang đang mở.
  useEffect(() => {
    const sync = () => setNotes(read())
    const onStorage = (e: StorageEvent) => e.key === KEY && sync()
    window.addEventListener(EVENT, sync)
    window.addEventListener('storage', onStorage)
    return () => {
      window.removeEventListener(EVENT, sync)
      window.removeEventListener('storage', onStorage)
    }
  }, [])

  const save = useCallback((next: StudyNote[]) => {
    localStorage.setItem(KEY, JSON.stringify(next))
    setNotes(next)
    window.dispatchEvent(new Event(EVENT))
  }, [])

  const create = useCallback(() => {
    const now = Date.now()
    const note: StudyNote = {
      id: `note-${now.toString(36)}${Math.random().toString(36).slice(2, 6)}`,
      title: '',
      body: '',
      pinned: false,
      createdAt: now,
      updatedAt: now,
    }
    save([note, ...read()])
    return note.id
  }, [save])

  const update = useCallback(
    (id: string, patch: Partial<Pick<StudyNote, 'title' | 'body' | 'pinned'>>) =>
      save(read().map((n) => (n.id === id ? { ...n, ...patch, updatedAt: patch.pinned === undefined ? Date.now() : n.updatedAt } : n))),
    [save],
  )

  const remove = useCallback((id: string) => save(read().filter((n) => n.id !== id)), [save])

  return { notes, create, update, remove }
}
