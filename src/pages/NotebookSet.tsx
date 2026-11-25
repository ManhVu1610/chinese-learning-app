import clsx from 'clsx'
import { ArrowLeft, FileDown, FileUp, Folder, Play, Plus, Printer, Save, Search, SquarePen, Trash2, X } from 'lucide-react'
import { useCallback, useEffect, useMemo, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { Link, useNavigate, useParams } from 'react-router-dom'
import BulkImportDialog from '../components/notebook/BulkImportDialog'
import ImageButton from '../components/notebook/ImageButton'
import WordTypeSelect from '../components/notebook/WordTypeSelect'
import WordCard from '../components/WordCard'
import { normalize } from '../data/dictionary'
import { fillMissing, loadChars, lookupWord, newWordId, type CharInfo } from '../data/lookup'
import { useDictionary } from '../hooks/useDictionary'
import { useNotebook } from '../hooks/useNotebook'
import { useSavedWords } from '../hooks/useSavedWords'
import { downloadJson, wordToJson } from '../lib/exportJson'
import type { Word } from '../types'

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
  const savedApi = useSavedWords()
  const { words: dictionary } = useDictionary()
  const [chars, setChars] = useState<CharInfo>()
  useEffect(() => {
    loadChars().then(setChars)
  }, [])

  const isSaved = id === 'saved'
  const set = nb.sets.find((s) => s.id === id)
  const name = isSaved ? t('notebook.saved_set') : set?.name
  const stored = useMemo(() => (isSaved ? savedApi.saved : (set?.words ?? [])), [isSaved, savedApi.saved, set?.words])
  const folderName = set?.folderId ? nb.folders.find((f) => f.id === set.folderId)?.name : undefined

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
      if (isSaved) savedApi.replaceAll(words)
      else nb.patchSet(id, { words })
    },
    [isSaved, savedApi, nb, id],
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

  const addRow = () => {
    const w = emptyWord()
    setRows((rs) => [...rs, { key: w.id, word: w }])
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

  if (!isSaved && !set) {
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

  const goBack = () => {
    if (dirty && !window.confirm(t('editor.leave_confirm'))) return
    navigate('/notebook')
  }

  return (
    <section className="mx-auto max-w-7xl px-4 py-8">
      <button type="button" onClick={goBack} className="inline-flex items-center gap-1.5 text-sm font-semibold text-ink-soft hover:text-ink">
        <ArrowLeft size={16} />
        {t('tools.notebook')}
      </button>

      <div className="mt-2 flex flex-wrap items-end justify-between gap-4">
        <div className="min-w-0">
          <p className="flex flex-wrap items-center gap-2 text-sm text-ink-soft">
            {t('editor.valid_count', { count: validCount })}
            {folderName && (
              <span className="tag">
                <Folder size={12} />
                {folderName}
              </span>
            )}
            {dirty && <span className="tag bg-apricot">{t('editor.unsaved')}</span>}
            {savedFlash && <span className="tag bg-sage">{t('editor.saved')}</span>}
          </p>
          <h1 className="mt-1 text-3xl font-bold break-words">{name}</h1>
        </div>
        <div className="flex flex-wrap gap-3">
          {editing ? (
            <>
              <button type="button" onClick={() => setBulkOpen(true)} className="btn px-4">
                <FileUp size={16} />
                {t('editor.bulk')}
              </button>
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
                onClick={() => downloadJson(name ?? 'tu-vung', clean(rows).map((w) => wordToJson(w)))}
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
          )}
        </div>
      </div>

      {!editing ? (
        <>
          <div className="relative mt-6 max-w-md">
            <Search size={16} className="absolute top-1/2 left-3 -translate-y-1/2 text-ink-muted" />
            <input
              type="search"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder={t('editor.search_placeholder')}
              className="field py-2 pl-9 text-sm"
            />
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
            <div className="mt-6 grid grid-cols-2 gap-5 md:grid-cols-3 lg:grid-cols-4">
              {visible.map(({ r }) => (
                <WordCard key={r.key} word={r.word} />
              ))}
            </div>
          )}
        </>
      ) : (
      <div className="box mt-6">
        <div className="border-b-2 border-ink p-3">
          <div className="relative max-w-md">
            <Search size={16} className="absolute top-1/2 left-3 -translate-y-1/2 text-ink-muted" />
            <input
              type="search"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder={t('editor.search_placeholder')}
              className="field py-2 pl-9 text-sm"
            />
          </div>
        </div>

        {/* Tiêu đề cột (màn hình rộng) */}
        <div className="hidden grid-cols-[2.5rem_1.2fr_1fr_1fr_1.1fr_2fr_2.75rem] gap-3 border-b-2 border-ink bg-sand px-3 py-2.5 text-xs font-bold lg:grid">
          <span className="text-center">#</span>
          <span>{t('editor.col_word')}</span>
          <span>{t('editor.col_pinyin')}</span>
          <span>{t('editor.col_hanviet')}</span>
          <span>{t('editor.col_type')}</span>
          <span>{t('editor.col_meaning')}</span>
          <span />
        </div>

        {visible.length === 0 ? (
          <p className="p-8 text-center text-ink-soft">{rows.length ? t('dictionary.no_results') : t('notebook.set_empty')}</p>
        ) : (
          <ul className="divide-y-2 divide-ink">
            {visible.map(({ r, i }) => (
              <li
                key={r.key}
                data-row={r.key}
                className="grid grid-cols-[2rem_1fr_2.75rem] gap-x-3 gap-y-2 px-3 py-3 lg:grid-cols-[2.5rem_1.2fr_1fr_1fr_1.1fr_2fr_2.75rem]"
              >
                <span className="row-span-6 pt-2.5 text-center text-sm font-bold text-ink-soft lg:row-span-1">{i + 1}</span>

                <div className="lg:col-start-2">
                  <Label text={t('editor.col_word')} />
                  <input
                    value={r.word.hanzi}
                    onChange={(e) => update(r.key, { hanzi: e.target.value })}
                    onBlur={() => autofill(r.key)}
                    placeholder="汉字"
                    aria-label={`${t('editor.col_word')} ${i + 1}`}
                    className="field py-2 text-lg"
                  />
                  <ImageButton value={r.word.image} onChange={(image) => update(r.key, { image })} />
                </div>

                <button
                  type="button"
                  onClick={() => setRows((rs) => rs.filter((x) => x.key !== r.key))}
                  title={t('notebook.remove_word')}
                  aria-label={`${t('notebook.remove_word')} ${r.word.hanzi || i + 1}`}
                  className="btn col-start-3 row-start-1 h-10 w-10 self-start p-0 hover:bg-coral lg:col-start-7"
                >
                  <Trash2 size={16} />
                </button>

                <div className="col-start-2 lg:col-start-3 lg:row-start-1">
                  <Label text={t('editor.col_pinyin')} />
                  <input
                    value={r.word.pinyin}
                    onChange={(e) => update(r.key, { pinyin: e.target.value })}
                    aria-label={`${t('editor.col_pinyin')} ${i + 1}`}
                    className="field py-2"
                  />
                </div>
                <div className="col-start-2 lg:col-start-4 lg:row-start-1">
                  <Label text={t('editor.col_hanviet')} />
                  <input
                    value={r.word.han_viet ?? ''}
                    onChange={(e) => update(r.key, { han_viet: e.target.value })}
                    aria-label={`${t('editor.col_hanviet')} ${i + 1}`}
                    className="field py-2 uppercase"
                  />
                </div>
                <div className="col-start-2 lg:col-start-5 lg:row-start-1">
                  <Label text={t('editor.col_type')} />
                  <WordTypeSelect value={r.word.word_types ?? []} onChange={(word_types) => update(r.key, { word_types })} />
                </div>
                <div className="col-start-2 space-y-2 lg:col-start-6 lg:row-start-1">
                  <Label text={t('editor.col_meaning')} />
                  {(
                    [
                      ['meaning_vi', t('editor.ph_meaning'), ''],
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
                      className={clsx('field py-2', cls)}
                    />
                  ))}
                </div>
              </li>
            ))}
          </ul>
        )}

        <div className="border-t-2 border-ink p-3">
          <button type="button" onClick={addRow} className="btn px-4">
            <Plus size={16} />
            {t('editor.add_row')}
          </button>
        </div>
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
    </section>
  )
}

function Label({ text }: { text: string }) {
  return <span className="mb-1 block text-xs font-semibold text-ink-soft lg:hidden">{text}</span>
}
