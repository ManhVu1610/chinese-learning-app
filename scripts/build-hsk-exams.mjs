/**
 * Chuẩn hoá đề thi HSK (data-src/hsk-exams/hsk<cấp>/test-XX.json, chép từ folder Learn)
 * thành dữ liệu cho trang Kiểm tra: public/hsk-exams/hsk<cấp>/test-XX.json + index.json.
 *
 *   node scripts/build-hsk-exams.mjs            (đọc data-src/hsk-exams)
 *   node scripts/build-hsk-exams.mjs <thư mục>  (đọc thẳng từ thư mục khác, vd Learn/assets/data/hsk_exams)
 *
 * Việc chính: đánh lại số câu liên tục, tách số thứ tự / nhãn A B C khỏi chữ, tách đoạn văn và câu hỏi (★),
 * tách các câu cần sắp xếp, các từ cần ghép câu, từ khoá viết câu theo tranh, gom ngân hàng từ chọn điền.
 */
import fs from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..')
const srcRoot = path.resolve(process.argv[2] ?? path.join(root, 'data-src/hsk-exams'))
const outRoot = path.join(root, 'public/hsk-exams')

const LETTERS = 'ABCDEFGH'
// Đề có dữ liệu nguồn lỗi (sai loại câu, mất đoạn văn): không đưa lên trang.
// test-05, 06: đoạn văn phần Đọc hiểu bị cắt ("…"); test-07: sai loại câu, thiếu phần Nghe.
const SKIP = new Set(['hsk4/test-05.json', 'hsk4/test-06.json', 'hsk4/test-07.json'])
const stripNo = (s) => s.replace(/^\s*\d+\s*[.．、]\s*/, '').trim()
const clean = (s) =>
  (s ?? '')
    .replace(/\r/g, '')
    .replace(/[ \t]+\n/g, '\n')
    .replace(/\n{3,}/g, '\n\n')
    .trim()

/** "A 没纸了" / "A. ABC" / "ABC" → { label, text } */
function parseOption(raw, i) {
  const m = raw.trim().match(/^([A-H])(?:[.．、:：]\s*|\s+)(.+)$/s)
  if (m && m[1] === LETTERS[i]) return { label: m[1], text: m[2].trim() }
  return { label: LETTERS[i], text: raw.trim() }
}

/** Bỏ phần "选项：A … F …" / "选词填空：A … F …。" lẫn trong đề chọn điền. */
function stripInlineBank(s) {
  return s
    .replace(/选项[:：]\s*A[\s\S]*$/, '')
    .replace(/^选词填空[:：]?\s*(A\s[^。]*F\s[^。]*。)?/, '')
    .trim()
}

/** Tách "đoạn văn ★ câu hỏi". */
function splitPassage(text, type) {
  const star = text.indexOf('★')
  if (star >= 0) {
    return { passage: clean(text.slice(0, star)), question: clean(text.slice(star + 1)).replace(/^["“”]|["“”]$/g, '') }
  }
  if (type === 'reading_comprehension') {
    // Câu hỏi là mệnh đề cuối kết thúc bằng "：" hoặc "？" (vd "根据这段话，睡觉时间：").
    const m = text.match(/^([\s\S]*[。！？!?”"])\s*([^。！？!?]*[：:？?]["”]?)$/)
    if (m && m[1].length > 10) return { passage: clean(m[1]), question: clean(m[2]).replace(/["”]$/, '') }
  }
  return { passage: undefined, question: clean(text) || undefined }
}

/** Đề sắp xếp: lấy các câu A B C sau dấu ":" (hoặc cả chuỗi). */
function parseSentences(text) {
  let body = text
  const colon = body.search(/[:：]/)
  if (colon >= 0 && colon < 20) body = body.slice(colon + 1)
  const parts = body.split(/(?:^|\s+)(?=[ABC][\s　]+[^\sA-Za-z])/).map((s) => s.trim()).filter(Boolean)
  const out = []
  for (const p of parts) {
    const m = p.match(/^([ABC])[\s　]+([\s\S]+)$/)
    if (m) out.push({ label: m[1], text: m[2].trim() })
  }
  return out.length === 3 ? out : null
}

/** Đề ghép câu: các từ sau dấu ":" cách nhau bằng khoảng trắng. */
function parseWords(text) {
  const colon = text.search(/[:：]/)
  const body = (colon >= 0 ? text.slice(colon + 1) : text).trim()
  const words = body.split(/[\s　]+/).filter(Boolean)
  return words.length >= 2 && words.every((w) => /[\p{Script=Han}\d]/u.test(w)) ? words : null
}

/** Đề viết câu theo tranh: từ khoá trong “ ” hoặc sau "词语：" / "造句：". */
function parseKeyword(text) {
  const q = text.match(/[“"「]([^”"」]+)[”"」]/)
  if (q) return q[1].trim()
  const m = text.match(/(?:词语|造句|使用词语)[:：]\s*(\p{Script=Han}+)/u)
  return m ? m[1] : undefined
}

/** ".../2025/07/困-1.png" → "困" */
function keywordFromImage(url) {
  const name = decodeURIComponent((url ?? '').split('/').pop() ?? '')
  return name.match(/\p{Script=Han}+/u)?.[0]
}

function fixImage(url) {
  if (!url) return undefined
  if (url.startsWith('http://')) return 'https://' + url.slice(7)
  if (url.startsWith('https://')) return url
  return undefined // đường dẫn tương đối của nguồn gốc: không có ảnh đi kèm
}

const sectionOf = (type) => (type.startsWith('listening_') ? 'listening' : type === 'writing_construction' ? 'writing' : 'reading')

function convertPaper(raw, number, level) {
  const qs = raw.questions
  let choiceIdx = 0
  let writeIdx = 0
  const out = qs.map((q, i) => {
    const section = sectionOf(q.type)
    const text = clean(stripNo(q.text ?? ''))
    const options = (q.options ?? []).map((o, k) => parseOption(String(o), k))
    const base = {
      n: i + 1,
      type: q.type,
      section,
      answer: q.correct_answer_index,
      ...(q.audio ? { audio: q.audio } : {}),
      ...(q.transcript ? { transcript: clean(q.transcript) } : {}),
      ...(fixImage(q.image) ? { image: fixImage(q.image) } : {}),
      ...(q.explanation ? { explanation: clean(q.explanation) } : {}),
    }
    if (q.type === 'listening_true_false') {
      return { ...base, part: 1, statement: text.replace(/^★\s*/, '') || undefined, options: [{ label: '✓', text: '对' }, { label: '✗', text: '错' }] }
    }
    if (q.type === 'listening_choice') {
      const part = choiceIdx++ < 15 ? 2 : 3
      const { passage, question } = splitPassage(text, q.type)
      return { ...base, part, passage, question, options }
    }
    if (q.type === 'reading_ordering') {
      const sentences = parseSentences(text)
      const orders = options.map((o) => o.text.replace(/[^ABC]/g, ''))
      return { ...base, part: 2, sentences, orders, options }
    }
    if (q.type === 'fill_in_blank') {
      const t = stripInlineBank(text)
      const { passage, question } = t.includes('★') ? splitPassage(t, q.type) : { passage: undefined, question: t }
      return { ...base, part: passage ? 3 : 1, passage, question, options }
    }
    if (q.type === 'reading_comprehension') {
      const { passage, question } = splitPassage(text, q.type)
      return { ...base, part: 3, passage, question, options }
    }
    // writing_construction
    const part = writeIdx++ < 10 ? 1 : 2
    const refs = options.map((o) => o.text)
    const keyword = part === 2 ? (parseKeyword(text) ?? keywordFromImage(q.image)) : undefined
    // Phần 2: các câu đều là câu mẫu khi nguồn ghi rõ, hoặc khi câu nào cũng dùng từ khoá.
    const allCorrect =
      /都是对的|都对|参考/.test(text + (q.note ?? '')) || (!!keyword && refs.every((r) => r.includes(keyword)))
    const prompt = text.replace(/下面每个选项都是对的.*$/, '').replace(/[（(]图片[^）)]*[）)]/, '').trim()
    return {
      ...base,
      part,
      prompt,
      ...(part === 1 ? { words: parseWords(text) ?? undefined } : { keyword }),
      // Câu đáp án chấm tự động (phần 1) và các câu tham khảo (phần 2).
      accepted: part === 1 ? [refs[q.correct_answer_index]] : allCorrect ? refs : [refs[q.correct_answer_index]],
    }
  })

  // Gom các câu chọn điền liền nhau dùng chung một danh sách từ (ngân hàng từ như đề thật).
  let bank = 0
  for (let i = 0; i < out.length; i++) {
    const q = out[i]
    if (q.type !== 'fill_in_blank' || q.passage) continue
    const key = q.options.map((o) => o.text).join('|')
    const prev = out[i - 1]
    if (prev && prev.type === 'fill_in_blank' && !prev.passage && prev.bankKey === key) q.bank = prev.bank
    else q.bank = ++bank
    q.bankKey = key
  }
  for (const q of out) delete q.bankKey

  const code = raw.title.match(/H\d{5}/)?.[0]
  const official = /Official/i.test(raw.title)
  const count = (s) => out.filter((q) => q.section === s).length
  return {
    id: `hsk${level}-${String(number).padStart(2, '0')}`,
    level,
    number,
    title: raw.title,
    code,
    official,
    partial: /Partial/i.test(raw.title) || out.length < 100,
    source: raw.source,
    audio: out.some((q) => q.audio) ? 'file' : 'tts',
    counts: { listening: count('listening'), reading: count('reading'), writing: count('writing') },
    questions: out,
  }
}

const index = []
for (const dir of fs.readdirSync(srcRoot).sort()) {
  const level = Number(dir.match(/^hsk(\d)$/)?.[1])
  if (!level) continue
  fs.mkdirSync(path.join(outRoot, dir), { recursive: true })
  for (const file of fs.readdirSync(path.join(srcRoot, dir)).sort()) {
    const number = Number(file.match(/^test-(\d+)\.json$/)?.[1])
    if (!number) continue
    const raw = JSON.parse(fs.readFileSync(path.join(srcRoot, dir, file), 'utf8'))
    if (SKIP.has(`${dir}/${file}`)) {
      console.log(`${dir}/${file}: bỏ qua (dữ liệu nguồn lỗi)`)
      continue
    }
    const paper = convertPaper(raw, number, level)
    fs.writeFileSync(path.join(outRoot, dir, file), JSON.stringify(paper))
    const { questions, ...meta } = paper
    index.push({ ...meta, file: `/hsk-exams/${dir}/${file}` })
    const warn = questions.filter(
      (q) => (q.type === 'reading_ordering' && !q.sentences) || (q.section === 'writing' && q.part === 1 && !q.words),
    )
    console.log(`${paper.id}: ${questions.length} câu${warn.length ? `, cần xem lại: ${warn.map((q) => q.n).join(', ')}` : ''}`)
  }
}
fs.writeFileSync(path.join(outRoot, 'index.json'), JSON.stringify(index, null, 1))
console.log(`Đã ghi ${index.length} đề vào public/hsk-exams`)
