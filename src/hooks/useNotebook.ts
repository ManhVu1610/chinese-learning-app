import { useCallback, useEffect, useState } from 'react'
import type { NotebookFolder, VocabSet, Word } from '../types'

/**
 * Sổ tay từ vựng: các bộ từ do người dùng tạo, xếp trong thư mục.
 * Lưu trong localStorage 'notebook_v1'.
 * Mọi bộ đều nằm trong một thư mục; bộ không chọn thư mục và từ lưu bằng nút ⭐ (khi không chọn bộ)
 * vào thư mục + bộ "Chưa phân loại" (id cố định UNCATEGORIZED).
 */
const KEY = 'notebook_v1'
const CHANGE_EVENT = 'notebook_change'

interface NotebookData {
  folders: NotebookFolder[]
  sets: VocabSet[]
}

const empty: NotebookData = { folders: [], sets: [] }

/** Id cố định của thư mục và bộ "Chưa phân loại". */
export const UNCATEGORIZED = 'uncategorized'
const UNCAT_NAME = 'Chưa phân loại'
const OLD_SAVED_KEY = 'saved_words'

/** Bảo đảm có thư mục (và nếu cần, bộ) "Chưa phân loại". */
function withUncategorized(d: NotebookData, needSet: boolean): NotebookData {
  let next = d
  if (!next.folders.some((f) => f.id === UNCATEGORIZED))
    next = { ...next, folders: [{ id: UNCATEGORIZED, name: UNCAT_NAME, createdAt: 0 }, ...next.folders] }
  if (needSet && !next.sets.some((s) => s.id === UNCATEGORIZED))
    next = { ...next, sets: [{ id: UNCATEGORIZED, name: UNCAT_NAME, folderId: UNCATEGORIZED, words: [], createdAt: 0 }, ...next.sets] }
  return next
}

/**
 * Chuyển dữ liệu cũ: từ trong 'saved_words' (nút ⭐ trước đây) vào bộ "Chưa phân loại",
 * các bộ chưa có thư mục vào thư mục "Chưa phân loại".
 */
function migrate(d: NotebookData): NotebookData {
  let saved: Word[] = []
  try {
    const v = JSON.parse(localStorage.getItem(OLD_SAVED_KEY) ?? '[]')
    if (Array.isArray(v)) saved = v
  } catch {
    /* bỏ qua */
  }
  const loose = d.sets.some((s) => !s.folderId)
  if (!saved.length && !loose) return d
  let next = withUncategorized(d, saved.length > 0)
  next = { ...next, sets: next.sets.map((s) => (s.folderId ? s : { ...s, folderId: UNCATEGORIZED })) }
  if (saved.length) {
    next = {
      ...next,
      sets: next.sets.map((s) => {
        if (s.id !== UNCATEGORIZED) return s
        const have = new Set(s.words.map((w) => w.hanzi))
        return { ...s, words: [...s.words, ...saved.filter((w) => !have.has(w.hanzi) && have.add(w.hanzi))] }
      }),
    }
  }
  localStorage.setItem(KEY, JSON.stringify(next))
  localStorage.removeItem(OLD_SAVED_KEY)
  return next
}

function read(): NotebookData {
  try {
    const parsed = JSON.parse(localStorage.getItem(KEY) ?? 'null')
    if (parsed && Array.isArray(parsed.folders) && Array.isArray(parsed.sets)) return migrate(parsed)
  } catch {
    /* dữ liệu hỏng thì bắt đầu lại */
  }
  return migrate(empty)
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
    (id: string, name: string) => update((d) => ({ ...d, folders: d.folders.map((f) => (f.id === id ? { ...f, name: name.trim() } : f)) })),
    [update],
  )

  /** Xoá thư mục; các bộ bên trong được giữ lại và chuyển vào "Chưa phân loại". */
  const deleteFolder = useCallback(
    (id: string) => {
      if (id === UNCATEGORIZED) return
      update((d) => {
        const moved = d.sets.some((s) => s.folderId === id)
        const base = moved ? withUncategorized(d, false) : d
        return {
          folders: base.folders.filter((f) => f.id !== id),
          sets: base.sets.map((s) => (s.folderId === id ? { ...s, folderId: UNCATEGORIZED } : s)),
        }
      })
    },
    [update],
  )

  const createSet = useCallback(
    (name: string, folderId: string | null, words: Word[] = []): string => {
      const id = newId()
      // Không chọn thư mục: tự vào thư mục "Chưa phân loại".
      update((d) => {
        const base = folderId ? d : withUncategorized(d, false)
        return {
          ...base,
          sets: [...base.sets, { id, name: name.trim(), folderId: folderId ?? UNCATEGORIZED, words, createdAt: Date.now() }],
        }
      })
      return id
    },
    [update],
  )

  const patchSet = useCallback(
    (id: string, patch: Partial<Omit<VocabSet, 'id'>>) =>
      update((d) => {
        // Chuyển bộ ra "không thư mục" nghĩa là vào "Chưa phân loại".
        const fixed = 'folderId' in patch && !patch.folderId ? { ...patch, folderId: UNCATEGORIZED } : patch
        const base = fixed !== patch ? withUncategorized(d, false) : d
        return { ...base, sets: base.sets.map((s) => (s.id === id ? { ...s, ...fixed } : s)) }
      }),
    [update],
  )

  const deleteSet = useCallback((id: string) => update((d) => ({ ...d, sets: d.sets.filter((s) => s.id !== id) })), [update])

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

  /** Tạo bộ "Chưa phân loại" nếu chưa có (vd khi mở trang của bộ này). */
  const ensureUncategorizedSet = useCallback(() => {
    if (!read().sets.some((x) => x.id === UNCATEGORIZED)) update((d) => withUncategorized(d, true))
  }, [update])

  /** Lưu một từ (nút ⭐) vào bộ được chọn, mặc định bộ "Chưa phân loại". */
  const saveWord = useCallback(
    (word: Word, setId: string = UNCATEGORIZED) =>
      update((d) => {
        const base = setId === UNCATEGORIZED ? withUncategorized(d, true) : d
        return {
          ...base,
          sets: base.sets.map((s) =>
            s.id === setId && !s.words.some((w) => w.hanzi === word.hanzi) ? { ...s, words: [...s.words, word] } : s,
          ),
        }
      }),
    [update],
  )

  /** Bỏ một từ khỏi một bộ, hoặc khỏi mọi bộ nếu không chỉ định. */
  const unsaveWord = useCallback(
    (word: Word, setId?: string) =>
      update((d) => ({
        ...d,
        sets: d.sets.map((s) =>
          !setId || s.id === setId ? { ...s, words: s.words.filter((w) => w.id !== word.id && w.hanzi !== word.hanzi) } : s,
        ),
      })),
    [update],
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
    saveWord,
    unsaveWord,
    ensureUncategorizedSet,
  }
}
