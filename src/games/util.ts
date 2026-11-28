import type { Word } from '../types'

/** Phần chữ Hán của một chuỗi / một từ (bỏ ngoặc, chữ Latin…). */
export const onlyHanText = (s: string) => [...s].filter((c) => /\p{Script=Han}/u.test(c)).join('')
export const han = (w: Word) => onlyHanText(w.hanzi)

export function shuffle<T>(arr: T[]): T[] {
  const a = [...arr]
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1))
    ;[a[i], a[j]] = [a[j], a[i]]
  }
  return a
}
