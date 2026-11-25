/**
 * Tạo font web nhỏ gọn từ font gốc trong fonts-src/ (không đưa lên git):
 *  - Playpen Sans (chữ Việt, Anh, pinyin): chỉ giữ ký tự Latin + tiếng Việt + dấu thanh pinyin.
 *  - LXGW WenKai (chữ Hán, giấy phép SIL OFL 1.1): chỉ giữ những chữ Hán app thực sự hiển thị, chia 2 phần theo độ thông dụng.
 * Mỗi phần có unicode-range riêng nên trình duyệt chỉ tải phần cần cho trang đang xem.
 * Chạy lại sau khi thêm dữ liệu: node scripts/build-fonts.mjs
 */
import { mkdirSync, readFileSync, readdirSync, statSync, writeFileSync } from 'node:fs'
import { dirname, join, resolve } from 'node:path'
import { fileURLToPath } from 'node:url'
import subsetFont from 'subset-font'

const root = resolve(dirname(fileURLToPath(import.meta.url)), '..')
const srcDir = join(root, 'fonts-src')
const outDir = join(root, 'public', 'fonts')
mkdirSync(outDir, { recursive: true })

const isHan = (c) => /\p{Script=Han}/u.test(c)
const hanOf = (s) => [...s].filter(isHan)

// ---------- Ký tự Latin / tiếng Việt / pinyin ----------
const ranges = [
  [0x20, 0x7e], // ASCII
  [0xa0, 0xff], // Latin-1 (à á â ã è é ê ì í ò ó ô õ ù ú ý ü …)
  [0x102, 0x103], [0x110, 0x111], [0x128, 0x129], [0x168, 0x169], [0x1a0, 0x1a1], [0x1af, 0x1b0], // ă đ ĩ ũ ơ ư
  [0x1ea0, 0x1ef9], // tiếng Việt có dấu (ạ ả ấ … ỹ)
  [0x300, 0x303], [0x309, 0x309], [0x323, 0x323], // dấu tổ hợp
  [0x2010, 0x2027], [0x2030, 0x203a], [0x20ab, 0x20ac], [0x2190, 0x2193], [0x2212, 0x2212], [0x2713, 0x2713], // – — ‘ ’ “ ” … • ₫ € → ✓
]
const pinyinExtra = 'āáǎàēéěèīíǐìōóǒòūúǔùǖǘǚǜüÜĀÁǍÀĒÉĚÈĪÍǏÌŌÓǑÒŪÚǓÙ'
let latin = pinyinExtra
for (const [a, b] of ranges) for (let c = a; c <= b; c++) latin += String.fromCodePoint(c)

// ---------- Chữ Hán app hiển thị ----------
const vocab = JSON.parse(readFileSync(join(root, 'src/data/generated/vocabulary.json'), 'utf8'))
const radicals = JSON.parse(readFileSync(join(root, 'src/data/generated/radicals.json'), 'utf8'))
const samples = JSON.parse(readFileSync(join(root, 'src/data/generated/pinyin_chars.json'), 'utf8'))

/** Đọc mọi tệp mã nguồn (trừ dữ liệu sinh tự động) để lấy chữ Hán trong giao diện, ngữ pháp, từ mẫu… */
function walk(dir, out = []) {
  for (const name of readdirSync(dir)) {
    const p = join(dir, name)
    if (statSync(p).isDirectory()) {
      if (name !== 'generated') walk(p, out)
    } else if (/\.(tsx?|json)$/.test(name)) out.push(readFileSync(p, 'utf8'))
  }
  return out
}

// Chia chữ Hán thành 3 phần theo cấp HSK: trang nào chỉ có chữ thông dụng thì chỉ tải phần 1.
const parts = [new Set(), new Set(), new Set()] // 1: HSK1–2 + giao diện; 2: HSK3–4 + bộ thủ; 3: HSK5–6
const partOf = (level) => (level <= 2 ? 0 : level <= 4 ? 1 : 2)
for (const src of walk(join(root, 'src'))) hanOf(src).forEach((c) => parts[0].add(c))
for (const c of Object.values(samples)) parts[0].add(c)
for (const w of vocab) [w.hanzi, w.example ?? ''].forEach((s) => hanOf(s).forEach((c) => parts[partOf(w.hsk_level)].add(c)))
for (const r of radicals) [r.radical, ...r.variants].forEach((s) => hanOf(s).forEach((c) => parts[1].add(c)))
const radicals50 = JSON.parse(readFileSync(join(root, 'src/data/generated/radicals50.json'), 'utf8'))
for (const r of radicals50)
  [r.radical, ...r.variants, ...r.examples.map((e) => e.hanzi)].forEach((s) => hanOf(s).forEach((c) => parts[1].add(c)))
const grammar = JSON.parse(readFileSync(join(root, 'src/data/generated/grammar.json'), 'utf8'))
for (const g of grammar)
  [g.title, g.structure, g.explanation_vi, g.tip ?? '', g.note ?? '', ...g.examples.map((e) => e.hanzi)].forEach((s) =>
    hanOf(s).forEach((c) => parts[partOf(g.level)].add(c)),
  )
// Mỗi chữ chỉ nằm ở phần thấp nhất chứa nó.
for (const c of parts[0]) { parts[1].delete(c); parts[2].delete(c) }
for (const c of parts[1]) parts[2].delete(c)

// Dấu câu tiếng Trung đi cùng phần 1.
const cjkPunct = '。，、？！：；“”‘’（）《》〈〉【】…—·「」～'

const toRange = (chars) => {
  const cps = [...new Set([...chars].map((c) => c.codePointAt(0)))].sort((a, b) => a - b)
  const parts = []
  for (let i = 0; i < cps.length; ) {
    let j = i
    while (j + 1 < cps.length && cps[j + 1] === cps[j] + 1) j++
    const hex = (n) => n.toString(16).toUpperCase()
    parts.push(i === j ? `U+${hex(cps[i])}` : `U+${hex(cps[i])}-${hex(cps[j])}`)
    i = j + 1
  }
  return parts.join(', ')
}

async function build(srcFile, outFile, text, opts = {}) {
  const buf = await subsetFont(readFileSync(join(srcDir, srcFile)), text, { targetFormat: 'woff2', ...opts })
  writeFileSync(join(outDir, outFile), buf)
  console.log(`${outFile}: ${[...new Set(text)].length} ký tự, ${(buf.length / 1024).toFixed(0)} KB`)
}

// noLayoutClosure: không kéo theo glyph thay thế/ghép chữ không dùng tới (giảm ~75% dung lượng Playpen).
// noHinting: bỏ dữ liệu hinting (màn hình hiện đại không cần).
// wght 400–800: app chỉ dùng chữ thường → đậm nhất (font-normal … font-extrabold).
const lean = { noLayoutClosure: true, noHinting: true }
await build('PlaypenSans-Variable.ttf', 'playpen-sans.woff2', latin, { ...lean, variationAxes: { wght: { min: 400, max: 800 } } })
const texts = parts.map((p, i) => [...p].join('') + (i === 0 ? cjkPunct : ''))
for (const [i, text] of texts.entries()) await build('LXGWWenKai-Regular.ttf', `kai-${i + 1}.woff2`, text, lean)

// CSS @font-face với unicode-range để trình duyệt chỉ tải phần cần.
const css = `/* Sinh tự động bởi scripts/build-fonts.mjs — không sửa tay. */
@font-face {
  font-family: 'Playpen Sans';
  src: url('/fonts/playpen-sans.woff2') format('woff2');
  font-weight: 400 800;
  font-display: swap;
  unicode-range: ${toRange(latin)};
}
${texts.map((text, i) => `@font-face {
  font-family: 'App Kai';
  src: url('/fonts/kai-${i + 1}.woff2') format('woff2');
  font-display: swap;
  unicode-range: ${toRange(text)};
}`).join('\n')}
`
writeFileSync(join(root, 'src', 'fonts.css'), css)
console.log('src/fonts.css: đã ghi')
