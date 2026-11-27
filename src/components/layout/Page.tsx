import clsx from 'clsx'
import { ChevronRight, Home } from 'lucide-react'
import type { ReactNode } from 'react'
import { useTranslation } from 'react-i18next'
import { Link } from 'react-router-dom'
import { featureByKey } from '../../data/features'

/** Độ rộng chuẩn của trang: hẹp (đọc / làm bài), vừa (tra cứu), rộng (lưới thẻ), đầy (soạn thảo). */
const widths = { narrow: 'max-w-3xl', default: 'max-w-5xl', wide: 'max-w-6xl', full: 'max-w-7xl' } as const

export interface Crumb {
  label: string
  to?: string
}

/**
 * Khung chung cho mọi trang tính năng:
 *  - Đường dẫn: Trang chủ › Nhóm › Tính năng (› trang con)
 *  - Đầu trang: biểu tượng màu của tính năng, tiêu đề, mô tả, nút thao tác
 * Tên, biểu tượng, màu, nhóm và liên kết đều lấy từ danh mục data/features.ts.
 */
export default function Page({
  feature,
  title,
  description,
  crumbs = [],
  actions,
  meta,
  size = 'default',
  className,
  onLeave,
  children,
}: {
  /** Khoá tính năng trong data/features.ts */
  feature: string
  /** Mặc định là tên tính năng */
  title?: ReactNode
  /** Mặc định là mô tả ngắn của tính năng (home.desc.*) */
  description?: ReactNode
  /** Các trang con sau tên tính năng (vd tên bộ từ, tên mẫu in) */
  crumbs?: Crumb[]
  /** Nút thao tác bên phải tiêu đề */
  actions?: ReactNode
  /** Dòng nhãn nhỏ phía trên tiêu đề */
  meta?: ReactNode
  size?: keyof typeof widths
  className?: string
  /** Gọi khi bấm một liên kết đường dẫn; trả về false để ở lại (vd còn thay đổi chưa lưu) */
  onLeave?: () => boolean
  children: ReactNode
}) {
  const { t } = useTranslation()
  const f = featureByKey(feature)
  const Icon = f?.icon
  const guard = (e: React.MouseEvent) => {
    if (onLeave && !onLeave()) e.preventDefault()
  }
  const featureLabel = f ? t(f.label) : ''
  const trail: Crumb[] = [
    ...(f ? [{ label: t(`home.group.${f.group}`), to: `/#${f.group}` }] : []),
    ...(f ? [{ label: featureLabel, to: crumbs.length ? f.to : undefined }] : []),
    ...crumbs,
  ]

  return (
    <section className={clsx('mx-auto px-4 py-8', widths[size], 'print:m-0 print:max-w-none print:p-0', className)}>
      <nav aria-label={t('common.breadcrumb')} className="print:hidden">
        <ol className="flex flex-wrap items-center gap-1 text-xs font-semibold text-ink-soft">
          <li>
            <Link to="/" onClick={guard} className="inline-flex items-center gap-1 hover:text-ink">
              <Home size={13} />
              {t('nav.home')}
            </Link>
          </li>
          {trail.map((c, i) => (
            <li key={i} className="flex items-center gap-1">
              <ChevronRight size={13} className="text-ink-muted" />
              {c.to ? (
                <Link to={c.to} onClick={guard} className="hover:text-ink">
                  {c.label}
                </Link>
              ) : (
                <span aria-current={i === trail.length - 1 ? 'page' : undefined} className="text-ink">
                  {c.label}
                </span>
              )}
            </li>
          ))}
        </ol>
      </nav>

      <header className="mt-3 flex flex-wrap items-start justify-between gap-4 print:hidden">
        <div className="flex min-w-0 items-start gap-3">
          {Icon && (
            <span className={clsx('sticker mt-0.5 hidden shrink-0 p-2.5 sm:inline-flex', f.color)}>
              <Icon size={22} />
            </span>
          )}
          <div className="min-w-0">
            {meta && <div className="mb-1 flex flex-wrap items-center gap-2 text-sm text-ink-soft">{meta}</div>}
            <h1 className="text-3xl font-extrabold break-words">{title ?? featureLabel}</h1>
            {(description ?? f) && <p className="mt-1 text-ink-soft">{description ?? t(f!.desc)}</p>}
          </div>
        </div>
        {actions && <div className="flex flex-wrap items-center gap-3">{actions}</div>}
      </header>

      <div className="mt-6 print:mt-0">{children}</div>
    </section>
  )
}
