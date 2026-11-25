import clsx from 'clsx'
import { FolderInput, NotebookPen, PencilLine, SquarePen, Star, Trash2, type LucideIcon } from 'lucide-react'
import { useTranslation } from 'react-i18next'
import { Link } from 'react-router-dom'

export interface SetCardAction {
  key: string
  label: string
  icon: LucideIcon
  onClick: () => void
  danger?: boolean
}

/** Thẻ một bộ từ vựng: tên, số từ, thanh tiến độ học, hàng nút thao tác. */
export default function SetCard({
  to,
  name,
  wordCount,
  learned,
  actions,
  starred,
}: {
  to: string
  name: string
  wordCount: number
  learned: number
  actions: SetCardAction[]
  starred?: boolean
}) {
  const { t } = useTranslation()
  const percent = wordCount ? Math.round((learned / wordCount) * 100) : 0

  return (
    <div className="box group flex flex-col p-4 transition-transform hover:-translate-y-1">
      <Link to={to} className="-m-2 flex items-center gap-4 rounded-2xl p-2 hover:bg-brick-soft/60">
        <span className={clsx('sticker shrink-0 -rotate-6 p-3', starred ? 'bg-sky' : 'bg-sand')}>
          {starred ? <Star size={22} /> : <NotebookPen size={22} />}
        </span>
        <span className="min-w-0">
          <span className="block truncate text-lg font-extrabold">{name}</span>
          <span className="text-sm text-ink-soft">{t('notebook.word_count', { count: wordCount })}</span>
        </span>
      </Link>
      <div className="mt-4">
        <div className="flex justify-between text-xs font-bold text-ink-soft">
          <span>{t('notebook.progress')}</span>
          <span className="tabular-nums">{percent}%</span>
        </div>
        <div
          className="mt-1 h-3.5 overflow-hidden rounded-full border-2 border-ink bg-card"
          role="progressbar"
          aria-valuenow={percent}
          aria-valuemin={0}
          aria-valuemax={100}
          aria-label={t('notebook.progress')}
        >
          <div className="h-full rounded-full bg-sage" style={{ width: `${percent}%` }} />
        </div>
      </div>
      <div className="mt-4 flex flex-wrap gap-2">
        {actions.map(({ key, label, icon: Icon, onClick, danger }) => (
          <button
            key={key}
            type="button"
            onClick={onClick}
            className={clsx('btn flex-1 px-3 py-1.5 text-xs sm:text-sm', danger ? 'text-brick hover:bg-coral' : 'hover:bg-sand')}
          >
            <Icon size={15} className="shrink-0" />
            <span className="truncate">{label}</span>
          </button>
        ))}
      </div>
    </div>
  )
}

export const setActionIcons = { edit: SquarePen, rename: PencilLine, move: FolderInput, delete: Trash2 }
