import { Link2, Play, Plus, Trash2 } from 'lucide-react'
import { useState } from 'react'
import { useTranslation } from 'react-i18next'
import { Link, useNavigate } from 'react-router-dom'
import Page from '../components/layout/Page'
import { ConfirmDialog } from '../components/notebook/Dialogs'
import { parseYouTubeId, useShadowing, type ShadowLesson } from '../hooks/useShadowing'

/** Danh sách bài shadowing: video nhúng sẵn + video người học tự dán link. */
export default function Shadowing() {
  const { t } = useTranslation()
  const nav = useNavigate()
  const { lessons, create, remove } = useShadowing()
  const [link, setLink] = useState('')
  const [error, setError] = useState(false)
  const [confirm, setConfirm] = useState<ShadowLesson | null>(null)

  const add = () => {
    const id = parseYouTubeId(link)
    if (!id) return setError(true)
    nav(`/shadowing/${create(id, t('shadowing.new_title'))}`)
  }

  const presets = lessons.filter((l) => l.preset)
  const mine = lessons.filter((l) => !l.preset).sort((a, b) => b.updatedAt - a.updatedAt)

  return (
    <Page feature="shadowing" size="wide" description={t('shadowing.intro')}>
      {/* Dán link */}
      <form
        onSubmit={(e) => {
          e.preventDefault()
          add()
        }}
        className="box flex flex-wrap items-center gap-3 p-4"
      >
        <span className="sticker bg-coral p-2">
          <Link2 size={18} />
        </span>
        <input
          value={link}
          onChange={(e) => {
            setLink(e.target.value)
            setError(false)
          }}
          placeholder={t('shadowing.paste_link')}
          aria-label={t('shadowing.paste_link')}
          className="field min-w-0 flex-1"
        />
        <button type="submit" disabled={!link.trim()} className="btn btn-accent px-5">
          <Plus size={16} />
          {t('shadowing.add')}
        </button>
        {error && <p className="w-full text-sm text-brick">{t('shadowing.bad_link')}</p>}
        <p className="w-full text-xs text-ink-soft">{t('shadowing.paste_hint')}</p>
      </form>

      {/* Bài nhúng sẵn: mỗi playlist một mục (bài không thuộc playlist nào nằm ở "Video có sẵn") */}
      {[...new Set(presets.map((l) => l.playlist ?? ''))].map((pl) => (
        <Section key={pl || 'presets'} title={pl || t('shadowing.presets')} lessons={presets.filter((l) => (l.playlist ?? '') === pl)} />
      ))}
      <Section title={t('shadowing.mine')} lessons={mine} empty={t('shadowing.mine_empty')} onDelete={setConfirm} />

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

function Section({
  title,
  lessons,
  empty,
  onDelete,
}: {
  title: string
  lessons: ShadowLesson[]
  empty?: string
  onDelete?: (l: ShadowLesson) => void
}) {
  const { t } = useTranslation()
  return (
    <section className="mt-8">
      <h2 className="text-lg font-extrabold">{title}</h2>
      {lessons.length === 0 ? (
        <p className="mt-2 text-sm text-ink-soft">{empty}</p>
      ) : (
        <div className="mt-3 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {lessons.map((l) => {
            const done = l.segments.filter((s) => s.grade !== undefined).length
            return (
              <div key={l.id} className="box group overflow-hidden">
                <Link to={`/shadowing/${l.id}`} className="block">
                  <div className="relative aspect-video border-b-2 border-ink bg-ink/10">
                    <img
                      src={`https://i.ytimg.com/vi/${l.videoId}/mqdefault.jpg`}
                      alt=""
                      loading="lazy"
                      className="h-full w-full object-cover"
                    />
                    <span className="absolute inset-0 flex items-center justify-center bg-ink/0 transition-colors group-hover:bg-ink/20">
                      <span className="sticker bg-card p-3 opacity-90">
                        <Play size={20} />
                      </span>
                    </span>
                  </div>
                  <div className="px-4 pt-3">
                    <p className="line-clamp-2 font-extrabold group-hover:text-brick">{l.title}</p>
                  </div>
                </Link>
                <div className="flex items-center gap-2 px-4 pt-1 pb-3 text-xs text-ink-soft">
                  <span className="flex-1">
                    {l.segments.length ? t('shadowing.progress', { done, total: l.segments.length }) : t('shadowing.no_segments')}
                  </span>
                  {onDelete && (
                    <button
                      type="button"
                      onClick={() => onDelete(l)}
                      title={t('shadowing.delete')}
                      aria-label={`${t('shadowing.delete')} ${l.title}`}
                      className="btn h-8 w-8 p-0 text-brick hover:bg-coral"
                    >
                      <Trash2 size={14} />
                    </button>
                  )}
                </div>
              </div>
            )
          })}
        </div>
      )}
    </section>
  )
}
