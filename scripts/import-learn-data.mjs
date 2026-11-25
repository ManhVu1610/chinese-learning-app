/**
 * Nhập dữ liệu từ app Learn (chỉ đọc) sang src/data/generated/*.json.
 * Chạy lại khi dữ liệu trong Learn thay đổi:
 *   node scripts/import-learn-data.mjs [đường-dẫn-tới-Learn/assets/data]
 */
import { readFileSync, writeFileSync, mkdirSync } from 'node:fs'
import { DatabaseSync } from 'node:sqlite'
import { dirname, join, resolve } from 'node:path'
import { fileURLToPath } from 'node:url'

const root = resolve(dirname(fileURLToPath(import.meta.url)), '..')
const learn = resolve(process.argv[2] ?? join(root, '..', '..', 'Learn', 'assets', 'data'))
const out = join(root, 'src', 'data', 'generated')
mkdirSync(out, { recursive: true })

const readJson = (f) => JSON.parse(readFileSync(join(learn, f), 'utf8'))
const firstLine = (s) => (s ?? '').split('\n').map((x) => x.trim()).filter(Boolean)

// ---------- Từ vựng chính: data-src/hsk/HSK1..6.json (bộ từ của người dùng, nằm trong Practice) ----------
// Bộ HSK 2.0 của Learn chỉ dùng để bổ sung nghĩa tiếng Anh, loại từ và giữ id cũ (để tiến độ Flashcard không mất).
const vocabSrc = readJson('hsk_2_0_vocabulary.json').entries
const learnByHanzi = new Map(vocabSrc.map((e) => [e.hanzi.trim(), e]))
const learnId = (e) => `h2-${e.level}-${e.sourceIndex}`
// id của 20 từ mẫu trong src/data/hsk.ts
const sampleIds = new Map(
  [...readFileSync(join(root, 'src', 'data', 'hsk.ts'), 'utf8').matchAll(/id: '(\d+)', hanzi: '([^']+)'/g)].map((m) => [m[2], m[1]]),
)

const vocabulary = []
const seenHanzi = new Set()
const dropped = []
for (let level = 1; level <= 6; level++) {
  const items = JSON.parse(readFileSync(join(root, 'data-src', 'hsk', `HSK${level}.json`), 'utf8'))
  items.forEach((o, i) => {
    const hanzi = String(o.word ?? '').trim()
    if (!hanzi) return
    // Trùng cả chữ lẫn cách đọc ở cấp thấp hơn thì bỏ; khác cách đọc (vd 得 de / 得 děi) thì giữ cả hai.
    const key = `${hanzi}|${String(o.reading ?? '').normalize('NFC').replace(/\s+/g, '').toLowerCase()}`
    if (seenHanzi.has(key)) {
      dropped.push(`${hanzi}(HSK${level})`)
      return
    }
    const firstOfHanzi = !vocabulary.some((w) => w.hanzi === hanzi)
    seenHanzi.add(key)
    const old = learnByHanzi.get(hanzi)
    vocabulary.push({
      id: firstOfHanzi ? (sampleIds.get(hanzi) ?? (old ? learnId(old) : `hsk${level}-${i + 1}`)) : `hsk${level}-${i + 1}`,
      hanzi,
      pinyin: String(o.reading ?? '').trim() || (old?.pinyin ?? '').trim(),
      meaning_vi: String(o.meaning ?? '').trim(),
      meaning_en: old ? firstLine(old.meaningEn).join('; ') : '',
      hsk_level: level,
      han_viet: String(o.yinHan ?? '').trim(),
      word_type: (old?.wordType || '').trim(),
      example: String(o.example ?? '').trim(),
      example_vi: String(o.exampleMeaning ?? '').trim(),
    })
  })
}
if (dropped.length) console.log(`Bỏ ${dropped.length} từ trùng ở cấp cao hơn: ${dropped.join(' ')}`)

// ---------- 214 bộ thủ ----------
const radSrc = readJson('radicals_214.json').groups
const radicals = radSrc.flatMap((g) =>
  g.items.map((i) => {
    const m = i.radical.match(/^(\S+)\s*[(（]([^)）]+)[)）]/)
    return {
      id: i.number,
      radical: m ? m[1] : i.radical.trim(),
      variants: m ? m[2].split(/[,，、\s]+/).filter(Boolean) : [],
      pinyin: i.pinyin.trim(),
      han_viet: (i.hanViet || '').trim(),
      meaning_vi: (i.meaning || '').trim(),
      strokes: g.strokes,
    }
  }),
)

// Dạng giản thể thường gặp mà bảng 214 bộ (phồn thể) không liệt kê.
const extraVariants = {
  言: ['讠'], 糸: ['纟'], 金: ['钅'], 食: ['饣', '飠'], 辵: ['辶'], 艸: ['艹'], 阜: ['阝'],
  示: ['礻'], 衣: ['衤'], 网: ['罒'], 門: ['门'], 馬: ['马'], 見: ['见'], 貝: ['贝'],
  車: ['车'], 長: ['长'], 頁: ['页'], 風: ['风'], 飛: ['飞'], 魚: ['鱼'], 鳥: ['鸟'],
  麥: ['麦'], 黃: ['黄'], 齒: ['齿'], 龍: ['龙'], 龜: ['龟'], 韋: ['韦'], 雨: ['⻗'],
}
for (const r of radicals) {
  for (const v of extraVariants[r.radical] ?? []) if (!r.variants.includes(v)) r.variants.push(v)
}

// ---------- 50 bộ thủ thường dùng (kèm từ ví dụ) ----------
// Bản sửa nằm trong Practice (scripts/fixes/), vì Learn chỉ đọc.
const fixes50 = JSON.parse(readFileSync(join(root, 'scripts', 'fixes', 'radicals50.fixes.json'), 'utf8'))
const radicals50 = readJson('radicals_50.json').items.map((i) => {
  const fix = fixes50[String(i.number)] ?? {}
  if (fix.pinyin) i = { ...i, pinyin: fix.pinyin }
  const m = i.radical.match(/^(\S+?)\s*[(（]\s*([^)）]+?)\s*[)）]/)
  const radical = m ? m[1] : i.radical.trim()
  const variants = m ? m[2].split(/[,，、\s]+/).filter(Boolean) : []
  const examples = fix.examples ?? (i.example ?? '')
    .split('\n')
    .map((line) => line.trim().match(/^(\S+)\s*[(（]([^)）]+)[)）]\s*[:：]\s*(.+)$/))
    .filter(Boolean)
    .map(([, hanzi, pinyin, meaning]) => ({ hanzi, pinyin: pinyin.trim(), meaning_vi: meaning.trim() }))
  // Nối sang bảng 214 bộ để biết số thứ tự và số nét.
  const ref = radicals.find((r) => r.radical === radical || r.variants.includes(radical) || variants.some((v) => r.radical === v))
  return {
    id: i.number,
    radical,
    variants,
    pinyin: i.pinyin.trim(),
    han_viet: (i.hanViet || '').trim(),
    meaning_vi: (i.meaning || '').trim(),
    examples,
    ref214: ref?.id ?? null,
    strokes: ref?.strokes ?? null,
  }
})

// ---------- Thông tin từng chữ: số nét + bộ thủ (cho các chữ có trong từ vựng) ----------
const decomposition = readJson('cjk_decomposition.json')
const radicalByForm = new Map()
for (const r of radicals) {
  radicalByForm.set(r.radical, r.id)
  for (const v of r.variants) if (!radicalByForm.has(v)) radicalByForm.set(v, r.id)
}

/** Tìm các bộ thủ nằm trong chữ, bằng cách tách chữ thành thành phần (đệ quy). */
function radicalsOf(ch) {
  const found = []
  const seen = new Set()
  const walk = (c, depth) => {
    if (seen.has(c) || depth > 6) return
    seen.add(c)
    const id = radicalByForm.get(c)
    if (id && !found.includes(id)) found.push(id)
    for (const part of decomposition[c] ?? []) walk(part, depth + 1)
  }
  walk(ch, 0)
  return found
}

const chars = [...new Set(vocabulary.flatMap((w) => [...w.hanzi].filter((c) => /\p{Script=Han}/u.test(c))))]
const db = new DatabaseSync(join(learn, 'hanzi_strokes.db'), { readOnly: true })
const strokeStmt = db.prepare('select stroke_count from stroke_orders where character = ?')
const charInfo = {}
for (const c of chars) {
  charInfo[c] = { s: strokeStmt.get(c)?.stroke_count ?? null, r: radicalsOf(c) }
}
db.close()

// ---------- Cách đọc từng chữ + chữ mẫu cho từng âm tiết có thanh (để phát âm bảng Pinyin) ----------
// Gom từ toàn bộ từ vựng HSK 2.0, HSK 3.0 và 1.000 thành ngữ. Pinyin viết liền ("xuéxiào")
// được tách theo bảng âm tiết hợp lệ. Chỉ chọn chữ CHỈ CÓ MỘT cách đọc làm chữ mẫu,
// để giọng đọc không đọc nhầm sang âm khác (vd 只 vừa zhī vừa zhǐ nên bị loại).
const VALID = new Set(
  `a ai an ang ao e ei en eng er o ou ba bai ban bang bao bei ben beng bi bian biao bie bin bing bo bu
  pa pai pan pang pao pei pen peng pi pian piao pie pin ping po pou pu ma mai man mang mao me mei men meng mi mian miao mie min ming miu mo mou mu
  fa fan fang fei fen feng fo fou fu da dai dan dang dao de dei den deng di dian diao die ding diu dong dou du duan dui dun duo
  ta tai tan tang tao te teng ti tian tiao tie ting tong tou tu tuan tui tun tuo na nai nan nang nao ne nei nen neng ni nian niang niao nie nin ning niu nong nou nu nuan nuo nv nve
  la lai lan lang lao le lei leng li lia lian liang liao lie lin ling liu long lou lu luan lun luo lv lve ga gai gan gang gao ge gei gen geng gong gou gu gua guai guan guang gui gun guo
  ka kai kan kang kao ke kei ken keng kong kou ku kua kuai kuan kuang kui kun kuo ha hai han hang hao he hei hen heng hong hou hu hua huai huan huang hui hun huo
  ji jia jian jiang jiao jie jin jing jiong jiu ju juan jue jun qi qia qian qiang qiao qie qin qing qiong qiu qu quan que qun xi xia xian xiang xiao xie xin xing xiong xiu xu xuan xue xun
  zha zhai zhan zhang zhao zhe zhei zhen zheng zhi zhong zhou zhu zhua zhuai zhuan zhuang zhui zhun zhuo cha chai chan chang chao che chen cheng chi chong chou chu chua chuai chuan chuang chui chun chuo
  sha shai shan shang shao she shei shen sheng shi shou shu shua shuai shuan shuang shui shun shuo ran rang rao re ren reng ri rong rou ru rua ruan rui run ruo
  za zai zan zang zao ze zei zen zeng zi zong zou zu zuan zui zun zuo ca cai can cang cao ce cen ceng ci cong cou cu cuan cui cun cuo
  sa sai san sang sao se sen seng si song sou su suan sui sun suo ya yan yang yao ye yi yin ying yo yong you yu yuan yue yun wa wai wan wang wei wen weng wo wu`
    .split(/\s+/),
)
const plain = (s) => s.normalize('NFD').replace(/ü/g, 'v').replace(/[̀-ͯ]/g, '').toLowerCase()
const toneMarked = /[āáǎàēéěèīíǐìōóǒòūúǔùǖǘǚǜ]/

/** Tách pinyin (có thể viết liền) thành đúng `count` âm tiết, giữ dấu. */
function splitPinyin(pinyin, count) {
  const parts = pinyin.toLowerCase().trim().split(/[\s'’·-]+/).filter(Boolean)
  if (parts.length === count) return parts
  const chars = [...parts.join('').normalize('NFC')]
  const p = chars.map(plain)
  const memo = new Map()
  const solve = (i, left) => {
    const key = i * 100 + left
    if (memo.has(key)) return memo.get(key)
    let res = null
    if (i === chars.length) res = left === 0 ? [] : null
    else if (left > 0)
      for (let len = Math.min(6, chars.length - i); len >= 1 && !res; len--)
        if (VALID.has(p.slice(i, i + len).join(''))) {
          const rest = solve(i + len, left - 1)
          if (rest) res = [len, ...rest]
        }
    memo.set(key, res)
    return res
  }
  const lens = solve(0, count)
  if (!lens) return null
  let i = 0
  return lens.map((len) => chars.slice(i, (i += len)).join(''))
}

/** charReadings[chữ] = { âm có thanh: số lần gặp } (không tính thanh nhẹ). */
const charReadings = {}
const firstLevel = {}
const collect = (hanzi, pinyin, level = 9) => {
  if (!hanzi || !pinyin || /[/／]/.test(hanzi + pinyin)) return
  const hs = [...hanzi].filter((c) => /\p{Script=Han}/u.test(c))
  const ps = splitPinyin(pinyin, hs.length)
  if (!ps) return
  hs.forEach((c, i) => {
    const syl = ps[i].normalize('NFC').replace(/[^a-zǜ-ͯāáǎàēéěèīíǐìōóǒòūúǔùǖǘǚǜ]/g, '')
    if (!toneMarked.test(syl)) return // thanh nhẹ: không dùng để xác định cách đọc
    const m = (charReadings[c] ??= {})
    m[syl] = (m[syl] ?? 0) + 1
    firstLevel[c] = Math.min(firstLevel[c] ?? 99, level)
  })
}
const vocab3 = readJson('hsk_3_0_vocabulary.json').entries
for (const w of vocabulary) collect(w.hanzi, w.pinyin, w.hsk_level)
for (const e of vocabSrc) collect(e.hanzi, e.pinyin, e.level)
for (const e of vocab3) collect(e.hanzi, e.pinyin, e.level)
for (const e of Object.values(readJson('idioms_1000.json'))) collect(e.text, e.pinyin, 7)

// Chữ mẫu: ưu tiên chữ chỉ có một cách đọc. Chữ đa âm chỉ được dùng khi một cách đọc chiếm ưu thế
// rõ (≥ 75% số lần gặp, gặp ít nhất 3 lần), vd 好 đọc hǎo áp đảo hào, giọng đọc cũng mặc định đọc hǎo.
// Trong cùng nhóm, ưu tiên chữ cấp HSK thấp, gặp nhiều lần.
const pinyinChars = {}
const best = {}
for (const [c, m] of Object.entries(charReadings)) {
  const readings = Object.entries(m).sort((a, b) => b[1] - a[1])
  const total = readings.reduce((n, [, k]) => n + k, 0)
  const [syl, count] = readings[0]
  const mono = readings.length === 1
  if (!mono && !(count / total >= 0.75 && count >= 3)) continue
  // Chữ thông dụng (cấp HSK thấp) được ưu tiên hơn; chữ đa âm bị trừ nhẹ so với chữ một âm cùng cấp.
  const score = firstLevel[c] * 1000 + (mono ? 0 : 500) - count
  if (!best[syl] || score < best[syl].score) best[syl] = { c, score }
}
for (const [syl, { c }] of Object.entries(best)) pinyinChars[syl] = c

for (const [c, info] of Object.entries(charInfo)) {
  const m = charReadings[c]
  if (m) info.p = Object.keys(m).sort((a, b) => m[b] - m[a])
}

// ---------- Ngữ pháp HSK 1–6 (lib/src/data/grammar_lesson_data.dart của Learn) ----------
// Learn lưu ngữ pháp trong mã Dart; đọc các chuỗi '...' ra và dựng lại đúng như cách Learn hiển thị.
const grammar = (() => {
  const src = readFileSync(join(learn, '..', '..', 'lib', 'src', 'data', 'grammar_lesson_data.dart'), 'utf8')
  const unq = (s) => s.replace(/\\(.)/g, '$1')
  const segment = (start, end) => src.slice(src.indexOf(start), end ? src.indexOf(end, src.indexOf(start)) : undefined)
  const strings = (s) => [...s.matchAll(/'((?:\\.|[^'\\])*)'/g)].map((m) => unq(m[1]))
  const lessons = []

  // HSK 1: các GrammarLesson(...) đầy đủ.
  const h1 = segment('const hsk1GrammarLessons', 'GrammarLesson _topic(')
  const tokens = [...h1.matchAll(/GrammarLesson\(|GrammarExample\(|\b(title|pattern|explanation|tip|note)\s*:|'((?:\\.|[^'\\])*)'/g)]
  let cur = null
  let key = null
  let ex = null
  for (const t of tokens) {
    if (t[0] === 'GrammarLesson(') {
      cur = { title: '', pattern: '', explanation: '', tip: '', note: '', examples: [] }
      lessons.push({ level: 1, ...cur })
      cur = lessons[lessons.length - 1]
      key = null
    } else if (t[0] === 'GrammarExample(') {
      ex = []
      cur.examples.push(ex)
      key = null
    } else if (t[1]) {
      key = t[1]
      ex = null
    } else if (t[2] !== undefined) {
      const v = unq(t[2])
      if (ex && ex.length < 3) ex.push(v)
      else if (key) cur[key] += v // chuỗi viết liền nhau trong Dart được nối lại
    }
  }
  // Learn chỉ hiển thị 46 bài đầu của HSK 1.
  const hsk1 = lessons.slice(0, 46)

  // HSK 2–4: (tiêu đề, mẫu câu, ví dụ, nghĩa ví dụ) + lời giải thích chung như Learn.
  const topic = (level, [title, pattern, example, meaning]) => ({
    level,
    title,
    pattern,
    explanation: `Chủ điểm này trình bày cách dùng ${title} trong câu tiếng Trung. Hãy chú ý vị trí của từng thành phần trong mẫu câu.`,
    tip: `Ghi nhớ theo mẫu “${pattern}” và luyện thay thế từng thành phần.`,
    note: 'Cần giữ đúng trật tự từ; lựa chọn cấu trúc phù hợp với thời gian và ngữ cảnh của câu.',
    examples: [[example, '', meaning]],
  })
  const tuples = (s) => [...s.matchAll(/\(\s*((?:'(?:\\.|[^'\\])*'\s*,?\s*){4})\)/g)].map((m) => strings(m[1]))
  const h2 = tuples(segment('final hsk2GrammarLessons', 'final hsk3GrammarLessons')).map((d) => topic(2, d))
  const h3 = tuples(segment('final hsk3GrammarLessons', 'final hsk4GrammarLessons')).map((d) => topic(3, d))
  const h4 = tuples(segment('final hsk4GrammarLessons', 'GrammarLesson _advancedTopic(')).map((d) => topic(4, d))

  // HSK 5–6: Learn chỉ có tên chủ điểm, kèm một bài tập đặt câu.
  const advanced = (level, t) => ({
    level,
    title: t,
    pattern: t,
    explanation: `Bài học trình bày ý nghĩa, vị trí và cách dùng “${t}” trong câu tiếng Trung ở trình độ nâng cao.`,
    tip: 'Ghi nhớ cấu trúc qua ngữ cảnh và tự thay chủ ngữ, động từ hoặc tân ngữ để luyện tập.',
    note: 'Chú ý sắc thái biểu cảm, văn nói hoặc văn viết của cấu trúc trước khi sử dụng.',
    examples: [[`请用“${t}”造句。`, '', `Hãy đặt câu với cấu trúc “${t}”.`]],
  })
  const h5 = strings(segment('final hsk5GrammarLessons', 'final hsk6GrammarLessons')).map((t) => advanced(5, t))
  const h6 = strings(segment('final hsk6GrammarLessons')).map((t) => advanced(6, t))

  return [...hsk1, ...h2, ...h3, ...h4, ...h5, ...h6].map((g, i) => ({
    id: `G${String(i + 1).padStart(3, '0')}`,
    level: g.level,
    title: g.title,
    structure: g.pattern,
    explanation_vi: g.explanation,
    tip: g.tip,
    note: g.note,
    examples: g.examples.map(([hanzi, pinyin, meaning_vi]) => ({ hanzi, pinyin, meaning_vi })),
  }))
})()

// ---------- Dữ liệu nét bút (thứ tự nét) cho các chữ app hiển thị ----------
// Mỗi chữ một tệp public/strokes/<mã hex>.json (định dạng của hanzi-writer: strokes, medians, radStrokes),
// trình duyệt chỉ tải khi người dùng bấm xem nét bút của chữ đó.
{
  const { inflateSync } = await import('node:zlib')
  const strokeDir = join(root, 'public', 'strokes')
  mkdirSync(strokeDir, { recursive: true })
  const wanted = new Set()
  const addHan = (s) => [...(s ?? '')].forEach((c) => /\p{Script=Han}/u.test(c) && wanted.add(c))
  vocabulary.forEach((w) => addHan(w.hanzi))
  radicals.forEach((r) => [r.radical, ...r.variants].forEach(addHan))
  radicals50.forEach((r) => [r.radical, ...r.variants, ...r.examples.map((e) => e.hanzi)].forEach(addHan))
  addHan(readFileSync(join(root, 'src', 'data', 'hsk.ts'), 'utf8'))
  const sdb = new DatabaseSync(join(learn, 'hanzi_strokes.db'), { readOnly: true })
  const get = sdb.prepare('select data_zlib from stroke_orders where character = ?')
  let n = 0
  const missing = []
  for (const c of wanted) {
    const row = get.get(c)
    if (!row) {
      missing.push(c)
      continue
    }
    const data = JSON.parse(inflateSync(Buffer.from(row.data_zlib)).toString('utf8'))
    const out = { strokes: data.strokes, medians: data.medians, ...(data.radStrokes ? { radStrokes: data.radStrokes } : {}) }
    writeFileSync(join(strokeDir, `${c.codePointAt(0).toString(16)}.json`), JSON.stringify(out))
    n++
  }
  sdb.close()
  console.log(`strokes: ${n} chữ${missing.length ? `, không có dữ liệu: ${missing.join('')}` : ''}`)
}

const write = (name, data) => {
  writeFileSync(join(out, name), JSON.stringify(data))
  console.log(`${name}: ${Array.isArray(data) ? data.length : Object.keys(data).length} mục`)
}
write('vocabulary.json', vocabulary)
write('radicals.json', radicals)
write('radicals50.json', radicals50)
write('grammar.json', grammar)
write('chars.json', charInfo)
write('pinyin_chars.json', pinyinChars)
