import clsx from 'clsx'
import { Volume2 } from 'lucide-react'
import { useMemo, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { useSearchParams } from 'react-router-dom'
import { sampleChar } from '../data/pinyin'
import { commonRadicals, radicals } from '../data/radicals'
import StrokeButton from '../components/StrokeButton'
import { useSpeech } from '../hooks/useSpeech'

type StrokeFilter = 'all' | 1 | 2 | 3 | 4 | '5+'
const filters: StrokeFilter[] = ['all', 1, 2, 3, 4, '5+']
type Tab = 'all214' | 'common50'

export default function Radicals() {
  const { t } = useTranslation()
  const [params, setParams] = useSearchParams()
  // Ghi tab vào địa chỉ (?tab=50) để tải lại trang vẫn giữ đúng tab.
  const tab: Tab = params.get('tab') === '50' ? 'common50' : 'all214'
  const setTab = (next: Tab) => setParams(next === 'common50' ? { tab: '50' } : {}, { replace: true })

  return (
    <section className="mx-auto max-w-6xl px-4 py-8">
      <h1 className="text-3xl font-bold">{t('tools.radicals')}</h1>
      <p className="mt-2 text-ink-soft">{t('radicals.intro')}</p>

      <div className="mt-5 inline-grid grid-cols-2 gap-1 rounded-full border-2 border-ink bg-card p-1 shadow-block-sm" role="tablist">
        {(
          [
            ['all214', t('radicals.tab_214')],
            ['common50', t('radicals.tab_50')],
          ] as const
        ).map(([key, label]) => (
          <button
            key={key}
            type="button"
            role="tab"
            aria-selected={tab === key}
            onClick={() => setTab(key)}
            className={clsx(
              'rounded-full px-4 py-1.5 text-sm font-bold',
              tab === key ? 'bg-coral' : 'text-ink-soft hover:bg-brick-soft',
            )}
          >
            {label}
          </button>
        ))}
      </div>

      {tab === 'all214' ? <All214 /> : <Common50 />}
    </section>
  )
}

/** Bộ thủ dạng nét (丨, 丿, 亅…) không phải chữ thường dùng nên giọng đọc hay đọc sai: ưu tiên đọc chữ mẫu có đúng âm. */
const speakText = (radical: string, pinyin: string) => sampleChar(pinyin) ?? radical

function All214() {
  const { t } = useTranslation()
  const { speak } = useSpeech()
  const [filter, setFilter] = useState<StrokeFilter>('all')

  const list = useMemo(
    () => radicals.filter((r) => (filter === 'all' ? true : filter === '5+' ? r.strokes >= 5 : r.strokes === filter)),
    [filter],
  )

  return (
    <>
      <div className="mt-5 flex flex-wrap gap-2.5">
        {filters.map((f) => (
          <button
            key={f}
            type="button"
            onClick={() => setFilter(f)}
            aria-pressed={filter === f}
            className={clsx('btn px-4 py-1.5 text-sm', filter === f ? 'bg-sand' : 'text-ink-soft')}
          >
            {f === 'all' ? t('vocab.all') : f === '5+' ? t('radicals.strokes_5plus') : t('radicals.strokes', { count: f })}
          </button>
        ))}
      </div>

      <p className="mt-5 text-sm font-medium text-ink-soft">
        {t('radicals.showing', { count: list.length, total: radicals.length })}
      </p>

      <div className="mt-4 grid grid-cols-2 gap-5 sm:grid-cols-3 lg:grid-cols-5">
        {list.map((r) => (
          <div key={r.id} className="box relative flex flex-col items-start p-4">
            <span className="tag absolute top-3 right-3">#{r.id}</span>
            <span className="flex items-baseline gap-2">
              <span className="text-4xl font-bold text-brick">{r.radical}</span>
              {r.variants.length > 0 && <span className="text-lg text-ink-soft">{r.variants.join(' ')}</span>}
            </span>
            <span className="mt-2 text-sm text-ink-soft italic">
              {r.pinyin}
              {r.han_viet && <span className="not-italic"> · {r.han_viet}</span>}
            </span>
            <span className="mt-1 line-clamp-2 flex-1 font-semibold">{r.meaning_vi}</span>
            <span className="mt-3 flex w-full items-center gap-2 text-xs text-ink-muted">
              <span className="flex-1">{t('radicals.strokes', { count: r.strokes })}</span>
              <StrokeButton text={r.radical} />
              <button
                type="button"
                onClick={() => speak(speakText(r.radical, r.pinyin))}
                title={t('vocab.speak')}
                aria-label={`${t('vocab.speak')} ${r.radical}`}
                className="btn p-1.5"
              >
                <Volume2 size={16} />
              </button>
            </span>
          </div>
        ))}
      </div>
    </>
  )
}

function Common50() {
  const { t } = useTranslation()
  const { speak, supported } = useSpeech()

  return (
    <>
      <p className="mt-5 text-sm font-medium text-ink-soft">{t('radicals.common_intro', { count: commonRadicals.length })}</p>
      <div className="mt-4 grid grid-cols-1 gap-5 md:grid-cols-2">
        {commonRadicals.map((r) => (
          <article key={r.id} className="box flex flex-col">
            <div className="flex items-start gap-4 p-4">
              <button
                type="button"
                onClick={() => speak(speakText(r.radical, r.pinyin))}
                title={t('vocab.speak')}
                aria-label={`${t('vocab.speak')} ${r.radical}`}
                className="flex h-20 w-20 shrink-0 flex-col items-center justify-center border-2 border-ink bg-brick-soft shadow-block-sm hover:bg-sand"
              >
                <span className="text-4xl leading-none font-bold text-brick">{r.radical}</span>
                {r.variants.length > 0 && <span className="mt-1 text-sm text-ink-soft">{r.variants.join(' ')}</span>}
              </button>
              <div className="min-w-0 flex-1">
                <div className="flex flex-wrap items-center gap-2">
                  <span className="tag">#{r.id}</span>
                  <span className="text-sm text-ink-soft italic">{r.pinyin}</span>
                  {r.han_viet && <span className="border-2 border-ink bg-sand px-1.5 text-[11px] font-bold uppercase">{r.han_viet}</span>}
                  {r.strokes && <span className="text-xs text-ink-muted">{t('radicals.strokes', { count: r.strokes })}</span>}
                </div>
                <p className="mt-2 text-sm font-semibold">{r.meaning_vi}</p>
              </div>
              <StrokeButton text={r.radical} />
            </div>
            {r.examples.length > 0 && (
              <ul className="mt-auto divide-y-2 divide-line border-t-2 border-ink">
                {r.examples.map((ex) => (
                  <li key={ex.hanzi} className="flex items-center gap-3 px-4 py-2">
                    <span className="text-lg font-bold text-brick">{ex.hanzi}</span>
                    <span className="text-xs text-ink-soft italic">{ex.pinyin}</span>
                    <span className="min-w-0 flex-1 truncate text-sm">{ex.meaning_vi}</span>
                    <StrokeButton text={ex.hanzi} className="btn shrink-0 p-1" />
                    {supported && (
                      <button
                        type="button"
                        onClick={() => speak(ex.hanzi)}
                        title={t('vocab.speak')}
                        aria-label={`${t('vocab.speak')} ${ex.hanzi}`}
                        className="btn shrink-0 p-1"
                      >
                        <Volume2 size={14} />
                      </button>
                    )}
                  </li>
                ))}
              </ul>
            )}
          </article>
        ))}
      </div>
    </>
  )
}
