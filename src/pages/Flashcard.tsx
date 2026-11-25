import clsx from 'clsx'
import { BookOpenCheck, CalendarClock, Layers, Plus, Volume2, X } from 'lucide-react'
import { useState } from 'react'
import { useTranslation } from 'react-i18next'
import { Link } from 'react-router-dom'
import { getByLevel, hskWords } from '../data/hsk'
import { useFlashcard } from '../hooks/useFlashcard'
import { useSpeech } from '../hooks/useSpeech'
import type { HSKLevel, Rating, Word } from '../types'

const levels: HSKLevel[] = [1, 2, 3, 4, 5, 6]

const ratings: { key: Rating; className: string }[] = [
  { key: 'again', className: 'bg-red-600 hover:bg-red-700' },
  { key: 'hard', className: 'bg-orange-500 hover:bg-orange-600' },
  { key: 'good', className: 'bg-green-600 hover:bg-green-700' },
  { key: 'easy', className: 'bg-blue-600 hover:bg-blue-700' },
]

type Mode = 'dashboard' | 'session' | 'done'

export default function Flashcard() {
  const { t } = useTranslation()
  const { speak, supported } = useSpeech()
  const { getDueCards, addWords, grade, stats, hasCard, loading, synced, syncError } = useFlashcard()

  const [mode, setMode] = useState<Mode>('dashboard')
  const [queue, setQueue] = useState<Word[]>([])
  const [index, setIndex] = useState(0)
  const [showAnswer, setShowAnswer] = useState(false)
  const [picking, setPicking] = useState(false)
  const [notice, setNotice] = useState<string | null>(null)

  const s = stats()

  const start = () => {
    const due = getDueCards(hskWords)
    if (!due.length) return
    setQueue(due)
    setIndex(0)
    setShowAnswer(false)
    setNotice(null)
    setMode('session')
  }

  const addLevel = (level: HSKLevel) => {
    const added = addWords(getByLevel(level))
    setNotice(t('flashcard.added', { count: added, level }))
    setPicking(false)
  }

  const rate = (rating: Rating) => {
    grade(queue[index].id, rating)
    if (index + 1 >= queue.length) {
      setMode('done')
    } else {
      setIndex(index + 1)
      setShowAnswer(false)
    }
  }

  // ----- Màn hình 3: kết thúc -----
  if (mode === 'done') {
    return (
      <section className="mx-auto max-w-xl px-4 py-20 text-center">
        <p className="text-6xl">🎉</p>
        <h1 className="mt-4 text-3xl font-bold">{t('flashcard.done')}</h1>
        <p className="mt-2 text-lg text-gray-600">{t('flashcard.reviewed', { count: queue.length })}</p>
        <div className="mt-8 flex justify-center gap-3">
          <Link
            to="/"
            className="rounded-lg bg-[#DC2626] px-6 py-2.5 font-medium text-white hover:bg-red-700"
          >
            {t('flashcard.back_home')}
          </Link>
          <button
            type="button"
            onClick={() => setMode('dashboard')}
            className="rounded-lg border border-gray-300 px-6 py-2.5 font-medium text-gray-700 hover:bg-gray-50"
          >
            {t('flashcard.back_dashboard')}
          </button>
        </div>
      </section>
    )
  }

  // ----- Màn hình 2: phiên ôn tập -----
  if (mode === 'session') {
    const word = queue[index]
    const progress = ((index + (showAnswer ? 0.5 : 0)) / queue.length) * 100
    return (
      <section className="mx-auto max-w-xl px-4 py-8">
        <div className="flex items-center gap-3">
          <div className="h-2 flex-1 overflow-hidden rounded-full bg-gray-200">
            <div className="h-full bg-[#DC2626] transition-all" style={{ width: `${progress}%` }} />
          </div>
          <span className="text-sm font-medium text-gray-500 tabular-nums">
            {index + 1}/{queue.length}
          </span>
          <button
            type="button"
            onClick={() => setMode('dashboard')}
            title={t('flashcard.quit')}
            className="rounded-full p-1.5 text-gray-400 hover:bg-gray-100 hover:text-gray-700"
          >
            <X size={18} />
          </button>
        </div>

        <div className="mt-6 flex min-h-80 flex-col items-center justify-center rounded-2xl border border-gray-200 bg-white p-8 text-center shadow-sm">
          <p className="text-6xl font-bold text-[#DC2626]">{word.hanzi}</p>
          {showAnswer && (
            <>
              <p className="mt-4 text-xl text-gray-500 italic">{word.pinyin}</p>
              <p className="mt-3 text-2xl font-medium">{word.meaning_vi}</p>
              <p className="mt-1 text-gray-400">{word.meaning_en}</p>
              {supported && (
                <button
                  type="button"
                  onClick={() => speak(word.hanzi)}
                  title={t('vocab.speak')}
                  className="mt-4 rounded-full p-3 text-gray-500 hover:bg-red-50 hover:text-[#DC2626]"
                >
                  <Volume2 size={22} />
                </button>
              )}
            </>
          )}
        </div>

        {showAnswer ? (
          <div className="mt-6 grid grid-cols-4 gap-2">
            {ratings.map(({ key, className }) => (
              <button
                key={key}
                type="button"
                onClick={() => rate(key)}
                className={clsx('rounded-lg py-3 font-semibold text-white', className)}
              >
                {t(`flashcard.${key}`)}
              </button>
            ))}
          </div>
        ) : (
          <button
            type="button"
            onClick={() => setShowAnswer(true)}
            className="mt-6 w-full rounded-lg bg-gray-900 py-3 font-semibold text-white hover:bg-gray-800"
          >
            {t('flashcard.show_answer')}
          </button>
        )}
      </section>
    )
  }

  // ----- Màn hình 1: dashboard -----
  const statItems = [
    { value: s.due, label: t('flashcard.due'), icon: CalendarClock, color: 'text-[#DC2626]' },
    { value: s.learned, label: t('flashcard.learned'), icon: BookOpenCheck, color: 'text-green-600' },
    { value: s.total, label: t('flashcard.total'), icon: Layers, color: 'text-gray-700' },
  ]

  return (
    <section className="mx-auto max-w-3xl px-4 py-8">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h1 className="text-3xl font-bold">{t('nav.flashcard')}</h1>
        {synced ? (
          <span
            title={t('auth.sync_on')}
            className="rounded-full bg-green-50 px-3 py-1 text-xs font-medium text-green-700 ring-1 ring-green-200"
          >
            ☁️ {t('auth.syncing')}
          </span>
        ) : (
          <div className="flex items-center gap-2 text-xs">
            <span
              title={t('auth.sync_off')}
              className="rounded-full bg-gray-100 px-3 py-1 font-medium text-gray-600 ring-1 ring-gray-200"
            >
              💾 {t('auth.sync_off')}
            </span>
            <Link to="/login" className="font-medium text-[#DC2626] hover:underline">
              {t('auth.login_to_sync')}
            </Link>
          </div>
        )}
      </div>

      {syncError && (
        <p className="mt-3 rounded-lg bg-red-50 px-3 py-2 text-sm text-red-700">
          {t('auth.sync_error', { message: syncError })}
        </p>
      )}

      {loading ? (
        <p className="mt-10 text-center text-gray-500">{t('common.loading')}</p>
      ) : (
        <>
      <div className="mt-6 grid grid-cols-3 gap-3">
        {statItems.map(({ value, label, icon: Icon, color }) => (
          <div key={label} className="rounded-xl border border-gray-200 bg-white p-4 text-center shadow-sm">
            <Icon size={20} className={clsx('mx-auto', color)} />
            <p className={clsx('mt-2 text-3xl font-bold tabular-nums', color)}>{value}</p>
            <p className="text-sm text-gray-500">{label}</p>
          </div>
        ))}
      </div>

      <div className="mt-6 flex flex-col gap-3 sm:flex-row">
        <button
          type="button"
          onClick={start}
          disabled={s.due === 0}
          className="flex-1 rounded-lg bg-[#DC2626] py-3 font-semibold text-white hover:bg-red-700 disabled:cursor-not-allowed disabled:bg-gray-300"
        >
          {t('flashcard.start')}
        </button>
        <button
          type="button"
          onClick={() => setPicking((p) => !p)}
          className="flex flex-1 items-center justify-center gap-2 rounded-lg border border-[#DC2626] py-3 font-semibold text-[#DC2626] hover:bg-red-50"
        >
          <Plus size={18} />
          {t('flashcard.add_words')}
        </button>
      </div>

      {s.total === 0 && !picking && (
        <p className="mt-4 text-center text-sm text-gray-500">{t('flashcard.empty_hint')}</p>
      )}
      {notice && <p className="mt-4 text-center text-sm text-green-700">{notice}</p>}

      {picking && (
        <div className="mt-4 rounded-xl border border-gray-200 bg-white p-4 shadow-sm">
          <p className="mb-3 font-medium">{t('flashcard.choose_level')}</p>
          <div className="grid grid-cols-3 gap-2 sm:grid-cols-6">
            {levels.map((lv) => {
              const words = getByLevel(lv)
              const remaining = words.filter((w) => !hasCard(w.id)).length
              return (
                <button
                  key={lv}
                  type="button"
                  onClick={() => addLevel(lv)}
                  disabled={remaining === 0}
                  className="rounded-lg border border-gray-300 px-2 py-2 text-sm hover:border-[#DC2626] hover:text-[#DC2626] disabled:cursor-not-allowed disabled:opacity-40 disabled:hover:border-gray-300 disabled:hover:text-current"
                >
                  <span className="block font-semibold">HSK {lv}</span>
                  <span className="text-xs text-gray-500">
                    {t('flashcard.new_count', { count: remaining })}
                  </span>
                </button>
              )
            })}
          </div>
        </div>
      )}
        </>
      )}
    </section>
  )
}
