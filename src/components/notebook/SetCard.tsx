import clsx from 'clsx'
import { ChevronRight, FolderInput, NotebookPen, PencilLine, SquarePen, Star, Trash2, type LucideIcon } from 'lucide-react'
import { useTranslation } from 'react-i18next'
import { Link } from 'react-router-dom'

export interface SetCardAction {
  key: string
  label: string
  icon: LucideIcon
  onClick: () => void
  danger?: boolean
}

/** Một hàng trong danh sách bộ từ vựng: tên + số từ, tiến độ học, các nút thao tác nhanh. */
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
    <li className="group flex items-center gap-3 px-3 py-2.5 hover:bg-paper/60 sm:gap-4 sm:px-4">
      <Link to={to} className="flex min-w-0 flex-1 items-center gap-3 rounded-xl">
        <span className={clsx('sticker shrink-0 p-2', starred ? 'bg-sky' : 'bg-sand')}>
          {starred ? <Star size={18} /> : <NotebookPen size={18} />}
        </span>
        <span className="min-w-0 flex-1">
          <span className="block truncate font-extrabold group-hover:text-brick">{name}</span>
          <span className="text-xs text-ink-soft">{t('notebook.word_count', { count: wordCount })}</span>
        </span>
        {/* Tiến độ: thanh nhỏ + phần trăm */}
        <span className="hidden w-36 shrink-0 items-center gap-2 sm:flex" title={t('notebook.progress')}>
          <span
            className="h-2.5 flex-1 overflow-hidden rounded-full border-2 border-ink bg-card"
            role="progressbar"
            aria-valuenow={percent}
            aria-valuemin={0}
            aria-valuemax={100}
            aria-label={t('notebook.progress')}
          >
            <span className="block h-full rounded-full bg-sage" style={{ width: `${percent}%` }} />
          </span>
          <span className="w-9 text-right text-xs font-bold text-ink-soft tabular-nums">{percent}%</span>
        </span>
      </Link>
      <span className="flex shrink-0 gap-1.5">
        {actions.map(({ key, label, icon: Icon, onClick, danger }) => (
          <button
            key={key}
            type="button"
            onClick={onClick}
            title={label}
            aria-label={`${label} ${name}`}
            className={clsx('btn h-8 w-8 p-0', danger ? 'text-brick hover:bg-coral' : 'hover:bg-sand')}
          >
            <Icon size={14} />
          </button>
        ))}
        <Link to={to} aria-hidden tabIndex={-1} className="hidden h-8 w-6 items-center justify-center text-ink-muted sm:flex">
          <ChevronRight size={18} />
        </Link>
      </span>
    </li>
  )
}

export const setActionIcons = { edit: SquarePen, rename: PencilLine, move: FolderInput, delete: Trash2 }
