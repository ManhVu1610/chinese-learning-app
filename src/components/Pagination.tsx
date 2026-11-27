import { ChevronLeft, ChevronRight } from 'lucide-react'
import { useTranslation } from 'react-i18next'

/** Nút chuyển trang ‹ Trang x/y › dùng chung cho các danh sách dài. */
export default function Pagination({ page, pageCount, onChange }: { page: number; pageCount: number; onChange: (page: number) => void }) {
  const { t } = useTranslation()
  if (pageCount <= 1) return null
  return (
    <nav className="mt-4 flex items-center justify-center gap-3" aria-label={t('flashcard.pages')}>
      <button
        type="button"
        onClick={() => onChange(Math.max(0, page - 1))}
        disabled={page === 0}
        aria-label={t('flashcard.prev_page')}
        className="btn p-2"
      >
        <ChevronLeft size={16} />
      </button>
      <span className="text-sm font-bold tabular-nums">{t('flashcard.page_of', { page: page + 1, total: pageCount })}</span>
      <button
        type="button"
        onClick={() => onChange(Math.min(pageCount - 1, page + 1))}
        disabled={page >= pageCount - 1}
        aria-label={t('flashcard.next_page')}
        className="btn p-2"
      >
        <ChevronRight size={16} />
      </button>
    </nav>
  )
}
