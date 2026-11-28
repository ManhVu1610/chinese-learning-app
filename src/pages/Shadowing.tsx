import clsx from 'clsx'
import { ExternalLink, ListVideo, Play, Trash2, X } from 'lucide-react'
import { useEffect, useMemo, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { Link, useSearchParams } from 'react-router-dom'
import Page from '../components/layout/Page'
import { ConfirmDialog } from '../components/notebook/Dialogs'
import { formatTime, loadChannels, presetInfo, useShadowing, type ChannelInfo, type ShadowLesson } from '../hooks/useShadowing'

type Tab = 'videos' | 'playlists' | 'mine'
type Filter = 'all' | 'learning' | 'new'
const MINE = '__mine__'

/** Ảnh của YouTube: "=s0" là cỡ gốc, đổi sang cỡ vừa đủ hiển thị. */
const sized = (url: string | undefined, size: string) => url?.replace(/=s0$/, `=${size}`)
const thumb = (videoId: string) => `https://i.ytimg.com/vi/${videoId}/mqdefault.jpg`
const doneOf = (l: ShadowLesson) => l.segments.filter((s) => s.grade !== undefined).length

/**
 * Trang Shadowing bố cục giống trang kênh YouTube:
 * chọn kênh → ảnh bìa + ảnh đại diện + tên kênh → thẻ Video / Danh sách phát → lưới video.
 * Kênh, tab, danh sách phát đang xem nằm trên URL (?kenh=&tab=&ds=) để quay lại đúng chỗ.
 */
export default function Shadowing() {
  const { t, i18n } = useTranslation()
  const { lessons, remove } = useShadowing()
  const [params, setParams] = useSearchParams()
  const [channels, setChannels] = useState<ChannelInfo[]>([])
  const [filter, setFilter] = useState<Filter>('all')
  const [confirm, setConfirm] = useState<ShadowLesson | null>(null)
  useEffect(() => {
    loadChannels().then(setChannels)
  }, [])

  const presets = lessons.filter((l) => l.preset)
  const mine = lessons.filter((l) => !l.preset).sort((a, b) => b.updatedAt - a.updatedAt)
  const channelOf = (l: ShadowLesson) => l.channel || l.playlist || t('shadowing.presets')
  const names = [...new Set(presets.map(channelOf))]
  if (mine.length) names.push(MINE)

  const set = (p: Record<string, string | null>) =>
    setParams(
      (cur) => {
        const next = new URLSearchParams(cur)
        Object.entries(p).forEach(([k, v]) => (v ? next.set(k, v) : next.delete(k)))
        return next
      },
      { replace: true },
    )
  const active = names.includes(params.get('kenh') ?? '') ? params.get('kenh')! : (names[0] ?? '')
  const isMine = active === MINE
  const tab: Tab = isMine ? 'mine' : params.get('tab') === 'playlists' ? 'playlists' : 'videos'
  const playlistFilter = params.get('ds')

  const videos = useMemo(() => (isMine ? mine : presets.filter((l) => channelOf(l) === active)), [isMine, mine, presets, active]) // eslint-disable-line react-hooks/exhaustive-deps
  const playlists = useMemo(() => {
    const m = new Map<string, ShadowLesson[]>()
    videos.forEach((l) => {
      const k = l.playlist || active
      m.set(k, [...(m.get(k) ?? []), l])
    })
    return [...m.entries()]
  }, [videos, active])
  const info = channels.find((c) => c.name === active)
  const nf = new Intl.NumberFormat(i18n.language, { notation: 'compact' })

  const shown = videos
    .filter((l) => !playlistFilter || (l.playlist || active) === playlistFilter)
    .filter((l) => filter === 'all' || (filter === 'learning' ? doneOf(l) > 0 : doneOf(l) === 0))

  return (
    <Page feature="shadowing" size="full" description={t('shadowing.intro')}>
      {/* Chọn kênh */}
      {names.length > 1 && (
        <div className="mb-5 flex gap-2 overflow-x-auto pb-2" role="tablist" aria-label={t('shadowing.channels')}>
          {names.map((n) => {
            const c = channels.find((x) => x.name === n)
            const label = n === MINE ? t('shadowing.tab_mine') : n
            return (
              <button
                key={n}
                type="button"
                role="tab"
                aria-selected={n === active}
                onClick={() => {
                  setFilter('all')
                  set({ kenh: n, tab: null, ds: null })
                }}
                className={clsx('btn shrink-0 gap-2 py-1.5 pr-4 pl-1.5 text-sm', n === active && 'btn-primary')}
              >
                <Avatar name={label} src={sized(c?.avatar, 's64')} className="h-7 w-7 text-xs" />
                {label}
              </button>
            )
          })}
        </div>
      )}

      {/* Đầu trang kênh: ảnh bìa + ảnh đại diện + tên */}
      {!isMine && active && (
        <header>
          {info?.banner && (
            <div className="aspect-[6/1] overflow-hidden rounded-2xl border-2 border-ink bg-ink/10">
              <img src={sized(info.banner, 'w1707')} alt="" className="h-full w-full object-cover" />
            </div>
          )}
          <div className="mt-5 flex flex-wrap items-center gap-5">
            <Avatar name={active} src={sized(info?.avatar, 's176')} className="h-20 w-20 text-3xl sm:h-28 sm:w-28" />
            <div className="min-w-0 flex-1">
              <h2 className="text-2xl font-extrabold break-words sm:text-4xl">{info?.title?.trim() || active}</h2>
              <p className="mt-1 text-sm text-ink-soft">
                {[
                  info?.handle,
                  info?.subscribers ? t('shadowing.subscribers', { n: nf.format(info.subscribers) }) : null,
                  t('shadowing.video_count', { n: videos.length }),
                ]
                  .filter(Boolean)
                  .join(' • ')}
              </p>
              {info?.description && <p className="mt-1 line-clamp-1 text-sm text-ink-soft">{info.description}</p>}
              {info?.url && (
                <a href={info.url} target="_blank" rel="noreferrer" className="btn mt-3 gap-2 px-4 py-1.5 text-sm">
                  <ExternalLink size={14} />
                  {t('shadowing.open_youtube')}
                </a>
              )}
            </div>
          </div>
        </header>
      )}

      {/* Thẻ Video / Danh sách phát */}
      {!isMine && (
        <nav className="mt-6 flex gap-6 border-b-2 border-line" role="tablist">
          {(['videos', 'playlists'] as const).map((k) => (
            <button
              key={k}
              type="button"
              role="tab"
              aria-selected={tab === k}
              onClick={() => set({ tab: k === 'videos' ? null : k, ds: null })}
              className={clsx(
                '-mb-0.5 border-b-[3px] px-1 pb-2 font-extrabold transition-colors',
                tab === k ? 'border-ink text-ink' : 'border-transparent text-ink-soft hover:text-ink',
              )}
            >
              {t(k === 'videos' ? 'shadowing.tab_videos' : 'shadowing.tab_playlists')}
            </button>
          ))}
        </nav>
      )}

      {tab === 'playlists' ? (
        <div className="mt-8 grid gap-x-4 gap-y-8 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
          {playlists.map(([name, list]) => (
            <button key={name} type="button" onClick={() => set({ tab: null, ds: name })} className="group text-left">
              <div className="relative">
                <div className="absolute inset-x-3 -top-2 h-3 rounded-t-xl border-2 border-b-0 border-ink bg-coral" />
                <div className="relative aspect-video overflow-hidden rounded-xl border-2 border-ink bg-ink/10">
                  <img src={thumb(list[0].videoId)} alt="" loading="lazy" className="h-full w-full object-cover" />
                  <span className="absolute right-1.5 bottom-1.5 flex items-center gap-1 rounded-md bg-ink/85 px-1.5 py-0.5 text-xs font-bold text-white">
                    <ListVideo size={13} />
                    {t('shadowing.video_count', { n: list.length })}
                  </span>
                </div>
              </div>
              <p className="mt-2 line-clamp-2 font-extrabold group-hover:text-brick">{name}</p>
              <p className="text-sm font-semibold text-ink-soft group-hover:text-ink">{t('shadowing.view_playlist')}</p>
            </button>
          ))}
        </div>
      ) : (
        <>
          <div className="mt-5 flex flex-wrap items-center gap-2">
            {(['all', 'learning', 'new'] as const).map((f) => (
              <button
                key={f}
                type="button"
                onClick={() => setFilter(f)}
                aria-pressed={filter === f}
                className={clsx(
                  'rounded-lg border-2 border-ink px-3 py-1 text-sm font-bold transition-colors',
                  filter === f ? 'bg-ink text-card' : 'bg-card hover:bg-coral',
                )}
              >
                {t(`shadowing.filter_${f}`)}
              </button>
            ))}
            {playlistFilter && (
              <button type="button" onClick={() => set({ ds: null })} className="tag ml-1 gap-1 bg-sand text-sm">
                {t('shadowing.playlist_filter', { name: playlistFilter })}
                <X size={13} aria-label={t('shadowing.clear_filter')} />
              </button>
            )}
          </div>
          {shown.length === 0 ? (
            <p className="mt-6 text-sm text-ink-soft">{t('shadowing.no_match')}</p>
          ) : (
            <div className="mt-5 grid gap-x-4 gap-y-7 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
              {shown.map((l) => (
                <VideoCard key={l.id} lesson={l} onDelete={isMine ? setConfirm : undefined} />
              ))}
            </div>
          )}
        </>
      )}

      {confirm && (
        <ConfirmDialog
          title={t('shadowing.delete')}
          message={t('shadowing.delete_confirm', { name: confirm.title })}
          confirmLabel={t('notebook.delete')}
          onClose={() => setConfirm(null)}
          onConfirm={() => {
            remove(confirm.id)
            setConfirm(null)
          }}
        />
      )}
    </Page>
  )
}

function Avatar({ name, src, className }: { name: string; src?: string; className?: string }) {
  const [broken, setBroken] = useState(false)
  return src && !broken ? (
    <img src={src} alt="" onError={() => setBroken(true)} className={clsx('shrink-0 rounded-full border-2 border-ink object-cover', className)} />
  ) : (
    <span className={clsx('flex shrink-0 items-center justify-center rounded-full border-2 border-ink bg-lilac font-extrabold', className)}>
      {name.trim().charAt(0).toUpperCase()}
    </span>
  )
}

/** Thẻ video kiểu YouTube: ảnh 16:9 bo góc, thời lượng ở góc, vạch hồng = phần đã luyện. */
function VideoCard({ lesson: l, onDelete }: { lesson: ShadowLesson; onDelete?: (l: ShadowLesson) => void }) {
  const { t } = useTranslation()
  const p = presetInfo(l.videoId)
  const total = l.segments.length || p?.count || 0
  const done = doneOf(l)
  return (
    <div className="group relative">
      <Link to={`/shadowing/${l.id}`} className="block">
        <div className="relative aspect-video overflow-hidden rounded-xl border-2 border-ink bg-ink/10">
          <img
            src={thumb(l.videoId)}
            alt=""
            loading="lazy"
            className="h-full w-full object-cover transition-transform duration-200 group-hover:scale-105"
          />
          <span className="absolute inset-0 flex items-center justify-center bg-ink/0 opacity-0 transition group-hover:bg-ink/20 group-hover:opacity-100">
            <span className="sticker bg-card p-2.5">
              <Play size={18} />
            </span>
          </span>
          {p?.duration ? (
            <span className="absolute right-1.5 bottom-1.5 rounded-md bg-ink/85 px-1.5 py-0.5 text-xs font-bold text-white">
              {formatTime(p.duration)}
            </span>
          ) : null}
          {done > 0 && total > 0 && (
            <span className="absolute inset-x-0 bottom-0 h-1 bg-ink/30">
              <span className="block h-full bg-brick" style={{ width: `${Math.min(100, (done / total) * 100)}%` }} />
            </span>
          )}
        </div>
        <p className="mt-2 line-clamp-2 pr-8 leading-snug font-extrabold group-hover:text-brick">{l.title}</p>
        <p className="mt-0.5 text-sm text-ink-soft">
          {total
            ? [t('shadowing.sentence_count', { n: total }), done ? t('shadowing.practiced', { done }) : null].filter(Boolean).join(' • ')
            : t('shadowing.no_segments')}
        </p>
      </Link>
      {onDelete && (
        <button
          type="button"
          onClick={() => onDelete(l)}
          title={t('shadowing.delete')}
          aria-label={`${t('shadowing.delete')} ${l.title}`}
          className="btn absolute right-0 bottom-6 h-8 w-8 p-0 text-brick hover:bg-coral"
        >
          <Trash2 size={14} />
        </button>
      )}
    </div>
  )
}
