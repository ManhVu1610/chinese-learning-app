// Đọc tài liệu chủ đề từ vựng (data-src/topics/*.md, do người dùng cung cấp) thành public/games/topics.json
// cho các màn chơi của trò Xếp từ. Định dạng tài liệu:
//   ## HSK 1 (...)
//   ### 7. Ăn uống & Đồ uống (饮食)
//   1. 吃 (chī): Ăn
// Chạy: node scripts/build-topics.mjs
import { mkdirSync, readdirSync, readFileSync, writeFileSync } from 'node:fs'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'
import { pinyin } from 'pinyin-pro'

const root = join(dirname(fileURLToPath(import.meta.url)), '..')
const dir = join(root, 'data-src', 'topics')
const topics = []
const problems = []

for (const file of readdirSync(dir).filter((f) => f.endsWith('.md')).sort()) {
  let level = 0
  let cur = null
  readFileSync(join(dir, file), 'utf8')
    .split(/\r?\n/)
    .forEach((raw, i) => {
      const line = raw.trim()
      let m
      if ((m = line.match(/^## HSK (\d)/))) level = Number(m[1])
      else if ((m = line.match(/^### (\d+)\. (.+?) \(([^()]+)\)\s*$/))) {
        // Chủ đề đã có (tệp bổ sung ghi lại cùng số) thì thêm từ vào chủ đề đó, không tạo chủ đề mới.
        cur = topics.find((t) => t.id === Number(m[1])) ?? null
        if (!cur) {
          cur = { id: Number(m[1]), hsk: level, vi: m[2].trim(), zh: m[3].trim(), words: [] }
          topics.push(cur)
        }
      } else if ((m = line.match(/^\d+\. (\S.*?) \(([^)]+)\): (.+)$/)) && cur) {
        cur.words.push([m[1].trim(), m[2].trim(), m[3].trim()])
      } else if (/^\d+\. /.test(line)) problems.push(`${file}:${i + 1} ${line}`)
    })
}

// Nghĩa tiếng Anh: data-src/topics/en-*.tsv ("#số" = tên chủ đề), thiếu thì lấy meaning_en trong vocabulary.json.
const en = new Map()
for (const file of readdirSync(dir).filter((f) => /^en-.*\.tsv$/.test(f)))
  for (const line of readFileSync(join(dir, file), 'utf8').split(/\r?\n/)) {
    const [k, v] = line.split('\t')
    if (k && v && !(k.startsWith('#') && !/^#\d+$/.test(k))) en.set(k.trim(), v.trim())
  }
const vocab = JSON.parse(readFileSync(join(root, 'src', 'data', 'generated', 'vocabulary.json'), 'utf8'))
const vocabEn = new Map()
for (const w of vocab)
  if (w.meaning_en?.trim() && !vocabEn.has(w.hanzi)) vocabEn.set(w.hanzi, w.meaning_en.split(/[;\n]/).slice(0, 2).join('; ').trim())
const missingEn = []

topics.sort((a, b) => a.id - b.id)
for (const t of topics) {
  // Bỏ từ trùng trong cùng một chủ đề.
  const seen = new Set()
  t.words = t.words.filter(([h]) => !seen.has(h) && seen.add(h))
  t.en = en.get(`#${t.id}`) ?? ''
  // Pinyin của tên chủ đề (tiếng Trung), tạo bằng pinyin-pro; dấu 与 giữ nguyên chữ.
  t.py = pinyin(t.zh).replace(/\s+/g, ' ').trim()
  if (!t.en) missingEn.push(`#${t.id}`)
  for (const w of t.words) {
    const e = en.get(w[0]) ?? vocabEn.get(w[0]) ?? ''
    if (!e) missingEn.push(w[0])
    w.push(e)
  }
}
mkdirSync(join(root, 'public', 'games'), { recursive: true })
writeFileSync(join(root, 'public', 'games', 'topics.json'), JSON.stringify(topics))
const byLevel = [1, 2, 3, 4, 5, 6].map((l) => topics.filter((t) => t.hsk === l).length)
console.log(`topics: ${topics.length} chủ đề, ${topics.reduce((n, t) => n + t.words.length, 0)} từ; theo HSK ${byLevel.join('/')}`)
const short = topics.filter((t) => t.words.length < 10)
if (short.length) console.log('chủ đề ít hơn 10 từ:', short.map((t) => `${t.id}(${t.words.length})`).join(' '))
if (missingEn.length) console.log('thiếu nghĩa tiếng Anh:', missingEn.join(' '))
if (problems.length) console.log('dòng không đọc được:\n' + problems.join('\n'))
