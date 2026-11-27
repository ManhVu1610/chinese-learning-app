import clsx from 'clsx'
import { Search } from 'lucide-react'
import { useEffect, useMemo, useState } from 'react'
import { useTranslation } from 'react-i18next'
import SaveButton from '../components/SaveButton'
import WordCard from '../components/WordCard'
import { normalize } from '../data/dictionary'
import { useDictionary } from '../hooks/useDictionary'
import type { HSKLevel } from '../types'
import Page from '../components/layout/Page'

const levels: HSKLevel[] = [1, 2, 3, 4, 5, 6]
const PAGE = 60

export default function Vocabulary() {
  const { t } = useTranslation()
  const { words, loading } = useDictionary()
  const [query, setQuery] = useState('')
  const [level, setLevel] = useState<HSKLevel | 'all'>(1)
  const [shown, setShown] = useState(PAGE)

  // Đổi bộ lọc thì hiển thị lại từ đầu.
  useEffect(() => setShown(PAGE), [query, level])

  const counts = useMemo(() => {
    const c: Record<number, number> = {}
    for (const w of words) c[w.hsk_level] = (c[w.hsk_level] ?? 0) + 1
    return c
  }, [words])

  const filtered = useMemo(() => {
    const raw = query.trim()
    const q = normalize(raw)
    return words.filter(
      (w) =>
        (level === 'all' || w.hsk_level === level) &&
        (!q ||
          w.hanzi.includes(raw) ||
          normalize(w.pinyin).includes(q) ||
          normalize(w.meaning_vi).includes(q) ||
          normalize(w.han_viet ?? '').includes(q)),
    )
  }, [words, query, level])

  return (
    <Page feature="vocab" size="wide">
      <div className="relative">
        <Search size={18} className="absolute top-1/2 left-3.5 -translate-y-1/2 text-ink-muted" />
        <input
          type="search"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder={t('vocab.search_placeholder')}
          className="field pl-10"
        />
      </div>

      <div className="mt-5 flex flex-wrap gap-2.5">
        {(['all', ...levels] as const).map((lv) => (
          <button
            key={lv}
            type="button"
            onClick={() => setLevel(lv)}
            aria-pressed={level === lv}
            className={clsx('btn px-4 py-1.5 text-sm', level === lv ? 'bg-sand' : 'text-ink-soft')}
          >
            {lv === 'all' ? t('vocab.all') : `HSK ${lv}`}
            {lv !== 'all' && counts[lv] ? <span className="text-xs font-normal text-ink-muted">{counts[lv]}</span> : null}
          </button>
        ))}
      </div>

      {loading ? (
        <p className="box mt-6 p-8 text-center text-ink-soft">{t('common.loading')}</p>
      ) : (
        <>
          <p className="mt-5 text-sm font-medium text-ink-soft">
            {t('vocab.showing', { count: filtered.length, total: words.length })}
          </p>

          {filtered.length === 0 ? (
            <p className="box mt-6 p-8 text-center text-ink-soft">{t('vocab.empty')}</p>
          ) : (
            <>
              <div className="mt-4 grid grid-cols-2 gap-5 md:grid-cols-3 lg:grid-cols-4">
                {filtered.slice(0, shown).map((w) => (
                  <WordCard key={w.id} word={w} actions={<SaveButton word={w} />} />
                ))}
              </div>
              {shown < filtered.length && (
                <div className="mt-8 text-center">
                  <button type="button" onClick={() => setShown((n) => n + PAGE)} className="btn px-6 py-2.5">
                    {t('vocab.show_more', { count: Math.min(PAGE, filtered.length - shown), left: filtered.length - shown })}
                  </button>
                </div>
              )}
            </>
          )}
        </>
      )}
    </Page>
  )
}
