import { useCallback, useEffect, useState } from 'react'

/** Các truyện đã đánh dấu "Đã đọc", lưu trong localStorage 'stories_read' (đồng bộ giữa các tab). */
const KEY = 'stories_read'
const EVENT = 'stories_read_change'

const read = (): Set<string> => {
  try {
    const v = JSON.parse(localStorage.getItem(KEY) ?? '[]')
    return new Set(Array.isArray(v) ? v : [])
  } catch {
    return new Set()
  }
}

export function useStoryProgress() {
  const [done, setDone] = useState<Set<string>>(read)

  useEffect(() => {
    const sync = () => setDone(read())
    const onStorage = (e: StorageEvent) => e.key === KEY && sync()
    window.addEventListener(EVENT, sync)
    window.addEventListener('storage', onStorage)
    return () => {
      window.removeEventListener(EVENT, sync)
      window.removeEventListener('storage', onStorage)
    }
  }, [])

  const setRead = useCallback((id: string, value: boolean) => {
    const next = read()
    if (value) next.add(id)
    else next.delete(id)
    localStorage.setItem(KEY, JSON.stringify([...next]))
    setDone(next)
    window.dispatchEvent(new Event(EVENT))
  }, [])

  return { done, setRead }
}
