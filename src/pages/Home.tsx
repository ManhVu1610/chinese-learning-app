import { ArrowRight, BookOpen, Brain, ClipboardCheck, Headphones, Sparkles, type LucideIcon } from 'lucide-react'
import { useTranslation } from 'react-i18next'
import { Link } from 'react-router-dom'
import { tools } from '../data/tools'

const features: { key: string; icon: LucideIcon; color: string; to: string; tilt: string }[] = [
  { key: 'vocab', icon: BookOpen, color: 'bg-sand', to: '/vocabulary', tilt: '-rotate-1' },
  { key: 'flashcard', icon: Brain, color: 'bg-sage', to: '/flashcard', tilt: 'rotate-1' },
  { key: 'listening', icon: Headphones, color: 'bg-sky', to: '/vocabulary', tilt: '-rotate-1' },
  { key: 'test', icon: ClipboardCheck, color: 'bg-coral', to: '/test', tilt: 'rotate-1' },
]

export default function Home() {
  const { t } = useTranslation()

  return (
    <div className="mx-auto max-w-6xl px-4 py-8">
      <section className="box relative overflow-hidden bg-brick-soft p-8 md:p-12">
        {/* Hình trang trí */}
        <span aria-hidden="true" className="pointer-events-none absolute -top-10 -left-10 h-40 w-40 rounded-full bg-sand/70" />
        <span aria-hidden="true" className="pointer-events-none absolute -right-8 -bottom-14 h-48 w-48 rounded-full bg-lilac/80" />

        <div className="relative grid items-center gap-8 md:grid-cols-[1fr_auto]">
          <div>
            <span className="tag bg-card">
              <Sparkles size={13} />
              HSK 1 – 6
            </span>
            <h1 className="mt-4 text-4xl font-extrabold tracking-tight md:text-5xl">{t('home.title')}</h1>
            <p className="mt-4 max-w-xl text-lg text-ink-soft">{t('home.subtitle')}</p>
            <Link to="/vocabulary" className="btn btn-accent mt-8 px-7 py-3 text-base">
              {t('home.start')}
              <ArrowRight size={18} />
            </Link>
          </div>
          <div className="hidden animate-float md:block">
            <div className="sticker rotate-3 flex-col rounded-[2rem] bg-card px-9 py-7 shadow-block">
              <p className="text-7xl font-bold text-brick">汉语</p>
              <p className="mt-2 text-center text-sm font-bold text-ink-soft">hàn yǔ 🐼</p>
            </div>
          </div>
        </div>
      </section>

      <section className="mt-10 grid grid-cols-2 gap-4 md:gap-6 lg:grid-cols-4">
        {features.map(({ key, icon: Icon, color, to, tilt }) => (
          <Link
            key={key}
            to={to}
            className={`box group block p-5 transition-transform hover:-translate-y-1 hover:rotate-0 md:p-6 ${color} ${tilt}`}
          >
            <span className="sticker bg-card p-2.5">
              <Icon size={22} />
            </span>
            <h3 className="mt-4 text-lg font-extrabold">{t(`home.features.${key}_title`)}</h3>
            <p className="mt-1.5 text-sm text-ink-soft">{t(`home.features.${key}_desc`)}</p>
          </Link>
        ))}
      </section>

      <section className="mt-12">
        <h2 className="flex items-center gap-2 text-2xl font-extrabold">
          <span aria-hidden="true">🧰</span>
          {t('home.tools_title')}
        </h2>
        <div className="mt-5 grid grid-cols-3 gap-3 sm:grid-cols-4 md:gap-4 lg:grid-cols-8">
          {tools.map(({ to, key, icon: Icon, color }) => (
            <Link
              key={to}
              to={to}
              className="box group flex aspect-square flex-col items-center justify-center gap-2 p-3 text-center transition-transform hover:-translate-y-1"
            >
              <span className={`sticker rounded-full p-3 ${color}`}>
                <Icon size={22} />
              </span>
              <span className="text-sm leading-tight font-bold">{t(`tools.${key}`)}</span>
            </Link>
          ))}
        </div>
      </section>
    </div>
  )
}
