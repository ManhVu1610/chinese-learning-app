import { useEffect, useState } from 'react'

/** Dữ liệu nét bút kiểu hanzi-writer: đường viền từng nét (toạ độ 1024, trục y hướng lên, gốc ở y = 900). */
export interface StrokeData {
  strokes: string[]
  medians: number[][][]
  radStrokes?: number[]
}

const cache = new Map<string, Promise<StrokeData | null>>()

/**
 * Dữ liệu nét bút: ưu tiên tệp nhập từ Learn (public/strokes), không có thì lấy từ hanzi-writer-data trên CDN.
 * Không tìm thấy thì trả về null (ném lỗi nếu gọi qua loadCharData).
 */
export function fetchStrokes(char: string): Promise<StrokeData | null> {
  let p = cache.get(char)
  if (!p) {
    p = (async () => {
      try {
        const local = await fetch(`/strokes/${char.codePointAt(0)!.toString(16)}.json`)
        if (local.ok && local.headers.get('content-type')?.includes('json')) return (await local.json()) as StrokeData
        const cdn = await fetch(`https://cdn.jsdelivr.net/npm/hanzi-writer-data@2.0/${encodeURIComponent(char)}.json`)
        return cdn.ok ? ((await cdn.json()) as StrokeData) : null
      } catch {
        return null
      }
    })()
    cache.set(char, p)
  }
  return p
}

export async function loadCharData(char: string): Promise<StrokeData> {
  const d = await fetchStrokes(char)
  if (!d) throw new Error('not found')
  return d
}

/** Nạp dữ liệu nét bút cho nhiều chữ; trả về bảng chữ → dữ liệu (null nếu không có). */
export function useStrokes(chars: string[]): Record<string, StrokeData | null> {
  const [map, setMap] = useState<Record<string, StrokeData | null>>({})
  const key = [...new Set(chars)].join('')
  useEffect(() => {
    let alive = true
    for (const c of new Set(key)) {
      fetchStrokes(c).then((d) => alive && setMap((m) => (c in m ? m : { ...m, [c]: d })))
    }
    return () => {
      alive = false
    }
  }, [key])
  return map
}
