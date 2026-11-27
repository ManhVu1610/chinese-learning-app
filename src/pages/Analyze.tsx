import { Search } from 'lucide-react'
import { useState } from 'react'
import { useTranslation } from 'react-i18next'
import CharAnalysis from '../components/CharAnalysis'
import Page from '../components/layout/Page'

const examples = ['好', '学', '国', '说', '爱', '明']
const firstHan = (s: string) => [...s].find((c) => /\p{Script=Han}/u.test(c)) ?? ''

export default function Analyze() {
  const { t } = useTranslation()
  const [input, setInput] = useState('好')
  const ch = firstHan(input)

  return (
    <Page feature="analyze" description={t('analyze.intro')}>
      <div className="flex flex-wrap items-center gap-3">
        <div className="relative w-40">
          <Search size={18} className="absolute top-1/2 left-3.5 -translate-y-1/2 text-ink-muted" />
          <input
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onFocus={(e) => e.target.select()}
            placeholder="字"
            aria-label={t('analyze.placeholder')}
            className="field pl-10 text-xl"
          />
        </div>
        <span className="text-sm text-ink-soft">{t('analyze.try')}</span>
        {examples.map((e) => (
          <button key={e} type="button" onClick={() => setInput(e)} className="btn px-3 py-1 text-lg">
            {e}
          </button>
        ))}
      </div>

      {!ch ? <p className="box mt-6 p-8 text-center text-ink-soft">{t('analyze.placeholder')}</p> : <CharAnalysis key={ch} ch={ch} />}
    </Page>
  )
}
