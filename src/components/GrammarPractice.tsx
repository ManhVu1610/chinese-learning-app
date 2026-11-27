import clsx from 'clsx'
import { ArrowRight, Check, Eye, RotateCcw, X } from 'lucide-react'
import { useMemo, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { playResult } from '../lib/sfx'
import type { GrammarPoint } from '../types'

/**
 * Luyện tập một bài ngữ pháp, theo cách app Learn làm (grammar_practice_page.dart):
 *  1. Chọn đáp án đúng điền vào chỗ trống (từ ngữ pháp trong câu ví dụ bị che).
 *  2. Dịch câu ví dụ sang tiếng Việt, rồi xem đáp án tham khảo và tự chấm.
 *  3. Dịch nghĩa tiếng Việt sang tiếng Trung, rồi xem đáp án và tự chấm.
 * Mỗi câu ví dụ tạo một câu hỏi cho từng dạng (Learn lặp tới 20 câu dù chỉ có 1–2 ví dụ).
 * Bài HSK 5–6 trong Learn chỉ có đề "请用…造句": luyện bằng cách tự đặt câu có chứa cấu trúc.
 */

// Đáp án nhiễu dự phòng, giống Learn.
const FALLBACK = ['不得', '不会', '没有', '可以', '应该', '已经', '才', '就', '却', '也']

type Question =
  | { kind: 'choice'; prompt: string; answer: string; options: string[]; meaning: string }
  | { kind: 'zh2vi' | 'vi2zh'; prompt: string; answer: string }
  | { kind: 'write'; tokens: string[] }

const hanTokens = (s: string) => [...new Set(s.match(/[㐀-鿿]+/g) ?? [])].sort((a, b) => b.length - a.length)

/** Trộn ổn định theo hạt giống để mỗi lần mở bài thứ tự đáp án giống nhau. */
function shuffle<T>(arr: T[], seed: number): T[] {
  const a = [...arr]
  let s = seed
  for (let i = a.length - 1; i > 0; i--) {
    s = (s * 9301 + 49297) % 233280
    const j = Math.floor((s / 233280) * (i + 1))
    ;[a[i], a[j]] = [a[j], a[i]]
  }
  return a
}

function buildQuestions(g: GrammarPoint): Question[] {
  const tokens = hanTokens(`${g.structure} ${g.title}`)
  const writeOnly = g.examples.every((e) => e.hanzi.startsWith('请用'))
  if (writeOnly) return [{ kind: 'write', tokens: tokens.flatMap((t) => t.split(/……|…/)).filter(Boolean) }]

  const seed = Number(g.id.replace(/\D/g, '')) || 1
  const choice: Question[] = g.examples.map((ex, i) => {
    const answer = tokens.find((t) => ex.hanzi.includes(t)) ?? tokens[0] ?? '是'
    const prompt = ex.hanzi.includes(answer) ? ex.hanzi.replace(answer, '＿＿') : `＿＿ ${ex.hanzi}`
    // Bỏ đáp án nhiễu chứa/nằm trong đáp án đúng (vd 是 và 不是 đều điền được vào "我＿＿学生").
    const pool = [...new Set([...tokens, ...FALLBACK])].filter((x) => x !== answer && !x.includes(answer) && !answer.includes(x))
    return { kind: 'choice', prompt, answer, options: shuffle([answer, ...pool.slice(0, 3)], seed * 100 + i), meaning: ex.meaning_vi }
  })
  const zh2vi: Question[] = g.examples.filter((e) => e.meaning_vi).map((e) => ({ kind: 'zh2vi', prompt: e.hanzi, answer: e.meaning_vi }))
  const vi2zh: Question[] = g.examples.filter((e) => e.meaning_vi).map((e) => ({ kind: 'vi2zh', prompt: e.meaning_vi, answer: e.hanzi }))
  return [...choice, ...zh2vi, ...vi2zh]
}

export default function GrammarPractice({
  lesson,
  learned,
  onMarkLearned,
  onClose,
}: {
  lesson: GrammarPoint
  learned: boolean
  onMarkLearned: () => void
  onClose: () => void
}) {
  const { t } = useTranslation()
  const questions = useMemo(() => buildQuestions(lesson), [lesson])
  const [index, setIndex] = useState(0)
  const [picked, setPicked] = useState<string | null>(null)
  const [revealed, setRevealed] = useState(false)
  const [score, setScore] = useState(0)
  const [written, setWritten] = useState('')
  const done = index >= questions.length
  const q = questions[index]

  const next = (correct: boolean) => {
    if (correct) setScore((s) => s + 1)
    setIndex((i) => i + 1)
    setPicked(null)
    setRevealed(false)
  }
  const restart = () => {
    setIndex(0)
    setScore(0)
    setPicked(null)
    setRevealed(false)
    setWritten('')
  }

  return (
    <div className="border-2 border-ink bg-card p-4">
      <div className="mb-3 flex items-center gap-3">
        <p className="flex-1 text-sm font-bold">
          {t('grammar.practice')}
          {!done && (
            <span className="ml-2 font-normal text-ink-soft">{t('grammar.question_n', { n: index + 1, total: questions.length })}</span>
          )}
        </p>
        <button type="button" onClick={onClose} aria-label={t('common.close')} className="p-1 text-ink-soft hover:text-ink">
          <X size={18} />
        </button>
      </div>
      <div className="mb-4 h-3 overflow-hidden rounded-full border-2 border-ink">
        <div
          className="h-full bg-sage transition-all"
          style={{ width: `${(Math.min(index, questions.length) / questions.length) * 100}%` }}
        />
      </div>

      {done ? (
        <div className="text-center">
          <p className="text-3xl">🎉</p>
          <p className="mt-2 font-bold">{t('grammar.done', { score, total: questions.length })}</p>
          <div className="mt-4 flex flex-wrap justify-center gap-2">
            <button type="button" onClick={restart} className="btn px-4 py-1.5 text-sm">
              <RotateCcw size={15} />
              {t('grammar.again')}
            </button>
            {!learned && (
              <button type="button" onClick={onMarkLearned} className="btn btn-primary px-4 py-1.5 text-sm">
                <Check size={15} />
                {t('grammar.mark_learned')}
              </button>
            )}
          </div>
        </div>
      ) : q.kind === 'choice' ? (
        <>
          <p className="text-sm text-ink-soft">{t('grammar.q_choice')}</p>
          <p className="mt-2 text-2xl font-semibold">{q.prompt}</p>
          <div className="mt-4 grid grid-cols-2 gap-2">
            {q.options.map((opt) => {
              const state = picked === null ? 'idle' : opt === q.answer ? 'right' : opt === picked ? 'wrong' : 'idle'
              return (
                <button
                  key={opt}
                  type="button"
                  disabled={picked !== null}
                  onClick={() => {
                    setPicked(opt)
                    playResult(opt === q.answer)
                  }}
                  className={clsx('btn py-2 text-lg disabled:text-ink', state === 'right' && '!bg-sage', state === 'wrong' && '!bg-coral')}
                >
                  {opt}
                </button>
              )
            })}
          </div>
          {picked !== null && (
            <div className={clsx('mt-3 border-2 border-ink px-3 py-2 text-sm', picked === q.answer ? 'bg-sage/60' : 'bg-coral/60')}>
              <p className="font-bold">{picked === q.answer ? t('grammar.correct') : t('grammar.wrong', { answer: q.answer })}</p>
              {q.meaning && <p>{t('grammar.translation', { text: q.meaning })}</p>}
            </div>
          )}
          <div className="mt-4 flex justify-end">
            {picked === null ? (
              <button type="button" onClick={() => next(false)} className="text-sm text-ink-soft underline underline-offset-2">
                {t('grammar.skip')}
              </button>
            ) : (
              <button type="button" onClick={() => next(picked === q.answer)} className="btn btn-primary px-4 py-1.5 text-sm">
                {t('grammar.next')}
                <ArrowRight size={15} />
              </button>
            )}
          </div>
        </>
      ) : q.kind === 'write' ? (
        <>
          <p className="text-sm text-ink-soft">{t('grammar.q_write', { tokens: q.tokens.join(' … ') })}</p>
          <textarea
            value={written}
            onChange={(e) => setWritten(e.target.value)}
            rows={3}
            placeholder="……"
            aria-label={t('grammar.q_write', { tokens: q.tokens.join(' … ') })}
            className="field mt-2 resize-y text-lg"
          />
          {written.trim() && (
            <p className="mt-2 text-sm">
              {q.tokens.every((tk) => written.includes(tk))
                ? t('grammar.write_ok')
                : t('grammar.write_missing', { tokens: q.tokens.filter((tk) => !written.includes(tk)).join(', ') })}
            </p>
          )}
          <div className="mt-4 flex justify-end">
            <button
              type="button"
              disabled={!written.trim()}
              onClick={() => {
                const ok = q.tokens.every((tk) => written.includes(tk))
                playResult(ok)
                next(ok)
              }}
              className="btn btn-primary px-4 py-1.5 text-sm"
            >
              {t('grammar.finish')}
              <ArrowRight size={15} />
            </button>
          </div>
        </>
      ) : (
        <>
          <p className="text-sm text-ink-soft">{q.kind === 'zh2vi' ? t('grammar.q_zh2vi') : t('grammar.q_vi2zh')}</p>
          <p className={clsx('mt-2 font-semibold', q.kind === 'zh2vi' ? 'text-2xl' : 'text-lg')}>{q.prompt}</p>
          {!revealed ? (
            <div className="mt-4 flex justify-end">
              <button type="button" onClick={() => setRevealed(true)} className="btn px-4 py-1.5 text-sm">
                <Eye size={15} />
                {t('grammar.show_answer')}
              </button>
            </div>
          ) : (
            <>
              <div className="mt-3 border-2 border-ink bg-paper px-3 py-2">
                <p className="text-xs font-semibold text-ink-muted uppercase">{t('grammar.reference')}</p>
                <p className={clsx('font-semibold', q.kind === 'vi2zh' && 'text-xl text-brick')}>{q.answer}</p>
              </div>
              <p className="mt-3 text-sm text-ink-soft">{t('grammar.self_check')}</p>
              <div className="mt-2 flex justify-end gap-2">
                <button type="button" onClick={() => next(false)} className="btn bg-coral px-4 py-1.5 text-sm">
                  <X size={15} />
                  {t('grammar.self_wrong')}
                </button>
                <button type="button" onClick={() => next(true)} className="btn bg-sage px-4 py-1.5 text-sm">
                  <Check size={15} />
                  {t('grammar.self_right')}
                </button>
              </div>
            </>
          )}
        </>
      )}
    </div>
  )
}
