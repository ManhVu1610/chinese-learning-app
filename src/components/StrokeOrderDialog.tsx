import clsx from 'clsx'
import { PencilLine, Play, RotateCcw } from 'lucide-react'
import { useEffect, useRef, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { loadCharData } from '../lib/strokes'
import Modal from './Modal'

type Writer = import('hanzi-writer').default

const hanChars = (s: string) => [...s].filter((c) => /\p{Script=Han}/u.test(c))

const SIZE = 180

/** Hộp thoại xem thứ tự nét bút (bút thuận) của một từ hoặc bộ thủ, có chế độ tập viết. */
export default function StrokeOrderDialog({ text, onClose }: { text: string; onClose: () => void }) {
  const { t } = useTranslation()
  const chars = hanChars(text)
  const [active, setActive] = useState(0)
  const [mode, setMode] = useState<'watch' | 'quiz'>('watch')
  const [status, setStatus] = useState<'loading' | 'ready' | 'missing'>('loading')
  const [strokeCount, setStrokeCount] = useState<number | null>(null)
  const [quizDone, setQuizDone] = useState(false)
  const boxRef = useRef<HTMLDivElement>(null)
  const writerRef = useRef<Writer | null>(null)
  const char = chars[active]

  // Tạo lại bảng vẽ mỗi khi đổi chữ hoặc đổi chế độ.
  useEffect(() => {
    if (!char || !boxRef.current) return
    let cancelled = false
    const box = boxRef.current
    box.innerHTML = ''
    setStatus('loading')
    setQuizDone(false)
    setStrokeCount(null)
    ;(async () => {
      const { default: HanziWriter } = await import('hanzi-writer')
      if (cancelled) return
      const css = getComputedStyle(document.documentElement)
      const writer = HanziWriter.create(box, char, {
        width: SIZE,
        height: SIZE,
        padding: 8,
        showOutline: true,
        showCharacter: false,
        strokeColor: css.getPropertyValue('--color-ink').trim() || '#2f2a25',
        radicalColor: css.getPropertyValue('--color-brick').trim() || '#a4473c',
        outlineColor: '#d9d1c4',
        drawingColor: css.getPropertyValue('--color-brick').trim() || '#a4473c',
        highlightColor: '#5f9e72',
        strokeAnimationSpeed: 1,
        delayBetweenStrokes: 250,
        charDataLoader: (c, onLoad, onError) => {
          loadCharData(c)
            .then((data) => {
              if (cancelled) return
              setStrokeCount(data.strokes?.length ?? null)
              setStatus('ready')
              onLoad(data)
            })
            .catch((e) => {
              if (cancelled) return
              setStatus('missing')
              onError(e)
            })
        },
      })
      writerRef.current = writer
      if (mode === 'watch') writer.animateCharacter()
      else writer.quiz({ onComplete: () => setQuizDone(true) })
    })()
    return () => {
      cancelled = true
      writerRef.current = null
    }
  }, [char, mode])

  const replay = () => {
    if (mode === 'quiz') {
      setQuizDone(false)
      writerRef.current?.quiz({ onComplete: () => setQuizDone(true) })
    } else writerRef.current?.animateCharacter()
  }

  return (
    <Modal title={t('stroke.title', { text })} onClose={onClose}>
      {chars.length > 1 && (
        <div className="mb-3 flex flex-wrap gap-2" role="tablist">
          {chars.map((c, i) => (
            <button
              key={`${c}-${i}`}
              type="button"
              role="tab"
              aria-selected={i === active}
              onClick={() => setActive(i)}
              className={clsx('btn min-w-11 px-2 py-1 text-xl', i === active && 'bg-sand')}
            >
              {c}
            </button>
          ))}
        </div>
      )}

      <div className="flex flex-col items-center">
        <div className="relative border-2 border-ink bg-card shadow-block-sm" style={{ width: SIZE + 4, height: SIZE + 4 }}>
          {/* Lưới điền tự */}
          <svg className="pointer-events-none absolute inset-0" viewBox="0 0 100 100" aria-hidden>
            <line x1="50" y1="0" x2="50" y2="100" stroke="#e5ddd0" strokeDasharray="3 2.5" strokeWidth="0.6" />
            <line x1="0" y1="50" x2="100" y2="50" stroke="#e5ddd0" strokeDasharray="3 2.5" strokeWidth="0.6" />
            <line x1="0" y1="0" x2="100" y2="100" stroke="#eee8de" strokeDasharray="3 2.5" strokeWidth="0.5" />
            <line x1="100" y1="0" x2="0" y2="100" stroke="#eee8de" strokeDasharray="3 2.5" strokeWidth="0.5" />
          </svg>
          <div ref={boxRef} className="relative" aria-label={t('stroke.canvas', { char })} />
          {status !== 'ready' && (
            <p className="absolute inset-0 flex items-center justify-center p-4 text-center text-sm text-ink-soft">
              {status === 'loading' ? t('common.loading') : t('stroke.missing')}
            </p>
          )}
        </div>

        <p className="mt-3 h-5 text-sm text-ink-soft">
          {status === 'ready' && strokeCount !== null && t('stroke.count', { count: strokeCount })}
          {mode === 'quiz' && status === 'ready' && (quizDone ? ` · ${t('stroke.quiz_done')}` : ` · ${t('stroke.quiz_hint')}`)}
        </p>

        <div className="mt-3 flex flex-wrap justify-center gap-2">
          <button type="button" onClick={() => setMode('watch')} aria-pressed={mode === 'watch'} className={clsx('btn px-3 py-1.5 text-sm', mode === 'watch' && 'bg-sand')}>
            <Play size={15} />
            {t('stroke.watch')}
          </button>
          <button type="button" onClick={() => setMode('quiz')} aria-pressed={mode === 'quiz'} className={clsx('btn px-3 py-1.5 text-sm', mode === 'quiz' && 'bg-sand')}>
            <PencilLine size={15} />
            {t('stroke.quiz')}
          </button>
          <button type="button" onClick={replay} disabled={status !== 'ready'} className="btn px-3 py-1.5 text-sm">
            <RotateCcw size={15} />
            {t('stroke.replay')}
          </button>
        </div>
        <p className="mt-3 text-center text-xs text-ink-muted">{t('stroke.legend')}</p>
      </div>
    </Modal>
  )
}
