import clsx from 'clsx'
import { ArrowRight, BookMarked, ChevronRight, GraduationCap, Layers, ScrollText, Search, Star, type LucideIcon } from 'lucide-react'
import { useEffect, useMemo, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { Link, useLocation, useNavigate } from 'react-router-dom'
import { useAuth } from '../contexts/AuthContext'
import { featureGroups, features, type Feature } from '../data/features'
import { useFlashcard } from '../hooks/useFlashcard'
import { useGrammarProgress } from '../hooks/useGrammarProgress'
import { useNotebook } from '../hooks/useNotebook'
import { useSavedWords } from '../hooks/useSavedWords'

/**
 * Trang chủ dạng bảng điều khiển:
 *  - Hàng trên: lời chào + ô tra nhanh (trái) và tiến độ hôm nay (phải)
 *  - Hàng dưới: mỗi nhóm tính năng là một cột, các tính năng xếp dọc trong cột
 * Nhóm và tính năng lấy từ danh mục chung (data/features.ts).
 */
export default function Home() {
  const { t } = useTranslation()
  const { user } = useAuth()
  const { stats } = useFlashcard()
  const { saved } = useSavedWords()
  const { sets } = useNotebook()
  const { learned } = useGrammarProgress()
  const s = stats()
  // Đường dẫn "Nhóm" ở các trang trỏ về /#nhóm: cuộn tới đúng nhóm.
  const { hash } = useLocation()
  useEffect(() => {
    if (!hash) return
    // Đợi trang chủ vẽ xong rồi mới cuộn.
    const id = setTimeout(() => document.getElementById(hash.slice(1))?.scrollIntoView({ block: 'start' }), 60)
    return () => clearTimeout(id)
  }, [hash])
  // Tổng số bài ngữ pháp: nạp sau để trang chủ không phải tải cả dữ liệu ngữ pháp ngay.
  const [grammarTotal, setGrammarTotal] = useState<number | null>(null)
  useEffect(() => {
    import('../data/grammar').then((m) => setGrammarTotal(m.grammarPoints.length))
  }, [])
  const navigate = useNavigate()
  const [q, setQ] = useState('')
  const name = user?.displayName?.split(' ').slice(-1)[0]

  const groups = useMemo(() => featureGroups.map((g) => ({ group: g, items: features.filter((f) => f.group === g) })), [])

  const today: { key: string; icon: LucideIcon; color: string; value: string; to: string; cta: string }[] = [
    {
      key: 'due',
      icon: Layers,
      color: 'bg-sage',
      value: String(s.due),
      to: '/flashcard',
      cta: s.due ? t('home.review_now') : t('home.add_cards'),
    },
    { key: 'saved', icon: Star, color: 'bg-sand', value: String(saved.length), to: '/notebook', cta: t('home.open') },
    { key: 'sets', icon: BookMarked, color: 'bg-coral', value: String(sets.length), to: '/notebook', cta: t('home.open') },
    {
      key: 'grammar',
      icon: ScrollText,
      color: 'bg-apricot',
      value: grammarTotal ? `${learned.size}/${grammarTotal}` : String(learned.size),
      to: '/grammar',
      cta: t('home.continue'),
    },
  ]

  const search = (e: React.FormEvent) => {
    e.preventDefault()
    navigate(q.trim() ? `/dictionary?q=${encodeURIComponent(q.trim())}` : '/dictionary')
  }

  return (
    <div className="mx-auto max-w-6xl px-4 py-8">
      {/* Hàng trên: chào + tra nhanh | hôm nay */}
      <div className="grid gap-5 lg:grid-cols-[1.6fr_1fr]">
        <section className="box relative overflow-hidden bg-brick-soft p-6 md:p-8">
          <span aria-hidden="true" className="pointer-events-none absolute -right-10 -bottom-16 h-48 w-48 rounded-full bg-lilac/80" />
          <span aria-hidden="true" className="pointer-events-none absolute top-5 right-6 hidden text-6xl font-bold text-brick/15 sm:block">
            汉语
          </span>
          <div className="relative">
            <p className="text-sm font-bold text-ink-soft">{name ? t('home.hello_name', { name }) : t('home.hello')}</p>
            <h1 className="mt-1 text-3xl font-extrabold tracking-tight md:text-4xl">{t('home.title')}</h1>
            <p className="mt-2 max-w-lg text-ink-soft">{t('home.subtitle')}</p>

            <form onSubmit={search} className="relative mt-5 max-w-lg" role="search">
              <Search size={18} className="absolute top-1/2 left-3.5 -translate-y-1/2 text-ink-muted" />
              <input
                type="search"
                value={q}
                onChange={(e) => setQ(e.target.value)}
                placeholder={t('home.quick_search')}
                aria-label={t('home.quick_search')}
                className="field pr-24 pl-10"
              />
              <button type="submit" className="btn btn-accent absolute top-1/2 right-1.5 -translate-y-1/2 px-4 py-1.5 text-sm">
                {t('common.search')}
              </button>
            </form>

            <div className="mt-4 flex flex-wrap gap-2">
              <Link to="/vocabulary" className="btn px-4 py-2 text-sm">
                <GraduationCap size={16} />
                {t('home.start')}
              </Link>
              <Link to="/flashcard" className="btn px-4 py-2 text-sm">
                <Layers size={16} />
                {t('home.review')}
              </Link>
            </div>
          </div>
        </section>

        <section className="box flex flex-col p-5" aria-labelledby="home-today">
          <div className="flex items-baseline justify-between gap-2">
            <h2 id="home-today" className="text-xl font-extrabold">
              {t('home.today')}
            </h2>
            <span className="text-xs text-ink-soft">{t('home.today_hint')}</span>
          </div>
          <ul className="mt-3 flex flex-1 flex-col justify-between gap-1">
            {today.map(({ key, icon: Icon, color, value, to, cta }) => (
              <li key={key}>
                <Link to={to} className="group flex items-center gap-3 rounded-2xl px-2 py-2 hover:bg-paper">
                  <span className={clsx('sticker shrink-0 p-1.5', color)}>
                    <Icon size={16} />
                  </span>
                  <span className="min-w-0 flex-1">
                    <span className="block text-sm font-bold">{t(`home.stat.${key}`)}</span>
                    <span className="text-xs font-bold text-brick">{cta}</span>
                  </span>
                  <span className="text-xl font-extrabold tabular-nums">{value}</span>
                  <ArrowRight size={15} className="text-ink-muted transition-transform group-hover:translate-x-0.5" />
                </Link>
              </li>
            ))}
          </ul>
        </section>
      </div>

      {/* Hàng dưới: mỗi nhóm một cột; các cột cùng hàng rộng và cao bằng nhau, đủ chỗ cho mọi mục */}
      <div className="mt-6 grid gap-5 sm:grid-cols-2 lg:grid-cols-4">
        {groups.map(({ group, items }) => (
          <section key={group} id={group} className="box flex scroll-mt-24 flex-col p-4" aria-labelledby={`home-${group}`}>
            <h2 id={`home-${group}`} className="flex items-baseline justify-between gap-2 text-lg font-extrabold">
              {t(`home.group.${group}`)}
              <span className="text-xs font-semibold text-ink-muted">{items.length}</span>
            </h2>
            <p className="text-xs text-ink-soft">{t(`home.group.${group}_hint`)}</p>
            <ul className="mt-3 min-h-0 flex-1 space-y-1 overflow-y-auto overscroll-contain pr-1 [scrollbar-width:thin]">
              {items.map((f) => (
                <li key={f.key}>
                  <FeatureRow feature={f} />
                </li>
              ))}
            </ul>
          </section>
        ))}
      </div>
    </div>
  )
}

function FeatureRow({ feature: f }: { feature: Feature }) {
  const { t } = useTranslation()
  const Icon = f.icon
  return (
    <Link to={f.to} className="group flex items-start gap-3 rounded-2xl px-2 py-2 hover:bg-paper">
      <span className={clsx('sticker mt-0.5 shrink-0 p-1.5', f.color)}>
        <Icon size={16} />
      </span>
      <span className="min-w-0 flex-1">
        <span className="flex flex-wrap items-center gap-1.5 text-sm font-extrabold">
          {t(f.label)}
          {f.soon && <span className="tag bg-paper px-1.5 text-[10px]">{t('home.soon')}</span>}
        </span>
        <span className="block text-xs leading-snug text-ink-soft">{t(f.desc)}</span>
      </span>
      <ChevronRight size={15} className="mt-1 shrink-0 text-ink-muted transition-transform group-hover:translate-x-0.5" />
    </Link>
  )
}
