import clsx from 'clsx'
import { CheckCircle2, ChevronDown, Circle, Lightbulb, PencilLine, Search, TriangleAlert, Volume2 } from 'lucide-react'
import { useMemo, useState } from 'react'
import { useTranslation } from 'react-i18next'
import GrammarPractice from '../components/GrammarPractice'
import { levelColor } from '../components/WordCard'
import { normalize } from '../data/dictionary'
import { grammarPoints } from '../data/grammar'
import { useGrammarProgress } from '../hooks/useGrammarProgress'
import { useSpeech } from '../hooks/useSpeech'
import type { HSKLevel } from '../types'

const levels: HSKLevel[] = [1, 2, 3, 4, 5, 6]

export default function Grammar() {
  const { t } = useTranslation()
  const { speak, supported } = useSpeech()
  const [level, setLevel] = useState<HSKLevel | 'all'>(1)
  const [query, setQuery] = useState('')
  const [open, setOpen] = useState<string | null>(null)
  const [practicing, setPracticing] = useState<string | null>(null)
  const { learned, setLearnedFor } = useGrammarProgress()

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

  return (
    <section className="mx-auto max-w-3xl px-4 py-8">
      <h1 className="text-3xl font-bold">{t('tools.grammar')}</h1>
      <p className="mt-2 text-ink-soft">{t('grammar.intro', { count: grammarPoints.length })}</p>

      <div className="relative mt-5">
        <Search size={18} className="absolute top-1/2 left-3.5 -translate-y-1/2 text-ink-muted" />
        <input
          type="search"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder={t('grammar.search_placeholder')}
          className="field pl-10"
        />
      </div>

      <div className="mt-4 flex flex-wrap gap-2.5">
        {(['all', ...levels] as const).map((f) => (
          <button
            key={f}
            type="button"
            onClick={() => setLevel(f)}
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
        {list.map((g, i) => {
          const isOpen = open === g.id
          return (
            <div key={g.id} className="box">
              <button
                type="button"
                onClick={() => setOpen(isOpen ? null : g.id)}
                aria-expanded={isOpen}
                className={clsx('flex w-full items-center gap-3 px-4 py-3.5 text-left', isOpen && 'border-b-2 border-ink bg-sand')}
              >
                <span className="w-7 shrink-0 text-center text-sm font-bold text-ink-muted">
                  {learned.has(g.id) ? <CheckCircle2 size={20} className="mx-auto text-green-700" aria-label={t('grammar.learned')} /> : i + 1}
                </span>
                <span className={clsx('tag shrink-0', levelColor[g.level])}>HSK {g.level}</span>
                <span className="min-w-0 flex-1">
                  <span className="block font-bold">{g.title}</span>
                  {g.structure !== g.title && <span className="block truncate text-sm text-ink-soft">{g.structure}</span>}
                </span>
                <ChevronDown size={20} className={clsx('shrink-0 transition-transform', isOpen && 'rotate-180')} />
              </button>
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
    </section>
  )
}
