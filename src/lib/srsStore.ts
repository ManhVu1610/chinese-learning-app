import { collection, deleteDoc, doc, getDocs, setDoc, writeBatch } from 'firebase/firestore'
import type { CardState } from '../types'
import { db } from './firebase'

export const LOCAL_KEY = 'srs_cards'

// ---------- localStorage (chế độ offline) ----------

export function loadLocalCards(): CardState[] {
  try {
    const raw = localStorage.getItem(LOCAL_KEY)
    const parsed = raw ? JSON.parse(raw) : []
    return Array.isArray(parsed) ? parsed : []
  } catch {
    return []
  }
}

export function saveLocalCards(cards: CardState[]): void {
  localStorage.setItem(LOCAL_KEY, JSON.stringify(cards))
}

export function clearLocalCards(): void {
  localStorage.removeItem(LOCAL_KEY)
}

// ---------- Firestore: users/{uid}/cards/{wordId} = CardState ----------

export const cardsCollection = (uid: string) => {
  if (!db) throw new Error('Firestore chưa được cấu hình')
  return collection(db, 'users', uid, 'cards')
}

export async function loadCloudCards(uid: string): Promise<CardState[]> {
  const snap = await getDocs(cardsCollection(uid))
  return snap.docs.map((d) => d.data() as CardState)
}

export async function saveCloudCard(uid: string, card: CardState): Promise<void> {
  await setDoc(doc(cardsCollection(uid), card.wordId), card, { merge: true })
}

export async function deleteCloudCard(uid: string, wordId: string): Promise<void> {
  await deleteDoc(doc(cardsCollection(uid), wordId))
}

/** Ghi nhiều thẻ bằng batch (Firestore giới hạn 500 thao tác mỗi batch). */
export async function saveCloudCards(uid: string, cards: CardState[]): Promise<void> {
  if (!db) throw new Error('Firestore chưa được cấu hình')
  for (let i = 0; i < cards.length; i += 500) {
    const batch = writeBatch(db)
    for (const card of cards.slice(i, i + 500)) {
      batch.set(doc(cardsCollection(uid), card.wordId), card, { merge: true })
    }
    await batch.commit()
  }
}

/**
 * Đưa thẻ trong localStorage lên Firestore sau khi đăng nhập.
 * Nếu cloud đã có thẻ cùng từ, giữ bản đã ôn nhiều lần hơn.
 * Chỉ xóa localStorage khi upload thành công. Trả về số thẻ đã upload.
 */
export async function migrateLocalToCloud(uid: string): Promise<number> {
  const local = loadLocalCards()
  if (!local.length) return 0

  const cloud = new Map((await loadCloudCards(uid)).map((c) => [c.wordId, c]))
  const toUpload = local.filter((c) => {
    const existing = cloud.get(c.wordId)
    return !existing || c.reps > existing.reps
  })

  if (toUpload.length) await saveCloudCards(uid, toUpload)
  clearLocalCards()
  return toUpload.length
}
