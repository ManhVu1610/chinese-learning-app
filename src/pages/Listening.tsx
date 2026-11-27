import clsx from 'clsx'
import { ArrowRight, Check, Keyboard, Snail, Volume2 } from 'lucide-react'
import { useEffect, useMemo, useRef, useState } from 'react'
import { useTranslation } from 'react-i18next'
import PracticeSetup, { Choice, shuffle } from '../components/practice/PracticeSetup'
import { Feedback, SessionFrame, SessionSummary, WordAnswer } from '../components/practice/Session'
import { useSession } from '../components/practice/useSession'
import { useSpeech } from '../hooks/useSpeech'
import { comparePinyin, convertPinyinInput, stripTones } from '../lib/pinyinInput'
import type { Word } from '../types'

type Mode = 'char' | 'meaning' | 'sentence' | 'dictation'
const MODE_KEY = 'practice_listening_mode'

const hasSentence = (w: Word) => Boolean(w.example?.trim() && w.example_vi?.trim())

/** Nội dung đáp án hiển thị theo từng dạng bài. */
const optionText = (w: Word, mode: Mode) => (mode === 'char' ? w.hanzi : mode === 'meaning' ? w.meaning_vi : (w.example_vi ?? ''))

/** Luyện nghe: nghe chọn chữ, nghe chọn nghĩa, nghe câu ví dụ chọn nghĩa, nghe gõ pinyin. */
export default function Listening() {
  const { t } = useTranslation()
  const s = useSession()
  const { speak, supported } = useSpeech()
  const [mode, setMode] = useState<Mode>(() => (localStorage.getItem(MODE_KEY) as Mode) || 'char')
  const [picked, setPicked] = useState<number | null>(null)
  const [input, setInput] = useState('')
  const [hint, setHint] = useState('')
  const inputRef = useRef<HTMLInputElement>(null)
  useEffect(() => localStorage.setItem(MODE_KEY, mode), [mode])

  const w = s.current
  const audio = w ? (mode === 'sentence' ? w.example! : w.hanzi) : ''
  const play = (rate = 0.8) => supported && audio && speak(audio, 'zh-CN', rate)

  // 4 lựa chọn: đáp án đúng + 3 từ khác trong cùng nguồn (không trùng nội dung).
  const options = useMemo(() => {
    if (!w || mode === 'dictation') return []
    const right = optionText(w, mode)
    const seen = new Set([right])
    const others: Word[] = []
    for (const o of shuffle(s.pool.length > 3 ? s.pool : s.words)) {
      const text = optionText(o, mode)
      if (!text || seen.has(text)) continue
      seen.add(text)
      others.push(o)
      if (others.length === 3) break
    }
    return shuffle([w, ...others])
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [w, mode])

  // Mỗi câu mới: tự phát âm, xoá lựa chọn cũ.
  useEffect(() => {
    if (s.phase !== 'run') return
    setPicked(null)
    setInput('')
    setHint('')
    const id = setTimeout(() => play(), 250)
    inputRef.current?.focus()
    return () => clearTimeout(id)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [s.index, s.phase, s.words])

  const choose = (i: number) => {
    if (s.result !== null || !w) return
    setPicked(i)
    s.answer(options[i].id === w.id)
  }

  // Phím tắt: 1–4 chọn đáp án, Enter sang câu, Space nghe lại.
  useEffect(() => {
    if (s.phase !== 'run' || mode === 'dictation') return
    const onKey = (e: KeyboardEvent) => {
      if (e.target instanceof HTMLInputElement || e.target instanceof HTMLTextAreaElement) return
      const n = Number(e.key)
      if (n >= 1 && n <= options.length) choose(n - 1)
      else if (e.key === 'Enter' && s.result !== null) s.next()
      else if (e.key === ' ') {
        e.preventDefault()
        play()
      }
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  })

  const title = `${t('practice.listening')} · ${t(`practice.listening_${mode}`)}`

  if (s.phase === 'setup')
    return (
      <PracticeSetup feature="listening"
        title={t('practice.listening')}
        intro={t('practice.listening_intro')}
        filter={mode === 'sentence' ? hasSentence : undefined}
        onStart={s.begin}
      >
        <Choice
          label={t('practice.mode')}
          value={mode}
          onChange={setMode}
          options={(['char', 'meaning', 'sentence', 'dictation'] as Mode[]).map((m) => ({ value: m, label: t(`practice.listening_${m}`) }))}
        />
        <p className="text-sm text-ink-soft">{t(`practice.listening_${mode}_desc`)}</p>
        {!supported && <p className="rounded-xl border-2 border-ink bg-apricot px-3 py-2 text-sm">{t('pinyin.no_speech')}</p>}
      </PracticeSetup>
    )

  if (s.phase === 'done' || !w)
    return (
      <SessionSummary title={title} score={s.score} total={s.words.length} wrong={s.wrong} onRetryWrong={s.retryWrong} onRestart={s.restart} onSetup={s.toSetup} />
    )

  const answered = s.result !== null
  const checkDictation = () => {
    if (!input.trim() || answered) return
    const ok = comparePinyin(input) === comparePinyin(w.pinyin)
    if (!ok && stripTones(input) === stripTones(w.pinyin)) setHint(t('practice.tone_wrong'))
    s.answer(ok)
  }

  return (
    <SessionFrame title={title} index={s.index} total={s.words.length} score={s.score} onExit={s.toSetup}>
      <div className="flex flex-col items-center gap-3">
        <button type="button" onClick={() => play()} aria-label={t('practice.play')} className="btn btn-primary h-20 w-20 rounded-full p-0">
          <Volume2 size={34} />
        </button>
        <div className="flex gap-2">
          <button type="button" onClick={() => play()} className="btn px-3 py-1 text-xs">
            <Volume2 size={14} />
            {t('practice.replay')}
          </button>
          <button type="button" onClick={() => play(0.5)} className="btn px-3 py-1 text-xs">
            <Snail size={14} />
            {t('practice.slow')}
          </button>
        </div>
        <p className="text-sm text-ink-soft">{t(`practice.listening_${mode}_q`)}</p>
      </div>

      {mode === 'dictation' ? (
        <>
          <input
            ref={inputRef}
            value={input}
            onChange={(e) => setInput(convertPinyinInput(e.target.value))}
            onKeyDown={(e) => {
              if (e.key !== 'Enter') return
              e.preventDefault()
              if (answered) s.next()
              else checkDictation()
            }}
            readOnly={answered}
            autoComplete="off"
            autoCapitalize="off"
            spellCheck={false}
            placeholder={t('practice.ph_pinyin')}
            aria-label={t('practice.type_pinyin')}
            className="field mt-5 text-center text-2xl"
          />
          <p className="mt-2 flex items-start gap-1.5 text-xs text-ink-soft">
            <Keyboard size={14} className="mt-0.5 shrink-0" />
            {t('practice.pinyin_ime_hint')}
          </p>
        </>
      ) : (
        <div className="mt-5 grid gap-2 sm:grid-cols-2">
          {options.map((o, i) => {
            const right = o.id === w.id
            const state = !answered ? 'idle' : right ? 'right' : picked === i ? 'wrong' : 'idle'
            return (
              <button
                key={o.id}
                type="button"
                onClick={() => choose(i)}
                disabled={answered}
                className={clsx(
                  'btn justify-start rounded-2xl px-4 py-3 text-left whitespace-normal disabled:text-ink',
                  mode === 'char' ? 'text-3xl' : 'text-base',
                  state === 'right' && '!bg-sage',
                  state === 'wrong' && '!bg-coral',
                )}
              >
                <span className="tag shrink-0 px-1.5 text-[10px]">{i + 1}</span>
                <span className="min-w-0">{optionText(o, mode)}</span>
              </button>
            )
          })}
        </div>
      )}

      {answered && (
        <>
          <Feedback ok={s.result!}>
            {hint && <p className="font-semibold">{hint}</p>}
            {mode === 'sentence' ? (
              <p>
                <span className="text-lg font-bold">{w.example}</span>
                {w.example_pinyin && <span className="block italic">{w.example_pinyin}</span>}
                <span className="block">{w.example_vi}</span>
              </p>
            ) : (
              <WordAnswer w={w} />
            )}
          </Feedback>
          <div className="mt-4 flex justify-end">
            <button type="button" onClick={s.next} className="btn btn-primary px-5 py-2 text-sm">
              {t('practice.next')}
              <ArrowRight size={15} />
            </button>
          </div>
        </>
      )}
      {!answered && mode === 'dictation' && (
        <div className="mt-4 flex justify-end gap-2">
          <button type="button" onClick={() => s.answer(false)} className="btn px-4 py-2 text-sm">
            {t('practice.show_answer')}
          </button>
          <button type="button" onClick={checkDictation} disabled={!input.trim()} className="btn btn-accent px-5 py-2 text-sm">
            <Check size={15} />
            {t('practice.check')}
          </button>
        </div>
      )}
    </SessionFrame>
  )
}
