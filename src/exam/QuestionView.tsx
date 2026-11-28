import clsx from 'clsx'
import { Check, Delete, X } from 'lucide-react'
import type { ReactNode } from 'react'
import { useTranslation } from 'react-i18next'
import { isAnswered, isCorrect, isWritten, needsReview } from './scoring'
import { KIND_OPTIONS, type Answer, type ExamPaper, type ExamQuestion, type Region } from './types'

/** Một vùng cắt từ trang đề gốc. */
export function PaperCrop({ paper, region, className }: { paper: ExamPaper; region: Region; className?: string }) {
  const [page, y0, y1, a = 0, b = 1] = region
  const [cx0, cx1] = paper.crop
  const x0 = cx0 + (cx1 - cx0) * a
  const x1 = cx0 + (cx1 - cx0) * b
  const w = x1 - x0
  const h = y1 - y0
  return (
    <div
      className={clsx('relative w-full overflow-hidden bg-white', className)}
      style={{ aspectRatio: `${w} / ${h * paper.ratio}`, maxWidth: `${Math.round(w * 820)}px` }}
    >
      <img
        src={paper.base + paper.pages[page]}
        alt=""
        draggable={false}
        className="absolute max-w-none select-none"
        style={{ width: `${100 / w}%`, left: `${(-x0 / w) * 100}%`, top: `${(-y0 / h) * 100}%` }}
      />
    </div>
  )
}

/** Các vùng của một câu hoặc một phần chung, nối liền như trên giấy. */
export function Crops({ paper, regions }: { paper: ExamPaper; regions: Region[] }) {
  return (
    <div className="overflow-hidden rounded-2xl border-2 border-line bg-white">
      {regions.map((r, i) => (
        <PaperCrop key={i} paper={paper} region={r} />
      ))}
    </div>
  )
}

/**
 * Một câu hỏi: phần chung (tiêu đề phần, ví dụ, ngân hàng từ, đoạn văn), vùng của câu trên đề gốc, ô trả lời.
 * review = true: khoá câu trả lời, tô đúng / sai, hiện đáp án và lời thoại.
 */
export default function QuestionView({
  paper,
  q,
  answer,
  onAnswer,
  review = false,
  override,
  onOverride,
  showTranscript = false,
}: {
  paper: ExamPaper
  q: ExamQuestion
  answer: Answer | undefined
  onAnswer: (a: Answer | undefined) => void
  review?: boolean
  override?: boolean
  onOverride?: (v: boolean | undefined) => void
  showTranscript?: boolean
}) {
  const { t } = useTranslation()
  const intros = q.intro.map((k) => paper.intros[k]).filter(Boolean)
  return (
    <div className="space-y-3">
      {intros.map((r, i) => (
        <Crops key={i} paper={paper} regions={r} />
      ))}
      {q.regions.length > 0 ? (
        <div className="rounded-2xl ring-2 ring-brick ring-offset-2 ring-offset-card">
          <Crops paper={paper} regions={q.regions} />
        </div>
      ) : (
        <p className="text-sm text-ink-soft">{t('exam.in_block', { n: q.n })}</p>
      )}
      {q.sub && <p className="text-sm font-semibold text-ink-soft">{t('exam.sub_hint', { n: q.n, i: q.sub[0], k: q.sub[1] })}</p>}

      <AnswerInput q={q} answer={answer} onAnswer={onAnswer} disabled={review} review={review} />

      {review && <ReviewBox q={q} answer={answer} override={override} onOverride={onOverride} />}
      {!review && showTranscript && q.transcript && <Transcript text={q.transcript} />}
    </div>
  )
}

function Transcript({ text }: { text: string }) {
  const { t } = useTranslation()
  return (
    <details className="rounded-2xl border-2 border-line bg-paper px-4 py-2">
      <summary className="cursor-pointer text-sm font-bold text-ink-soft">{t('exam.transcript')}</summary>
      <p className="mt-1 text-lg whitespace-pre-line" lang="zh-CN">
        {text}
      </p>
    </details>
  )
}

function AnswerInput({
  q,
  answer,
  onAnswer,
  disabled,
  review,
}: {
  q: ExamQuestion
  answer: Answer | undefined
  onAnswer: (a: Answer | undefined) => void
  disabled: boolean
  review: boolean
}) {
  if (q.kind === 'tf') {
    return (
      <div role="radiogroup" className="grid grid-cols-2 gap-3 pt-1">
        {(['√', '×'] as const).map((v) => (
          <Choice key={v} value={v} q={q} answer={answer} onAnswer={onAnswer} disabled={disabled} review={review} big>
            {v === '√' ? <Check size={30} strokeWidth={3} /> : <X size={30} strokeWidth={3} />}
          </Choice>
        ))}
      </div>
    )
  }
  if (q.kind === 'order') return <Order q={q} answer={answer} onAnswer={onAnswer} disabled={disabled} review={review} />
  if (isWritten(q)) return <Writing q={q} answer={answer} onAnswer={onAnswer} disabled={disabled} />
  const letters = (KIND_OPTIONS[q.kind] ?? 'ABCD').split('')
  return (
    <div role="radiogroup" className={clsx('grid gap-2 pt-1', letters.length > 4 ? 'grid-cols-3 sm:grid-cols-6' : letters.length === 4 ? 'grid-cols-4' : 'grid-cols-3')}>
      {letters.map((l) => (
        <Choice key={l} value={l} q={q} answer={answer} onAnswer={onAnswer} disabled={disabled} review={review}>
          {l}
        </Choice>
      ))}
    </div>
  )
}

function Choice({
  value,
  q,
  answer,
  onAnswer,
  disabled,
  review,
  big,
  children,
}: {
  value: string
  q: ExamQuestion
  answer: Answer | undefined
  onAnswer: (a: Answer | undefined) => void
  disabled: boolean
  review: boolean
  big?: boolean
  children: ReactNode
}) {
  const selected = answer === value
  const state = review ? (value === q.answer ? 'right' : selected ? 'wrong' : undefined) : undefined
  return (
    <button
      type="button"
      role="radio"
      aria-checked={selected}
      aria-label={value}
      disabled={disabled}
      onClick={() => onAnswer(selected ? undefined : value)}
      className={clsx(
        'flex items-center justify-center rounded-2xl border-2 font-extrabold transition-colors',
        big ? 'py-3' : 'py-2.5 text-xl',
        state === 'right'
          ? 'border-ink bg-sage'
          : state === 'wrong'
            ? 'border-ink bg-coral'
            : selected
              ? 'border-ink bg-sky shadow-block-sm'
              : 'border-line bg-card hover:border-ink',
        disabled && 'cursor-default',
      )}
      lang="en"
    >
      {children}
    </button>
  )
}

function Order({
  q,
  answer,
  onAnswer,
  disabled,
  review,
}: {
  q: ExamQuestion
  answer: Answer | undefined
  onAnswer: (a: Answer | undefined) => void
  disabled: boolean
  review: boolean
}) {
  const { t } = useTranslation()
  const seq = (answer ?? '').split('').filter(Boolean)
  const set = (next: string[]) => onAnswer(next.length ? next.join('') : undefined)
  const correct = q.answer ?? ''
  return (
    <div className="space-y-2 pt-1">
      <p className="text-sm text-ink-soft">{t('exam.order_hint')}</p>
      <div className="flex flex-wrap items-center gap-2">
        {['A', 'B', 'C'].map((l) => (
          <button
            key={l}
            type="button"
            disabled={disabled || seq.includes(l)}
            onClick={() => set([...seq, l])}
            className={clsx(
              'h-11 w-11 rounded-xl border-2 text-lg font-extrabold',
              seq.includes(l) ? 'border-line bg-paper text-ink-muted' : 'border-ink bg-card hover:bg-sand',
            )}
            lang="en"
          >
            {l}
          </button>
        ))}
        <span className="mx-1 text-ink-muted">→</span>
        {[0, 1, 2].map((i) => (
          <span
            key={i}
            className={clsx(
              'flex h-11 w-11 items-center justify-center rounded-xl border-2 text-lg font-extrabold',
              review && seq[i] ? (correct[i] === seq[i] ? 'border-ink bg-sage' : 'border-ink bg-coral') : seq[i] ? 'border-ink bg-sky' : 'border-dashed border-ink-muted',
            )}
            lang="en"
          >
            {seq[i] ?? ''}
          </span>
        ))}
        {!disabled && seq.length > 0 && (
          <button type="button" onClick={() => set(seq.slice(0, -1))} className="btn px-2.5 py-1 text-xs">
            <Delete size={13} />
            {t('exam.undo')}
          </button>
        )}
      </div>
    </div>
  )
}

const hanCount = (s: string) => (s.match(/\p{Script=Han}/gu) ?? []).length

function Writing({
  q,
  answer,
  onAnswer,
  disabled,
}: {
  q: ExamQuestion
  answer: Answer | undefined
  onAnswer: (a: Answer | undefined) => void
  disabled: boolean
}) {
  const { t } = useTranslation()
  const text = answer ?? ''
  const essay = q.kind === 'essay'
  return (
    <div className="pt-1">
      <div className="flex gap-2">
        <textarea
          value={text}
          disabled={disabled}
          onChange={(e) => onAnswer(e.target.value || undefined)}
          rows={essay ? 8 : 2}
          lang="zh-CN"
          placeholder={essay ? t('exam.type_essay') : t('exam.type_here')}
          aria-label={t('exam.type_here')}
          className={clsx('field min-w-0 flex-1 text-xl', essay ? 'resize-y leading-relaxed' : 'resize-none')}
        />
        {!disabled && text && (
          <button type="button" onClick={() => onAnswer(undefined)} className="btn self-start p-2" title={t('exam.clear')} aria-label={t('exam.clear')}>
            <X size={16} />
          </button>
        )}
      </div>
      {essay && <p className="mt-1 text-right text-xs text-ink-soft tabular-nums">{t('exam.han_count', { count: hanCount(text) })}</p>}
    </div>
  )
}

function ReviewBox({
  q,
  answer,
  override,
  onOverride,
}: {
  q: ExamQuestion
  answer: Answer | undefined
  override?: boolean
  onOverride?: (v: boolean | undefined) => void
}) {
  const { t } = useTranslation()
  const ok = isCorrect(q, answer, override)
  const pending = override === undefined && needsReview(q, answer)
  const shown = q.answer ? (q.answer === '√' ? t('exam.true') : q.answer === '×' ? t('exam.false') : q.answer) : null
  return (
    <div className={clsx('space-y-3 rounded-2xl border-2 border-ink p-4', pending ? 'bg-sand/60' : ok ? 'bg-sage/50' : 'bg-coral/50')}>
      <p className="font-extrabold">
        {!isAnswered(answer) ? t('exam.unanswered') : pending ? t('exam.to_grade') : ok ? t('exam.right') : t('exam.wrong')}
      </p>
      {isWritten(q) && isAnswered(answer) && (
        <p className="text-lg" lang="zh-CN">
          <span className="mr-2 text-xs font-bold text-ink-soft" lang="vi">
            {t('exam.your_answer')}
          </span>
          {answer}
        </p>
      )}
      {shown ? (
        <p className={clsx(isWritten(q) ? 'text-lg' : 'text-2xl font-extrabold')} lang={isWritten(q) ? 'zh-CN' : undefined}>
          <span className="mr-2 text-xs font-bold text-ink-soft" lang="vi">
            {isWritten(q) ? t('exam.sample') : t('exam.answer_is')}
          </span>
          {shown}
        </p>
      ) : (
        isWritten(q) && <p className="text-sm text-ink-soft">{t('exam.no_sample')}</p>
      )}
      {onOverride && isWritten(q) && isAnswered(answer) && (
        <div className="flex flex-wrap items-center gap-2 text-sm">
          <span className="text-ink-soft">{t('exam.self_grade')}</span>
          <button type="button" onClick={() => onOverride(true)} className={clsx('btn px-3 py-1 text-xs', override === true && 'bg-sage')}>
            <Check size={13} />
            {t('exam.mark_right')}
          </button>
          <button type="button" onClick={() => onOverride(false)} className={clsx('btn px-3 py-1 text-xs', override === false && 'bg-coral')}>
            <X size={13} />
            {t('exam.mark_wrong')}
          </button>
          {override !== undefined && (
            <button type="button" onClick={() => onOverride(undefined)} className="text-xs text-ink-soft underline">
              {t('exam.mark_auto')}
            </button>
          )}
        </div>
      )}
      {q.transcript && (
        <div>
          <p className="text-xs font-bold text-ink-soft">{t('exam.transcript')}</p>
          <p className="mt-1 text-lg whitespace-pre-line" lang="zh-CN">
            {q.transcript}
          </p>
        </div>
      )}
    </div>
  )
}
