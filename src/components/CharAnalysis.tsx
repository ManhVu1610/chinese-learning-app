import { Volume2 } from 'lucide-react'
import { useEffect, useMemo, useState, type ReactNode } from 'react'
import { useTranslation } from 'react-i18next'
import { loadChars, type CharInfo } from '../data/lookup'
import { getRadicalByForm, getRadicalById } from '../data/radicals'
import { useDictionary } from '../hooks/useDictionary'
import { useSpeech } from '../hooks/useSpeech'
import type { Radical } from '../types'
import SaveButton from './SaveButton'
import WordCard from './WordCard'

/**
 * Phân tích một chữ Hán: pinyin, nghĩa, Hán Việt, số nét, bộ thủ và các từ ghép trong dữ liệu HSK.
 * Dùng trên trang "Phân tích Hán tự" và trong hộp thoại mở từ thẻ từ / thẻ bộ thủ (compact).
 */
export default function CharAnalysis({ ch, compact = false }: { ch: string; compact?: boolean }) {
  const { t, i18n } = useTranslation()
  const { speak, supported } = useSpeech()
  const { words, loading } = useDictionary()
  const [chars, setChars] = useState<CharInfo | null>(null)

  useEffect(() => {
    loadChars().then(setChars)
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
    const known = Boolean(entry || info || compounds.length || self)
    return { entry, readings: info?.p ?? [], strokes: info?.s ?? null, radicals: radicalList, compounds, known }
  }, [ch, words, chars])

  const ready = !loading && chars !== null
  const meaning = (w: { meaning_vi: string; meaning_en: string }) => (i18n.language === 'en' ? w.meaning_en || w.meaning_vi : w.meaning_vi)

  if (!ready) return <p className={compact ? 'p-6 text-center text-ink-soft' : 'box mt-6 p-8 text-center text-ink-soft'}>{t('common.loading')}</p>
  if (!result) return null
  if (!result.known)
    return (
      <div className={compact ? 'p-6 text-center' : 'box mt-6 p-8 text-center'}>
        <p className="text-8xl font-bold text-brick">{ch}</p>
        <p className="mt-4 text-lg font-semibold">{t('analyze.not_found')}</p>
      </div>
    )

  return (
    <>
      <div className={compact ? 'grid gap-4 sm:grid-cols-[auto_1fr]' : 'mt-6 grid gap-6 md:grid-cols-[auto_1fr]'}>
        <div className={compact ? 'box flex flex-col items-center justify-center px-8 py-5' : 'box flex flex-col items-center justify-center px-12 py-8 shadow-block-lg'}>
          <p className={compact ? 'text-7xl leading-none font-bold text-brick' : 'text-8xl leading-none font-bold text-brick'}>{ch}</p>
          {supported && (
            <button type="button" onClick={() => speak(ch)} title={t('vocab.speak')} aria-label={t('vocab.speak')} className="btn mt-4 p-2.5">
              <Volume2 size={18} />
            </button>
          )}
        </div>

        <div className="box divide-y-2 divide-line overflow-hidden">
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
            {result.strokes ? <span className="text-xl font-bold">{result.strokes}</span> : <span className="text-ink-muted">—</span>}
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

      <h2 className={compact ? 'mt-5 font-bold' : 'mt-10 text-xl font-bold'}>
        {t('analyze.compounds')} <span className="text-ink-soft">({result.compounds.length})</span>
      </h2>
      {result.compounds.length === 0 ? (
        <p className="mt-2 text-sm text-ink-soft">{t('analyze.no_compounds')}</p>
      ) : compact ? (
        // Trong hộp thoại: danh sách gọn, bấm để nghe.
        <ul className="mt-2 grid max-h-64 gap-1.5 overflow-y-auto pr-1 sm:grid-cols-2">
          {result.compounds.map((w) => (
            <li key={w.id}>
              <button
                type="button"
                onClick={() => supported && speak(w.hanzi)}
                className="flex w-full items-baseline gap-2 rounded-xl border-2 border-line px-2.5 py-1.5 text-left hover:border-ink hover:bg-paper"
              >
                <span className="text-lg font-bold text-brick">{w.hanzi}</span>
                <span className="text-xs text-ink-soft italic">{w.pinyin}</span>
                <span className="min-w-0 flex-1 truncate text-sm">{meaning(w)}</span>
                <span className="tag shrink-0 px-1.5 text-[10px]">HSK {w.hsk_level}</span>
              </button>
            </li>
          ))}
        </ul>
      ) : (
        <div className="mt-4 grid grid-cols-2 gap-5 md:grid-cols-3 lg:grid-cols-4">
          {result.compounds.map((w) => (
            <WordCard key={w.id} word={w} actions={<SaveButton word={w} />} />
          ))}
        </div>
      )}
    </>
  )
}

function Row({ label, children }: { label: string; children: ReactNode }) {
  return (
    <div className="grid grid-cols-[6.5rem_1fr] items-center gap-3 px-4 py-3">
      <span className="text-xs font-semibold text-ink-muted uppercase">{label}</span>
      <div>{children}</div>
    </div>
  )
}
