import clsx from 'clsx'
import { ChevronDown, Wrench } from 'lucide-react'
import { useEffect, useRef, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { NavLink, useLocation } from 'react-router-dom'
import { featureGroups, features } from '../data/features'
import { tools } from '../data/tools'

/**
 * Menu "Công cụ" gồm 6 trang công cụ.
 * variant "navbar": nút trên thanh điều hướng, menu xổ xuống.
 * variant "tabbar": ô trên thanh tab đáy màn hình (điện thoại), menu bật lên.
 */
export default function ToolsMenu({ variant }: { variant: 'navbar' | 'tabbar' }) {
  const { t } = useTranslation()
  const { pathname } = useLocation()
  const [open, setOpen] = useState(false)
  const ref = useRef<HTMLDivElement>(null)
  const active = tools.some((tool) => pathname.startsWith(tool.to))

  // Đóng khi đổi trang, bấm ra ngoài hoặc nhấn Esc.
  useEffect(() => setOpen(false), [pathname])
  useEffect(() => {
    if (!open) return
    const onDown = (e: PointerEvent) => {
      if (!ref.current?.contains(e.target as Node)) setOpen(false)
    }
    const onKey = (e: KeyboardEvent) => e.key === 'Escape' && setOpen(false)
    document.addEventListener('pointerdown', onDown)
    document.addEventListener('keydown', onKey)
    return () => {
      document.removeEventListener('pointerdown', onDown)
      document.removeEventListener('keydown', onKey)
    }
  }, [open])

  const isTabbar = variant === 'tabbar'

  return (
    <div ref={ref} className={clsx('relative', isTabbar && 'h-full')}>
      <button
        type="button"
        onClick={() => setOpen((o) => !o)}
        aria-expanded={open}
        aria-haspopup="menu"
        className={
          isTabbar
            ? clsx(
                'flex h-full w-full flex-col items-center justify-center gap-0.5 rounded-2xl text-[11px] font-bold',
                active || open ? 'bg-coral text-ink' : 'text-ink-soft',
              )
            : clsx(
                'flex items-center gap-1 whitespace-nowrap rounded-full border-2 px-3.5 py-1.5 text-sm font-bold transition-colors',
                active || open
                  ? 'border-ink bg-coral text-ink shadow-block-sm'
                  : 'border-transparent text-ink-soft hover:bg-brick-soft hover:text-ink',
              )
        }
      >
        {isTabbar && <Wrench size={20} />}
        {t('nav.tools')}
        {!isTabbar && <ChevronDown size={14} className={clsx('transition-transform', open && 'rotate-180')} />}
      </button>

      {open && (
        <div
          role="menu"
          className={clsx(
            // Mỗi nhóm một cột: 4 cột trên máy tính, 2 cột trên điện thoại.
            'box fixed z-50 grid gap-x-2 gap-y-3 p-3',
            isTabbar
              ? 'inset-x-3 bottom-[5.5rem] grid-cols-2'
              : 'top-[5.25rem] left-1/2 w-[min(64rem,calc(100vw-1.5rem))] -translate-x-1/2 grid-cols-2 lg:grid-cols-4',
          )}
        >
          {featureGroups.map((g) => {
            const items = features.filter((f) => f.group === g)
            if (!items.length) return null
            return (
              // Các cột bằng nhau; nhóm dài thì cuộn trong cột.
              <div key={g} className="flex min-w-0 flex-col rounded-2xl bg-paper/60 p-1.5">
                <p className="flex items-baseline justify-between px-2 pt-1 pb-1.5 text-xs font-extrabold text-ink-soft uppercase">
                  {t(`home.group.${g}`)}
                  <span className="font-semibold text-ink-muted">{items.length}</span>
                </p>
                <div
                  className={clsx(
                    'overflow-y-auto overscroll-contain pr-0.5 [scrollbar-width:thin]',
                    isTabbar ? 'max-h-[24vh]' : 'max-h-[15.5rem]',
                  )}
                >
                  {items.map(({ to, icon: Icon, color, label, soon }) => (
                    <NavLink
                      key={to}
                      to={to}
                      role="menuitem"
                      className={({ isActive }) =>
                        clsx(
                          'group flex items-center gap-2.5 rounded-2xl px-2 py-1.5 text-sm font-bold',
                          isActive ? 'bg-coral' : 'hover:bg-card',
                        )
                      }
                    >
                      <span className={clsx('sticker p-1', color)}>
                        <Icon size={15} />
                      </span>
                      {/* Trên điện thoại cột hẹp: cho tên xuống dòng, nhãn Sắp có nằm dưới tên */}
                      <span className={clsx('min-w-0 flex-1 leading-tight', !isTabbar && 'truncate')}>
                        {t(label)}
                        {soon && isTabbar && <span className="block text-[10px] font-semibold text-ink-muted">{t('home.soon')}</span>}
                      </span>
                      {soon && !isTabbar && <span className="tag shrink-0 bg-paper px-1.5 text-[10px]">{t('home.soon')}</span>}
                    </NavLink>
                  ))}
                </div>
              </div>
            )
          })}
        </div>
      )}
    </div>
  )
}
