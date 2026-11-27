import clsx from 'clsx'
import { ChevronDown, Download, Library, Minus, Plus, Printer, RotateCcw, Trash2, X } from 'lucide-react'
import { useEffect, useMemo, useRef, useState, type ReactNode } from 'react'
import { useTranslation } from 'react-i18next'
import { Link, Navigate, useLocation, useNavigate, useParams } from 'react-router-dom'
import Page from '../components/layout/Page'
import GridCell from '../components/worksheet/GridCell'
import Sheet from '../components/worksheet/Sheet'
import SheetThumb from '../components/worksheet/SheetThumb'
import {
  allTemplates,
  cellColors,
  defaultSettings,
  fontFamilies,
  groupOf,
  limits,
  templateDefaults,
  templateGroups,
  uses,
  type CellColor,
  type CellType,
  type FontStyle,
  type Template,
  type TraceStyle,
  type WorksheetSettings,
} from '../components/worksheet/settings'
import { useSheetData, type HanEdits } from '../components/worksheet/useSheetData'
import { hanChars, loadChars, parseJsonWords, parseLines, type CharInfo } from '../data/lookup'
import { useDictionary } from '../hooks/useDictionary'
import { UNCATEGORIZED, useNotebook } from '../hooks/useNotebook'
import type { HSKLevel, Word } from '../types'

const WORDS_KEY = 'worksheet_words'
const SETTINGS_KEY = 'worksheet_settings'
const HAN_KEY = 'worksheet_han'
const HAN_EDITS_KEY = 'worksheet_han_edits'
const PASSAGE_KEY = 'worksheet_passage'
const A4_PX = (297 / 25.4) * 96 // chiều cao một trang A4 ở 96 dpi
const SHEET_PX = (210 / 25.4) * 96
const PAGE_GAP_PX = (6 / 25.4) * 96 // khoảng cách giữa các trang trong bản xem trước
const SCROLLBAR_PX = 10

const SAMPLE_HAN = '永远学习汉字'
const SAMPLE_WORDS = ['学习', '朋友', '老师', '工作']
const SAMPLE_PASSAGE = '床前明月光，疑是地上霜。\n举头望明月，低头思故乡。'

const readJson = <T,>(key: string, fallback: T): T => {
  try {
    const v = JSON.parse(localStorage.getItem(key) ?? 'null')
    if (v === null) return fallback
    return typeof fallback === 'object' && !Array.isArray(fallback) ? { ...fallback, ...v } : v
  } catch {
    return fallback
  }
}
const readText = (key: string, fallback: string) => localStorage.getItem(key) ?? fallback

/** Nạp font chữ Hán viết tay (Google Fonts) một lần, cho máy chưa có KaiTi / STXingkai. */
function useHandwritingFonts() {
  useEffect(() => {
    const id = 'worksheet-fonts'
    if (document.getElementById(id)) return
    const link = document.createElement('link')
    link.id = id
    link.rel = 'stylesheet'
    // Chỉ còn Long Cang cho kiểu Hành thư (Khải thư đã dùng font App Kai của app).
    link.href = 'https://fonts.googleapis.com/css2?family=Long+Cang&display=swap'
    document.head.appendChild(link)
  }, [])
}

function useChars() {
  const [chars, setChars] = useState<CharInfo>()
  useEffect(() => {
    loadChars().then(setChars)
  }, [])
  return chars
}

/** Cài đặt cho một mẫu: cài đặt chung + giá trị mặc định riêng của mẫu khi người dùng chưa đổi. */
const forTemplate = (s: WorksheetSettings, tp: Template): WorksheetSettings => ({ ...s, ...templateDefaults[tp], template: tp })

export default function Worksheet() {
  const { template } = useParams()
  if (!template) return <WorksheetLibrary />
  if (!allTemplates.includes(template as Template)) return <Navigate to="/worksheet" replace />
  return <WorksheetEditor key="editor" template={template as Template} />
}

// =====================================================================
// Thư viện mẫu
// =====================================================================

function WorksheetLibrary() {
  const { t } = useTranslation()
  const { words: dictionary } = useDictionary()
  const chars = useChars()
  const sampleWords = useMemo(
    () => SAMPLE_WORDS.map((h) => dictionary.find((w) => w.hanzi === h)).filter((w): w is Word => !!w),
    [dictionary],
  )
  const data = useSheetData({
    words: sampleWords,
    hanText: SAMPLE_HAN,
    passageText: SAMPLE_PASSAGE,
    coverTitle: defaultSettings.coverTitle,
    dictionary,
    chars,
    needStrokes: true,
  })

  return (
    <Page feature="worksheet" size="wide" description={t('worksheet.library_subtitle')}>
      {templateGroups.map(({ group, templates }, gi) => (
        <div key={group} className={gi ? 'mt-10' : ''}>
          <h2 className="text-2xl font-extrabold">{t(`worksheet.group_${group}`)}</h2>
          <div className="mt-4 grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-3">
            {templates.map((tp) => (
              <Link key={tp} to={`/worksheet/${tp}`} className="box group flex flex-col p-4 transition-transform hover:-translate-y-1">
                <div className="flex justify-center rounded-2xl bg-[#ece6dc] p-3">
                  <div className="shadow-block-sm">
                    <SheetThumb settings={forTemplate(defaultSettings, tp)} data={data} width={170} />
                  </div>
                </div>
                <h3 className="mt-3 font-extrabold">{t(`worksheet.template_${tp}`)}</h3>
                <p className="mt-1 text-sm text-ink-soft">{t(`worksheet.desc_${tp}`)}</p>
              </Link>
            ))}
          </div>
        </div>
      ))}
    </Page>
  )
}

// =====================================================================
// Trang soạn một mẫu
// =====================================================================

function WorksheetEditor({ template }: { template: Template }) {
  const { t } = useTranslation()
  const navigate = useNavigate()
  const location = useLocation()
  const { words: dictionary } = useDictionary()
  const { sets } = useNotebook()
  const chars = useChars()
  useHandwritingFonts()

  const group = groupOf(template)
  const [base, setBase] = useState<WorksheetSettings>(() => readJson(SETTINGS_KEY, defaultSettings))
  // Mỗi mẫu nhớ cài đặt riêng (số ô, kiểu ô…) để đổi qua lại không bị lẫn.
  const [perTemplate, setPerTemplate] = useState<Partial<Record<Template, Partial<WorksheetSettings>>>>(() =>
    readJson('worksheet_template_settings', {}),
  )
  const settings: WorksheetSettings = useMemo(
    () => ({
      ...forTemplate(base, template),
      ...perTemplate[template],
      template,
    }),
    [base, perTemplate, template],
  )
  const set = <K extends keyof WorksheetSettings>(k: K, v: WorksheetSettings[K]) => {
    // Tiêu đề, nội dung bìa và hiển thị dùng chung; bố cục, kiểu ô… lưu theo mẫu.
    const shared: (keyof WorksheetSettings)[] = ['showHeader', 'coverTitle', 'coverSub', 'coverBook', 'coverSlogan']
    if (shared.includes(k)) setBase((s) => ({ ...s, [k]: v }))
    else setPerTemplate((p) => ({ ...p, [template]: { ...p[template], [k]: v } }))
  }

  const [words, setWords] = useState<Word[]>(() => readJson<Word[]>(WORDS_KEY, []))
  const [hanText, setHanText] = useState(() => readText(HAN_KEY, SAMPLE_HAN))
  const [hanEdits, setHanEdits] = useState<HanEdits>(() => readJson<HanEdits>(HAN_EDITS_KEY, {}))
  const [passageText, setPassageText] = useState(() => readText(PASSAGE_KEY, SAMPLE_PASSAGE))
  const [input, setInput] = useState('')
  const [message, setMessage] = useState<string | null>(null)

  // Mở từ bảng sửa bộ: lấy danh sách từ và tên bộ làm tiêu đề.
  useEffect(() => {
    const st = location.state as { words?: Word[]; title?: string } | null
    if (!st?.words?.length) return
    setWords(st.words)
    if (st.title) set('title', st.title)
    navigate(location.pathname, { replace: true, state: null })
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [location.state, location.pathname, navigate])

  useEffect(() => localStorage.setItem(WORDS_KEY, JSON.stringify(words)), [words])
  useEffect(() => localStorage.setItem(SETTINGS_KEY, JSON.stringify(base)), [base])
  useEffect(() => localStorage.setItem('worksheet_template_settings', JSON.stringify(perTemplate)), [perTemplate])
  useEffect(() => localStorage.setItem(HAN_KEY, hanText), [hanText])
  useEffect(() => localStorage.setItem(HAN_EDITS_KEY, JSON.stringify(hanEdits)), [hanEdits])
  useEffect(() => localStorage.setItem(PASSAGE_KEY, passageText), [passageText])

  const data = useSheetData({
    words,
    hanText,
    passageText,
    coverTitle: settings.coverTitle,
    dictionary,
    chars,
    edits: hanEdits,
    needStrokes: group === 'han',
  })

  // Ảnh thu nhỏ các mẫu cùng nhóm: chỉ lấy ít nội dung cho nhẹ.
  const thumbData = useMemo(
    () => ({
      ...data,
      words: data.words.slice(0, 6),
      han: data.han.slice(0, 4),
      passage: data.passage.slice(0, 3),
    }),
    [data],
  )

  const addFromInput = () => {
    const text = input.trim()
    if (!text) return
    let found: Word[] = []
    let missing: string[] = []
    try {
      if (text.startsWith('[') || text.startsWith('{') || text.startsWith('```')) found = parseJsonWords(text, dictionary, chars)
      else {
        const parsed = parseLines(text, dictionary, chars)
        found = parsed.flatMap((p) => (p.word ? [p.word] : []))
        missing = parsed.filter((p) => !p.word).map((p) => p.source)
      }
    } catch (e) {
      setMessage(
        t('bulk.json_error', {
          message: e instanceof Error ? e.message : String(e),
        }),
      )
      return
    }
    const have = new Set(words.map((w) => w.hanzi))
    const fresh = found.filter((w) => !have.has(w.hanzi))
    setWords((ws) => [...ws, ...fresh])
    setInput(missing.join('\n'))
    setMessage(
      t('worksheet.added', { count: fresh.length }) + (missing.length ? ' ' + t('worksheet.missing', { list: missing.join(', ') }) : ''),
    )
  }

  const loadSet = (id: string) => {
    const list = sets.find((s) => s.id === id)?.words
    if (!list) return
    setWords(list)
    set('title', id === UNCATEGORIZED ? t('notebook.uncategorized') : (sets.find((s) => s.id === id)?.name ?? ''))
    setMessage(t('worksheet.added', { count: list.length }))
  }

  const addHsk = (level: HSKLevel) => {
    const have = new Set(hanChars(hanText))
    const add: string[] = []
    for (const w of dictionary) if (w.hsk_level === level) for (const c of hanChars(w.hanzi)) if (!have.has(c)) (have.add(c), add.push(c))
    setHanText((s) => s + add.join(''))
  }

  // ---------- Xem trước: khung cao đúng một trang A4 (đã thu nhỏ), các trang cuộn bên trong ----------
  const frameRef = useRef<HTMLDivElement>(null)
  const viewRef = useRef<HTMLDivElement>(null)
  const sheetRef = useRef<HTMLDivElement>(null)
  const [scale, setScale] = useState(1)
  const [sheetHeight, setSheetHeight] = useState(A4_PX)
  const [pages, setPages] = useState(1)
  const [current, setCurrent] = useState(1)
  useEffect(() => {
    const measure = () => {
      if (frameRef.current) {
        // Vừa bề ngang khung (trừ lề và thanh cuộn) và vừa chiều cao màn hình, để thấy trọn một trang.
        const byWidth = (frameRef.current.clientWidth - 16 - SCROLLBAR_PX) / SHEET_PX
        const byHeight = (window.innerHeight - 140) / A4_PX
        setScale(Math.max(0.25, Math.min(1, byWidth, byHeight)))
      }
      if (sheetRef.current) {
        setSheetHeight(sheetRef.current.offsetHeight)
        setPages(Math.max(1, sheetRef.current.querySelectorAll(':scope > .ws-page').length))
      }
    }
    const ro = new ResizeObserver(measure)
    if (frameRef.current) ro.observe(frameRef.current)
    if (sheetRef.current) ro.observe(sheetRef.current)
    window.addEventListener('resize', measure)
    return () => {
      ro.disconnect()
      window.removeEventListener('resize', measure)
    }
  }, [])
  const pageStep = (A4_PX + PAGE_GAP_PX) * scale
  const onScroll = () => {
    const el = viewRef.current
    if (el) setCurrent(Math.min(pages, Math.floor((el.scrollTop + pageStep / 2) / pageStep) + 1))
  }
  const hasContent =
    group === 'vocab'
      ? words.length > 0
      : group === 'han'
        ? data.han.length > 0
        : template === 'blank' || template === 'cover' || data.passage.length > 0
  const u = uses[template]

  return (
    <Page
      feature="worksheet"
      size="full"
      title={t(`worksheet.template_${template}`)}
      description={t(`worksheet.desc_${template}`)}
      crumbs={[{ label: t(`worksheet.group_${group}`) }, { label: t(`worksheet.template_${template}`) }]}
      actions={
        <>
          <span className="text-sm text-ink-soft">{t('worksheet.pages_exact', { count: pages })}</span>
          <button type="button" onClick={() => window.print()} disabled={!hasContent} className="btn btn-accent px-5 py-3">
            <Printer size={18} />
            {t('worksheet.print')}
          </button>
        </>
      }
    >
      <div className="grid gap-6 lg:grid-cols-[1fr_22rem] print:block">
        {/* Xem trước */}
        {/* Cột xem trước: khung ôm sát trang giấy, nằm giữa cột */}
        <div ref={frameRef} className="min-w-0 self-start lg:sticky lg:top-24 print:static">
          <div className="box relative mx-auto w-fit overflow-hidden bg-[#e9e4da] p-1.5 print:w-auto print:overflow-visible print:rounded-none print:border-0 print:bg-white print:p-0 print:shadow-none">
            <div
              ref={viewRef}
              onScroll={onScroll}
              className="worksheet-preview overflow-y-auto overscroll-contain [scrollbar-width:thin]"
              style={{
                height: A4_PX * scale + 2,
                width: SHEET_PX * scale + SCROLLBAR_PX,
              }}
            >
              <div style={{ height: sheetHeight * scale }}>
                <div className="ws-scale origin-top-left" style={{ transform: `scale(${scale})`, width: SHEET_PX }}>
                  <Sheet ref={sheetRef} settings={settings} data={data} />
                </div>
              </div>
            </div>
            {pages > 1 && (
              <span className="tag pointer-events-none absolute right-5 bottom-4 bg-card/90 print:hidden">
                {t('worksheet.page_of', { current, total: pages })}
              </span>
            )}
          </div>
        </div>

        {/* Bảng điều khiển */}
        <aside className="space-y-5 print:hidden">
          <Panel title={t('worksheet.same_group')} hint={t('worksheet.templates_hint')}>
            <div className="grid grid-cols-3 gap-2">
              {templateGroups
                .find((g) => g.group === group)!
                .templates.map((tp) => (
                  <Link
                    key={tp}
                    to={`/worksheet/${tp}`}
                    aria-current={tp === template ? 'page' : undefined}
                    className={clsx(
                      'flex flex-col items-center gap-1 rounded-2xl border-2 p-1.5 text-center text-[11px] leading-tight font-bold',
                      tp === template ? 'border-ink bg-sand' : 'border-transparent hover:border-ink hover:bg-paper',
                    )}
                  >
                    <span className="border border-line">
                      <SheetThumb
                        settings={{
                          ...forTemplate(base, tp),
                          ...perTemplate[tp],
                          template: tp,
                        }}
                        data={thumbData}
                        width={78}
                      />
                    </span>
                    {t(`worksheet.template_${tp}`)}
                  </Link>
                ))}
            </div>
          </Panel>

          {group === 'han' && (
            <HanPanel text={hanText} setText={setHanText} items={data.han} edits={hanEdits} setEdits={setHanEdits} onHsk={addHsk} />
          )}

          {group === 'vocab' && (
            <Panel title={t('worksheet.words_title')}>
              <select
                value=""
                onChange={(e) => e.target.value && loadSet(e.target.value)}
                aria-label={t('worksheet.load_set')}
                className="field py-2 text-sm"
              >
                <option value="">{t('worksheet.load_set')}</option>
                {sets.map((s) => (
                  <option key={s.id} value={s.id}>
                    {s.id === UNCATEGORIZED ? t('notebook.uncategorized') : s.name} ({s.words.length})
                  </option>
                ))}
              </select>
              <textarea
                value={input}
                onChange={(e) => setInput(e.target.value)}
                rows={4}
                placeholder={t('worksheet.input_placeholder')}
                aria-label={t('worksheet.words_title')}
                className="field mt-3 resize-y text-sm"
              />
              <button type="button" onClick={addFromInput} disabled={!input.trim()} className="btn btn-primary mt-2 w-full">
                <Download size={16} />
                {t('worksheet.add_to_list')}
              </button>
              {message && <p className="mt-2 border-2 border-ink bg-sage px-2 py-1.5 text-xs">{message}</p>}

              <div className="mt-3 overflow-hidden rounded-2xl border-2 border-ink">
                <div className="flex items-center justify-between border-b-2 border-ink bg-paper px-3 py-2 text-sm font-semibold">
                  {t('worksheet.in_print', { count: words.length })}
                  {words.length > 0 && (
                    <button type="button" onClick={() => setWords([])} className="flex items-center gap-1 text-xs text-brick">
                      <Trash2 size={13} />
                      {t('worksheet.clear_all')}
                    </button>
                  )}
                </div>
                <ul className="max-h-56 divide-y-2 divide-line overflow-y-auto">
                  {words.map((w) => (
                    <li key={w.id} className="flex items-center gap-2 px-3 py-1.5 text-sm">
                      <span className="text-lg font-bold">{w.hanzi}</span>
                      <span className="text-xs text-ink-soft italic">{w.pinyin}</span>
                      <span className="min-w-0 flex-1 truncate text-xs">{w.meaning_vi}</span>
                      <button
                        type="button"
                        onClick={() => setWords((ws) => ws.filter((x) => x.id !== w.id))}
                        aria-label={`${t('notebook.remove_word')} ${w.hanzi}`}
                        className="p-0.5 text-ink-soft hover:text-brick"
                      >
                        <X size={15} />
                      </button>
                    </li>
                  ))}
                </ul>
              </div>
            </Panel>
          )}

          {(template === 'copy' || template === 'lined') && (
            <Panel title={t('worksheet.text_title')}>
              <textarea
                value={passageText}
                onChange={(e) => setPassageText(e.target.value)}
                rows={6}
                placeholder={t('worksheet.text_placeholder')}
                aria-label={t('worksheet.text_title')}
                className="field resize-y text-lg"
              />
            </Panel>
          )}

          {template === 'cover' && (
            <Panel title={t('worksheet.cover_content')}>
              {(
                [
                  ['coverTitle', 'cover_title'],
                  ['coverSub', 'cover_sub'],
                  ['coverBook', 'cover_book'],
                  ['coverSlogan', 'cover_slogan'],
                ] as const
              ).map(([k, label]) => (
                <label key={k} className="mt-3 block text-sm font-semibold first:mt-0">
                  {t(`worksheet.${label}`)}
                  <input
                    value={settings[k]}
                    maxLength={k === 'coverTitle' ? 8 : 40}
                    onChange={(e) => set(k, e.target.value)}
                    className="field mt-1 py-2 text-sm font-normal"
                  />
                </label>
              ))}
            </Panel>
          )}

          {template !== 'cover' && (
            <Panel title={t('worksheet.page')}>
              <label className="block text-sm font-semibold" htmlFor="ws-title">
                {t('worksheet.title')}
              </label>
              <input
                id="ws-title"
                value={settings.title}
                onChange={(e) => set('title', e.target.value)}
                placeholder={t(`worksheet.template_${template}`)}
                className="field mt-1 py-2 text-sm"
              />
              <Toggle label={t('worksheet.show_header')} value={settings.showHeader} onChange={(v) => set('showHeader', v)} />
            </Panel>
          )}

          {(u.cell || template === 'lined') && (
            <Panel title={template === 'lined' ? t('worksheet.line_color') : t('worksheet.cell')}>
              {u.cell && (
                <div className="mb-3 grid grid-cols-5 gap-1.5">
                  {(['tian', 'mi', 'square', 'hui', 'jiu'] as CellType[]).map((c) => (
                    <button
                      key={c}
                      type="button"
                      onClick={() => set('cell', c)}
                      aria-pressed={settings.cell === c}
                      title={t(`worksheet.cell_${c}`)}
                      className={clsx('btn flex-col gap-1 px-1 py-1.5 text-[11px]', settings.cell === c && 'bg-sand')}
                    >
                      <span className="w-7">
                        <GridCell type={c} color={cellColors[settings.color]} traceStyle="fill" opacity={30} fontFamily="" />
                      </span>
                      {t(`worksheet.cell_${c}`)}
                    </button>
                  ))}
                </div>
              )}
              <div className="flex items-center justify-between text-sm">
                {u.cell ? t('worksheet.cell_color') : ''}
                <div className="flex gap-2">
                  {(Object.keys(cellColors) as CellColor[]).map((c) => (
                    <button
                      key={c}
                      type="button"
                      onClick={() => set('color', c)}
                      aria-pressed={settings.color === c}
                      aria-label={t(`worksheet.color_${c}`)}
                      title={t(`worksheet.color_${c}`)}
                      className={clsx(
                        'h-8 w-8 rounded-full border-2 border-ink',
                        settings.color === c && 'ring-2 ring-ink ring-offset-2 ring-offset-card',
                      )}
                      style={{ background: cellColors[c] }}
                    />
                  ))}
                </div>
              </div>
            </Panel>
          )}

          {(u.perRow || u.traceRows || u.blankRows || u.pages) && (
            <Panel title={t('worksheet.layout')}>
              {u.perRow && (
                <Stepper
                  label={template === 'lined' ? t('worksheet.chars_per_line') : t('worksheet.per_row')}
                  value={settings.perRow}
                  range={template === 'lined' ? limits.linedPerRow : limits.perRow}
                  onChange={(v) => set('perRow', v)}
                />
              )}
              {u.traceRows && (
                <Stepper
                  label={t('worksheet.trace_rows')}
                  value={settings.traceRows}
                  range={limits.traceRows}
                  onChange={(v) => set('traceRows', v)}
                />
              )}
              {u.blankRows && (
                <Stepper
                  label={template === 'pinyin' ? t('worksheet.write_rows') : t('worksheet.blank_rows')}
                  value={settings.blankRows}
                  range={limits.blankRows}
                  onChange={(v) => set('blankRows', v)}
                />
              )}
              {u.pages && (
                <Stepper label={t('worksheet.pages_count')} value={settings.pages} range={limits.pages} onChange={(v) => set('pages', v)} />
              )}
              {u.faded && (
                <Slider
                  label={template === 'trace' ? t('worksheet.faded') : t('worksheet.faded_chars')}
                  display={`${Math.min(settings.faded, settings.perRow)}/${settings.perRow}`}
                  value={Math.min(settings.faded, settings.perRow)}
                  min={0}
                  max={settings.perRow}
                  onChange={(v) => set('faded', v)}
                />
              )}
            </Panel>
          )}

          {(u.font || u.fontSize) && (
            <Panel title={t('worksheet.text')}>
              {u.font && (
                <div className="grid grid-cols-2 gap-2">
                  {(['kai', 'xing'] as FontStyle[]).map((f) => (
                    <button
                      key={f}
                      type="button"
                      onClick={() => set('font', f)}
                      aria-pressed={settings.font === f}
                      className={clsx('btn flex-col gap-0 py-1.5', settings.font === f && 'bg-sand')}
                    >
                      <span className="text-xl" style={{ fontFamily: fontFamilies[f] }}>
                        永远
                      </span>
                      <span className="text-xs">{t(`worksheet.font_${f}`)}</span>
                    </button>
                  ))}
                </div>
              )}
              {u.trace && (
                <>
                  <p className="mt-3 text-sm font-semibold">{t('worksheet.trace_style')}</p>
                  <div className="mt-1.5 grid grid-cols-2 gap-2">
                    {(['fill', 'outline', 'dashed', 'thin'] as TraceStyle[]).map((ts) => (
                      <button
                        key={ts}
                        type="button"
                        onClick={() => set('traceStyle', ts)}
                        aria-pressed={settings.traceStyle === ts}
                        className={clsx('btn px-2 py-1.5 text-xs', settings.traceStyle === ts && 'bg-sand')}
                      >
                        {t(`worksheet.style_${ts}`)}
                      </button>
                    ))}
                  </div>
                  <Slider
                    label={t('worksheet.opacity')}
                    display={`${settings.opacity}%`}
                    value={settings.opacity}
                    min={10}
                    max={100}
                    step={5}
                    onChange={(v) => set('opacity', v)}
                  />
                </>
              )}
              {u.fontSize && (
                <Slider
                  label={t('worksheet.font_size')}
                  display={`${settings.fontSize}px`}
                  value={settings.fontSize}
                  min={limits.fontSize[0]}
                  max={limits.fontSize[1]}
                  onChange={(v) => set('fontSize', v)}
                />
              )}
            </Panel>
          )}

          <Panel title={t('worksheet.display')}>
            {u.pinyin && <Toggle label={t('editor.col_pinyin')} value={settings.showPinyin} onChange={(v) => set('showPinyin', v)} />}
            {u.meaning && <Toggle label={t('editor.col_meaning')} value={settings.showMeaning} onChange={(v) => set('showMeaning', v)} />}
            <button
              type="button"
              onClick={() =>
                setPerTemplate((p) => ({
                  ...p,
                  [template]: { title: settings.title },
                }))
              }
              className="mt-3 flex items-center gap-1.5 text-sm font-semibold text-ink-soft hover:text-ink"
            >
              <RotateCcw size={14} />
              {t('worksheet.reset')}
            </button>
          </Panel>
          <p className="text-xs text-ink-soft">{t('worksheet.print_hint')}</p>
        </aside>
      </div>
    </Page>
  )
}

/** Ô nhập chữ Hán + danh sách chữ (sửa được pinyin / Hán Việt / nghĩa). */
function HanPanel({
  text,
  setText,
  items,
  edits,
  setEdits,
  onHsk,
}: {
  text: string
  setText: (s: string) => void
  items: { char: string; pinyin: string; hanViet: string; meaning: string }[]
  edits: HanEdits
  setEdits: (f: (e: HanEdits) => HanEdits) => void
  onHsk: (level: HSKLevel) => void
}) {
  const { t } = useTranslation()
  const [hskOpen, setHskOpen] = useState(false)
  const [listOpen, setListOpen] = useState(false)
  const edit = (c: string, k: 'pinyin' | 'hanViet' | 'meaning', v: string) => setEdits((e) => ({ ...e, [c]: { ...e[c], [k]: v } }))

  return (
    <Panel title={t('worksheet.han_title')}>
      <textarea
        value={text}
        onChange={(e) => setText(e.target.value)}
        rows={3}
        placeholder={t('worksheet.han_placeholder')}
        aria-label={t('worksheet.han_title')}
        className="field resize-y text-xl"
        style={{ fontFamily: 'var(--font-kai)' }}
      />
      <div className="mt-2 flex flex-wrap items-center gap-2">
        <button type="button" onClick={() => setHskOpen((o) => !o)} aria-expanded={hskOpen} className="btn px-3 py-1.5 text-sm">
          <Library size={15} />
          {t('worksheet.pick_hsk')}
        </button>
        {text && (
          <button type="button" onClick={() => setText('')} className="flex items-center gap-1 text-sm font-semibold text-brick">
            <Trash2 size={14} />
            {t('worksheet.clear_all')}
          </button>
        )}
      </div>
      {hskOpen && (
        <div className="mt-2 grid grid-cols-6 gap-1.5">
          {([1, 2, 3, 4, 5, 6] as HSKLevel[]).map((l) => (
            <button
              key={l}
              type="button"
              onClick={() => {
                onHsk(l)
                setHskOpen(false)
              }}
              className="btn px-0 py-1 text-xs"
            >
              HSK{l}
            </button>
          ))}
        </div>
      )}

      <div className="mt-3 overflow-hidden rounded-2xl border-2 border-ink">
        <button
          type="button"
          onClick={() => setListOpen((o) => !o)}
          aria-expanded={listOpen}
          className="flex w-full items-center gap-2 bg-paper px-3 py-2 text-left text-sm font-semibold"
        >
          <ChevronDown size={15} className={clsx('transition-transform', !listOpen && '-rotate-90')} />
          {t('worksheet.han_in_print', { count: items.length })}
        </button>
        {listOpen && (
          <ul className="max-h-72 divide-y-2 divide-line overflow-y-auto border-t-2 border-ink">
            {items.map((h) => (
              <li key={h.char} className="flex items-center gap-2 px-2 py-1.5">
                <span className="w-7 text-center text-2xl" style={{ fontFamily: 'var(--font-kai)' }}>
                  {h.char}
                </span>
                <div className="grid min-w-0 flex-1 grid-cols-3 gap-1">
                  {(['pinyin', 'hanViet', 'meaning'] as const).map((k) => (
                    <input
                      key={k}
                      value={h[k]}
                      onChange={(e) => edit(h.char, k, e.target.value)}
                      aria-label={`${h.char} ${t(`worksheet.han_${k}`)}`}
                      placeholder={t(`worksheet.han_${k}`)}
                      className="field rounded-lg px-1.5 py-1 text-xs"
                    />
                  ))}
                </div>
                {edits[h.char] && (
                  <button
                    type="button"
                    onClick={() =>
                      setEdits((e) => {
                        const n = { ...e }
                        delete n[h.char]
                        return n
                      })
                    }
                    title={t('worksheet.reset')}
                    aria-label={`${t('worksheet.reset')} ${h.char}`}
                    className="p-0.5 text-ink-soft hover:text-ink"
                  >
                    <RotateCcw size={13} />
                  </button>
                )}
              </li>
            ))}
          </ul>
        )}
      </div>
    </Panel>
  )
}

function Panel({ title, hint, children }: { title: string; hint?: string; children: ReactNode }) {
  return (
    <div className="box p-4">
      <div className="mb-3 flex items-baseline justify-between gap-2">
        <h2 className="font-bold">{title}</h2>
        {hint && <span className="text-xs text-ink-muted">{hint}</span>}
      </div>
      {children}
    </div>
  )
}

function Toggle({ label, value, onChange }: { label: string; value: boolean; onChange: (v: boolean) => void }) {
  return (
    <label className="mt-3 flex cursor-pointer items-center justify-between gap-3 text-sm first:mt-0">
      {label}
      <button
        type="button"
        role="switch"
        aria-checked={value}
        onClick={() => onChange(!value)}
        className={clsx('relative h-6 w-11 rounded-full border-2 border-ink transition-colors', value ? 'bg-sage' : 'bg-card')}
      >
        <span
          className={clsx(
            'absolute top-0.5 h-4 w-4 rounded-full border-2 border-ink bg-card transition-all',
            value ? 'left-5.5' : 'left-0.5',
          )}
        />
      </button>
    </label>
  )
}

function Stepper({
  label,
  value,
  range,
  onChange,
}: {
  label: string
  value: number
  range: readonly [number, number]
  onChange: (v: number) => void
}) {
  return (
    <div className="mt-2 flex items-center justify-between text-sm first:mt-0">
      {label}
      <div className="flex items-center gap-2">
        <button
          type="button"
          onClick={() => onChange(value - 1)}
          disabled={value <= range[0]}
          aria-label={`${label} −`}
          className="btn p-1"
        >
          <Minus size={14} />
        </button>
        <span className="w-6 text-center font-bold tabular-nums">{value}</span>
        <button
          type="button"
          onClick={() => onChange(value + 1)}
          disabled={value >= range[1]}
          aria-label={`${label} +`}
          className="btn p-1"
        >
          <Plus size={14} />
        </button>
      </div>
    </div>
  )
}

function Slider({
  label,
  display,
  value,
  min,
  max,
  step = 1,
  onChange,
}: {
  label: string
  display: string
  value: number
  min: number
  max: number
  step?: number
  onChange: (v: number) => void
}) {
  return (
    <div className="mt-3">
      <div className="flex justify-between text-sm">
        {label}
        <span className="font-bold tabular-nums">{display}</span>
      </div>
      <input
        type="range"
        min={min}
        max={max}
        step={step}
        value={value}
        onChange={(e) => onChange(Number(e.target.value))}
        aria-label={label}
        className="mt-1 w-full accent-[var(--color-brick)]"
      />
    </div>
  )
}
