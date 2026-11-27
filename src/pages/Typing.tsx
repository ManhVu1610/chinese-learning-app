import { ArrowRight, Check, Eye, EyeOff, Keyboard, Volume2 } from 'lucide-react'
import { useEffect, useRef, useState } from 'react'
import { useTranslation } from 'react-i18next'
import PracticeSetup, { Choice } from '../components/practice/PracticeSetup'
import { Feedback, SessionFrame, SessionSummary, WordAnswer } from '../components/practice/Session'
import { useSession } from '../components/practice/useSession'
import { checkMeaning, hasMeaning, onlyHan } from '../components/practice/checks'
import { useSpeech } from '../hooks/useSpeech'
import { comparePinyin, convertPinyinInput, stripTones } from '../lib/pinyinInput'
import { sfxEnabled, SFX_GAP_MS } from '../lib/sfx'

type Mode = 'hanzi' | 'pinyin' | 'meaning'
const MODE_KEY = 'practice_typing_mode'
const PINYIN_KEY = 'practice_typing_show_pinyin'

/** Luyện gõ: nhìn nghĩa/pinyin gõ chữ Hán, nhìn chữ gõ pinyin (có bộ gõ số thanh), nhìn chữ gõ nghĩa. */
export default function Typing() {
  const { t } = useTranslation()
  const s = useSession()
  const [mode, setMode] = useState<Mode>(() => (localStorage.getItem(MODE_KEY) as Mode) || 'hanzi')
  const [showPinyin, setShowPinyin] = useState(() => localStorage.getItem(PINYIN_KEY) !== '0')
  const [input, setInput] = useState('')
  const [hint, setHint] = useState('')
  const inputRef = useRef<HTMLInputElement>(null)
  const { speak, supported } = useSpeech()

  useEffect(() => localStorage.setItem(MODE_KEY, mode), [mode])
  useEffect(() => localStorage.setItem(PINYIN_KEY, showPinyin ? '1' : '0'), [showPinyin])
  useEffect(() => {
    setInput('')
    setHint('')
    inputRef.current?.focus()
  }, [s.index, s.phase])

  const title = `${t('practice.typing')} · ${t(`practice.typing_${mode}`)}`

  if (s.phase === 'setup')
    return (
      <PracticeSetup
        feature="typing"
        title={t('practice.typing')}
        intro={t('practice.typing_intro')}
        filter={mode === 'meaning' ? hasMeaning : undefined}
        onStart={s.begin}
      >
        <Choice
          label={t('practice.mode')}
          value={mode}
          onChange={setMode}
          options={(['hanzi', 'pinyin', 'meaning'] as Mode[]).map((m) => ({ value: m, label: t(`practice.typing_${m}`) }))}
        />
        <p className="text-sm text-ink-soft">{t(`practice.typing_${mode}_desc`)}</p>
      </PracticeSetup>
    )

  if (s.phase === 'done' || !s.current)
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

  const w = s.current
  const answered = s.result !== null

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

  const onKey = (e: React.KeyboardEvent) => {
    if (e.key !== 'Enter' || e.nativeEvent.isComposing) return
    e.preventDefault()
    if (answered) s.next()
    else check()
  }

  return (
    <SessionFrame title={title} index={s.index} total={s.words.length} score={s.score} onExit={s.toSetup}>
      {/* Đề bài */}
      <div className="text-center">
        {mode === 'hanzi' ? (
          <>
            <p className="text-sm font-bold text-ink-muted uppercase">{t('practice.meaning')}</p>
            <p className="mt-1 text-2xl font-extrabold">{w.meaning_vi || w.meaning_en}</p>
            {w.han_viet && <p className="text-sm text-ink-soft uppercase">{w.han_viet}</p>}
            <div className="mt-3 flex items-center justify-center gap-2">
              {showPinyin && <span className="text-xl text-brick italic">{w.pinyin}</span>}
              <button type="button" onClick={() => setShowPinyin((v) => !v)} aria-pressed={showPinyin} className="btn px-3 py-1 text-xs">
                {showPinyin ? <EyeOff size={14} /> : <Eye size={14} />}
                {showPinyin ? t('practice.hide_pinyin') : t('practice.show_pinyin')}
              </button>
            </div>
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

      {/* Ô nhập */}
      <label className="mt-6 block">
        <span className="text-sm font-bold">{t(`practice.type_${mode}`)}</span>
        <input
          ref={inputRef}
          value={input}
          onChange={(e) => setInput(mode === 'pinyin' ? convertPinyinInput(e.target.value) : e.target.value)}
          onKeyDown={onKey}
          readOnly={answered}
          lang={mode === 'hanzi' ? 'zh-CN' : mode === 'meaning' ? 'vi' : undefined}
          autoComplete="off"
          autoCapitalize="off"
          spellCheck={false}
          placeholder={t(`practice.ph_${mode}`)}
          className="field mt-1.5 text-center text-2xl"
        />
      </label>
      {mode === 'pinyin' && (
        <p className="mt-2 flex items-start gap-1.5 text-xs text-ink-soft">
          <Keyboard size={14} className="mt-0.5 shrink-0" />
          {t('practice.pinyin_ime_hint')}
        </p>
      )}

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
            <button type="button" onClick={s.next} className="btn btn-primary px-5 py-2 text-sm">
              {t('practice.next')}
              <ArrowRight size={15} />
            </button>
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
    </SessionFrame>
  )
}
