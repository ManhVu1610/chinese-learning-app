import clsx from 'clsx'
import { Star } from 'lucide-react'
import { useTranslation } from 'react-i18next'
import { useSavedWords } from '../hooks/useSavedWords'
import type { Word } from '../types'

/** Nút ⭐ lưu / bỏ lưu một từ vào Sổ tay từ vựng. */
export default function SaveButton({ word }: { word: Word }) {
  const { t } = useTranslation()
  const { isSaved, toggle } = useSavedWords()
  const saved = isSaved(word.id)
  const label = saved ? t('notebook.unsave') : t('notebook.save')

  return (
    <button
      type="button"
      onClick={() => toggle(word)}
      aria-pressed={saved}
      title={label}
      aria-label={`${label} ${word.hanzi}`}
      className={clsx('btn p-1.5', saved && 'bg-sand')}
    >
      <Star size={16} fill={saved ? 'currentColor' : 'none'} />
    </button>
  )
}
