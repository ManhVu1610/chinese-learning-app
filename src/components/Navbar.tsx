import clsx from 'clsx'
import {
  BookOpen,
  ClipboardCheck,
  Home,
  Languages,
  Layers,
  LogIn,
  type LucideIcon,
} from 'lucide-react'
import { useTranslation } from 'react-i18next'
import { Link, NavLink, useNavigate } from 'react-router-dom'
import { useAuth } from '../contexts/AuthContext'
import ToolsMenu from './ToolsMenu'
import UserMenu from './UserMenu'

const links: { to: string; key: string; icon: LucideIcon }[] = [
  { to: '/', key: 'nav.home', icon: Home },
  { to: '/vocabulary', key: 'nav.vocabulary', icon: BookOpen },
  { to: '/flashcard', key: 'nav.flashcard', icon: Layers },
  { to: '/test', key: 'nav.test', icon: ClipboardCheck },
]

/** Thanh điều hướng dưới đáy màn hình, chỉ hiện trên điện thoại. */
export function MobileTabBar() {
  const { t } = useTranslation()
  return (
    <nav className="box fixed inset-x-3 bottom-3 z-50 grid h-16 grid-cols-5 gap-1 p-1.5 md:hidden">
      {links.map(({ to, key, icon: Icon }) => (
        <NavLink
          key={to}
          to={to}
          end={to === '/'}
          className={({ isActive }) =>
            clsx(
              'flex flex-col items-center justify-center gap-0.5 rounded-2xl text-[11px] font-bold transition-colors',
              isActive ? 'bg-coral text-ink' : 'text-ink-soft',
            )
          }
        >
          <Icon size={20} />
          {t(key)}
        </NavLink>
      ))}
      <ToolsMenu variant="tabbar" />
    </nav>
  )
}

export default function Navbar() {
  const { t, i18n } = useTranslation()
  const { user, loading, logout } = useAuth()
  const navigate = useNavigate()
  const toggleLang = () => i18n.changeLanguage(i18n.language === 'vi' ? 'en' : 'vi')

  const handleLogout = async () => {
    await logout()
    navigate('/')
  }


  return (
    <header className="fixed inset-x-0 top-0 z-50 px-3 pt-3">
      <nav className="box mx-auto flex h-16 max-w-6xl items-center gap-3 rounded-full px-3 md:px-4">
        <Link to="/" className="group flex shrink-0 items-center gap-2 font-extrabold">
          <span className="sticker -rotate-6 rounded-full bg-brick px-2.5 py-1 text-lg leading-none text-white">
            汉字
          </span>
          <span className="hidden text-ink lg:inline">Học Tiếng Trung <span aria-hidden="true">🐼</span></span>
        </Link>

        <div className="flex-1 md:hidden" />
        <div className="hidden flex-1 items-center gap-1 py-1 md:flex">
          {links.map(({ to, key }) => (
            <NavLink
              key={to}
              to={to}
              end={to === '/'}
              className={({ isActive }) =>
                clsx(
                  'whitespace-nowrap rounded-full border-2 px-3.5 py-1.5 text-sm font-bold transition-colors',
                  isActive
                    ? 'border-ink bg-coral text-ink shadow-block-sm'
                    : 'border-transparent text-ink-soft hover:bg-brick-soft hover:text-ink',
                )
              }
            >
              {t(key)}
            </NavLink>
          ))}
          <ToolsMenu variant="navbar" />
        </div>

        <button
          type="button"
          onClick={toggleLang}
          title={t('common.toggle_lang')}
          className="btn px-2.5 py-1.5 text-sm"
        >
          <Languages size={16} />
          {i18n.language === 'vi' ? 'VI' : 'EN'}
        </button>

        {loading ? (
          <div className="flex items-center gap-2" aria-busy="true" aria-label={t('common.loading')}>
            <div className="h-8 w-8 animate-pulse rounded-full border-2 border-line bg-line/40" />
            <div className="hidden h-4 w-20 animate-pulse rounded-full bg-line md:block" />
          </div>
        ) : user ? (
          <UserMenu user={user} onLogout={handleLogout} />
        ) : (
          <Link to="/login" className="btn btn-primary px-3 py-1.5 text-sm">
            <LogIn size={16} />
            <span className="hidden md:inline">{t('common.login')}</span>
          </Link>
        )}
      </nav>
    </header>
  )
}
