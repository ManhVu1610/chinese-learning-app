import { Search } from 'lucide-react'
import { useEffect, useMemo, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { Link, useSearchParams } from 'react-router-dom'
import SaveButton from '../components/SaveButton'
import WordCard from '../components/WordCard'
import { searchWords } from '../data/dictionary'
import { useDictionary } from '../hooks/useDictionary'
import Page from '../components/layout/Page'

export default function Dictionary() {
  const { t } = useTranslation()
  const { words, loading } = useDictionary()
  // Mở từ ô tra nhanh ở trang chủ: /dictionary?q=...
  const [params] = useSearchParams()
  const [input, setInput] = useState(() => params.get('q') ?? '')
  const [query, setQuery] = useState('')

  // Tìm khi gõ, chờ 300ms sau phím cuối.
  useEffect(() => {
    const id = setTimeout(() => setQuery(input), 300)
    return () => clearTimeout(id)
  }, [input])

  const results = useMemo(() => searchWords(words, query), [words, query])

  return (
    <Page feature="dictionary" description={loading ? t('common.loading') : t('dictionary.intro', { count: words.length })}>
      <div className="relative">
        <Search size={22} className="absolute top-1/2 left-4 -translate-y-1/2 text-ink-muted" />
        <input
          type="search"
          autoFocus
          value={input}
          onChange={(e) => setInput(e.target.value)}
          placeholder={t('dictionary.placeholder')}
          className="field py-4 pl-12 text-lg shadow-block"
        />
      </div>

      {query.trim() ? (
        <>
          <p className="mt-6 text-sm font-medium text-ink-soft">{t('dictionary.results', { count: results.length })}</p>
          {results.length === 0 ? (
            <p className="box mt-4 p-8 text-center text-ink-soft">{t('dictionary.no_results')}</p>
          ) : (
            <div className="mt-4 grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-3">
              {results.map((w) => (
                <WordCard key={w.id} word={w} actions={<SaveButton word={w} />} />
              ))}
            </div>
          )}
        </>
      ) : (
        <div className="mx-auto mt-8 max-w-2xl text-center text-sm text-ink-soft">
          <p>{t('dictionary.hint')}</p>
          <p className="mt-2">
            {t('dictionary.saved_hint')}{' '}
            <Link to="/notebook" className="font-semibold text-ink underline decoration-2 underline-offset-4">
              {t('tools.notebook')}
            </Link>
          </p>
        </div>
      )}
    </Page>
  )
}
