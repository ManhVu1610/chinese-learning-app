import clsx from 'clsx'
import { ListChecks, RotateCcw } from 'lucide-react'
import { useMemo, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { Link } from 'react-router-dom'
import { fmtClock, SECTION_ZH } from './ExamRunner'
import QuestionView from './QuestionView'
import { isAnswered, isCorrect, needsReview, scoreRecord, sectionsOf, withSummary } from './scoring'
import { updateRecord } from './storage'
import type { ExamPaper, ExamRecord, SectionKey } from './types'

type Filter = 'all' | 'wrong' | 'check'

/** Kết quả một lượt thi: điểm từng kỹ năng theo thang HSK, rồi xem lại từng câu. */
export default function ExamResult({ paper, record, onRetry }: { paper: ExamPaper; record: ExamRecord; onRetry: () => void }) {
  const { t, i18n } = useTranslation()
  const [rec, setRec] = useState(record)
  const score = useMemo(() => scoreRecord(paper, rec), [paper, rec])
  const sections = sectionsOf(rec.scope, paper)
  const [tab, setTab] = useState<SectionKey>(sections[0])
  const [filter, setFilter] = useState<Filter>('all')

  const toCheck = paper.questions.filter((q) => sections.includes(q.section) && rec.overrides[q.n] === undefined && needsReview(q, rec.answers[q.n]))
  const shown = paper.questions.filter((q) => {
    if (q.section !== tab) return false
    if (filter === 'wrong') return !isCorrect(q, rec.answers[q.n], rec.overrides[q.n])
    if (filter === 'check') return toCheck.includes(q)
    return true
  })

  const setOverride = (n: number, v: boolean | undefined) => {
    const overrides = { ...rec.overrides }
    if (v === undefined) delete overrides[n]
    else overrides[n] = v
    const next = { ...rec, overrides }
    setRec(next)
    updateRecord(withSummary(paper, next))
  }

  const pct = score.total !== undefined ? score.total / score.max : (score.sections[0]?.score ?? 0) / 100

  return (
    <div className="space-y-6">
      {/* Bảng điểm */}
      <div className="box p-5 md:p-7">
        <div className="flex flex-wrap items-start gap-4">
          <div className="min-w-0 flex-1">
            <p className="text-sm font-bold text-ink-soft">
              {t(`exam.mode.${rec.mode}`)} · {new Date(rec.date).toLocaleString(i18n.language)} · {t('exam.duration', { time: fmtClock(rec.duration) })}
            </p>
            {score.total !== undefined ? (
              <>
                <p className="mt-2 text-5xl font-extrabold tabular-nums">
                  {score.total}
                  <span className="text-2xl text-ink-soft">/{score.max}</span>
                </p>
                <p className={clsx('mt-2 inline-flex rounded-full border-2 border-ink px-3 py-0.5 font-extrabold', score.passed ? 'bg-sage' : 'bg-coral')}>
                  {score.passed ? t('exam.passed') : t('exam.failed')}
                </p>
                <p className="mt-2 text-sm text-ink-soft">{t('exam.pass_rule', { level: paper.level, pass: score.max * 0.6, max: score.max })}</p>
              </>
            ) : (
              <p className="mt-2 text-5xl font-extrabold tabular-nums">
                {score.sections[0]?.score}
                <span className="text-2xl text-ink-soft">/100</span>
              </p>
            )}
          </div>
          <p className="text-6xl">{pct >= 0.8 ? '🎉' : pct >= 0.6 ? '👍' : '💪'}</p>
        </div>
        <div className="mt-5 grid gap-3 sm:grid-cols-3">
          {score.sections.map((x) => (
            <div key={x.section} className="rounded-2xl border-2 border-ink bg-paper p-3">
              <p className="text-sm font-bold">
                <span lang="zh-CN">{SECTION_ZH[x.section]}</span> · {t(`exam.section.${x.section}`)}
              </p>
              <p className="mt-1 text-2xl font-extrabold tabular-nums">
                {x.score}
                <span className="text-sm text-ink-soft">/100</span>
              </p>
              <div className="mt-1.5 h-2.5 overflow-hidden rounded-full border-2 border-ink bg-card">
                <div className={clsx('h-full', x.score >= 60 ? 'bg-sage' : 'bg-coral')} style={{ width: `${x.score}%` }} />
              </div>
              <p className="mt-1 text-xs text-ink-soft">{t('exam.correct_of', { correct: x.correct, total: x.total })}</p>
            </div>
          ))}
        </div>
        {toCheck.length > 0 && (
          <p className="mt-4 rounded-2xl border-2 border-ink bg-sand/70 px-4 py-2 text-sm">
            {t('exam.check_writing', { count: toCheck.length })}{' '}
            <button
              type="button"
              className="font-bold underline"
              onClick={() => {
                setTab('writing')
                setFilter('check')
              }}
            >
              {t('exam.check_now')}
            </button>
          </p>
        )}
        <div className="mt-5 flex flex-wrap gap-2">
          <button type="button" onClick={onRetry} className="btn btn-accent px-4 py-2 text-sm">
            <RotateCcw size={15} />
            {t('exam.retry')}
          </button>
          <Link to="/test" className="btn px-4 py-2 text-sm">
            <ListChecks size={15} />
            {t('exam.back_list')}
          </Link>
        </div>
      </div>

      {/* Xem lại */}
      <div>
        <h2 className="text-xl font-extrabold">{t('exam.review')}</h2>
        <div className="mt-3 flex flex-wrap items-center gap-2">
          {sections.map((k) => (
            <button key={k} type="button" onClick={() => setTab(k)} className={clsx('btn px-4 py-1.5 text-sm', tab === k && 'bg-sand')}>
              <span lang="zh-CN">{SECTION_ZH[k]}</span> {t(`exam.section.${k}`)}
            </button>
          ))}
          <span className="flex-1" />
          {(['all', 'wrong', 'check'] as Filter[]).map((f) => (
            <button key={f} type="button" onClick={() => setFilter(f)} className={clsx('tag py-1', filter === f && 'bg-lilac')}>
              {t(`exam.filter.${f}`)}
            </button>
          ))}
        </div>
        {tab === 'listening' && paper.audio && (
          <div className="box mt-4 flex flex-wrap items-center gap-3 bg-lilac/60 px-4 py-3">
            <p className="text-sm font-bold">{t('exam.tape_review')}</p>
            <audio src={paper.audio} controls preload="none" className="h-9 min-w-0 flex-1" />
          </div>
        )}
        {shown.length === 0 ? (
          <p className="mt-4 text-ink-soft">{t('exam.nothing_here')}</p>
        ) : (
          <ul className="mt-4 space-y-4">
            {shown.map((q) => (
              <li key={q.n} className="box p-5">
                <div className="flex items-center gap-3">
                  <span
                    className={clsx(
                      'sticker px-3 py-0.5 font-extrabold tabular-nums',
                      !isAnswered(rec.answers[q.n]) ? 'bg-card' : isCorrect(q, rec.answers[q.n], rec.overrides[q.n]) ? 'bg-sage' : 'bg-coral',
                    )}
                  >
                    {q.n}
                  </span>
                  <span className="text-sm font-bold text-ink-soft">{t(`exam.kind.${q.kind}`)}</span>
                </div>
                <div className="mt-3">
                  <QuestionView
                    paper={paper}
                    q={q}
                    answer={rec.answers[q.n]}
                    onAnswer={() => {}}
                    review
                    override={rec.overrides[q.n]}
                    onOverride={(v) => setOverride(q.n, v)}
                  />
                </div>
              </li>
            ))}
          </ul>
        )}
      </div>
    </div>
  )
}
