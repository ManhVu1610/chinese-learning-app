import clsx from 'clsx'
import { ChevronLeft, ChevronRight, Clock, Flag, Headphones, LogOut, Pause, Play, RotateCcw, RotateCw, Send, Volume2 } from 'lucide-react'
import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { ConfirmDialog } from '../components/notebook/Dialogs'
import { useListenAudio, type ListenAudio } from './audio'
import QuestionView from './QuestionView'
import { isAnswered, sectionsOf } from './scoring'
import { saveSession } from './storage'
import { answerWindow, type Answer, type ExamPaper, type ExamSession, type SectionKey } from './types'

export const SECTION_ZH: Record<SectionKey, string> = { listening: '听力', reading: '阅读', writing: '书写' }

export const fmtClock = (sec: number) => {
  const s = Math.max(0, Math.round(sec))
  const h = Math.floor(s / 3600)
  const m = Math.floor((s % 3600) / 60)
  const ss = String(s % 60).padStart(2, '0')
  return h ? `${h}:${String(m).padStart(2, '0')}:${ss}` : `${m}:${ss}`
}

export const sectionSeconds = (paper: Pick<ExamPaper, 'minutes'>, s: SectionKey) => paper.minutes[s] * 60

/**
 * Giao diện thi trên máy:
 *  - Thanh trên: mã đề, kỹ năng đang làm (听力 / 阅读 / 书写), đồng hồ, nút nộp bài.
 *  - Giữa: câu hỏi cắt từ đề gốc và ô trả lời; bên phải: bảng số câu.
 *  - Thi thật: phần Nghe phát tệp ghi âm của cả đề một lượt (không dừng, không tua), nghe xong có 3–5 phút
 *    điền đáp án rồi tự sang phần sau; Đọc, Viết tính giờ riêng; đã qua phần nào thì không quay lại.
 *  - Luyện tập: đi lại tự do, tạm dừng và tua tệp nghe, đồng hồ đếm lên.
 */
export default function ExamRunner({
  paper,
  initial,
  onSubmit,
  onExit,
}: {
  paper: ExamPaper
  initial: ExamSession
  onSubmit: (s: ExamSession) => void
  onExit: () => void
}) {
  const { t } = useTranslation()
  const [s, setS] = useState(initial)
  const strict = s.mode === 'strict'
  const sections = useMemo(() => sectionsOf(s.scope, paper), [s.scope, paper])
  const secKey = sections[s.sectionIdx]
  const secQs = useMemo(() => paper.questions.filter((q) => q.section === secKey), [paper, secKey])
  const allQs = useMemo(() => paper.questions.filter((q) => sections.includes(q.section)), [paper, sections])
  const q = paper.questions.find((x) => x.n === s.current) ?? secQs[0]
  const [confirm, setConfirm] = useState<'section' | 'submit' | null>(null)
  const [navOpen, setNavOpen] = useState(false)
  // Thi thật, phần nghe: cần một lần bấm để trình duyệt cho phát âm thanh (cả khi tải lại trang giữa chừng).
  const [armed, setArmed] = useState(false)
  const [blocked, setBlocked] = useState(false)
  const hasListening = sections.includes('listening')
  const audio = useListenAudio(hasListening ? paper.audio : null, strict ? (initial.audioPos ?? 0) : 0)

  const update = useCallback((patch: Partial<ExamSession> | ((p: ExamSession) => Partial<ExamSession>)) => {
    setS((prev) => ({ ...prev, ...(typeof patch === 'function' ? patch(prev) : patch) }))
  }, [])

  useEffect(() => saveSession(s), [s])

  // Trạng thái mới nhất cho các hàm gọi từ hẹn giờ.
  const sRef = useRef(s)
  sRef.current = s
  const finishing = useRef(false)

  const pauseAudio = audio.pause
  const finishSection = useCallback(() => {
    pauseAudio()
    setArmed(false)
    setConfirm(null)
    const prev = sRef.current
    const nextIdx = prev.sectionIdx + 1
    if (nextIdx >= sections.length) {
      if (!finishing.current) {
        finishing.current = true
        onSubmit(prev)
      }
      return
    }
    const nextKey = sections[nextIdx]
    const first = paper.questions.find((x) => x.section === nextKey)?.n ?? prev.current
    const next: ExamSession = {
      ...prev,
      sectionIdx: nextIdx,
      current: first,
      started: !strict,
      clock: strict ? sectionSeconds(paper, nextKey) : prev.clock,
    }
    sRef.current = next
    setS(next)
  }, [sections, paper, strict, onSubmit, pauseAudio])

  // ---- Thi thật, phần Nghe ----
  const listenStrict = strict && secKey === 'listening'
  const noAudio = !paper.audio || audio.failed
  // Đang phát băng: đồng hồ là thời gian còn lại của băng; nghe xong (hoặc không có băng) thì đếm ngược thời gian điền đáp án.
  const tapeRunning = listenStrict && s.started && armed && !s.audioDone && !noAudio

  useEffect(() => {
    if (!tapeRunning) return
    audio.play().then((ok) => setBlocked(!ok))
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [tapeRunning])
  // Lưu vị trí băng để tải lại trang thì nghe tiếp từ đó.
  const timeRef = useRef(audio.time)
  timeRef.current = audio.time
  useEffect(() => {
    if (!tapeRunning) return
    const id = setInterval(() => update({ audioPos: Math.floor(timeRef.current) }), 3000)
    return () => clearInterval(id)
  }, [tapeRunning, update])
  useEffect(() => {
    if (listenStrict && audio.ended && !s.audioDone) update({ audioDone: true, clock: answerWindow(paper.level) })
  }, [listenStrict, audio.ended, s.audioDone, paper.level, update])
  useEffect(() => {
    // Không phát được băng: dùng thời gian chuẩn của phần Nghe.
    if (listenStrict && s.started && noAudio && !s.audioDone) update({ audioDone: true, clock: sectionSeconds(paper, 'listening') })
  }, [listenStrict, s.started, noAudio, s.audioDone, paper, update])

  // Luyện tập: rời phần Nghe thì dừng băng.
  useEffect(() => {
    if (!strict && secKey !== 'listening') pauseAudio()
  }, [strict, secKey, pauseAudio])

  // Đồng hồ: thi thật đếm ngược, luyện tập đếm lên.
  const timed = strict ? s.started && (secKey !== 'listening' || !!s.audioDone) : true
  useEffect(() => {
    if (!timed) return
    const id = setInterval(() => update((p) => ({ clock: strict ? p.clock - 1 : p.clock + 1 })), 1000)
    return () => clearInterval(id)
  }, [timed, strict, update])
  useEffect(() => {
    if (strict && timed && s.clock <= 0) finishSection()
  }, [strict, timed, s.clock, finishSection])

  const go = (n: number) => {
    const target = paper.questions.find((x) => x.n === n)
    if (!target) return
    // Luyện tập: bấm sang câu ở kỹ năng khác thì đổi luôn phần đang làm.
    const idx = sections.indexOf(target.section)
    update({ current: n, ...(strict ? {} : { sectionIdx: idx }) })
    setNavOpen(false)
  }
  const list = strict ? secQs : allQs
  const pos = list.findIndex((x) => x.n === q.n)
  const prev = list[pos - 1]
  const next = list[pos + 1]

  const setAnswer = (a: Answer | undefined) =>
    update((p) => {
      const answers = { ...p.answers }
      if (a === undefined) delete answers[q.n]
      else answers[q.n] = a
      return { answers }
    })
  const toggleFlag = () => update((p) => ({ flags: p.flags.includes(q.n) ? p.flags.filter((x) => x !== q.n) : [...p.flags, q.n] }))

  const unanswered = (strict ? secQs : allQs).filter((x) => !isAnswered(s.answers[x.n])).length
  const lastSection = s.sectionIdx === sections.length - 1

  // ---- Màn giới thiệu phần (thi thật) ----
  if (strict && (!s.started || (secKey === 'listening' && !armed && !s.audioDone))) {
    const resume = s.started
    const minutes = secKey === 'listening' ? Math.round((audio.duration || sectionSeconds(paper, 'listening')) / 60) : paper.minutes[secKey]
    return (
      <section className="mx-auto max-w-2xl px-4 py-10">
        <div className="box p-6 text-center md:p-8">
          <p className="text-sm font-bold text-ink-soft">
            HSK {paper.level} · {paper.code} · {t('exam.section_n', { n: s.sectionIdx + 1, total: sections.length })}
          </p>
          <h1 className="mt-2 text-4xl font-extrabold" lang="zh-CN">
            {SECTION_ZH[secKey]}
          </h1>
          <p className="mt-1 text-lg font-bold">{t(`exam.section.${secKey}`)}</p>
          <p className="mt-4 text-ink-soft">{t('exam.section_info', { count: secQs.length, minutes })}</p>
          <p className="mt-2 text-sm text-ink-soft">{t(`exam.rules.${secKey}`, { minutes: answerWindow(paper.level) / 60 })}</p>
          {secKey === 'listening' && !paper.audio && <p className="mt-2 text-sm font-semibold text-brick">{t('exam.no_audio')}</p>}
          <div className="mt-6 flex flex-wrap justify-center gap-3">
            <button
              type="button"
              onClick={() => {
                setArmed(true)
                if (!s.started) update({ started: true, clock: sectionSeconds(paper, secKey) })
              }}
              className="btn btn-accent px-6"
            >
              {secKey === 'listening' ? <Headphones size={18} /> : <Play size={18} />}
              {resume ? t('exam.resume_section') : t('exam.start_section')}
            </button>
            <button type="button" onClick={onExit} className="btn">
              <LogOut size={16} />
              {t('exam.exit')}
            </button>
          </div>
        </div>
      </section>
    )
  }

  const clockLow = strict && timed && s.clock < 300
  const clockText = tapeRunning ? `${fmtClock(Math.max(0, audio.duration - audio.time))}` : fmtClock(s.clock)

  return (
    <section className="mx-auto max-w-6xl px-3 py-4 md:px-4">
      {/* Thanh trên */}
      <header className="box sticky top-2 z-20 flex flex-wrap items-center gap-x-4 gap-y-2 px-4 py-2.5">
        <div className="w-full min-w-0 sm:w-auto sm:flex-1">
          <p className="truncate text-xs font-bold text-ink-soft">
            HSK {paper.level} · {paper.code} · {t(`exam.mode.${s.mode}`)}
          </p>
          <div className="flex flex-wrap gap-1.5 pt-0.5">
            {sections.map((k, i) => (
              <button
                key={k}
                type="button"
                disabled={strict}
                onClick={() => go(paper.questions.find((x) => x.section === k)!.n)}
                className={clsx(
                  'rounded-full border-2 px-3 py-0.5 text-sm font-bold whitespace-nowrap',
                  k === secKey ? 'border-ink bg-sand' : 'border-line',
                  strict && i < s.sectionIdx && 'text-ink-muted line-through',
                  strict && 'cursor-default',
                )}
              >
                <span lang="zh-CN">{SECTION_ZH[k]}</span> {t(`exam.section.${k}`)}
              </button>
            ))}
          </div>
        </div>
        <div
          className={clsx(
            'mr-auto flex items-center gap-1.5 rounded-full border-2 border-ink px-3 py-1 text-lg font-extrabold whitespace-nowrap tabular-nums sm:mr-0',
            clockLow ? 'bg-coral' : tapeRunning ? 'bg-lilac' : 'bg-card',
          )}
          title={tapeRunning ? t('exam.tape_left') : strict ? t('exam.time_left') : t('exam.time_used')}
        >
          {tapeRunning ? <Volume2 size={16} /> : <Clock size={16} />}
          {clockText}
        </div>
        {strict && !lastSection ? (
          <button type="button" onClick={() => setConfirm('section')} disabled={tapeRunning} className="btn btn-primary px-4 py-1.5 text-sm">
            <ChevronRight size={15} />
            {t('exam.next_section')}
          </button>
        ) : (
          <button type="button" onClick={() => setConfirm('submit')} disabled={tapeRunning} className="btn btn-accent px-4 py-1.5 text-sm">
            <Send size={15} />
            {t('exam.submit')}
          </button>
        )}
        <button type="button" onClick={onExit} className="btn p-2" title={t('exam.exit_hint')} aria-label={t('exam.exit')}>
          <LogOut size={15} />
        </button>
      </header>

      {secKey === 'listening' && (
        <ListenBar
          strict={strict}
          audio={audio}
          hasAudio={!!paper.audio}
          done={!!s.audioDone}
          blocked={blocked}
          onRetry={() => audio.play().then((ok) => setBlocked(!ok))}
        />
      )}

      <div className="mt-4 grid gap-4 lg:grid-cols-[1fr_17rem]">
        {/* Câu hỏi */}
        <div className="box min-w-0 p-4 md:p-6">
          <div className="mb-3 flex items-center gap-3">
            <span className="sticker bg-sky px-3 py-1 text-lg font-extrabold tabular-nums">{q.n}</span>
            <span className="text-sm font-bold text-ink-soft">{t(`exam.kind.${q.kind}`)}</span>
            <span className="flex-1" />
            <button type="button" onClick={toggleFlag} className={clsx('btn px-3 py-1.5 text-xs', s.flags.includes(q.n) && 'bg-sand')}>
              <Flag size={13} />
              <span className="hidden sm:inline">{s.flags.includes(q.n) ? t('exam.flagged') : t('exam.flag')}</span>
            </button>
          </div>

          <QuestionView key={q.n} paper={paper} q={q} answer={s.answers[q.n]} onAnswer={setAnswer} showTranscript={!strict} />

          <div className="mt-6 flex items-center justify-between gap-2 border-t-2 border-line pt-4">
            <button type="button" disabled={!prev} onClick={() => prev && go(prev.n)} className="btn px-4 py-2 text-sm">
              <ChevronLeft size={16} />
              <span className="hidden sm:inline">{t('exam.prev')}</span>
            </button>
            <button type="button" onClick={() => setNavOpen((v) => !v)} className="btn px-3 py-2 text-sm lg:hidden">
              {t('exam.answer_sheet')}
            </button>
            {next ? (
              <button type="button" onClick={() => go(next.n)} className="btn btn-primary px-4 py-2 text-sm">
                {t('exam.next')}
                <ChevronRight size={16} />
              </button>
            ) : (
              <button
                type="button"
                disabled={tapeRunning}
                onClick={() => setConfirm(strict && !lastSection ? 'section' : 'submit')}
                className="btn btn-accent px-4 py-2 text-sm"
              >
                {strict && !lastSection ? t('exam.next_section') : t('exam.submit')}
                <ChevronRight size={16} />
              </button>
            )}
          </div>
        </div>

        {/* Bảng câu hỏi */}
        <aside className={clsx('box h-fit p-4 lg:sticky lg:top-24 lg:block', navOpen ? 'block' : 'hidden')}>
          <p className="text-sm font-extrabold">{t('exam.answer_sheet')}</p>
          <p className="mt-0.5 text-xs text-ink-soft">{t('exam.unanswered_count', { count: unanswered })}</p>
          <div className="mt-3 max-h-[60vh] space-y-3 overflow-y-auto pr-1">
            {(strict ? [secKey] : sections).map((k) => (
              <div key={k}>
                {!strict && (
                  <p className="mb-1 text-xs font-bold text-ink-soft">
                    <span lang="zh-CN">{SECTION_ZH[k]}</span> · {t(`exam.section.${k}`)}
                  </p>
                )}
                <div className="grid grid-cols-6 gap-1.5">
                  {paper.questions
                    .filter((x) => x.section === k)
                    .map((x) => (
                      <button
                        key={x.n}
                        type="button"
                        onClick={() => go(x.n)}
                        aria-current={x.n === q.n}
                        className={clsx(
                          'relative h-8 rounded-lg border-2 text-xs font-bold tabular-nums',
                          x.n === q.n ? 'border-ink ring-2 ring-brick' : 'border-line',
                          isAnswered(s.answers[x.n]) ? 'bg-sky' : 'bg-card',
                        )}
                      >
                        {x.n}
                        {s.flags.includes(x.n) && <span className="absolute -top-1 -right-1 h-2.5 w-2.5 rounded-full border border-ink bg-sand" />}
                      </button>
                    ))}
                </div>
              </div>
            ))}
          </div>
          <div className="mt-3 flex flex-wrap gap-x-3 gap-y-1 text-[11px] text-ink-soft">
            <span className="flex items-center gap-1">
              <span className="h-3 w-3 rounded border border-ink bg-sky" /> {t('exam.legend_done')}
            </span>
            <span className="flex items-center gap-1">
              <span className="h-3 w-3 rounded-full border border-ink bg-sand" /> {t('exam.legend_flag')}
            </span>
          </div>
        </aside>
      </div>

      {confirm && (
        <ConfirmDialog
          title={confirm === 'submit' ? t('exam.submit') : t('exam.next_section')}
          message={
            (unanswered ? t('exam.confirm_unanswered', { count: unanswered }) + ' ' : '') +
            (confirm === 'submit' ? t('exam.confirm_submit') : t('exam.confirm_section'))
          }
          confirmLabel={confirm === 'submit' ? t('exam.submit') : t('exam.next_section')}
          onClose={() => setConfirm(null)}
          onConfirm={() => {
            if (confirm !== 'submit') return finishSection()
            audio.pause()
            finishing.current = true
            onSubmit(sRef.current)
          }}
        />
      )}
    </section>
  )
}

/** Thanh nghe: thi thật chỉ hiện tiến trình băng; luyện tập có phát / dừng / tua. */
function ListenBar({
  strict,
  audio,
  hasAudio,
  done,
  blocked,
  onRetry,
}: {
  strict: boolean
  audio: ListenAudio
  hasAudio: boolean
  done: boolean
  blocked: boolean
  onRetry: () => void
}) {
  const { t } = useTranslation()
  const pct = audio.duration ? Math.min(100, (audio.time / audio.duration) * 100) : 0
  let text: string
  if (!hasAudio || audio.failed) text = t('exam.audio_failed')
  else if (strict && done) text = t('exam.tape_done')
  else if (strict && blocked) text = t('exam.audio_blocked')
  else if (strict) text = t('exam.tape_playing')
  else text = audio.playing ? t('exam.playing') : t('exam.press_play')
  return (
    <div className="box sticky top-[5.5rem] z-10 mt-3 flex flex-wrap items-center gap-3 bg-lilac/70 px-4 py-2.5">
      <Volume2 size={20} className={clsx(audio.playing && 'animate-pulse')} />
      <p className="min-w-0 flex-1 text-sm font-semibold">{text}</p>
      {hasAudio && !audio.failed && (
        <div className="flex w-full items-center gap-2 sm:w-auto sm:min-w-[22rem]">
          {!strict && (
            <>
              <button type="button" onClick={() => audio.seek(audio.time - 5)} className="btn h-8 w-8 p-0" aria-label={t('exam.back5')} title={t('exam.back5')}>
                <RotateCcw size={14} />
              </button>
              <button
                type="button"
                onClick={() => (audio.playing ? audio.pause() : audio.play())}
                className="btn btn-primary h-8 w-8 p-0"
                aria-label={audio.playing ? t('exam.pause') : t('exam.listen')}
              >
                {audio.playing ? <Pause size={14} /> : <Play size={14} />}
              </button>
              <button type="button" onClick={() => audio.seek(audio.time + 5)} className="btn h-8 w-8 p-0" aria-label={t('exam.fwd5')} title={t('exam.fwd5')}>
                <RotateCw size={14} />
              </button>
            </>
          )}
          {strict && blocked && !done && (
            <button type="button" onClick={onRetry} className="btn btn-primary px-3 py-1 text-xs">
              <Play size={13} />
              {t('exam.listen')}
            </button>
          )}
          {strict ? (
            <div className="h-2.5 flex-1 overflow-hidden rounded-full border-2 border-ink bg-card">
              <div className="h-full bg-brick" style={{ width: `${pct}%` }} />
            </div>
          ) : (
            <input
              type="range"
              min={0}
              max={Math.max(1, Math.floor(audio.duration))}
              value={Math.floor(audio.time)}
              onChange={(e) => audio.seek(Number(e.target.value))}
              className="min-w-0 flex-1 accent-brick"
              aria-label={t('exam.seek')}
            />
          )}
          <span className="text-xs font-bold whitespace-nowrap tabular-nums">
            {fmtClock(audio.time)} / {fmtClock(audio.duration)}
          </span>
        </div>
      )}
    </div>
  )
}
