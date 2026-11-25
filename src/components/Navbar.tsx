import clsx from 'clsx'
import { Languages, LogIn, LogOut, User as UserIcon } from 'lucide-react'
import { useTranslation } from 'react-i18next'
import { Link, NavLink, useNavigate } from 'react-router-dom'
import { useAuth } from '../contexts/AuthContext'

const links = [
  { to: '/', key: 'nav.home' },
  { to: '/vocabulary', key: 'nav.vocabulary' },
  { to: '/flashcard', key: 'nav.flashcard' },
  { to: '/test', key: 'nav.test' },
]

export default function Navbar() {
  const { t, i18n } = useTranslation()
  const { user, loading, logout } = useAuth()
  const navigate = useNavigate()
  const toggleLang = () => i18n.changeLanguage(i18n.language === 'vi' ? 'en' : 'vi')

  const handleLogout = async () => {
    await logout()
    navigate('/')
  }

  const name = user?.displayName || user?.email || ''

  return (
    <header className="fixed inset-x-0 top-0 z-50 h-16 border-b border-slate-200 bg-white/95 backdrop-blur">
      <nav className="mx-auto flex h-full max-w-6xl items-center gap-4 px-4">
        <Link to="/" className="flex shrink-0 items-center gap-2 font-bold">
          <span className="text-xl text-[#DC2626]">汉字</span>
          <span className="text-slate-300">|</span>
          <span className="hidden text-slate-800 sm:inline">Học Tiếng Trung</span>
        </Link>

        <div className="flex flex-1 items-center gap-1 overflow-x-auto">
          {links.map(({ to, key }) => (
            <NavLink
              key={to}
              to={to}
              end={to === '/'}
              className={({ isActive }) =>
                clsx(
                  'whitespace-nowrap rounded-md px-3 py-2 text-sm font-medium transition-colors',
                  isActive ? 'text-[#DC2626]' : 'text-slate-600 hover:text-slate-900',
                )
              }
            >
              {t(key)}
            </NavLink>
          ))}
        </div>

        <button
          type="button"
          onClick={toggleLang}
          title={t('common.toggle_lang')}
          className="flex items-center gap-1 rounded-md border border-slate-200 px-2.5 py-1.5 text-sm font-medium text-slate-700 hover:bg-slate-50"
        >
          <Languages size={16} />
          {i18n.language === 'vi' ? 'VI' : 'EN'}
        </button>

        {loading ? (
          <div className="flex items-center gap-2" aria-busy="true" aria-label={t('common.loading')}>
            <div className="h-8 w-8 animate-pulse rounded-full bg-slate-200" />
            <div className="hidden h-4 w-20 animate-pulse rounded bg-slate-200 md:block" />
          </div>
        ) : user ? (
          <div className="flex items-center gap-2">
            {user.photoURL ? (
              <img
                src={user.photoURL}
                alt=""
                referrerPolicy="no-referrer"
                className="h-8 w-8 rounded-full border border-slate-200"
              />
            ) : (
              <span className="flex h-8 w-8 items-center justify-center rounded-full bg-red-50 text-[#DC2626]">
                <UserIcon size={16} />
              </span>
            )}
            <span
              className="hidden max-w-36 truncate text-sm font-medium text-slate-700 md:inline"
              title={t('auth.welcome', { name })}
            >
              {name}
            </span>
            <button
              type="button"
              onClick={handleLogout}
              title={t('auth.logout')}
              className="flex items-center gap-1.5 rounded-md px-2.5 py-1.5 text-sm font-medium text-slate-600 hover:bg-slate-100"
            >
              <LogOut size={16} />
              <span className="hidden lg:inline">{t('auth.logout')}</span>
            </button>
          </div>
        ) : (
          <Link
            to="/login"
            className="flex items-center gap-1.5 rounded-md bg-[#DC2626] px-3 py-1.5 text-sm font-medium text-white hover:bg-red-700"
          >
            <LogIn size={16} />
            <span className="hidden md:inline">{t('common.login')}</span>
          </Link>
        )}
      </nav>
    </header>
  )
}
