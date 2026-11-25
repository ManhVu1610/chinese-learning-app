import clsx from 'clsx'
import { ChevronRight, FileDown, Folder, FolderOpen, Pencil, Play, Plus, Search } from 'lucide-react'
import { useMemo, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { useNavigate } from 'react-router-dom'
import { ConfirmDialog, CreateSetDialog, MoveDialog, RenameDialog } from '../components/notebook/Dialogs'
import SetCard, { setActionIcons } from '../components/notebook/SetCard'
import { normalize } from '../data/dictionary'
import { useFlashcard } from '../hooks/useFlashcard'
import { useNotebook } from '../hooks/useNotebook'
import { downloadJson, wordToJson } from '../lib/exportJson'
import { useSavedWords } from '../hooks/useSavedWords'
import type { NotebookFolder, VocabSet, Word } from '../types'

type DialogState =
  | { kind: 'create'; folderId?: string | null }
  | { kind: 'rename-set'; set: VocabSet }
  | { kind: 'move-set'; set: VocabSet }
  | { kind: 'delete-set'; set: VocabSet }
  | { kind: 'edit-folder'; folder: NotebookFolder }
  | { kind: 'delete-folder'; folder: NotebookFolder }
  | null

const wordMatches = (w: Word, q: string) =>
  w.hanzi.includes(q) || [w.pinyin, w.meaning_vi, w.meaning_en, w.han_viet ?? ''].some((s) => normalize(s).includes(normalize(q)))

export default function Notebook() {
  const { t } = useTranslation()
  const navigate = useNavigate()
  const nb = useNotebook()
  const { saved } = useSavedWords()
  const { cards } = useFlashcard()
  const [query, setQuery] = useState('')
  const [open, setOpen] = useState<Set<string>>(new Set())
  const [dialog, setDialog] = useState<DialogState>(null)
  const close = () => setDialog(null)

  // Một từ được tính là "đã học" khi đã ôn ít nhất một lần trong Flashcard.
  const learnedIds = useMemo(() => new Set(cards.filter((c) => c.reps > 0).map((c) => c.wordId)), [cards])
  const learnedIn = (words: Word[]) => words.filter((w) => learnedIds.has(w.id)).length

  const q = query.trim()
  const searching = q.length > 0
  const folderName = (id: string | null) => nb.folders.find((f) => f.id === id)?.name ?? ''
  const setMatches = (s: VocabSet) =>
    !searching ||
    normalize(s.name).includes(normalize(q)) ||
    (s.folderId !== null && normalize(folderName(s.folderId)).includes(normalize(q))) ||
    s.words.some((w) => wordMatches(w, q))

  const visibleSets = nb.sets.filter(setMatches)
  const looseSets = visibleSets.filter((s) => s.folderId === null)
  const savedVisible = !searching || normalize(t('notebook.saved_set')).includes(normalize(q)) || saved.some((w) => wordMatches(w, q))
  const totalSets = nb.sets.length + 1

  const toggle = (id: string) =>
    setOpen((prev) => {
      const next = new Set(prev)
      if (next.has(id)) next.delete(id)
      else next.add(id)
      return next
    })

  const setActions = (s: VocabSet) => [
    { key: 'rename', label: t('notebook.rename'), icon: setActionIcons.rename, onClick: () => setDialog({ kind: 'rename-set', set: s }) },
    { key: 'move', label: t('notebook.folder'), icon: setActionIcons.move, onClick: () => setDialog({ kind: 'move-set', set: s }) },
    { key: 'delete', label: t('notebook.delete'), icon: setActionIcons.delete, danger: true, onClick: () => setDialog({ kind: 'delete-set', set: s }) },
  ]

  const renderSets = (list: VocabSet[]) => (
    <div className="grid grid-cols-1 gap-5 sm:grid-cols-2">
      {list.map((s) => (
        <SetCard
          key={s.id}
          to={`/notebook/${s.id}`}
          name={s.name}
          wordCount={s.words.length}
          learned={learnedIn(s.words)}
          actions={setActions(s)}
        />
      ))}
    </div>
  )

  return (
    <section className="mx-auto max-w-5xl px-4 py-8">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold">{t('tools.notebook')}</h1>
          <p className="mt-1 text-ink-soft">{t('notebook.subtitle')}</p>
        </div>
        <button type="button" onClick={() => setDialog({ kind: 'create' })} className="btn btn-accent px-5 py-3">
          <Plus size={18} />
          {t('notebook.create_set')}
        </button>
      </div>

      <div className="relative mt-6">
        <Search size={18} className="absolute top-1/2 left-3.5 -translate-y-1/2 text-ink-muted" />
        <input
          type="search"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder={t('notebook.search_placeholder', { count: totalSets })}
          className="field pl-10"
        />
      </div>

      <div className="mt-6 space-y-5">
        {/* Bộ mặc định: các từ đã bấm ⭐ */}
        {savedVisible && (
          <div className="grid grid-cols-1 gap-5 sm:grid-cols-2">
            <SetCard
              to="/notebook/saved"
              starred
              name={t('notebook.saved_set')}
              wordCount={saved.length}
              learned={learnedIn(saved)}
              actions={[
                {
                  key: 'review',
                  label: t('notebook.review'),
                  icon: Play,
                  onClick: () => saved.length && navigate('/flashcard', { state: { practiceWords: saved } }),
                },
              ]}
            />
          </div>
        )}

        {/* Thư mục */}
        {nb.folders.map((f) => {
          const inFolder = nb.sets.filter((s) => s.folderId === f.id)
          const shown = inFolder.filter(setMatches)
          const nameHit = searching && normalize(f.name).includes(normalize(q))
          if (searching && !shown.length && !nameHit) return null
          const isOpen = searching ? true : open.has(f.id)
          const words = inFolder.reduce((n, s) => n + s.words.length, 0)
          return (
            <div key={f.id}>
              <div className="box flex items-stretch">
                <button
                  type="button"
                  onClick={() => toggle(f.id)}
                  aria-expanded={isOpen}
                  className="flex min-w-0 flex-1 items-center gap-3 px-4 py-3.5 text-left hover:bg-paper/60"
                >
                  <ChevronRight size={18} className={clsx('shrink-0 transition-transform', isOpen && 'rotate-90')} />
                  {isOpen ? <FolderOpen size={20} className="shrink-0" /> : <Folder size={20} className="shrink-0" />}
                  <span className="min-w-0 flex-1 truncate font-bold">{f.name}</span>
                  <span className="shrink-0 text-xs text-ink-soft">
                    {t('notebook.folder_stats', { sets: inFolder.length, words })}
                  </span>
                </button>
                <button
                  type="button"
                  disabled={words === 0}
                  onClick={() =>
                    downloadJson(
                      f.name,
                      inFolder.flatMap((s) => s.words.map((w) => wordToJson(w, s.name))),
                    )
                  }
                  title={t('notebook.export_folder')}
                  aria-label={`${t('notebook.export_folder')} ${f.name}`}
                  className="border-l-2 border-ink px-4 hover:bg-sand disabled:cursor-not-allowed disabled:opacity-40 disabled:hover:bg-transparent"
                >
                  <FileDown size={16} />
                </button>
                <button
                  type="button"
                  onClick={() => setDialog({ kind: 'edit-folder', folder: f })}
                  title={t('notebook.edit_folder')}
                  aria-label={`${t('notebook.edit_folder')} ${f.name}`}
                  className="border-l-2 border-ink px-4 hover:bg-sand"
                >
                  <Pencil size={16} />
                </button>
              </div>
              {isOpen && (
                <div className="mt-4 ml-3 border-l-2 border-dashed border-line pl-4 sm:ml-6">
                  {shown.length ? (
                    renderSets(searching ? shown : inFolder)
                  ) : (
                    <div className="flex flex-wrap items-center gap-3 py-2 text-sm text-ink-soft">
                      {t('notebook.folder_empty')}
                      <button
                        type="button"
                        onClick={() => setDialog({ kind: 'create', folderId: f.id })}
                        className="btn px-3 py-1 text-sm"
                      >
                        <Plus size={14} />
                        {t('notebook.create_in_folder')}
                      </button>
                    </div>
                  )}
                </div>
              )}
            </div>
          )
        })}

        {/* Bộ chưa xếp thư mục */}
        {looseSets.length > 0 && (
          <div>
            {nb.folders.length > 0 && (
              <h2 className="mb-3 text-sm font-semibold text-ink-soft uppercase">{t('notebook.loose_sets')}</h2>
            )}
            {renderSets(looseSets)}
          </div>
        )}

        {searching && !savedVisible && visibleSets.length === 0 && !nb.folders.some((f) => normalize(f.name).includes(normalize(q))) && (
          <p className="box p-8 text-center text-ink-soft">{t('notebook.no_results')}</p>
        )}
        {!searching && nb.sets.length === 0 && nb.folders.length === 0 && (
          <p className="text-center text-sm text-ink-soft">{t('notebook.first_set_hint')}</p>
        )}
      </div>

      {/* Hộp thoại */}
      {dialog?.kind === 'create' && (
        <CreateSetDialog
          folders={nb.folders}
          defaultFolderId={dialog.folderId}
          createFolder={nb.createFolder}
          onClose={close}
          onCreate={(name, folderId) => {
            const id = nb.createSet(name, folderId)
            close()
            navigate(`/notebook/${id}`)
          }}
        />
      )}
      {dialog?.kind === 'rename-set' && (
        <RenameDialog
          title={t('notebook.rename_set')}
          initial={dialog.set.name}
          onClose={close}
          onSave={(name) => {
            nb.patchSet(dialog.set.id, { name: name.trim() })
            close()
          }}
        />
      )}
      {dialog?.kind === 'move-set' && (
        <MoveDialog
          folders={nb.folders}
          current={dialog.set.folderId}
          createFolder={nb.createFolder}
          onClose={close}
          onMove={(folderId) => {
            nb.patchSet(dialog.set.id, { folderId })
            if (folderId) setOpen((p) => new Set(p).add(folderId))
            close()
          }}
        />
      )}
      {dialog?.kind === 'delete-set' && (
        <ConfirmDialog
          title={t('notebook.delete_set')}
          message={t('notebook.delete_set_confirm', { name: dialog.set.name, count: dialog.set.words.length })}
          confirmLabel={t('notebook.delete')}
          onClose={close}
          onConfirm={() => {
            nb.deleteSet(dialog.set.id)
            close()
          }}
        />
      )}
      {dialog?.kind === 'edit-folder' && (
        <RenameDialog
          title={t('notebook.edit_folder')}
          initial={dialog.folder.name}
          onClose={close}
          onSave={(name) => {
            nb.renameFolder(dialog.folder.id, name)
            close()
          }}
          extra={
            <button
              type="button"
              onClick={() => setDialog({ kind: 'delete-folder', folder: dialog.folder })}
              className="mt-4 text-sm font-semibold text-brick underline decoration-2 underline-offset-4"
            >
              {t('notebook.delete_folder')}
            </button>
          }
        />
      )}
      {dialog?.kind === 'delete-folder' && (
        <ConfirmDialog
          title={t('notebook.delete_folder')}
          message={t('notebook.delete_folder_confirm', { name: dialog.folder.name })}
          confirmLabel={t('notebook.delete')}
          onClose={close}
          onConfirm={() => {
            nb.deleteFolder(dialog.folder.id)
            close()
          }}
        />
      )}
    </section>
  )
}
