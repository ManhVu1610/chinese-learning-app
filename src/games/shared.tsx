import clsx from 'clsx'
import { Gamepad2, Heart, RotateCcw, Settings2, Volume2, X } from 'lucide-react'
import { useEffect, useRef, useState, type ReactNode } from 'react'
import { useTranslation } from 'react-i18next'
import { Link } from 'react-router-dom'
import PracticeSetup from '../components/practice/PracticeSetup'
import SettingsSection from '../components/ui/SettingsSection'
import { useSpeech } from '../hooks/useSpeech'
import type { Word } from '../types'
import type { GameKey } from './registry'

export { han, shuffle } from './util'

export const pick = <T,>(arr: T[]) => arr[Math.floor(Math.random() * arr.length)]

/** mm:ss */
export const fmtTime = (ms: number) => {
  const s = Math.max(0, Math.floor(ms / 1000))
  return `${Math.floor(s / 60)}:${String(s % 60).padStart(2, '0')}`
}

/** Đồng hồ đếm lên, dừng khi `running` = false. */
export function useStopwatch(running: boolean, resetKey: unknown) {
  const [ms, setMs] = useState(0)
  const startRef = useRef(0)
  const baseRef = useRef(0)
  useEffect(() => {
    setMs(0)
    baseRef.current = 0
  }, [resetKey])
  useEffect(() => {
    if (!running) return
    startRef.current = performance.now()
    const id = setInterval(() => setMs(baseRef.current + performance.now() - startRef.current), 250)
    return () => {
      baseRef.current += performance.now() - startRef.current
      clearInterval(id)
    }
  }, [running, resetKey])
  return ms
}

/** Lưu một lựa chọn cài đặt của trò chơi vào localStorage. */
export function useSetting<T extends string | number | boolean>(key: string, initial: T) {
  const [v, setV] = useState<T>(() => {
    try {
      const raw = localStorage.getItem(key)
      return raw === null ? initial : (JSON.parse(raw) as T)
    } catch {
      return initial
    }
  })
  const set = (next: T) => {
    setV(next)
    localStorage.setItem(key, JSON.stringify(next))
  }
  return [v, set] as const
}

/** Màn chọn nguồn từ (HSK + sổ tay) của một trò chơi, trong khung trang chung. */
export function GameSetup({
  game,
  filter,
  children,
  onStart,
}: {
  game: GameKey
  filter?: (w: Word) => boolean
  children?: ReactNode
  onStart: (words: Word[]) => void
}) {
  const { t } = useTranslation()
  return (
    <PracticeSetup
      feature="games"
      title={t(`game.${game}.name`)}
      intro={t(`game.${game}.intro`)}
      crumbs={[{ label: t(`game.${game}.name`) }]}
      showCount={false}
      filter={filter}
      onStart={(_, pool) => onStart(pool)}
      before={<HowTo game={game} />}
    >
      {children}
    </PracticeSetup>
  )
}

/** Hộp "Cách chơi" ngắn, lấy các dòng game.<key>.rules (mảng). */
function HowTo({ game }: { game: GameKey }) {
  const { t } = useTranslation()
  const rules = t(`game.${game}.rules`, { returnObjects: true }) as string[]
  return (
    <SettingsSection title={t('game.how_to')} defaultOpen storageKey={`howto_${game}`}>
      <ul className="list-disc space-y-1 pl-5 text-sm text-ink-soft">{Array.isArray(rules) && rules.map((r, i) => <li key={i}>{r}</li>)}</ul>
    </SettingsSection>
  )
}

/** Khung khi đang chơi: tên trò, các chỉ số, nút thoát. */
export function GameFrame({
  game,
  stats,
  onExit,
  wide,
  children,
}: {
  game: GameKey
  stats?: ReactNode
  onExit: () => void
  wide?: boolean
  children: ReactNode
}) {
  const { t } = useTranslation()
  return (
    <section className={clsx('mx-auto px-3 py-6 sm:px-4', wide ? 'max-w-6xl' : 'max-w-4xl')}>
      <div className="flex flex-wrap items-center gap-2">
        <h1 className="mr-auto text-xl font-bold">{t(`game.${game}.name`)}</h1>
        <div className="flex flex-wrap items-center gap-2 text-sm font-semibold tabular-nums">{stats}</div>
        <button type="button" onClick={onExit} aria-label={t('practice.exit')} title={t('practice.exit')} className="btn p-1.5">
          <X size={16} />
        </button>
      </div>
      <div className="mt-4">{children}</div>
    </section>
  )
}

/** Một ô chỉ số nhỏ trong thanh trên cùng. */
export const Stat = ({ children, className, label }: { children: ReactNode; className?: string; label?: string }) => (
  <span title={label} aria-label={label} className={clsx('tag gap-1 px-2.5 py-1 text-sm', className)}>
    {children}
  </span>
)

/** Số mạng còn lại, vẽ bằng trái tim. */
export function Lives({ left, total }: { left: number; total: number }) {
  const { t } = useTranslation()
  return (
    <Stat className="text-brick" label={t('game.lives', { n: left })}>
      {Array.from({ length: total }, (_, i) => (
        <Heart key={i} size={14} fill={i < left ? 'currentColor' : 'none'} className={i < left ? '' : 'opacity-40'} />
      ))}
    </Stat>
  )
}

/** Màn kết thúc: thắng / thua, các chỉ số, danh sách từ vừa gặp. */
export function GameOver({
  game,
  win,
  lines,
  words,
  wrongIds = [],
  loseText,
  actions,
  onReplay,
  onSetup,
}: {
  game: GameKey
  win: boolean
  /** Nút thêm, đặt trước "Chơi lại" (vd Màn tiếp theo) */
  actions?: ReactNode
  /** Câu báo thua riêng (mặc định: hết mạng) */
  loseText?: string
  lines: { label: string; value: ReactNode }[]
  words: Word[]
  wrongIds?: string[]
  onReplay: () => void
  onSetup: () => void
}) {
  const { t } = useTranslation()
  const { speak, supported } = useSpeech()
  // Từ sai đưa lên đầu.
  const list = [...words].sort((a, b) => Number(wrongIds.includes(b.id)) - Number(wrongIds.includes(a.id)))
  return (
    <section className="mx-auto max-w-2xl px-4 py-8">
      <h1 className="text-xl font-bold">{t(`game.${game}.name`)}</h1>
      <div className="box mt-5 p-6 text-center">
        <p className="text-4xl">{win ? '🎉' : '💪'}</p>
        <p className="mt-2 text-2xl font-extrabold">{win ? t('game.win') : (loseText ?? t('game.lose'))}</p>
        <dl className="mx-auto mt-4 grid max-w-md grid-cols-2 gap-2 text-sm sm:grid-cols-3">
          {lines.map((l) => (
            <div key={l.label} className="rounded-2xl border-2 border-line px-2 py-2">
              <dt className="text-xs text-ink-muted">{l.label}</dt>
              <dd className="text-lg font-extrabold tabular-nums">{l.value}</dd>
            </div>
          ))}
        </dl>
        <div className="mt-5 flex flex-wrap justify-center gap-2">
          {actions}
          <button type="button" onClick={onReplay} className="btn btn-accent px-4 py-2 text-sm">
            <RotateCcw size={15} />
            {t('game.replay')}
          </button>
          <button type="button" onClick={onSetup} className="btn px-4 py-2 text-sm">
            <Settings2 size={15} />
            {t('practice.change_setup')}
          </button>
          <Link to="/games" className="btn px-4 py-2 text-sm">
            <Gamepad2 size={15} />
            {t('game.all_games')}
          </Link>
        </div>
      </div>
      {list.length > 0 && (
        <div className="box mt-5 p-4">
          <h2 className="font-bold">{t('game.words_seen')}</h2>
          <ul className="mt-2 max-h-96 divide-y-2 divide-line overflow-y-auto">
            {list.map((w) => (
              <li key={w.id} className="flex items-baseline gap-3 py-1.5">
                <span className={clsx('text-xl font-bold', wrongIds.includes(w.id) ? 'text-brick' : '')}>{w.hanzi}</span>
                <span className="text-sm text-ink-soft italic">{w.pinyin}</span>
                <span className="min-w-0 flex-1 truncate text-sm">{w.meaning_vi}</span>
                {supported && (
                  <button
                    type="button"
                    onClick={() => speak(w.hanzi)}
                    className="self-center rounded-full p-1 text-ink-soft hover:bg-paper"
                    aria-label={t('practice.play')}
                  >
                    <Volume2 size={15} />
                  </button>
                )}
              </li>
            ))}
          </ul>
        </div>
      )}
    </section>
  )
}

/** Phase chung: cài đặt → chơi → kết thúc. */
export type Phase = 'setup' | 'play' | 'over'
