import { useCallback, useMemo } from 'react'
import type { Word } from '../types'
import { useNotebook } from './useNotebook'

/**
 * Các từ đã lưu = mọi từ nằm trong các bộ của Sổ tay (không còn danh sách "Từ đã lưu" riêng).
 * Lưu một từ bằng nút ⭐ mà không chọn bộ thì từ vào bộ "Chưa phân loại".
 */
export function useSavedWords() {
  const nb = useNotebook()

  const saved = useMemo(() => {
    const seen = new Set<string>()
    const out: Word[] = []
    for (const s of nb.sets)
      for (const w of s.words)
        if (!seen.has(w.hanzi)) {
          seen.add(w.hanzi)
          out.push(w)
        }
    return out
  }, [nb.sets])

  const savedKeys = useMemo(() => new Set(saved.flatMap((w) => [w.id, w.hanzi])), [saved])
  const isSaved = useCallback((word: Pick<Word, 'id' | 'hanzi'>) => savedKeys.has(word.id) || savedKeys.has(word.hanzi), [savedKeys])

  /** Các bộ đang chứa từ này. */
  const setsWith = useCallback(
    (word: Pick<Word, 'id' | 'hanzi'>) => nb.sets.filter((s) => s.words.some((w) => w.id === word.id || w.hanzi === word.hanzi)),
    [nb.sets],
  )

  return { saved, isSaved, setsWith, saveWord: nb.saveWord, unsaveWord: nb.unsaveWord }
}
