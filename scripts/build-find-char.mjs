// Dựng dữ liệu cho trò "Tìm chữ" (tìm chữ ẩn trong nét của một chữ).
// Với mỗi chữ Hán xuất hiện trong từ vựng HSK: tìm những chữ thành phần (theo cây phân tách
// cjk_decomposition của Learn, cộng thêm một danh sách chữ đơn giản hay gặp) mà có thể ghép
// từ một nhóm nét của chữ đó, bằng cách so hình dạng đường giữa nét (medians).
// Kết quả: public/games/find-char.json  { puzzles: { 减: [["口",[3,4,5]], ...] }, info: { 口: [pinyin, hanViet, nghĩa] } }
// Chạy: node scripts/build-find-char.mjs   (đọc Learn chỉ để đọc, không ghi gì vào Learn)
import { mkdirSync, readFileSync, writeFileSync } from 'node:fs'
import { dirname, join } from 'node:path'
import { DatabaseSync } from 'node:sqlite'
import { fileURLToPath } from 'node:url'
import { inflateSync } from 'node:zlib'
import { pinyin } from 'pinyin-pro'

const root = join(dirname(fileURLToPath(import.meta.url)), '..')
const learn = join(root, '..', '..', 'Learn', 'assets', 'data')
const readJson = (p) => JSON.parse(readFileSync(p, 'utf8'))

const vocabulary = readJson(join(root, 'src', 'data', 'generated', 'vocabulary.json'))
const radicals = readJson(join(root, 'src', 'data', 'generated', 'radicals.json'))
const decomposition = readJson(join(learn, 'cjk_decomposition.json'))
const db = new DatabaseSync(join(learn, 'hanzi_strokes.db'), { readOnly: true })
const getRow = db.prepare('select data_zlib from stroke_orders where character = ?')
const cache = new Map()
const strokesOf = (c) => {
  if (!cache.has(c)) {
    const row = getRow.get(c)
    cache.set(c, row ? JSON.parse(inflateSync(Buffer.from(row.data_zlib)).toString('utf8')) : null)
  }
  return cache.get(c)
}

const isHan = (c) => /^\p{Script=Han}$/u.test(c)

// Thông tin hiển thị của một chữ thành phần: pinyin, Hán Việt, nghĩa.
const info = new Map()
for (const r of radicals) info.set(r.radical, [r.pinyin, r.han_viet, r.meaning_vi])
for (const w of vocabulary) if ([...w.hanzi].length === 1 && isHan(w.hanzi)) info.set(w.hanzi, [w.pinyin, w.han_viet ?? '', w.meaning_vi])
/** Chỉ nhận thành phần là chữ đứng riêng được (có trong từ vựng hoặc là bộ thủ chính trong bảng 214 bộ). */
const standalone = (c) => info.has(c)

// Chữ đơn giản hay nằm trong chữ khác, được thử với mọi chữ (để nhận cả "chữ ngoài cây phân tách").
const COMMON = [...'口日目田十土王木人大小山工力又寸干士夕巾心手水火月石禾白立方女子马'].filter(standalone)

/* ---------- So hình dạng nét ---------- */

const resample = (pts, n = 8) => {
  const seg = []
  let total = 0
  for (let i = 1; i < pts.length; i++) {
    const d = Math.hypot(pts[i][0] - pts[i - 1][0], pts[i][1] - pts[i - 1][1])
    seg.push(d)
    total += d
  }
  if (!total) return Array.from({ length: n }, () => pts[0])
  const out = []
  for (let k = 0; k < n; k++) {
    let t = (total * k) / (n - 1)
    let i = 0
    while (i < seg.length - 1 && t > seg[i]) t -= seg[i++]
    const r = seg[i] ? Math.min(1, t / seg[i]) : 0
    out.push([pts[i][0] + (pts[i + 1][0] - pts[i][0]) * r, pts[i][1] + (pts[i + 1][1] - pts[i][1]) * r])
  }
  return out
}
const bbox = (strokes) => {
  let x0 = Infinity,
    y0 = Infinity,
    x1 = -Infinity,
    y1 = -Infinity
  for (const s of strokes)
    for (const [x, y] of s) ((x0 = Math.min(x0, x)), (y0 = Math.min(y0, y)), (x1 = Math.max(x1, x)), (y1 = Math.max(y1, y)))
  return { x0, y0, w: Math.max(x1 - x0, 60), h: Math.max(y1 - y0, 60) }
}
/** Đưa một nhóm nét về khung đơn vị (co giãn riêng từng trục, vì thành phần trong chữ ghép thường bị ép dẹt). */
const normalize = (strokes) => {
  const b = bbox(strokes)
  return strokes.map((s) => s.map(([x, y]) => [(x - b.x0) / b.w, (y - b.y0) / b.h]))
}
const dir = (s) => {
  const [a, b] = [s[0], s[s.length - 1]]
  const l = Math.hypot(b[0] - a[0], b[1] - a[1]) || 1
  return [(b[0] - a[0]) / l, (b[1] - a[1]) / l]
}
const score = (A, B) => {
  let sum = 0
  for (let i = 0; i < A.length; i++)
    for (let j = 0; j < A[i].length; j++) sum += Math.hypot(A[i][j][0] - B[i][j][0], A[i][j][1] - B[i][j][1])
  return sum / (A.length * A[0].length)
}

const THRESHOLD = 0.13

/** Điểm khớp hình giữa một nhóm nét của T (theo chỉ số) và chữ C. */
function fit(T, idx, C) {
  if (idx.length !== C.medians.length) return Infinity
  return score(normalize(idx.map((i) => resample(T.medians[i]))), normalize(C.medians.map((m) => resample(m))))
}

/** Tìm dãy chỉ số nét (tăng dần, trong `within`) của chữ T khớp hình với chữ C, hoặc null. */
function locate(T, C, within = null, threshold = THRESHOLD, minCos = 0.75) {
  const map = within ?? T.medians.map((_, i) => i)
  const t = map.map((i) => resample(T.medians[i]))
  const c = C.medians.map((m) => resample(m))
  const k = c.length
  if (k < 2 || k >= T.medians.length) return null
  const cn = normalize(c)
  const cd = c.map(dir)
  const td = t.map(dir)
  // Nét j của C chỉ ghép được với nét i của T nếu cùng hướng.
  const ok = cd.map((d) => td.map((e) => d[0] * e[0] + d[1] * e[1] > minCos))
  let best = null
  let bestScore = threshold
  let budget = 60000
  const pick = []
  const dfs = (j, from) => {
    if (--budget < 0) return
    if (j === k) {
      const s = score(normalize(pick.map((i) => t[i])), cn)
      if (s < bestScore) ((bestScore = s), (best = [...pick]))
      return
    }
    for (let i = from; i <= t.length - (k - j); i++) {
      if (!ok[j][i]) continue
      pick.push(i)
      dfs(j + 1, i + 1)
      pick.pop()
    }
  }
  dfs(0, 0)
  return best && best.map((i) => map[i])
}

const count = (c) => strokesOf(c)?.medians.length ?? 0

/**
 * Gán nét theo cây phân tách: chữ c chiếm các nét `idx` của T; c = A + B thì thường A là các nét đầu,
 * B là các nét sau (trái–phải, trên–dưới). Nếu cách chia liền mạch không khớp hình (vd khung bao 囗),
 * tìm A theo hình trong phạm vi nét của c, phần còn lại là B.
 */
function assignTree(T, c, idx, out, depth = 0) {
  const ps = (decomposition[c] ?? []).filter((p) => isHan(p) && p !== c)
  if (depth > 5 || ps.length !== 2) return
  const [A, B] = ps
  const [na, nb] = [count(A), count(B)]
  if (!na || !nb || na + nb !== idx.length) return
  const tryAdd = (ch, sub) => {
    if (sub.length >= 2 && standalone(ch) && fit(T, sub, strokesOf(ch)) < 0.3) out.push([ch, sub])
    assignTree(T, ch, sub, out, depth + 1)
  }
  let a = idx.slice(0, na)
  let b = idx.slice(na)
  const fitPair = (x, y) => Math.max(na >= 2 ? fit(T, x, strokesOf(A)) : 0, nb >= 2 ? fit(T, y, strokesOf(B)) : 0)
  if (fitPair(a, b) > 0.2) {
    // Chia liền mạch không khớp: thử tìm A theo hình (hoặc B nếu A chỉ 1 nét), lấy cách chia khớp hơn.
    const [X, nx] = na >= 2 ? [A, na] : [B, nb]
    const g = nx >= 2 ? locate(T, strokesOf(X), idx, 0.3, 0.3) : null
    if (g) {
      const rest = idx.filter((i) => !g.includes(i))
      const [ga, gb] = X === A ? [g, rest] : [rest, g]
      if (fitPair(ga, gb) < fitPair(a, b)) ((a = ga), (b = gb))
    }
  }
  tryAdd(A, a)
  tryAdd(B, b)
}

/** Mọi thành phần (đệ quy) theo cây phân tách. */
function parts(c, out = new Set(), depth = 0) {
  if (depth > 5) return out
  for (const p of decomposition[c] ?? []) {
    if (!isHan(p) || p === c) continue
    out.add(p)
    parts(p, out, depth + 1)
  }
  return out
}

const chars = new Set()
for (const w of vocabulary) for (const c of w.hanzi) if (isHan(c)) chars.add(c)

const puzzles = {}
const usedInfo = new Set()
let n = 0
for (const T of chars) {
  const td = strokesOf(T)
  if (!td || td.medians.length < 4) continue
  const found = []
  const seenSets = new Set()
  const seenChars = new Set()
  // 1) theo cây phân tách
  const tree = []
  assignTree(
    td,
    T,
    td.medians.map((_, i) => i),
    tree,
  )
  for (const [c, idx] of tree) {
    const key = idx.join(',')
    if (seenSets.has(key) || seenChars.has(c)) continue
    seenSets.add(key)
    seenChars.add(c)
    found.push([c, idx])
  }
  // 2) thành phần chưa gán được và chữ đơn giản hay gặp: tìm theo hình, ngưỡng chặt
  const cands = new Set([...parts(T)].filter(standalone))
  COMMON.forEach((c) => cands.add(c))
  for (const C of cands) {
    if (seenChars.has(C)) continue
    if (C === T) continue
    const cd = strokesOf(C)
    if (!cd) continue
    const idx = locate(td, cd)
    if (!idx) continue
    const key = idx.join(',')
    if (seenSets.has(key)) continue // hai thành phần trùng đúng một nhóm nét: giữ cái đầu
    seenSets.add(key)
    seenChars.add(C)
    found.push([C, idx])
  }
  if (found.length >= 3) {
    // Thành phần lớn (nhiều nét) trước.
    puzzles[T] = found.sort((a, b) => b[1].length - a[1].length)
    found.forEach(([c]) => usedInfo.add(c))
    n++
  }
}
db.close()

const infoOut = {}
for (const c of usedInfo) {
  const [py, hv, m] = info.get(c)
  infoOut[c] = [py || pinyin(c), hv || '', m || '']
}
mkdirSync(join(root, 'public', 'games'), { recursive: true })
writeFileSync(join(root, 'public', 'games', 'find-char.json'), JSON.stringify({ puzzles, info: infoOut }))
const counts = [3, 5, 7].map((k) => Object.values(puzzles).filter((p) => p.length >= k).length)
console.log(`find-char: ${n} chữ có ≥3 chữ ẩn (≥5: ${counts[1]}, ≥7: ${counts[2]}), ${usedInfo.size} chữ thành phần`)
for (const c of ['减', '想', '好', '明', '国', '谢', '语', '踢']) console.log(c, JSON.stringify(puzzles[c] ?? null))
