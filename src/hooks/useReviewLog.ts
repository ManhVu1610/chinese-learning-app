import { useCallback, useEffect, useMemo, useState } from 'react'
import type { Rating } from '../types'

/**
 * Nhật ký các lượt ôn flashcard (để tính streak, số lượt theo ngày, thời gian trung bình…).
 * Lưu trong localStorage 'srs_log_v1' của trình duyệt này, giữ tối đa 5.000 lượt gần nhất.
 */
export interface ReviewEntry {
  /** thời điểm đánh giá (ms) */
  t: number
  r: Rating
  /** thời gian nghĩ cho thẻ đó (ms) */
  ms: number
  /** 'g' = thẻ ngữ pháp; không có = thẻ từ vựng */
  k?: 'g'
}

export type ReviewKind = 'vocab' | 'grammar'

const KEY = 'srs_log_v1'
const EVENT = 'srs_log_change'
const MAX = 5000
const DAY = 86_400_000

const read = (): ReviewEntry[] => {
  try {
    const v = JSON.parse(localStorage.getItem(KEY) ?? '[]')
    return Array.isArray(v) ? v : []
  } catch {
    return []
  }
}

/** Mốc 0h của ngày chứa `t` theo giờ máy. */
const startOfDay = (t: number) => {
  const d = new Date(t)
  d.setHours(0, 0, 0, 0)
  return d.getTime()
}

export function useReviewLog(kind: ReviewKind = 'vocab') {
  const [all, setLog] = useState<ReviewEntry[]>(read)
  const log = useMemo(() => all.filter((e) => (kind === 'grammar' ? e.k === 'g' : e.k !== 'g')), [all, kind])

  useEffect(() => {
    const sync = () => setLog(read())
    const onStorage = (e: StorageEvent) => e.key === KEY && sync()
    window.addEventListener(EVENT, sync)
    window.addEventListener('storage', onStorage)
    return () => {
      window.removeEventListener(EVENT, sync)
      window.removeEventListener('storage', onStorage)
    }
  }, [])

  const record = useCallback((r: Rating, ms: number, k: ReviewKind = 'vocab') => {
    const entry: ReviewEntry = { t: Date.now(), r, ms: Math.min(ms, 10 * 60_000), ...(k === 'grammar' ? { k: 'g' as const } : {}) }
    const next = [...read(), entry].slice(-MAX)
    localStorage.setItem(KEY, JSON.stringify(next))
    setLog(next)
    window.dispatchEvent(new Event(EVENT))
  }, [])

  const summary = useMemo(() => {
    const now = Date.now()
    const today = startOfDay(now)
    const monday = (() => {
      const d = new Date(today)
      d.setDate(d.getDate() - ((d.getDay() + 6) % 7))
      return d.getTime()
    })()
    const month = (() => {
      const d = new Date(today)
      d.setDate(1)
      return d.getTime()
    })()

    const perDay = new Map<number, number>()
    for (const e of log) perDay.set(startOfDay(e.t), (perDay.get(startOfDay(e.t)) ?? 0) + 1)

    // Streak: số ngày liên tiếp có ôn, tính tới hôm nay (hoặc hôm qua nếu hôm nay chưa ôn).
    let streak = 0
    let day = perDay.has(today) ? today : today - DAY
    while (perDay.has(day)) {
      streak++
      day = startOfDay(day - DAY / 2)
    }

    const last7 = Array.from({ length: 7 }, (_, i) => {
      const d = startOfDay(today - (6 - i) * DAY + DAY / 2)
      return { day: d, count: perDay.get(d) ?? 0 }
    })

    const first = log.length ? startOfDay(log[0].t) : today
    const activeSpan = Math.max(1, Math.round((today - first) / DAY) + 1)
    const ratings: Record<Rating, number> = { again: 0, hard: 0, good: 0, easy: 0 }
    for (const e of log) ratings[e.r]++

    return {
      total: log.length,
      today: perDay.get(today) ?? 0,
      week: log.filter((e) => e.t >= monday).length,
      month: log.filter((e) => e.t >= month).length,
      streak,
      perDayAvg: log.length / activeSpan,
      avgSeconds: log.length ? log.reduce((s, e) => s + e.ms, 0) / log.length / 1000 : 0,
      last7,
      ratings,
    }
  }, [log])

  return { log, record, summary }
}
