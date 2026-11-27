import { normalize } from '../../data/dictionary'
import type { Word } from '../../types'

export const hasMeaning = (w: Word) => Boolean(w.meaning_vi?.trim())
export const onlyHan = (s: string) => [...s].filter((c) => /\p{Script=Han}/u.test(c)).join('')

/** Các nghĩa tách từ meaning_vi ("Tốt, khỏe; hay" → tốt / khỏe / hay), bỏ phần trong ngoặc. */
const meaningVariants = (m: string) =>
  [m, ...m.replace(/\(.*?\)/g, '').split(/[,;/、]/)].map((x) => normalize(x.replace(/\(.*?\)/g, ''))).filter(Boolean)

export function checkMeaning(input: string, meaning: string) {
  const a = normalize(input)
  if (!a) return false
  return meaningVariants(meaning).some((v) => v === a || (a.length >= 3 && v.includes(a) && a.length >= v.length * 0.6))
}
