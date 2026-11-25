import { X } from 'lucide-react'
import { useEffect, useRef, type ReactNode } from 'react'
import { useTranslation } from 'react-i18next'

/** Hộp thoại: đóng bằng Esc, nút ✕ hoặc bấm ra ngoài. Tự focus ô nhập đầu tiên. */
export default function Modal({
  title,
  onClose,
  children,
}: {
  title: string
  onClose: () => void
  children: ReactNode
}) {
  const { t } = useTranslation()
  const ref = useRef<HTMLDivElement>(null)
  const closeRef = useRef(onClose)
  useEffect(() => {
    closeRef.current = onClose
  }, [onClose])

  // Chỉ chạy một lần khi mở, để không giành lại focus mỗi khi gõ.
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => e.key === 'Escape' && closeRef.current()
    document.addEventListener('keydown', onKey)
    ref.current?.querySelector<HTMLElement>('input, select, button[data-autofocus]')?.focus()
    const prev = document.body.style.overflow
    document.body.style.overflow = 'hidden'
    return () => {
      document.removeEventListener('keydown', onKey)
      document.body.style.overflow = prev
    }
  }, [])

  return (
    <div
      className="fixed inset-0 z-[60] flex items-center justify-center bg-ink/30 p-4"
      onPointerDown={(e) => e.target === e.currentTarget && onClose()}
    >
      <div ref={ref} role="dialog" aria-modal="true" aria-label={title} className="box w-full max-w-md p-5 shadow-block-lg">
        <div className="mb-4 flex items-start justify-between gap-3">
          <h2 className="text-xl font-bold">{title}</h2>
          <button type="button" onClick={onClose} aria-label={t('common.close')} className="p-1 text-ink-soft hover:text-ink">
            <X size={20} />
          </button>
        </div>
        {children}
      </div>
    </div>
  )
}

/** Hai nút Huỷ / Xác nhận ở cuối hộp thoại. */
export function ModalActions({
  onCancel,
  confirmLabel,
  disabled,
  danger,
}: {
  onCancel: () => void
  confirmLabel: string
  disabled?: boolean
  danger?: boolean
}) {
  const { t } = useTranslation()
  return (
    <div className="mt-5 flex justify-end gap-3">
      <button type="button" onClick={onCancel} className="btn px-4">
        {t('common.cancel')}
      </button>
      <button type="submit" disabled={disabled} className={danger ? 'btn bg-coral px-4' : 'btn btn-primary px-4'}>
        {confirmLabel}
      </button>
    </div>
  )
}
