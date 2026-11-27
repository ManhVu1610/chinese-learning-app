import { onSnapshot } from 'firebase/firestore'
import { useCallback, useEffect, useRef, useState } from 'react'
import { useAuth } from '../contexts/AuthContext'
import { cardsCollection, deleteCloudCard, loadLocalCards, saveCloudCard, saveCloudCards, saveLocalCards } from '../lib/srsStore'
import type { CardState, Rating, Word } from '../types'

const DAY_MS = 86_400_000
const MIN = 1 / 1440 // 1 phút tính bằng ngày
const START_EASE = 2.5
const MIN_EASE = 1.3
const MAX_EASE = 3.0

const clampEase = (e: number) => Math.min(MAX_EASE, Math.max(MIN_EASE, e))

/**
 * Lịch ôn kiểu Anki (đơn vị: ngày, cho phép số lẻ để biểu diễn phút):
 *  - Thẻ mới / đang học (interval < 1 ngày): Quên 1 phút · Khó 6 phút · Tốt 1 ngày · Dễ 4 ngày
 *  - Thẻ đã thuộc: Quên → học lại sau 1 phút; Khó ×1,2; Tốt ×hệ số dễ; Dễ ×hệ số dễ ×1,3
 */
export function previewIntervals(card: CardState): Record<Rating, number> {
  if (card.interval < 1) return { again: MIN, hard: 6 * MIN, good: 1, easy: 4 }
  const i = card.interval
  const e = card.easeFactor
  // Làm tròn theo ngày và luôn tăng dần Khó < Tốt < Dễ.
  const hard = Math.round(Math.max(i * 1.2, i + 1))
  const good = Math.round(Math.max(i * e, hard + 1))
  const easy = Math.round(Math.max(i * e * 1.3, good + 1))
  return { again: MIN, hard, good, easy }
}

/** Tính trạng thái mới của thẻ sau khi đánh giá. */
export function nextState(card: CardState, rating: Rating, now = Date.now()): CardState {
  const interval = previewIntervals(card)[rating]
  let { easeFactor } = card
  const review = card.interval >= 1
  if (review && rating === 'again') easeFactor -= 0.2
  if (review && rating === 'hard') easeFactor -= 0.15
  if (rating === 'easy') easeFactor += 0.15
  return {
    ...card,
    interval: review && rating === 'again' ? 0 : interval,
    easeFactor: clampEase(easeFactor),
    reps: card.reps + 1,
    lapses: (card.lapses ?? 0) + (review && rating === 'again' ? 1 : 0),
    due: now + interval * DAY_MS,
  }
}

/** Mô tả ngắn khoảng thời gian (ngày, có thể lẻ) để hiện trên nút đánh giá. */
export function formatInterval(days: number, lang: string): string {
  const vi = lang !== 'en'
  const minutes = Math.round(days * 1440)
  if (minutes < 60) return vi ? `${minutes} phút` : `${minutes} min`
  if (minutes < 1440) return vi ? `${Math.round(minutes / 60)} giờ` : `${Math.round(minutes / 60)} h`
  const d = Math.round(days)
  if (d < 30) return vi ? `${d} ngày` : `${d} d`
  if (d < 365) return vi ? `${Math.round(d / 30)} tháng` : `${Math.round(d / 30)} mo`
  return vi ? `${(d / 365).toFixed(1)} năm` : `${(d / 365).toFixed(1)} y`
}

/** Trạng thái học của thẻ (dùng cho thống kê và nhãn). */
export type CardStage = 'new' | 'learning' | 'young' | 'mature'
export const cardStage = (c: CardState): CardStage =>
  c.reps === 0 ? 'new' : c.interval < 1 ? 'learning' : c.interval < 21 ? 'young' : 'mature'

/** Thẻ ngữ pháp dùng chung bộ thẻ, id có tiền tố "g:" + id bài ngữ pháp. */
export const GRAMMAR_PREFIX = 'g:'
export const isGrammarId = (id: string) => id.startsWith(GRAMMAR_PREFIX)

const newCard = (wordId: string): CardState => ({
  wordId,
  due: Date.now(),
  addedAt: Date.now(),
  interval: 0,
  easeFactor: START_EASE,
  reps: 0,
})

/**
 * Quản lý bộ thẻ SRS.
 * - Đã đăng nhập: đọc/ghi Firestore users/{uid}/cards, lắng nghe realtime để đồng bộ giữa các tab/thiết bị.
 * - Chưa đăng nhập: lưu localStorage 'srs_cards'.
 */
export function useFlashcard() {
  const { user, loading: authLoading } = useAuth()
  const uid = user?.uid ?? null

  const [cards, setCards] = useState<CardState[]>(() => (uid ? [] : loadLocalCards()))
  const [cardsLoading, setCardsLoading] = useState(true)
  const [syncError, setSyncError] = useState<string | null>(null)
  const cardsRef = useRef(cards)
  useEffect(() => {
    cardsRef.current = cards
  }, [cards])

  // Nạp dữ liệu mỗi khi trạng thái đăng nhập thay đổi.
  useEffect(() => {
    if (authLoading) return
    setSyncError(null)

    if (!uid) {
      setCards(loadLocalCards())
      setCardsLoading(false)
      return
    }

    setCardsLoading(true)
    return onSnapshot(
      cardsCollection(uid),
      (snap) => {
        setCards(snap.docs.map((d) => d.data() as CardState))
        setCardsLoading(false)
      },
      (err) => {
        setSyncError(err.message)
        setCardsLoading(false)
      },
    )
  }, [uid, authLoading])

  /** Ghi các thẻ đã đổi: cập nhật state ngay, rồi lưu xuống nơi lưu trữ tương ứng. */
  const persist = useCallback(
    (changed: CardState[]) => {
      if (!changed.length) return
      const byId = new Map(changed.map((c) => [c.wordId, c]))
      const prev = cardsRef.current
      const next = [...prev.map((c) => byId.get(c.wordId) ?? c), ...changed.filter((c) => !prev.some((p) => p.wordId === c.wordId))]
      cardsRef.current = next
      setCards(next)

      if (uid) {
        const write = changed.length === 1 ? saveCloudCard(uid, changed[0]) : saveCloudCards(uid, changed)
        write.catch((err: Error) => setSyncError(err.message))
      } else {
        saveLocalCards(next)
      }
    },
    [uid],
  )

  /** Từ đến hạn ôn: đã có trong bộ thẻ và due <= hiện tại. */
  const getDueCards = useCallback(
    (words: Word[]): Word[] => {
      const now = Date.now()
      const byId = new Map(cards.map((c) => [c.wordId, c]))
      return words.filter((w) => {
        const c = byId.get(w.id)
        return c !== undefined && c.due <= now
      })
    },
    [cards],
  )

  /** Thêm thẻ theo id (bỏ qua thẻ đã có), trả về số thẻ được thêm. */
  const addIds = useCallback(
    (ids: string[]): number => {
      const existing = new Set(cardsRef.current.map((c) => c.wordId))
      const fresh = [...new Set(ids)].filter((id) => !existing.has(id)).map((id) => newCard(id))
      persist(fresh)
      return fresh.length
    },
    [persist],
  )

  /** Thêm từ vào bộ thẻ (bỏ qua từ đã có), trả về số từ được thêm. */
  const addWords = useCallback((words: Word[]): number => addIds(words.map((w) => w.id)), [addIds])

  const grade = useCallback(
    (wordId: string, rating: Rating): void => {
      const card = cardsRef.current.find((c) => c.wordId === wordId)
      if (card) persist([nextState(card, rating)])
    },
    [persist],
  )

  /** Xoá một thẻ khỏi bộ thẻ. */
  const removeCard = useCallback(
    (wordId: string) => {
      const next = cardsRef.current.filter((c) => c.wordId !== wordId)
      cardsRef.current = next
      setCards(next)
      if (uid) deleteCloudCard(uid, wordId).catch((err: Error) => setSyncError(err.message))
      else saveLocalCards(next)
    },
    [uid],
  )

  /** Học lại từ đầu: đưa mọi thẻ về trạng thái mới, đến hạn ngay. */
  const resetAll = useCallback(
    (kind?: 'vocab' | 'grammar') => {
      const now = Date.now()
      const target = kind ? cardsRef.current.filter((c) => isGrammarId(c.wordId) === (kind === 'grammar')) : cardsRef.current
      persist(target.map((c) => ({ ...c, due: now, interval: 0, easeFactor: START_EASE, reps: 0, lapses: 0 })))
    },
    [persist],
  )

  const stats = useCallback(() => {
    const now = Date.now()
    return {
      total: cards.length,
      due: cards.filter((c) => c.due <= now).length,
      learned: cards.filter((c) => c.reps > 0).length,
    }
  }, [cards])

  const hasCard = useCallback((wordId: string) => cards.some((c) => c.wordId === wordId), [cards])

  return {
    cards,
    loading: authLoading || cardsLoading,
    synced: Boolean(uid),
    syncError,
    getDueCards,
    addWords,
    addIds,
    grade,
    stats,
    hasCard,
    removeCard,
    resetAll,
  }
}
