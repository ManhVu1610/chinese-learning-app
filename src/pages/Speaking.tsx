import clsx from 'clsx'
import { Mic, Play, Snail, Square, Volume2 } from 'lucide-react'
import { useEffect, useRef, useState } from 'react'
import { canRecord, useRecorder } from '../components/practice/useRecorder'
import { useTranslation } from 'react-i18next'
import PracticeSetup, { Choice } from '../components/practice/PracticeSetup'
import { SessionFrame, SessionSummary } from '../components/practice/Session'
import { useSession } from '../components/practice/useSession'
import { useSpeech } from '../hooks/useSpeech'
import type { Word } from '../types'

type Mode = 'word' | 'sentence'
const MODE_KEY = 'practice_speaking_mode'
const hasSentence = (w: Word) => Boolean(w.example?.trim())

/** Luyện nói: nghe mẫu → ghi âm đọc theo → nghe lại so sánh → tự đánh giá. */
export default function Speaking() {
  const { t } = useTranslation()
  const s = useSession()
  const { speak, supported } = useSpeech()
  const rec = useRecorder()
  const [mode, setMode] = useState<Mode>(() => (localStorage.getItem(MODE_KEY) as Mode) || 'word')
  const [showPinyin, setShowPinyin] = useState(true)
  const audioRef = useRef<HTMLAudioElement>(null)
  useEffect(() => localStorage.setItem(MODE_KEY, mode), [mode])

  const w = s.current
  const text = w ? (mode === 'sentence' ? w.example! : w.hanzi) : ''
  const pinyin = w ? (mode === 'sentence' ? w.example_pinyin : w.pinyin) : ''
  const meaning = w ? (mode === 'sentence' ? w.example_vi : w.meaning_vi) : ''
  const play = (rate = 0.8) => supported && text && speak(text, 'zh-CN', rate)

  // Câu mới: xoá bản ghi cũ, tự phát mẫu.
  useEffect(() => {
    if (s.phase !== 'run') return
    rec.stop()
    rec.clear()
    const id = setTimeout(() => play(), 300)
    return () => clearTimeout(id)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [s.index, s.phase, s.words])

  const title = `${t('practice.speaking')} · ${t(`practice.speaking_${mode}`)}`

  if (s.phase === 'setup')
    return (
      <PracticeSetup
        feature="speaking"
        title={t('practice.speaking')}
        intro={t('practice.speaking_intro')}
        filter={mode === 'sentence' ? hasSentence : undefined}
        onStart={s.begin}
      >
        <Choice
          label={t('practice.content')}
          value={mode}
          onChange={setMode}
          options={(['word', 'sentence'] as Mode[]).map((m) => ({ value: m, label: t(`practice.speaking_${m}`) }))}
        />
        <ol className="list-decimal space-y-0.5 pl-5 text-sm text-ink-soft">
          <li>{t('practice.speaking_step1')}</li>
          <li>{t('practice.speaking_step2')}</li>
          <li>{t('practice.speaking_step3')}</li>
          <li>{t('practice.speaking_step4')}</li>
        </ol>
        {!canRecord && <p className="rounded-xl border-2 border-ink bg-apricot px-3 py-2 text-sm">{t('practice.no_recorder')}</p>}
      </PracticeSetup>
    )

  if (s.phase === 'done' || !w)
    return (
      <SessionSummary
        title={title}
        score={s.score}
        total={s.words.length}
        wrong={s.wrong}
        onRetryWrong={s.retryWrong}
        onRestart={s.restart}
        onSetup={s.toSetup}
      />
    )

  const grade = (ok: boolean) => {
    rec.stop()
    s.answer(ok)
    s.next()
  }

  return (
    <SessionFrame title={title} index={s.index} total={s.words.length} score={s.score} onExit={s.toSetup}>
      {/* Mẫu */}
      <div className="text-center">
        <p className={clsx('font-bold text-brick', mode === 'sentence' ? 'text-3xl leading-snug' : 'text-7xl')}>{text}</p>
        {showPinyin && pinyin && <p className="mt-2 text-lg italic">{pinyin}</p>}
        {meaning && <p className="mt-1 text-ink-soft">{meaning}</p>}
        <button
          type="button"
          onClick={() => setShowPinyin((v) => !v)}
          className="mt-2 text-xs font-semibold text-ink-soft underline underline-offset-2"
        >
          {showPinyin ? t('practice.hide_pinyin') : t('practice.show_pinyin')}
        </button>
      </div>

      {/* Bước 1: nghe mẫu */}
      <div className="mt-6 grid gap-3 sm:grid-cols-2">
        <div className="rounded-2xl border-2 border-ink bg-paper p-3">
          <p className="text-xs font-bold text-ink-muted uppercase">1 · {t('practice.sample')}</p>
          <div className="mt-2 flex flex-wrap gap-2">
            <button type="button" onClick={() => play()} disabled={!supported} className="btn px-3 py-1.5 text-sm">
              <Volume2 size={15} />
              {t('practice.listen_sample')}
            </button>
            <button type="button" onClick={() => play(0.5)} disabled={!supported} className="btn px-3 py-1.5 text-sm">
              <Snail size={15} />
              {t('practice.slow')}
            </button>
          </div>
        </div>

        {/* Bước 2–3: ghi âm và nghe lại */}
        <div className="rounded-2xl border-2 border-ink bg-paper p-3">
          <p className="text-xs font-bold text-ink-muted uppercase">2 · {t('practice.your_voice')}</p>
          <div className="mt-2 flex flex-wrap gap-2">
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
          {rec.recording && <p className="mt-2 animate-pulse text-xs font-bold text-brick">● {t('practice.recording')}</p>}
          {rec.error && <p className="mt-2 text-xs text-brick">{t(`practice.mic_${rec.error}`)}</p>}
          {rec.url && <audio ref={audioRef} src={rec.url} className="hidden" />}
        </div>
      </div>

      {/* Bước 4: tự đánh giá */}
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
    </SessionFrame>
  )
}
