import { useCallback, useEffect, useState } from 'react'

/** Các bài ngữ pháp đã đánh dấu "Đã học", lưu trong localStorage 'grammar_learned' (đồng bộ giữa các tab). */
const KEY = 'grammar_learned'
const EVENT = 'grammar_learned_change'

const read = (): Set<string> => {
  try {
    const v = JSON.parse(localStorage.getItem(KEY) ?? '[]')
    return new Set(Array.isArray(v) ? v : [])
  } catch {
    return new Set()
  }
}

export function useGrammarProgress() {
  const [learned, setLearned] = useState<Set<string>>(read)

  useEffect(() => {
    const sync = () => setLearned(read())
    const onStorage = (e: StorageEvent) => e.key === KEY && sync()
    window.addEventListener(EVENT, sync)
    window.addEventListener('storage', onStorage)
    return () => {
      window.removeEventListener(EVENT, sync)
      window.removeEventListener('storage', onStorage)
    }
  }, [])

  const setLearnedFor = useCallback((id: string, value: boolean) => {
    const next = read()
    if (value) next.add(id)
    else next.delete(id)
    localStorage.setItem(KEY, JSON.stringify([...next]))
    setLearned(next)
    window.dispatchEvent(new Event(EVENT))
  }, [])

  return { learned, setLearnedFor }
}
