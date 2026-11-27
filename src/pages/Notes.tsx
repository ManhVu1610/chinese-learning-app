import clsx from 'clsx'
import { NotebookPen, Pin, PinOff, Plus, Search, Trash2 } from 'lucide-react'
import { useEffect, useMemo, useState } from 'react'
import { useTranslation } from 'react-i18next'
import Page from '../components/layout/Page'
import { ConfirmDialog } from '../components/notebook/Dialogs'
import { normalize } from '../data/dictionary'
import { useStudyNotes, type StudyNote } from '../hooks/useStudyNotes'


/** Ghi chú học tập: danh sách bên trái, soạn bên phải; tự lưu khi gõ. */
export default function Notes() {
  const { t, i18n } = useTranslation()
  const { notes, create, update, remove } = useStudyNotes()
  const [activeId, setActiveId] = useState<string | null>(() => notes[0]?.id ?? null)
  const [query, setQuery] = useState('')
  const [confirm, setConfirm] = useState<StudyNote | null>(null)

  const sorted = useMemo(() => {
    const q = normalize(query)
    return notes
      .filter(
        (n) => !q || normalize(n.title).includes(q) || normalize(n.body).includes(q) || n.body.includes(query) || n.title.includes(query),
      )
      .sort((a, b) => Number(b.pinned) - Number(a.pinned) || b.updatedAt - a.updatedAt)
  }, [notes, query])

  const active = notes.find((n) => n.id === activeId) ?? null
  // Ghi chú đang mở bị xoá ở tab khác: mở ghi chú đầu danh sách.
  useEffect(() => {
    if (activeId && !active) setActiveId(sorted[0]?.id ?? null)
  }, [activeId, active, sorted])

  const fmt = (ms: number) =>
    new Date(ms).toLocaleString(i18n.language === 'en' ? 'en-GB' : 'vi-VN', { dateStyle: 'short', timeStyle: 'short' })
  const add = () => setActiveId(create())

  return (
    <Page
      feature="notes"
      size="wide"
      actions={
        <button type="button" onClick={add} className="btn btn-accent px-5 py-3">
          <Plus size={18} />
          {t('notes.new')}
        </button>
      }
    >
      <div className="grid gap-5 md:grid-cols-[18rem_1fr]">
        {/* Danh sách */}
        <aside className="box flex max-h-[70vh] flex-col p-3">
          <div className="relative">
            <Search size={16} className="absolute top-1/2 left-3 -translate-y-1/2 text-ink-muted" />
            <input
              type="search"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder={t('notes.search')}
              aria-label={t('notes.search')}
              className="field py-2 pl-9 text-sm"
            />
          </div>
          <ul className="mt-3 flex-1 space-y-1 overflow-y-auto">
            {sorted.map((n) => (
              <li key={n.id}>
                <button
                  type="button"
                  onClick={() => setActiveId(n.id)}
                  aria-current={n.id === activeId}
                  className={clsx('w-full rounded-2xl px-3 py-2 text-left', n.id === activeId ? 'bg-sand' : 'hover:bg-paper')}
                >
                  <span className="flex items-center gap-1.5 text-sm font-bold">
                    {n.pinned && <Pin size={12} className="shrink-0 text-brick" />}
                    <span className="truncate">{n.title.trim() || t('notes.untitled')}</span>
                  </span>
                  <span className="block truncate text-xs text-ink-soft">{n.body.trim().split('\n')[0] || t('notes.empty_body')}</span>
                  <span className="block text-[11px] text-ink-muted">{fmt(n.updatedAt)}</span>
                </button>
              </li>
            ))}
            {!sorted.length && (
              <li className="px-2 py-6 text-center text-sm text-ink-soft">{notes.length ? t('notes.no_results') : t('notes.none')}</li>
            )}
          </ul>
        </aside>

        {/* Soạn */}
        {active ? (
          <article className="box flex min-h-[60vh] flex-col p-4">
            <div className="flex items-center gap-2">
              <input
                value={active.title}
                onChange={(e) => update(active.id, { title: e.target.value })}
                placeholder={t('notes.title_placeholder')}
                aria-label={t('notes.title_placeholder')}
                className="min-w-0 flex-1 bg-transparent text-2xl font-extrabold outline-none placeholder:text-ink-muted"
              />
              <button
                type="button"
                onClick={() => update(active.id, { pinned: !active.pinned })}
                title={active.pinned ? t('notes.unpin') : t('notes.pin')}
                aria-label={active.pinned ? t('notes.unpin') : t('notes.pin')}
                aria-pressed={active.pinned}
                className={clsx('btn p-2', active.pinned && 'bg-sand')}
              >
                {active.pinned ? <PinOff size={16} /> : <Pin size={16} />}
              </button>
              <button
                type="button"
                onClick={() => setConfirm(active)}
                title={t('notebook.delete')}
                aria-label={t('notebook.delete')}
                className="btn p-2 hover:bg-coral"
              >
                <Trash2 size={16} />
              </button>
            </div>
            <textarea
              value={active.body}
              onChange={(e) => update(active.id, { body: e.target.value })}
              placeholder={t('notes.body_placeholder')}
              aria-label={t('notes.body_placeholder')}
              className="mt-3 min-h-[45vh] flex-1 resize-none rounded-2xl border-2 border-dashed border-line bg-paper/50 p-3 text-lg leading-relaxed outline-none focus:border-ink"
            />
            <p className="mt-2 text-xs text-ink-muted">
              {t('notes.saved_at', { time: fmt(active.updatedAt) })} · {t('notes.local_only')}
            </p>
          </article>
        ) : (
          <div className="box flex min-h-[40vh] flex-col items-center justify-center gap-3 p-8 text-center">
            <span className="sticker bg-apricot p-3">
              <NotebookPen size={26} />
            </span>
            <p className="text-ink-soft">{t('notes.intro')}</p>
            <button type="button" onClick={add} className="btn btn-primary px-5">
              <Plus size={16} />
              {t('notes.new')}
            </button>
          </div>
        )}
      </div>

      {confirm && (
        <ConfirmDialog
          title={t('notes.delete_title')}
          message={t('notes.delete_confirm', { title: confirm.title.trim() || t('notes.untitled') })}
          confirmLabel={t('notebook.delete')}
          onClose={() => setConfirm(null)}
          onConfirm={() => {
            remove(confirm.id)
            setConfirm(null)
            setActiveId(null)
          }}
        />
      )}
    </Page>
  )
}
