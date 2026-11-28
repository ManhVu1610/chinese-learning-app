/**
 * Dữ liệu và phép so hình cho trò Tìm chữ (tìm chữ ẩn trong nét của một chữ).
 * Dữ liệu dựng sẵn bởi scripts/build-find-char.mjs → public/games/find-char.json. Mô tả: docs/games/tim-chu.md
 */
import type { StrokeData } from '../lib/strokes'

export interface FindCharData {
  /** chữ → [chữ ẩn, chỉ số các nét tạo nên nó][] */
  puzzles: Record<string, [string, number[]][]>
  /** chữ ẩn → [pinyin, Hán Việt, nghĩa] */
  info: Record<string, [string, string, string]>
}

let loading: Promise<FindCharData> | null = null
export const loadFindChar = () => (loading ??= fetch('/games/find-char.json').then((r) => r.json() as Promise<FindCharData>))

type Pt = [number, number]

function resample(pts: number[][], n = 8): Pt[] {
  const seg: number[] = []
  let total = 0
  for (let i = 1; i < pts.length; i++) {
    const d = Math.hypot(pts[i][0] - pts[i - 1][0], pts[i][1] - pts[i - 1][1])
    seg.push(d)
    total += d
  }
  if (!total) return Array.from({ length: n }, () => [pts[0][0], pts[0][1]] as Pt)
  const out: Pt[] = []
  for (let k = 0; k < n; k++) {
    let t = (total * k) / (n - 1)
    let i = 0
    while (i < seg.length - 1 && t > seg[i]) t -= seg[i++]
    const r = seg[i] ? Math.min(1, t / seg[i]) : 0
    out.push([pts[i][0] + (pts[i + 1][0] - pts[i][0]) * r, pts[i][1] + (pts[i + 1][1] - pts[i][1]) * r])
  }
  return out
}

/** Đưa nhóm nét về khung đơn vị, co giãn riêng từng trục (thành phần trong chữ ghép thường bị ép dẹt). */
function normalize(strokes: Pt[][]): Pt[][] {
  let x0 = Infinity,
    y0 = Infinity,
    x1 = -Infinity,
    y1 = -Infinity
  for (const s of strokes)
    for (const [x, y] of s) ((x0 = Math.min(x0, x)), (y0 = Math.min(y0, y)), (x1 = Math.max(x1, x)), (y1 = Math.max(y1, y)))
  const w = Math.max(x1 - x0, 60)
  const h = Math.max(y1 - y0, 60)
  return strokes.map((s) => s.map(([x, y]) => [(x - x0) / w, (y - y0) / h] as Pt))
}

/**
 * Độ lệch hình giữa các nét đã chọn của chữ lớn (theo thứ tự nét) và chữ ẩn: trung bình khoảng cách
 * giữa các điểm của đường giữa nét sau khi chuẩn hoá. Nhỏ hơn ~0.16 là cùng hình.
 */
export function shapeDistance(big: StrokeData, picked: number[], part: StrokeData): number {
  if (picked.length !== part.medians.length) return Infinity
  const a = normalize([...picked].sort((x, y) => x - y).map((i) => resample(big.medians[i])))
  const b = normalize(part.medians.map((m) => resample(m)))
  let sum = 0
  for (let i = 0; i < a.length; i++)
    for (let j = 0; j < a[i].length; j++) sum += Math.hypot(a[i][j][0] - b[i][j][0], a[i][j][1] - b[i][j][1])
  return sum / (a.length * a[0].length)
}

export const SHAPE_OK = 0.16
