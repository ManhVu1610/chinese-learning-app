import clsx from 'clsx'
import { ArrowRight, Check, Headphones, Keyboard, Mic, Play, Snail, Square, Volume2 } from 'lucide-react'
import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { useTranslation } from 'react-i18next'
import PracticeSetup, { shuffle } from '../components/practice/PracticeSetup'
import { Feedback, SessionFrame, SessionSummary, WordAnswer } from '../components/practice/Session'
import { checkMeaning, hasMeaning, onlyHan } from '../components/practice/checks'
import { canRecord, useRecorder } from '../components/practice/useRecorder'
import { useSession } from '../components/practice/useSession'
import { useSpeech } from '../hooks/useSpeech'
import { comparePinyin, convertPinyinInput, stripTones } from '../lib/pinyinInput'
import { sfxEnabled, SFX_GAP_MS } from '../lib/sfx'
import type { Word } from '../types'

type Skill = 'listening' | 'speaking' | 'typing'
/** Dạng câu hỏi cụ thể trong từng kỹ năng. */
type Task =
  | 'listen_char'
  | 'listen_meaning'
  | 'listen_sentence'
  | 'dictation'
  | 'speak'
  | 'speak_sentence'
  | 'type_hanzi'
  | 'type_pinyin'
  | 'type_meaning'

const SKILLS: { key: Skill; icon: typeof Headphones; tasks: Task[] }[] = [
  { key: 'listening', icon: Headphones, tasks: ['listen_char', 'listen_meaning', 'listen_sentence', 'dictation'] },
  { key: 'speaking', icon: Mic, tasks: ['speak', 'speak_sentence'] },
  { key: 'typing', icon: Keyboard, tasks: ['type_hanzi', 'type_pinyin', 'type_meaning'] },
]
const SKILL_OF = Object.fromEntries(SKILLS.flatMap((s) => s.tasks.map((t) => [t, s.key]))) as Record<Task, Skill>
const ALL_TASKS = SKILLS.flatMap((x) => x.tasks)
const KEY = 'practice_mixed_tasks'
const OLD_KEY = 'practice_mixed_skills'
/** Nhãn của dạng bài, dùng lại nhãn của trang luyện riêng. */
const TASK_LABEL: Record<Task, string> = {
  listen_char: 'practice.listening_char',
  listen_meaning: 'practice.listening_meaning',
  listen_sentence: 'practice.listening_sentence',
  dictation: 'practice.listening_dictation',
  speak: 'practice.mixed_task_speak',
  speak_sentence: 'practice.mixed_task_speak_sentence',
  type_hanzi: 'practice.typing_hanzi',
  type_pinyin: 'practice.typing_pinyin',
  type_meaning: 'practice.typing_meaning',
}
/** Từ có làm được dạng bài này không (cần nghĩa, cần câu ví dụ…). */
const fits = (task: Task, w: Word) => {
  if (task === 'listen_meaning' || task === 'type_meaning' || task === 'type_hanzi') return hasMeaning(w)
  if (task === 'listen_sentence') return Boolean(w.example?.trim() && w.example_vi?.trim())
  if (task === 'speak_sentence') return Boolean(w.example?.trim())
  return true
}

function readTasks(): Task[] {
  try {
    const v = JSON.parse(localStorage.getItem(KEY) ?? 'null')
    if (Array.isArray(v) && v.length) return v.filter((x) => ALL_TASKS.includes(x))
    // Bản trước chỉ lưu kỹ năng: bật mọi dạng bài của các kỹ năng đó.
    const old = JSON.parse(localStorage.getItem(OLD_KEY) ?? 'null')
    if (Array.isArray(old) && old.length) return SKILLS.filter((x) => old.includes(x.key)).flatMap((x) => x.tasks)
  } catch {
    /* mặc định */
  }
  return ALL_TASKS
}

/** Luyện tập tổng hợp: mỗi câu là một dạng bài ngẫu nhiên của luyện nghe, luyện nói hoặc luyện gõ. */
export default function Mixed() {
  const { t } = useTranslation()
  const s = useSession()
  const { speak, supported } = useSpeech()
  const [enabled, setEnabled] = useState<Task[]>(readTasks)
  useEffect(() => localStorage.setItem(KEY, JSON.stringify(enabled)), [enabled])
  // Luôn giữ ít nhất một dạng bài.
  const setTasks = (fn: (l: Task[]) => Task[]) => setEnabled((l) => (fn(l).length ? fn(l) : l))
  const toggleTask = (tk: Task) => setTasks((l) => (l.includes(tk) ? l.filter((x) => x !== tk) : [...l, tk]))
  const toggleSkill = (k: Skill) => {
    const own = SKILLS.find((x) => x.key === k)!.tasks
    setTasks((l) => (own.some((x) => l.includes(x)) ? l.filter((x) => !own.includes(x)) : [...l, ...own]))
  }
  const skills = SKILLS.filter((x) => x.tasks.some((tk) => enabled.includes(tk))).map((x) => x.key)
  // Chỉ lấy từ làm được ít nhất một dạng bài đang bật (vd chỉ bật "nghe câu" thì từ phải có câu ví dụ).
  const filter = useCallback((w: Word) => enabled.some((tk) => fits(tk, w)), [enabled])

  // Giao dạng bài cho từng từ khi bắt đầu lượt mới; xoay vòng kỹ năng để các kỹ năng xuất hiện đều nhau.
  const tasks = useMemo(() => {
    // Mỗi vòng trộn lại thứ tự kỹ năng: đều nhau nhưng không lặp theo một nhịp cố định.
    const order: Skill[] = []
    while (order.length < s.words.length) order.push(...shuffle(skills))
    return s.words.map((w, i) => {
      for (let k = 0; k < skills.length; k++) {
        const skill = k === 0 ? order[i] : skills[(skills.indexOf(order[i]) + k) % skills.length]
        const pool = SKILLS.find((x) => x.key === skill)!.tasks.filter((tk) => enabled.includes(tk) && fits(tk, w))
        if (pool.length) return shuffle(pool)[0]
      }
      return enabled.find((tk) => fits(tk, w)) ?? 'type_pinyin'
    })
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [s.words])

  if (s.phase === 'setup')
    return (
      <PracticeSetup feature="mixed" title={t('practice.mixed')} intro={t('practice.mixed_intro')} filter={filter} onStart={s.begin}>
        <div>
          <span className="text-sm font-bold">{t('practice.mixed_skills')}</span>
          <div className="mt-1.5 grid gap-2 sm:grid-cols-3">
            {SKILLS.map(({ key, icon: Icon, tasks: own }) => {
              const count = own.filter((tk) => enabled.includes(tk)).length
              return (
                <div key={key} className={clsx('rounded-2xl border-2 p-2', count ? 'border-ink bg-sand/40' : 'border-line')}>
                  <label className="flex cursor-pointer items-center gap-2 px-1 text-sm font-bold">
                    <input
                      type="checkbox"
                      checked={count === own.length}
                      ref={(el) => {
                        if (el) el.indeterminate = count > 0 && count < own.length
                      }}
                      onChange={() => toggleSkill(key)}
                      className="h-4 w-4 accent-[var(--color-brick)]"
                    />
                    <Icon size={16} />
                    {t(`practice.${key}`)}
                  </label>
                  <div className="mt-2 flex flex-col gap-1">
                    {own.map((tk) => {
                      const on = enabled.includes(tk)
                      return (
                        <button
                          key={tk}
                          type="button"
                          aria-pressed={on}
                          onClick={() => toggleTask(tk)}
                          className={clsx(
                            'flex items-center gap-1.5 rounded-xl border-2 px-2 py-1 text-left text-xs font-semibold',
                            on ? 'border-ink bg-card' : 'border-transparent text-ink-soft hover:border-line',
                          )}
                        >
                          <span
                            className={clsx(
                              'flex h-4 w-4 shrink-0 items-center justify-center rounded-md border-2',
                              on ? 'border-ink bg-brick text-white' : 'border-line',
                            )}
                          >
                            {on && <Check size={10} strokeWidth={4} />}
                          </span>
                          {t(TASK_LABEL[tk])}
                        </button>
                      )
                    })}
                  </div>
                </div>
              )
            })}
          </div>
          <p className="mt-1.5 text-xs text-ink-soft">{t('practice.mixed_skills_hint')}</p>
        </div>
        {skills.includes('speaking') && !canRecord && (
          <p className="rounded-xl border-2 border-ink bg-apricot px-3 py-2 text-sm">{t('practice.no_recorder')}</p>
        )}
        {!supported && <p className="rounded-xl border-2 border-ink bg-apricot px-3 py-2 text-sm">{t('pinyin.no_speech')}</p>}
      </PracticeSetup>
    )

  if (s.phase === 'done' || !s.current)
    return (
      <SessionSummary
        title={t('practice.mixed')}
        score={s.score}
        total={s.words.length}
        wrong={s.wrong}
        onRetryWrong={s.retryWrong}
        onRestart={s.restart}
        onSetup={s.toSetup}
      />
    )

  const task = tasks[s.index] ?? 'type_pinyin'
  const skill = SKILL_OF[task]
  const SkillIcon = SKILLS.find((x) => x.key === skill)!.icon
  const title = `${t('practice.mixed')} · ${t(`practice.${skill}`)}`

  return (
    <SessionFrame title={title} index={s.index} total={s.words.length} score={s.score} onExit={s.toSetup}>
      <p className="mb-4 flex items-center justify-center gap-1.5 text-xs font-bold text-ink-muted uppercase">
        <SkillIcon size={14} />
        {t(`practice.mixed_task_${task}`)}
      </p>
      {/* key: mỗi câu dựng lại phần câu hỏi từ đầu (xoá ô nhập, lựa chọn, bản ghi cũ) */}
      {skill === 'listening' && <ListenQuestion key={s.index} w={s.current} task={task} s={s} speak={speak} supported={supported} />}
      {skill === 'speaking' && (
        <SpeakQuestion key={s.index} w={s.current} sentence={task === 'speak_sentence'} s={s} speak={speak} supported={supported} />
      )}
      {skill === 'typing' && <TypeQuestion key={s.index} w={s.current} task={task} s={s} speak={speak} supported={supported} />}
    </SessionFrame>
  )
}

type SessionApi = ReturnType<typeof useSession>
interface QProps {
  w: Word
  s: SessionApi
  speak: (text: string, lang?: string, rate?: number) => void
  supported: boolean
}

function NextButton({ s }: { s: SessionApi }) {
  const { t } = useTranslation()
  return (
    <button type="button" onClick={s.next} className="btn btn-primary px-5 py-2 text-sm">
      {t('practice.next')}
      <ArrowRight size={15} />
    </button>
  )
}

/** Ô nhập pinyin dùng chung (bộ gõ số thanh: ba1 → bā). */
function PinyinHint() {
  const { t } = useTranslation()
  return (
    <p className="mt-2 flex items-start gap-1.5 text-xs text-ink-soft">
      <Keyboard size={14} className="mt-0.5 shrink-0" />
      {t('practice.pinyin_ime_hint')}
    </p>
  )
}

/** Nghe chọn chữ / nghe chọn nghĩa / nghe gõ pinyin. */
function ListenQuestion({ w, task, s, speak, supported }: QProps & { task: Task }) {
  const { t } = useTranslation()
  const [picked, setPicked] = useState<number | null>(null)
  const [input, setInput] = useState('')
  const [hint, setHint] = useState('')
  const answered = s.result !== null
  const sentence = task === 'listen_sentence'
  const play = (rate = 0.8) => supported && speak(sentence ? w.example! : w.hanzi, 'zh-CN', rate)
  const text = (x: Word) => (task === 'listen_char' ? x.hanzi : sentence ? (x.example_vi ?? '') : x.meaning_vi)

  const options = useMemo(() => {
    if (task === 'dictation') return []
    const seen = new Set([text(w)])
    const others: Word[] = []
    for (const o of shuffle(s.pool.length > 3 ? s.pool : s.words)) {
      const v = text(o)
      if (!v || seen.has(v)) continue
      seen.add(v)
      others.push(o)
      if (others.length === 3) break
    }
    return shuffle([w, ...others])
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  useEffect(() => {
    const id = setTimeout(() => play(), 250)
    return () => clearTimeout(id)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  const choose = (i: number) => {
    if (answered) return
    setPicked(i)
    s.answer(options[i].id === w.id)
  }
  const check = () => {
    if (!input.trim() || answered) return
    const ok = comparePinyin(input) === comparePinyin(w.pinyin)
    if (!ok && stripTones(input) === stripTones(w.pinyin)) setHint(t('practice.tone_wrong'))
    s.answer(ok)
  }

  return (
    <>
      <div className="flex flex-col items-center gap-3">
        <button type="button" onClick={() => play()} aria-label={t('practice.play')} className="btn btn-primary h-20 w-20 rounded-full p-0">
          <Volume2 size={34} />
        </button>
        <button type="button" onClick={() => play(0.5)} className="btn px-3 py-1 text-xs">
          <Snail size={14} />
          {t('practice.slow')}
        </button>
      </div>

      {task === 'dictation' ? (
        <>
          <input
            autoFocus
            value={input}
            onChange={(e) => setInput(convertPinyinInput(e.target.value))}
            onKeyDown={(e) => {
              if (e.key !== 'Enter') return
              e.preventDefault()
              if (answered) s.next()
              else check()
            }}
            readOnly={answered}
            autoComplete="off"
            autoCapitalize="off"
            spellCheck={false}
            placeholder={t('practice.ph_pinyin')}
            aria-label={t('practice.type_pinyin')}
            className="field mt-5 text-center text-2xl"
          />
          <PinyinHint />
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
                  task === 'listen_char' ? 'text-3xl' : 'text-base',
                  state === 'right' && '!bg-sage',
                  state === 'wrong' && '!bg-coral',
                )}
              >
                <span className="tag shrink-0 px-1.5 text-[10px]">{i + 1}</span>
                <span className="min-w-0">{text(o)}</span>
              </button>
            )
          })}
        </div>
      )}

      {answered ? (
        <>
          <Feedback ok={s.result!}>
            {hint && <p className="font-semibold">{hint}</p>}
            {sentence ? (
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
            <NextButton s={s} />
          </div>
        </>
      ) : (
        task === 'dictation' && (
          <div className="mt-4 flex justify-end gap-2">
            <button type="button" onClick={() => s.answer(false)} className="btn px-4 py-2 text-sm">
              {t('practice.show_answer')}
            </button>
            <button type="button" onClick={check} disabled={!input.trim()} className="btn btn-accent px-5 py-2 text-sm">
              <Check size={15} />
              {t('practice.check')}
            </button>
          </div>
        )
      )}
    </>
  )
}

/** Nghe mẫu → ghi âm đọc theo → nghe lại → tự đánh giá. */
function SpeakQuestion({ w, sentence, s, speak, supported }: QProps & { sentence: boolean }) {
  const { t } = useTranslation()
  const rec = useRecorder()
  const audioRef = useRef<HTMLAudioElement>(null)
  const text = sentence ? w.example! : w.hanzi
  const pinyin = sentence ? w.example_pinyin : w.pinyin
  const meaning = sentence ? w.example_vi : w.meaning_vi
  const play = (rate = 0.8) => supported && speak(text, 'zh-CN', rate)

  useEffect(() => {
    const id = setTimeout(() => play(), 300)
    return () => clearTimeout(id)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  const grade = (ok: boolean) => {
    rec.stop()
    s.answer(ok)
    s.next()
  }

  return (
    <>
      <div className="text-center">
        <p className={clsx('font-bold text-brick', sentence ? 'text-3xl leading-snug' : 'text-7xl')}>{text}</p>
        {pinyin && <p className="mt-2 text-lg italic">{pinyin}</p>}
        {meaning && <p className="mt-1 text-ink-soft">{meaning}</p>}
      </div>
      <div className="mt-6 flex flex-wrap justify-center gap-2">
        <button type="button" onClick={() => play()} disabled={!supported} className="btn px-3 py-1.5 text-sm">
          <Volume2 size={15} />
          {t('practice.listen_sample')}
        </button>
        <button type="button" onClick={() => play(0.5)} disabled={!supported} className="btn px-3 py-1.5 text-sm">
          <Snail size={15} />
          {t('practice.slow')}
        </button>
        {rec.recording ? (
          <button type="button" onClick={rec.stop} className="btn bg-coral px-3 py-1.5 text-sm">
            <Square size={15} />
            {t('practice.stop')}
          </button>
        ) : (
          <button type="button" onClick={rec.start} disabled={!canRecord} className="btn btn-accent px-3 py-1.5 text-sm">
            <Mic size={15} />
            {rec.url ? t('practice.record_again') : t('practice.record')}
          </button>
        )}
        {rec.url && (
          <button type="button" onClick={() => audioRef.current?.play()} className="btn px-3 py-1.5 text-sm">
            <Play size={15} />
            {t('practice.play_mine')}
          </button>
        )}
      </div>
      {rec.recording && <p className="mt-2 animate-pulse text-center text-xs font-bold text-brick">● {t('practice.recording')}</p>}
      {rec.error && <p className="mt-2 text-center text-xs text-brick">{t(`practice.mic_${rec.error}`)}</p>}
      {rec.url && <audio ref={audioRef} src={rec.url} className="hidden" />}

      <p className="mt-6 text-center text-sm font-bold">{t('practice.self_grade')}</p>
      <div className="mt-2 grid grid-cols-3 gap-2">
        <button type="button" onClick={() => grade(false)} className="btn flex-col gap-0.5 bg-coral py-2 text-sm">
          <span className="text-xl">😕</span>
          {t('practice.grade_again')}
        </button>
        <button type="button" onClick={() => grade(true)} className="btn flex-col gap-0.5 bg-sand py-2 text-sm">
          <span className="text-xl">🙂</span>
          {t('practice.grade_ok')}
        </button>
        <button type="button" onClick={() => grade(true)} className="btn flex-col gap-0.5 bg-sage py-2 text-sm">
          <span className="text-xl">😄</span>
          {t('practice.grade_good')}
        </button>
      </div>
      <p className="mt-3 text-center text-xs text-ink-muted">{t('practice.recording_private')}</p>
    </>
  )
}

/** Gõ chữ Hán (nhìn nghĩa), gõ pinyin (nhìn chữ), gõ nghĩa (nhìn chữ). */
function TypeQuestion({ w, task, s, speak, supported }: QProps & { task: Task }) {
  const { t } = useTranslation()
  const [input, setInput] = useState('')
  const [hint, setHint] = useState('')
  const answered = s.result !== null
  const mode = task === 'type_hanzi' ? 'hanzi' : task === 'type_pinyin' ? 'pinyin' : 'meaning'

  const check = () => {
    if (!input.trim()) return
    let ok = false
    if (mode === 'hanzi') ok = onlyHan(input) === onlyHan(w.hanzi)
    else if (mode === 'pinyin') {
      ok = comparePinyin(input) === comparePinyin(w.pinyin)
      if (!ok && stripTones(input) === stripTones(w.pinyin)) setHint(t('practice.tone_wrong'))
    } else ok = checkMeaning(input, w.meaning_vi)
    s.answer(ok)
    // Đợi âm báo đúng/sai phát xong rồi mới đọc từ.
    if (supported) setTimeout(() => speak(w.hanzi), sfxEnabled() ? SFX_GAP_MS : 0)
  }

  return (
    <>
      <div className="text-center">
        {mode === 'hanzi' ? (
          <>
            <p className="text-sm font-bold text-ink-muted uppercase">{t('practice.meaning')}</p>
            <p className="mt-1 text-2xl font-extrabold">{w.meaning_vi || w.meaning_en}</p>
            {w.pinyin && <p className="mt-2 text-xl text-brick italic">{w.pinyin}</p>}
          </>
        ) : (
          <>
            <p className="text-7xl font-bold text-brick">{w.hanzi}</p>
            {supported && (
              <button type="button" onClick={() => speak(w.hanzi)} aria-label={t('vocab.speak')} className="btn mt-3 p-2">
                <Volume2 size={18} />
              </button>
            )}
          </>
        )}
      </div>

      <label className="mt-6 block">
        <span className="text-sm font-bold">{t(`practice.type_${mode}`)}</span>
        <input
          autoFocus
          value={input}
          onChange={(e) => setInput(mode === 'pinyin' ? convertPinyinInput(e.target.value) : e.target.value)}
          onKeyDown={(e) => {
            if (e.key !== 'Enter' || e.nativeEvent.isComposing) return
            e.preventDefault()
            if (answered) s.next()
            else check()
          }}
          readOnly={answered}
          lang={mode === 'hanzi' ? 'zh-CN' : mode === 'meaning' ? 'vi' : undefined}
          autoComplete="off"
          autoCapitalize="off"
          spellCheck={false}
          placeholder={t(`practice.ph_${mode}`)}
          className="field mt-1.5 text-center text-2xl"
        />
      </label>
      {mode === 'pinyin' && <PinyinHint />}

      {answered ? (
        <>
          <Feedback ok={s.result!}>
            {hint && <p className="font-semibold">{hint}</p>}
            <WordAnswer w={w} />
          </Feedback>
          <div className="mt-4 flex flex-wrap justify-end gap-2">
            {!s.result && mode === 'meaning' && (
              <button type="button" onClick={s.override} className="btn px-4 py-2 text-sm">
                <Check size={15} />
                {t('practice.count_correct')}
              </button>
            )}
            <NextButton s={s} />
          </div>
        </>
      ) : (
        <div className="mt-4 flex flex-wrap justify-end gap-2">
          <button type="button" onClick={() => s.answer(false)} className="btn px-4 py-2 text-sm">
            {t('practice.show_answer')}
          </button>
          <button type="button" onClick={check} disabled={!input.trim()} className="btn btn-accent px-5 py-2 text-sm">
            <Check size={15} />
            {t('practice.check')}
          </button>
        </div>
      )}
    </>
  )
}
