import clsx from 'clsx'
import { BookOpenCheck, CalendarClock, Layers, Plus, Volume2, X } from 'lucide-react'
import { useEffect, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { Link, useLocation, useNavigate } from 'react-router-dom'
import { hskWords } from '../data/hsk'
import { useDictionary } from '../hooks/useDictionary'
import { useFlashcard } from '../hooks/useFlashcard'
import { useSpeech } from '../hooks/useSpeech'
import type { HSKLevel, Rating, Word } from '../types'

const levels: HSKLevel[] = [1, 2, 3, 4, 5, 6]

// Màu dịu: Lại = san hô, Khó = cam mơ, Tốt = xanh lá xám, Dễ = xanh dương xám
const ratings: { key: Rating; className: string }[] = [
  { key: 'again', className: 'bg-coral' },
  { key: 'hard', className: 'bg-apricot' },
  { key: 'good', className: 'bg-sage' },
  { key: 'easy', className: 'bg-sky' },
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
  const { words: allWords } = useDictionary()
  const location = useLocation()
  const navigate = useNavigate()

  const s = stats()

  // "Ôn tập ngay" từ Sổ tay: trang được mở kèm danh sách từ, vào thẳng phiên ôn tập.
  useEffect(() => {
    const practice = (location.state as { practiceWords?: Word[] } | null)?.practiceWords
    if (!practice?.length) return
    setQueue(practice)
    setIndex(0)
    setShowAnswer(false)
    setNotice(null)
    setMode('session')
    navigate(location.pathname, { replace: true, state: null })
  }, [location.state, location.pathname, navigate])

  const start = () => {
    const due = getDueCards(allWords.length ? allWords : hskWords)
    if (!due.length) return
    setQueue(due)
    setIndex(0)
    setShowAnswer(false)
    setNotice(null)
    setMode('session')
  }

  const addLevel = (level: HSKLevel) => {
    const added = addWords(allWords.filter((w) => w.hsk_level === level))
    setNotice(t('flashcard.added', { count: added, level }))
    setPicking(false)
  }

  const rate = (rating: Rating) => {
    const word = queue[index]
    // Từ ôn từ Sổ tay có thể chưa có trong bộ thẻ: thêm vào trước rồi chấm điểm.
    if (!hasCard(word.id)) addWords([word])
    grade(word.id, rating)
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
      <section className="mx-auto max-w-xl px-4 py-16">
        <div className="box p-10 text-center">
          <p className="text-6xl">🎉</p>
          <h1 className="mt-4 text-3xl font-bold">{t('flashcard.done')}</h1>
          <p className="mt-2 text-lg text-ink-soft">{t('flashcard.reviewed', { count: queue.length })}</p>
          <div className="mt-8 flex flex-wrap justify-center gap-3">
            <Link to="/" className="btn btn-primary px-6">
              {t('flashcard.back_home')}
            </Link>
            <button type="button" onClick={() => setMode('dashboard')} className="btn px-6">
              {t('flashcard.back_dashboard')}
            </button>
          </div>
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
          <div className="h-4 flex-1 overflow-hidden rounded-full border-2 border-ink bg-card">
            <div className="h-full bg-sage transition-all" style={{ width: `${progress}%` }} />
          </div>
          <span className="text-sm font-bold tabular-nums">
            {index + 1}/{queue.length}
          </span>
          <button
            type="button"
            onClick={() => setMode('dashboard')}
            title={t('flashcard.quit')}
            aria-label={t('flashcard.quit')}
            className="btn p-1.5"
          >
            <X size={16} />
          </button>
        </div>

        <div className="box mt-6 flex min-h-80 flex-col items-center justify-center p-8 text-center shadow-block-lg">
          <p className="text-6xl font-bold text-brick">{word.hanzi}</p>
          {showAnswer && (
            <div className="mt-6 w-full border-t-2 border-dashed border-line pt-5">
              <p className="text-xl text-ink-soft italic">{word.pinyin}</p>
              <p className="mt-3 text-2xl font-semibold">{word.meaning_vi}</p>
              <p className="mt-1 text-ink-muted">{word.meaning_en}</p>
              {word.image && <img src={word.image} alt="" className="mx-auto mt-4 h-24 w-24 border-2 border-ink object-cover" />}
              {word.example && (
                <div className="mx-auto mt-4 max-w-sm border-l-4 border-sage bg-paper px-3 py-2 text-left">
                  <p className="font-semibold">{word.example}</p>
                  {word.example_pinyin && <p className="text-sm text-ink-soft italic">{word.example_pinyin}</p>}
                  {word.example_vi && <p className="text-sm">{word.example_vi}</p>}
                </div>
              )}
              {supported && (
                <button
                  type="button"
                  onClick={() => speak(word.hanzi)}
                  title={t('vocab.speak')}
                  aria-label={t('vocab.speak')}
                  className="btn mt-5 p-2.5"
                >
                  <Volume2 size={20} />
                </button>
              )}
            </div>
          )}
        </div>

        {showAnswer ? (
          <div className="mt-6 grid grid-cols-2 gap-3 sm:grid-cols-4">
            {ratings.map(({ key, className }) => (
              <button key={key} type="button" onClick={() => rate(key)} className={clsx('btn py-3', className)}>
                {t(`flashcard.${key}`)}
              </button>
            ))}
          </div>
        ) : (
          <button type="button" onClick={() => setShowAnswer(true)} className="btn btn-primary mt-6 w-full py-3">
            {t('flashcard.show_answer')}
          </button>
        )}
      </section>
    )
  }

  // ----- Màn hình 1: dashboard -----
  const statItems = [
    { value: s.due, label: t('flashcard.due'), icon: CalendarClock, color: 'bg-apricot' },
    { value: s.learned, label: t('flashcard.learned'), icon: BookOpenCheck, color: 'bg-sage' },
    { value: s.total, label: t('flashcard.total'), icon: Layers, color: 'bg-sky' },
  ]

  return (
    <section className="mx-auto max-w-3xl px-4 py-8">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h1 className="text-3xl font-bold">{t('nav.flashcard')}</h1>
        {synced ? (
          <span title={t('auth.sync_on')} className="tag bg-sage">
            ☁️ {t('auth.syncing')}
          </span>
        ) : (
          <div className="flex items-center gap-3 text-xs">
            <span title={t('auth.sync_off')} className="tag">
              💾 {t('auth.sync_off')}
            </span>
            <Link to="/login" className="font-semibold underline decoration-2 underline-offset-4">
              {t('auth.login_to_sync')}
            </Link>
          </div>
        )}
      </div>

      {syncError && (
        <p className="mt-4 border-2 border-ink bg-coral px-3 py-2 text-sm">
          {t('auth.sync_error', { message: syncError })}
        </p>
      )}

      {loading ? (
        <p className="box mt-8 p-8 text-center text-ink-soft">{t('common.loading')}</p>
      ) : (
        <>
          <div className="mt-6 grid grid-cols-3 gap-4">
            {statItems.map(({ value, label, icon: Icon, color }) => (
              <div key={label} className="box p-4 text-center">
                <span className={clsx('sticker p-1.5', color)}>
                  <Icon size={18} />
                </span>
                <p className="mt-2 text-3xl font-bold tabular-nums">{value}</p>
                <p className="text-sm text-ink-soft">{label}</p>
              </div>
            ))}
          </div>

          <div className="mt-6 flex flex-col gap-4 sm:flex-row">
            <button type="button" onClick={start} disabled={s.due === 0} className="btn btn-primary flex-1 py-3">
              {t('flashcard.start')}
            </button>
            <button
              type="button"
              onClick={() => setPicking((p) => !p)}
              aria-expanded={picking}
              className={clsx('btn flex-1 py-3', picking && 'bg-sky')}
            >
              <Plus size={18} />
              {t('flashcard.add_words')}
            </button>
          </div>

          {s.total === 0 && !picking && (
            <p className="mt-5 text-center text-sm text-ink-soft">{t('flashcard.empty_hint')}</p>
          )}
          {notice && <p className="mt-5 border-2 border-ink bg-sage px-3 py-2 text-center text-sm">{notice}</p>}

          {picking && (
            <div className="box mt-5 p-4">
              <p className="mb-3 font-semibold">{t('flashcard.choose_level')}</p>
              <div className="grid grid-cols-3 gap-3 sm:grid-cols-6">
                {levels.map((lv) => {
                  const remaining = allWords.filter((w) => w.hsk_level === lv && !hasCard(w.id)).length
                  return (
                    <button
                      key={lv}
                      type="button"
                      onClick={() => addLevel(lv)}
                      disabled={remaining === 0}
                      className="btn flex-col gap-0 px-2 py-2 text-sm"
                    >
                      <span className="font-bold">HSK {lv}</span>
                      <span className="text-xs font-normal">{t('flashcard.new_count', { count: remaining })}</span>
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
