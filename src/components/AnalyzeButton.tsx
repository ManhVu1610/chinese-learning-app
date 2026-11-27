import { ScanSearch } from 'lucide-react'
import { lazy, Suspense, useState } from 'react'
import { useTranslation } from 'react-i18next'

// Hộp thoại chỉ tải khi bấm nút lần đầu.
const AnalyzeDialog = lazy(() => import('./AnalyzeDialog'))

/** Nút "Phân tích Hán tự" trên thẻ từ / thẻ bộ thủ. */
export default function AnalyzeButton({ text, className = 'btn p-1.5' }: { text: string; className?: string }) {
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
        title={t('tools.analyze')}
        aria-label={`${t('tools.analyze')} ${text}`}
        className={className}
      >
        <ScanSearch size={16} />
      </button>
      {open && (
        <Suspense fallback={null}>
          <AnalyzeDialog text={text} onClose={() => setOpen(false)} />
        </Suspense>
      )}
    </>
  )
}
