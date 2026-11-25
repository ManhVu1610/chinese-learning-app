import clsx from 'clsx'
import type { User } from 'firebase/auth'
import { ChevronDown, LogOut, User as UserIcon } from 'lucide-react'
import { useEffect, useRef, useState } from 'react'
import { useTranslation } from 'react-i18next'

/** Bấm vào ảnh/tên người dùng: menu có "Đăng xuất". */
export default function UserMenu({ user, onLogout }: { user: User; onLogout: () => void }) {
  const { t } = useTranslation()
  const [open, setOpen] = useState(false)
  const ref = useRef<HTMLDivElement>(null)
  const name = user.displayName || user.email || ''

  useEffect(() => {
    if (!open) return
    const onDown = (e: PointerEvent) => !ref.current?.contains(e.target as Node) && setOpen(false)
    const onKey = (e: KeyboardEvent) => e.key === 'Escape' && setOpen(false)
    document.addEventListener('pointerdown', onDown)
    document.addEventListener('keydown', onKey)
    return () => {
      document.removeEventListener('pointerdown', onDown)
      document.removeEventListener('keydown', onKey)
    }
  }, [open])

  return (
    <div ref={ref} className="relative">
      <button
        type="button"
        onClick={() => setOpen((o) => !o)}
        aria-expanded={open}
        aria-haspopup="menu"
        title={t('auth.welcome', { name })}
        className={clsx('flex items-center gap-2 rounded-full border-2 py-0.5 pr-2 pl-0.5', open ? 'border-ink bg-coral' : 'border-transparent hover:bg-brick-soft')}
      >
        {user.photoURL ? (
          <img src={user.photoURL} alt="" referrerPolicy="no-referrer" className="h-8 w-8 rounded-full border-2 border-ink" />
        ) : (
          <span className="flex h-8 w-8 items-center justify-center rounded-full border-2 border-ink bg-sky">
            <UserIcon size={16} />
          </span>
        )}
        <span className="hidden max-w-36 truncate text-sm font-semibold xl:inline">{name}</span>
        <ChevronDown size={14} className={clsx('transition-transform', open && 'rotate-180')} />
      </button>

      {open && (
        <div role="menu" className="box absolute right-0 z-50 mt-3 w-64 p-2">
          <p className="truncate border-b-2 border-line px-2.5 pt-1 pb-2 text-sm">
            {t('auth.welcome', { name })}
            {user.email && <span className="block truncate text-xs text-ink-soft">{user.email}</span>}
          </p>
          <button
            type="button"
            role="menuitem"
            onClick={() => {
              setOpen(false)
              onLogout()
            }}
            className="mt-1 flex w-full items-center gap-2.5 rounded-2xl px-2.5 py-2 text-left text-sm font-bold hover:bg-brick-soft"
          >
            <LogOut size={16} />
            {t('auth.logout')}
          </button>
        </div>
      )}
    </div>
  )
}
