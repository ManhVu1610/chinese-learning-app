/**
 * Bộ gõ pinyin: gõ số thanh sau âm tiết để thêm dấu.
 *   ba1 → bā, ba2 → bá, ba3 → bǎ, ba4 → bà, ba5 / ba0 → ba (thanh nhẹ)
 *   nv → nü, lv3 → lǚ, nu:3 → nǚ
 * Quy tắc đặt dấu: a hoặc e luôn nhận dấu; "ou" thì đặt trên o; còn lại đặt trên nguyên âm cuối.
 */

const MARKS: Record<string, string[]> = {
  a: ['a', 'ā', 'á', 'ǎ', 'à'],
  e: ['e', 'ē', 'é', 'ě', 'è'],
  i: ['i', 'ī', 'í', 'ǐ', 'ì'],
  o: ['o', 'ō', 'ó', 'ǒ', 'ò'],
  u: ['u', 'ū', 'ú', 'ǔ', 'ù'],
  ü: ['ü', 'ǖ', 'ǘ', 'ǚ', 'ǜ'],
}
const upper = (c: string) => c.toUpperCase()

/** Thêm dấu thanh `tone` (1–4; 0/5 = thanh nhẹ) cho một âm tiết không dấu. */
export function markSyllable(syl: string, tone: number): string {
  const s = syl.replace(/u:/g, 'ü').replace(/U:/g, 'Ü').replace(/v/g, 'ü').replace(/V/g, 'Ü')
  if (tone < 1 || tone > 4) return s
  const lower = s.toLowerCase()
  let idx = lower.search(/[ae]/)
  if (idx < 0) idx = lower.indexOf('ou')
  if (idx < 0) {
    for (let i = lower.length - 1; i >= 0; i--)
      if ('aeiouü'.includes(lower[i])) {
        idx = i
        break
      }
  }
  if (idx < 0) return s
  const ch = lower[idx]
  const marked = MARKS[ch][tone]
  return s.slice(0, idx) + (s[idx] === ch ? marked : upper(marked)) + s.slice(idx + 1)
}

/** Chuyển cả chuỗi đang gõ: mọi "âm tiết + số" thành có dấu, v / u: thành ü. */
export function convertPinyinInput(text: string): string {
  return text
    .replace(/([a-zA-ZüÜ:]+?)([0-5])/g, (_, syl: string, n: string) => markSyllable(syl, Number(n)))
    .replace(/u:/g, 'ü')
    .replace(/U:/g, 'Ü')
    .replace(/([bcdfghjklmnpqrstwxyzBCDFGHJKLMNPQRSTWXYZ])v/g, '$1ü')
    .replace(/([bcdfghjklmnpqrstwxyzBCDFGHJKLMNPQRSTWXYZ])V/g, '$1Ü')
}

/** Dạng so sánh: chữ thường, bỏ khoảng trắng, dấu câu và dấu nháy; giữ dấu thanh. */
export const comparePinyin = (s: string) =>
  convertPinyinInput(s)
    .toLowerCase()
    .normalize('NFC')
    .replace(/[\s'’·.,;:!?-]/g, '')

/** Bỏ dấu thanh để biết người dùng sai âm hay chỉ sai thanh. */
export const stripTones = (s: string) =>
  comparePinyin(s)
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .replace(/ü/g, 'u')
