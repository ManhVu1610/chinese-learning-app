import clsx from 'clsx'
import { Check } from 'lucide-react'
import { useState } from 'react'
import { useTranslation } from 'react-i18next'
import { Link } from 'react-router-dom'
import Page from '../components/layout/Page'
import { levelColor } from '../components/WordCard'
import { stories, storyTitle } from '../data/stories'
import { useStoryProgress } from '../hooks/useStoryProgress'
import type { HSKLevel } from '../types'

const levels: HSKLevel[] = [1, 2, 3, 4, 5, 6]
const LEVEL_KEY = 'stories_level'

/** Danh sách truyện ngắn, lọc theo cấp HSK. */
export default function Stories() {
  const { t, i18n } = useTranslation()
  const { done } = useStoryProgress()
  const [level, setLevel] = useState<HSKLevel | 'all'>(() => {
    const v = localStorage.getItem(LEVEL_KEY)
    return v && v !== 'all' ? (Number(v) as HSKLevel) : 'all'
  })
  const pick = (l: HSKLevel | 'all') => {
    setLevel(l)
    localStorage.setItem(LEVEL_KEY, String(l))
  }
  const list = stories.filter((s) => level === 'all' || s.level === level)

  return (
    <Page feature="stories" size="wide">
      <div className="flex flex-wrap gap-2.5">
        {(['all', ...levels] as const).map((f) => (
          <button
            key={f}
            type="button"
            onClick={() => pick(f)}
            aria-pressed={level === f}
            className={clsx('btn px-4 py-1.5 text-sm', level === f ? 'bg-sand' : 'text-ink-soft')}
          >
            {f === 'all' ? t('vocab.all') : `HSK ${f}`}
            {f !== 'all' && (
              <span className="text-xs font-normal text-ink-muted">
                {stories.filter((s) => s.level === f && done.has(s.id)).length}/{stories.filter((s) => s.level === f).length}
              </span>
            )}
          </button>
        ))}
      </div>

      <p className="mt-4 text-sm font-medium text-ink-soft">
        {t('stories.count', { count: list.length, read: list.filter((s) => done.has(s.id)).length })}
      </p>

      <div className="mt-3 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {list.map((s) => (
          <Link key={s.id} to={`/stories/${s.id}`} className="box group block overflow-hidden">
            <div className="relative aspect-[8/5] border-b-2 border-ink bg-ink/10">
              <img src={`/stories/${s.id}.svg`} alt="" loading="lazy" className="h-full w-full object-cover" />
              <span className={clsx('tag absolute top-2.5 left-2.5', levelColor[s.level])}>HSK {s.level}</span>
              {done.has(s.id) && (
                <span className="tag absolute top-2.5 right-2.5 bg-sage">
                  <Check size={12} />
                  {t('stories.read')}
                </span>
              )}
            </div>
            <div className="px-4 py-3">
              <p className="font-kai text-2xl font-bold group-hover:text-brick">{s.title}</p>
              <p className="mt-0.5 line-clamp-1 font-bold">{storyTitle(s, i18n.language)}</p>
              <p className="mt-1 text-xs text-ink-soft">
                {s.origin ?? t('stories.original')} · {t('stories.sentences', { count: s.paragraphs.flat().length })}
              </p>
            </div>
          </Link>
        ))}
      </div>
    </Page>
  )
}
