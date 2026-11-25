import { useCallback, useEffect, useState } from 'react'
import type { Word } from '../types'

const KEY = 'saved_words'
const CHANGE_EVENT = 'saved_words_change'

function read(): Word[] {
  try {
    const parsed = JSON.parse(localStorage.getItem(KEY) ?? '[]')
    return Array.isArray(parsed) ? parsed : []
  } catch {
    return []
  }
}

/** Sổ tay từ vựng, lưu trong localStorage 'saved_words' và đồng bộ giữa các tab. */
export function useSavedWords() {
  const [saved, setSaved] = useState<Word[]>(read)

  useEffect(() => {
    const onStorage = (e: StorageEvent) => {
      if (e.key === KEY) setSaved(read())
    }
    const onLocal = () => setSaved(read())
    window.addEventListener('storage', onStorage)
    window.addEventListener(CHANGE_EVENT, onLocal)
    return () => {
      window.removeEventListener('storage', onStorage)
      window.removeEventListener(CHANGE_EVENT, onLocal)
    }
  }, [])

  const write = useCallback((next: Word[]) => {
    localStorage.setItem(KEY, JSON.stringify(next))
    setSaved(next)
    // Báo cho các component khác trong cùng tab (sự kiện 'storage' chỉ tới tab khác).
    window.dispatchEvent(new Event(CHANGE_EVENT))
  }, [])

  const isSaved = useCallback((id: string) => saved.some((w) => w.id === id), [saved])

  const toggle = useCallback(
    (word: Word) => {
      const current = read()
      write(current.some((w) => w.id === word.id) ? current.filter((w) => w.id !== word.id) : [word, ...current])
    },
    [write],
  )

  const remove = useCallback((id: string) => write(read().filter((w) => w.id !== id)), [write])

  /** Ghi đè toàn bộ danh sách (dùng khi lưu từ bảng sửa bộ). */
  const replaceAll = useCallback((words: Word[]) => write(words), [write])

  return { saved, isSaved, toggle, remove, replaceAll }
}
