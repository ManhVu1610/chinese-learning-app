import { forwardRef, type ReactNode } from 'react'
import { useTranslation } from 'react-i18next'
import { hanChars, perCharPinyin, type CharInfo } from '../../data/lookup'
import type { StrokeData } from '../../lib/strokes'
import type { PinyinToken } from '../../lib/textTools'
import type { Word } from '../../types'
import GridCell, { StrokeGlyph } from './GridCell'
import Paginate, { type Block } from './Paginate'
import { cellColors, fontFamilies, type HanItem, type WorksheetSettings } from './settings'

export interface SheetData {
  words: Word[]
  han: HanItem[]
  strokes: Record<string, StrokeData | null>
  /** Đoạn văn đã tách thành từng chữ kèm pinyin, mỗi phần tử là một đoạn */
  passage: PinyinToken[][]
  coverTokens: PinyinToken[]
  chars?: CharInfo
}

const CONTENT_MM = 186 // 210 − 2 × 12 mm lề
const PAGE_CONTENT_MM = 273 // 297 − 2 × 12 mm lề
const INK = '#2f2a25'
const SOFT = '#6b645c'
const LINE = '#9b958c'

const block = (key: string | number, node: ReactNode): Block => ({ key: String(key), node })

/**
 * Phiếu in A4, đã chia sẵn thành từng trang (.ws-page). Kích thước tính bằng mm
 * để bản in khớp bản xem trước, kể cả chỗ ngắt trang.
 */
const Sheet = forwardRef<HTMLDivElement, { settings: WorksheetSettings; data: SheetData }>(function Sheet({ settings: s, data }, ref) {
  const { t } = useTranslation()
  const { words, han, strokes, passage, coverTokens, chars } = data
  const color = cellColors[s.color]
  const font = fontFamilies[s.font]
  const title = s.title.trim() || t(`worksheet.template_${s.template}`)
  const cellProps = { type: s.cell, color, traceStyle: s.traceStyle, opacity: s.opacity, fontFamily: font }
  const solid = { ...cellProps, traceStyle: 'fill' as const, opacity: 100 }

  const header = s.showHeader ? (
    <header className="pb-[5mm]">
      <h1 className="text-center text-[5mm] font-bold">{title}</h1>
      <p className="mt-[1.5mm] flex justify-end gap-[8mm] text-[2.8mm]">
        <span>
          {t('worksheet.name')}: <span className="inline-block w-[45mm] border-b border-dotted border-[#2f2a25]" />
        </span>
        <span>
          {t('worksheet.date')}: <span className="inline-block w-[28mm] border-b border-dotted border-[#2f2a25]" />
        </span>
      </p>
    </header>
  ) : null

  /** Một hàng `n` ô; `cells[i]` là nội dung ô thứ i, `pinyin` hiện phía trên. */
  const Row = ({ cells = [], pinyin, n = s.perRow }: { cells?: ReactNode[]; pinyin?: string[]; n?: number }) => (
    <div className="grid" style={{ gridTemplateColumns: `repeat(${n}, minmax(0, 1fr))` }}>
      {pinyin &&
        Array.from({ length: n }, (_, i) => (
          <span key={`p${i}`} className="h-[4mm] truncate text-center text-[2.5mm] leading-[4mm]" style={{ color: SOFT }}>
            {pinyin[i] ?? ''}
          </span>
        ))}
      {Array.from({ length: n }, (_, i) => (
        <div key={i} className="-mr-px -mb-px">
          {cells[i] ?? <GridCell {...cellProps} />}
        </div>
      ))}
    </div>
  )
  const faded = (c: string, k: string | number) => <GridCell key={k} {...cellProps} char={c} />
  const emptyRows = (count: number) => Array.from({ length: count }, (_, i) => <Row key={`e${i}`} />)
  const notice = (msg: string): Block[] => [block('empty', <p className="pt-[20mm] text-center text-[4mm] text-[#9b958c]">{msg}</p>)]

  // ---------- Nhóm chữ Hán ----------
  const strokesBlocks = (): Block[] =>
    han.map((h) => {
      const d = strokes[h.char]
      const seq: ReactNode[] = [<GridCell key="m" {...solid} char={h.char} />]
      if (d) d.strokes.forEach((_, i) => seq.push(<GridCell key={`s${i}`} {...cellProps} steps={{ data: d, upto: i + 1 }} />))
      // Phần còn lại của hàng cuối: chữ mờ.
      const fill = (s.perRow - (seq.length % s.perRow)) % s.perRow
      for (let i = 0; i < fill; i++) seq.push(faded(h.char, `f${i}`))
      const rows: ReactNode[][] = []
      for (let i = 0; i < seq.length; i += s.perRow) rows.push(seq.slice(i, i + s.perRow))
      const fadedRow = Array.from({ length: Math.min(s.faded, s.perRow) }, (_, i) => faded(h.char, i))
      return block(
        h.char,
        <section className="pb-[4mm]">
          <p className="mb-[1mm] text-[2.6mm] leading-tight">
            {h.hanViet && <span className="font-bold uppercase">{h.hanViet}</span>}
            {s.showPinyin && h.pinyin && (
              <span className="ml-[1.5mm]" style={{ color: SOFT }}>
                {h.pinyin}
              </span>
            )}
            {s.showMeaning && h.meaning && (
              <span className="ml-[1.5mm]" style={{ color: SOFT }}>
                {h.meaning}
              </span>
            )}
          </p>
          {rows.map((r, i) => (
            <Row key={i} cells={r} />
          ))}
          {Array.from({ length: s.traceRows }, (_, i) => (
            <Row key={`t${i}`} cells={fadedRow} />
          ))}
          {emptyRows(s.blankRows)}
        </section>,
      )
    })

  const bigBlocks = (): Block[] => {
    const rows = Math.max(1, s.traceRows)
    const c = CONTENT_MM / (s.perRow + 1.1 + rows) // cạnh ô nhỏ (mm)
    const info = 1.1 * c
    const big = info + rows * c
    return han.map((h) => {
      const d = strokes[h.char]
      const fadedRow = Array.from({ length: Math.min(s.faded, s.perRow) }, (_, i) => faded(h.char, i))
      return block(
        h.char,
        <div className="pb-[2.5mm]">
          <section className="flex border border-[#c9c3b8]">
            <div className="shrink-0 border-r border-[#c9c3b8]" style={{ width: `${big}mm`, height: `${big}mm` }}>
              <GridCell {...solid} bare char={h.char} />
            </div>
            <div className="min-w-0 flex-1">
              <div className="flex items-center gap-[2mm] overflow-hidden px-[1.5mm]" style={{ height: `${info}mm` }}>
                <div className="shrink-0 text-[2.4mm] leading-tight">
                  <p className="text-[2.8mm] font-bold">{h.pinyin}</p>
                  {h.hanViet && (
                    <p className="uppercase" style={{ color: SOFT }}>
                      {h.hanViet}
                    </p>
                  )}
                </div>
                <div className="min-w-0">
                  {d && (
                    <div className="flex flex-wrap">
                      {d.strokes.map((_, i) => (
                        <StrokeGlyph key={i} data={d} upto={i + 1} className="h-[5.5mm] w-[5.5mm]" />
                      ))}
                    </div>
                  )}
                  {s.showMeaning && h.meaning && (
                    <p className="truncate text-[2.3mm]" style={{ color: SOFT }}>
                      {h.meaning}
                    </p>
                  )}
                </div>
              </div>
              {Array.from({ length: rows }, (_, i) => (
                <Row key={i} cells={s.traceRows ? fadedRow : []} />
              ))}
            </div>
          </section>
        </div>,
      )
    })
  }

  // ---------- Nhóm từ vựng ----------
  const traceBlocks = (): Block[] =>
    words.map((w) => {
      const hs = hanChars(w.hanzi)
      const py = perCharPinyin(w, chars)
      const reps = Math.max(0, Math.min(s.faded, Math.floor(s.perRow / Math.max(1, hs.length))))
      const glyphs = Array.from({ length: reps }, () => hs).flat()
      const pys = Array.from({ length: reps }, () => py).flat()
      return block(
        w.id,
        <section className="pb-[5mm]">
          <div className="mb-[1.5mm] flex items-end justify-between gap-[4mm]">
            <div className="min-w-0">
              <p className="text-[4mm] leading-tight">
                <span className="font-bold" style={{ fontFamily: font }}>
                  {w.hanzi}
                </span>{' '}
                {s.showPinyin && (
                  <span className="text-[2.8mm]" style={{ color: SOFT }}>
                    ({w.pinyin})
                  </span>
                )}
              </p>
              {s.showMeaning && (
                <p className="text-[2.6mm]">
                  {w.han_viet && <span className="font-bold uppercase">{w.han_viet}</span>}
                  {w.han_viet && w.meaning_vi && ' - '}
                  {w.meaning_vi}
                </p>
              )}
            </div>
            {s.showMeaning && w.example && (
              <div className="max-w-[55%] text-right">
                <p className="text-[2.8mm]">{w.example}</p>
                {w.example_vi && (
                  <p className="text-[2.4mm] italic" style={{ color: SOFT }}>
                    {w.example_vi}
                  </p>
                )}
              </div>
            )}
          </div>
          {Array.from({ length: Math.max(1, s.traceRows) }, (_, i) => (
            <Row key={`t${i}`} cells={glyphs.map((g, k) => faded(g, k))} pinyin={s.showPinyin ? pys : undefined} />
          ))}
          {emptyRows(s.blankRows)}
        </section>,
      )
    })

  // Bảng tự kiểm tra: dựng bằng lưới để chia trang theo từng hàng và lặp lại hàng tiêu đề.
  const checkCols = '10mm 1.4fr 1fr 1.2fr 1.6fr'
  const cell = 'border-r border-b px-[1.5mm] py-[1.2mm]'
  const checkHeader = (
    <div className="grid border-t border-l bg-[#dcefd9] font-bold" style={{ gridTemplateColumns: checkCols, borderColor: LINE, fontSize: `${s.fontSize}px` }}>
      {['#', t('worksheet.col_word'), t('editor.col_pinyin'), t('editor.col_meaning'), t('worksheet.col_rewrite')].map((h, i) => (
        <span key={i} className={cell} style={{ borderColor: LINE }}>
          {h}
        </span>
      ))}
    </div>
  )
  const checkBlocks = (): Block[] =>
    words.map((w, i) =>
      block(
        w.id,
        <div className="grid border-l" style={{ gridTemplateColumns: checkCols, borderColor: LINE, fontSize: `${s.fontSize}px` }}>
          <span className={cell} style={{ borderColor: LINE }}>
            {i + 1}
          </span>
          <span className={`${cell} whitespace-nowrap`} style={{ borderColor: LINE, fontFamily: font, letterSpacing: '0.15em' }}>
            {w.hanzi}
          </span>
          {[0, 1, 2].map((k) => (
            <span key={k} className={cell} style={{ borderColor: LINE }} />
          ))}
        </div>,
      ),
    )

  // Nhìn pinyin viết chữ: mỗi từ là một cụm ô, các cụm xếp nối nhau thành dòng (cách nhau một ô).
  const pinyinBlocks = (): Block[] => {
    const c = CONTENT_MM / s.perRow
    const lines: Word[][] = []
    let cur: Word[] = []
    let used = 0
    for (const w of words) {
      const n = Math.min(s.perRow, Math.max(1, perCharPinyin(w, chars).length))
      const need = (cur.length ? 1 : 0) + n
      if (cur.length && used + need > s.perRow) {
        lines.push(cur)
        cur = []
        used = 0
      }
      used += cur.length ? n + 1 : n
      cur.push(w)
    }
    if (cur.length) lines.push(cur)
    return lines.map((line, li) =>
      block(
        li,
        <div className="flex pb-[4mm]" style={{ columnGap: `${c}mm` }}>
          {line.map((w) => {
            const py = perCharPinyin(w, chars)
            const n = Math.min(s.perRow, Math.max(1, py.length))
            return (
              <div key={w.id} style={{ width: `${n * c}mm` }}>
                <Row n={n} pinyin={py} />
                {Array.from({ length: s.blankRows }, (_, i) => (
                  <Row key={i} n={n} />
                ))}
              </div>
            )
          })}
        </div>,
      ),
    )
  }

  // ---------- Nhóm đoạn văn ----------
  const visibleTokens = (para: PinyinToken[]) => para.filter((tk) => tk.text.trim())

  const copyBlocks = (): Block[] =>
    passage.flatMap((para, pi) => {
      const toks = visibleTokens(para)
      const rows: PinyinToken[][] = []
      for (let i = 0; i < toks.length; i += s.perRow) rows.push(toks.slice(i, i + s.perRow))
      return rows.map((r, ri) =>
        block(
          `${pi}-${ri}`,
          <div className="pb-[2mm]">
            <Row cells={r.map((tk, k) => faded(tk.text, k))} pinyin={s.showPinyin ? r.map((tk) => tk.pinyin) : undefined} />
            {Array.from({ length: s.blankRows }, (_, i) => (
              <Row key={i} pinyin={s.showPinyin ? [] : undefined} />
            ))}
          </div>,
        ),
      )
    })

  const linedBlocks = (): Block[] => {
    const slot = CONTENT_MM / s.perRow
    const lines: (PinyinToken | null)[][] = []
    for (const para of passage) {
      const toks: (PinyinToken | null)[] = [null, null, ...visibleTokens(para)] // lùi đầu đoạn 2 chữ
      for (let i = 0; i < toks.length; i += s.perRow) lines.push(toks.slice(i, i + s.perRow))
    }
    for (let i = 0; i < s.blankRows; i++) lines.push([])
    return lines.map((line, li) =>
      block(
        li,
        <div className="border-b-[0.35mm] pt-[1mm]" style={{ borderColor: color }}>
          <div className="flex border-b-[0.2mm]" style={{ borderColor: `${color}66` }}>
            {Array.from({ length: s.perRow }, (_, i) => (
              <span key={i} className="h-[3.6mm] text-center text-[2.4mm] leading-[3.6mm]" style={{ width: `${slot}mm`, color: SOFT }}>
                {s.showPinyin ? (line[i]?.pinyin ?? '') : ''}
              </span>
            ))}
          </div>
          <div className="flex">
            {Array.from({ length: s.perRow }, (_, i) => (
              <span key={i} style={{ width: `${slot}mm` }}>
                {line[i] ? <GridCell {...cellProps} bare char={line[i]!.text} /> : <span className="block aspect-square" />}
              </span>
            ))}
          </div>
        </div>,
      ),
    )
  }

  // ---------- Mẫu theo trang cố định ----------
  const blankPages = () => {
    const c = CONTENT_MM / s.perRow
    const headerMm = s.showHeader ? 15 : 0
    const rows = Math.max(1, Math.floor((PAGE_CONTENT_MM - headerMm - 2) / c))
    return Array.from({ length: s.pages }, (_, p) => (
      <div key={p} className="ws-page">
        {header}
        {emptyRows(rows)}
      </div>
    ))
  }

  const coverPage = () => {
    const chars8 = coverTokens.filter((tk) => tk.text.trim()).slice(0, 8)
    const size = chars8.length > 6 ? 19 : 24
    return (
      <div className="ws-page flex flex-col items-center text-center">
        <div className="mt-[40mm]">
          {s.showPinyin && (
            <div className="flex">
              {chars8.map((tk, i) => (
                <span key={i} className="text-[3.6mm]" style={{ width: `${size}mm` }}>
                  {tk.pinyin}
                </span>
              ))}
            </div>
          )}
          <div className="flex">
            {chars8.map((tk, i) => (
              <div key={i} className="-mr-px" style={{ width: `${size}mm` }}>
                <GridCell {...solid} char={tk.text} />
              </div>
            ))}
          </div>
        </div>
        {s.coverSub && (
          <p className="mt-[5mm] text-[3.2mm] tracking-[0.3em]" style={{ color: '#c0392b', fontFamily: font }}>
            {s.coverSub}
          </p>
        )}
        {s.coverBook && (
          <p className="mt-[12mm] text-[3.6mm] font-bold tracking-[0.35em]" style={{ fontFamily: font }}>
            {s.coverBook}
          </p>
        )}
        <div className="mt-[45mm] space-y-[8mm] text-[3.4mm]">
          {[t('worksheet.class'), t('worksheet.name')].map((label) => (
            <p key={label} className="flex items-end gap-[2mm]">
              <span className="w-[16mm] text-right">{label}:</span>
              <span className="inline-block w-[50mm] border-b border-[#2f2a25]" />
            </p>
          ))}
        </div>
        {s.coverSlogan && (
          <p className="mt-auto mb-[10mm] text-[3.2mm] tracking-[0.3em] whitespace-pre" style={{ fontFamily: font }}>
            {s.coverSlogan}
          </p>
        )}
      </div>
    )
  }

  const blocks = (): Block[] => {
    switch (s.template) {
      case 'strokes':
        return han.length ? strokesBlocks() : notice(t('worksheet.no_chars'))
      case 'big':
        return han.length ? bigBlocks() : notice(t('worksheet.no_chars'))
      case 'trace':
        return words.length ? traceBlocks() : notice(t('worksheet.no_words'))
      case 'check':
        return words.length ? checkBlocks() : notice(t('worksheet.no_words'))
      case 'pinyin':
        return words.length ? pinyinBlocks() : notice(t('worksheet.no_words'))
      case 'copy':
        return passage.length ? copyBlocks() : notice(t('worksheet.no_text'))
      case 'lined':
        return passage.length ? linedBlocks() : notice(t('worksheet.no_text'))
      default:
        return []
    }
  }

  return (
    <div ref={ref} className="worksheet-sheet worksheet-paged relative" style={{ width: '210mm', fontFamily: 'var(--font-sans)', color: INK }}>
      {s.template === 'blank' ? (
        blankPages()
      ) : s.template === 'cover' ? (
        coverPage()
      ) : (
        <Paginate header={header} repeat={s.template === 'check' && words.length ? checkHeader : undefined} blocks={blocks()} />
      )}
    </div>
  )
})

export default Sheet
