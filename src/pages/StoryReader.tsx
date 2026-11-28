import clsx from 'clsx'
import { ArrowLeft, ArrowRight, Check, Eye, Languages, Lightbulb, Pause, Volume2 } from 'lucide-react'
import { useEffect, useMemo, useRef, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { Link, Navigate, useParams } from 'react-router-dom'
import Page from '../components/layout/Page'
import { levelColor } from '../components/WordCard'
import { stories, storyById, storyTitle } from '../data/stories'
import { useDictionary } from '../hooks/useDictionary'
import { getMandarinVoice } from '../hooks/useSpeech'
import { useStoryProgress } from '../hooks/useStoryProgress'
import { toWordChips, type WordChip } from '../lib/wordChips'

const SETTINGS_KEY = 'stories_view'
interface View {
  showPinyin: boolean
  showMeaning: boolean
  rate: number
}
const DEFAULTS: View = { showPinyin: true, showMeaning: false, rate: 0.8 }
const RATES = [0.6, 0.8, 1] as const

/** Đọc một truyện: chữ Hán kèm pinyin, bản dịch từng câu, bấm câu để nghe, nghe cả truyện. */
export default function StoryReader() {
  const { id = '' } = useParams()
  const { t, i18n } = useTranslation()
  const story = storyById(id)
  const { done, setRead } = useStoryProgress()
  const { words: dictionary } = useDictionary()

  const [view, setView] = useState<View>(() => {
    try {
      return { ...DEFAULTS, ...JSON.parse(localStorage.getItem(SETTINGS_KEY) ?? '{}') }
    } catch {
      return DEFAULTS
    }
  })
  useEffect(() => localStorage.setItem(SETTINGS_KEY, JSON.stringify(view)), [view])
  const setV = (p: Partial<View>) => setView((s) => ({ ...s, ...p }))

  const sentences = useMemo(() => story?.paragraphs.flat() ?? [], [story])
  const [chips, setChips] = useState<WordChip[][]>([])
  const [speaking, setSpeaking] = useState(-1)
  const [playingAll, setPlayingAll] = useState(false)
  const playAllRef = useRef(false)

  // Chia từ + pinyin theo danh sách từ vựng.
  const known = useMemo(() => new Set(dictionary.map((w) => w.hanzi).filter((h) => h.length > 1 && h.length <= 4)), [dictionary])
  useEffect(() => {
    let alive = true
    Promise.all(sentences.map(([zh]) => toWordChips(zh, known))).then((list) => alive && setChips(list))
    return () => {
      alive = false
    }
  }, [sentences, known])

  // Rời trang / đổi truyện: dừng đọc.
  useEffect(() => {
    return () => {
      playAllRef.current = false
      if ('speechSynthesis' in window) speechSynthesis.cancel()
    }
  }, [id])

  if (!story) return <Navigate to="/stories" replace />

  const speakAt = (i: number, chain: boolean) => {
    if (!('speechSynthesis' in window)) return
    const u = new SpeechSynthesisUtterance(sentences[i][0])
    const voice = getMandarinVoice()
    if (voice) {
      u.voice = voice
      u.lang = voice.lang
    } else u.lang = 'zh-CN'
    u.rate = view.rate
    u.onend = () => {
      if (chain && playAllRef.current && i + 1 < sentences.length) speakAt(i + 1, true)
      else {
        setSpeaking((cur) => (cur === i ? -1 : cur))
        if (chain) {
          playAllRef.current = false
          setPlayingAll(false)
        }
      }
    }
    setSpeaking(i)
    speechSynthesis.speak(u)
  }
  const speakOne = (i: number) => {
    playAllRef.current = false
    setPlayingAll(false)
    speechSynthesis.cancel()
    speakAt(i, false)
  }
  const toggleAll = () => {
    speechSynthesis.cancel()
    if (playingAll) {
      playAllRef.current = false
      setPlayingAll(false)
      setSpeaking(-1)
      return
    }
    playAllRef.current = true
    setPlayingAll(true)
    speakAt(speaking > 0 ? speaking : 0, true)
  }
  const speakWord = (text: string) => {
    playAllRef.current = false
    setPlayingAll(false)
    setSpeaking(-1)
    speechSynthesis.cancel()
    const u = new SpeechSynthesisUtterance(text)
    const voice = getMandarinVoice()
    if (voice) {
      u.voice = voice
      u.lang = voice.lang
    } else u.lang = 'zh-CN'
    u.rate = view.rate
    speechSynthesis.speak(u)
  }

  const idx = stories.indexOf(story)
  const prev = stories[idx - 1]
  const next = stories[idx + 1]
  const isRead = done.has(story.id)
  const title = storyTitle(story, i18n.language)

  const pill = (on: boolean, onClick: () => void, Icon: typeof Eye, label: string) => (
    <button type="button" onClick={onClick} aria-pressed={on} className={clsx('btn px-3 py-1.5 text-xs', on && 'bg-sand')}>
      <Icon size={14} />
      {label}
    </button>
  )

  // Chỉ số câu đầu của mỗi đoạn trong danh sách câu chung.
  const starts = story.paragraphs.map((_, pi) => story.paragraphs.slice(0, pi).reduce((a, p) => a + p.length, 0))
  return (
    <Page
      feature="stories"
      size="narrow"
      title={<span className="font-kai">{story.title}</span>}
      description={title}
      crumbs={[{ label: story.title }]}
      meta={
        <>
          <span className={clsx('tag', levelColor[story.level])}>HSK {story.level}</span>
          <span>{story.origin ?? t('stories.original')}</span>
        </>
      }
    >
      <img src={`/stories/${story.id}.svg`} alt="" className="box mx-auto block aspect-[8/5] w-full max-w-md object-cover p-0" />

      <div className="sticky top-[5.5rem] z-10 mt-5 flex flex-wrap items-center gap-2 -mx-2 rounded-2xl bg-paper/90 px-2 py-2 backdrop-blur">
        <button type="button" onClick={toggleAll} className="btn btn-primary px-4 py-1.5 text-sm">
          {playingAll ? <Pause size={16} /> : <Volume2 size={16} />}
          {playingAll ? t('stories.stop') : t('stories.listen_all')}
        </button>
        {pill(view.showPinyin, () => setV({ showPinyin: !view.showPinyin }), Eye, 'Pinyin')}
        {pill(view.showMeaning, () => setV({ showMeaning: !view.showMeaning }), Languages, t('stories.translation'))}
        <span className="ml-auto flex gap-1">
          {RATES.map((r) => (
            <button
              key={r}
              type="button"
              onClick={() => setV({ rate: r })}
              aria-pressed={view.rate === r}
              title={t('stories.speed')}
              className={clsx('btn px-2 py-1 text-xs', view.rate === r && 'bg-sand')}
            >
              {r}×
            </button>
          ))}
        </span>
      </div>
      <p className="mt-1 text-xs text-ink-muted">{t('stories.tap_hint')}</p>

      <article className="box mt-3 space-y-6 p-5 sm:p-7">
        {story.paragraphs.map((para, pi) => (
          <div key={pi} className="space-y-2">
            <p className="flex flex-wrap items-end gap-x-1 gap-y-2">
              {para.map((_, si) => {
                const i = starts[pi] + si
                const list = chips[i] ?? [{ text: sentences[i][0], pinyin: '' }]
                return (
                  <button
                    key={i}
                    type="button"
                    onClick={() => speakOne(i)}
                    className={clsx(
                      'inline-flex flex-wrap items-end gap-x-1.5 rounded-lg px-1 text-left transition-colors hover:bg-sand/60',
                      speaking === i && 'bg-sand',
                    )}
                  >
                    {list.map((c, ci) => (
                      <span key={ci} className="inline-flex flex-col items-center leading-tight">
                        {view.showPinyin && <span className="text-[11px] text-ink-soft">{c.pinyin || ' '}</span>}
                        <span className="font-kai text-2xl font-bold">{c.text}</span>
                      </span>
                    ))}
                  </button>
                )
              })}
            </p>
            {view.showMeaning && <p className="border-l-4 border-line pl-3 text-sm text-ink-soft">{para.map(([, vi]) => vi).join(' ')}</p>}
          </div>
        ))}
      </article>

      {story.moral_vi && (
        <div className="box mt-5 flex gap-3 bg-sand p-4">
          <Lightbulb size={20} className="mt-0.5 shrink-0" />
          <div>
            <p className="font-extrabold">{t('stories.moral')}</p>
            <p className="mt-0.5 text-sm">{story.moral_vi}</p>
          </div>
        </div>
      )}

      <section className="mt-6">
        <h2 className="text-lg font-extrabold">{t('stories.words')}</h2>
        <div className="mt-3 grid gap-2.5 sm:grid-cols-2">
          {story.words.map((w) => (
            <button
              key={w.hanzi}
              type="button"
              onClick={() => speakWord(w.hanzi)}
              className="box flex items-center gap-3 px-4 py-2.5 text-left hover:bg-sand/40"
            >
              <span className="font-kai text-2xl font-bold">{w.hanzi}</span>
              <span className="min-w-0 flex-1">
                <span className="block text-sm font-semibold text-brick">{w.pinyin}</span>
                <span className="block text-sm text-ink-soft">{w.vi}</span>
              </span>
              <Volume2 size={16} className="shrink-0 text-ink-muted" />
            </button>
          ))}
        </div>
      </section>

      <div className="mt-8 flex flex-wrap items-center gap-3">
        <button
          type="button"
          onClick={() => setRead(story.id, !isRead)}
          aria-pressed={isRead}
          className={clsx('btn px-4 py-2', isRead ? 'bg-sage' : 'btn-primary')}
        >
          <Check size={16} />
          {isRead ? t('stories.marked_read') : t('stories.mark_read')}
        </button>
        <span className="ml-auto flex gap-2">
          {prev && (
            <Link to={`/stories/${prev.id}`} className="btn px-3 py-2 text-sm" title={storyTitle(prev, i18n.language)}>
              <ArrowLeft size={16} />
              {t('stories.prev')}
            </Link>
          )}
          {next && (
            <Link to={`/stories/${next.id}`} className="btn px-3 py-2 text-sm" title={storyTitle(next, i18n.language)}>
              {t('stories.next')}
              <ArrowRight size={16} />
            </Link>
          )}
        </span>
      </div>
    </Page>
  )
}
