import { hasHan, toPinyinTokens } from './textTools'

/** Một cụm từ hiển thị kèm pinyin phía trên, vd { text: '大城市', pinyin: 'dà chéng shì' }. */
export interface WordChip {
  text: string
  pinyin: string
}

/**
 * Chia câu thành từ (khớp dài nhất theo danh sách từ vựng đã biết, tối đa 4 chữ) và gắn pinyin theo ngữ cảnh.
 * Dấu câu dính vào từ đứng trước để hàng chữ gọn như sách.
 */
export async function toWordChips(text: string, known: Set<string>): Promise<WordChip[]> {
  const tokens = (await toPinyinTokens(text)).filter((tk) => tk.text.trim())
  const chips: WordChip[] = []
  let i = 0
  while (i < tokens.length) {
    const tk = tokens[i]
    if (!hasHan(tk.text)) {
      // Dấu câu, chữ số, chữ Latin: nối vào cụm trước (nếu có).
      if (chips.length && !/[\p{L}\p{N}]/u.test(tk.text)) chips[chips.length - 1].text += tk.text
      else chips.push({ text: tk.text, pinyin: '' })
      i++
      continue
    }
    let len = 1
    for (let n = Math.min(4, tokens.length - i); n > 1; n--) {
      const part = tokens.slice(i, i + n)
      if (part.every((p) => hasHan(p.text)) && known.has(part.map((p) => p.text).join(''))) {
        len = n
        break
      }
    }
    const part = tokens.slice(i, i + len)
    chips.push({ text: part.map((p) => p.text).join(''), pinyin: part.map((p) => p.pinyin).join(' ') })
    i += len
  }
  return chips
}
