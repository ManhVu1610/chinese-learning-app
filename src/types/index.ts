export type HSKLevel = 1 | 2 | 3 | 4 | 5 | 6

export interface Example {
  hanzi: string
  pinyin: string
  meaning_vi: string
  meaning_en: string
}

export interface Word {
  id: string
  hanzi: string
  pinyin: string
  meaning_vi: string
  meaning_en: string
  hsk_level: HSKLevel
  audio_url?: string
  examples?: Example[]
}

export interface CardState {
  wordId: string
  /** timestamp ms, khi nào ôn tiếp */
  due: number
  /** số ngày đến lần ôn tiếp */
  interval: number
  /** hệ số dễ, bắt đầu = 2.5 */
  easeFactor: number
  /** số lần đã ôn */
  reps: number
}

export type Rating = 'again' | 'hard' | 'good' | 'easy'

export interface UserProfile {
  uid: string
  email: string | null
  displayName: string | null
  photoURL: string | null
}
