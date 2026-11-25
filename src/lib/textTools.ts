/**
 * Công cụ xử lý văn bản tiếng Trung.
 *  - Pinyin theo ngữ cảnh (đa âm): pinyin-pro (MIT).
 *  - Giản thể ↔ phồn thể: opencc-js (MIT / Apache-2.0).
 *  - Dịch Việt/Anh ↔ Trung: API miễn phí MyMemory (không cần key, có giới hạn lượt mỗi ngày).
 * Hai thư viện được nạp khi cần để trang khác không phải tải.
 */

export type Lang = 'vi' | 'en' | 'zh'

export const hasHan = (s: string) => /\p{Script=Han}/u.test(s)

/** Đoán ngôn ngữ của đoạn văn để chọn giọng đọc. */
export function detectLang(s: string): Lang {
  if (hasHan(s)) return 'zh'
  if (/[ăâđêôơưàảãáạằẳẵắặầẩẫấậèẻẽéẹềểễếệìỉĩíịòỏõóọồổỗốộờởỡớợùủũúụừửữứựỳỷỹýỵ]/i.test(s)) return 'vi'
  return 'en'
}

export const speechLang: Record<Lang, string> = { zh: 'zh-CN', vi: 'vi-VN', en: 'en-US' }

export interface PinyinToken {
  text: string
  pinyin: string // rỗng nếu không phải chữ Hán
}

// Cụm từ pinyin-pro hay đọc sai (đa âm trong ngữ cảnh thường gặp).
const CUSTOM: Record<string, string> = {
  长得: 'zhǎng de',
  得去: 'děi qù',
  得走: 'děi zǒu',
  得了: 'dé le',
  教书: 'jiāo shū',
  教汉语: 'jiāo hàn yǔ',
  教中文: 'jiāo zhōng wén',
  教英语: 'jiāo yīng yǔ',
  一会儿: 'yí huìr',
}
// 得 làm bổ ngữ (跑得很快) đọc nhẹ "de" khi đứng giữa động từ và từ chỉ mức độ/kết quả.
const DE_NEXT = new Set([...'很太真非好快慢不多少高早晚清对漂干累像最越更特挺满一十有那这么怎都'])
const DE_KEEP_PREV = new Set([...'获取值懂难免不使晓舍赢心'])
// 地 trạng ngữ (慢慢地, 认真地) đọc "de".
const DI_ADVERB = /^(认真|高兴|努力|仔细|安静|大声|小声|小心|耐心|热情|不停|开心|快乐|愉快|轻松|紧张|生气|慢慢|快快|好好|轻轻|悄悄|静静|渐渐|远远|默默|偷偷|简单|清楚|积极|主动|热烈|激动|礼貌|友好|奇怪|大概|自然|突然)$/

let pinyinLib: Promise<typeof import('pinyin-pro')> | null = null
const loadPinyin = () =>
  (pinyinLib ??= import('pinyin-pro').then((lib) => {
    lib.customPinyin(CUSTOM)
    return lib
  }))

/** Tách văn bản thành từng chữ kèm pinyin (chọn âm đa âm theo ngữ cảnh). */
export async function toPinyinTokens(text: string): Promise<PinyinToken[]> {
  const { pinyin } = await loadPinyin()
  const items = pinyin(text, { type: 'all', toneSandhi: false })
  const tokens = items.map((it) => ({ text: it.origin, pinyin: it.isZh ? it.pinyin : '' }))
  tokens.forEach((tk, i) => {
    const prev = tokens[i - 1]?.text ?? ''
    const next = tokens[i + 1]?.text ?? ''
    if (tk.text === '得' && tk.pinyin === 'dé' && hasHan(prev) && DE_NEXT.has(next) && !DE_KEEP_PREV.has(prev)) tk.pinyin = 'de'
    if (tk.text === '地' && tk.pinyin === 'dì') {
      const two = (tokens[i - 2]?.text ?? '') + prev
      if ((prev && prev === tokens[i - 2]?.text && hasHan(prev)) || DI_ADVERB.test(two)) tk.pinyin = 'de'
    }
  })
  return tokens
}

/** Pinyin dạng một dòng, các chữ Hán cách nhau bằng dấu cách. */
export async function toPinyinLine(text: string): Promise<string> {
  const tokens = await toPinyinTokens(text)
  return tokens
    .map((tk, i) => (tk.pinyin ? (i > 0 && tokens[i - 1].pinyin ? ' ' : '') + tk.pinyin : tk.text))
    .join('')
}

const converters: Partial<Record<'s2t' | 't2s', (s: string) => string>> = {}

/** Chuyển giản thể → phồn thể (chuẩn Đài Loan) hoặc ngược lại. */
export async function convertScript(text: string, dir: 's2t' | 't2s'): Promise<string> {
  if (!converters[dir]) {
    // Mỗi chiều chỉ nạp bộ từ điển của chiều đó.
    converters[dir] =
      dir === 's2t'
        ? (await import('opencc-js/cn2t')).Converter({ from: 'cn', to: 'tw' })
        : (await import('opencc-js/t2cn')).Converter({ from: 'tw', to: 'cn' })
  }
  return converters[dir]!(text)
}

const apiLang: Record<Lang, string> = { vi: 'vi', en: 'en', zh: 'zh-CN' }

/** Cắt văn bản thành các đoạn ≤ 450 byte (giới hạn của MyMemory là 500 byte mỗi lượt), ưu tiên cắt ở cuối câu. */
function chunk(text: string, max = 450): string[] {
  const bytes = (s: string) => new TextEncoder().encode(s).length
  const pieces = text.match(/[^。！？!?.\n]+[。！？!?.\n]*|[\n]+/g) ?? [text]
  const out: string[] = []
  let cur = ''
  for (const p of pieces) {
    if (bytes(cur + p) <= max) {
      cur += p
      continue
    }
    if (cur) out.push(cur)
    if (bytes(p) <= max) {
      cur = p
      continue
    }
    // Câu quá dài: cắt theo ký tự.
    cur = ''
    for (const ch of p) {
      if (bytes(cur + ch) > max) {
        out.push(cur)
        cur = ''
      }
      cur += ch
    }
  }
  if (cur) out.push(cur)
  return out
}

export class TranslateError extends Error {
  code: 'quota' | 'network' | 'failed'
  constructor(code: 'quota' | 'network' | 'failed') {
    super(code)
    this.code = code
  }
}

/** Dịch văn bản qua MyMemory, giữ nguyên các dòng trống. */
export async function translate(text: string, from: Lang, to: Lang, signal?: AbortSignal): Promise<string> {
  const parts = chunk(text.trim())
  const out: string[] = []
  for (const part of parts) {
    if (!part.trim()) {
      out.push(part)
      continue
    }
    const lead = part.match(/^\s*/)![0]
    const trail = part.match(/\s*$/)![0]
    const url = `https://api.mymemory.translated.net/get?q=${encodeURIComponent(part.trim())}&langpair=${apiLang[from]}|${apiLang[to]}`
    let res: Response
    try {
      res = await fetch(url, { signal })
    } catch (e) {
      if ((e as Error).name === 'AbortError') throw e
      throw new TranslateError('network')
    }
    const data = await res.json().catch(() => null)
    if (!data) throw new TranslateError('failed')
    if (data.quotaFinished || data.responseStatus === 429 || /MYMEMORY WARNING/i.test(data.responseData?.translatedText ?? ''))
      throw new TranslateError('quota')
    if (Number(data.responseStatus) !== 200 || typeof data.responseData?.translatedText !== 'string') throw new TranslateError('failed')
    out.push(lead + data.responseData.translatedText + trail)
  }
  return out.join('')
}
