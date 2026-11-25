import type { HSKLevel, Word } from '../types'

/**
 * Từ điển = bộ từ vựng HSK 1–6 của người dùng (data-src/hsk/HSK1..6.json),
 * được scripts/import-learn-data.mjs chuyển thành generated/vocabulary.json
 * (giữ id cũ để tiến độ Flashcard không mất). Dữ liệu lớn nên chỉ tải khi trang cần.
 */
let cache: Promise<Word[]> | null = null

export function loadDictionary(): Promise<Word[]> {
  cache ??= import('./generated/vocabulary.json').then((m) =>
    (m.default as unknown as (Omit<Word, 'hsk_level'> & { hsk_level: number })[]).map((w) => ({
      ...w,
      hsk_level: w.hsk_level as HSKLevel,
    })),
  )
  return cache
}

/** Bỏ dấu, viết thường, bỏ khoảng trắng: để "ni hao" khớp "nǐ hǎo", "xin chao" khớp "Xin chào". */
export const normalize = (s: string) =>
  s
    .toLowerCase()
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .replace(/đ/g, 'd')
    .replace(/ü/g, 'u')
    .replace(/\s+/g, '')

export function searchWords(words: Word[], query: string, limit = 60): Word[] {
  const raw = query.trim()
  if (!raw) return []
  const q = normalize(raw)
  const scored: { w: Word; score: number }[] = []
  for (const w of words) {
    let score = -1
    if (w.hanzi === raw) score = 0
    else if (w.hanzi.includes(raw)) score = 1
    else {
      const p = normalize(w.pinyin)
      const vi = normalize(w.meaning_vi)
      const en = normalize(w.meaning_en)
      const hv = w.han_viet ? normalize(w.han_viet) : ''
      if (p === q || hv === q) score = 2
      else if (p.startsWith(q)) score = 3
      else if (vi.includes(q) || hv.includes(q)) score = 4
      else if (p.includes(q) || en.includes(q)) score = 5
    }
    if (score >= 0) scored.push({ w, score })
  }
  return scored
    .sort((a, b) => a.score - b.score || a.w.hsk_level - b.w.hsk_level || a.w.hanzi.length - b.w.hanzi.length)
    .slice(0, limit)
    .map((x) => x.w)
}
