import clsx from 'clsx'
import { Volume2 } from 'lucide-react'
import type { ReactNode } from 'react'
import { useTranslation } from 'react-i18next'
import { useSpeech } from '../hooks/useSpeech'
import type { HSKLevel, Word } from '../types'
import AnalyzeButton from './AnalyzeButton'
import StrokeButton from './StrokeButton'

export const levelColor: Record<HSKLevel, string> = {
  1: 'bg-sage',
  2: 'bg-sky',
  3: 'bg-sand',
  4: 'bg-apricot',
  5: 'bg-coral',
  6: 'bg-brick-soft',
}

/** Thẻ từ vựng: chữ Hán, pinyin, nghĩa VI/EN, nhãn HSK, nút phát âm và các nút thêm (lưu, xóa...). */
export default function WordCard({ word, actions }: { word: Word; actions?: ReactNode }) {
  const { t, i18n } = useTranslation()
  const { speak, supported } = useSpeech()
  const primary = i18n.language === 'en' ? word.meaning_en : word.meaning_vi
  const secondary = i18n.language === 'en' ? word.meaning_vi : word.meaning_en

  return (
    <div className="box relative flex flex-col p-4">
      {word.custom ? (
        <span className="tag absolute top-3 right-3">{t('notebook.custom_tag')}</span>
      ) : (
        <span className={clsx('tag absolute top-3 right-3', levelColor[word.hsk_level])}>HSK {word.hsk_level}</span>
      )}
      <p className="mt-3 pr-14 text-3xl font-bold break-all text-brick">{word.hanzi}</p>
      <p className="mt-1 text-sm text-ink-soft italic">
        {word.pinyin}
        {word.han_viet && <span className="not-italic text-ink-muted"> · {word.han_viet}</span>}
      </p>
      <div className="mt-3 flex-1 border-t-2 border-dashed border-line pt-3">
        <p className="font-semibold">{primary}</p>
        {secondary && <p className="text-sm text-ink-muted">{secondary}</p>}
        {word.example && (
          <button
            type="button"
            onClick={() => supported && speak(word.example!)}
            title={supported ? t('vocab.speak_example') : undefined}
            className="mt-3 block w-full rounded-xl border-l-4 border-sage bg-paper px-2.5 py-1.5 text-left hover:bg-sand/40"
          >
            <span className="block text-base leading-snug">{word.example}</span>
            {word.example_pinyin && <span className="block text-xs text-ink-soft italic">{word.example_pinyin}</span>}
            {word.example_vi && <span className="block text-xs text-ink-soft">{word.example_vi}</span>}
          </button>
        )}
      </div>
      <div className="mt-3 flex justify-end gap-2">
        {actions}
        <AnalyzeButton text={word.hanzi} />
        <StrokeButton text={word.hanzi} />
        {supported && (
          <button
            type="button"
            onClick={() => speak(word.hanzi)}
            title={t('vocab.speak')}
            aria-label={`${t('vocab.speak')} ${word.hanzi}`}
            className="btn p-1.5"
          >
            <Volume2 size={16} />
          </button>
        )}
      </div>
    </div>
  )
}
