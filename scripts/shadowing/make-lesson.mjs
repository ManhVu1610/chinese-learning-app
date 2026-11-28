#!/usr/bin/env node
// Tạo bài Shadowing từ một link YouTube, tự động hết:
//   phụ đề tiếng Trung dạng chữ (yt-dlp) → tách câu → giản thể → dịch Việt → file bài. Không có phụ đề chữ → báo CẦN OCR (phụ đề in trên hình).
// Kết quả: public/shadowing/<videoId>.json + cập nhật public/shadowing/index.json (app tự hiện ở "Video có sẵn").
//
// Dùng:
//   node scripts/shadowing/make-lesson.mjs <link-youtube> [--no-translate] [--title "…"] [--playlist "…"]
//   node scripts/shadowing/make-lesson.mjs --apply <videoId>      (ghép bản dịch từ .cache/shadowing/<id>.vi.txt)
// In ra đúng MỘT dòng kết quả (để tốn ít token khi Claude chạy).
import { execFileSync, spawnSync } from 'node:child_process'
import { existsSync, mkdirSync, readFileSync, readdirSync, writeFileSync } from 'node:fs'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..', '..')
const OUT = join(ROOT, 'public', 'shadowing')
const CACHE = join(ROOT, '.cache', 'shadowing')
mkdirSync(OUT, { recursive: true })
mkdirSync(CACHE, { recursive: true })

const args = process.argv.slice(2)
const flag = (n) => args.includes(n)
const opt = (n, d) => (args.includes(n) ? args[args.indexOf(n) + 1] : d)
const die = (msg) => {
  console.log('LỖI: ' + msg)
  process.exit(1)
}

// ---------- tiện ích ----------
function videoIdOf(s) {
  if (/^[\w-]{11}$/.test(s)) return s
  try {
    const u = new URL(s)
    if (u.hostname.endsWith('youtu.be')) return u.pathname.slice(1, 12)
    return u.searchParams.get('v') || u.pathname.match(/\/(?:shorts|embed|live)\/([\w-]{11})/)?.[1] || null
  } catch {
    return null
  }
}
const has = (cmd, a = ['--version']) => spawnSync(cmd, a, { stdio: 'ignore' }).status === 0
const ytdlp = () => (has('yt-dlp') ? ['yt-dlp'] : has('python', ['-m', 'yt_dlp', '--version']) ? ['python', '-m', 'yt_dlp'] : null)
const run = (cmd, a) => execFileSync(cmd[0], [...cmd.slice(1), ...a], { encoding: 'utf8', maxBuffer: 1 << 28, stdio: ['ignore', 'pipe', 'pipe'] })
const HAN = /\p{Script=Han}/u

// ---------- 1. Lấy thông tin + chọn phụ đề ----------
function pickTrack(info) {
  const manual = Object.keys(info.subtitles || {})
  const auto = Object.keys(info.automatic_captions || {})
  const zhManual = ['zh-Hans', 'zh-CN', 'zh', 'zh-SG', 'zh-Hant', 'zh-TW', 'zh-HK'].find((l) => manual.includes(l)) || manual.find((l) => /^zh/i.test(l))
  if (zhManual) return { lang: zhManual, auto: false }
  // Phụ đề tự tạo: chỉ lấy bản gốc tiếng Trung (không lấy bản YouTube tự dịch từ tiếng khác).
  const orig = auto.find((l) => /^zh.*-orig$/i.test(l)) || (/^zh/i.test(info.language || '') ? auto.find((l) => l === info.language) : null)
  if (orig) return { lang: orig, auto: true }
  return null
}

function readJson3(file) {
  const data = JSON.parse(readFileSync(file, 'utf8'))
  const cues = []
  for (const ev of data.events || []) {
    if (!ev.segs) continue
    const text = ev.segs.map((s) => s.utf8 || '').join('').replace(/\s+/g, ' ').trim()
    if (!text) continue
    const start = (ev.tStartMs || 0) / 1000
    cues.push({ start, end: start + (ev.dDurationMs || 2000) / 1000, text })
  }
  // Phụ đề tự tạo hay chồng thời gian: cắt câu trước tại đầu câu sau.
  for (let i = 0; i < cues.length - 1; i++) cues[i].end = Math.min(cues[i].end, cues[i + 1].start)
  return cues
}

// ---------- 2. Không có phụ đề dạng chữ ----------
// Người dùng chỉ muốn lời lấy từ phụ đề (không dùng Whisper). Video có phụ đề in sẵn trên hình → dùng quy trình OCR
// (scripts/shadowing/ocr-subs.py + ocr-to-lesson.mjs, xem docs/shadowing-quy-trinh.txt).

// ---------- 3. Tách câu ----------
function toSentences(cues) {
  const out = []
  for (const c of cues) {
    const parts = c.text.match(/[^。！？!?；;…]+[。！？!?；;…]*[」』”’）)]*/g) || [c.text]
    const total = parts.reduce((n, p) => n + p.length, 0) || 1
    let t = c.start
    for (const p of parts) {
      const d = ((c.end - c.start) * p.length) / total
      out.push({ start: +t.toFixed(2), end: +(t + d).toFixed(2), text: p.trim() })
      t += d
    }
  }
  // Gộp mẩu quá ngắn (≤ 2 chữ Hán) vào câu kế bên.
  const merged = []
  for (const s of out.filter((x) => x.text)) {
    const prev = merged[merged.length - 1]
    const hanCount = [...s.text].filter((ch) => HAN.test(ch)).length
    if (prev && hanCount <= 2 && s.start - prev.end < 0.6) {
      prev.text += s.text
      prev.end = s.end
    } else merged.push({ ...s })
  }
  return merged
}

// ---------- 4. Dịch (MyMemory, miễn phí, không tốn token) ----------
async function translateAll(lines) {
  const res = new Array(lines.length).fill('')
  let i = 0
  while (i < lines.length) {
    // Gom nhiều câu vào một lượt (≤ 450 ký tự), ngăn bằng xuống dòng.
    let j = i
    let len = 0
    while (j < lines.length && len + lines[j].length + 1 <= 450) len += lines[j++].length + 1
    if (j === i) j = i + 1
    const chunk = lines.slice(i, j)
    try {
      const r = await fetch(`https://api.mymemory.translated.net/get?q=${encodeURIComponent(chunk.join('\n'))}&langpair=zh-CN|vi`)
      const d = await r.json()
      const txt = d?.responseData?.translatedText
      if (d.quotaFinished || Number(d.responseStatus) !== 200 || typeof txt !== 'string' || /MYMEMORY WARNING/i.test(txt)) break
      const got = txt.split('\n')
      if (got.length === chunk.length) got.forEach((g, k) => (res[i + k] = g.trim()))
      else if (chunk.length === 1) res[i] = txt.trim()
      else {
        // Số dòng lệch: dịch lại từng câu.
        for (let k = 0; k < chunk.length; k++) {
          const r1 = await (await fetch(`https://api.mymemory.translated.net/get?q=${encodeURIComponent(chunk[k])}&langpair=zh-CN|vi`)).json()
          if (Number(r1.responseStatus) !== 200) break
          res[i + k] = String(r1.responseData?.translatedText ?? '').trim()
        }
      }
    } catch {
      break
    }
    i = j
  }
  return res
}

// ---------- 5. Ghi file bài + danh sách ----------
function writeLesson(lesson) {
  // Dấu câu nhỏ (﹐﹒) do OCR/OpenCC sinh ra → dấu chuẩn; bỏ ký tự hỏng.
  for (const seg of lesson.segments) seg.text = seg.text.replace(/﹐/g, '，').replace(/﹒/g, '。').replace(/�/g, '').trim()
  writeFileSync(join(OUT, `${lesson.videoId}.json`), JSON.stringify(lesson))
  const idxFile = join(OUT, 'index.json')
  const idx = existsSync(idxFile) ? JSON.parse(readFileSync(idxFile, 'utf8')) : []
  const entry = { videoId: lesson.videoId, title: lesson.title, channel: lesson.channel, playlist: lesson.playlist || undefined, count: lesson.segments.length, rev: Date.now() }
  const at = idx.findIndex((x) => x.videoId === lesson.videoId)
  if (at >= 0) idx[at] = entry
  else idx.push(entry)
  writeFileSync(idxFile, JSON.stringify(idx, null, 2) + '\n')
}

// ---------- chế độ ghép bản dịch (Claude dịch phần còn thiếu) ----------
if (flag('--apply')) {
  const id = opt('--apply')
  const file = join(OUT, `${id}.json`)
  const vi = join(CACHE, `${id}.vi.txt`)
  if (!existsSync(file) || !existsSync(vi)) die(`thiếu ${file} hoặc ${vi}`)
  const lesson = JSON.parse(readFileSync(file, 'utf8'))
  let n = 0
  // Chấp nhận cả xuống dòng kiểu Windows (\r\n).
  for (const line of readFileSync(vi, 'utf8').split(/\r?\n/)) {
    const m = line.match(/^(\d+)\t(.+)$/)
    if (m && lesson.segments[+m[1]]) (lesson.segments[+m[1]].meaning = m[2].trim()), n++
  }
  writeLesson(lesson)
  console.log(`OK ${id}: ghép ${n} bản dịch.`)
  process.exit(0)
}

// ---------- dịch bù bằng MyMemory (miễn phí) cho mọi bài còn câu chưa dịch ----------
// Dùng khi hết lượt dịch trong ngày: chạy lại hôm sau, không tốn token.
if (flag('--retranslate')) {
  const files = readdirSync(OUT).filter((x) => x.endsWith('.json') && x !== 'index.json')
  let done = 0
  let left = 0
  for (const file of files) {
    const lesson = JSON.parse(readFileSync(join(OUT, file), 'utf8'))
    const idx = lesson.segments.map((s, i) => (s.meaning ? -1 : i)).filter((i) => i >= 0)
    if (!idx.length) continue
    const vi = await translateAll(idx.map((i) => lesson.segments[i].text))
    idx.forEach((i, k) => vi[k] && (lesson.segments[i].meaning = vi[k]))
    const miss = idx.filter((i) => !lesson.segments[i].meaning)
    done += idx.length - miss.length
    left += miss.length
    writeLesson(lesson)
    const todo = join(CACHE, `${lesson.videoId}.todo.txt`)
    if (miss.length) writeFileSync(todo, miss.map((i) => `${i}\t${lesson.segments[i].text}`).join('\n') + '\n')
    else if (existsSync(todo)) writeFileSync(todo, '')
    if (miss.length === idx.length) break // hết lượt dịch: dừng, để hôm sau chạy tiếp
  }
  console.log(`OK dịch thêm ${done} câu | còn ${left}+ câu chưa dịch`)
  process.exit(0)
}

// ---------- chạy chính ----------
const url = args.find((a) => !a.startsWith('--') && ![opt('--model'), opt('--title'), opt('--playlist')].includes(a))
const id = url && videoIdOf(url)
if (!id) die('cần link YouTube hợp lệ.')
const cmd = ytdlp()
if (!cmd) die('chưa cài yt-dlp (pip install yt-dlp).')

const info = JSON.parse(run(cmd, ['-J', '--skip-download', '--no-playlist', `https://www.youtube.com/watch?v=${id}`]))
let cues
let source
const track = pickTrack(info)
if (!track) {
  // Vẫn tạo bài (chưa có câu) để chạy OCR phụ đề trên hình rồi ghép vào.
  writeLesson({ videoId: id, title: opt('--title', info.title), playlist: opt('--playlist', ''), channel: info.channel || info.uploader || '', duration: info.duration || 0, source: 'pending-ocr', segments: [] })
  console.log(`CẦN OCR ${id} | video không có phụ đề dạng chữ → chạy OCR phụ đề trên hình (docs/shadowing-quy-trinh.txt) | ${info.title}`)
  process.exit(0)
}
{
  run(cmd, [
    '--skip-download',
    '--no-playlist',
    track.auto ? '--write-auto-subs' : '--write-subs',
    '--sub-langs',
    track.lang,
    '--sub-format',
    'json3',
    '-o',
    join(CACHE, '%(id)s.%(ext)s'),
    `https://www.youtube.com/watch?v=${id}`,
  ])
  const f = readdirSync(CACHE).find((x) => x.startsWith(`${id}.`) && x.endsWith('.json3'))
  if (!f) die('tải phụ đề thất bại.')
  cues = readJson3(join(CACHE, f))
  source = track.auto ? 'youtube-auto' : 'youtube'
}
if (!cues.length) die('không lấy được câu nào.')

// Phồn thể → giản thể (app dạy giản thể).
const { Converter } = await import('opencc-js')
const toCn = Converter({ from: 'hk', to: 'cn' })
let segments = toSentences(cues.map((c) => ({ ...c, text: toCn(c.text) }))).filter((s) => HAN.test(s.text))

let missing = segments.length
if (!flag('--no-translate')) {
  const vi = await translateAll(segments.map((s) => s.text))
  segments = segments.map((s, i) => ({ ...s, meaning: vi[i] || '' }))
  missing = vi.filter((v) => !v).length
}
const lesson = {
  videoId: id,
  title: opt('--title', info.title),
  playlist: opt('--playlist', ''),
  channel: info.channel || info.uploader || '',
  duration: info.duration || 0,
  source,
  segments,
}
writeLesson(lesson)

// Câu chưa dịch: ghi danh sách gọn để Claude dịch (chỉ chữ Trung, không JSON → ít token).
let note = ''
if (missing) {
  const todo = segments.map((s, i) => (s.meaning ? null : `${i}\t${s.text}`)).filter(Boolean)
  writeFileSync(join(CACHE, `${id}.todo.txt`), todo.join('\n') + '\n')
  note = ` | ${missing} câu chưa dịch → .cache/shadowing/${id}.todo.txt`
}
console.log(`OK ${id} | ${segments.length} câu | nguồn ${source} | ${lesson.title}${note}`)
