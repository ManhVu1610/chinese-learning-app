import { BookOpen, Brain, ClipboardCheck, Headphones, type LucideIcon } from 'lucide-react'
import { useTranslation } from 'react-i18next'
import { Link } from 'react-router-dom'

const features: { key: string; icon: LucideIcon }[] = [
  { key: 'vocab', icon: BookOpen },
  { key: 'flashcard', icon: Brain },
  { key: 'listening', icon: Headphones },
  { key: 'test', icon: ClipboardCheck },
]

export default function Home() {
  const { t } = useTranslation()

  return (
    <>
      <section className="bg-gradient-to-br from-red-600 via-red-500 to-orange-500 text-white">
        <div className="mx-auto max-w-6xl px-4 py-20 text-center md:py-28">
          <p className="text-5xl font-bold md:text-6xl">汉语</p>
          <h1 className="mt-4 text-4xl font-extrabold tracking-tight md:text-5xl">{t('home.title')}</h1>
          <p className="mx-auto mt-4 max-w-2xl text-lg text-red-50">{t('home.subtitle')}</p>
          <Link
            to="/vocabulary"
            className="mt-8 inline-block rounded-full bg-white px-8 py-3 font-semibold text-red-600 shadow-lg transition hover:bg-red-50"
          >
            {t('home.start')}
          </Link>
        </div>
      </section>

      <section className="mx-auto max-w-6xl px-4 py-16">
        <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-4">
          {features.map(({ key, icon: Icon }) => (
            <div
              key={key}
              className="rounded-xl border border-slate-200 bg-white p-6 shadow-sm transition hover:shadow-md"
            >
              <div className="mb-4 inline-flex rounded-lg bg-red-50 p-3 text-[#DC2626]">
                <Icon size={24} />
              </div>
              <h3 className="text-lg font-semibold">{t(`home.features.${key}_title`)}</h3>
              <p className="mt-2 text-sm text-slate-600">{t(`home.features.${key}_desc`)}</p>
            </div>
          ))}
        </div>
      </section>
    </>
  )
}
