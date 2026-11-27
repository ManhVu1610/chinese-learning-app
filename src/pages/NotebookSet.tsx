import clsx from 'clsx'
import { ChevronDown, ChevronUp, FileDown, FileUp, Folder, Play, Plus, Printer, Save, Search, SquarePen, Trash2, X } from 'lucide-react'
import { useCallback, useEffect, useMemo, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { Link, useNavigate, useParams } from 'react-router-dom'
import Page from '../components/layout/Page'
import BulkImportDialog from '../components/notebook/BulkImportDialog'
import ImageButton from '../components/notebook/ImageButton'
import WordTypeSelect from '../components/notebook/WordTypeSelect'
import WordCard from '../components/WordCard'
import { normalize } from '../data/dictionary'
import { fillMissing, loadChars, lookupWord, newWordId, type CharInfo } from '../data/lookup'
import { useDictionary } from '../hooks/useDictionary'
import { UNCATEGORIZED, useNotebook } from '../hooks/useNotebook'
import { downloadJson, wordToJson } from '../lib/exportJson'
import type { Word } from '../types'

/** Cột của bảng sửa (màn hình rộng): # · chữ · pinyin · Hán Việt · từ loại · nghĩa · thao tác. */
const ROW_COLS = 'lg:grid-cols-[2rem_1.1fr_1fr_0.9fr_1.1fr_1.6fr_7rem]'

/** Một dòng trong bảng: key cố định để ô đang gõ không bị mất focus khi id của từ thay đổi. */
interface Row {
  key: string
  word: Word
}

const emptyWord = (): Word => ({
  id: newWordId(),
  hanzi: '',
  pinyin: '',
  han_viet: '',
  meaning_vi: '',
  meaning_en: '',
  hsk_level: 1,
  custom: true,
  word_types: [],
  example: '',
  example_pinyin: '',
  example_vi: '',
})

/** Đưa loại từ của dữ liệu HSK (word_type) vào danh sách chọn nhiều (word_types). */
const normalizeWord = (w: Word): Word => ({ ...w, word_types: w.word_types ?? (w.word_type ? [w.word_type] : []) })
const toRows = (words: Word[]): Row[] => words.map((w) => ({ key: w.id, word: normalizeWord(w) }))
const clean = (rows: Row[]) => rows.map((r) => r.word).filter((w) => w.hanzi.trim())
/** Dạng so sánh: bỏ trường rỗng và xếp khoá theo thứ tự, vì dữ liệu đã lưu có thể lược trường rỗng. */
const canon = (words: Word[]) =>
  JSON.stringify(
    words.map((w) =>
      Object.entries(w)
        .filter(([, v]) => v !== '' && v !== undefined && v !== null && !(Array.isArray(v) && v.length === 0))
        .sort(([a], [b]) => a.localeCompare(b)),
    ),
  )

/** Trang sửa một bộ từ vựng dạng bảng (hoặc bộ "Từ đã lưu" khi id = "saved"). */
export default function NotebookSet() {
  const { id = '' } = useParams()
  const { t } = useTranslation()
  const navigate = useNavigate()
  const nb = useNotebook()
  const { words: dictionary } = useDictionary()
  const [chars, setChars] = useState<CharInfo>()
  useEffect(() => {
    loadChars().then(setChars)
  }, [])

  const set = nb.sets.find((s) => s.id === id)
  const name = id === UNCATEGORIZED ? t('notebook.uncategorized') : set?.name
  const stored = useMemo(() => set?.words ?? [], [set?.words])
  // Đường dẫn cũ /notebook/saved trỏ về bộ "Chưa phân loại"; bộ này tự tạo khi cần.
  const { ensureUncategorizedSet } = nb
  useEffect(() => {
    if (id === 'saved') navigate(`/notebook/${UNCATEGORIZED}`, { replace: true })
    else if (id === UNCATEGORIZED) ensureUncategorizedSet()
  }, [id, navigate, ensureUncategorizedSet])
  const folderName =
    set?.folderId === UNCATEGORIZED
      ? t('notebook.uncategorized')
      : set?.folderId
        ? nb.folders.find((f) => f.id === set.folderId)?.name
        : undefined

  const [rows, setRows] = useState<Row[]>(() => toRows(stored))
  // Mở bộ khác trên cùng trang: nạp lại bảng.
  // eslint-disable-next-line react-hooks/exhaustive-deps
  useEffect(() => setRows(toRows(stored)), [id])
  const [query, setQuery] = useState('')
  const [bulkOpen, setBulkOpen] = useState(false)
  const [savedFlash, setSavedFlash] = useState(false)
  // Mặc định chỉ xem; bấm "Sửa" mới vào bảng chỉnh sửa.
  const [editing, setEditing] = useState(false)

  const dirty = useMemo(() => canon(clean(rows)) !== canon(clean(toRows(stored))), [rows, stored])
  const validCount = rows.filter((r) => r.word.hanzi.trim()).length

  // Cảnh báo khi đóng tab lúc còn thay đổi chưa lưu.
  useEffect(() => {
    if (!dirty) return
    const onBefore = (e: BeforeUnloadEvent) => e.preventDefault()
    window.addEventListener('beforeunload', onBefore)
    return () => window.removeEventListener('beforeunload', onBefore)
  }, [dirty])

  const persist = useCallback(
    (words: Word[]) => {
      nb.patchSet(id, { words })
    },
    [nb, id],
  )

  const save = () => {
    const words = clean(rows)
    persist(words)
    setRows(toRows(words))
    setSavedFlash(true)
    setTimeout(() => setSavedFlash(false), 1500)
    return words
  }

  const update = (key: string, patch: Partial<Word>) =>
    setRows((rs) => rs.map((r) => (r.key === key ? { ...r, word: { ...r.word, ...patch } } : r)))

  /** Khi rời ô chữ Hán: tự điền pinyin, Hán Việt, nghĩa... còn trống từ dữ liệu HSK. */
  const autofill = (key: string) =>
    setRows((rs) =>
      rs.map((r) => {
        if (r.key !== key || !r.word.hanzi.trim()) return r
        return { ...r, word: fillMissing(r.word, lookupWord(r.word.hanzi, dictionary, chars)) }
      }),
    )

  // Các hàng đang mở phần ví dụ + ảnh.
  const [expanded, setExpanded] = useState<Set<string>>(new Set())
  const toggleRow = (key: string) =>
    setExpanded((p) => {
      const n = new Set(p)
      if (n.has(key)) n.delete(key)
      else n.add(key)
      return n
    })

  const addRow = () => {
    const w = emptyWord()
    setRows((rs) => [...rs, { key: w.id, word: w }])
    setExpanded((p) => new Set(p).add(w.id))
    setQuery('')
    setTimeout(() => document.querySelector<HTMLInputElement>(`[data-row="${w.id}"] input`)?.focus(), 50)
  }

  const visible = useMemo(() => {
    const q = query.trim()
    if (!q) return rows.map((r, i) => ({ r, i }))
    const nq = normalize(q)
    return rows
      .map((r, i) => ({ r, i }))
      .filter(({ r }) => {
        const w = r.word
        return w.hanzi.includes(q) || [w.pinyin, w.han_viet ?? '', w.meaning_vi, w.meaning_en].some((s) => normalize(s).includes(nq))
      })
  }, [rows, query])

  if (!set) {
    return (
      <section className="mx-auto max-w-xl px-4 py-16">
        <div className="box p-8 text-center">
          <p className="text-lg font-semibold">{t('notebook.set_not_found')}</p>
          <Link to="/notebook" className="btn mt-6 px-5">
            {t('notebook.back')}
          </Link>
        </div>
      </section>
    )
  }

  const finishEdit = () => {
    if (dirty) save()
    setEditing(false)
  }
  const cancelEdit = () => {
    if (dirty && !window.confirm(t('editor.discard_confirm'))) return
    setRows(toRows(stored))
    setEditing(false)
  }

  /** Bấm đường dẫn khi còn thay đổi chưa lưu: hỏi trước khi rời trang. */
  const leaveGuard = () => !dirty || window.confirm(t('editor.leave_confirm'))

  return (
    <Page
      feature="notebook"
      size="wide"
      title={name}
      crumbs={[{ label: name ?? '' }]}
      onLeave={leaveGuard}
      description={
        <span className="flex flex-wrap items-center gap-2 text-sm">
          {folderName && (
            <span className="tag">
              <Folder size={12} />
              {folderName}
            </span>
          )}
          <span>{t('editor.valid_count', { count: validCount })}</span>
          {dirty && <span className="tag bg-apricot">{t('editor.unsaved')}</span>}
          {savedFlash && <span className="tag bg-sage">{t('editor.saved')}</span>}
        </span>
      }
      actions={
        editing ? (
          <>
            <button type="button" onClick={cancelEdit} className="btn px-4">
              <X size={16} />
              {t('common.cancel')}
            </button>
            <button type="button" onClick={finishEdit} className="btn btn-primary px-4">
              <Save size={16} />
              {dirty ? t('editor.save_done') : t('editor.done')}
            </button>
          </>
        ) : (
          <>
            <button type="button" onClick={() => setEditing(true)} className="btn btn-primary px-4">
              <SquarePen size={16} />
              {t('notebook.edit')}
            </button>
            <button
              type="button"
              disabled={!validCount}
              onClick={() =>
                downloadJson(
                  name ?? 'tu-vung',
                  clean(rows).map((w) => wordToJson(w)),
                )
              }
              className="btn px-4"
            >
              <FileDown size={16} />
              {t('editor.export')}
            </button>
            <button
              type="button"
              disabled={!validCount}
              onClick={() => navigate('/worksheet/trace', { state: { words: clean(rows), title: name } })}
              className="btn px-4"
            >
              <Printer size={16} />
              {t('editor.print')}
            </button>
            <button
              type="button"
              disabled={!validCount}
              onClick={() => navigate('/flashcard', { state: { practiceWords: clean(rows) } })}
              className="btn btn-accent px-4"
            >
              <Play size={16} />
              {t('editor.start')}
            </button>
          </>
        )
      }
    >
      {!editing ? (
        <>
          <div className="flex flex-wrap items-center gap-3">
            <div className="relative min-w-0 flex-1 sm:max-w-md">
              <Search size={16} className="absolute top-1/2 left-3 -translate-y-1/2 text-ink-muted" />
              <input
                type="search"
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                placeholder={t('editor.search_placeholder')}
                aria-label={t('editor.search_placeholder')}
                className="field py-2 pl-9 text-sm"
              />
            </div>
            {query.trim() && (
              <span className="text-sm text-ink-soft">{t('vocab.showing', { count: visible.length, total: rows.length })}</span>
            )}
          </div>
          {visible.length === 0 ? (
            <div className="box mt-6 p-8 text-center text-ink-soft">
              <p>{rows.length ? t('dictionary.no_results') : t('notebook.set_empty_view')}</p>
              {!rows.length && (
                <button type="button" onClick={() => setEditing(true)} className="btn btn-primary mt-4 px-4">
                  <SquarePen size={16} />
                  {t('notebook.edit')}
                </button>
              )}
            </div>
          ) : (
            <div className="mt-5 grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-3">
              {visible.map(({ r }) => (
                <WordCard key={r.key} word={r.word} />
              ))}
            </div>
          )}
        </>
      ) : (
        <div className="box">
          <div className="flex flex-wrap items-center gap-3 border-b-2 border-ink p-3">
            <div className="relative min-w-0 flex-1 sm:max-w-md">
              <Search size={16} className="absolute top-1/2 left-3 -translate-y-1/2 text-ink-muted" />
              <input
                type="search"
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                placeholder={t('editor.search_placeholder')}
                aria-label={t('editor.search_placeholder')}
                className="field py-2 pl-9 text-sm"
              />
            </div>
            <div className="ml-auto flex flex-wrap gap-2">
              <button type="button" onClick={addRow} className="btn px-4 py-2 text-sm">
                <Plus size={15} />
                {t('editor.add_row')}
              </button>
              <button type="button" onClick={() => setBulkOpen(true)} className="btn btn-primary px-4 py-2 text-sm">
                <FileUp size={15} />
                {t('editor.bulk')}
              </button>
            </div>
          </div>

          {/* Tiêu đề cột (màn hình rộng) */}
          <div className={clsx('hidden gap-3 border-b-2 border-ink bg-sand px-3 py-2.5 text-xs font-bold lg:grid', ROW_COLS)}>
            <span className="text-center">#</span>
            <span>{t('editor.col_word')}</span>
            <span>{t('editor.col_pinyin')}</span>
            <span>{t('editor.col_hanviet')}</span>
            <span>{t('editor.col_type')}</span>
            <span>{t('editor.col_meaning')}</span>
            <span className="text-right">{t('editor.col_more')}</span>
          </div>

          {visible.length === 0 ? (
            <div className="p-8 text-center text-ink-soft">
              <p>{rows.length ? t('dictionary.no_results') : t('notebook.set_empty_edit')}</p>
              {!rows.length && (
                <div className="mt-4 flex flex-wrap justify-center gap-2">
                  <button type="button" onClick={addRow} className="btn px-4 py-2 text-sm">
                    <Plus size={15} />
                    {t('editor.add_row')}
                  </button>
                  <button type="button" onClick={() => setBulkOpen(true)} className="btn btn-primary px-4 py-2 text-sm">
                    <FileUp size={15} />
                    {t('editor.bulk')}
                  </button>
                </div>
              )}
            </div>
          ) : (
            <ul className="divide-y-2 divide-line">
              {visible.map(({ r, i }) => {
                const open = expanded.has(r.key)
                const hasExtra = Boolean(r.word.example || r.word.example_pinyin || r.word.example_vi || r.word.image)
                return (
                  <li key={r.key} data-row={r.key} className={clsx('px-3 py-2', open ? 'bg-paper/60' : 'hover:bg-paper/40')}>
                    {/* Hàng chính: chữ · pinyin · Hán Việt · từ loại · nghĩa · thao tác */}
                    <div className={clsx('grid grid-cols-[2rem_1fr] gap-x-2 gap-y-2 lg:items-center lg:gap-x-3', ROW_COLS)}>
                      <span className="row-span-6 pt-2 text-center text-sm font-bold text-ink-soft lg:row-span-1 lg:pt-0">{i + 1}</span>
                      <div className="col-start-2 lg:col-start-auto">
                        <Label text={t('editor.col_word')} />
                        <input
                          value={r.word.hanzi}
                          onChange={(e) => update(r.key, { hanzi: e.target.value })}
                          onBlur={() => autofill(r.key)}
                          placeholder="汉字"
                          aria-label={`${t('editor.col_word')} ${i + 1}`}
                          className="field py-1.5 text-lg"
                        />
                      </div>
                      <div className="col-start-2 lg:col-start-auto">
                        <Label text={t('editor.col_pinyin')} />
                        <input
                          value={r.word.pinyin}
                          onChange={(e) => update(r.key, { pinyin: e.target.value })}
                          aria-label={`${t('editor.col_pinyin')} ${i + 1}`}
                          className="field py-1.5"
                        />
                      </div>
                      <div className="col-start-2 lg:col-start-auto">
                        <Label text={t('editor.col_hanviet')} />
                        <input
                          value={r.word.han_viet ?? ''}
                          onChange={(e) => update(r.key, { han_viet: e.target.value })}
                          aria-label={`${t('editor.col_hanviet')} ${i + 1}`}
                          className="field py-1.5 uppercase"
                        />
                      </div>
                      <div className="col-start-2 lg:col-start-auto">
                        <Label text={t('editor.col_type')} />
                        <WordTypeSelect value={r.word.word_types ?? []} onChange={(word_types) => update(r.key, { word_types })} />
                      </div>
                      <div className="col-start-2 lg:col-start-auto">
                        <Label text={t('editor.col_meaning')} />
                        <input
                          value={r.word.meaning_vi ?? ''}
                          onChange={(e) => update(r.key, { meaning_vi: e.target.value })}
                          placeholder={t('editor.ph_meaning')}
                          aria-label={`${t('editor.ph_meaning')} ${i + 1}`}
                          className="field py-1.5"
                        />
                      </div>
                      <div className="col-start-2 flex justify-end gap-2 lg:col-start-auto">
                        <button
                          type="button"
                          onClick={() => toggleRow(r.key)}
                          aria-expanded={open}
                          title={t('editor.example_and_image')}
                          className={clsx('btn relative h-9 px-2.5 text-xs', open && 'bg-sand')}
                        >
                          {open ? <ChevronUp size={15} /> : <ChevronDown size={15} />}
                          {t('editor.example_short')}
                          {hasExtra && !open && (
                            <span className="absolute -top-1 -right-1 h-2.5 w-2.5 rounded-full border-2 border-card bg-brick" />
                          )}
                        </button>
                        <button
                          type="button"
                          onClick={() => setRows((rs) => rs.filter((x) => x.key !== r.key))}
                          title={t('notebook.remove_word')}
                          aria-label={`${t('notebook.remove_word')} ${r.word.hanzi || i + 1}`}
                          className="btn h-9 w-9 p-0 hover:bg-coral"
                        >
                          <Trash2 size={15} />
                        </button>
                      </div>
                    </div>

                    {/* Phần mở rộng: câu ví dụ + ảnh */}
                    {open && (
                      <div className="mt-2 grid gap-2 lg:ml-[2.75rem] lg:grid-cols-[1.3fr_1fr_1.2fr_auto] lg:items-start">
                        {(
                          [
                            ['example', t('editor.ph_example'), 'text-base'],
                            ['example_pinyin', t('editor.ph_example_pinyin'), 'text-sm'],
                            ['example_vi', t('editor.ph_example_vi'), 'text-sm'],
                          ] as const
                        ).map(([field, ph, cls]) => (
                          <input
                            key={field}
                            value={r.word[field] ?? ''}
                            onChange={(e) => update(r.key, { [field]: e.target.value })}
                            placeholder={ph}
                            aria-label={`${ph} ${i + 1}`}
                            className={clsx('field py-1.5', cls)}
                          />
                        ))}
                        <ImageButton value={r.word.image} onChange={(image) => update(r.key, { image })} />
                      </div>
                    )}
                  </li>
                )
              })}
            </ul>
          )}

          {rows.length > 0 && (
            <div className="border-t-2 border-ink p-3">
              <button type="button" onClick={addRow} className="btn px-4">
                <Plus size={16} />
                {t('editor.add_row')}
              </button>
            </div>
          )}
        </div>
      )}

      {bulkOpen && (
        <BulkImportDialog
          setName={name ?? ''}
          dictionary={dictionary}
          existing={new Set(rows.map((r) => r.word.hanzi))}
          onClose={() => setBulkOpen(false)}
          onSave={(words) => {
            const next = [
              ...rows.filter((r) => r.word.hanzi.trim()),
              ...words.map((w) => ({ key: w.id + Math.random().toString(36).slice(2, 6), word: normalizeWord(w) })),
            ]
            const cleaned = clean(next)
            persist(cleaned)
            setRows(toRows(cleaned))
            setBulkOpen(false)
          }}
        />
      )}
    </Page>
  )
}

function Label({ text }: { text: string }) {
  return <span className="mb-1 block text-xs font-semibold text-ink-soft lg:hidden">{text}</span>
}
