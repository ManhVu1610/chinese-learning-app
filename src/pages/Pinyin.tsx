import clsx from 'clsx'
import { ListMusic } from 'lucide-react'
import { useEffect, useRef, useState } from 'react'
import { useTranslation } from 'react-i18next'
import {
  gridFinalGroups,
  gridInitials,
  initials,
  neutralSample,
  sampleChar,
  spell,
  standaloneFinal,
  syllableCount,
  withTone,
} from '../data/pinyin'
import { useSpeech } from '../hooks/useSpeech'
import Page from '../components/layout/Page'

const tones = [1, 2, 3, 4] as const
const readingOf = Object.fromEntries(initials.map((i) => [i.initial, i.reading]))

/** Âm được chọn: label là chữ hiển thị (vd "iu"), syllable là âm tiết dùng để đọc (vd "you"). */
interface Selected {
  label: string
  syllable: string
}

// Màu nền nhẹ cho từng nhóm vần, để dò cột dễ hơn.
const groupTint: Record<string, string> = { open: '', i: 'bg-sky/25', u: 'bg-sage/25', ü: 'bg-lilac/25' }

export default function Pinyin() {
  const { t } = useTranslation()
  const { speak, supported } = useSpeech()
  const [selected, setSelected] = useState<Selected>({ label: 'ma', syllable: 'ma' })
  const timers = useRef<number[]>([])
  const [playing, setPlaying] = useState(0) // thanh đang phát khi "Đọc cả 4 thanh" (0 = không)

  const stopAll = () => {
    timers.current.forEach(clearTimeout)
    timers.current = []
    setPlaying(0)
  }
  useEffect(() => stopAll, [])

  /**
   * Đọc bằng chữ Hán mẫu (chữ chỉ có một cách đọc), để giọng tiếng Trung phát âm đúng âm và thanh.
   * Không có chữ mẫu thì không đọc: đưa chữ Latin cho giọng tiếng Trung đọc sẽ ra âm sai.
   */
  const say = (toned: string) => {
    const ch = sampleChar(toned)
    if (ch) speak(ch)
  }

  const pick = (label: string, syllable = label) => {
    stopAll()
    setSelected({ label, syllable })
    // Đọc thanh đầu tiên có chữ mẫu.
    const first = tones.map((tn) => withTone(syllable, tn)).find((s) => sampleChar(s))
    if (first) say(first)
  }

  // Đọc lần lượt các thanh có chữ mẫu: mā → má → mǎ → mà.
  const playAll = () => {
    stopAll()
    const list = tones.filter((tn) => sampleChar(withTone(selected.syllable, tn)))
    list.forEach((tn, i) => {
      timers.current.push(
        window.setTimeout(() => {
          setPlaying(tn)
          say(withTone(selected.syllable, tn))
        }, i * 1100),
      )
    })
    timers.current.push(window.setTimeout(() => setPlaying(0), list.length * 1100))
  }

  const neutral = neutralSample(selected.syllable)

  return (
    <Page feature="pinyin" size="full" description={t('pinyin.intro', { count: syllableCount })}>
      {!supported && <p className="mb-4 rounded-xl border-2 border-ink bg-apricot px-3 py-2 text-sm">{t('pinyin.no_speech')}</p>}

      <div>
        {/* Thanh điệu của âm đang chọn */}
        <div className="box p-4">
          <div className="flex flex-wrap items-center gap-4">
            <div className="min-w-24">
              <p className="text-xs font-semibold text-ink-muted uppercase">{t('pinyin.selected')}</p>
              <p className="text-3xl font-bold">{selected.label}</p>
              {selected.label !== selected.syllable && (
                <p className="text-xs text-ink-soft">{t('pinyin.written_as', { syllable: selected.syllable })}</p>
              )}
            </div>
            <div className="grid flex-1 grid-cols-2 gap-2.5 sm:grid-cols-5">
              {tones.map((tone) => {
                const toned = withTone(selected.syllable, tone)
                const ch = sampleChar(toned)
                return (
                  <button
                    key={tone}
                    type="button"
                    onClick={() => say(toned)}
                    disabled={!ch}
                    className={clsx('btn flex-col gap-0.5 py-2', playing === tone && 'bg-sand')}
                    title={ch ? t('pinyin.tone', { tone }) : t('pinyin.no_sample')}
                  >
                    <span className="text-[11px] font-semibold text-ink-soft">{t('pinyin.tone', { tone })}</span>
                    <span className="text-xl leading-tight font-bold">{toned}</span>
                    <span className="font-kai text-base leading-tight font-normal text-ink-soft">{ch ?? '—'}</span>
                  </button>
                )
              })}
              {/* Thanh nhẹ: đọc trong một từ, vì đứng riêng không có thanh nhẹ */}
              <button
                type="button"
                onClick={() => neutral && speak(neutral.w)}
                disabled={!neutral}
                className="btn col-span-2 flex-col gap-0.5 py-2 sm:col-span-1"
                title={neutral ? t('pinyin.neutral_hint', { word: neutral.w }) : t('pinyin.no_neutral')}
              >
                <span className="text-[11px] font-semibold text-ink-soft">{t('pinyin.neutral')}</span>
                <span className="text-xl leading-tight font-bold">{selected.syllable}</span>
                <span className="text-base leading-tight font-normal text-ink-soft">
                  {neutral ? (
                    <>
                      <span className="font-kai">{neutral.w}</span> <span className="text-xs">{neutral.p}</span>
                    </>
                  ) : (
                    '—'
                  )}
                </span>
              </button>
            </div>
            <button type="button" onClick={playAll} className="btn px-4 py-2 text-sm">
              <ListMusic size={16} />
              {t('pinyin.play_all')}
            </button>
          </div>
        </div>
      </div>

      {/* Bảng âm tiết: hàng = phụ âm đầu, cột = vần */}
      <div className="mt-5 flex flex-wrap items-baseline justify-between gap-2">
        <h2 className="text-xl font-bold">{t('pinyin.table')}</h2>
        <p className="text-sm text-ink-soft">{t('pinyin.table_hint')}</p>
      </div>
      <div className="box mt-3 max-h-[75vh] overflow-auto">
        <table className="border-separate border-spacing-0 text-sm">
          <thead className="sticky top-0 z-20">
            <tr>
              <th
                rowSpan={2}
                className="sticky left-0 z-30 min-w-14 border-r-2 border-b-2 border-ink bg-brick px-2 py-1.5 whitespace-nowrap text-white"
              >
                <span className="font-kai">声母</span>
                <span className="block font-kai text-[11px] font-normal">韵母 →</span>
              </th>
              {gridFinalGroups.map((g) => (
                <th
                  key={g.key}
                  colSpan={g.finals.length}
                  className={clsx(
                    'border-b-2 border-l-2 border-line bg-card px-2 py-1 text-left text-xs font-bold text-ink-soft',
                    groupTint[g.key],
                  )}
                >
                  {t(`pinyin.grp_${g.key}`)}
                </th>
              ))}
            </tr>
            <tr>
              {gridFinalGroups.map((g) =>
                g.finals.map((f, i) => (
                  <th key={f} className={clsx('border-b-2 border-ink bg-sand p-0', i === 0 && 'border-l-2 border-l-line')}>
                    <button
                      type="button"
                      onClick={() => pick(f, f === '-i' ? 'zhi' : (standaloneFinal[f] ?? f))}
                      className={clsx('w-full px-2 py-1.5 font-bold whitespace-nowrap hover:bg-coral', selected.label === f && 'bg-coral')}
                    >
                      {f}
                    </button>
                  </th>
                )),
              )}
            </tr>
          </thead>
          <tbody>
            {gridInitials.map((ini) => (
              <tr key={ini || 'zero'} className="group">
                <th scope="row" className="sticky left-0 z-10 border-r-2 border-ink bg-sand p-0">
                  {ini ? (
                    <button
                      type="button"
                      onClick={() => pick(ini, readingOf[ini])}
                      className={clsx('w-full px-3 py-1.5 text-left font-bold hover:bg-coral', selected.label === ini && 'bg-coral')}
                    >
                      {ini}
                    </button>
                  ) : (
                    <span className="block px-3 py-1.5 text-left font-bold" title={t('pinyin.zero_initial')}>
                      ∅
                    </span>
                  )}
                </th>
                {gridFinalGroups.map((g) =>
                  g.finals.map((f, i) => {
                    const s = spell(ini, f)
                    return (
                      <td
                        key={f}
                        className={clsx(
                          'border-b border-line p-0 text-center group-hover:bg-paper/70',
                          groupTint[g.key],
                          i === 0 && 'border-l-2 border-l-line',
                        )}
                      >
                        {s ? (
                          <button
                            type="button"
                            onClick={() => pick(s)}
                            className={clsx(
                              'w-full px-1.5 py-1.5 font-semibold whitespace-nowrap hover:bg-coral',
                              selected.label === s && 'bg-coral ring-2 ring-ink ring-inset',
                            )}
                          >
                            {s}
                          </button>
                        ) : (
                          <span className="block px-1.5 py-1.5 text-ink-muted/60" aria-hidden>
                            ·
                          </span>
                        )}
                      </td>
                    )
                  }),
                )}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </Page>
  )
}
