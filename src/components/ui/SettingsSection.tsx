import clsx from 'clsx'
import { ChevronDown, type LucideIcon } from 'lucide-react'
import { useId, useState, type ReactNode } from 'react'

/**
 * Một mục cài đặt dạng thẻ bo tròn, bấm tiêu đề để mở / thu gọn.
 * Khi thu gọn, `summary` (nếu có) hiện cạnh tiêu đề để thấy ngay lựa chọn hiện tại.
 * `storageKey` (tuỳ chọn) để nhớ trạng thái mở / đóng giữa các lần vào trang.
 */
export default function SettingsSection({
  title,
  hint,
  summary,
  icon: Icon,
  defaultOpen = false,
  storageKey,
  className,
  children,
}: {
  title: ReactNode
  hint?: ReactNode
  summary?: ReactNode
  icon?: LucideIcon
  defaultOpen?: boolean
  storageKey?: string
  className?: string
  children: ReactNode
}) {
  const id = useId()
  const [open, setOpen] = useState(() => {
    if (!storageKey) return defaultOpen
    const v = localStorage.getItem(`section_${storageKey}`)
    return v === null ? defaultOpen : v === '1'
  })
  const toggle = () =>
    setOpen((o) => {
      if (storageKey) localStorage.setItem(`section_${storageKey}`, o ? '0' : '1')
      return !o
    })

  return (
    <section className={clsx('rounded-[1.75rem] border-2 border-line bg-card', className)}>
      <button
        type="button"
        onClick={toggle}
        aria-expanded={open}
        aria-controls={id}
        className="flex w-full items-center gap-3 rounded-[1.75rem] px-5 py-4 text-left"
      >
        {Icon && (
          <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-brick-soft text-brick">
            <Icon size={15} />
          </span>
        )}
        <span className="min-w-0 flex-1">
          <span className="block leading-tight font-extrabold">{title}</span>
          {hint && <span className="block text-xs text-ink-muted">{hint}</span>}
        </span>
        {!open && summary && <span className="max-w-[45%] shrink-0 truncate text-sm text-ink-soft">{summary}</span>}
        <ChevronDown size={18} className={clsx('shrink-0 text-ink-soft transition-transform', open && 'rotate-180')} />
      </button>
      {open && (
        <div id={id} className="px-5 pb-5">
          {children}
        </div>
      )}
    </section>
  )
}
