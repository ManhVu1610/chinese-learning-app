import clsx from 'clsx'
import { Volume2 } from 'lucide-react'
import { useState } from 'react'
import { useTranslation } from 'react-i18next'
import {
  finalGroups,
  initials,
  sampleChar,
  standaloneFinal,
  syllableCount,
  syllableRows,
  withTone,
} from '../data/pinyin'
import { useSpeech } from '../hooks/useSpeech'

const tones = [1, 2, 3, 4] as const

/** Âm được chọn: label là chữ hiển thị (vd "iu"), syllable là âm tiết dùng để đọc (vd "you"). */
interface Selected {
  label: string
  syllable: string
}

export default function Pinyin() {
  const { t } = useTranslation()
  const { speak, supported } = useSpeech()
  const [selected, setSelected] = useState<Selected>({ label: 'ma', syllable: 'ma' })

  /**
   * Đọc bằng chữ Hán mẫu (chữ chỉ có một cách đọc), để giọng tiếng Trung phát âm đúng âm và thanh.
   * Không có chữ mẫu thì không đọc: đưa chữ Latin cho giọng tiếng Trung đọc sẽ ra âm sai.
   */
  const say = (toned: string) => {
    const ch = sampleChar(toned)
    if (ch) speak(ch)
  }

  const pick = (label: string, syllable = label) => {
    setSelected({ label, syllable })
    // Đọc thanh đầu tiên có chữ mẫu.
    const first = tones.map((tn) => withTone(syllable, tn)).find((s) => sampleChar(s))
    if (first) say(first)
  }

  return (
    <section className="mx-auto max-w-6xl px-4 py-8">
      <h1 className="text-3xl font-bold">{t('tools.pinyin')}</h1>
      <p className="mt-2 text-ink-soft">{t('pinyin.intro', { count: syllableCount })}</p>
      {!supported && <p className="mt-3 border-2 border-ink bg-apricot px-3 py-2 text-sm">{t('pinyin.no_speech')}</p>}

      {/* Bảng 4 thanh điệu của âm đang chọn: dính ở trên khi cuộn */}
      <div className="box sticky top-20 z-10 mt-6 p-4">
        <div className="flex flex-wrap items-center gap-4">
          <div className="min-w-24">
            <p className="text-xs font-semibold text-ink-muted uppercase">{t('pinyin.selected')}</p>
            <p className="text-3xl font-bold">{selected.label}</p>
            {selected.label !== selected.syllable && (
              <p className="text-xs text-ink-soft">{t('pinyin.written_as', { syllable: selected.syllable })}</p>
            )}
          </div>
          <div className="grid flex-1 grid-cols-4 gap-3">
            {tones.map((tone) => {
              const toned = withTone(selected.syllable, tone)
              const ch = sampleChar(toned)
              return (
                <button
                  key={tone}
                  type="button"
                  onClick={() => say(toned)}
                  disabled={!ch}
                  className="btn flex-col gap-0.5 py-2"
                  title={ch ? t('pinyin.tone', { tone }) : t('pinyin.no_sample')}
                >
                  <span className="text-xl font-bold">{toned}</span>
                  <span className="text-xs font-normal text-ink-soft">
                    {ch ? `${ch} · ${t('pinyin.tone', { tone })}` : t('pinyin.no_sample_short')}
                  </span>
                </button>
              )
            })}
          </div>
          <Volume2 className="hidden text-ink-muted sm:block" size={20} aria-hidden />
        </div>
      </div>

      {/* Phụ âm đầu */}
      <h2 className="mt-10 text-xl font-bold">{t('pinyin.initials')} 声母</h2>
      <div className="mt-3 grid grid-cols-4 gap-3 sm:grid-cols-6 lg:grid-cols-12">
        {initials.map(({ initial, reading }) => (
          <button
            key={initial}
            type="button"
            onClick={() => pick(initial, reading)}
            className={clsx('btn py-2 text-lg', selected.label === initial && 'bg-sand')}
          >
            {initial}
          </button>
        ))}
      </div>

      {/* Vần */}
      <h2 className="mt-10 text-xl font-bold">{t('pinyin.finals')} 韵母</h2>
      <div className="mt-3 space-y-4">
        {finalGroups.map(({ key, finals }) => (
          <div key={key}>
            <p className="mb-2 text-sm font-semibold text-ink-soft">{t(`pinyin.group_${key}`)}</p>
            <div className="flex flex-wrap gap-2.5">
              {finals.map((f) => (
                <button
                  key={f}
                  type="button"
                  onClick={() => pick(f, standaloneFinal[f] ?? f)}
                  className={clsx('btn min-w-14 px-3 py-1.5', selected.label === f && 'bg-sand')}
                >
                  {f}
                </button>
              ))}
            </div>
          </div>
        ))}
      </div>

      {/* Bảng âm tiết đầy đủ */}
      <h2 className="mt-10 text-xl font-bold">{t('pinyin.table')}</h2>
      <p className="mt-1 text-sm text-ink-soft">{t('pinyin.table_hint')}</p>
      <div className="box mt-3 overflow-x-auto">
        <table className="w-full border-collapse text-sm">
          <tbody>
            {syllableRows.map(({ initial, syllables }) => (
              <tr key={initial || 'zero'} className="border-b-2 border-line last:border-b-0">
                <th
                  scope="row"
                  className="sticky left-0 w-16 border-r-2 border-ink bg-sand px-3 py-2 text-left text-base font-bold"
                >
                  {initial || '∅'}
                </th>
                <td className="px-3 py-2">
                  <div className="flex flex-wrap gap-1.5">
                    {syllables.map((s) => (
                      <button
                        key={s}
                        type="button"
                        onClick={() => pick(s)}
                        className={clsx(
                          'border-2 px-2 py-0.5 font-medium transition-colors',
                          selected.label === s
                            ? 'border-ink bg-sand'
                            : 'border-transparent hover:border-ink hover:bg-paper',
                        )}
                      >
                        {s}
                      </button>
                    ))}
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </section>
  )
}
