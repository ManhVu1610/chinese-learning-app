import clsx from 'clsx'
import { ArrowDownUp, ArrowLeftRight, Check, Copy, CornerLeftUp, Eraser, Languages, Loader2, Volume2 } from 'lucide-react'
import { useEffect, useRef, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { useSpeech } from '../hooks/useSpeech'
import {
  convertScript,
  detectLang,
  hasHan,
  speechLang,
  toPinyinLine,
  toPinyinTokens,
  translate,
  TranslateError,
  type Lang,
  type PinyinToken,
} from '../lib/textTools'

type Mode = 'pinyin' | 'convert' | 'translate'
type Dir = 's2t' | 't2s'

const INPUT_KEY = 'text_tool_input'
const pairs: [Lang, Lang][] = [
  ['vi', 'zh'],
  ['zh', 'vi'],
  ['en', 'zh'],
  ['zh', 'en'],
]

/** Hiển thị văn bản với pinyin nằm trên từng chữ Hán. */
function PinyinRuby({ tokens, size = 'text-2xl' }: { tokens: PinyinToken[]; size?: string }) {
  return (
    <p className={clsx('leading-[2.6] break-words whitespace-pre-wrap', size)}>
      {tokens.map((tk, i) =>
        tk.pinyin ? (
          <ruby key={i} className="mx-[1px]">
            {tk.text}
            <rt className="text-[0.45em] font-semibold text-brick">{tk.pinyin}</rt>
          </ruby>
        ) : (
          <span key={i}>{tk.text}</span>
        ),
      )}
    </p>
  )
}

export default function TextTool() {
  const { t } = useTranslation()
  const { speak, supported } = useSpeech()
  const [input, setInput] = useState(() => localStorage.getItem(INPUT_KEY) ?? '')
  const [mode, setMode] = useState<Mode>('pinyin')
  const [dir, setDir] = useState<Dir>('s2t')
  const [pair, setPair] = useState<[Lang, Lang]>(['vi', 'zh'])
  const [tokens, setTokens] = useState<PinyinToken[]>([])
  const [output, setOutput] = useState('')
  const [outTokens, setOutTokens] = useState<PinyinToken[]>([])
  const [showPinyin, setShowPinyin] = useState(true)
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState('')
  const [copied, setCopied] = useState(false)
  const abortRef = useRef<AbortController | null>(null)

  useEffect(() => localStorage.setItem(INPUT_KEY, input), [input])

  // Chế độ pinyin: tự phiên âm khi gõ.
  useEffect(() => {
    if (mode !== 'pinyin') return
    let alive = true
    const id = setTimeout(() => toPinyinTokens(input).then((tk) => alive && setTokens(tk)), 150)
    return () => {
      alive = false
      clearTimeout(id)
    }
  }, [input, mode])

  // Chế độ giản ↔ phồn: tự chuyển khi gõ hoặc đổi chiều.
  useEffect(() => {
    if (mode !== 'convert') return
    let alive = true
    const id = setTimeout(() => convertScript(input, dir).then((s) => alive && setOutput(s)), 150)
    return () => {
      alive = false
      clearTimeout(id)
    }
  }, [input, mode, dir])

  // Kết quả là tiếng Trung thì có thể hiện pinyin trên chữ.
  useEffect(() => {
    let alive = true
    if (output && hasHan(output)) toPinyinTokens(output).then((tk) => alive && setOutTokens(tk))
    else setOutTokens([])
    return () => {
      alive = false
    }
  }, [output])

  const switchMode = (m: Mode) => {
    abortRef.current?.abort()
    setMode(m)
    setOutput('')
    setError('')
    setBusy(false)
  }

  const runTranslate = async () => {
    if (!input.trim()) return
    abortRef.current?.abort()
    const ctrl = new AbortController()
    abortRef.current = ctrl
    setBusy(true)
    setError('')
    setOutput('')
    try {
      setOutput(await translate(input, pair[0], pair[1], ctrl.signal))
    } catch (e) {
      if ((e as Error).name === 'AbortError') return
      setError(t(`text.error_${e instanceof TranslateError ? e.code : 'failed'}`))
    } finally {
      if (abortRef.current === ctrl) setBusy(false)
    }
  }

  const copy = async (text: string) => {
    try {
      await navigator.clipboard.writeText(text)
      setCopied(true)
      setTimeout(() => setCopied(false), 1500)
    } catch {
      /* trình duyệt chặn clipboard: bỏ qua */
    }
  }

  const outputLang: Lang = mode === 'translate' ? pair[1] : 'zh'
  const langName = (l: Lang) => t(`text.lang_${l}`)

  return (
    <section className="mx-auto max-w-5xl px-4 py-8">
      <h1 className="text-3xl font-bold">{t('tools.text')}</h1>
      <p className="mt-1 text-ink-soft">{t('text.subtitle')}</p>

      {/* Chọn chức năng */}
      <div className="mt-6 inline-flex flex-wrap gap-1 rounded-full border-2 border-ink bg-card p-1 shadow-block-sm" role="tablist">
        {(['pinyin', 'convert', 'translate'] as const).map((m) => (
          <button
            key={m}
            type="button"
            role="tab"
            aria-selected={mode === m}
            onClick={() => switchMode(m)}
            className={clsx('rounded-full px-4 py-1.5 text-sm font-bold', mode === m ? 'bg-coral' : 'text-ink-soft hover:bg-brick-soft')}
          >
            {t(`text.mode_${m}`)}
          </button>
        ))}
      </div>

      {/* Tuỳ chọn của từng chức năng */}
      {mode === 'convert' && (
        <div className="mt-4 flex flex-wrap items-center gap-2">
          {(['s2t', 't2s'] as const).map((d) => (
            <button key={d} type="button" onClick={() => setDir(d)} className={clsx('btn px-4 py-1.5 text-sm', dir === d && 'bg-sand')}>
              {t(`text.${d}`)}
            </button>
          ))}
          <button
            type="button"
            onClick={() => setDir((d) => (d === 's2t' ? 't2s' : 's2t'))}
            title={t('text.swap')}
            aria-label={t('text.swap')}
            className="btn p-2"
          >
            <ArrowLeftRight size={16} />
          </button>
        </div>
      )}
      {mode === 'translate' && (
        <div className="mt-4 flex flex-wrap items-center gap-2">
          {pairs.map(([a, b]) => {
            const on = pair[0] === a && pair[1] === b
            return (
              <button
                key={a + b}
                type="button"
                onClick={() => {
                  setPair([a, b])
                  setOutput('')
                  setError('')
                }}
                className={clsx('btn px-4 py-1.5 text-sm', on && 'bg-sand')}
              >
                {langName(a)} → {langName(b)}
              </button>
            )
          })}
        </div>
      )}

      <div className="mt-5 grid gap-5 md:grid-cols-2">
        {/* Ô nhập */}
        <div className="box flex flex-col p-4">
          <div className="mb-2 flex items-center justify-between gap-2">
            <p className="text-sm font-bold text-ink-soft">
              {mode === 'translate' ? langName(pair[0]) : t('text.input')}
            </p>
            <span className="text-xs text-ink-muted tabular-nums">{t('text.chars', { count: [...input].length })}</span>
          </div>
          <textarea
            value={input}
            onChange={(e) => setInput(e.target.value)}
            rows={8}
            placeholder={mode === 'translate' && pair[0] !== 'zh' ? t(`text.placeholder_${pair[0]}`) : t('text.placeholder_zh')}
            aria-label={t('text.input')}
            className="field min-h-48 flex-1 resize-y text-lg"
          />
          <div className="mt-3 flex flex-wrap gap-2">
            {supported && (
              <button
                type="button"
                disabled={!input.trim()}
                onClick={() => speak(input, speechLang[mode === 'translate' ? pair[0] : detectLang(input)])}
                className="btn px-3 py-1.5 text-sm"
              >
                <Volume2 size={15} />
                {t('text.read')}
              </button>
            )}
            <button type="button" disabled={!input} onClick={() => setInput('')} className="btn px-3 py-1.5 text-sm">
              <Eraser size={15} />
              {t('text.clear')}
            </button>
            {mode === 'translate' && (
              <button
                type="button"
                disabled={!input.trim() || busy}
                onClick={runTranslate}
                className="btn btn-accent ml-auto px-5 py-1.5 text-sm"
              >
                {busy ? <Loader2 size={15} className="animate-spin" /> : <Languages size={15} />}
                {busy ? t('text.translating') : t('text.translate')}
              </button>
            )}
          </div>
        </div>

        {/* Kết quả */}
        <div className="box flex flex-col p-4">
          <div className="mb-2 flex items-center justify-between gap-2">
            <p className="text-sm font-bold text-ink-soft">
              {mode === 'translate' ? langName(pair[1]) : t('text.result')}
            </p>
            {mode !== 'pinyin' && outTokens.length > 0 && (
              <label className="flex cursor-pointer items-center gap-1.5 text-xs font-semibold text-ink-soft">
                <input type="checkbox" checked={showPinyin} onChange={(e) => setShowPinyin(e.target.checked)} className="accent-brick" />
                {t('text.show_pinyin')}
              </label>
            )}
          </div>

          <div className="min-h-48 flex-1 rounded-2xl border-2 border-dashed border-line bg-paper/60 p-3">
            {mode === 'pinyin' ? (
              tokens.some((tk) => tk.pinyin) ? (
                <PinyinRuby tokens={tokens} />
              ) : (
                <p className="text-sm text-ink-muted">{t('text.empty_pinyin')}</p>
              )
            ) : error ? (
              <p className="text-sm font-semibold text-brick">{error}</p>
            ) : busy ? (
              <p className="flex items-center gap-2 text-sm text-ink-muted">
                <Loader2 size={15} className="animate-spin" />
                {t('text.translating')}
              </p>
            ) : output ? (
              showPinyin && outTokens.length > 0 ? (
                <PinyinRuby tokens={outTokens} size="text-xl" />
              ) : (
                <p className="text-lg break-words whitespace-pre-wrap">{output}</p>
              )
            ) : (
              <p className="text-sm text-ink-muted">{mode === 'translate' ? t('text.empty_translate') : t('text.empty_convert')}</p>
            )}
          </div>

          <div className="mt-3 flex flex-wrap gap-2">
            {(() => {
              const text = mode === 'pinyin' ? input : output
              const ready = mode === 'pinyin' ? tokens.some((tk) => tk.pinyin) : !!output && !busy
              return (
                <>
                  {supported && (
                    <button
                      type="button"
                      disabled={!ready}
                      onClick={() => speak(text, speechLang[outputLang])}
                      className="btn px-3 py-1.5 text-sm"
                    >
                      <Volume2 size={15} />
                      {t('text.read')}
                    </button>
                  )}
                  <button
                    type="button"
                    disabled={!ready}
                    onClick={async () => copy(mode === 'pinyin' ? await toPinyinLine(input) : output)}
                    className="btn px-3 py-1.5 text-sm"
                  >
                    {copied ? <Check size={15} /> : <Copy size={15} />}
                    {copied ? t('text.copied') : mode === 'pinyin' ? t('text.copy_pinyin') : t('text.copy')}
                  </button>
                  {mode !== 'pinyin' && (
                    <button
                      type="button"
                      disabled={!ready}
                      onClick={() => {
                        setInput(output)
                        setOutput('')
                        if (mode === 'translate') setPair(([a, b]) => (pairs.some(([x, y]) => x === b && y === a) ? [b, a] : [a, b]))
                        else setDir((d) => (d === 's2t' ? 't2s' : 's2t'))
                      }}
                      title={t('text.use_as_input')}
                      className="btn px-3 py-1.5 text-sm"
                    >
                      {mode === 'translate' ? <ArrowDownUp size={15} /> : <CornerLeftUp size={15} />}
                      {t('text.use_as_input')}
                    </button>
                  )}
                </>
              )
            })()}
          </div>
        </div>
      </div>

      {mode === 'translate' && <p className="mt-4 text-xs text-ink-muted">{t('text.translate_note')}</p>}
    </section>
  )
}
