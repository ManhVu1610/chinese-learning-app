import { onSnapshot } from 'firebase/firestore'
import { useCallback, useEffect, useRef, useState } from 'react'
import { useAuth } from '../contexts/AuthContext'
import {
  cardsCollection,
  loadLocalCards,
  saveCloudCard,
  saveCloudCards,
  saveLocalCards,
} from '../lib/srsStore'
import type { CardState, Rating, Word } from '../types'

const DAY_MS = 86_400_000
const START_EASE = 2.5
const MIN_EASE = 1.3
const MAX_EASE = 3.0

const clampEase = (e: number) => Math.min(MAX_EASE, Math.max(MIN_EASE, e))

/** Tính trạng thái mới của thẻ sau khi đánh giá. */
export function nextState(card: CardState, rating: Rating, now = Date.now()): CardState {
  // Thẻ mới có interval = 0, nên lấy tối thiểu 1 ngày làm gốc để nhân.
  const base = Math.max(card.interval, 1)
  let { easeFactor } = card
  let interval: number

  switch (rating) {
    case 'again':
      interval = 1
      easeFactor -= 0.2
      break
    case 'hard':
      interval = base * 1.2
      easeFactor -= 0.15
      break
    case 'good':
      interval = base * easeFactor
      break
    case 'easy':
      interval = base * easeFactor * 1.3
      easeFactor += 0.15
      break
  }

  return {
    ...card,
    interval,
    easeFactor: clampEase(easeFactor),
    reps: card.reps + 1,
    due: now + interval * DAY_MS,
  }
}

const newCard = (wordId: string): CardState => ({
  wordId,
  due: Date.now(),
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
      const next = [
        ...prev.map((c) => byId.get(c.wordId) ?? c),
        ...changed.filter((c) => !prev.some((p) => p.wordId === c.wordId)),
      ]
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

  /** Thêm từ vào bộ thẻ (bỏ qua từ đã có), trả về số từ được thêm. */
  const addWords = useCallback(
    (words: Word[]): number => {
      const existing = new Set(cardsRef.current.map((c) => c.wordId))
      const fresh = words.filter((w) => !existing.has(w.id)).map((w) => newCard(w.id))
      persist(fresh)
      return fresh.length
    },
    [persist],
  )

  const grade = useCallback(
    (wordId: string, rating: Rating): void => {
      const card = cardsRef.current.find((c) => c.wordId === wordId)
      if (card) persist([nextState(card, rating)])
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
    grade,
    stats,
    hasCard,
  }
}
