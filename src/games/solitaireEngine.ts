/**
 * Luật và bộ giải cho trò Xếp từ (kiểu solitaire theo nhóm). Thuần dữ liệu, không phụ thuộc React,
 * để giao diện và bộ giải dùng chung một luật. Mô tả đầy đủ: docs/games/xep-tu.md
 */
import type { Word } from '../types'
import { han, shuffle } from './util'

export interface Category {
  id: number
  /** Nhãn thẻ nhóm: tên loại từ, hoặc chữ Hán chung */
  title: string
  sub?: string
  /** tên nhóm tiếng Anh (nếu có) */
  subEn?: string
  /** pinyin của tên nhóm (nếu tên là tiếng Trung) */
  pinyin?: string
  words: Word[]
}

export interface SCard {
  id: string
  cat: number
  /** 'cat' = thẻ nhóm (mở ô đích), 'word' = thẻ từ */
  kind: 'cat' | 'word'
  word?: Word
  up: boolean
}

export interface Slot {
  cat: number
  count: number
  /** thẻ từ vừa đặt vào (để hiện lên mặt ô) */
  last?: SCard
}

export interface State {
  cols: SCard[][]
  stock: SCard[]
  waste: SCard[]
  slots: (Slot | null)[]
  done: number[]
  moves: number
}

export type Source = { type: 'waste' } | { type: 'col'; col: number; index: number }
export type Target = { type: 'slot'; slot: number } | { type: 'col'; col: number }
export type Move = { kind: 'draw' } | { kind: 'move'; from: Source; to: Target }

export type Level = 'easy' | 'normal' | 'hard'
/**
 * cats nhóm (ngẫu nhiên từ cats tới catsMax nếu có) × size từ (hoặc mỗi nhóm lấy ngẫu nhiên một cỡ trong sizes);
 * cols cột, cột thứ i được chia (first + i) thẻ; slots ô đích.
 */
export interface LevelConfig {
  cats: number
  catsMax?: number
  size: number
  sizes?: number[]
  cols: number
  first: number
  slots: number
}
const cfgOf = (l: Level | LevelConfig): LevelConfig => (typeof l === 'string' ? LEVELS[l] : l)

export const LEVELS: Record<Level, LevelConfig> = {
  easy: { cats: 3, catsMax: 4, size: 3, sizes: [3, 4], cols: 3, first: 1, slots: 3 },
  normal: { cats: 5, catsMax: 6, size: 4, sizes: [3, 4, 5, 6], cols: 4, first: 3, slots: 4 },
  hard: { cats: 6, catsMax: 8, size: 5, sizes: [4, 5, 6, 8], cols: 5, first: 3, slots: 4 },
}

export type Grouping = 'type' | 'char' | 'set'

/* ---------- Tạo nhóm từ nguồn ---------- */

const typeOf = (w: Word) => (w.word_types?.[0] ?? w.word_type ?? '').trim()

/** Cỡ nhóm ngẫu nhiên trong các cỡ cho phép mà nhóm còn đủ từ; 0 = không đủ cho cỡ nào. */
const pickSize = (sizes: number[], available: number) => {
  const ok = sizes.filter((x) => x <= available)
  return ok.length ? ok[Math.floor(Math.random() * ok.length)] : 0
}

/** Chọn nhóm từ một bảng tên nhóm → từ; mỗi chữ Hán chỉ thuộc một nhóm, mỗi nhóm một cỡ ngẫu nhiên. */
function fromGroups(entries: [string, Word[]][], cats: number, sizes: number[]): Category[] {
  const seen = new Set<string>()
  const groups: [string, Word[]][] = []
  for (const [title, ws] of shuffle(entries)) {
    const cand: Word[] = []
    for (const w of shuffle(ws)) {
      const h = han(w)
      if (!h || seen.has(h) || cand.some((x) => han(x) === h)) continue
      cand.push(w)
    }
    const size = pickSize(sizes, cand.length)
    if (!size) continue
    const list = cand.slice(0, size)
    list.forEach((w) => seen.add(han(w)))
    groups.push([title, list])
    if (groups.length === cats) break
  }
  return groups.map(([title, words], id) => ({ id, title, words }))
}

/** Nhóm theo loại từ (Danh từ, Động từ…). */
function byType(pool: Word[], cats: number, sizes: number[]): Category[] {
  const groups = new Map<string, Word[]>()
  for (const w of pool) {
    const k = typeOf(w)
    if (k) groups.set(k, [...(groups.get(k) ?? []), w])
  }
  // Tên nhóm hiển thị bằng tiếng Trung (pinyin, tên tiếng Việt và tiếng Anh ở mặt sau thẻ).
  return fromGroups([...groups], cats, sizes).map((c) => {
    const zh = WORD_TYPE_ZH[c.title]
    return zh ? { ...c, title: zh[0], pinyin: zh[1], sub: c.title, subEn: zh[2] } : c
  })
}

/** Loại từ tiếng Việt → [tên tiếng Trung, pinyin, tên tiếng Anh]. */
const WORD_TYPE_ZH: Record<string, [string, string, string]> = {
  'Danh từ': ['名词', 'míngcí', 'noun'],
  'Động từ': ['动词', 'dòngcí', 'verb'],
  'Tính từ': ['形容词', 'xíngróngcí', 'adjective'],
  'Phó từ': ['副词', 'fùcí', 'adverb'],
  'Đại từ': ['代词', 'dàicí', 'pronoun'],
  'Số từ': ['数词', 'shùcí', 'numeral'],
  'Lượng từ': ['量词', 'liàngcí', 'measure word'],
  'Giới từ': ['介词', 'jiècí', 'preposition'],
  'Liên từ': ['连词', 'liáncí', 'conjunction'],
  'Trợ từ': ['助词', 'zhùcí', 'particle'],
  'Thán từ': ['叹词', 'tàncí', 'interjection'],
  'Từ tượng thanh': ['拟声词', 'nǐshēngcí', 'onomatopoeia'],
  'Cụm từ': ['短语', 'duǎnyǔ', 'phrase'],
  'Thành ngữ': ['成语', 'chéngyǔ', 'idiom'],
  'Trợ động từ': ['助动词', 'zhùdòngcí', 'auxiliary verb'],
}

/** Nhóm theo chữ Hán chung: 学 → 学生, 学校, 同学… Mỗi từ chỉ chứa đúng một chữ nhóm để không lẫn. */
function byChar(pool: Word[], cats: number, sizes: number[]): Category[] {
  const minSize = Math.min(...sizes)
  const words = pool.filter((w) => han(w).length >= 2)
  const index = new Map<string, Word[]>()
  for (const w of words) for (const ch of new Set(han(w))) index.set(ch, [...(index.get(ch) ?? []), w])
  const chosen: string[] = []
  const out: Category[] = []
  const used = new Set<string>()
  for (const [ch] of shuffle([...index].filter(([, ws]) => ws.length >= minSize))) {
    if (out.length === cats) break
    const ok = index
      .get(ch)!
      .filter((w) => !used.has(han(w)) && !chosen.some((c) => han(w).includes(c)))
      .filter((w, i, arr) => arr.findIndex((x) => han(x) === han(w)) === i)
    const size = pickSize(sizes, ok.length)
    if (!size) continue
    // Từ đã chọn của nhóm trước không được chứa chữ của nhóm này.
    if (out.some((c) => c.words.some((w) => han(w).includes(ch)))) continue
    const picked = shuffle(ok).slice(0, size)
    picked.forEach((w) => used.add(han(w)))
    chosen.push(ch)
    const single = pool.find((w) => han(w) === ch)
    out.push({ id: out.length, title: ch, sub: single?.meaning_vi ?? single?.pinyin, words: picked })
  }
  return out
}

/**
 * Tạo các nhóm cho một ván. `topics` = các chủ đề có sẵn (vd các bộ từ trong Sổ tay: tên bộ → từ), dùng cho cách
 * chia 'set'.
 */
export function buildCategories(pool: Word[], grouping: Grouping, level: Level, topics: [string, Word[]][] = []): Category[] {
  const cfg = LEVELS[level]
  // Số nhóm và cỡ từng nhóm ngẫu nhiên trong khoảng của mức độ.
  const cats = cfg.cats + Math.floor(Math.random() * ((cfg.catsMax ?? cfg.cats) - cfg.cats + 1))
  const sizes = cfg.sizes ?? [cfg.size]
  if (grouping === 'set') {
    const a = fromGroups(topics, cats, sizes)
    if (a.length >= cats) return a
    const b = byType(pool, cats, sizes)
    return b.length > a.length ? b : a
  }
  const first = grouping === 'type' ? byType : byChar
  const second = grouping === 'type' ? byChar : byType
  const a = first(pool, cats, sizes)
  if (a.length >= cats) return a
  // Không đủ nhóm theo cách đã chọn: thử cách còn lại, lấy cách cho nhiều nhóm hơn.
  const b = second(pool, cats, sizes)
  return b.length > a.length ? b : a
}

/* ---------- Luật ---------- */

const clone = (s: State): State => ({
  cols: s.cols.map((c) => c.map((x) => ({ ...x }))),
  stock: s.stock.map((x) => ({ ...x })),
  waste: s.waste.map((x) => ({ ...x })),
  slots: s.slots.map((x) => (x ? { ...x } : null)),
  done: [...s.done],
  moves: s.moves,
})

export function deal(categories: Category[], level: Level | LevelConfig): State {
  const { cols, first, slots } = cfgOf(level)
  const cards: SCard[] = categories.flatMap((c) => [
    { id: `c${c.id}`, cat: c.id, kind: 'cat' as const, up: false },
    ...c.words.map((w, i) => ({ id: `w${c.id}-${i}`, cat: c.id, kind: 'word' as const, word: w, up: false })),
  ])
  const deck = shuffle(cards)
  const tableau: SCard[][] = Array.from({ length: cols }, (_, i) => deck.splice(0, first + i))
  tableau.forEach((col) => (col[col.length - 1].up = true))
  return { cols: tableau, stock: deck, waste: [], slots: Array(slots).fill(null), done: [], moves: 0 }
}

/** Các thẻ sẽ được nhấc lên từ một nguồn, hoặc null nếu không nhấc được. */
export function pickUp(s: State, from: Source): SCard[] | null {
  if (from.type === 'waste') return s.waste.length ? [s.waste[s.waste.length - 1]] : null
  const col = s.cols[from.col]
  const run = col.slice(from.index)
  if (!run.length || run.some((c) => !c.up)) return null
  // Một chồng phải cùng nhóm; thẻ nhóm chỉ được nằm dưới cùng của chồng.
  if (run.some((c) => c.cat !== run[0].cat) || run.slice(1).some((c) => c.kind === 'cat')) return null
  return run
}

export function canDrop(s: State, run: SCard[], to: Target, cats: Category[]): boolean {
  if (to.type === 'slot') {
    const slot = s.slots[to.slot]
    if (!slot) return run[0].kind === 'cat'
    const size = cats[slot.cat].words.length
    return run.every((c) => c.kind === 'word' && c.cat === slot.cat) && slot.count + run.length <= size
  }
  const col = s.cols[to.col]
  if (!col.length) return true
  const top = col[col.length - 1]
  return top.up && top.cat === run[0].cat && run[0].kind === 'word'
}

export function applyMove(s: State, m: Move, cats: Category[]): State | null {
  const n = clone(s)
  if (m.kind === 'draw') {
    if (n.stock.length) {
      const c = n.stock.pop()!
      c.up = true
      n.waste.push(c)
    } else if (n.waste.length) {
      n.stock = n.waste.reverse().map((c) => ({ ...c, up: false }))
      n.waste = []
    } else return null
    n.moves++
    return n
  }
  const run = pickUp(n, m.from)
  if (!run || !canDrop(n, run, m.to, cats)) return null
  if (m.from.type === 'waste') n.waste.pop()
  else {
    const col = n.cols[m.from.col]
    col.splice(m.from.index)
    if (col.length) col[col.length - 1].up = true
  }
  if (m.to.type === 'col') n.cols[m.to.col].push(...run)
  else {
    const i = m.to.slot
    for (const c of run) {
      if (c.kind === 'cat') n.slots[i] = { cat: c.cat, count: 0 }
      else n.slots[i] = { ...n.slots[i]!, count: n.slots[i]!.count + 1, last: c }
    }
    const slot = n.slots[i]!
    if (slot.count === cats[slot.cat].words.length) {
      n.done.push(slot.cat)
      n.slots[i] = null
    }
  }
  n.moves++
  return n
}

export const isWon = (s: State, cats: Category[]) => s.done.length === cats.length

/* ---------- Bộ giải (dùng để chia bài giải được và để gợi ý) ---------- */

const keyOf = (s: State) =>
  [
    s.cols.map((c) => c.map((x) => (x.up ? x.id : '_' + x.id)).join(',')).join('|'),
    s.stock.map((x) => x.id).join(','),
    s.waste.map((x) => x.id).join(','),
    s.slots.map((x) => (x ? `${x.cat}:${x.count}` : '-')).join(','),
  ].join('#')

/** Mọi nước đi hợp lệ, xếp theo độ ưu tiên (đưa lên ô đích trước, rút bài sau cùng). */
export function legalMoves(s: State, cats: Category[]): Move[] {
  const sources: Source[] = []
  if (s.waste.length) sources.push({ type: 'waste' })
  s.cols.forEach((col, ci) => {
    for (let i = 0; i < col.length; i++) if (pickUp(s, { type: 'col', col: ci, index: i })) sources.push({ type: 'col', col: ci, index: i })
  })
  const toSlot: Move[] = []
  const toCol: Move[] = []
  for (const from of sources) {
    const run = pickUp(s, from)!
    s.slots.forEach((_, i) => {
      if (canDrop(s, run, { type: 'slot', slot: i }, cats)) toSlot.push({ kind: 'move', from, to: { type: 'slot', slot: i } })
    })
    s.cols.forEach((col, ci) => {
      if (from.type === 'col' && from.col === ci) return
      if (from.type === 'col') {
        // Dời cả cột sang cột trống là vô ích; tách một chồng cùng nhóm cũng vậy.
        if (!col.length && from.index === 0) return
        const below = s.cols[from.col][from.index - 1]
        if (below && below.up && below.cat === run[0].cat) return
      }
      if (canDrop(s, run, { type: 'col', col: ci }, cats)) toCol.push({ kind: 'move', from, to: { type: 'col', col: ci } })
    })
  }
  const draws: Move[] = s.stock.length || s.waste.length ? [{ kind: 'draw' }] : []
  return [...toSlot, ...toCol, ...draws]
}

/** Tìm một lời giải bằng tìm kiếm theo chiều sâu có ghi nhớ. Trả về dãy nước đi hoặc null (không thấy trong giới hạn). */
export function solve(start: State, cats: Category[], limit = 40000): Move[] | null {
  const seen = new Set<string>()
  const path: Move[] = []
  let budget = limit
  const dfs = (s: State): boolean => {
    if (isWon(s, cats)) return true
    if (--budget <= 0 || path.length > 400) return false
    const k = keyOf(s)
    if (seen.has(k)) return false
    seen.add(k)
    for (const m of legalMoves(s, cats)) {
      const n = applyMove(s, m, cats)
      if (!n) continue
      path.push(m)
      if (dfs(n)) return true
      path.pop()
      if (budget <= 0) return false
    }
    return false
  }
  return dfs(start) ? path : null
}

/**
 * Lời giải ngắn: tìm theo chùm (beam search) — mỗi bước chỉ giữ `width` (100) thế cờ tốt nhất, chấm theo số thẻ đã lên
 * ô đích (nhiều là tốt) và số thẻ còn úp (ít là tốt). Nhanh (~0,1 s) và thường ngắn hơn tìm theo chiều sâu,
 * nhưng không chắc là ngắn nhất tuyệt đối. Trả về dãy nước đi hoặc null.
 */
export function shortestPath(start: State, cats: Category[], width = 100, maxDepth = 260): Move[] | null {
  const progress = (s: State) => {
    let placed = 0
    for (const c of s.done) placed += cats[c].words.length + 1
    for (const sl of s.slots) if (sl) placed += sl.count + 1
    let down = 0
    for (const c of s.cols) for (const x of c) if (!x.up) down++
    return placed * 10 - down * 3
  }
  if (isWon(start, cats)) return []
  let layer: { s: State; path: Move[] }[] = [{ s: start, path: [] }]
  const seen = new Set([keyOf(start)])
  for (let depth = 1; depth <= maxDepth; depth++) {
    const next: { s: State; path: Move[]; p: number }[] = []
    for (const { s, path } of layer)
      for (const m of legalMoves(s, cats)) {
        const n = applyMove(s, m, cats)
        if (!n) continue
        if (isWon(n, cats)) return [...path, m]
        const k = keyOf(n)
        if (seen.has(k)) continue
        seen.add(k)
        next.push({ s: n, path: [...path, m], p: progress(n) })
      }
    if (!next.length) return null
    next.sort((a, b) => b.p - a.p)
    layer = next.slice(0, width)
  }
  return null
}

/** Lời giải ngắn nhất tìm được từ một thế cờ: so tìm theo chùm và tìm theo chiều sâu, lấy cái ngắn hơn. */
export function bestSolution(start: State, cats: Category[]): Move[] | null {
  const a = shortestPath(start, cats)
  const b = solve(start, cats, 30000)
  if (!a) return b
  if (!b) return a
  return a.length <= b.length ? a : b
}

/**
 * Chia bài cho tới khi bộ giải tìm được lời giải (tối đa vài lần). Trả về ván và số nước của lời giải ngắn nhất
 * tìm được (so giữa tìm theo chiều sâu và tìm theo chùm).
 */
export function dealSolvable(cats: Category[], level: Level | LevelConfig): { state: State; solution: number } {
  for (let i = 0; i < 25; i++) {
    const s = deal(cats, level)
    const sol = bestSolution(s, cats)
    if (sol) return { state: s, solution: sol.length }
  }
  return { state: deal(cats, level), solution: 0 }
}

/**
 * Số lượt cho phép = lời giải ngắn nhất tìm được + 30% (chỗ cho việc thử, rút bài xem trước) + 4,
 * làm tròn lên bội số của 5. Vd lời giải 31 nước → 45 lượt; 41 nước → 60 lượt.
 */
export const moveBudget = (solution: number, _level?: Level | LevelConfig) => (solution ? Math.ceil((solution * 1.3 + 4) / 5) * 5 : 999)

/* ---------- Màn chơi theo chủ đề (tài liệu chủ đề từ vựng, public/games/topics.json) ---------- */

export interface Topic {
  id: number
  hsk: number
  /** tên tiếng Việt */
  vi: string
  /** tên tiếng Trung */
  zh: string
  /** tên tiếng Anh */
  en?: string
  /** pinyin của tên tiếng Trung */
  py?: string
  /** [chữ Hán, pinyin, nghĩa tiếng Việt, nghĩa tiếng Anh] */
  words: [string, string, string, string?][]
}

/** Cấu hình bàn gốc của màn chơi (số chủ đề và cỡ nhóm thực tế do topicsInStage / stageSizes quyết định). */
export const TOPICS_PER_STAGE = 5
export const STAGE: LevelConfig = { cats: TOPICS_PER_STAGE, size: 4, cols: 4, first: 3, slots: 4 }

/**
 * Các kiểu bàn của màn chơi, luân phiên theo số màn: 3 cột (ít cột, ít ô đích, nhiều bài rút),
 * 4 cột (cân bằng), 5 cột (nhiều bài trên bàn, ít bài rút).
 */
export const STAGE_LAYOUTS: LevelConfig[] = [{ ...STAGE, cols: 3, first: 3, slots: 3 }, STAGE, { ...STAGE, cols: 5, first: 2, slots: 4 }]
export const stageLayout = (stage: { n: number }) => STAGE_LAYOUTS[(stage.n - 1) % STAGE_LAYOUTS.length]

export interface Stage {
  /** thứ tự trên toàn bộ danh sách (dùng để sang màn tiếp theo) */
  no: number
  /** số màn trong cấp HSK, đếm từ 1 */
  n: number
  /** khoá lưu tiến độ: "hsk-n" */
  key: string
  hsk: number
  topics: Topic[]
}

let topicsLoading: Promise<Topic[]> | null = null
export const loadTopics = () => (topicsLoading ??= fetch('/games/topics.json').then((r) => r.json() as Promise<Topic[]>))

/** Số màn mỗi cấp HSK. */
export const STAGES_PER_LEVEL = 50

/** Số chủ đề của màn thứ n trong cấp: tăng dần độ khó — 4 chủ đề (màn 1–15), 5 (16–35), 6 (36–50). */
export const topicsInStage = (n: number) => (n <= 15 ? 4 : n <= 35 ? 5 : 6)

const gcd = (a: number, b: number): number => (b ? gcd(b, a % b) : a)

/**
 * Dựng 50 màn cho mỗi cấp HSK từ ~50 chủ đề của cấp đó. Màn thứ n lấy một "cửa sổ" các chủ đề liền nhau trong
 * tài liệu (chủ đề gần nhau thường cùng mảng nghĩa) bắt đầu từ vị trí (n − 1) × bước, vòng lại đầu danh sách khi
 * hết. Bước là số nguyên tố cùng nhau với số chủ đề (3, 7, 11 hoặc 13) nên 50 màn có 50 điểm bắt đầu khác nhau,
 * mỗi chủ đề xuất hiện ở khoảng 5 màn, và hai màn liền nhau không trùng nhóm chủ đề.
 */
export function buildStages(topics: Topic[]): Stage[] {
  const out: Stage[] = []
  for (const hsk of [1, 2, 3, 4, 5, 6]) {
    const list = topics.filter((t) => t.hsk === hsk)
    const N = list.length
    if (!N) continue
    const step = [3, 7, 11, 13].find((x) => gcd(x, N) === 1) ?? 1
    for (let n = 1; n <= STAGES_PER_LEVEL; n++) {
      const k = Math.min(topicsInStage(n), N)
      const start = ((n - 1) * step) % N
      const chosen = Array.from({ length: k }, (_, j) => list[(start + j) % N])
      out.push({ no: out.length + 1, n, key: `${hsk}-${n}`, hsk, topics: chosen })
    }
  }
  return out
}

/** Các cỡ nhóm có thể có của màn thứ n: màn đầu nhóm nhỏ, màn sau nhóm lớn hơn. */
export const stageSizes = (n: number) => (n <= 15 ? [3, 4, 5] : n <= 35 ? [3, 4, 5, 6] : [4, 5, 6, 8])

/**
 * Các nhóm của một màn: mỗi chủ đề một nhóm (thẻ nhóm ghi tên tiếng Trung), không chữ Hán nào thuộc hai nhóm.
 * Mỗi nhóm lấy ngẫu nhiên một cỡ trong stageSizes (vd nhóm 3 từ, nhóm 6 từ…), từ chọn ngẫu nhiên trong 10 từ của chủ đề.
 */
export function stageCategories(stage: Stage): Category[] {
  const used = new Set<string>()
  const sizes = stageSizes(stage.n)
  return stage.topics.map((t, id) => {
    const size = sizes[Math.floor(Math.random() * sizes.length)]
    const words: Word[] = []
    for (const [hanzi, pinyin, meaning, en] of shuffle(t.words)) {
      if (words.length === size) break
      if (used.has(hanzi)) continue
      used.add(hanzi)
      words.push({
        id: `t${t.id}-${hanzi}`,
        hanzi,
        pinyin,
        meaning_vi: meaning,
        meaning_en: en ?? '',
        hsk_level: t.hsk as Word['hsk_level'],
      })
    }
    return { id, title: t.zh, sub: t.vi, subEn: t.en, pinyin: t.py, words }
  })
}
