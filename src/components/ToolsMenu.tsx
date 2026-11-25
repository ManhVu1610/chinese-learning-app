import clsx from 'clsx'
import { ChevronDown, Wrench } from 'lucide-react'
import { useEffect, useRef, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { NavLink, useLocation } from 'react-router-dom'
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
            'box absolute z-50 w-64 p-2',
            isTabbar ? 'right-0 bottom-full mb-4' : 'top-full left-0 mt-3',
          )}
        >
          {tools.map(({ to, key, icon: Icon, color }) => (
            <NavLink
              key={to}
              to={to}
              role="menuitem"
              className={({ isActive }) =>
                clsx(
                  'group flex items-center gap-3 rounded-2xl px-2.5 py-2 text-sm font-bold',
                  isActive ? 'bg-coral' : 'hover:bg-brick-soft',
                )
              }
            >
              <span className={clsx('sticker p-1.5', color)}>
                <Icon size={16} />
              </span>
              {t(`tools.${key}`)}
            </NavLink>
          ))}
        </div>
      )}
    </div>
  )
}
