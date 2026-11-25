import { Brush } from 'lucide-react'
import { lazy, Suspense, useState } from 'react'
import { useTranslation } from 'react-i18next'

// Hộp thoại (và thư viện hanzi-writer) chỉ tải khi bấm nút lần đầu.
const StrokeOrderDialog = lazy(() => import('./StrokeOrderDialog'))

/** Nút "Xem nét bút" cho một từ hoặc bộ thủ. */
export default function StrokeButton({ text, className = 'btn p-1.5' }: { text: string; className?: string }) {
  const { t } = useTranslation()
  const [open, setOpen] = useState(false)
  if (![...text].some((c) => /\p{Script=Han}/u.test(c))) return null

  return (
    <>
      <button
        type="button"
        onClick={(e) => {
          e.stopPropagation()
          setOpen(true)
        }}
        title={t('stroke.button')}
        aria-label={`${t('stroke.button')} ${text}`}
        className={className}
      >
        <Brush size={16} />
      </button>
      {open && (
        <Suspense fallback={null}>
          <StrokeOrderDialog text={text} onClose={() => setOpen(false)} />
        </Suspense>
      )}
    </>
  )
}
