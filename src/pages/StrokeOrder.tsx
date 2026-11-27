import { Search } from 'lucide-react'
import { useState } from 'react'
import { useTranslation } from 'react-i18next'
import Page from '../components/layout/Page'
import StrokePractice from '../components/StrokePractice'
import { StrokeGlyph } from '../components/worksheet/GridCell'
import { useStrokes } from '../lib/strokes'

const examples = ['永', '我', '你好', '学习', '中国', '谢谢']
const hanChars = (s: string) => [...s].filter((c) => /\p{Script=Han}/u.test(c))

/** Nét bút thuận: xem từng nét theo đúng thứ tự, xem bảng các bước và tập viết lại từng nét. */
export default function StrokeOrder() {
  const { t } = useTranslation()
  const [input, setInput] = useState('永')
  const chars = hanChars(input).slice(0, 8)
  const text = chars.join('')
  const strokes = useStrokes(chars)

  return (
    <Page feature="strokes">
      <div className="flex flex-wrap items-center gap-3">
        <div className="relative w-56">
          <Search size={18} className="absolute top-1/2 left-3.5 -translate-y-1/2 text-ink-muted" />
          <input
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onFocus={(e) => e.target.select()}
            placeholder="汉字"
            aria-label={t('strokepage.input')}
            className="field pl-10 text-xl"
            lang="zh-CN"
          />
        </div>
        <span className="text-sm text-ink-soft">{t('analyze.try')}</span>
        {examples.map((e) => (
          <button key={e} type="button" onClick={() => setInput(e)} className="btn px-3 py-1 text-lg">
            {e}
          </button>
        ))}
      </div>

      {!text ? (
        <p className="box mt-6 p-8 text-center text-ink-soft">{t('strokepage.empty')}</p>
      ) : (
        <div className="mt-6 grid gap-6 md:grid-cols-[auto_1fr]">
          <div className="box flex justify-center p-5">
            <StrokePractice key={text} text={text} size={260} />
          </div>

          {/* Bảng các bước: nét mới nhất tô đỏ */}
          <div className="box p-5">
            <h2 className="font-bold">{t('strokepage.steps')}</h2>
            <div className="mt-3 space-y-4">
              {chars.map((c, ci) => {
                const d = strokes[c]
                return (
                  <div key={`${c}-${ci}`}>
                    <p className="text-sm font-semibold text-ink-soft">
                      <span className="text-xl text-brick">{c}</span>{' '}
                      {d ? t('stroke.count', { count: d.strokes.length }) : d === null ? t('stroke.missing') : t('common.loading')}
                    </p>
                    {d && (
                      <div className="mt-1.5 flex flex-wrap gap-1.5">
                        {d.strokes.map((_, i) => (
                          <span key={i} className="relative rounded-lg border-2 border-line bg-card">
                            <StrokeGlyph data={d} upto={i + 1} className="h-12 w-12" />
                            <span className="absolute top-0.5 left-1 text-[9px] font-bold text-ink-muted">{i + 1}</span>
                          </span>
                        ))}
                      </div>
                    )}
                  </div>
                )
              })}
            </div>
          </div>
        </div>
      )}
    </Page>
  )
}
