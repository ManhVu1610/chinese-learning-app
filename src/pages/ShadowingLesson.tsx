import clsx from 'clsx'
import {
  ArrowLeft,
  ClipboardPaste,
  Eye,
  EyeOff,
  Flag,
  FlagOff,
  Gauge,
  Languages,
  Maximize2,
  Minimize2,
  Pause,
  Pencil,
  Play,
  Repeat,
  Scissors,
  SkipBack,
  SkipForward,
  Trash2,
  Volume2,
  VolumeX,
} from 'lucide-react'
import { useEffect, useMemo, useRef, useState, type ReactNode } from 'react'
import { useTranslation } from 'react-i18next'
import { Link, Navigate, useParams } from 'react-router-dom'
import Page from '../components/layout/Page'
import Modal from '../components/Modal'
import { useDictionary } from '../hooks/useDictionary'
import {
  fetchPresetSegments,
  formatTime,
  newSegmentId,
  parseTranscript,
  presetInfo,
  useShadowing,
  type ShadowSegment,
} from '../hooks/useShadowing'
import { useYouTubePlayer } from '../hooks/useYouTubePlayer'
import { translate } from '../lib/textTools'
import { toWordChips, type WordChip } from '../lib/wordChips'

const SPEEDS = [1, 0.75, 0.5] as const
const SETTINGS_KEY = 'shadowing_view'
interface View {
  speed: number
  showPinyin: boolean
  showMeaning: boolean
  /** Tự ngắt câu: dừng video ở cuối mỗi câu để người học nói theo */
  autoPause: boolean
}
const DEFAULTS: View = { speed: 1, showPinyin: true, showMeaning: true, autoPause: false }

/** Một bài shadowing: video + thanh điều khiển bên trái, bản chép từng câu bên phải; có chế độ phóng to. */
export default function ShadowingLesson() {
  const { id = '' } = useParams()
  const { t } = useTranslation()
  const { lessons, presetsLoaded, patch, patchSegment } = useShadowing()
  const lesson = lessons.find((l) => l.id === id)
  const yt = useYouTubePlayer(lesson?.videoId ?? '')
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

  const segments = useMemo(() => lesson?.segments ?? [], [lesson?.segments])
  const [time, setTime] = useState(0)
  const [playing, setPlaying] = useState(false)
  const [muted, setMuted] = useState(false)
  const [active, setActive] = useState(-1)
  const [loopIdx, setLoopIdx] = useState<number | null>(null)
  const [zoom, setZoom] = useState(false)
  const [pasteOpen, setPasteOpen] = useState(false)
  const [editing, setEditing] = useState(false)
  const [markStart, setMarkStart] = useState<number | null>(null)
  const [translating, setTranslating] = useState<string | null>(null)
  const [chips, setChips] = useState<Record<string, WordChip[]>>({})
  const listRef = useRef<HTMLDivElement>(null)
  const lastT = useRef(0)
  const live = useRef({ segments, active, loopIdx, autoPause: view.autoPause })
  live.current = { segments, active, loopIdx, autoPause: view.autoPause }

  // Video đã có file bài (do script tạo): lần đầu mở thì tải các câu.
  useEffect(() => {
    // Cả bài tự dán link trùng video đã có file bài cũng nạp được (trước đây chỉ bài nhúng sẵn).
    if (!lesson || lesson.segments.length) return
    const info = presetInfo(lesson.videoId)
    if (!info?.count) return
    fetchPresetSegments(lesson.videoId).then((d) => {
      if (d?.segments.length) patch(lesson.id, { segments: d.segments, title: d.title ?? lesson.title, channel: d.channel })
    })
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [lesson?.id, presetsLoaded])

  // Lấy tiêu đề thật của video (bài mới dán link chỉ có tên tạm).
  useEffect(() => {
    if (lesson && yt.title && lesson.title !== yt.title && (lesson.title === t('shadowing.new_title') || /^Video mẫu/.test(lesson.title)))
      patch(lesson.id, { title: yt.title })
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [yt.title])

  // Chia từ + pinyin cho mọi câu (theo danh sách từ vựng HSK).
  const known = useMemo(() => new Set(dictionary.map((w) => w.hanzi).filter((h) => h.length > 1 && h.length <= 4)), [dictionary])
  useEffect(() => {
    let alive = true
    Promise.all(segments.map(async (s) => [s.id, await toWordChips(s.text, known)] as const)).then(
      (list) => alive && setChips(Object.fromEntries(list)),
    )
    return () => {
      alive = false
    }
  }, [segments, known])

  // Theo dõi thời gian phát: câu đang chạy, lặp câu, tự ngắt câu.
  useEffect(() => {
    if (!yt.ready) return
    yt.player.current?.setPlaybackRate(view.speed)
    const id = setInterval(() => {
      const p = yt.player.current
      if (!p) return
      const now = p.getCurrentTime()
      const { segments: segs, loopIdx: loop, autoPause } = live.current
      const isPlaying = p.getPlayerState() === 1
      setPlaying(isPlaying)
      setMuted(p.isMuted())
      if (loop !== null && segs[loop] && isPlaying && now >= segs[loop].end - 0.05) {
        p.seekTo(segs[loop].start, true)
        lastT.current = segs[loop].start
        return
      }
      let idx = -1
      for (let i = 0; i < segs.length; i++) if (segs[i].start <= now + 0.05) idx = i
      if (autoPause && isPlaying && loop === null) {
        const cur = segs[live.current.active]
        if (cur && lastT.current < cur.end - 0.05 && now >= cur.end - 0.05) {
          p.pauseVideo()
          p.seekTo(cur.end, true)
        }
      }
      lastT.current = now
      setTime(now)
      setActive(idx)
    }, 100)
    return () => clearInterval(id)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [yt.ready])

  useEffect(() => {
    yt.player.current?.setPlaybackRate(view.speed)
  }, [view.speed, yt.player])

  // Cuộn bản chép theo câu đang chạy.
  const activeId = segments[active]?.id
  useEffect(() => {
    if (!activeId || editing) return
    listRef.current?.querySelector(`[data-seg="${activeId}"]`)?.scrollIntoView({ block: 'nearest', behavior: 'smooth' })
  }, [activeId, editing])

  // ---- Điều khiển ----
  const p = () => yt.player.current
  const seekTo = (s: number, play = true) => {
    p()?.seekTo(s, true)
    lastT.current = s
    setTime(s)
    if (play) p()?.playVideo()
  }
  const togglePlay = () => (playing ? p()?.pauseVideo() : p()?.playVideo())
  const goSeg = (i: number) => {
    const s = segments[Math.max(0, Math.min(segments.length - 1, i))]
    if (!s) return
    if (loopIdx !== null) setLoopIdx(segments.indexOf(s))
    seekTo(s.start)
  }
  const prev = () => {
    const cur = segments[active]
    // Đã vào câu hơn 1,5 giây: về đầu câu này; nếu không thì về câu trước.
    goSeg(cur && time - cur.start > 1.5 ? active : active - 1)
  }
  const next = () => goSeg(active + 1)
  const toggleLoop = () => setLoopIdx((l) => (l !== null ? null : active >= 0 ? active : 0))
  const cycleSpeed = () => setV({ speed: SPEEDS[(SPEEDS.indexOf(view.speed as (typeof SPEEDS)[number]) + 1) % SPEEDS.length] })
  const toggleMute = () => {
    if (muted) p()?.unMute()
    else p()?.mute()
    setMuted(!muted)
  }

  // Phím tắt: Space phát/dừng, ←/→ câu trước/sau, Esc thoát phóng to.
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      const el = e.target as HTMLElement
      if (el.closest('input, textarea, select, [contenteditable]')) return
      if (e.key === ' ') {
        e.preventDefault()
        togglePlay()
      } else if (e.key === 'ArrowLeft') prev()
      else if (e.key === 'ArrowRight') next()
      else if (e.key === 'Escape' && zoom) setZoom(false)
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  })

  const translateSeg = async (s: ShadowSegment) => {
    if (!lesson) return
    setTranslating(s.id)
    try {
      patchSegment(lesson.id, s.id, { meaning: await translate(s.text, 'zh', 'vi') })
    } catch {
      /* lỗi mạng / hết lượt dịch miễn phí: giữ nguyên */
    } finally {
      setTranslating(null)
    }
  }

  if (!lesson) return presetsLoaded ? <Navigate to="/shadowing" replace /> : null

  const now = () => p()?.getCurrentTime() ?? 0
  const endSegment = () => {
    if (markStart === null) return
    const end = Math.max(now(), markStart + 0.5)
    const list = [...segments, { id: newSegmentId(), start: markStart, end, text: '' }].sort((a, b) => a.start - b.start)
    patch(lesson.id, { segments: list })
    setMarkStart(end)
    setEditing(true)
  }
  const updateSeg = (segId: string, v: Partial<ShadowSegment>) =>
    patch(lesson.id, { segments: segments.map((s) => (s.id === segId ? { ...s, ...v } : s)) })

  const cur = segments[active]
  const duration = yt.duration || segments[segments.length - 1]?.end || 0

  const pill = (on: boolean, onClick: () => void, Icon: typeof Eye, label: string) => (
    <button key={label} type="button" onClick={onClick} aria-pressed={on} className={clsx('btn px-3 py-1.5 text-xs', on && 'bg-sand')}>
      <Icon size={14} />
      {label}
    </button>
  )
  const square = (onClick: () => void, label: string, children: ReactNode, on?: boolean, big?: boolean) => (
    <button
      key={label}
      type="button"
      onClick={onClick}
      title={label}
      aria-label={label}
      aria-pressed={on}
      disabled={!yt.ready}
      className={clsx('btn p-0', big ? 'h-12 w-12' : 'h-10 w-10', on && 'bg-sand', big && 'btn-primary')}
    >
      {children}
    </button>
  )

  /** Một câu dạng chữ + pinyin trên từng từ. */
  const words = (s: ShadowSegment, size: 'card' | 'line' | 'sub') => {
    const list = chips[s.id] ?? [{ text: s.text, pinyin: '' }]
    return (
      <span
        className={clsx('flex flex-wrap items-end', size === 'card' ? 'gap-1.5' : 'gap-x-2 gap-y-1', size === 'sub' && 'justify-center')}
      >
        {list.map((c, i) => (
          <span
            key={i}
            className={clsx(
              'inline-flex flex-col items-center leading-tight',
              size === 'card' && 'rounded-lg border-2 border-line bg-card px-1.5 py-0.5',
            )}
          >
            {view.showPinyin && (
              <span className={clsx('text-ink-soft', size === 'sub' ? 'text-sm text-white/80' : 'text-[11px]')}>{c.pinyin || ' '}</span>
            )}
            <span
              className={clsx('font-kai font-bold', size === 'card' ? 'text-xl' : size === 'line' ? 'text-2xl' : 'text-3xl text-white')}
            >
              {c.text}
            </span>
          </span>
        ))}
      </span>
    )
  }

  const controls = (
    <div className="flex flex-wrap items-center gap-2">
      {square(prev, t('shadowing.prev'), <SkipBack size={18} />, false)}
      {square(toggleLoop, t('shadowing.loop_sentence'), <Repeat size={18} />, loopIdx !== null)}
      {square(
        togglePlay,
        playing ? t('shadowing.pause') : t('shadowing.play'),
        playing ? <Pause size={22} /> : <Play size={22} />,
        false,
        true,
      )}
      {square(next, t('shadowing.next'), <SkipForward size={18} />, false)}
      {square(
        () => setZoom((z) => !z),
        zoom ? t('shadowing.exit_zoom') : t('shadowing.zoom'),
        zoom ? <Minimize2 size={18} /> : <Maximize2 size={18} />,
        zoom,
      )}
      <span className="ml-auto flex flex-wrap gap-2">
        {pill(view.autoPause, () => setV({ autoPause: !view.autoPause }), Scissors, t('shadowing.auto_pause'))}
        {pill(view.showMeaning, () => setV({ showMeaning: !view.showMeaning }), Languages, t('shadowing.show_meaning'))}
        {pill(view.showPinyin, () => setV({ showPinyin: !view.showPinyin }), view.showPinyin ? Eye : EyeOff, 'Pinyin')}
        <button
          type="button"
          onClick={cycleSpeed}
          title={t('shadowing.speed')}
          className={clsx('btn px-3 py-1.5 text-xs', view.speed !== 1 && 'bg-sand')}
        >
          <Gauge size={14} />
          {view.speed}x
        </button>
      </span>
    </div>
  )

  const progress = (
    <div className="flex items-center gap-3">
      <input
        type="range"
        min={0}
        max={Math.max(1, duration)}
        step={0.1}
        value={Math.min(time, duration)}
        onChange={(e) => seekTo(Number(e.target.value), playing)}
        aria-label={t('shadowing.seek')}
        className="h-2 min-w-0 flex-1 accent-[var(--color-brick)]"
      />
      <span className="shrink-0 text-xs font-semibold text-ink-soft tabular-nums">
        {formatTime(time)} / {formatTime(duration)}
      </span>
      <button
        type="button"
        onClick={toggleMute}
        title={t('shadowing.volume')}
        aria-label={t('shadowing.volume')}
        className="btn h-9 w-9 p-0"
      >
        {muted ? <VolumeX size={16} /> : <Volume2 size={16} />}
      </button>
    </div>
  )

  return (
    <Page feature="shadowing" size="full" title={lesson.title} crumbs={[{ label: lesson.title }]} description={lesson.channel ?? ''}>
      <div className={clsx(zoom && 'fixed inset-0 z-[60] overflow-y-auto bg-paper')}>
        <div
          className={clsx(zoom ? 'mx-auto space-y-3 px-4 py-4' : 'grid gap-5 lg:grid-cols-[minmax(0,1.55fr)_minmax(22rem,1fr)]')}
          // Phóng to: video vừa khoảng 60% chiều cao màn hình để còn chỗ cho bản chép bên dưới.
          style={zoom ? { maxWidth: 'min(64rem, calc((65vh - 12rem) * 16 / 9 + 2rem))' } : undefined}
        >
          {/* Cột trái: video + điều khiển */}
          <div className="min-w-0 space-y-3">
            {zoom ? (
              <div className="border-l-4 border-brick pl-3">
                <p className="text-lg font-extrabold">{lesson.title}</p>
                {lesson.channel && <p className="text-xs text-ink-soft">{lesson.channel}</p>}
              </div>
            ) : (
              <Link to="/shadowing" className="inline-flex items-center gap-1 text-sm font-semibold text-ink-soft hover:text-ink">
                <ArrowLeft size={15} />
                {t('shadowing.back')}
              </Link>
            )}
            <div className="box relative overflow-hidden">
              <div ref={yt.hostRef} className="aspect-video w-full bg-ink/90" />
              {/* Phụ đề đè lên video khi phóng to */}
              {zoom && cur && (view.showMeaning || view.showPinyin) && (
                <div className="pointer-events-none absolute inset-x-0 bottom-0 bg-gradient-to-t from-black/80 via-black/55 to-transparent px-6 pt-10 pb-5 text-center">
                  {words(cur, 'sub')}
                  {view.showMeaning && cur.meaning && <p className="mt-2 text-lg font-bold text-white drop-shadow">{cur.meaning}</p>}
                </div>
              )}
            </div>
            {progress}
            {controls}
            {!zoom && <p className="text-xs text-ink-muted">{t('shadowing.keys_hint')}</p>}
          </div>

          {/* Bản chép */}
          <aside
            className={clsx(
              'box flex flex-col overflow-hidden',
              zoom ? 'max-h-[34vh] min-h-40' : 'max-h-[calc(100vh-7rem)] min-h-96 lg:sticky lg:top-24',
            )}
          >
            <div className="flex flex-wrap items-center gap-1.5 border-b-2 border-ink bg-sand/60 px-3 py-2.5">
              <p className="mr-auto text-sm font-extrabold uppercase">
                {t('shadowing.transcript')} <span className="font-semibold text-ink-muted normal-case">({segments.length})</span>
              </p>
              {pill(view.showPinyin, () => setV({ showPinyin: !view.showPinyin }), Eye, 'Pinyin')}
              {pill(view.showMeaning, () => setV({ showMeaning: !view.showMeaning }), Languages, t('shadowing.show_meaning'))}
              {!zoom && (
                <>
                  <button
                    type="button"
                    onClick={() => setPasteOpen(true)}
                    title={t('shadowing.paste_transcript')}
                    aria-label={t('shadowing.paste_transcript')}
                    className="btn h-8 w-8 p-0"
                  >
                    <ClipboardPaste size={14} />
                  </button>
                  <button
                    type="button"
                    onClick={() => setEditing((v) => !v)}
                    aria-pressed={editing}
                    title={t('shadowing.edit')}
                    aria-label={t('shadowing.edit')}
                    className={clsx('btn h-8 w-8 p-0', editing && 'bg-card')}
                  >
                    <Pencil size={14} />
                  </button>
                </>
              )}
              <button
                type="button"
                onClick={() => setZoom((z) => !z)}
                title={zoom ? t('shadowing.exit_zoom') : t('shadowing.zoom')}
                aria-label={zoom ? t('shadowing.exit_zoom') : t('shadowing.zoom')}
                className="btn h-8 w-8 p-0"
              >
                {zoom ? <Minimize2 size={14} /> : <Maximize2 size={14} />}
              </button>
            </div>
            {editing && !zoom && (
              <div className="flex flex-wrap items-center gap-2 border-b-2 border-line px-3 py-2 text-xs">
                <MarkButtons markStart={markStart} onStart={() => setMarkStart(now())} onEnd={endSegment} ready={yt.ready} small />
              </div>
            )}

            <div ref={listRef} className={clsx('min-h-0 flex-1 overflow-y-auto [scrollbar-width:thin]', zoom ? 'p-2' : 'space-y-2.5 p-3')}>
              {segments.length === 0 && (
                <div className="p-4 text-center">
                  <p className="font-bold">{t('shadowing.no_segments_title')}</p>
                  <p className="mt-1 text-sm text-ink-soft">{t('shadowing.no_segments_hint')}</p>
                  <div className="mt-3 flex flex-wrap justify-center gap-2">
                    <button type="button" onClick={() => setPasteOpen(true)} className="btn btn-accent px-4 py-2 text-sm">
                      <ClipboardPaste size={15} />
                      {t('shadowing.paste_transcript')}
                    </button>
                    <MarkButtons markStart={markStart} onStart={() => setMarkStart(now())} onEnd={endSegment} ready={yt.ready} />
                  </div>
                </div>
              )}
              {segments.map((s, i) =>
                editing && !zoom ? (
                  <div
                    key={s.id}
                    data-seg={s.id}
                    className={clsx('space-y-1.5 rounded-2xl border-2 p-2.5', i === active ? 'border-ink bg-brick-soft/50' : 'border-line')}
                  >
                    <div className="flex items-center gap-1.5 text-xs">
                      <span className="font-bold text-ink-muted">#{i + 1}</span>
                      <TimeInput value={s.start} onChange={(v) => updateSeg(s.id, { start: v })} />
                      –
                      <TimeInput value={s.end} onChange={(v) => updateSeg(s.id, { end: v })} />
                      <button type="button" onClick={() => goSeg(i)} className="btn ml-auto h-7 w-7 p-0" aria-label={t('shadowing.play')}>
                        <Play size={12} />
                      </button>
                      <button
                        type="button"
                        onClick={() => patch(lesson.id, { segments: segments.filter((x) => x.id !== s.id) })}
                        className="btn h-7 w-7 p-0 text-brick hover:bg-coral"
                        aria-label={t('notebook.delete')}
                      >
                        <Trash2 size={12} />
                      </button>
                    </div>
                    <input
                      value={s.text}
                      onChange={(e) => updateSeg(s.id, { text: e.target.value })}
                      placeholder={t('shadowing.ph_text')}
                      className="field py-1 font-kai text-base"
                    />
                    <input
                      value={s.meaning ?? ''}
                      onChange={(e) => updateSeg(s.id, { meaning: e.target.value })}
                      placeholder={t('shadowing.ph_meaning')}
                      className="field py-1 text-xs"
                    />
                  </div>
                ) : zoom ? (
                  <button
                    key={s.id}
                    type="button"
                    data-seg={s.id}
                    onClick={() => goSeg(i)}
                    className={clsx('block w-full rounded-xl px-3 py-1.5 text-left', i === active ? 'bg-sand' : 'hover:bg-paper')}
                  >
                    {words(s, 'line')}
                  </button>
                ) : (
                  <div
                    key={s.id}
                    data-seg={s.id}
                    onClick={() => goSeg(i)}
                    className={clsx(
                      'cursor-pointer rounded-2xl border-2 p-3 transition-colors',
                      i === active ? 'border-ink bg-brick-soft/50 shadow-block-sm' : 'border-line hover:border-ink',
                    )}
                  >
                    <div className="mb-2 flex items-center justify-between">
                      <span className="tag bg-paper px-2 text-[11px]">#{i + 1}</span>
                      <button
                        type="button"
                        onClick={(e) => {
                          e.stopPropagation()
                          patchSegment(lesson.id, s.id, { starred: !s.starred })
                        }}
                        aria-pressed={!!s.starred}
                        title={t('shadowing.star')}
                        aria-label={t('shadowing.star')}
                        className={clsx('btn h-8 w-8 p-0', s.starred && 'bg-apricot')}
                      >
                        {s.starred ? <Flag size={14} className="fill-current" /> : <Flag size={14} />}
                      </button>
                    </div>
                    {words(s, 'card')}
                    {view.showMeaning &&
                      (s.meaning ? (
                        <p className="mt-2 text-sm text-ink-soft italic">{s.meaning}</p>
                      ) : (
                        <button
                          type="button"
                          onClick={(e) => {
                            e.stopPropagation()
                            translateSeg(s)
                          }}
                          disabled={translating === s.id || !s.text}
                          className="mt-2 inline-flex items-center gap-1 text-xs font-semibold text-ink-soft hover:underline"
                        >
                          <Languages size={12} />
                          {translating === s.id ? t('common.loading') : t('shadowing.translate')}
                        </button>
                      ))}
                  </div>
                ),
              )}
            </div>
          </aside>
        </div>
      </div>

      {pasteOpen && (
        <PasteTranscript
          hasExisting={segments.length > 0}
          duration={yt.duration}
          onClose={() => setPasteOpen(false)}
          onSave={(list) => {
            patch(lesson.id, { segments: list })
            setPasteOpen(false)
          }}
        />
      )}
    </Page>
  )
}

function MarkButtons({
  markStart,
  onStart,
  onEnd,
  ready,
  small,
}: {
  markStart: number | null
  onStart: () => void
  onEnd: () => void
  ready: boolean
  small?: boolean
}) {
  const { t } = useTranslation()
  const cls = small ? 'btn px-2.5 py-1 text-xs' : 'btn px-4 py-2 text-sm'
  return (
    <>
      <button type="button" onClick={onStart} disabled={!ready} className={cls}>
        <Flag size={small ? 12 : 15} />
        {t('shadowing.mark_start')}
        {markStart !== null && <span className="text-ink-muted">({formatTime(markStart)})</span>}
      </button>
      <button type="button" onClick={onEnd} disabled={!ready || markStart === null} className={cls}>
        <FlagOff size={small ? 12 : 15} />
        {t('shadowing.mark_end')}
      </button>
      {small && <span className="w-full text-ink-muted">{t('shadowing.mark_hint')}</span>}
    </>
  )
}

/** Ô sửa giờ dạng "m:ss.s". */
function TimeInput({ value, onChange }: { value: number; onChange: (v: number) => void }) {
  const fmt = (v: number) => `${Math.floor(v / 60)}:${(v % 60).toFixed(1).padStart(4, '0')}`
  const [text, setText] = useState(fmt(value))
  useEffect(() => setText(fmt(value)), [value])
  return (
    <input
      value={text}
      onChange={(e) => setText(e.target.value)}
      onBlur={() => {
        const m = text.match(/^(\d+):(\d+(?:\.\d+)?)$/)
        if (m) onChange(Number(m[1]) * 60 + Number(m[2]))
        else setText(fmt(value))
      }}
      className="field w-20 px-2 py-0.5 text-center text-xs tabular-nums"
    />
  )
}

function PasteTranscript({
  hasExisting,
  duration,
  onClose,
  onSave,
}: {
  hasExisting: boolean
  duration: number
  onClose: () => void
  onSave: (list: ShadowSegment[]) => void
}) {
  const { t } = useTranslation()
  const [raw, setRaw] = useState('')
  const parsed = useMemo(() => parseTranscript(raw, duration || undefined), [raw, duration])
  return (
    <Modal onClose={onClose} title={t('shadowing.paste_transcript')}>
      <ol className="list-decimal space-y-0.5 pl-5 text-sm text-ink-soft">
        <li>{t('shadowing.paste_step1')}</li>
        <li>{t('shadowing.paste_step2')}</li>
        <li>{t('shadowing.paste_step3')}</li>
      </ol>
      <textarea
        value={raw}
        onChange={(e) => setRaw(e.target.value)}
        placeholder={'0:01\n大家好，欢迎来到我的频道。\n0:04\n今天我们学习……'}
        className="field mt-3 h-56 resize-none font-mono text-xs"
        autoFocus
      />
      <p className="mt-2 text-sm">{raw.trim() ? t('shadowing.parsed', { count: parsed.length }) : ''}</p>
      {parsed.length > 0 && (
        <ul className="mt-1 max-h-28 overflow-y-auto rounded-xl border-2 border-line text-xs">
          {parsed.slice(0, 5).map((s) => (
            <li key={s.id} className="flex gap-2 px-2 py-1">
              <span className="text-ink-muted tabular-nums">{formatTime(s.start)}</span>
              <span className="font-kai">{s.text}</span>
            </li>
          ))}
          {parsed.length > 5 && <li className="px-2 py-1 text-ink-muted">…</li>}
        </ul>
      )}
      {hasExisting && <p className="mt-2 text-xs text-brick">{t('shadowing.replace_warning')}</p>}
      <div className="mt-4 flex justify-end gap-2">
        <button type="button" onClick={onClose} className="btn px-4">
          {t('common.cancel')}
        </button>
        <button type="button" onClick={() => onSave(parsed)} disabled={!parsed.length} className="btn btn-accent px-4">
          {t('shadowing.create_sentences', { count: parsed.length })}
        </button>
      </div>
    </Modal>
  )
}
