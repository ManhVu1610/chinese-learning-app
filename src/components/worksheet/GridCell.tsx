import type { StrokeData } from '../../lib/strokes'
import type { CellType, TraceStyle } from './settings'

const S = 90 / 1024

/** Vẽ các nét 1..upto của một chữ (nét mới nhất màu đỏ) trong khung 0–100. */
export function StrokePaths({ data, upto, ink = '#2f2a25', accent = '#d0543f' }: { data: StrokeData; upto: number; ink?: string; accent?: string }) {
  return (
    <g transform={`translate(5 ${5 + 900 * S}) scale(${S} ${-S})`}>
      {data.strokes.slice(0, upto).map((d, i) => (
        <path key={i} d={d} fill={i === upto - 1 ? accent : ink} />
      ))}
    </g>
  )
}

/** Chữ vẽ bằng nét (không khung), dùng cho dãy thứ tự nét nhỏ. */
export function StrokeGlyph({ data, upto, className }: { data: StrokeData; upto: number; className?: string }) {
  return (
    <svg viewBox="0 0 100 100" className={className} aria-hidden>
      <StrokePaths data={data} upto={upto} ink="#d98b7c" accent="#c0392b" />
    </svg>
  )
}

/** Đường kẻ hướng dẫn bên trong ô (theo loại ô). Toạ độ trong khung 0–100. */
function Guides({ type, color }: { type: CellType; color: string }) {
  const dash = { stroke: color, strokeWidth: 0.8, strokeDasharray: '3 2.5', fill: 'none' }
  switch (type) {
    case 'tian':
      return (
        <>
          <line x1="50" y1="0" x2="50" y2="100" {...dash} />
          <line x1="0" y1="50" x2="100" y2="50" {...dash} />
        </>
      )
    case 'mi':
      return (
        <>
          <line x1="50" y1="0" x2="50" y2="100" {...dash} />
          <line x1="0" y1="50" x2="100" y2="50" {...dash} />
          <line x1="0" y1="0" x2="100" y2="100" {...dash} />
          <line x1="100" y1="0" x2="0" y2="100" {...dash} />
        </>
      )
    case 'hui':
      return <rect x="22" y="18" width="56" height="64" {...dash} strokeDasharray="none" strokeWidth={0.9} />
    case 'jiu':
      return (
        <>
          <line x1="33.3" y1="0" x2="33.3" y2="100" {...dash} />
          <line x1="66.6" y1="0" x2="66.6" y2="100" {...dash} />
          <line x1="0" y1="33.3" x2="100" y2="33.3" {...dash} />
          <line x1="0" y1="66.6" x2="100" y2="66.6" {...dash} />
        </>
      )
    default:
      return null
  }
}

/** Một ô luyện viết; nếu có `char` thì vẽ chữ mẫu theo kiểu tô. */
export default function GridCell({
  type,
  color,
  char,
  traceStyle,
  opacity,
  fontFamily,
  steps,
  bare,
}: {
  type: CellType
  color: string
  char?: string
  traceStyle: TraceStyle
  opacity: number
  fontFamily: string
  /** Vẽ chữ theo từng bước nét (thay cho chữ font) */
  steps?: { data: StrokeData; upto: number }
  /** Không vẽ khung và đường kẻ (chữ trên dòng kẻ) */
  bare?: boolean
}) {
  const ink = `rgba(40, 36, 32, ${opacity / 100})`
  // Nét viền mảnh hơn mảng tô, nên cần đậm hơn để cùng mức "độ đậm" vẫn nhìn rõ.
  const outlineInk = `rgba(40, 36, 32, ${Math.min(0.95, (opacity / 100) * 2)})`
  const textProps =
    traceStyle === 'fill'
      ? { fill: ink }
      : {
          fill: 'none',
          stroke: outlineInk,
          strokeWidth: traceStyle === 'thin' ? 0.8 : 1.4,
          strokeDasharray: traceStyle === 'dashed' ? '3 2' : traceStyle === 'thin' ? '1.5 1.5' : undefined,
        }

  return (
    <svg viewBox="0 0 100 100" className="block aspect-square w-full" aria-hidden={!char}>
      {!bare && (
        <>
          <rect x="0" y="0" width="100" height="100" fill="#fff" stroke={color} strokeWidth="1.6" />
          <Guides type={type} color={color} />
        </>
      )}
      {steps && <StrokePaths data={steps.data} upto={steps.upto} />}
      {!steps && char && (
        <text
          x="50"
          y="53"
          textAnchor="middle"
          dominantBaseline="central"
          fontSize="78"
          style={{ fontFamily }}
          {...textProps}
        >
          {char}
        </text>
      )}
    </svg>
  )
}
