import clsx from 'clsx'
import {
  AlarmClock,
  ArrowLeft,
  BookOpen,
  HeartCrack,
  Lightbulb,
  Library,
  Play,
  Plus,
  RotateCcw,
  Search,
  SlidersHorizontal,
  Trash2,
  TriangleAlert,
  Volume2,
} from 'lucide-react'
import { useEffect, useMemo, useRef, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { useLocation, useNavigate, useSearchParams } from 'react-router-dom'
import Page from '../components/layout/Page'
import Pagination from '../components/Pagination'
import { ConfirmDialog } from '../components/notebook/Dialogs'
import SfxToggle from '../components/practice/SfxToggle'
import { levelColor } from '../components/WordCard'
import { normalize } from '../data/dictionary'
import { useDictionary } from '../hooks/useDictionary'
import {
  cardStage,
  formatInterval,
  GRAMMAR_PREFIX,
  isGrammarId,
  previewIntervals,
  useFlashcard,
  type CardStage,
} from '../hooks/useFlashcard'
import { useNotebook } from '../hooks/useNotebook'
import { useReviewLog, type ReviewKind } from '../hooks/useReviewLog'
import { useSavedWords } from '../hooks/useSavedWords'
import { useSpeech } from '../hooks/useSpeech'
import { comparePinyin, convertPinyinInput } from '../lib/pinyinInput'
import { playResult, sfxEnabled, SFX_GAP_MS } from '../lib/sfx'
import type { CardState, GrammarPoint, HSKLevel, Rating, Word } from '../types'

const levels: HSKLevel[] = [1, 2, 3, 4, 5, 6]
const ratingKeys: Rating[] = ['again', 'hard', 'good', 'easy']
const ratingStyle: Record<Rating, string> = { again: 'bg-coral', hard: 'bg-sand', good: 'bg-sage', easy: 'bg-sky' }
const stageStyle: Record<CardStage, string> = { new: 'bg-sand', learning: 'bg-apricot', young: 'bg-sky', mature: 'bg-sage' }
const SETTINGS_KEY = 'flashcard_settings'
const PAGE_SIZE = 10

interface Settings {
  /** Gõ pinyin trước khi xem đáp án (thẻ từ vựng) */
  typePinyin: boolean
  /** Tự đọc khi lật thẻ */
  autoSpeak: boolean
}
const readSettings = (): Settings => {
  try {
    return { typePinyin: true, autoSpeak: true, ...JSON.parse(localStorage.getItem(SETTINGS_KEY) ?? '{}') }
  } catch {
    return { typePinyin: true, autoSpeak: true }
  }
}

const blankCard = (wordId: string): CardState => ({ wordId, due: Date.now(), interval: 0, easeFactor: 2.5, reps: 0 })

/** Một thẻ để ôn: từ vựng hoặc bài ngữ pháp. */
export type Item = { id: string; word: Word; lesson?: undefined } | { id: string; lesson: GrammarPoint; word?: undefined }

/** Văn bản tìm kiếm / hiển thị ngắn của một thẻ. */
const itemSearchText = (it: Item) =>
  it.word ? [it.word.pinyin, it.word.meaning_vi, it.word.han_viet ?? ''] : [it.lesson.title, it.lesson.structure, it.lesson.explanation_vi]

/** Flashcard: trang Thống kê học tập (tab Từ vựng / Ngữ pháp) và màn Ôn tập ngắt quãng. */
export default function Flashcard() {
  const fc = useFlashcard()
  const { words: dictionary } = useDictionary()
  const { sets } = useNotebook()
  const { saved } = useSavedWords()
  const location = useLocation()
  const navigate = useNavigate()
  const [params, setParams] = useSearchParams()
  const kind: ReviewKind = params.get('tab') === 'grammar' ? 'grammar' : 'vocab'
  const setKind = (k: ReviewKind) => setParams(k === 'grammar' ? { tab: 'grammar' } : {}, { replace: true })
  const [session, setSession] = useState<Item[] | null>(null)

  // Bài ngữ pháp: nạp sau để trang không phải tải dữ liệu ngữ pháp ngay.
  const [lessons, setLessons] = useState<GrammarPoint[]>([])
  useEffect(() => {
    import('../data/grammar').then((m) => setLessons(m.grammarPoints))
  }, [])

  // Từ của thẻ có thể đến từ từ điển HSK, sổ tay hoặc danh sách đã lưu.
  const itemById = useMemo(() => {
    const m = new Map<string, Item>()
    for (const w of dictionary) m.set(w.id, { id: w.id, word: w })
    for (const s of sets) for (const w of s.words) if (!m.has(w.id)) m.set(w.id, { id: w.id, word: w })
    for (const w of saved) if (!m.has(w.id)) m.set(w.id, { id: w.id, word: w })
    for (const g of lessons) m.set(GRAMMAR_PREFIX + g.id, { id: GRAMMAR_PREFIX + g.id, lesson: g })
    return m
  }, [dictionary, sets, saved, lessons])

  // "Ôn tập ngay" từ Sổ tay: mở thẳng màn ôn với danh sách từ được gửi sang.
  useEffect(() => {
    const practice = (location.state as { practiceWords?: Word[] } | null)?.practiceWords
    if (!practice?.length) return
    setSession(practice.map((w) => ({ id: w.id, word: w })))
    navigate(location.pathname, { replace: true, state: null })
  }, [location.state, location.pathname, navigate])

  const startDue = () => {
    const now = Date.now()
    const due = fc.cards
      .filter((c) => c.due <= now && isGrammarId(c.wordId) === (kind === 'grammar'))
      .sort((a, b) => a.due - b.due)
      .map((c) => itemById.get(c.wordId))
      .filter((it): it is Item => !!it)
    if (due.length) setSession(due)
  }

  if (session) return <Review initial={session} fc={fc} onExit={() => setSession(null)} />
  return <Stats fc={fc} kind={kind} setKind={setKind} itemById={itemById} dictionary={dictionary} lessons={lessons} onStart={startDue} />
}

type FC = ReturnType<typeof useFlashcard>

// =====================================================================
// Thống kê học tập
// =====================================================================

function Stats({
  fc,
  kind,
  setKind,
  itemById,
  dictionary,
  lessons,
  onStart,
}: {
  fc: FC
  kind: ReviewKind
  setKind: (k: ReviewKind) => void
  itemById: Map<string, Item>
  dictionary: Word[]
  lessons: GrammarPoint[]
  onStart: () => void
}) {
  const { t, i18n } = useTranslation()
  const { summary } = useReviewLog(kind)
  const [now, setNow] = useState(Date.now())
  const [query, setQuery] = useState('')
  // Danh sách thẻ chia trang, mỗi trang 10 thẻ.
  const [page, setPage] = useState(0)
  const [picking, setPicking] = useState(false)
  const [notice, setNotice] = useState<string | null>(null)
  const [confirmReset, setConfirmReset] = useState(false)
  const [confirmDelete, setConfirmDelete] = useState<Item | null>(null)
  const grammar = kind === 'grammar'

  useEffect(() => {
    const id = setInterval(() => setNow(Date.now()), 1000)
    return () => clearInterval(id)
  }, [])
  useEffect(() => {
    setPage(0)
    setQuery('')
    setPicking(false)
    setNotice(null)
  }, [kind])

  const cards = useMemo(() => fc.cards.filter((c) => isGrammarId(c.wordId) === grammar), [fc.cards, grammar])
  const allCounts = useMemo(() => {
    let g = 0
    for (const c of fc.cards) if (isGrammarId(c.wordId)) g++
    return { grammar: g, vocab: fc.cards.length - g }
  }, [fc.cards])

  const counts = useMemo(() => {
    const c = { due: 0, new: 0, learning: 0, young: 0, mature: 0, total: cards.length }
    for (const card of cards) {
      if (card.due <= now) c.due++
      c[cardStage(card)]++
    }
    return c
  }, [cards, now])

  const nextDue = useMemo(() => {
    const future = cards.filter((c) => c.due > now).map((c) => c.due)
    return future.length ? Math.min(...future) : null
  }, [cards, now])

  const countdown = (() => {
    if (counts.due) return t('flashcard.now')
    if (!nextDue) return '— — : — —'
    const s = Math.max(0, Math.round((nextDue - now) / 1000))
    if (s >= 86400) return t('flashcard.in_days', { count: Math.round(s / 86400) })
    const hh = String(Math.floor(s / 3600)).padStart(2, '0')
    const mm = String(Math.floor((s % 3600) / 60)).padStart(2, '0')
    const ss = String(s % 60).padStart(2, '0')
    return `${hh}:${mm}:${ss}`
  })()

  const list = useMemo(() => {
    const q = normalize(query)
    const raw = query.trim()
    return cards
      .map((c) => ({ card: c, item: itemById.get(c.wordId) }))
      .filter((x): x is { card: CardState; item: Item } => !!x.item)
      .filter(({ item }) => {
        if (!q) return true
        const han = item.word ? item.word.hanzi : `${item.lesson.title} ${item.lesson.structure}`
        return han.includes(raw) || itemSearchText(item).some((s) => normalize(s).includes(q))
      })
      .sort((a, b) => a.card.due - b.card.due)
  }, [cards, itemById, query])

  const pageCount = Math.max(1, Math.ceil(list.length / PAGE_SIZE))
  const safePage = Math.min(page, pageCount - 1)

  const addLevel = (level: HSKLevel) => {
    const added = grammar
      ? fc.addIds(lessons.filter((g) => g.level === level).map((g) => GRAMMAR_PREFIX + g.id))
      : fc.addWords(dictionary.filter((w) => w.hsk_level === level))
    setNotice(t(grammar ? 'flashcard.added_grammar' : 'flashcard.added', { count: added, level }))
    setPicking(false)
  }
  const remainingAt = (lv: HSKLevel) =>
    grammar
      ? lessons.filter((g) => g.level === lv && !fc.hasCard(GRAMMAR_PREFIX + g.id)).length
      : dictionary.filter((w) => w.hsk_level === lv && !fc.hasCard(w.id)).length

  const date = (ms: number) => new Date(ms).toLocaleDateString(i18n.language === 'en' ? 'en-GB' : 'vi-VN')
  const maxDay = Math.max(1, ...summary.last7.map((d) => d.count))
  const dayName = (ms: number) => new Date(ms).toLocaleDateString(i18n.language === 'en' ? 'en-GB' : 'vi-VN', { weekday: 'short' })
  const itemLabel = (it: Item) => (it.word ? it.word.hanzi : it.lesson.title)

  const tiles: { key: keyof typeof counts; tone?: string }[] = [
    { key: 'due', tone: 'text-brick' },
    { key: 'new' },
    { key: 'learning' },
    { key: 'young' },
    { key: 'mature', tone: 'text-[#3f7a52]' },
    { key: 'total' },
  ]

  return (
    <Page feature="flashcard" size="wide" title={t('flashcard.stats_title')} description={t('flashcard.stats_desc')}>
      {fc.syncError && (
        <p className="mb-4 rounded-xl border-2 border-ink bg-coral px-3 py-2 text-sm">{t('auth.sync_error', { message: fc.syncError })}</p>
      )}

      {/* Từ vựng / Ngữ pháp */}
      <div className="grid grid-cols-2 gap-1 rounded-full border-2 border-ink bg-card p-1 shadow-block-sm" role="tablist">
        {(
          [
            ['vocab', BookOpen, t('nav.vocabulary'), allCounts.vocab],
            ['grammar', Library, t('tools.grammar'), allCounts.grammar],
          ] as const
        ).map(([k, Icon, label, n]) => (
          <button
            key={k}
            type="button"
            role="tab"
            aria-selected={kind === k}
            onClick={() => setKind(k)}
            className={clsx(
              'flex items-center justify-center gap-2 rounded-full py-2 text-sm font-bold',
              kind === k ? 'bg-sand' : 'text-ink-soft hover:bg-brick-soft',
            )}
          >
            <Icon size={16} />
            {label}
            <span className="tag bg-card px-1.5 text-[11px]">{n}</span>
          </button>
        ))}
      </div>

      {fc.loading ? (
        <p className="box mt-6 p-8 text-center text-ink-soft">{t('common.loading')}</p>
      ) : (
        <>
          {/* 6 ô số liệu */}
          <div className="mt-5 grid grid-cols-3 gap-3 md:grid-cols-6">
            {tiles.map(({ key, tone }) => (
              <div key={key} className="box flex flex-col items-center justify-center px-2 py-4 text-center">
                <span className={clsx('text-3xl font-extrabold tabular-nums', tone)}>{counts[key]}</span>
                <span className="mt-1 text-xs leading-tight text-ink-soft">{t(`flashcard.tile_${key}`)}</span>
              </div>
            ))}
          </div>

          {/* Cần ôn hôm nay + lượt ôn tiếp theo */}
          <div className="mt-5 grid gap-4 md:grid-cols-2">
            <div className="box relative bg-sand/60 p-5">
              <button
                type="button"
                onClick={() => setConfirmReset(true)}
                disabled={!counts.total}
                className="btn absolute top-4 right-4 px-3 py-1 text-xs"
              >
                <RotateCcw size={13} />
                {t('flashcard.restart_all')}
              </button>
              <p className="font-bold">{t('flashcard.due_today')}</p>
              <p className="mt-1 text-5xl font-extrabold tabular-nums">{counts.due}</p>
              <button type="button" onClick={onStart} disabled={!counts.due} className="btn btn-accent mt-4 px-5 py-2.5">
                <Play size={16} />
                {t('flashcard.review_now')}
              </button>
            </div>
            <div className="box flex flex-col justify-center p-5">
              <p className="flex items-center gap-2 font-bold">
                <AlarmClock size={18} />
                {t('flashcard.next_review')}
              </p>
              <p className="mt-2 text-4xl font-extrabold tracking-wider tabular-nums">{countdown}</p>
            </div>
          </div>

          {/* Chi tiết ôn tập */}
          <section className="box mt-5 p-5">
            <h2 className="text-lg font-extrabold">{t('flashcard.detail')}</h2>
            <div className="mt-3 grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-5">
              {[
                [t('flashcard.streak'), t('flashcard.days', { count: summary.streak })],
                [t('flashcard.today'), t('flashcard.reviews', { count: summary.today })],
                [t('flashcard.this_week'), t('flashcard.reviews', { count: summary.week })],
                [t('flashcard.per_day'), t('flashcard.reviews', { count: Math.round(summary.perDayAvg) })],
                [t('flashcard.per_card'), t('flashcard.seconds', { count: Math.round(summary.avgSeconds) })],
              ].map(([label, value]) => (
                <div key={label} className="rounded-2xl border-2 border-line bg-paper/60 px-3 py-2.5">
                  <p className="text-xs text-ink-soft">{label}</p>
                  <p className="text-lg font-extrabold">{value}</p>
                </div>
              ))}
            </div>

            <div className="mt-5 grid gap-6 md:grid-cols-2">
              <div>
                <p className="text-sm font-bold">{t('flashcard.last7')}</p>
                <div className="mt-2 flex h-32 items-end gap-2">
                  {summary.last7.map((d) => (
                    <div key={d.day} className="flex flex-1 flex-col items-center gap-1">
                      <span className="text-[10px] font-bold text-ink-soft tabular-nums">{d.count || ''}</span>
                      <div
                        className="w-full rounded-t-lg bg-sage"
                        style={{ height: `${(d.count / maxDay) * 80}px`, minHeight: d.count ? 4 : 0 }}
                      />
                      <span className="text-[10px] text-ink-muted">{dayName(d.day)}</span>
                    </div>
                  ))}
                </div>
              </div>
              <div>
                <p className="text-sm font-bold">{t('flashcard.distribution', { count: summary.total })}</p>
                <div className="mt-2 space-y-2">
                  {ratingKeys.map((r) => {
                    const n = summary.ratings[r]
                    const pct = summary.total ? Math.round((n / summary.total) * 100) : 0
                    return (
                      <div key={r} className="grid grid-cols-[5rem_1fr_4rem] items-center gap-2 text-sm">
                        <span>{t(`flashcard.rate_${r}`)}</span>
                        <div className="h-3 overflow-hidden rounded-full border-2 border-line bg-card">
                          <div className={clsx('h-full rounded-full', ratingStyle[r])} style={{ width: `${pct}%` }} />
                        </div>
                        <span className="text-right text-xs tabular-nums">
                          {n} ({pct}%)
                        </span>
                      </div>
                    )
                  })}
                </div>
              </div>
            </div>
            <p className="mt-4 border-t-2 border-dashed border-line pt-3 text-sm text-ink-soft">
              {t('flashcard.totals', { total: summary.total, month: summary.month })}
            </p>
          </section>

          {/* Thẻ đã thêm */}
          <section className="box mt-5 p-5">
            <div className="flex flex-wrap items-center justify-between gap-3">
              <h2 className="text-lg font-extrabold">
                {t('flashcard.added_cards')} <span className="text-ink-soft">({counts.total})</span>
              </h2>
              <button
                type="button"
                onClick={() => setPicking((p) => !p)}
                aria-expanded={picking}
                className={clsx('btn px-4 py-1.5 text-sm', picking && 'bg-sky')}
              >
                <Plus size={15} />
                {grammar ? t('flashcard.add_lessons') : t('flashcard.add_words')}
              </button>
            </div>

            {picking && (
              <div className="mt-3 rounded-2xl border-2 border-line bg-paper/60 p-3">
                <p className="mb-2 text-sm font-semibold">{grammar ? t('flashcard.choose_level_grammar') : t('flashcard.choose_level')}</p>
                <div className="grid grid-cols-3 gap-2 sm:grid-cols-6">
                  {levels.map((lv) => {
                    const remaining = remainingAt(lv)
                    return (
                      <button
                        key={lv}
                        type="button"
                        onClick={() => addLevel(lv)}
                        disabled={!remaining}
                        className="btn flex-col gap-0 px-2 py-2 text-sm"
                      >
                        <span className="font-bold">HSK {lv}</span>
                        <span className="text-xs font-normal">
                          {grammar ? t('flashcard.new_lessons', { count: remaining }) : t('flashcard.new_count', { count: remaining })}
                        </span>
                      </button>
                    )
                  })}
                </div>
              </div>
            )}
            {notice && <p className="mt-3 rounded-xl border-2 border-ink bg-sage px-3 py-2 text-sm">{notice}</p>}

            <div className="relative mt-3">
              <Search size={16} className="absolute top-1/2 left-3 -translate-y-1/2 text-ink-muted" />
              <input
                type="search"
                value={query}
                onChange={(e) => {
                  setQuery(e.target.value)
                  setPage(0)
                }}
                placeholder={grammar ? t('flashcard.search_lessons') : t('flashcard.search_cards')}
                aria-label={grammar ? t('flashcard.search_lessons') : t('flashcard.search_cards')}
                className="field py-2 pl-9 text-sm"
              />
            </div>

            {!counts.total ? (
              <p className="py-8 text-center text-sm text-ink-soft">{grammar ? t('flashcard.empty_grammar') : t('flashcard.empty_hint')}</p>
            ) : (
              <ul className="mt-3 space-y-2">
                {list.slice(safePage * PAGE_SIZE, safePage * PAGE_SIZE + PAGE_SIZE).map(({ card, item }) => {
                  const stage = cardStage(card)
                  return (
                    <li key={card.wordId} className="flex items-center gap-3 rounded-2xl border-2 border-line px-3 py-2">
                      <div className="min-w-0 flex-1">
                        {item.word ? (
                          <p className="truncate">
                            <span className="text-lg font-bold">{item.word.hanzi}</span>{' '}
                            <span className="text-sm text-ink-soft italic">{item.word.pinyin}</span>{' '}
                            <span className="text-sm">— {item.word.meaning_vi}</span>
                          </p>
                        ) : (
                          <p className="truncate">
                            <span className={clsx('tag mr-1.5 px-1.5 text-[10px]', levelColor[item.lesson.level])}>
                              HSK {item.lesson.level}
                            </span>
                            <span className="font-bold">{item.lesson.title}</span>{' '}
                            <span className="text-sm text-ink-soft">— {item.lesson.structure}</span>
                          </p>
                        )}
                        <p className="mt-0.5 flex flex-wrap items-center gap-2 text-xs text-ink-soft">
                          <span className={clsx('tag px-2 text-[10px]', stageStyle[stage])}>{t(`flashcard.stage_${stage}`)}</span>
                          {t('flashcard.due_on', { date: date(card.due) })}
                          <span>{t('flashcard.reviews', { count: card.reps })}</span>
                        </p>
                      </div>
                      <button
                        type="button"
                        onClick={() => setConfirmDelete(item)}
                        title={t('flashcard.remove')}
                        aria-label={`${t('flashcard.remove')} ${itemLabel(item)}`}
                        className="btn shrink-0 p-2 hover:bg-coral"
                      >
                        <Trash2 size={15} />
                      </button>
                    </li>
                  )
                })}
              </ul>
            )}
            <Pagination page={safePage} pageCount={pageCount} onChange={setPage} />
          </section>
        </>
      )}

      {confirmReset && (
        <ConfirmDialog
          title={t('flashcard.restart_all')}
          message={t('flashcard.restart_confirm', { count: counts.total })}
          confirmLabel={t('flashcard.restart_all')}
          onClose={() => setConfirmReset(false)}
          onConfirm={() => {
            fc.resetAll(grammar ? 'grammar' : 'vocab')
            setConfirmReset(false)
          }}
        />
      )}
      {confirmDelete && (
        <ConfirmDialog
          title={t('flashcard.remove')}
          message={t('flashcard.remove_confirm', { word: itemLabel(confirmDelete) })}
          confirmLabel={t('notebook.delete')}
          onClose={() => setConfirmDelete(null)}
          onConfirm={() => {
            fc.removeCard(confirmDelete.id)
            setConfirmDelete(null)
          }}
        />
      )}
    </Page>
  )
}

// =====================================================================
// Ôn tập ngắt quãng
// =====================================================================

function Review({ initial, fc, onExit }: { initial: Item[]; fc: FC; onExit: () => void }) {
  const { t, i18n } = useTranslation()
  const { speak, supported } = useSpeech()
  const { record } = useReviewLog()
  const [settings, setSettings] = useState<Settings>(readSettings)
  const [showSettings, setShowSettings] = useState(false)
  const [queue, setQueue] = useState<Item[]>(initial)
  const [index, setIndex] = useState(0)
  const [revealed, setRevealed] = useState(false)
  const [typing, setTyping] = useState(false)
  const [input, setInput] = useState('')
  const [typed, setTyped] = useState<'right' | 'wrong' | null>(null)
  const [reviewed, setReviewed] = useState(0)
  const [wrong, setWrong] = useState(0)
  const [done, setDone] = useState(false)
  const shownAt = useRef(Date.now())
  const inputRef = useRef<HTMLInputElement>(null)

  useEffect(() => localStorage.setItem(SETTINGS_KEY, JSON.stringify(settings)), [settings])

  const item = queue[index]
  const word = item?.word
  const lesson = item?.lesson
  const card = item ? (fc.cards.find((c) => c.wordId === item.id) ?? blankCard(item.id)) : null
  const preview = card ? previewIntervals(card) : null
  // Câu cần đọc: chữ của thẻ từ, hoặc câu ví dụ đầu tiên của bài ngữ pháp.
  const speakText = word ? word.hanzi : (lesson?.examples.find((e) => !e.hanzi.startsWith('请用'))?.hanzi ?? '')
  const isTypingCard = !!word && settings.typePinyin

  // Thẻ mới: về mặt trước.
  useEffect(() => {
    setRevealed(false)
    setTyping(false)
    setInput('')
    setTyped(null)
    shownAt.current = Date.now()
  }, [index, queue])

  useEffect(() => {
    if (typing) inputRef.current?.focus()
  }, [typing])

  const reveal = (delay = 0) => {
    setRevealed(true)
    setTyping(false)
    if (settings.autoSpeak && supported && speakText) {
      const text = speakText
      // Có âm báo đúng/sai thì đợi phát xong rồi mới đọc.
      if (delay) setTimeout(() => speak(text), delay)
      else speak(text)
    }
  }
  const flip = () => {
    if (revealed) return
    if (isTypingCard && !typing) setTyping(true)
    else reveal()
  }
  const check = () => {
    if (!word || !input.trim()) return
    const ok = comparePinyin(input) === comparePinyin(word.pinyin)
    setTyped(ok ? 'right' : 'wrong')
    if (!ok) setWrong((n) => n + 1)
    playResult(ok)
    reveal(sfxEnabled() ? SFX_GAP_MS : 0)
  }

  const rate = (rating: Rating) => {
    if (!item || !card) return
    if (!fc.hasCard(item.id)) fc.addIds([item.id])
    fc.grade(item.id, rating)
    record(rating, Date.now() - shownAt.current, lesson ? 'grammar' : 'vocab')
    setReviewed((n) => n + 1)
    if (rating === 'again' && typed !== 'wrong') setWrong((n) => n + 1)
    // Thẻ còn trong bước học (dưới 1 ngày): đưa lại cuối hàng để ôn tiếp trong buổi này.
    const again = previewIntervals(card)[rating] < 1
    const nextQueue = again ? [...queue, item] : queue
    if (again) setQueue(nextQueue)
    if (index + 1 >= nextQueue.length) setDone(true)
    else setIndex(index + 1)
  }

  // Phím tắt: Space lật, 1–4 đánh giá, R phát âm (khi không gõ trong ô nhập).
  useEffect(() => {
    if (done) return
    const onKey = (e: KeyboardEvent) => {
      if (e.target instanceof HTMLInputElement || e.target instanceof HTMLTextAreaElement) return
      if (e.key === ' ') {
        e.preventDefault()
        flip()
      } else if (['1', '2', '3', '4'].includes(e.key)) rate(ratingKeys[Number(e.key) - 1])
      else if (e.key.toLowerCase() === 'r' && supported && speakText) speak(speakText)
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  })

  const header = (
    <div className="flex items-start justify-between gap-3">
      <div>
        <button
          type="button"
          onClick={onExit}
          className="inline-flex items-center gap-1 text-sm font-semibold text-ink-soft hover:text-ink"
        >
          <ArrowLeft size={15} />
          {t('flashcard.stats_title')}
        </button>
        <h1 className="mt-1 text-3xl font-extrabold">{t('flashcard.review_title')}</h1>
        <p className="text-ink-soft">{t('flashcard.review_desc')}</p>
      </div>
      <div className="relative">
        <button
          type="button"
          onClick={() => setShowSettings((v) => !v)}
          aria-expanded={showSettings}
          title={t('flashcard.settings')}
          aria-label={t('flashcard.settings')}
          className="btn p-2"
        >
          <SlidersHorizontal size={16} />
        </button>
        {showSettings && (
          <div className="box absolute right-0 z-20 mt-2 w-64 space-y-2 p-3 text-sm">
            {(['typePinyin', 'autoSpeak'] as const).map((k) => (
              <label key={k} className="flex cursor-pointer items-center justify-between gap-3">
                {t(`flashcard.setting_${k}`)}
                <input
                  type="checkbox"
                  checked={settings[k]}
                  onChange={(e) => setSettings((s) => ({ ...s, [k]: e.target.checked }))}
                  className="h-4 w-4 accent-[var(--color-brick)]"
                />
              </label>
            ))}
            <SfxToggle />
          </div>
        )}
      </div>
    </div>
  )

  if (done || !item || !preview)
    return (
      <section className="mx-auto max-w-3xl px-4 py-8">
        {header}
        <div className="box mt-6 p-10 text-center">
          <p className="text-5xl">🎉</p>
          <h2 className="mt-3 text-2xl font-extrabold">{t('flashcard.done')}</h2>
          <p className="mt-1 text-ink-soft">{t('flashcard.done_summary', { reviewed, wrong })}</p>
          <button type="button" onClick={onExit} className="btn btn-primary mt-6 px-6">
            {t('flashcard.back_dashboard')}
          </button>
        </div>
      </section>
    )

  return (
    <section className="mx-auto max-w-3xl px-4 py-8">
      {header}
      <span className="tag mt-4 bg-sand px-3 py-1 text-sm">{lesson ? t('tools.grammar') : t('nav.vocabulary')}</span>
      <div className="mt-4 flex justify-between text-sm font-bold text-ink-soft tabular-nums">
        <span>
          {index + 1} / {queue.length}
        </span>
        <span>{t('flashcard.session_counts', { reviewed, wrong })}</span>
      </div>

      {/* Thẻ */}
      <div
        className={clsx(
          'box mt-2 flex min-h-72 flex-col items-center justify-center p-6 text-center',
          !revealed && !typing && 'cursor-pointer',
        )}
        onClick={() => !revealed && !typing && flip()}
      >
        {lesson ? (
          <GrammarFace lesson={lesson} revealed={revealed} />
        ) : !revealed ? (
          <>
            <p className="text-6xl font-bold text-brick">{word!.hanzi}</p>
            {typing ? (
              <div className="mt-6 w-full" onClick={(e) => e.stopPropagation()}>
                <input
                  ref={inputRef}
                  value={input}
                  onChange={(e) => setInput(convertPinyinInput(e.target.value))}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter') {
                      e.preventDefault()
                      check()
                    } else if (e.key === 'Escape') setTyping(false)
                  }}
                  autoComplete="off"
                  autoCapitalize="off"
                  spellCheck={false}
                  placeholder={t('flashcard.type_placeholder')}
                  aria-label={t('flashcard.type_placeholder')}
                  className="field text-center text-xl"
                />
                <p className="mt-1.5 text-xs text-ink-muted">{t('practice.pinyin_ime_hint')}</p>
                <button
                  type="button"
                  onClick={() => reveal()}
                  className="mt-3 inline-flex items-center gap-1.5 text-sm font-semibold text-ink-soft hover:text-ink"
                >
                  <HeartCrack size={15} />
                  {t('flashcard.give_up')}
                </button>
              </div>
            ) : (
              <p className="mt-4 text-sm text-ink-soft">{isTypingCard ? t('flashcard.tap_to_type') : t('flashcard.tap_to_flip')}</p>
            )}
          </>
        ) : (
          <div className="w-full">
            <div className="flex items-center justify-center gap-3">
              <p className="text-5xl font-bold text-brick">{word!.hanzi}</p>
              {supported && (
                <button type="button" onClick={() => speak(word!.hanzi)} aria-label={t('vocab.speak')} className="btn p-2">
                  <Volume2 size={16} />
                </button>
              )}
            </div>
            <p className="mt-2 text-lg italic">{word!.pinyin}</p>
            {word!.han_viet && <p className="text-sm font-bold uppercase">{word!.han_viet}</p>}
            {typed && (
              <p className={clsx('mt-2 text-sm font-bold', typed === 'right' ? 'text-[#3f7a52]' : 'text-brick')}>
                {typed === 'right' ? `✓ ${t('flashcard.typed_right')}` : `✗ ${t('flashcard.typed_wrong', { input })}`}
              </p>
            )}
            <p className="mt-3 rounded-2xl border-2 border-ink bg-sand px-4 py-2.5 text-lg font-bold">
              {word!.meaning_vi || word!.meaning_en}
            </p>
            {word!.example && (
              <div className="mt-4 border-t-2 border-dashed border-line pt-3 text-left">
                <div className="flex items-start justify-between gap-3">
                  <p className="text-lg">{word!.example}</p>
                  {supported && (
                    <button
                      type="button"
                      onClick={() => speak(word!.example!)}
                      aria-label={t('vocab.speak_example')}
                      className="btn shrink-0 p-1.5"
                    >
                      <Volume2 size={14} />
                    </button>
                  )}
                </div>
                {word!.example_pinyin && <p className="text-sm text-ink-soft italic">{word!.example_pinyin}</p>}
                {word!.example_vi && <p className="text-sm text-ink-soft italic">{word!.example_vi}</p>}
              </div>
            )}
          </div>
        )}
      </div>

      {/* Đánh giá */}
      <div className="mt-4 grid grid-cols-2 gap-3 sm:grid-cols-4">
        {ratingKeys.map((r, i) => (
          <button key={r} type="button" onClick={() => rate(r)} className={clsx('btn flex-col gap-0 py-2.5', ratingStyle[r])}>
            <span className="font-extrabold">
              <span className="mr-1 text-ink-soft">{i + 1}</span>
              {t(`flashcard.rate_${r}`)}
            </span>
            <span className="text-xs font-semibold text-ink-soft">{formatInterval(preview[r], i18n.language)}</span>
          </button>
        ))}
      </div>
      <p className="mt-3 flex flex-wrap items-center justify-center gap-1.5 text-xs text-ink-soft">
        <kbd className="tag px-1.5">Space</kbd> {t('flashcard.key_flip')} · <kbd className="tag px-1.5">1–4</kbd> {t('flashcard.key_rate')}{' '}
        · <kbd className="tag px-1.5">R</kbd> {t('flashcard.key_speak')}
      </p>
    </section>
  )
}

/** Hai mặt của thẻ ngữ pháp: trước = tên bài; sau = cấu trúc, giải thích, mẹo, lưu ý, ví dụ. */
function GrammarFace({ lesson: g, revealed }: { lesson: GrammarPoint; revealed: boolean }) {
  const { t } = useTranslation()
  const { speak, supported } = useSpeech()
  const examples = g.examples.filter((e) => !e.hanzi.startsWith('请用'))

  if (!revealed)
    return (
      <>
        <span className={clsx('tag', levelColor[g.level])}>HSK {g.level}</span>
        <p className="mt-3 text-3xl font-extrabold">{g.title}</p>
        <p className="mt-4 text-sm text-ink-soft">{t('flashcard.grammar_prompt')}</p>
        <p className="mt-1 text-xs text-ink-muted">{t('flashcard.tap_to_flip')}</p>
      </>
    )

  return (
    <div className="w-full text-left">
      <div className="text-center">
        <span className={clsx('tag', levelColor[g.level])}>HSK {g.level}</span>
        <p className="mt-2 text-2xl font-extrabold">{g.title}</p>
      </div>
      <p className="mt-3 rounded-2xl border-2 border-ink bg-sand px-4 py-2.5 text-center text-lg font-bold">{g.structure}</p>
      {g.explanation_vi && <p className="mt-3 text-sm leading-relaxed">{g.explanation_vi}</p>}
      {g.tip && (
        <p className="mt-2 flex gap-2 rounded-xl border-2 border-ink bg-sage/60 px-3 py-1.5 text-sm">
          <Lightbulb size={15} className="mt-0.5 shrink-0" />
          {g.tip}
        </p>
      )}
      {g.note && (
        <p className="mt-2 flex gap-2 rounded-xl border-2 border-ink bg-apricot/70 px-3 py-1.5 text-sm">
          <TriangleAlert size={15} className="mt-0.5 shrink-0" />
          {g.note}
        </p>
      )}
      {examples.length > 0 && (
        <div className="mt-3 space-y-2 border-t-2 border-dashed border-line pt-3">
          {examples.map((ex) => (
            <div key={ex.hanzi} className="flex items-start justify-between gap-3">
              <div>
                <p className="text-lg">{ex.hanzi}</p>
                {ex.pinyin && <p className="text-sm text-ink-soft italic">{ex.pinyin}</p>}
                {ex.meaning_vi && <p className="text-sm text-ink-soft italic">{ex.meaning_vi}</p>}
              </div>
              {supported && (
                <button type="button" onClick={() => speak(ex.hanzi)} aria-label={t('vocab.speak_example')} className="btn shrink-0 p-1.5">
                  <Volume2 size={14} />
                </button>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
