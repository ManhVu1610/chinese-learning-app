import clsx from 'clsx'
import { ChevronRight } from 'lucide-react'
import { lazy } from 'react'
import { useTranslation } from 'react-i18next'
import { Link, Navigate, useParams } from 'react-router-dom'
import Page from '../components/layout/Page'
import { games, type GameKey } from '../games/registry'

const screens: Record<GameKey, React.LazyExoticComponent<() => React.JSX.Element>> = {
  'word-search': lazy(() => import('../games/FindChar')),
  shooter: lazy(() => import('../games/Shooter')),
  match: lazy(() => import('../games/Match')),
  bugs: lazy(() => import('../games/Bugs')),
  solitaire: lazy(() => import('../games/Solitaire')),
}

/** /games: danh sách trò chơi; /games/:game: màn chơi của một trò. */
export default function Games() {
  const { t } = useTranslation()
  const { game } = useParams()
  if (game) {
    const Screen = screens[game as GameKey]
    return Screen ? <Screen key={game} /> : <Navigate to="/games" replace />
  }
  return (
    <Page feature="games">
      <ul className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {games.map((g) => {
          const Icon = g.icon
          return (
            <li key={g.key}>
              <Link
                to={`/games/${g.key}`}
                className="group box flex h-full items-start gap-3 p-4 transition-transform hover:-translate-y-0.5"
              >
                <span className={clsx('sticker shrink-0 p-2.5', g.color)}>
                  <Icon size={22} />
                </span>
                <span className="min-w-0 flex-1">
                  <span className="block text-lg font-extrabold">{t(`game.${g.key}.name`)}</span>
                  <span className="mt-0.5 block text-xs font-bold text-ink-soft">{t(`game.${g.key}.theme`)}</span>
                  <span className="mt-1 block text-sm text-ink-soft">{t(`game.${g.key}.intro`)}</span>
                </span>
                <ChevronRight size={18} className="mt-1 shrink-0 text-ink-muted transition-transform group-hover:translate-x-0.5" />
              </Link>
            </li>
          )
        })}
      </ul>
    </Page>
  )
}
