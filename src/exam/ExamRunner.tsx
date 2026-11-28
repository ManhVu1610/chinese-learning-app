import clsx from 'clsx'
import { ChevronLeft, ChevronRight, Clock, Flag, Headphones, LogOut, Play, RotateCcw, Send, Square, Volume2 } from 'lucide-react'
import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { ConfirmDialog } from '../components/notebook/Dialogs'
import { hasListening, playQuestion, type Playback } from './audio'
import QuestionView from './QuestionView'
import { isAnswered, sectionsOf } from './scoring'
import { saveSession } from './storage'
import { LISTEN_GAP, SECTION_MINUTES, type Answer, type ExamPaper, type ExamSession, type SectionKey } from './types'

export const SECTION_ZH: Record<SectionKey, string> = { listening: '听力', reading: '阅读', writing: '书写' }

export const fmtClock = (sec: number) => {
  const s = Math.max(0, Math.round(sec))
  const h = Math.floor(s / 3600)
  const m = Math.floor((s % 3600) / 60)
  const ss = String(s % 60).padStart(2, '0')
  return h ? `${h}:${String(m).padStart(2, '0')}:${ss}` : `${m}:${ss}`
}

export const sectionSeconds = (paper: ExamPaper, s: SectionKey) => (SECTION_MINUTES[paper.level] ?? SECTION_MINUTES[4])[s] * 60

type ListenPhase = 'idle' | 'playing' | 'gap'

/**
 * Giao diện thi trên máy:
 *  - Thanh trên: tên đề, kỹ năng đang làm (听力 / 阅读 / 书写), đồng hồ, nút nộp bài.
 *  - Giữa: câu hỏi; bên phải: bảng số câu (đã làm / đánh dấu / đang xem).
 *  - Thi thật: phần Nghe tự phát từng câu một lần rồi tự chuyển câu, không quay lại;
 *    phần Đọc, Viết tính giờ riêng, hết giờ tự sang phần sau; đã qua phần nào thì không quay lại.
 *  - Luyện tập: đi lại tự do giữa các câu, nghe lại bao nhiêu lần cũng được, đồng hồ đếm lên.
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
  const [phase, setPhase] = useState<ListenPhase>('idle')
  const [gap, setGap] = useState(LISTEN_GAP)
  const [audioFailed, setAudioFailed] = useState(false)
  const playback = useRef<Playback | null>(null)

  const update = useCallback((patch: Partial<ExamSession> | ((p: ExamSession) => Partial<ExamSession>)) => {
    setS((prev) => ({ ...prev, ...(typeof patch === 'function' ? patch(prev) : patch) }))
  }, [])

  useEffect(() => saveSession(s), [s])

  const stopAudio = useCallback(() => {
    playback.current?.stop()
    playback.current = null
  }, [])
  useEffect(() => stopAudio, [stopAudio])

  // Trạng thái mới nhất cho các hàm gọi từ hẹn giờ (không đặt việc phụ trong hàm cập nhật state).
  const sRef = useRef(s)
  sRef.current = s
  const finishing = useRef(false)

  const finishSection = useCallback(() => {
    stopAudio()
    setPhase('idle')
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
  }, [sections, paper, strict, onSubmit, stopAudio])

  // Đồng hồ: thi thật đếm ngược (Đọc, Viết), luyện tập đếm lên.
  const timed = strict ? secKey !== 'listening' && s.started : true
  useEffect(() => {
    if (!timed) return
    const id = setInterval(() => update((p) => ({ clock: strict ? p.clock - 1 : p.clock + 1 })), 1000)
    return () => clearInterval(id)
  }, [timed, strict, update])
  useEffect(() => {
    if (strict && timed && s.clock <= 0) finishSection()
  }, [strict, timed, s.clock, finishSection])

  const go = (n: number) => {
    stopAudio()
    setPhase('idle')
    setAudioFailed(false)
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

  // ---- Thi thật: phần nghe tự chạy ----
  const listenStrict = strict && secKey === 'listening' && s.started && armed
  const advanceListening = useCallback(() => {
    stopAudio()
    setPhase('idle')
    setAudioFailed(false)
    const p = sRef.current
    const heard = p.heard.includes(p.current) ? p.heard : [...p.heard, p.current]
    const i = secQs.findIndex((x) => x.n === p.current)
    const nx = secQs[i + 1]
    sRef.current = { ...p, heard, current: nx ? nx.n : p.current }
    setS(sRef.current)
    if (!nx) finishSection()
  }, [secQs, stopAudio, finishSection])

  useEffect(() => {
    if (!listenStrict) return
    if (s.heard.includes(s.current)) {
      advanceListening()
      return
    }
    const cur = paper.questions.find((x) => x.n === s.current)
    if (!cur) return
    if (!hasListening(cur)) {
      setAudioFailed(true)
      setGap(LISTEN_GAP)
      setPhase('gap')
      return
    }
    setPhase('playing')
    const pb = playQuestion(cur)
    playback.current = pb
    let alive = true
    pb.done.then((ok) => {
      if (!alive) return
      if (!ok) setAudioFailed(true)
      setGap(LISTEN_GAP)
      setPhase('gap')
    })
    return () => {
      alive = false
      pb.stop()
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [listenStrict, s.current])

  useEffect(() => {
    if (!listenStrict || phase !== 'gap') return
    if (gap <= 0) {
      advanceListening()
      return
    }
    const id = setTimeout(() => setGap((g) => g - 1), 1000)
    return () => clearTimeout(id)
  }, [listenStrict, phase, gap, advanceListening])

  // ---- Luyện tập: nút nghe ----
  const playPractice = () => {
    if (phase === 'playing') {
      stopAudio()
      setPhase('idle')
      return
    }
    stopAudio()
    setAudioFailed(false)
    const pb = playQuestion(q)
    playback.current = pb
    setPhase('playing')
    pb.done.then((ok) => {
      if (playback.current !== pb) return
      if (!ok) setAudioFailed(true)
      setPhase('idle')
    })
  }

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
  if (strict && (!s.started || (secKey === 'listening' && !armed))) {
    const resume = s.started
    return (
      <section className="mx-auto max-w-2xl px-4 py-10">
        <div className="box p-6 text-center md:p-8">
          <p className="text-sm font-bold text-ink-soft">
            {paper.code ?? paper.title} · {t('exam.section_n', { n: s.sectionIdx + 1, total: sections.length })}
          </p>
          <h1 className="mt-2 text-4xl font-extrabold" lang="zh-CN">
            {SECTION_ZH[secKey]}
          </h1>
          <p className="mt-1 text-lg font-bold">{t(`exam.section.${secKey}`)}</p>
          <p className="mt-4 text-ink-soft">
            {t('exam.section_info', { count: secQs.length, minutes: Math.round(sectionSeconds(paper, secKey) / 60) })}
          </p>
          <p className="mt-2 text-sm text-ink-soft">{t(`exam.rules.${secKey}`, { gap: LISTEN_GAP })}</p>
          {secKey === 'listening' && paper.audio === 'tts' && <p className="mt-2 text-sm text-ink-soft">{t('exam.tts_note')}</p>}
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

  const listeningNow = q.section === 'listening'
  const lockedListen = strict && listeningNow
  const clockLow = strict && s.clock < 300

  return (
    <section className="mx-auto max-w-6xl px-3 py-4 md:px-4">
      {/* Thanh trên */}
      <header className="box sticky top-2 z-20 flex flex-wrap items-center gap-x-4 gap-y-2 px-4 py-2.5">
        <div className="w-full min-w-0 sm:w-auto sm:flex-1">
          <p className="truncate text-xs font-bold text-ink-soft">
            HSK {paper.level} · {paper.code ?? t('exam.paper_n', { n: paper.number })} · {t(`exam.mode.${s.mode}`)}
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
            clockLow ? 'bg-coral' : 'bg-card',
          )}
          title={strict ? t('exam.time_left') : t('exam.time_used')}
        >
          <Clock size={16} />
          {strict && secKey === 'listening' ? t('exam.listen_progress', { n: pos + 1, total: secQs.length }) : fmtClock(s.clock)}
        </div>
        {strict && !lastSection ? (
          <button type="button" onClick={() => setConfirm('section')} disabled={secKey === 'listening'} className="btn btn-primary px-4 py-1.5 text-sm">
            <ChevronRight size={15} />
            {t('exam.next_section')}
          </button>
        ) : (
          <button type="button" onClick={() => setConfirm('submit')} className="btn btn-accent px-4 py-1.5 text-sm">
            <Send size={15} />
            {t('exam.submit')}
          </button>
        )}
        <button type="button" onClick={onExit} className="btn p-2" title={t('exam.exit_hint')} aria-label={t('exam.exit')}>
          <LogOut size={15} />
        </button>
      </header>

      <div className="mt-4 grid gap-4 lg:grid-cols-[1fr_17rem]">
        {/* Câu hỏi */}
        <div className="box min-w-0 p-5 md:p-7">
          <div className="flex items-center gap-3">
            <span className="sticker bg-sky px-3 py-1 text-lg font-extrabold tabular-nums">{q.n}</span>
            <span className="flex-1" />
            {!lockedListen && (
              <button type="button" onClick={toggleFlag} className={clsx('btn px-3 py-1.5 text-xs', s.flags.includes(q.n) && 'bg-sand')}>
                <Flag size={13} />
                {s.flags.includes(q.n) ? t('exam.flagged') : t('exam.flag')}
              </button>
            )}
          </div>

          {listeningNow && (
            <ListenBar
              strict={strict}
              phase={phase}
              gap={gap}
              failed={audioFailed}
              hasAudio={hasListening(q)}
              onPlay={playPractice}
              onSkip={advanceListening}
            />
          )}

          <div className="mt-4">
            <QuestionView
              key={q.n}
              paper={paper}
              q={q}
              answer={s.answers[q.n]}
              onAnswer={setAnswer}
              showListenText={!strict}
            />
          </div>

          {!lockedListen && (
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
                  onClick={() => setConfirm(strict && !lastSection ? 'section' : 'submit')}
                  className="btn btn-accent px-4 py-2 text-sm"
                >
                  {strict && !lastSection ? t('exam.next_section') : t('exam.submit')}
                  <ChevronRight size={16} />
                </button>
              )}
            </div>
          )}
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
                    .map((x) => {
                      const done = isAnswered(s.answers[x.n])
                      const passed = strict && k === 'listening' && x.n !== q.n
                      return (
                        <button
                          key={x.n}
                          type="button"
                          disabled={strict && k === 'listening'}
                          onClick={() => go(x.n)}
                          aria-current={x.n === q.n}
                          className={clsx(
                            'relative h-8 rounded-lg border-2 text-xs font-bold tabular-nums',
                            x.n === q.n ? 'border-ink ring-2 ring-brick' : 'border-line',
                            done ? 'bg-sky' : passed && s.heard.includes(x.n) ? 'bg-paper text-ink-muted' : 'bg-card',
                          )}
                        >
                          {x.n}
                          {s.flags.includes(x.n) && <span className="absolute -top-1 -right-1 h-2.5 w-2.5 rounded-full border border-ink bg-sand" />}
                        </button>
                      )
                    })}
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
            stopAudio()
            finishing.current = true
            onSubmit(sRef.current)
          }}
        />
      )}
    </section>
  )
}

function ListenBar({
  strict,
  phase,
  gap,
  failed,
  hasAudio,
  onPlay,
  onSkip,
}: {
  strict: boolean
  phase: ListenPhase
  gap: number
  failed: boolean
  hasAudio: boolean
  onPlay: () => void
  onSkip: () => void
}) {
  const { t } = useTranslation()
  return (
    <div className="mt-4 flex flex-wrap items-center gap-3 rounded-2xl border-2 border-ink bg-lilac/60 px-4 py-2.5">
      <Volume2 size={20} className={clsx(phase === 'playing' && 'animate-pulse')} />
      <p className="min-w-0 flex-1 text-sm font-semibold">
        {failed || !hasAudio
          ? t('exam.audio_failed')
          : phase === 'playing'
            ? t('exam.playing')
            : strict
              ? t('exam.answer_window', { s: gap })
              : t('exam.press_play')}
      </p>
      {strict ? (
        phase === 'gap' && (
          <button type="button" onClick={onSkip} className="btn px-3 py-1 text-xs">
            {t('exam.next_now')}
            <ChevronRight size={13} />
          </button>
        )
      ) : (
        hasAudio && (
          <button type="button" onClick={onPlay} className="btn btn-primary px-3 py-1 text-xs">
            {phase === 'playing' ? <Square size={13} /> : phase === 'idle' ? <Play size={13} /> : <RotateCcw size={13} />}
            {phase === 'playing' ? t('exam.stop') : t('exam.listen')}
          </button>
        )
      )}
    </div>
  )
}
