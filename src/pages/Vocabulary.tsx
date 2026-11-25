import clsx from 'clsx'
import { Search, Volume2 } from 'lucide-react'
import { useMemo, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { hskWords } from '../data/hsk'
import { useSpeech } from '../hooks/useSpeech'
import type { HSKLevel } from '../types'

const levels: HSKLevel[] = [1, 2, 3, 4, 5, 6]

/** Bỏ dấu để tìm "ni hao" ra "nǐ hǎo", "xin chao" ra "Xin chào". */
const normalize = (s: string) =>
  s
    .toLowerCase()
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .replace(/đ/g, 'd')
    .replace(/\s+/g, '')

export default function Vocabulary() {
  const { t } = useTranslation()
  const { speak, supported } = useSpeech()
  const [query, setQuery] = useState('')
  const [level, setLevel] = useState<HSKLevel | 'all'>('all')

  const filtered = useMemo(() => {
    const q = normalize(query)
    return hskWords.filter(
      (w) =>
        (level === 'all' || w.hsk_level === level) &&
        (!q ||
          w.hanzi.includes(query.trim()) ||
          normalize(w.pinyin).includes(q) ||
          normalize(w.meaning_vi).includes(q)),
    )
  }, [query, level])

  return (
    <section className="mx-auto max-w-6xl px-4 py-8">
      <h1 className="text-3xl font-bold">{t('nav.vocabulary')}</h1>

      <div className="relative mt-6">
        <Search size={18} className="absolute top-1/2 left-3 -translate-y-1/2 text-gray-400" />
        <input
          type="search"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder={t('vocab.search_placeholder')}
          className="w-full rounded-lg border border-gray-300 bg-white py-2.5 pr-3 pl-10 outline-none focus:border-[#DC2626] focus:ring-2 focus:ring-red-100"
        />
      </div>

      <div className="mt-4 flex flex-wrap gap-2">
        {(['all', ...levels] as const).map((lv) => (
          <button
            key={lv}
            type="button"
            onClick={() => setLevel(lv)}
            className={clsx(
              'rounded-full border px-4 py-1.5 text-sm font-medium transition-colors',
              level === lv
                ? 'border-[#DC2626] bg-[#DC2626] text-white'
                : 'border-gray-300 bg-white text-gray-600 hover:border-[#DC2626] hover:text-[#DC2626]',
            )}
          >
            {lv === 'all' ? t('vocab.all') : `HSK ${lv}`}
          </button>
        ))}
      </div>

      <p className="mt-4 text-sm text-gray-500">
        {t('vocab.showing', { count: filtered.length, total: hskWords.length })}
      </p>

      {filtered.length === 0 ? (
        <p className="mt-10 text-center text-gray-500">{t('vocab.empty')}</p>
      ) : (
        <div className="mt-4 grid grid-cols-2 gap-4 md:grid-cols-3 lg:grid-cols-4">
          {filtered.map((w) => (
            <div
              key={w.id}
              className="relative rounded-xl border border-gray-200 bg-white p-4 shadow-sm transition hover:shadow-md"
            >
              <span className="absolute top-2 right-2 rounded-full bg-red-50 px-2 py-0.5 text-[10px] font-semibold text-[#DC2626]">
                HSK {w.hsk_level}
              </span>
              <p className="mt-2 text-3xl font-bold text-[#DC2626]">{w.hanzi}</p>
              <p className="mt-1 text-sm text-gray-500 italic">{w.pinyin}</p>
              <p className="mt-2 font-medium">{w.meaning_vi}</p>
              <p className="text-sm text-gray-400">{w.meaning_en}</p>
              {supported && (
                <button
                  type="button"
                  onClick={() => speak(w.hanzi)}
                  title={t('vocab.speak')}
                  aria-label={`${t('vocab.speak')} ${w.hanzi}`}
                  className="absolute right-2 bottom-2 rounded-full p-2 text-gray-400 hover:bg-red-50 hover:text-[#DC2626]"
                >
                  <Volume2 size={18} />
                </button>
              )}
            </div>
          ))}
        </div>
      )}
    </section>
  )
}
