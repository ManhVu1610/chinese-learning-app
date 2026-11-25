import { useEffect, useState } from 'react'
import { loadDictionary } from '../data/dictionary'
import type { Word } from '../types'

/** Toàn bộ từ vựng HSK 1–6. `loading` = true cho tới khi tải xong (lần đầu). */
export function useDictionary() {
  const [words, setWords] = useState<Word[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    let alive = true
    loadDictionary().then((all) => {
      if (!alive) return
      setWords(all)
      setLoading(false)
    })
    return () => {
      alive = false
    }
  }, [])

  return { words, loading }
}
