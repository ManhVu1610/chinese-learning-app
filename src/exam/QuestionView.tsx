import clsx from 'clsx'
import { Check, Delete, ImageOff, X } from 'lucide-react'
import { useTranslation } from 'react-i18next'
import { isCorrect, needsReview } from './scoring'
import type { Answer, ExamOption, ExamPaper, ExamQuestion } from './types'

/** Tên phần theo đề thật */
export const PART_TITLE: Record<string, string> = {
  'listening-1': '第一部分',
  'listening-2': '第二部分',
  'listening-3': '第三部分',
  'reading-1': '第一部分',
  'reading-2': '第二部分',
  'reading-3': '第三部分',
  'writing-1': '第一部分',
  'writing-2': '第二部分',
}

/**
 * Một câu hỏi của đề thi.
 * review = true: khoá câu trả lời, tô đúng / sai và hiện đáp án, lời thoại, giải thích.
 */
export default function QuestionView({
  paper,
  q,
  answer,
  onAnswer,
  review = false,
  override,
  onOverride,
  showListenText = true,
  locked = false,
}: {
  paper: ExamPaper
  q: ExamQuestion
  answer: Answer | undefined
  onAnswer: (a: Answer | undefined) => void
  review?: boolean
  override?: boolean
  onOverride?: (v: boolean | undefined) => void
  /** Hiện câu hỏi của phần nghe (thi thật thì câu hỏi chỉ được đọc, không in) */
  showListenText?: boolean
  /** Không cho chọn nữa (thi thật: câu nghe đã qua) */
  locked?: boolean
}) {
  const { t } = useTranslation()
  const disabled = review || locked
  const ok = review ? isCorrect(q, answer, override) : undefined

  return (
    <div lang="zh-CN">
      <p className="text-xs font-bold tracking-wide text-ink-soft" lang="vi">
        {PART_TITLE[`${q.section}-${q.part}`]} · {t(`exam.part.${q.section}_${q.part}`)}
      </p>

      {q.section === 'listening' && <ListeningBody q={q} showText={showListenText || review} />}
      {q.section === 'reading' && <ReadingBody paper={paper} q={q} answer={answer} />}

      {q.type === 'reading_ordering' && q.sentences ? (
        <Ordering q={q} answer={answer} onAnswer={onAnswer} disabled={disabled} review={review} />
      ) : q.section === 'writing' ? (
        <Writing q={q} answer={answer} onAnswer={onAnswer} disabled={disabled} />
      ) : (
        <Options q={q} answer={answer} onAnswer={onAnswer} disabled={disabled} review={review} />
      )}

      {review && (
        <ReviewBox q={q} answer={answer} ok={!!ok} override={override} onOverride={onOverride} />
      )}
    </div>
  )
}

function ListeningBody({ q, showText }: { q: ExamQuestion; showText: boolean }) {
  return (
    <div className="mt-3 space-y-3">
      {q.statement && (
        <p className="text-2xl leading-relaxed font-semibold">
          <span className="mr-2 text-brick">★</span>
          {q.statement}
        </p>
      )}
      {showText && q.passage && <p className="rounded-2xl bg-paper p-3 text-lg leading-relaxed whitespace-pre-line">{q.passage}</p>}
      {showText && q.question && (
        <p className="text-xl font-semibold">
          <span className="mr-2 text-brick">★</span>
          {q.question}
        </p>
      )}
    </div>
  )
}

function ReadingBody({ paper, q, answer }: { paper: ExamPaper; q: ExamQuestion; answer: Answer | undefined }) {
  const { t } = useTranslation()
  if (q.type === 'fill_in_blank' && !q.passage) {
    const chosen = typeof answer === 'number' ? q.options?.[answer]?.text : undefined
    const parts = (q.question ?? '').split(/[（(]\s*[　 ]*\s*[）)]/)
    const first = q.bank ? paper.questions.find((x) => x.bank === q.bank)?.n : undefined
    return (
      <div className="mt-3 space-y-4">
        {q.bank && (
          <div className="rounded-2xl border-2 border-dashed border-ink-muted p-3">
            <p className="text-xs font-bold text-ink-soft" lang="vi">
              {t('exam.word_bank', { from: first })}
            </p>
            <p className="mt-1 flex flex-wrap gap-x-5 gap-y-1 text-lg">
              {q.options?.map((o) => (
                <span key={o.label}>
                  <b className="text-brick">{o.label}</b> {o.text}
                </span>
              ))}
            </p>
          </div>
        )}
        <p className="text-xl leading-loose whitespace-pre-line">
          {parts.map((p, i) => (
            <span key={i}>
              {p}
              {i < parts.length - 1 && (
                <span
                  className={clsx(
                    'mx-1 inline-block min-w-16 rounded-lg border-b-4 px-2 text-center',
                    chosen ? 'border-brick bg-brick-soft font-bold' : 'border-ink',
                  )}
                >
                  {chosen ?? ' '}
                </span>
              )}
            </span>
          ))}
        </p>
      </div>
    )
  }
  if (q.type === 'reading_ordering') {
    return (
      <p className="mt-3 text-sm text-ink-soft" lang="vi">
        {q.sentences ? t('exam.order_hint') : t('exam.order_hint_choice')}
      </p>
    )
  }
  return (
    <div className="mt-3 space-y-3">
      {q.passage && <p className="rounded-2xl bg-paper p-4 text-lg leading-loose whitespace-pre-line">{q.passage}</p>}
      {q.question && (
        <p className="text-xl font-semibold whitespace-pre-line">
          {q.passage && <span className="mr-2 text-brick">★</span>}
          {q.question}
        </p>
      )}
    </div>
  )
}

function OptionRow({
  o,
  selected,
  state,
  disabled,
  onClick,
  big,
}: {
  o: ExamOption
  selected: boolean
  state?: 'right' | 'wrong'
  disabled: boolean
  onClick: () => void
  big?: boolean
}) {
  return (
    <button
      type="button"
      role="radio"
      aria-checked={selected}
      disabled={disabled}
      onClick={onClick}
      className={clsx(
        'flex w-full items-center gap-3 rounded-2xl border-2 px-4 text-left transition-colors',
        big ? 'justify-center py-4 text-2xl' : 'py-2.5 text-lg',
        state === 'right'
          ? 'border-ink bg-sage'
          : state === 'wrong'
            ? 'border-ink bg-coral'
            : selected
              ? 'border-ink bg-sky shadow-block-sm'
              : 'border-line bg-card hover:border-ink',
        disabled && 'cursor-default',
      )}
    >
      <span
        className={clsx(
          'flex h-8 w-8 shrink-0 items-center justify-center rounded-full border-2 text-sm font-extrabold',
          selected ? 'border-ink bg-ink text-card' : 'border-ink-muted',
        )}
        lang="en"
      >
        {o.label}
      </span>
      <span className="min-w-0">{o.text}</span>
      {state === 'right' && <Check size={18} className="ml-auto shrink-0" />}
      {state === 'wrong' && <X size={18} className="ml-auto shrink-0" />}
    </button>
  )
}

function Options({
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
  const tf = q.type === 'listening_true_false'
  const opts = q.options ?? []
  // Câu sắp xếp lỗi tách câu: chọn như trắc nghiệm.
  return (
    <div role="radiogroup" className={clsx('mt-5 grid gap-2.5', tf ? 'grid-cols-2' : opts.length > 4 ? 'sm:grid-cols-2' : '')}>
      {opts.map((o, i) => {
        const chosen = answer === i || (q.type === 'reading_ordering' && answer === q.orders?.[i])
        const state = review ? (i === q.answer ? 'right' : chosen ? 'wrong' : undefined) : undefined
        return (
          <OptionRow
            key={i}
            o={o}
            big={tf}
            selected={chosen}
            state={state}
            disabled={disabled}
            onClick={() => onAnswer(chosen ? undefined : i)}
          />
        )
      })}
    </div>
  )
}

function Ordering({
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
  const seq = typeof answer === 'string' ? answer.split('') : typeof answer === 'number' ? (q.orders?.[answer] ?? '').split('') : []
  const sentences = q.sentences ?? []
  const byLabel = (l: string) => sentences.find((s) => s.label === l)
  const set = (next: string[]) => onAnswer(next.length ? next.join('') : undefined)
  const correct = q.orders?.[q.answer] ?? ''
  return (
    <div className="mt-4 space-y-4">
      <div className="grid gap-2">
        {sentences.map((s) => {
          const used = seq.includes(s.label)
          return (
            <button
              key={s.label}
              type="button"
              disabled={disabled || used}
              onClick={() => set([...seq, s.label])}
              className={clsx(
                'flex items-start gap-3 rounded-2xl border-2 px-4 py-2.5 text-left text-lg',
                used ? 'border-line bg-paper text-ink-muted' : 'border-ink-muted bg-card hover:border-ink',
              )}
            >
              <b className="text-brick" lang="en">
                {s.label}
              </b>
              <span>{s.text}</span>
            </button>
          )
        })}
      </div>
      <div className="rounded-2xl border-2 border-ink bg-paper p-3">
        <div className="flex items-center gap-2">
          <p className="flex-1 text-xs font-bold text-ink-soft" lang="vi">
            {t('exam.your_order')}
          </p>
          {!disabled && seq.length > 0 && (
            <button type="button" onClick={() => set(seq.slice(0, -1))} className="btn px-2.5 py-1 text-xs" lang="vi">
              <Delete size={13} />
              {t('exam.undo')}
            </button>
          )}
        </div>
        <ol className="mt-2 space-y-1.5">
          {[0, 1, 2].map((i) => {
            const s = seq[i] ? byLabel(seq[i]) : undefined
            const state = review && s ? (correct[i] === s.label ? 'bg-sage' : 'bg-coral') : 'bg-card'
            return (
              <li key={i} className={clsx('flex min-h-11 items-center gap-3 rounded-xl border-2 border-line px-3 py-1.5 text-lg', state)}>
                <span className="text-sm font-bold text-ink-muted" lang="en">
                  {i + 1}
                </span>
                {s ? (
                  <span>
                    <b className="mr-2 text-brick" lang="en">
                      {s.label}
                    </b>
                    {s.text}
                  </span>
                ) : (
                  <span className="text-sm text-ink-muted" lang="vi">
                    {t('exam.tap_sentence')}
                  </span>
                )}
              </li>
            )
          })}
        </ol>
      </div>
      {review && (
        <p className="text-sm" lang="vi">
          {t('exam.correct_order')}: <b lang="en">{correct.split('').join(' → ')}</b>
        </p>
      )}
    </div>
  )
}

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
  const text = typeof answer === 'string' ? answer : ''
  return (
    <div className="mt-3 space-y-4">
      {q.part === 1 ? (
        <>
          <p className="text-sm text-ink-soft" lang="vi">
            {t('exam.write1_hint')}
          </p>
          {q.words ? (
            <div className="flex flex-wrap gap-2">
              {q.words.map((w, i) => (
                <button
                  key={i}
                  type="button"
                  disabled={disabled}
                  onClick={() => onAnswer(text + w)}
                  className="rounded-xl border-2 border-ink bg-sand px-3 py-1.5 text-xl font-semibold shadow-block-sm active:translate-y-0.5 active:shadow-none disabled:opacity-60"
                >
                  {w}
                </button>
              ))}
            </div>
          ) : (
            <p className="text-xl">{q.prompt}</p>
          )}
        </>
      ) : (
        <div className="flex flex-wrap items-start gap-4">
          {q.image ? (
            <img
              src={q.image}
              alt={q.keyword ?? ''}
              referrerPolicy="no-referrer"
              className="max-h-56 max-w-full rounded-2xl border-2 border-ink bg-card object-contain"
            />
          ) : (
            <div className="flex h-40 w-56 flex-col items-center justify-center gap-2 rounded-2xl border-2 border-dashed border-ink-muted text-ink-muted">
              <ImageOff size={26} />
              <span className="px-3 text-center text-xs" lang="vi">
                {t('exam.no_image')}
              </span>
            </div>
          )}
          <div className="min-w-0 flex-1">
            <p className="text-sm text-ink-soft" lang="vi">
              {t('exam.write2_hint')}
            </p>
            {q.keyword && <p className="mt-2 text-4xl font-bold text-brick">{q.keyword}</p>}
          </div>
        </div>
      )}
      <div className="flex gap-2">
        <textarea
          value={text}
          disabled={disabled}
          onChange={(e) => onAnswer(e.target.value)}
          rows={2}
          lang="zh-CN"
          placeholder={t('exam.type_here')}
          aria-label={t('exam.type_here')}
          className="field min-w-0 flex-1 resize-none text-xl"
        />
        {!disabled && text && (
          <button type="button" onClick={() => onAnswer(undefined)} className="btn self-start p-2" title={t('exam.clear')} aria-label={t('exam.clear')}>
            <X size={16} />
          </button>
        )}
      </div>
    </div>
  )
}

function ReviewBox({
  q,
  answer,
  ok,
  override,
  onOverride,
}: {
  q: ExamQuestion
  answer: Answer | undefined
  ok: boolean
  override?: boolean
  onOverride?: (v: boolean | undefined) => void
}) {
  const { t } = useTranslation()
  const pending = override === undefined && needsReview(q, answer)
  return (
    <div className={clsx('mt-5 space-y-3 rounded-2xl border-2 border-ink p-4', ok ? 'bg-sage/50' : 'bg-coral/50')} lang="vi">
      <p className="font-extrabold">
        {answer === undefined || answer === '' ? t('exam.unanswered') : ok ? t('exam.right') : t('exam.wrong')}
        {pending && <span className="ml-2 text-sm font-semibold text-ink-soft">({t('exam.auto_graded')})</span>}
      </p>
      {q.section === 'writing' && (
        <div>
          <p className="text-xs font-bold text-ink-soft">{q.part === 1 ? t('exam.answer_is') : t('exam.samples')}</p>
          <ul className="mt-1 space-y-0.5 text-lg" lang="zh-CN">
            {(q.accepted ?? []).map((s, i) => (
              <li key={i}>{s}</li>
            ))}
          </ul>
          {onOverride && typeof answer === 'string' && answer.trim() && (
            <div className="mt-3 flex flex-wrap items-center gap-2 text-sm">
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
      {q.explanation && (
        <div>
          <p className="text-xs font-bold text-ink-soft">{t('exam.explanation')}</p>
          <p className="mt-1 text-sm whitespace-pre-line">{q.explanation}</p>
        </div>
      )}
    </div>
  )
}
