import { Search, Volume2 } from 'lucide-react'
import { useEffect, useMemo, useState } from 'react'
import { useTranslation } from 'react-i18next'
import SaveButton from '../components/SaveButton'
import WordCard from '../components/WordCard'
import { getRadicalByForm, getRadicalById } from '../data/radicals'
import { useDictionary } from '../hooks/useDictionary'
import { useSpeech } from '../hooks/useSpeech'
import type { Radical } from '../types'

/** s = số nét, r = id bộ thủ, p = các cách đọc gom từ từ ghép */
type CharInfo = Record<string, { s: number | null; r: number[]; p?: string[] }>

const examples = ['好', '学', '国', '说', '爱', '明']
const firstHan = (s: string) => [...s].find((c) => /\p{Script=Han}/u.test(c)) ?? ''

export default function Analyze() {
  const { t, i18n } = useTranslation()
  const { speak, supported } = useSpeech()
  const { words, loading } = useDictionary()
  const [chars, setChars] = useState<CharInfo | null>(null)
  const [input, setInput] = useState('好')
  const ch = firstHan(input)

  useEffect(() => {
    import('../data/generated/chars.json').then((m) => setChars(m.default as unknown as CharInfo))
  }, [])

  const result = useMemo(() => {
    if (!ch) return null
    const entry = words.find((w) => w.hanzi === ch)
    const info = chars?.[ch]
    const radicalList: Radical[] = []
    const self = getRadicalByForm(ch)
    if (self) radicalList.push(self)
    for (const id of info?.r ?? []) {
      const r = getRadicalById(id)
      if (r && !radicalList.includes(r)) radicalList.push(r)
    }
    const compounds = words
      .filter((w) => w.hanzi !== ch && w.hanzi.includes(ch))
      .sort((a, b) => a.hsk_level - b.hsk_level || a.hanzi.length - b.hanzi.length)
      .slice(0, 24)
    const known = Boolean(entry || info || compounds.length)
    return { entry, readings: info?.p ?? [], strokes: info?.s ?? null, radicals: radicalList, compounds, known }
  }, [ch, words, chars])

  const ready = !loading && chars !== null
  const meaning = (w: { meaning_vi: string; meaning_en: string }) =>
    i18n.language === 'en' ? w.meaning_en || w.meaning_vi : w.meaning_vi

  return (
    <section className="mx-auto max-w-5xl px-4 py-8">
      <h1 className="text-3xl font-bold">{t('tools.analyze')}</h1>
      <p className="mt-2 text-ink-soft">{t('analyze.intro')}</p>

      <div className="mt-6 flex flex-wrap items-center gap-3">
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

      {!ch ? (
        <p className="box mt-6 p-8 text-center text-ink-soft">{t('analyze.placeholder')}</p>
      ) : !ready ? (
        <p className="box mt-6 p-8 text-center text-ink-soft">{t('common.loading')}</p>
      ) : result && !result.known ? (
        <div className="box mt-6 p-8 text-center">
          <p className="text-8xl font-bold text-brick">{ch}</p>
          <p className="mt-4 text-lg font-semibold">{t('analyze.not_found')}</p>
        </div>
      ) : (
        result && (
          <>
            <div className="mt-6 grid gap-6 md:grid-cols-[auto_1fr]">
              <div className="box flex flex-col items-center justify-center px-12 py-8 shadow-block-lg">
                <p className="text-8xl leading-none font-bold text-brick">{ch}</p>
                {supported && (
                  <button
                    type="button"
                    onClick={() => speak(ch)}
                    title={t('vocab.speak')}
                    aria-label={t('vocab.speak')}
                    className="btn mt-6 p-2.5"
                  >
                    <Volume2 size={20} />
                  </button>
                )}
              </div>

              <div className="box divide-y-2 divide-line">
                <Row label={t('analyze.pinyin')}>
                  {result.entry ? (
                    <span className="text-xl italic">{result.entry.pinyin}</span>
                  ) : result.readings.length ? (
                    <>
                      <span className="text-xl italic">{result.readings.join(', ')}</span>
                      <p className="text-xs text-ink-muted">{t('analyze.from_compounds')}</p>
                    </>
                  ) : (
                    <span className="text-ink-muted">{t('analyze.no_single')}</span>
                  )}
                </Row>
                <Row label={t('analyze.meaning')}>
                  {result.entry ? (
                    <>
                      <p className="font-semibold">{meaning(result.entry)}</p>
                      {result.entry.han_viet && (
                        <p className="text-sm text-ink-soft">
                          {t('analyze.han_viet')}: {result.entry.han_viet}
                        </p>
                      )}
                    </>
                  ) : (
                    <span className="text-ink-muted">{t('analyze.see_compounds')}</span>
                  )}
                </Row>
                <Row label={t('analyze.strokes')}>
                  {result.strokes ? (
                    <span className="text-xl font-bold">{result.strokes}</span>
                  ) : (
                    <span className="text-ink-muted">—</span>
                  )}
                </Row>
                <Row label={t('analyze.radicals')}>
                  {result.radicals.length ? (
                    <div className="flex flex-wrap gap-2">
                      {result.radicals.map((r, i) => (
                        <span key={r.id} className={i === 0 ? 'tag bg-sand py-1 text-sm' : 'tag py-1 text-sm'}>
                          <span className="text-lg text-brick">{r.radical}</span>
                          {r.han_viet} · {r.meaning_vi.split(/[,;(]/)[0]}
                        </span>
                      ))}
                    </div>
                  ) : (
                    <span className="text-ink-muted">{t('analyze.no_radical')}</span>
                  )}
                </Row>
              </div>
            </div>

            <h2 className="mt-10 text-xl font-bold">
              {t('analyze.compounds')} <span className="text-ink-soft">({result.compounds.length})</span>
            </h2>
            {result.compounds.length === 0 ? (
              <p className="mt-3 text-ink-soft">{t('analyze.no_compounds')}</p>
            ) : (
              <div className="mt-4 grid grid-cols-2 gap-5 md:grid-cols-3 lg:grid-cols-4">
                {result.compounds.map((w) => (
                  <WordCard key={w.id} word={w} actions={<SaveButton word={w} />} />
                ))}
              </div>
            )}
          </>
        )
      )}
    </section>
  )
}

function Row({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="grid grid-cols-[7rem_1fr] items-center gap-3 px-4 py-3">
      <span className="text-xs font-semibold text-ink-muted uppercase">{label}</span>
      <div>{children}</div>
    </div>
  )
}
