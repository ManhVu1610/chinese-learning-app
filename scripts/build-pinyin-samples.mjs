// Tạo chữ Hán mẫu cho từng âm tiết có thanh điệu (bảng pinyin dùng để đọc đúng âm).
// Chạy: node scripts/build-pinyin-samples.mjs
// - pinyin_chars.json: "mā" -> "妈". Ưu tiên chữ thường gặp CHỈ có một cách đọc, để giọng đọc không đọc nhầm âm khác.
// - pinyin_neutral.json: "ma" -> { w: "妈妈", p: "māma" }. Thanh nhẹ chỉ nghe đúng trong từ, nên dùng từ có âm cuối đọc nhẹ.
import { readFileSync, writeFileSync } from 'node:fs'
import { pinyin, polyphonic } from 'pinyin-pro'

const root = new URL('../src/data/', import.meta.url)
const read = (p) => JSON.parse(readFileSync(new URL(p, root), 'utf8'))
const chars = read('generated/chars.json')
const vocab = read('generated/vocabulary.json')

// Lấy danh sách âm tiết hợp lệ từ data/pinyin.ts (bảng `table`).
const src = readFileSync(new URL('pinyin.ts', root), 'utf8')
const body = src.slice(src.indexOf('const table'), src.indexOf('export const syllableRows'))
const syllables = [...body.matchAll(/:\s*'([a-zü ]+)'/g)].flatMap((m) => m[1].split(' '))

const marks = { a: 'āáǎà', e: 'ēéěè', i: 'īíǐì', o: 'ōóǒò', u: 'ūúǔù', ü: 'ǖǘǚǜ' }
function withTone(s, tone) {
  let idx = s.search(/[ae]/)
  if (idx < 0) idx = s.indexOf('ou')
  if (idx < 0)
    for (let i = s.length - 1; i >= 0; i--)
      if ('iouü'.includes(s[i])) {
        idx = i
        break
      }
  if (idx < 0) return s
  return s.slice(0, idx) + marks[s[idx]][tone - 1] + s.slice(idx + 1)
}

// Thứ tự ứng viên: chữ trong dữ liệu HSK (theo tần suất), rồi toàn bộ chữ Hán thông dụng 4E00–9FA5.
const order = [...Object.keys(chars)]
const seen = new Set(order)
for (let c = 0x4e00; c <= 0x9fa5; c++) {
  const ch = String.fromCodePoint(c)
  if (!seen.has(ch)) order.push(ch)
}

const readingsOf = new Map()
const BATCH = 2000
for (let i = 0; i < order.length; i += BATCH) {
  const part = order.slice(i, i + BATCH)
  const all = polyphonic(part.join(''), { type: 'array', toneType: 'symbol' })
  part.forEach((ch, j) =>
    readingsOf.set(
      ch,
      (all[j] ?? []).map((r) => r.normalize('NFC')),
    ),
  )
}

// Bốn mức ưu tiên: chữ thường gặp một cách đọc > chữ thường gặp có cách đọc chính là âm này
// > chữ hiếm một cách đọc > chữ hiếm có cách đọc chính. (Chữ hiếm có thể giọng đọc không biết.)
const tiers = [new Map(), new Map(), new Map(), new Map()]
for (const ch of order) {
  const rs = readingsOf.get(ch)
  if (!rs?.length) continue
  const base = ch in chars ? 0 : 2
  if (rs.length === 1 && !tiers[base].has(rs[0])) tiers[base].set(rs[0], ch)
  if (!tiers[base + 1].has(rs[0])) tiers[base + 1].set(rs[0], ch)
}
const mono = { get: (k) => tiers[0].get(k) ?? tiers[2].get(k) }
const pick = (k) => tiers[0].get(k) ?? tiers[1].get(k) ?? tiers[2].get(k) ?? tiers[3].get(k)

// Bổ sung tay: âm có chữ đa âm nhưng giọng đọc vẫn đọc đúng khi đứng riêng.
const manual = { shéi: '谁' }
const out = { ...manual }
let missing = []
for (const s of syllables) {
  for (const tone of [1, 2, 3, 4]) {
    const toned = withTone(s, tone).normalize('NFC')
    if (out[toned]) continue
    const ch = pick(toned)
    if (ch) out[toned] = ch
    else missing.push(toned)
  }
}

// Thanh nhẹ: từ 2–3 chữ trong HSK có âm cuối đọc nhẹ (pinyin-pro và pinyin của từ điển đều không dấu).
const strip = (s) => s.normalize('NFD').replace(/[̀-ͯ]/g, '').normalize('NFC').replace(/v/g, 'ü')
// Trợ từ và hậu tố đọc nhẹ thường gặp (đặt trước, ưu tiên hơn từ tự tìm).
const neutral = {
  a: { w: '好啊', p: 'hǎo a' },
  ne: { w: '你呢', p: 'nǐ ne' },
  ya: { w: '是呀', p: 'shì ya' },
  la: { w: '好啦', p: 'hǎo la' },
  wa: { w: '好哇', p: 'hǎo wa' },
  de: { w: '我的', p: 'wǒ de' },
  le: { w: '走了', p: 'zǒu le' },
  zhe: { w: '看着', p: 'kàn zhe' },
  guo: { w: '去过', p: 'qù guo' },
  ma: { w: '妈妈', p: 'māma' },
  ba: { w: '爸爸', p: 'bàba' },
  zi: { w: '桌子', p: 'zhuōzi' },
  tou: { w: '石头', p: 'shítou' },
  men: { w: '我们', p: 'wǒmen' },
  me: { w: '什么', p: 'shénme' },
  li: { w: '家里', p: 'jiāli' },
  shang: { w: '晚上', p: 'wǎnshang' },
  xia: { w: '底下', p: 'dǐxia' },
  lai: { w: '起来', p: 'qǐlai' },
  qu: { w: '出去', p: 'chūqu' },
}
for (const w of vocab) {
  const hz = w.hanzi
  if (!/^[一-龥]{2,3}$/.test(hz) || !w.pinyin) continue
  const py = pinyin(hz, { type: 'array', toneType: 'symbol' }).map((r) => r.normalize('NFC'))
  const last = py[py.length - 1]
  if (!last || strip(last) !== last) continue // âm cuối còn dấu → không phải thanh nhẹ
  const dict = w.pinyin.toLowerCase().replace(/\s+/g, '').normalize('NFC')
  if (!dict.endsWith(last)) continue
  if (!neutral[last]) neutral[last] = { w: hz, p: w.pinyin.trim() }
}

writeFileSync(new URL('generated/pinyin_chars.json', root), JSON.stringify(out))
writeFileSync(new URL('generated/pinyin_neutral.json', root), JSON.stringify(neutral))
console.log(`syllables ${syllables.length}, toned samples ${Object.keys(out).length}, neutral ${Object.keys(neutral).length}`)
console.log('mono share', Object.entries(out).filter(([k, v]) => mono.get(k) === v).length)
console.log('no sample (often no such syllable in Mandarin):', missing.length)
console.log(
  'neutral:',
  Object.entries(neutral)
    .map(([k, v]) => k + '=' + v.w)
    .join(' '),
)
