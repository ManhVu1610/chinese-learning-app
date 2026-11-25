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
  /** Âm Hán Việt (từ dữ liệu Learn) */
  han_viet?: string
  /** Loại từ, ví dụ "Danh từ" */
  word_type?: string
  /** Một câu ví dụ bằng chữ Hán */
  example?: string
  /** Từ người dùng tự nhập trong Sổ tay (không có trong dữ liệu HSK, hsk_level không có nghĩa) */
  custom?: boolean
  /** Các loại từ người dùng chọn trong bảng sửa bộ (vd ["Liên từ", "Giới từ"]) */
  word_types?: string[]
  /** Pinyin của câu ví dụ */
  example_pinyin?: string
  /** Nghĩa tiếng Việt của câu ví dụ */
  example_vi?: string
  /** Ảnh minh hoạ (data URL đã thu nhỏ) */
  image?: string
}

export interface NotebookFolder {
  id: string
  name: string
  createdAt: number
}

export interface VocabSet {
  id: string
  name: string
  /** null = chưa xếp vào thư mục nào */
  folderId: string | null
  words: Word[]
  createdAt: number
}

export interface Radical {
  /** Số thứ tự trong bảng 214 bộ thủ */
  id: number
  radical: string
  /** Dạng biến thể, ví dụ 亻 của 人 */
  variants: string[]
  pinyin: string
  han_viet: string
  meaning_vi: string
  strokes: number
}

/** Bộ thủ thường dùng (radicals_50 trong Learn), kèm từ ví dụ. */
export interface CommonRadical {
  id: number
  radical: string
  variants: string[]
  pinyin: string
  han_viet: string
  meaning_vi: string
  examples: { hanzi: string; pinyin: string; meaning_vi: string }[]
  /** Số thứ tự trong bảng 214 bộ */
  ref214: number | null
  strokes: number | null
}

export interface GrammarExample {
  hanzi: string
  pinyin: string
  meaning_vi: string
}

export interface GrammarPoint {
  id: string
  title: string
  level: HSKLevel
  explanation_vi: string
  structure: string
  /** Mẹo ghi nhớ */
  tip?: string
  /** Lưu ý khi dùng */
  note?: string
  examples: GrammarExample[]
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
