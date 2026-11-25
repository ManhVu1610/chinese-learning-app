import type { Word } from '../types'
import { normalize, searchWords } from './dictionary'
import { syllableRows } from './pinyin'

/** Thông tin từng chữ (nhập từ Learn): s = số nét, r = id bộ thủ, p = các cách đọc. */
export type CharInfo = Record<string, { s: number | null; r: number[]; p?: string[] }>

let charsCache: Promise<CharInfo> | null = null
export function loadChars(): Promise<CharInfo> {
  charsCache ??= import('./generated/chars.json').then((m) => m.default as unknown as CharInfo)
  return charsCache
}

export const WORD_TYPES = [
  'Danh từ',
  'Động từ',
  'Tính từ',
  'Phó từ',
  'Đại từ',
  'Số từ',
  'Lượng từ',
  'Giới từ',
  'Liên từ',
  'Trợ từ',
  'Thán từ',
  'Từ tượng thanh',
  'Cụm từ',
  'Thành ngữ',
]

const isHan = (c: string) => /\p{Script=Han}/u.test(c)
export const hanChars = (s: string) => [...s].filter(isHan)

// ---------- Tách pinyin theo từng chữ: "dòufu" → ["dòu", "fu"] ----------

const SYLLABLES = new Set(syllableRows.flatMap((r) => r.syllables).map((s) => s.replace('ü', 'v')))
const stripTone = (s: string) =>
  s
    .normalize('NFD')
    .replace(/ü/g, 'v') // ü (u + ¨) → v, trước khi bỏ dấu thanh
    .replace(/[̀-ͯ]/g, '')
    .toLowerCase()

/** Tách chuỗi pinyin thành đúng `count` âm tiết (giữ dấu thanh). Trả về null nếu không tách được. */
export function splitPinyin(pinyin: string, count: number): string[] | null {
  const parts = pinyin.trim().split(/[\s'’-]+/).filter(Boolean)
  if (parts.length === count) return parts
  const joined = parts.join('')
  // Giữ vị trí từng ký tự gốc (NFC) để cắt lại có dấu.
  const chars = [...joined.normalize('NFC')]
  const plain = chars.map((c) => stripTone(c))
  const memo = new Map<string, number[] | null>()
  const solve = (i: number, left: number): number[] | null => {
    const key = `${i}:${left}`
    if (memo.has(key)) return memo.get(key)!
    let res: number[] | null = null
    if (i === chars.length) res = left === 0 ? [] : null
    else if (left > 0) {
      for (let len = Math.min(6, chars.length - i); len >= 1 && !res; len--) {
        if (SYLLABLES.has(plain.slice(i, i + len).join(''))) {
          const rest = solve(i + len, left - 1)
          if (rest) res = [len, ...rest]
        }
      }
    }
    memo.set(key, res)
    return res
  }
  const lens = solve(0, count)
  if (!lens) return null
  let i = 0
  return lens.map((len) => {
    const s = chars.slice(i, i + len).join('')
    i += len
    return s
  })
}

/** Pinyin cho từng chữ của một từ. Dùng pinyin của từ nếu tách được, nếu không thì lấy cách đọc từng chữ. */
export function perCharPinyin(word: Pick<Word, 'hanzi' | 'pinyin'>, chars?: CharInfo): string[] {
  const hs = hanChars(word.hanzi)
  const split = word.pinyin ? splitPinyin(word.pinyin, hs.length) : null
  if (split) return split
  return hs.map((c) => chars?.[c]?.p?.[0] ?? '')
}

// ---------- Tra một từ để tự điền các ô còn trống ----------

/** Tra một mục nhập (chữ Hán, pinyin hoặc nghĩa tiếng Việt). Trả về từ tìm được, hoặc từ ghép tự dựng theo từng chữ. */
export function lookupWord(input: string, dict: Word[], chars?: CharInfo): Word | null {
  const raw = input.trim()
  if (!raw) return null
  const hs = hanChars(raw)

  if (hs.length) {
    const hanzi = hs.join('')
    const exact = dict.find((w) => w.hanzi === hanzi)
    if (exact) return { ...exact }
    // Không có trong từ điển: ghép pinyin và Hán Việt từ từng chữ.
    const singles = new Map(dict.filter((w) => [...w.hanzi].length === 1).map((w) => [w.hanzi, w]))
    return {
      id: newWordId(),
      hanzi,
      pinyin: hs.map((c) => singles.get(c)?.pinyin ?? chars?.[c]?.p?.[0] ?? '').join(' ').trim(),
      han_viet: hs.map((c) => singles.get(c)?.han_viet ?? '').join(' ').trim(),
      meaning_vi: '',
      meaning_en: '',
      hsk_level: 1,
      custom: true,
    }
  }

  // Pinyin (có hoặc không dấu) hoặc nghĩa tiếng Việt / Hán Việt: lấy kết quả khớp nhất.
  const q = normalize(raw)
  const byPinyin = dict.find((w) => normalize(w.pinyin) === q)
  if (byPinyin) return { ...byPinyin }
  const byMeaning = dict.find(
    (w) => normalize(w.meaning_vi) === q || w.meaning_vi.split(/[;,]/).some((m) => normalize(m) === q) || normalize(w.han_viet ?? '') === q,
  )
  if (byMeaning) return { ...byMeaning }
  const best = searchWords(dict, raw, 1)[0]
  return best ? { ...best } : null
}

export const newWordId = () => `custom-${Date.now().toString(36)}${Math.random().toString(36).slice(2, 7)}`

/** Điền các ô còn trống của `w` bằng dữ liệu tra được (không ghi đè ô người dùng đã nhập). */
export function fillMissing(w: Word, found: Word | null): Word {
  if (!found) return w
  const fromDictionary = !found.custom
  return {
    ...w,
    // Dùng id của từ điển để tiến độ Flashcard khớp với cùng một từ.
    id: fromDictionary ? found.id : w.id,
    pinyin: w.pinyin || found.pinyin,
    han_viet: w.han_viet || found.han_viet,
    meaning_vi: w.meaning_vi || found.meaning_vi,
    meaning_en: w.meaning_en || found.meaning_en,
    word_types: w.word_types?.length ? w.word_types : found.word_type ? [found.word_type] : found.word_types,
    example: w.example || found.example,
    hsk_level: fromDictionary ? found.hsk_level : w.hsk_level,
    custom: fromDictionary ? false : w.custom,
  }
}

// ---------- Đọc danh sách dán vào ----------

export interface ParsedLine {
  /** Dòng gốc người dùng dán */
  source: string
  word: Word | null
}

/** Mỗi dòng một từ; có thể kèm nghĩa sau dấu "-" hoặc ":" (vd "你好 - xin chào"). */
export function parseLines(text: string, dict: Word[], chars?: CharInfo): ParsedLine[] {
  const lines = text
    .split(/\r?\n/)
    .map((l) => l.trim())
    .filter(Boolean)
  const seen = new Set<string>()
  const out: ParsedLine[] = []
  for (const line of lines) {
    const m = line.match(/^(.+?)\s+[-–:：]\s+(.+)$/) ?? line.match(/^(\S+)\s*[-–:：]\s*(.+)$/)
    const head = (m ? m[1] : line).trim()
    const meaning = m?.[2]?.trim()
    const found = lookupWord(head, dict, chars)
    let word = found
    if (word && meaning) word = { ...word, meaning_vi: meaning }
    if (word) {
      if (seen.has(word.hanzi)) continue
      seen.add(word.hanzi)
    }
    out.push({ source: line, word })
  }
  return out
}

// ---------- JSON (từ Claude hoặc tệp .json) ----------

const pick = (o: Record<string, unknown>, ...keys: string[]): string => {
  for (const k of keys) {
    const v = o[k]
    if (typeof v === 'string' && v.trim()) return v.trim()
  }
  return ''
}

/** Đọc mảng JSON từ vựng. Chấp nhận cả khi có ```json ... ``` bao quanh. Ném lỗi nếu không đọc được. */
export function parseJsonWords(text: string, dict: Word[], chars?: CharInfo): Word[] {
  let body = text.trim().replace(/^```(?:json)?\s*/i, '').replace(/```\s*$/, '')
  const start = body.indexOf('[')
  const end = body.lastIndexOf(']')
  if (start >= 0 && end > start) body = body.slice(start, end + 1)
  const parsed: unknown = JSON.parse(body)
  const arr = Array.isArray(parsed) ? parsed : [parsed]
  const out: Word[] = []
  const seen = new Set<string>()
  for (const item of arr) {
    if (!item || typeof item !== 'object') continue
    const o = item as Record<string, unknown>
    const hanzi = hanChars(pick(o, 'hanzi', 'word', 'chinese', 'zh')).join('')
    if (!hanzi || seen.has(hanzi)) continue
    seen.add(hanzi)
    const typesRaw = o.word_types ?? o.wordTypes ?? o.types ?? o.type ?? o.wordType ?? o.pos
    const types = (Array.isArray(typesRaw) ? typesRaw : typeof typesRaw === 'string' ? typesRaw.split(/[,;/]/) : [])
      .map((x) => String(x).trim())
      .filter(Boolean)
    const base: Word = {
      id: newWordId(),
      hanzi,
      pinyin: pick(o, 'pinyin', 'reading'),
      han_viet: pick(o, 'han_viet', 'hanViet', 'yinHan', 'sino_vietnamese'),
      meaning_vi: pick(o, 'meaning_vi', 'meaning', 'nghia', 'vi'),
      meaning_en: pick(o, 'meaning_en', 'meaningEn', 'english', 'en'),
      word_types: types,
      example: pick(o, 'example', 'example_zh', 'sentence'),
      example_pinyin: pick(o, 'example_pinyin', 'examplePinyin', 'sentence_pinyin'),
      example_vi: pick(o, 'example_vi', 'exampleMeaning', 'example_meaning', 'sentence_vi'),
      hsk_level: 1,
      custom: true,
    }
    const filled = fillMissing(base, lookupWord(hanzi, dict, chars))
    // AI cố ý để Hán Việt rỗng cho trợ từ (吗, 呢…): giữ rỗng, không tự điền.
    const hvKey = ['han_viet', 'hanViet', 'yinHan', 'sino_vietnamese'].find((k) => k in o)
    if (hvKey && typeof o[hvKey] === 'string' && !(o[hvKey] as string).trim()) filled.han_viet = ''
    out.push(filled)
  }
  return out
}

/** Phần chung của prompt (quy tắc + schema). Dùng cho AI Format, nối thêm danh sách từ người dùng dán. */
export const AI_PROMPT_BASE = `Bạn là từ điển Trung-Việt thông minh, output ra JSON array dùng cho app học từ vựng.

CHỈ trả về JSON array thuần, KHÔNG giải thích, KHÔNG markdown, KHÔNG code block, KHÔNG <think>.

Schema mỗi item:
{"word":"汉字","reading":"pinyin có thanh điệu","yinHan":"ÂM HÁN VIỆT","meaning":"nghĩa tiếng Việt","example":"câu ví dụ 中文","exampleMeaning":"nghĩa câu ví dụ"}

NHIỆM VỤ CHÍNH: từ input của user (DÙ THIẾU TỚI ĐÂU), tự suy ra đầy đủ 6 field. User có thể nhập:

1) CHỈ chữ Hán
   - vd input: "你好" hoặc "学校, 老师, 书"
   - bạn TỰ sinh: reading, yinHan, meaning, example (1 câu ngắn), exampleMeaning
2) CHỈ tiếng Việt (nghĩa)
   - vd input: "xin chào" hoặc "trường học, học sinh, sách"
   - bạn TỰ tra ngược ra từ tiếng Trung (GIẢN THỂ) phổ biến nhất tương ứng → điền word + tất cả field còn lại
   - Nếu 1 nghĩa Việt có nhiều từ Trung, chọn từ thông dụng nhất theo chuẩn HSK
3) CHỈ pinyin (vd "nǐ hǎo, xièxie" hoặc dạng số "ni3hao3")
   - tra ngược ra chữ Hán + nghĩa + các field còn lại
4) Hỗn hợp: Trung + Việt + pinyin xen kẽ, mỗi dòng/dấu phẩy là 1 từ — ghép thành item hoàn chỉnh
5) JSON thiếu field — bổ sung field còn thiếu, giữ nguyên field đã có
6) Bảng/text thô copy từ sách (có cột chữ Hán, pinyin, nghĩa, ví dụ) — parse từng dòng thành item

QUY TẮC TỪNG FIELD:
- word: luôn bắt buộc có, chữ Hán GIẢN THỂ. Nếu user nhập tiếng Việt hoặc pinyin → tra ngược ra chữ Hán phổ biến nhất.
- reading: pinyin đầy đủ DẤU thanh điệu. Vd: 学校 → "xuéxiào", 你好 → "nǐ hǎo", 谢谢 → "xièxie". Nếu user gõ pinyin dạng số (ni3hao3) → chuyển sang dạng dấu.
- yinHan: âm Hán Việt CHUẨN theo từ điển Hán-Việt Thiều Chửu / Đào Duy Anh, VIẾT HOA, các âm tiết phân tách bằng khoảng trắng, số âm tiết = số chữ Hán.
  • LƯU Ý các chữ dễ nhầm: 食 = THỰC (KHÔNG phải THỨC); 识 = THỨC; 式 = THỨC.
  • Vd chuẩn: 学校 → "HỌC HIỆU", 开发 → "KHAI PHÁT", 谢谢 → "TẠ TẠ", 时间 → "THỜI GIAN", 老师 → "LÃO SƯ", 中国 → "TRUNG QUỐC", 食堂 → "THỰC ĐƯỜNG", 知识 → "TRI THỨC", 大学 → "ĐẠI HỌC".
  • ⚠️ BẮT BUỘC điền cho MỌI từ có nghĩa Hán Việt: TUYỆT ĐỐI KHÔNG để trống. CHỈ để "" với trợ từ ngữ khí/thán từ không có âm Hán Việt thông dụng (吗, 呢, 吧, 啊…).
- meaning: nghĩa tiếng Việt ngắn gọn, viết hoa chữ cái đầu (vd: "Xin chào", "Trường học"). Có thể nhiều nghĩa cách bằng dấu phẩy (vd: "Cao, đắt").
- example: 1 câu tiếng Trung ngắn (5-12 chữ), tự nhiên, trình độ HSK 1-3, dùng đúng từ \`word\`. KHÔNG để rỗng — luôn tạo example.
- exampleMeaning: dịch tiếng Việt của example, viết hoa chữ cái đầu. KHÔNG để rỗng nếu example có.

NGUYÊN TẮC:
- Mỗi từ user cung cấp = 1 item trong array (KHÔNG gộp, KHÔNG bỏ).
- Giữ thứ tự gốc từ input.
- Field user đã cung cấp → giữ nguyên, KHÔNG tự sửa (trừ khi sai chính tả rõ ràng).
- Field user chưa cung cấp → bạn TỰ sinh đầy đủ, tuyệt đối KHÔNG để "" trừ trường hợp yinHan không áp dụng.
- Nếu input là cụm/câu dài (không phải từ vựng đơn lẻ) → coi cả cụm là 1 word.`

/** Prompt mẫu để người dùng sao chép, gửi cho Claude kèm tài liệu (đúng nguyên văn người dùng cung cấp). */
export const CLAUDE_PROMPT = `${AI_PROMPT_BASE}

Dựa trên tài liệu / sách học tập được đính kèm, hãy tổng hợp TOÀN BỘ từ vựng tiếng Trung xuất hiện trong tài liệu và tạo bộ dữ liệu flashcard theo đúng schema trên (JSON array). Giữ thứ tự xuất hiện trong tài liệu; nhiều bài thì gộp chung một mảng. Chỉ trả về JSON.`

