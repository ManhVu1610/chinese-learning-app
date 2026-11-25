import { useCallback, useEffect, useState } from 'react'
import type { NotebookFolder, VocabSet, Word } from '../types'

/**
 * Sổ tay từ vựng: các bộ từ do người dùng tạo, xếp trong thư mục.
 * Lưu trong localStorage 'notebook_v1'. Danh sách "Từ đã lưu" (nút ⭐) vẫn ở 'saved_words'.
 */
const KEY = 'notebook_v1'
const CHANGE_EVENT = 'notebook_change'

interface NotebookData {
  folders: NotebookFolder[]
  sets: VocabSet[]
}

const empty: NotebookData = { folders: [], sets: [] }

function read(): NotebookData {
  try {
    const parsed = JSON.parse(localStorage.getItem(KEY) ?? 'null')
    if (parsed && Array.isArray(parsed.folders) && Array.isArray(parsed.sets)) return parsed
  } catch {
    /* dữ liệu hỏng thì bắt đầu lại */
  }
  return empty
}

const newId = () => `${Date.now().toString(36)}${Math.random().toString(36).slice(2, 7)}`

export function useNotebook() {
  const [data, setData] = useState<NotebookData>(read)

  useEffect(() => {
    const sync = () => setData(read())
    const onStorage = (e: StorageEvent) => e.key === KEY && sync()
    window.addEventListener('storage', onStorage)
    window.addEventListener(CHANGE_EVENT, sync)
    return () => {
      window.removeEventListener('storage', onStorage)
      window.removeEventListener(CHANGE_EVENT, sync)
    }
  }, [])

  /** Đọc bản mới nhất, sửa, ghi lại và báo cho các component khác. */
  const update = useCallback((fn: (d: NotebookData) => NotebookData) => {
    const next = fn(read())
    localStorage.setItem(KEY, JSON.stringify(next))
    setData(next)
    window.dispatchEvent(new Event(CHANGE_EVENT))
  }, [])

  const createFolder = useCallback(
    (name: string): string => {
      const id = newId()
      update((d) => ({ ...d, folders: [...d.folders, { id, name: name.trim(), createdAt: Date.now() }] }))
      return id
    },
    [update],
  )

  const renameFolder = useCallback(
    (id: string, name: string) =>
      update((d) => ({ ...d, folders: d.folders.map((f) => (f.id === id ? { ...f, name: name.trim() } : f)) })),
    [update],
  )

  /** Xoá thư mục; các bộ bên trong được giữ lại và chuyển ra ngoài. */
  const deleteFolder = useCallback(
    (id: string) =>
      update((d) => ({
        folders: d.folders.filter((f) => f.id !== id),
        sets: d.sets.map((s) => (s.folderId === id ? { ...s, folderId: null } : s)),
      })),
    [update],
  )

  const createSet = useCallback(
    (name: string, folderId: string | null, words: Word[] = []): string => {
      const id = newId()
      update((d) => ({ ...d, sets: [...d.sets, { id, name: name.trim(), folderId, words, createdAt: Date.now() }] }))
      return id
    },
    [update],
  )

  const patchSet = useCallback(
    (id: string, patch: Partial<Omit<VocabSet, 'id'>>) =>
      update((d) => ({ ...d, sets: d.sets.map((s) => (s.id === id ? { ...s, ...patch } : s)) })),
    [update],
  )

  const deleteSet = useCallback(
    (id: string) => update((d) => ({ ...d, sets: d.sets.filter((s) => s.id !== id) })),
    [update],
  )

  /** Thêm từ vào bộ (bỏ qua từ trùng chữ Hán), trả về số từ được thêm. */
  const addWordsToSet = useCallback(
    (id: string, words: Word[]): number => {
      const set = read().sets.find((s) => s.id === id)
      if (!set) return 0
      const have = new Set(set.words.map((w) => w.hanzi))
      const fresh = words.filter((w) => !have.has(w.hanzi) && have.add(w.hanzi))
      if (fresh.length) patchSet(id, { words: [...set.words, ...fresh] })
      return fresh.length
    },
    [patchSet],
  )

  const removeWordFromSet = useCallback(
    (id: string, wordId: string) => {
      const set = read().sets.find((s) => s.id === id)
      if (set) patchSet(id, { words: set.words.filter((w) => w.id !== wordId) })
    },
    [patchSet],
  )

  return {
    folders: data.folders,
    sets: data.sets,
    createFolder,
    renameFolder,
    deleteFolder,
    createSet,
    patchSet,
    deleteSet,
    addWordsToSet,
    removeWordFromSet,
  }
}
