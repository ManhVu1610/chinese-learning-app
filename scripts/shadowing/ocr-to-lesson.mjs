#!/usr/bin/env node
// Ghép phụ đề OCR (ocr-subs.py) thành bài shadowing (chỉ dùng phụ đề trên màn hình, không dùng Whisper).
//
// Bước 1 – chuẩn bị:  node scripts/shadowing/ocr-to-lesson.mjs <videoId>
//   Đọc .cache/shadowing/ocr_<id>/ocr.json, ghi .cache/shadowing/<id>.fuse.txt, mỗi dòng: "số<TAB>giờ<TAB>độ tin cậy<TAB>chữ OCR".
//   (Sonnet đọc file này, chọn chữ đúng theo phụ đề + dịch, ghi <id>.fused.txt)
//
// Bước 2 – ghép:       node scripts/shadowing/ocr-to-lesson.mjs --apply <videoId>
//   Đọc <id>.fused.txt, mỗi dòng: "số<TAB>câu tiếng Trung<TAB>bản dịch" hoặc "số<TAB>DEL" (bỏ dòng trùng/rác),
//   ghi segments mới vào public/shadowing/<id>.json (giữ tiêu đề, playlist).
// In 1 dòng kết quả.
import { existsSync, readdirSync, readFileSync, writeFileSync } from 'node:fs'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..', '..')
const CACHE = join(ROOT, '.cache', 'shadowing')
const apply = process.argv[2] === '--apply'
const id = apply ? process.argv[3] : process.argv[2]
const ocrFile = join(CACHE, `ocr_${id}`, 'ocr.json')
const lessonFile = join(ROOT, 'public', 'shadowing', `${id}.json`)
const die = (m) => (console.log('LỖI: ' + m), process.exit(1))
if (!id || !existsSync(ocrFile) || !existsSync(lessonFile)) die(`thiếu ${ocrFile} hoặc ${lessonFile}`)

const { Converter } = await import('opencc-js')
const toCn = Converter({ from: 'hk', to: 'cn' })
const HAN = /\p{Script=Han}/gu
const hanOnly = (s) => (s.match(HAN) || []).join('')
const clean = (s) =>
  toCn(s)
    .replace(/[“”"'`~^_|<>\\]/g, '')
    .replace(/^[\s\p{P}\d.-]+/u, '')
    .replace(/[\s.,，。-]+$/u, '')
    .replace(/\s+/g, ' ')
    .trim()

function similar(a, b) {
  const A = [...hanOnly(a)]
  const B = [...hanOnly(b)]
  if (!A.length || !B.length) return 0
  const pool = new Map()
  for (const ch of B) pool.set(ch, (pool.get(ch) || 0) + 1)
  let common = 0
  for (const ch of A) if (pool.get(ch)) (common++, pool.set(ch, pool.get(ch) - 1))
  return common / Math.max(A.length, B.length)
}

// Các dòng OCR đã lọc + gộp (cùng một cách cho cả bước 1 và 2, để số dòng khớp nhau).
function ocrLines() {
  const cues = JSON.parse(readFileSync(ocrFile, 'utf8'))
    .map((c) => ({ ...c, text: clean(c.text) }))
    .filter((c) => c.keep || (hanOnly(c.text).length >= 1 && !/[：:]/.test(c.text) && c.conf >= 0.6))
  const out = []
  for (const c of cues) {
    const p = out[out.length - 1]
    const ha = p && hanOnly(p.text)
    const hb = hanOnly(c.text)
    // Cùng một dòng phụ đề đọc lại (giống ≥ 60%, hoặc dòng này nằm trọn trong dòng kia) → gộp, giữ bản tin cậy nhất / dài nhất.
    if (p && ha && hb && c.start - p.end <= 1.0 && (similar(p.text, c.text) >= 0.6 || ha.includes(hb) || hb.includes(ha))) {
      p.end = Math.max(p.end, c.end)
      if (hb.length > ha.length || (hb.length === ha.length && c.conf > p.conf)) Object.assign(p, { text: c.text, conf: c.conf })
    } else out.push({ ...c })
  }
  return out
}

const lines = ocrLines()

if (!apply) {
  // Chỉ dùng phụ đề OCR (người dùng không muốn dùng Whisper). Kèm độ tin cậy để biết dòng nào cần soát kỹ.
  // Ảnh dải phụ đề của dòng chưa chắc (ocr-subs.py lưu crop_<giờ>.png) → người soát mở ảnh đọc trực tiếp.
  const dir = join(CACHE, `ocr_${id}`)
  const crops = readdirSync(dir)
    .map((f) => f.match(/^crop_([\d.]+)\.png$/))
    .filter(Boolean)
    .map((m) => ({ t: +m[1], f: join(dir, m[0]).replace(/\\/g, '/') }))
  const rows = lines.map((c, i) => {
    const img = crops.filter((x) => x.t >= c.start - 0.05 && x.t < c.end - 0.05).map((x) => x.f)
    return [i, c.start.toFixed(1), c.conf.toFixed(2), c.text, img.join(' ')].join('\t')
  })
  writeFileSync(join(CACHE, `${id}.fuse.txt`), rows.join('\n') + '\n')
  console.log(`OK ${id} | ${lines.length} dòng → .cache/shadowing/${id}.fuse.txt`)
  process.exit(0)
}

const fusedFile = join(CACHE, `${id}.fused.txt`)
if (!existsSync(fusedFile)) die(`thiếu ${fusedFile}`)
const fixed = new Map()
for (const row of readFileSync(fusedFile, 'utf8').split(/\r?\n/)) {
  const [n, zh, vi] = row.split('\t')
  if (/^\d+$/.test(n || '')) fixed.set(+n, zh === 'DEL' ? null : { zh: (zh || '').trim(), vi: (vi || '').trim() })
}
const segments = []
let missing = 0
lines.forEach((c, i) => {
  if (!fixed.has(i)) return missing++
  const f = fixed.get(i)
  if (!f || !f.zh) return
  segments.push({ start: +c.start.toFixed(2), end: +c.end.toFixed(2), text: f.zh, meaning: f.vi })
})
const lesson = JSON.parse(readFileSync(lessonFile, 'utf8'))
lesson.segments = segments
lesson.source = 'ocr'
writeFileSync(lessonFile, JSON.stringify(lesson))
const idxFile = join(ROOT, 'public', 'shadowing', 'index.json')
const idx = JSON.parse(readFileSync(idxFile, 'utf8'))
const e = idx.find((x) => x.videoId === id)
if (e) Object.assign(e, { count: segments.length, rev: Date.now() })
writeFileSync(idxFile, JSON.stringify(idx, null, 2) + '\n')
console.log(`OK ${id}: ${segments.length} câu${missing ? ` | THIẾU ${missing} dòng trong fused.txt` : ''}`)
