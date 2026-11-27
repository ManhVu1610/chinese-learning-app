import { RotateCcw, Settings2, X } from 'lucide-react'
import type { ReactNode } from 'react'
import { useTranslation } from 'react-i18next'
import type { Word } from '../../types'

/** Khung một lượt luyện: tiêu đề, tiến độ, nút thoát. */
export function SessionFrame({
  title,
  index,
  total,
  score,
  onExit,
  children,
}: {
  title: string
  index: number
  total: number
  score: number
  onExit: () => void
  children: ReactNode
}) {
  const { t } = useTranslation()
  return (
    <section className="mx-auto max-w-2xl px-4 py-8">
      <div className="flex items-center gap-3">
        <h1 className="flex-1 text-xl font-bold">{title}</h1>
        <span className="text-sm font-semibold text-ink-soft tabular-nums">
          {t('practice.progress', { n: Math.min(index + 1, total), total })} · {t('practice.score', { score })}
        </span>
        <button type="button" onClick={onExit} aria-label={t('practice.exit')} title={t('practice.exit')} className="btn p-1.5">
          <X size={16} />
        </button>
      </div>
      <div
        className="mt-3 h-3 overflow-hidden rounded-full border-2 border-ink bg-card"
        role="progressbar"
        aria-valuenow={index}
        aria-valuemin={0}
        aria-valuemax={total}
      >
        <div className="h-full rounded-full bg-sage transition-all" style={{ width: `${(index / total) * 100}%` }} />
      </div>
      <div className="box mt-5 p-5 md:p-7">{children}</div>
    </section>
  )
}

/** Kết quả cuối lượt: điểm, danh sách từ sai, luyện lại. */
export function SessionSummary({
  title,
  score,
  total,
  wrong,
  onRetryWrong,
  onRestart,
  onSetup,
}: {
  title: string
  score: number
  total: number
  wrong: Word[]
  onRetryWrong: () => void
  onRestart: () => void
  onSetup: () => void
}) {
  const { t } = useTranslation()
  const pct = total ? Math.round((score / total) * 100) : 0
  return (
    <section className="mx-auto max-w-2xl px-4 py-8">
      <h1 className="text-xl font-bold">{title}</h1>
      <div className="box mt-5 p-6 text-center">
        <p className="text-4xl">{pct >= 80 ? '🎉' : pct >= 50 ? '👍' : '💪'}</p>
        <p className="mt-2 text-2xl font-extrabold">{t('practice.result', { score, total })}</p>
        <p className="text-ink-soft">{pct}%</p>
        <div className="mt-5 flex flex-wrap justify-center gap-2">
          {wrong.length > 0 && (
            <button type="button" onClick={onRetryWrong} className="btn btn-accent px-4 py-2 text-sm">
              <RotateCcw size={15} />
              {t('practice.retry_wrong', { count: wrong.length })}
            </button>
          )}
          <button type="button" onClick={onRestart} className="btn px-4 py-2 text-sm">
            <RotateCcw size={15} />
            {t('practice.restart')}
          </button>
          <button type="button" onClick={onSetup} className="btn px-4 py-2 text-sm">
            <Settings2 size={15} />
            {t('practice.change_setup')}
          </button>
        </div>
      </div>
      {wrong.length > 0 && (
        <div className="box mt-5 p-4">
          <h2 className="font-bold">{t('practice.wrong_list')}</h2>
          <ul className="mt-2 divide-y-2 divide-line">
            {wrong.map((w) => (
              <li key={w.id} className="flex items-baseline gap-3 py-1.5">
                <span className="text-xl font-bold text-brick">{w.hanzi}</span>
                <span className="text-sm text-ink-soft italic">{w.pinyin}</span>
                <span className="min-w-0 flex-1 truncate text-sm">{w.meaning_vi}</span>
              </li>
            ))}
          </ul>
        </div>
      )}
    </section>
  )
}

/** Ô báo đúng / sai sau mỗi câu. */
export function Feedback({ ok, children }: { ok: boolean; children: ReactNode }) {
  const { t } = useTranslation()
  return (
    <div className={`mt-4 rounded-2xl border-2 border-ink px-4 py-3 ${ok ? 'bg-sage/70' : 'bg-coral/70'}`} role="status">
      <p className="font-bold">{ok ? t('practice.correct') : t('practice.wrong')}</p>
      <div className="mt-1 text-sm">{children}</div>
    </div>
  )
}

/** Đáp án đầy đủ của một từ. */
export function WordAnswer({ w }: { w: Word }) {
  return (
    <p>
      <span className="text-lg font-bold">{w.hanzi}</span> <span className="italic">{w.pinyin}</span>
      {w.han_viet && <span className="text-ink-soft"> · {w.han_viet}</span>} — {w.meaning_vi}
    </p>
  )
}
