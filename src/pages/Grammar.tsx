import clsx from 'clsx'
import { CheckCircle2, ChevronDown, Circle, Layers, Lightbulb, PencilLine, Search, Star, TriangleAlert, Volume2 } from 'lucide-react'
import { useMemo, useState } from 'react'
import Pagination from '../components/Pagination'
import { useTranslation } from 'react-i18next'
import GrammarPractice from '../components/GrammarPractice'
import { levelColor } from '../components/WordCard'
import { normalize } from '../data/dictionary'
import { grammarPoints } from '../data/grammar'
import { GRAMMAR_PREFIX, useFlashcard } from '../hooks/useFlashcard'
import { useGrammarProgress } from '../hooks/useGrammarProgress'
import { Link } from 'react-router-dom'
import { useSpeech } from '../hooks/useSpeech'
import type { HSKLevel } from '../types'
import Page from '../components/layout/Page'

const levels: HSKLevel[] = [1, 2, 3, 4, 5, 6]

const PAGE_SIZE = 10

export default function Grammar() {
  const { t } = useTranslation()
  const { speak, supported } = useSpeech()
  const [level, setLevel] = useState<HSKLevel | 'all'>(1)
  const [query, setQuery] = useState('')
  const [open, setOpen] = useState<string | null>(null)
  const [practicing, setPracticing] = useState<string | null>(null)
  // Chia trang danh sách bài, mỗi trang 10 bài.
  const [page, setPage] = useState(0)
  const { learned, setLearnedFor } = useGrammarProgress()
  // Flashcard ngữ pháp: thẻ có id "g:" + id bài.
  const fc = useFlashcard()
  const inDeck = (id: string) => fc.hasCard(GRAMMAR_PREFIX + id)
  const deckCount = fc.cards.filter((c) => c.wordId.startsWith(GRAMMAR_PREFIX)).length
  const toggleCard = (id: string) => (inDeck(id) ? fc.removeCard(GRAMMAR_PREFIX + id) : fc.addIds([GRAMMAR_PREFIX + id]))

  const counts = useMemo(() => {
    const c: Record<number, number> = {}
    for (const g of grammarPoints) c[g.level] = (c[g.level] ?? 0) + 1
    return c
  }, [])

  const list = useMemo(() => {
    const raw = query.trim()
    const q = normalize(raw)
    return grammarPoints.filter(
      (g) =>
        (level === 'all' || g.level === level) &&
        (!q ||
          g.title.includes(raw) ||
          g.structure.includes(raw) ||
          normalize(g.title).includes(q) ||
          normalize(g.structure).includes(q) ||
          g.examples.some((e) => e.hanzi.includes(raw))),
    )
  }, [level, query])

  const pageCount = Math.max(1, Math.ceil(list.length / PAGE_SIZE))
  const safePage = Math.min(page, pageCount - 1)

  return (
    <Page
      feature="grammar"
      size="narrow"
      description={t('grammar.intro', { count: grammarPoints.length })}
      actions={
        <Link to="/flashcard?tab=grammar" className="btn btn-primary px-4 py-2 text-sm">
          <Layers size={16} />
          {t('grammar.open_flashcard', { count: deckCount })}
        </Link>
      }
    >
      <div className="relative mt-5">
        <Search size={18} className="absolute top-1/2 left-3.5 -translate-y-1/2 text-ink-muted" />
        <input
          type="search"
          value={query}
          onChange={(e) => {
            setQuery(e.target.value)
            setPage(0)
          }}
          placeholder={t('grammar.search_placeholder')}
          className="field pl-10"
        />
      </div>

      <div className="mt-4 flex flex-wrap gap-2.5">
        {(['all', ...levels] as const).map((f) => (
          <button
            key={f}
            type="button"
            onClick={() => {
              setLevel(f)
              setPage(0)
            }}
            aria-pressed={level === f}
            className={clsx('btn px-4 py-1.5 text-sm', level === f ? 'bg-sand' : 'text-ink-soft')}
          >
            {f === 'all' ? t('vocab.all') : `HSK ${f}`}
            {f !== 'all' && (
              <span className="text-xs font-normal text-ink-muted">
                {grammarPoints.filter((g) => g.level === f && learned.has(g.id)).length}/{counts[f] ?? 0}
              </span>
            )}
          </button>
        ))}
      </div>

      <p className="mt-4 text-sm font-medium text-ink-soft">{t('grammar.showing', { count: list.length })}</p>

      {list.length === 0 && <p className="box mt-4 p-8 text-center text-ink-soft">{t('grammar.no_results')}</p>}

      <div className="mt-4 space-y-4">
        {list.slice(safePage * PAGE_SIZE, safePage * PAGE_SIZE + PAGE_SIZE).map((g, idx) => {
          const i = safePage * PAGE_SIZE + idx
          const isOpen = open === g.id
          return (
            <div key={g.id} className="box overflow-hidden">
              <div className={clsx('flex items-stretch', isOpen && 'border-b-2 border-ink bg-sand')}>
                <button
                  type="button"
                  onClick={() => setOpen(isOpen ? null : g.id)}
                  aria-expanded={isOpen}
                  className="flex min-w-0 flex-1 items-center gap-3 py-3.5 pl-4 text-left"
                >
                  <span className="w-7 shrink-0 text-center text-sm font-bold text-ink-muted">
                    {learned.has(g.id) ? (
                      <CheckCircle2 size={20} className="mx-auto text-green-700" aria-label={t('grammar.learned')} />
                    ) : (
                      i + 1
                    )}
                  </span>
                  <span className={clsx('tag shrink-0', levelColor[g.level])}>HSK {g.level}</span>
                  <span className="min-w-0 flex-1">
                    <span className="block font-bold">{g.title}</span>
                    {g.structure !== g.title && <span className="block truncate text-sm text-ink-soft">{g.structure}</span>}
                  </span>
                  <ChevronDown size={20} className={clsx('shrink-0 transition-transform', isOpen && 'rotate-180')} />
                </button>
                {/* Sao: thêm / bỏ bài này khỏi Flashcard ngữ pháp */}
                <button
                  type="button"
                  onClick={() => toggleCard(g.id)}
                  aria-pressed={inDeck(g.id)}
                  title={inDeck(g.id) ? t('grammar.remove_flashcard') : t('grammar.add_flashcard')}
                  aria-label={`${inDeck(g.id) ? t('grammar.remove_flashcard') : t('grammar.add_flashcard')}: ${g.title}`}
                  className="shrink-0 px-4 text-ink-soft hover:text-ink"
                >
                  <Star size={20} className={clsx(inDeck(g.id) && 'fill-sand text-ink')} />
                </button>
              </div>
              {isOpen && (
                <div className="space-y-4 p-4">
                  <div className="flex flex-wrap gap-2">
                    <button
                      type="button"
                      onClick={() => setLearnedFor(g.id, !learned.has(g.id))}
                      aria-pressed={learned.has(g.id)}
                      className={clsx('btn px-3 py-1.5 text-sm', learned.has(g.id) && 'bg-sage')}
                    >
                      {learned.has(g.id) ? <CheckCircle2 size={16} /> : <Circle size={16} />}
                      {learned.has(g.id) ? t('grammar.learned') : t('grammar.mark_learned')}
                    </button>
                    <button
                      type="button"
                      onClick={() => setPracticing(practicing === g.id ? null : g.id)}
                      aria-expanded={practicing === g.id}
                      className={clsx('btn px-3 py-1.5 text-sm', practicing === g.id && 'bg-sand')}
                    >
                      <PencilLine size={16} />
                      {t('grammar.practice')}
                    </button>
                  </div>
                  {practicing === g.id && (
                    <GrammarPractice
                      lesson={g}
                      learned={learned.has(g.id)}
                      onMarkLearned={() => setLearnedFor(g.id, true)}
                      onClose={() => setPracticing(null)}
                    />
                  )}
                  <div>
                    <p className="text-xs font-semibold text-ink-muted uppercase">{t('grammar.structure')}</p>
                    <p className="mt-1 inline-block border-2 border-ink bg-paper px-3 py-1.5 text-lg font-semibold">{g.structure}</p>
                  </div>
                  <p>{g.explanation_vi}</p>
                  {g.tip && (
                    <p className="flex gap-2 border-2 border-ink bg-sage/60 px-3 py-2 text-sm">
                      <Lightbulb size={16} className="mt-0.5 shrink-0" />
                      <span>
                        <b>{t('grammar.tip')}:</b> {g.tip}
                      </span>
                    </p>
                  )}
                  {g.note && (
                    <p className="flex gap-2 border-2 border-ink bg-apricot/70 px-3 py-2 text-sm">
                      <TriangleAlert size={16} className="mt-0.5 shrink-0" />
                      <span>
                        <b>{t('grammar.note')}:</b> {g.note}
                      </span>
                    </p>
                  )}
                  <div>
                    <p className="text-xs font-semibold text-ink-muted uppercase">{t('grammar.examples')}</p>
                    <ul className="mt-2 space-y-2">
                      {g.examples.map((ex) => (
                        <li key={ex.hanzi} className="flex items-start gap-3 border-l-4 border-sage bg-paper px-3 py-2">
                          <div className="flex-1">
                            <p className="text-lg font-semibold text-brick">{ex.hanzi}</p>
                            {ex.pinyin && <p className="text-sm text-ink-soft italic">{ex.pinyin}</p>}
                            <p className="text-sm">{ex.meaning_vi}</p>
                          </div>
                          {supported && (
                            <button
                              type="button"
                              onClick={() => speak(ex.hanzi)}
                              title={t('vocab.speak')}
                              aria-label={`${t('vocab.speak')} ${ex.hanzi}`}
                              className="btn p-1.5"
                            >
                              <Volume2 size={16} />
                            </button>
                          )}
                        </li>
                      ))}
                    </ul>
                  </div>
                </div>
              )}
            </div>
          )
        })}
      </div>
      <Pagination
        page={safePage}
        pageCount={pageCount}
        onChange={(p) => {
          setPage(p)
          setOpen(null)
          window.scrollTo({ top: 0 })
        }}
      />
    </Page>
  )
}
