/**
 * Vẽ ảnh bìa (SVG, 320×200) cho từng truyện trong mục "Truyện": public/stories/<id>.svg
 * Phong cách giống giao diện app: nét viền nâu tím, màu phấn pastel.
 * Mỗi truyện là một cảnh ghép từ các hình đơn giản bên dưới.
 * Chạy lại sau khi thêm / sửa truyện: node scripts/build-story-covers.mjs
 */
import { mkdirSync, writeFileSync } from 'node:fs'
import { dirname, join, resolve } from 'node:path'
import { fileURLToPath } from 'node:url'

const root = resolve(dirname(fileURLToPath(import.meta.url)), '..')
const outDir = join(root, 'public', 'stories')
mkdirSync(outDir, { recursive: true })

const INK = '#574559'
const C = {
  white: '#fffefc',
  skin: '#ffe0c7',
  pink: '#ff9fb8',
  brick: '#d6587f',
  sand: '#ffeaa6',
  sun: '#ffd66b',
  sage: '#c9efd6',
  leaf: '#9ed9a8',
  sky: '#cfe5ff',
  water: '#a9d3f5',
  coral: '#ffd0dc',
  apricot: '#ffdcc4',
  lilac: '#e6dcff',
  wood: '#d4a373',
  stone: '#d7cfdc',
  gray: '#b9b3c4',
  dark: '#6e6179',
  orange: '#f6b26b',
  hair: '#574559',
}
const S = `stroke="${INK}" stroke-width="3" stroke-linejoin="round" stroke-linecap="round"`
const g = (x, y, s, inner, flip = false) => `<g transform="translate(${x} ${y}) scale(${flip ? -s : s} ${s})">${inner}</g>`
const eyes = (x1, x2, y, r = 2.2) => `<circle cx="${x1}" cy="${y}" r="${r}" fill="${INK}"/><circle cx="${x2}" cy="${y}" r="${r}" fill="${INK}"/>`

// ---------- Phông nền ----------
const sky = (fill) => `<rect width="320" height="200" fill="${fill}"/>`
const ground = (fill, y = 168) =>
  `<path d="M-5 ${y} Q80 ${y - 10} 160 ${y - 2} T325 ${y - 4} V205 H-5 Z" fill="${fill}" ${S}/>`
const water = (y = 150) =>
  `<path d="M-5 ${y} q20 -8 40 0 t40 0 t40 0 t40 0 t40 0 t40 0 t40 0 t40 0 t40 0 V205 H-5 Z" fill="${C.water}" ${S}/>` +
  `<path d="M30 ${y + 22} q10 -5 20 0 M150 ${y + 30} q10 -5 20 0 M250 ${y + 18} q10 -5 20 0" fill="none" ${S} stroke-width="2.5"/>`

// ---------- Cảnh vật ----------
const sun = (x, y, r = 18) => {
  const rays = Array.from({ length: 8 }, (_, i) => {
    const a = (i * Math.PI) / 4
    const p = (d) => `${(x + Math.cos(a) * d).toFixed(1)} ${(y + Math.sin(a) * d).toFixed(1)}`
    return `M${p(r + 6)} L${p(r + 13)}`
  }).join(' ')
  return `<path d="${rays}" ${S}/><circle cx="${x}" cy="${y}" r="${r}" fill="${C.sun}" ${S}/>`
}
const moon = (x, y) => `<path d="M${x} ${y - 20} A20 20 0 1 0 ${x + 18} ${y + 8} A15 15 0 1 1 ${x} ${y - 20} Z" fill="${C.sand}" ${S}/>`
const star = (x, y, r = 7, fill = C.sand) => {
  const pts = Array.from({ length: 10 }, (_, i) => {
    const a = -Math.PI / 2 + (i * Math.PI) / 5
    const d = i % 2 ? r * 0.45 : r
    return `${(x + Math.cos(a) * d).toFixed(1)},${(y + Math.sin(a) * d).toFixed(1)}`
  }).join(' ')
  return `<polygon points="${pts}" fill="${fill}" ${S} stroke-width="2"/>`
}
const cloud = (x, y, s = 1, fill = C.white) =>
  g(x, y, s, `<path d="M-30 10 Q-34 -6 -16 -6 Q-12 -22 6 -18 Q20 -26 26 -8 Q38 -6 34 10 Z" fill="${fill}" ${S}/>`)
const rain = (x, y, w = 120) =>
  Array.from({ length: Math.floor(w / 18) }, (_, i) => {
    const dx = x + i * 18
    const dy = y + (i % 2) * 14
    return `<path d="M${dx} ${dy} l-4 10 M${dx + 6} ${dy + 26} l-4 10" stroke="#7fb2e5" stroke-width="3" stroke-linecap="round"/>`
  }).join('')
const tree = (x, y, s = 1, fruit = false) =>
  g(
    x,
    y,
    s,
    `<path d="M-7 0 L-5 -40 L5 -40 L7 0 Z" fill="${C.wood}" ${S}/>` +
      `<path d="M-30 -48 Q-36 -74 -14 -78 Q-6 -100 14 -90 Q36 -92 34 -70 Q46 -50 24 -40 Q0 -32 -20 -38 Q-38 -38 -30 -48 Z" fill="${C.leaf}" ${S}/>` +
      (fruit ? `<circle cx="-12" cy="-60" r="4" fill="${C.pink}"/><circle cx="14" cy="-70" r="4" fill="${C.pink}"/><circle cx="20" cy="-52" r="4" fill="${C.pink}"/>` : ''),
  )
const pine = (x, y, s = 1, fill = '#8fcf9f') =>
  g(x, y, s, `<path d="M-3 0 V-12 M3 0 V-12" ${S}/><path d="M0 -70 L20 -36 L10 -36 L24 -12 L-24 -12 L-10 -36 L-20 -36 Z" fill="${fill}" ${S}/>`)
const mountain = (x, y, w, h, fill = C.lilac, snow = true) =>
  `<path d="M${x - w / 2} ${y} L${x} ${y - h} L${x + w / 2} ${y} Z" fill="${fill}" ${S}/>` +
  (snow ? `<path d="M${x - w * 0.13} ${y - h * 0.74} L${x} ${y - h} L${x + w * 0.13} ${y - h * 0.74} L${x + w * 0.05} ${y - h * 0.68} L${x - w * 0.03} ${y - h * 0.76} Z" fill="${C.white}" ${S} stroke-width="2.5"/>` : '')
const flower = (x, y, s = 1, petal = C.pink) =>
  g(
    x,
    y,
    s,
    `<path d="M0 0 V-22 M0 -10 Q8 -14 10 -20" fill="none" ${S}/>` +
      [0, 72, 144, 216, 288]
        .map((a) => {
          const r = (a * Math.PI) / 180
          return `<circle cx="${(Math.cos(r) * 6).toFixed(1)}" cy="${(-28 + Math.sin(r) * 6).toFixed(1)}" r="5" fill="${petal}" ${S} stroke-width="2"/>`
        })
        .join('') +
      `<circle cx="0" cy="-28" r="3.5" fill="${C.sun}" ${S} stroke-width="2"/>`,
  )
const seedling = (x, y, s = 1) =>
  g(x, y, s, `<path d="M0 0 V-16" ${S}/><path d="M0 -12 Q-12 -14 -12 -24 Q-2 -22 0 -12 Z M0 -14 Q12 -16 12 -26 Q2 -24 0 -14 Z" fill="${C.leaf}" ${S} stroke-width="2.5"/>`)
const house = (x, y, s = 1, wall = C.apricot, roof = C.brick) =>
  g(
    x,
    y,
    s,
    `<rect x="-36" y="-44" width="72" height="44" fill="${wall}" ${S}/>` +
      `<path d="M-46 -42 L0 -76 L46 -42 Z" fill="${roof}" ${S}/>` +
      `<rect x="-10" y="-26" width="20" height="26" fill="${C.wood}" ${S}/>` +
      `<rect x="-30" y="-36" width="14" height="14" fill="${C.sky}" ${S}/><rect x="16" y="-36" width="14" height="14" fill="${C.sky}" ${S}/>`,
  )
const school = (x, y, s = 1) =>
  g(
    x,
    y,
    s,
    `<rect x="-50" y="-50" width="100" height="50" fill="${C.coral}" ${S}/>` +
      `<path d="M-56 -48 H56 L46 -62 H-46 Z" fill="${C.brick}" ${S}/>` +
      `<rect x="-10" y="-26" width="20" height="26" fill="${C.wood}" ${S}/>` +
      [-38, -24, 14, 28].map((wx) => `<rect x="${wx}" y="-40" width="10" height="10" fill="${C.sky}" ${S} stroke-width="2.5"/>`).join('') +
      `<path d="M0 -62 V-92" ${S}/><path d="M0 -92 L22 -86 L0 -80 Z" fill="${C.brick}" ${S} stroke-width="2.5"/>`,
  )
const well = (x, y, s = 1) =>
  g(
    x,
    y,
    s,
    `<path d="M-34 -30 V0 H34 V-30" fill="${C.stone}" ${S}/>` +
      `<path d="M-34 -16 H34 M-14 -30 V-16 M14 -30 V-16 M0 -16 V0 M-24 -16 V0 M24 -16 V0" ${S} stroke-width="2.5"/>` +
      `<ellipse cx="0" cy="-30" rx="34" ry="9" fill="${C.stone}" ${S}/><ellipse cx="0" cy="-30" rx="24" ry="5" fill="#3f6f8f" ${S} stroke-width="2.5"/>`,
  )
const fence = (x, y, n = 6, hole = -1) =>
  Array.from({ length: n }, (_, i) =>
    i === hole ? '' : `<path d="M${x + i * 18} ${y} V${y - 40} L${x + i * 18 + 6} ${y - 48} L${x + i * 18 + 12} ${y - 40} V${y} Z" fill="${C.wood}" ${S} stroke-width="2.5"/>`,
  ).join('') + `<path d="M${x - 4} ${y - 14} H${x + n * 18} M${x - 4} ${y - 30} H${x + n * 18}" ${S}/>`
const wall = (x, y, w) => {
  const merlons = Array.from({ length: Math.floor(w / 24) }, (_, i) => `<rect x="${x + i * 24}" y="${y - 52}" width="14" height="12" fill="${C.stone}" ${S} stroke-width="2.5"/>`).join('')
  return `${merlons}<rect x="${x - 4}" y="${y - 40}" width="${w}" height="40" fill="${C.stone}" ${S}/><path d="M${x + 20} ${y - 28} h20 M${x + 70} ${y - 16} h20 M${x + 120} ${y - 30} h20" ${S} stroke-width="2"/>`
}
const heart = (x, y, s = 1, fill = C.pink) => g(x, y, s, `<path d="M0 8 C-18 -4 -14 -18 -6 -18 C-2 -18 0 -14 0 -12 C0 -14 2 -18 6 -18 C14 -18 18 -4 0 8 Z" fill="${fill}" ${S} stroke-width="2.5"/>`)
const zzz = (x, y) => `<text x="${x}" y="${y}" font-family="Arial, sans-serif" font-weight="800" font-size="16" fill="${INK}">z</text><text x="${x + 10}" y="${y - 12}" font-family="Arial, sans-serif" font-weight="800" font-size="20" fill="${INK}">Z</text>`
const bang = (x, y) => `<text x="${x}" y="${y}" font-family="Arial, sans-serif" font-weight="800" font-size="26" fill="${C.brick}" stroke="${INK}" stroke-width="1">!</text>`

// ---------- Đồ vật ----------
const cup = (x, y, s = 1) => g(x, y, s, `<path d="M-12 -18 H12 L9 0 H-9 Z" fill="${C.white}" ${S}/><path d="M12 -14 Q20 -12 11 -5" fill="none" ${S} stroke-width="2.5"/><path d="M-4 -24 q3 -4 0 -8 M4 -24 q3 -4 0 -8" fill="none" ${S} stroke-width="2"/>`)
const jug = (x, y, s = 1) => g(x, y, s, `<path d="M-8 -44 H8 V-36 Q22 -28 20 -12 Q18 0 0 0 Q-18 0 -20 -12 Q-22 -28 -8 -36 Z" fill="${C.apricot}" ${S}/><rect x="-10" y="-50" width="20" height="7" rx="2" fill="${C.brick}" ${S} stroke-width="2.5"/><path d="M-8 -18 H8" ${S} stroke-width="2"/>`)
const card = (x, y, s = 1, rot = -8) =>
  `<g transform="translate(${x} ${y}) rotate(${rot}) scale(${s})"><rect x="-34" y="-46" width="68" height="50" rx="5" fill="${C.brick}" ${S}/><rect x="-28" y="-40" width="56" height="38" rx="3" fill="${C.white}" ${S} stroke-width="2"/>${heart(0, -16, 1)}</g>`
const fishProp = (x, y, s = 1, fill = C.orange) => g(x, y, s, `<path d="M-16 0 Q0 -12 14 0 Q0 12 -16 0 Z M-16 0 L-26 -8 L-26 8 Z" fill="${fill}" ${S} stroke-width="2.5"/><circle cx="7" cy="-2" r="1.8" fill="${INK}"/>`)
const chair = (x, y, s = 1) => g(x, y, s, `<path d="M-26 0 V-30 M26 0 V-30 M18 -30 V-80" ${S} stroke-width="4"/><rect x="-30" y="-36" width="60" height="9" rx="3" fill="${C.wood}" ${S}/><rect x="14" y="-84" width="14" height="50" rx="5" fill="${C.wood}" ${S}/>`)
const bowl = (x, y, s = 1) => g(x, y, s, `<path d="M-20 -14 H20 Q18 0 0 0 Q-18 0 -20 -14 Z" fill="${C.sky}" ${S}/><path d="M-14 -14 Q-10 -26 0 -24 Q10 -26 14 -14" fill="${C.white}" ${S} stroke-width="2.5"/>`)
const sword = (x, y, rot = 0, s = 1) =>
  `<g transform="translate(${x} ${y}) rotate(${rot}) scale(${s})"><path d="M-4 0 V-60 L0 -70 L4 -60 V0 Z" fill="#e8eef5" ${S} stroke-width="2.5"/><rect x="-14" y="0" width="28" height="6" rx="2" fill="${C.sun}" ${S} stroke-width="2.5"/><rect x="-3.5" y="6" width="7" height="18" fill="${C.brick}" ${S} stroke-width="2.5"/></g>`
const spear = (x, y, rot = 0) =>
  `<g transform="translate(${x} ${y}) rotate(${rot})"><path d="M0 0 V-130" stroke="${INK}" stroke-width="9" stroke-linecap="round"/><path d="M0 0 V-130" stroke="${C.wood}" stroke-width="4" stroke-linecap="round"/><path d="M0 -164 L10 -132 L0 -126 L-10 -132 Z" fill="#e8eef5" ${S}/><path d="M-6 -126 q6 10 12 0" fill="${C.brick}" ${S} stroke-width="2"/></g>`
const shield = (x, y, s = 1) =>
  g(x, y, s, `<path d="M0 -84 Q22 -76 38 -78 Q42 -30 0 0 Q-42 -30 -38 -78 Q-22 -76 0 -84 Z" fill="${C.coral}" ${S}/><path d="M0 -68 Q14 -62 26 -64 Q28 -32 0 -12 Q-28 -32 -26 -64 Q-14 -62 0 -68 Z" fill="${C.sand}" ${S} stroke-width="2.5"/><circle cx="0" cy="-42" r="7" fill="${C.brick}" ${S} stroke-width="2.5"/>`)
const boat = (x, y, s = 1, mark = false) =>
  g(
    x,
    y,
    s,
    `<path d="M-62 -24 H62 Q52 0 36 0 H-36 Q-52 0 -62 -24 Z" fill="${C.wood}" ${S}/><path d="M-52 -14 H52" ${S} stroke-width="2"/>` +
      (mark ? `<path d="M30 -20 l8 8 M38 -20 l-8 8" stroke="${C.brick}" stroke-width="3.5" stroke-linecap="round"/>` : ''),
  )
const basket = (x, y, s = 1) => g(x, y, s, `<path d="M-16 -18 H16 L12 0 H-12 Z" fill="${C.sand}" ${S}/><path d="M-12 -18 Q0 -34 12 -18" fill="none" ${S}/><circle cx="-5" cy="-20" r="4" fill="${C.stone}" ${S} stroke-width="2"/><circle cx="5" cy="-21" r="4" fill="${C.stone}" ${S} stroke-width="2"/>`)
const hoe = (x, y, rot = 0) =>
  `<g transform="translate(${x} ${y}) rotate(${rot})"><path d="M0 0 V-70" stroke="${INK}" stroke-width="8" stroke-linecap="round"/><path d="M0 0 V-70" stroke="${C.wood}" stroke-width="3.5" stroke-linecap="round"/><path d="M-2 -70 H16 V-58 Q8 -60 -2 -62 Z" fill="${C.gray}" ${S} stroke-width="2.5"/></g>`
const flag = (x, y) => `<path d="M${x} ${y} V${y - 56}" ${S}/><path d="M${x} ${y - 56} L${x + 26} ${y - 48} L${x} ${y - 40} Z" fill="${C.brick}" ${S} stroke-width="2.5"/>`
const windowFrame = (x, y, w, h) => `<rect x="${x}" y="${y}" width="${w}" height="${h}" fill="#3d3560" ${S}/>${star(x + 18, y + 18, 5)}${star(x + w - 20, y + 30, 4)}`

// ---------- Người ----------
/**
 * Người đứng, gốc toạ độ ở giữa chân.
 * mood: smile | shock | worry | shout | sleep; arms: down | up | side | chin | hold
 */
function person({ body = C.sky, hair = C.hair, old = false, girl = false, mood = 'smile', arms = 'down', hat = false } = {}) {
  const armPath = {
    down: 'M-15 -44 L-22 -24 M15 -44 L22 -24',
    up: 'M-15 -44 L-28 -66 M15 -44 L28 -66',
    side: 'M-15 -44 L-22 -24 M15 -44 L34 -40',
    chin: 'M-15 -44 L-22 -24 M15 -44 L20 -34 L8 -58',
    hold: 'M-15 -44 L-2 -36 M15 -44 L4 -36',
  }[arms]
  const mouth = {
    smile: '<path d="M-5 -59 Q0 -54 5 -59" fill="none" stroke="#574559" stroke-width="2.5" stroke-linecap="round"/>',
    shock: `<ellipse cx="0" cy="-57" rx="3.5" ry="4.5" fill="${INK}"/>`,
    worry: '<path d="M-5 -56 Q0 -61 5 -56" fill="none" stroke="#574559" stroke-width="2.5" stroke-linecap="round"/>',
    shout: `<path d="M-6 -60 Q0 -50 6 -60 Z" fill="${C.brick}" ${S} stroke-width="2"/>`,
    sleep: '<path d="M-3 -58 H3" stroke="#574559" stroke-width="2.5" stroke-linecap="round"/>',
  }[mood]
  const eyeY = -66
  const eyePart =
    mood === 'sleep'
      ? `<path d="M-9 ${eyeY} q3 3 6 0 M3 ${eyeY} q3 3 6 0" fill="none" ${S} stroke-width="2"/>`
      : mood === 'worry'
        ? `${eyes(-6, 6, eyeY)}<path d="M-10 -73 L-3 -71 M10 -73 L3 -71" ${S} stroke-width="2"/>`
        : eyes(-6, 6, eyeY, mood === 'shock' ? 2.8 : 2.2)
  const hairColor = old ? C.white : hair
  const hairPart = hat
    ? `<path d="M-24 -76 L0 -96 L24 -76 Z" fill="${C.sand}" ${S}/>`
    : `<path d="M-16 -66 Q-17 -86 0 -86 Q17 -86 16 -66 Q10 -76 0 -74 Q-10 -76 -16 -66 Z" fill="${hairColor}" ${S} stroke-width="2.5"/>` +
      (girl ? `<circle cx="-17" cy="-78" r="6" fill="${hairColor}" ${S} stroke-width="2.5"/><circle cx="17" cy="-78" r="6" fill="${hairColor}" ${S} stroke-width="2.5"/>` : '')
  const beard = old ? `<path d="M-11 -58 Q-8 -36 0 -34 Q8 -36 11 -58 Q6 -54 0 -54 Q-6 -54 -11 -58 Z" fill="${C.white}" ${S} stroke-width="2.5"/>` : ''
  return (
    `<path d="M-8 -18 V0 M8 -18 V0" stroke="${INK}" stroke-width="6" stroke-linecap="round"/>` +
    `<path d="${armPath}" fill="none" stroke="${INK}" stroke-width="6" stroke-linecap="round" stroke-linejoin="round"/>` +
    `<path d="M-18 -16 Q-17 -50 0 -50 Q17 -50 18 -16 Z" fill="${body}" ${S}/>` +
    `<circle cx="0" cy="-66" r="16" fill="${C.skin}" ${S}/>` +
    hairPart +
    eyePart +
    `<circle cx="-10" cy="-60" r="2.6" fill="${C.pink}" opacity=".7"/><circle cx="10" cy="-60" r="2.6" fill="${C.pink}" opacity=".7"/>` +
    (old ? '' : mouth) +
    beard +
    (old && mood !== 'smile' ? mouth : '')
  )
}
const P = (x, y, s, opts, flip) => g(x, y, s, person(opts), flip)

// ---------- Con vật (gốc ở giữa chân, quay mặt sang phải) ----------
const cat = () =>
  `<path d="M16 -8 Q40 -10 32 -36" fill="none" stroke="${INK}" stroke-width="9" stroke-linecap="round"/><path d="M16 -8 Q40 -10 32 -36" fill="none" stroke="${C.white}" stroke-width="3.5" stroke-linecap="round"/>` +
  `<ellipse cx="0" cy="-18" rx="20" ry="18" fill="${C.white}" ${S}/>` +
  `<path d="M-14 -50 L-12 -68 L-2 -58 Z M14 -50 L12 -68 L2 -58 Z" fill="${C.white}" ${S}/><path d="M-11 -56 L-10.5 -63 L-6 -59 Z M11 -56 L10.5 -63 L6 -59 Z" fill="${C.pink}"/>` +
  `<circle cx="0" cy="-44" r="16" fill="${C.white}" ${S}/>${eyes(-6, 6, -46)}` +
  `<path d="M-2 -40 H2 L0 -38 Z" fill="${C.pink}" ${S} stroke-width="1.5"/><path d="M-6 -40 H-20 M-6 -37 H-19 M6 -40 H20 M6 -37 H19" stroke="${INK}" stroke-width="1.5"/>` +
  `<path d="M-8 0 V-8 M8 0 V-8" ${S} stroke-width="2.5"/>`
const rabbit = (sleep = false) =>
  `<circle cx="-18" cy="-14" r="6" fill="${C.white}" ${S}/>` +
  `<ellipse cx="0" cy="-16" rx="19" ry="16" fill="${C.white}" ${S}/>` +
  `<ellipse cx="4" cy="-60" rx="5.5" ry="15" fill="${C.white}" ${S} transform="rotate(-12 4 -60)"/><ellipse cx="17" cy="-58" rx="5.5" ry="15" fill="${C.white}" ${S} transform="rotate(14 17 -58)"/>` +
  `<ellipse cx="4" cy="-60" rx="2" ry="9" fill="${C.pink}" transform="rotate(-12 4 -60)"/><ellipse cx="17" cy="-58" rx="2" ry="9" fill="${C.pink}" transform="rotate(14 17 -58)"/>` +
  `<circle cx="12" cy="-36" r="14" fill="${C.white}" ${S}/>` +
  (sleep ? `<path d="M12 -38 q3 3 6 0" fill="none" ${S} stroke-width="2"/>` : `<circle cx="16" cy="-38" r="2.2" fill="${INK}"/>`) +
  `<circle cx="25" cy="-33" r="2.2" fill="${C.pink}"/><circle cx="8" cy="-31" r="2.6" fill="${C.pink}" opacity=".7"/>`
const turtle = (shell = C.leaf) =>
  `<circle cx="36" cy="-16" r="9" fill="${C.sage}" ${S}/><circle cx="39" cy="-18" r="1.8" fill="${INK}"/>` +
  `<ellipse cx="-16" cy="-3" rx="7" ry="5" fill="${C.sage}" ${S}/><ellipse cx="16" cy="-3" rx="7" ry="5" fill="${C.sage}" ${S}/>` +
  `<path d="M-28 -6 Q-26 -40 0 -40 Q26 -40 28 -6 Z" fill="${shell}" ${S}/>` +
  `<path d="M-10 -6 L-12 -22 L0 -32 L12 -22 L10 -6 M-12 -22 H-26 M12 -22 H26" fill="none" ${S} stroke-width="2.2"/>`
const sheep = () =>
  `<path d="M-12 -12 V0 M-2 -12 V0 M8 -12 V0 M16 -12 V0" stroke="${INK}" stroke-width="4" stroke-linecap="round"/>` +
  [[-16, -24], [-4, -34], [10, -32], [18, -22], [4, -16], [-10, -14]].map(([x, y]) => `<circle cx="${x}" cy="${y}" r="11" fill="${C.white}" ${S}/>`).join('') +
  [[-16, -24], [-4, -34], [10, -32], [18, -22], [4, -16], [-10, -14]].map(([x, y]) => `<circle cx="${x}" cy="${y}" r="8.5" fill="${C.white}"/>`).join('') +
  `<circle cx="2" cy="-24" r="10" fill="${C.white}"/>` +
  `<ellipse cx="26" cy="-32" rx="9" ry="11" fill="${C.dark}" ${S}/><ellipse cx="18" cy="-38" rx="6" ry="3" fill="${C.dark}" ${S} stroke-width="2" transform="rotate(-20 18 -38)"/><circle cx="29" cy="-34" r="2" fill="${C.white}"/>`
function canine(fill, { fox = false, look = 0 } = {}) {
  return (
    `<path d="M-22 -24 Q-48 -26 -44 -50 Q-30 -34 -18 -16 Z" fill="${fill}" ${S}/>` +
    (fox ? `<path d="M-44 -50 Q-46 -40 -38 -36 Q-40 -44 -44 -50 Z" fill="${C.white}" ${S} stroke-width="2"/>` : '') +
    `<path d="M-14 -10 V0 M-4 -10 V0 M8 -10 V0 M18 -10 V0" stroke="${INK}" stroke-width="5" stroke-linecap="round"/>` +
    `<ellipse cx="0" cy="-20" rx="24" ry="13" fill="${fill}" ${S}/>` +
    `<g transform="rotate(${look} 24 -34)">` +
    `<path d="M16 -42 L18 -60 L27 -45 Z M25 -45 L32 -60 L35 -42 Z" fill="${fill}" ${S}/>` +
    `<circle cx="26" cy="-34" r="13" fill="${fill}" ${S}/>` +
    `<path d="M34 -40 Q48 -34 50 -30 Q40 -24 32 -26 Z" fill="${fox ? C.white : fill}" ${S}/>` +
    `<circle cx="50" cy="-30" r="2.6" fill="${INK}"/><circle cx="30" cy="-38" r="2.2" fill="${INK}"/></g>`
  )
}
const frog = () =>
  `<ellipse cx="-16" cy="-3" rx="9" ry="5" fill="${C.leaf}" ${S}/><ellipse cx="16" cy="-3" rx="9" ry="5" fill="${C.leaf}" ${S}/>` +
  `<ellipse cx="0" cy="-16" rx="22" ry="16" fill="${C.leaf}" ${S}/><ellipse cx="0" cy="-12" rx="12" ry="8" fill="${C.sage}"/>` +
  `<circle cx="-10" cy="-30" r="8" fill="${C.white}" ${S}/><circle cx="10" cy="-30" r="8" fill="${C.white}" ${S}/>` +
  `${eyes(-9, 11, -30, 3)}<path d="M-8 -20 Q0 -14 8 -20" fill="none" ${S} stroke-width="2.2"/>` +
  `<circle cx="-15" cy="-19" r="2.5" fill="${C.pink}" opacity=".8"/><circle cx="15" cy="-19" r="2.5" fill="${C.pink}" opacity=".8"/>`
const crow = (meat = true, open = false) =>
  `<path d="M-4 0 V-8 M4 0 V-8" ${S} stroke-width="2.5"/>` +
  `<path d="M-18 -20 L-34 -10 L-30 -24 Z" fill="${C.dark}" ${S}/>` +
  `<ellipse cx="0" cy="-20" rx="20" ry="14" fill="${C.dark}" ${S}/>` +
  `<path d="M-10 -24 Q4 -30 10 -16 Q-2 -10 -10 -24 Z" fill="#584a63" ${S} stroke-width="2"/>` +
  `<circle cx="16" cy="-34" r="11" fill="${C.dark}" ${S}/><circle cx="19" cy="-36" r="3" fill="${C.white}"/><circle cx="20" cy="-36" r="1.5" fill="${INK}"/>` +
  (open
    ? `<path d="M25 -38 L40 -42 L26 -33 Z M26 -31 L39 -26 L25 -28 Z" fill="${C.sun}" ${S} stroke-width="2"/>`
    : `<path d="M25 -37 L40 -32 L25 -28 Z" fill="${C.sun}" ${S} stroke-width="2"/>`) +
  (meat ? `<path d="M38 -36 Q50 -40 52 -30 Q50 -22 40 -26 Z" fill="${C.pink}" ${S} stroke-width="2"/><circle cx="46" cy="-31" r="2" fill="${C.white}"/>` : '')
const tiger = () =>
  `<path d="M-22 -24 Q-44 -30 -40 -48" fill="none" stroke="${INK}" stroke-width="8" stroke-linecap="round"/><path d="M-22 -24 Q-44 -30 -40 -48" fill="none" stroke="${C.orange}" stroke-width="3" stroke-linecap="round"/>` +
  `<path d="M-16 -10 V0 M-4 -10 V0 M10 -10 V0 M20 -10 V0" stroke="${INK}" stroke-width="6" stroke-linecap="round"/>` +
  `<ellipse cx="0" cy="-22" rx="28" ry="16" fill="${C.orange}" ${S}/>` +
  `<path d="M-14 -36 q4 8 0 14 M-2 -38 q4 8 0 14 M10 -37 q4 8 0 14" fill="none" ${S} stroke-width="2.5"/>` +
  `<circle cx="18" cy="-48" r="6" fill="${C.orange}" ${S}/><circle cx="40" cy="-48" r="6" fill="${C.orange}" ${S}/>` +
  `<circle cx="29" cy="-36" r="16" fill="${C.orange}" ${S}/>` +
  `<path d="M22 -50 l2 6 M29 -52 v6 M36 -50 l-2 6" ${S} stroke-width="2"/>` +
  `<ellipse cx="31" cy="-28" rx="9" ry="6" fill="${C.white}" ${S} stroke-width="2"/><circle cx="31" cy="-31" r="2.4" fill="${INK}"/>` +
  `<path d="M22 -40 l4 2 M40 -40 l-4 2" ${S} stroke-width="2.5"/>${eyes(24, 37, -38)}`
const horse = () =>
  `<path d="M-26 -38 Q-42 -30 -38 -12" fill="none" stroke="${INK}" stroke-width="8" stroke-linecap="round"/><path d="M-26 -38 Q-42 -30 -38 -12" fill="none" stroke="${C.dark}" stroke-width="3" stroke-linecap="round"/>` +
  `<path d="M-18 -26 V0 M-8 -26 V0 M12 -26 V0 M22 -26 V0" stroke="${INK}" stroke-width="7" stroke-linecap="round"/><path d="M-18 -26 V-3 M-8 -26 V-3 M12 -26 V-3 M22 -26 V-3" stroke="${C.wood}" stroke-width="2.5" stroke-linecap="round"/>` +
  `<path d="M16 -44 L28 -70 L40 -64 L30 -32 Z" fill="${C.wood}" ${S}/>` +
  `<ellipse cx="0" cy="-36" rx="30" ry="15" fill="${C.wood}" ${S}/>` +
  `<ellipse cx="40" cy="-68" rx="15" ry="9" fill="${C.wood}" ${S} transform="rotate(24 40 -68)"/>` +
  `<path d="M30 -78 L32 -88 L37 -78 Z" fill="${C.wood}" ${S} stroke-width="2.5"/>` +
  `<path d="M26 -76 Q18 -60 18 -46" fill="none" stroke="${C.dark}" stroke-width="5" stroke-linecap="round"/>` +
  `<circle cx="40" cy="-72" r="2.2" fill="${INK}"/><circle cx="50" cy="-62" r="1.6" fill="${INK}"/>`
const dragonHead = () =>
  `<path d="M-60 30 Q-40 -10 -10 10 Q10 26 30 6" fill="none" stroke="${INK}" stroke-width="30" stroke-linecap="round"/><path d="M-60 30 Q-40 -10 -10 10 Q10 26 30 6" fill="none" stroke="${C.leaf}" stroke-width="23" stroke-linecap="round"/>` +
  `<path d="M-52 14 l6 -10 l4 10 M-34 2 l6 -10 l4 10 M-16 6 l6 -10 l4 10" fill="${C.orange}" ${S} stroke-width="2.5"/>` +
  `<path d="M20 -18 Q10 -46 26 -54 Q24 -36 32 -24 Z M40 -20 Q40 -50 58 -52 Q48 -36 50 -22 Z" fill="${C.sand}" ${S}/>` +
  `<ellipse cx="40" cy="0" rx="34" ry="24" fill="${C.leaf}" ${S}/>` +
  `<path d="M56 -4 Q86 -6 88 8 Q86 22 56 20 Z" fill="${C.leaf}" ${S}/>` +
  `<circle cx="80" cy="2" r="2.4" fill="${INK}"/><path d="M62 14 H84" ${S} stroke-width="2"/>` +
  `<path d="M84 18 Q100 30 92 44 M78 20 Q86 40 72 48" fill="none" ${S} stroke-width="2.5"/>` +
  `<circle cx="42" cy="-6" r="9" fill="${C.white}" ${S}/><circle cx="45" cy="-6" r="4" fill="${INK}"/>`
const snakeWithLegs = () =>
  `<path d="M-70 -14 Q-50 -44 -26 -16 T22 -16 T62 -30" fill="none" stroke="${INK}" stroke-width="20" stroke-linecap="round"/>` +
  `<path d="M-70 -14 Q-50 -44 -26 -16 T22 -16 T62 -30" fill="none" stroke="${C.leaf}" stroke-width="13" stroke-linecap="round"/>` +
  `<path d="M-50 -26 l-2 -4 M-30 -18 l0 -4 M-6 -8 l2 -4 M20 -14 l2 -4 M40 -24 l2 -4" ${S} stroke-width="2"/>` +
  `<path d="M-44 -24 L-48 -2 M-30 -10 L-30 6 M2 -8 L-2 10 M22 -10 L24 8" stroke="${C.brick}" stroke-width="4" stroke-linecap="round"/>` +
  `<path d="M-52 -2 H-44 M-34 6 H-26 M-6 10 H2 M20 8 H28" stroke="${C.brick}" stroke-width="3" stroke-linecap="round"/>` +
  `<ellipse cx="68" cy="-34" rx="14" ry="10" fill="${C.leaf}" ${S}/><circle cx="72" cy="-38" r="2.4" fill="${INK}"/>` +
  `<path d="M82 -32 l10 2 l-4 -4 M92 -30 l-4 4" fill="none" stroke="${C.brick}" stroke-width="2" stroke-linecap="round"/>`
const deer = () =>
  `<path d="M-10 -10 V0 M-2 -10 V0 M10 -10 V0 M16 -10 V0" stroke="${INK}" stroke-width="4" stroke-linecap="round"/>` +
  `<ellipse cx="0" cy="-18" rx="18" ry="10" fill="${C.apricot}" ${S}/><circle cx="-4" cy="-20" r="2" fill="${C.white}"/><circle cx="6" cy="-16" r="2" fill="${C.white}"/>` +
  `<path d="M12 -24 L18 -38" stroke="${INK}" stroke-width="7" stroke-linecap="round"/><path d="M12 -24 L18 -38" stroke="${C.apricot}" stroke-width="3" stroke-linecap="round"/>` +
  `<ellipse cx="22" cy="-42" rx="9" ry="7" fill="${C.apricot}" ${S}/><path d="M18 -48 l-4 -10 l-4 2 M18 -48 l0 -8 M24 -48 l4 -10 l4 2" fill="none" ${S} stroke-width="2"/><circle cx="25" cy="-43" r="1.8" fill="${INK}"/>`
const monkey = () =>
  `<path d="M-12 -14 Q-30 -10 -26 -32" fill="none" ${S}/><ellipse cx="0" cy="-16" rx="13" ry="14" fill="${C.wood}" ${S}/>` +
  `<circle cx="-12" cy="-40" r="5" fill="${C.wood}" ${S}/><circle cx="12" cy="-40" r="5" fill="${C.wood}" ${S}/><circle cx="0" cy="-40" r="12" fill="${C.wood}" ${S}/>` +
  `<ellipse cx="0" cy="-37" rx="8" ry="7" fill="${C.skin}"/>${eyes(-3, 3, -40, 1.8)}<path d="M-3 -34 q3 2 6 0" fill="none" ${S} stroke-width="1.8"/>`

// ---------- Các cảnh ----------
const scenes = {
  'my-cat': () =>
    sky('#ffeedd') +
    `<rect x="0" y="0" width="320" height="140" fill="${C.apricot}"/><rect x="212" y="26" width="70" height="56" fill="${C.sky}" ${S}/><path d="M247 26 V82 M212 54 H282" ${S}/>` +
    `<rect x="-5" y="140" width="330" height="70" fill="${C.wood}" ${S}/><path d="M60 140 L40 205 M160 140 V205 M260 140 L280 205" ${S} stroke-width="2"/>` +
    chair(140, 170, 1.15) +
    g(128, 128, 1.15, cat()) +
    `<ellipse cx="236" cy="168" rx="26" ry="6" fill="${C.white}" ${S}/>` +
    fishProp(236, 160, 1.1) +
    heart(60, 70, 1.1) +
    heart(86, 46, 0.7, C.coral),
  'xiaoming-day': () =>
    sky(C.sky) + sun(270, 40) + cloud(70, 40, 0.9) + ground(C.sage) + school(170, 162, 1.1) + P(68, 170, 0.95, { body: C.sand, mood: 'smile', arms: 'side' }) + flower(268, 168, 1) + flower(290, 172, 0.8, C.lilac),
  'rainy-day': () =>
    sky('#dcd8ea') +
    cloud(70, 34, 1.2, C.white) +
    cloud(230, 26, 1.1, C.white) +
    rain(30, 60, 270) +
    ground(C.sage, 172) +
    g(160, 170, 1.15, `<rect x="-70" y="-70" width="140" height="70" fill="${C.coral}" ${S}/><path d="M-80 -66 H80 L70 -86 H-70 Z" fill="${C.brick}" ${S}/><path d="M-80 -66 q10 10 20 0 q10 10 20 0 q10 10 20 0 q10 10 20 0 q10 10 20 0 q10 10 20 0 q10 10 20 0 q10 10 20 0" fill="${C.white}" ${S} stroke-width="2.5"/>`) +
    P(126, 168, 0.85, { body: C.lilac, girl: true, mood: 'smile' }) +
    P(168, 168, 0.65, { body: C.sand, mood: 'smile', arms: 'hold' }) +
    cup(204, 168, 1),
  'good-friend': () =>
    sky(C.coral) +
    heart(160, 44, 1.5) +
    heart(110, 30, 0.8, C.white) +
    heart(214, 28, 0.8, C.white) +
    `<rect x="-5" y="150" width="330" height="60" fill="${C.apricot}" ${S}/>` +
    `<rect x="110" y="136" width="100" height="14" rx="4" fill="${C.wood}" ${S}/>` +
    bowl(140, 136, 0.9) +
    bowl(180, 136, 0.9) +
    P(70, 170, 1.05, { body: C.sky, mood: 'smile', arms: 'side' }) +
    P(250, 170, 1.05, { body: C.lilac, girl: true, mood: 'smile', arms: 'side' }, true),
  'stump-rabbit': () =>
    sky(C.sky) + sun(50, 40, 16) + cloud(250, 36, 0.8) + ground(C.sand) + tree(200, 166, 1.25) + g(234, 170, 0.8, rabbit(true)) + P(110, 170, 1, { body: C.leaf, hat: true, mood: 'smile', arms: 'chin' }) + seedling(40, 176) + seedling(64, 178) + seedling(286, 178),
  'tortoise-hare': () =>
    sky(C.sky) + cloud(160, 30, 0.9) + ground(C.sage) + tree(80, 166, 1.1) + g(80, 172, 0.85, rabbit(true)) + zzz(106, 112) + g(200, 174, 1, turtle()) + flag(286, 176) + flower(30, 174, 0.8),
  'wolf-is-coming': () =>
    sky('#dff0ff') + mountain(80, 150, 200, 110, C.lilac) + mountain(240, 150, 180, 90, '#d6ccf5', false) + ground(C.sage, 160) + g(70, 172, 0.85, sheep()) + g(120, 178, 0.7, sheep()) + g(280, 176, 0.95, canine(C.gray, { look: 0 }), true) + P(190, 172, 0.85, { body: C.sand, mood: 'shout', arms: 'up' }) + bang(214, 80),
  'birthday-gift': () =>
    sky(C.lilac) + star(40, 30, 7) + star(280, 40, 6) + star(250, 18, 4) + `<rect x="-5" y="160" width="330" height="50" fill="${C.coral}" ${S}/>` + card(170, 128, 1.3) + flower(250, 168, 1.1) + flower(272, 172, 0.9, C.sun) + flower(230, 172, 0.85, C.lilac) + P(76, 172, 0.95, { body: C.pink, girl: true, mood: 'smile', arms: 'up' }),
  'frog-in-well': () =>
    sky(C.sky) + water(122) + ground(C.sand, 172) + well(130, 176, 1.4) + g(130, 132, 0.85, frog()) + g(240, 178, 1, turtle('#8cc7a1')) + cloud(250, 36, 0.8) + sun(54, 40, 14),
  'pulling-seedlings': () =>
    sky('#e9f6ff') + sun(272, 38, 15) + ground('#d8c39a', 150) + [0, 1, 2].map((r) => [0, 1, 2, 3, 4, 5, 6, 7].map((i) => seedling(20 + i * 40 + r * 10, 160 + r * 16, 0.8)).join('')).join('') + P(170, 164, 1, { body: C.leaf, hat: true, mood: 'smile', arms: 'up' }) + g(204, 102, 0.9, `<path d="M0 0 V-16" ${S}/><path d="M0 -12 Q-12 -14 -12 -24 Q-2 -22 0 -12 Z" fill="${C.leaf}" ${S} stroke-width="2.5"/><path d="M0 0 l-4 8 M0 0 l4 7" ${S} stroke-width="2"/>`),
  'fox-and-crow': () =>
    sky(C.sky) +
    ground(C.sage) +
    `<path d="M196 166 L200 60 L216 60 L220 166 Z" fill="${C.wood}" ${S}/><path d="M208 90 Q170 80 130 82" fill="none" stroke="${INK}" stroke-width="10" stroke-linecap="round"/><path d="M208 90 Q170 80 130 82" fill="none" stroke="${C.wood}" stroke-width="5" stroke-linecap="round"/>` +
    `<path d="M150 50 Q150 10 200 14 Q260 4 270 46 Q290 70 250 80 Q210 86 196 70 Q150 80 150 50 Z" fill="${C.leaf}" ${S}/>` +
    g(150, 82, 1, crow(true, false)) +
    g(90, 172, 1.1, canine(C.orange, { fox: true, look: -25 })) +
    flower(270, 172, 0.9),
  'snake-legs': () =>
    sky(C.sand) + `<rect x="-5" y="150" width="330" height="60" fill="${C.apricot}" ${S}/>` + g(150, 130, 1.25, snakeWithLegs()) + jug(270, 160, 1.2) + P(48, 172, 0.85, { body: C.sky, mood: 'smile', arms: 'side' }),
  'fox-borrows-tiger': () =>
    sky('#dff3e6') + pine(30, 160, 1.3) + pine(290, 160, 1.2) + pine(250, 150, 0.9, '#a8dbb3') + ground(C.sage) + g(170, 172, 1.2, tiger()) + g(100, 172, 0.9, canine(C.orange, { fox: true })) + g(286, 178, 0.6, rabbit(), true) + g(240, 176, 0.6, deer(), true),
  'mend-the-pen': () =>
    sky(C.sky) + sun(40, 36, 14) + ground(C.sage) + fence(150, 168, 9, 4) + g(210, 172, 0.8, sheep()) + g(260, 172, 0.7, sheep()) + P(80, 170, 1, { body: C.sand, mood: 'worry', arms: 'side' }) + cloud(250, 34, 0.8),
  'old-man-horse': () =>
    sky('#ffe9cf') + sun(270, 40, 16) + mountain(70, 130, 150, 70, '#f2d8c2', false) + wall(30, 140, 290) + ground(C.sand, 160) + g(190, 172, 1.15, horse()) + P(70, 174, 1, { body: C.lilac, old: true, mood: 'smile', arms: 'chin' }),
  'foolish-old-man': () =>
    sky(C.sky) + mountain(110, 160, 220, 140, C.lilac) + mountain(240, 160, 180, 110, '#d6ccf5') + ground(C.sand, 168) + P(70, 176, 1, { body: C.sky, old: true, mood: 'smile', arms: 'hold' }) + hoe(80, 164, 22) + P(140, 178, 0.7, { body: C.coral, mood: 'smile', arms: 'down' }) + basket(166, 178, 0.9) + cloud(270, 28, 0.7),
  'mark-the-boat': () =>
    sky(C.sky) + sun(54, 40, 15) + cloud(250, 36, 0.9) + water(118) + sword(96, 150, 200, 0.85) + g(196, 132, 1.1, `${person({ body: C.coral, hat: true, mood: 'smile', arms: 'side' })}`) + boat(190, 136, 1.2, true),
  'lord-ye-dragons': () =>
    sky('#fff1e0') + `<rect x="0" y="0" width="320" height="150" fill="${C.apricot}"/>` + windowFrame(180, 14, 130, 110) + g(196, 70, 0.95, dragonHead(), true) + `<rect x="178" y="12" width="134" height="114" fill="none" ${S} stroke-width="4"/>` + `<rect x="-5" y="150" width="330" height="60" fill="${C.wood}" ${S}/>` + P(70, 176, 1.05, { body: C.sand, mood: 'shock', arms: 'up' }) + bang(100, 70) + g(30, 182, 1, `<path d="M-8 0 Q-8 -8 0 -8 H8 Q12 -4 8 0 Z" fill="${C.brick}" ${S} stroke-width="2"/>`),
  'spear-and-shield': () =>
    sky(C.lilac) + `<rect x="-5" y="160" width="330" height="50" fill="${C.sand}" ${S}/>` + spear(230, 172, 14) + shield(220, 168, 1.15) + P(90, 176, 1.05, { body: C.coral, hat: true, mood: 'shout', arms: 'up' }) + `<text x="140" y="70" font-family="Arial, sans-serif" font-weight="800" font-size="26" fill="${INK}">?</text>`,
  'worrying-sky': () =>
    sky('#3d3560') + moon(260, 46) + [[40, 30], [90, 60], [140, 24], [190, 50], [300, 100], [30, 100]].map(([x, y]) => star(x, y, 6)).join('') + `<path d="M130 90 L176 60" stroke="${C.sand}" stroke-width="3" stroke-linecap="round" stroke-dasharray="4 6"/>` + star(180, 58, 8) + ground('#8f86b0', 168) + P(150, 176, 1.05, { body: C.sky, mood: 'worry', arms: 'up' }) + pine(270, 172, 0.9, '#7fb08c') + pine(40, 172, 0.8, '#7fb08c'),
}

for (const [id, draw] of Object.entries(scenes)) {
  // Thuộc tính lặp trong một thẻ (vd nét mặc định ${S} rồi ghi đè stroke-width) làm SVG lỗi khi mở bằng <img>: giữ giá trị sau cùng.
  const body = draw().replace(/<[a-z]+\s[^>]*>/g, (tag) => {
    const seen = new Set()
    const attrs = [...tag.matchAll(/\s([a-z-]+)="[^"]*"/g)].reverse().filter(([, name]) => !seen.has(name) && seen.add(name))
    const head = tag.match(/^<[a-z]+/)[0]
    return head + attrs.reverse().map(([a]) => a).join('') + (tag.endsWith('/>') ? '/>' : '>')
  })
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 320 200" width="320" height="200">${body}</svg>\n`
  writeFileSync(join(outDir, `${id}.svg`), svg)
}
console.log(`Đã vẽ ${Object.keys(scenes).length} ảnh bìa vào public/stories/`)
