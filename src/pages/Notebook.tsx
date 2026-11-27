import clsx from 'clsx'
import { ArrowDownWideNarrow, FileDown, Folder, FolderOpen, FolderPlus, Library, Pencil, Plus, Search } from 'lucide-react'
import { useMemo, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { ConfirmDialog, CreateSetDialog, MoveDialog, RenameDialog } from '../components/notebook/Dialogs'
import SetCard, { setActionIcons } from '../components/notebook/SetCard'
import { normalize } from '../data/dictionary'
import { useFlashcard } from '../hooks/useFlashcard'
import { UNCATEGORIZED, useNotebook } from '../hooks/useNotebook'
import { downloadJson, wordToJson } from '../lib/exportJson'
import type { NotebookFolder, VocabSet, Word } from '../types'
import Page from '../components/layout/Page'

type DialogState =
  | { kind: 'create'; folderId?: string | null }
  | { kind: 'create-folder' }
  | { kind: 'rename-set'; set: VocabSet }
  | { kind: 'move-set'; set: VocabSet }
  | { kind: 'delete-set'; set: VocabSet }
  | { kind: 'edit-folder'; folder: NotebookFolder }
  | { kind: 'delete-folder'; folder: NotebookFolder }
  | null

type SortKey = 'newest' | 'name' | 'words' | 'progress'
const SORT_KEYS: SortKey[] = ['newest', 'name', 'words', 'progress']

const wordMatches = (w: Word, q: string) =>
  w.hanzi.includes(q) || [w.pinyin, w.meaning_vi, w.meaning_en, w.han_viet ?? ''].some((s) => normalize(s).includes(normalize(q)))

export default function Notebook() {
  const { t } = useTranslation()
  const nb = useNotebook()
  const { cards } = useFlashcard()
  const [query, setQuery] = useState('')
  const [selected, setSelected] = useState<string>('all')
  const [sort, setSort] = useState<SortKey>(() => (localStorage.getItem('notebook_sort') as SortKey) || 'newest')
  const changeSort = (v: SortKey) => {
    setSort(v)
    localStorage.setItem('notebook_sort', v)
  }
  const [dialog, setDialog] = useState<DialogState>(null)
  const close = () => setDialog(null)

  // Một từ được tính là "đã học" khi đã ôn ít nhất một lần trong Flashcard.
  const learnedIds = useMemo(() => new Set(cards.filter((c) => c.reps > 0).map((c) => c.wordId)), [cards])
  const learnedIn = (words: Word[]) => words.filter((w) => learnedIds.has(w.id)).length

  const q = query.trim()
  const searching = q.length > 0
  // Thư mục "Chưa phân loại" hiển thị theo ngôn ngữ đang chọn.
  const nameOf = (f: { id: string; name: string }) => (f.id === UNCATEGORIZED ? t('notebook.uncategorized') : f.name)
  const folderName = (id: string | null) => {
    const f = nb.folders.find((x) => x.id === id)
    return f ? nameOf(f) : ''
  }
  // "Chưa phân loại" luôn đứng đầu.
  const folders = [...nb.folders].sort((a, b) => Number(b.id === UNCATEGORIZED) - Number(a.id === UNCATEGORIZED))
  const setMatches = (s: VocabSet) =>
    !searching ||
    normalize(s.name).includes(normalize(q)) ||
    (s.folderId !== null && normalize(folderName(s.folderId)).includes(normalize(q))) ||
    s.words.some((w) => wordMatches(w, q))

  const totalSets = nb.sets.length

  // Bộ "Chưa phân loại" là nơi lưu mặc định: không đổi tên, không chuyển thư mục.
  const setActions = (s: VocabSet) => [
    ...(s.id === UNCATEGORIZED
      ? []
      : [
          {
            key: 'rename',
            label: t('notebook.rename'),
            icon: setActionIcons.rename,
            onClick: () => setDialog({ kind: 'rename-set', set: s }),
          },
          { key: 'move', label: t('notebook.folder'), icon: setActionIcons.move, onClick: () => setDialog({ kind: 'move-set', set: s }) },
        ]),
    {
      key: 'delete',
      label: t('notebook.delete'),
      icon: setActionIcons.delete,
      danger: true,
      onClick: () => setDialog({ kind: 'delete-set', set: s }),
    },
  ]

  // Thư mục đang xem: 'all' = tất cả bộ, chia nhóm theo thư mục.
  const current = selected === 'all' ? null : (folders.find((f) => f.id === selected) ?? null)
  const inFolder = (id: string) => nb.sets.filter((s) => s.folderId === id)
  const wordsIn = (sets: VocabSet[]) => sets.reduce((n, s) => n + s.words.length, 0)
  // "Chưa phân loại" luôn ở đầu thư mục của nó; các bộ còn lại theo cách sắp xếp đang chọn.
  const sortSets = (list: VocabSet[]) =>
    [...list].sort((a, b) => {
      const pin = Number(b.id === UNCATEGORIZED) - Number(a.id === UNCATEGORIZED)
      if (pin) return pin
      if (sort === 'name') return a.name.localeCompare(b.name, 'vi')
      if (sort === 'words') return b.words.length - a.words.length
      if (sort === 'progress') {
        const p = (x: VocabSet) => (x.words.length ? learnedIn(x.words) / x.words.length : -1)
        return p(b) - p(a)
      }
      return b.createdAt - a.createdAt
    })
  const groups = (current ? [current] : folders)
    .map((f) => ({ folder: f, sets: sortSets(inFolder(f.id).filter(setMatches)) }))
    .filter((g) => g.sets.length || (!searching && current))

  return (
    <Page
      feature="notebook"
      size="wide"
      description={t('notebook.subtitle')}
      actions={
        <button type="button" onClick={() => setDialog({ kind: 'create', folderId: current?.id })} className="btn btn-accent px-5 py-3">
          <Plus size={18} />
          {t('notebook.create_set')}
        </button>
      }
    >
      <div className="grid gap-6 md:grid-cols-[15rem_1fr]">
        {/* Cột trái: thư mục */}
        <aside className="md:self-start">
          <div className="box p-2 md:sticky md:top-24">
            <p className="px-2 pt-1 pb-2 text-xs font-extrabold text-ink-soft uppercase">{t('notebook.folders')}</p>
            <ul className="flex gap-1 overflow-x-auto pb-1 md:flex-col md:overflow-visible md:pb-0">
              {[
                { id: 'all', label: t('notebook.all_sets'), count: nb.sets.length, icon: Library },
                ...folders.map((f) => ({
                  id: f.id,
                  label: nameOf(f),
                  count: inFolder(f.id).length,
                  icon: selected === f.id ? FolderOpen : Folder,
                })),
              ].map(({ id, label, count, icon: Icon }) => (
                <li key={id} className="shrink-0">
                  <button
                    type="button"
                    onClick={() => setSelected(id)}
                    aria-current={selected === id}
                    className={clsx(
                      'flex w-full items-center gap-2 rounded-2xl px-3 py-2 text-left text-sm font-bold whitespace-nowrap',
                      selected === id ? 'bg-sand' : 'hover:bg-paper',
                    )}
                  >
                    <Icon size={16} className="shrink-0" />
                    <span className="min-w-0 flex-1 truncate">{label}</span>
                    <span className="text-xs font-semibold text-ink-muted tabular-nums">{count}</span>
                  </button>
                </li>
              ))}
            </ul>
            <button
              type="button"
              onClick={() => setDialog({ kind: 'create-folder' })}
              className="mt-1 flex w-full items-center gap-2 rounded-2xl border-2 border-dashed border-line px-3 py-2 text-sm font-semibold text-ink-soft hover:border-ink hover:text-ink"
            >
              <FolderPlus size={16} />
              {t('notebook.new_folder')}
            </button>
          </div>
        </aside>

        {/* Cột phải: các bộ */}
        <div className="min-w-0">
          <div className="flex flex-wrap items-center gap-3">
            <div className="relative min-w-0 flex-1">
              <Search size={18} className="absolute top-1/2 left-3.5 -translate-y-1/2 text-ink-muted" />
              <input
                type="search"
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                placeholder={t('notebook.search_placeholder', { count: totalSets })}
                aria-label={t('notebook.search_placeholder', { count: totalSets })}
                className="field pl-10"
              />
            </div>
            <label className="flex items-center gap-2 text-sm font-semibold">
              <ArrowDownWideNarrow size={16} className="shrink-0" />
              <span className="sr-only sm:not-sr-only">{t('notebook.sort_by')}</span>
              <select value={sort} onChange={(e) => changeSort(e.target.value as SortKey)} className="field w-auto py-2 pr-8 text-sm">
                {SORT_KEYS.map((k) => (
                  <option key={k} value={k}>
                    {t(`notebook.sort_${k}`)}
                  </option>
                ))}
              </select>
            </label>
          </div>

          {groups.map(({ folder: f, sets }) => {
            const all = inFolder(f.id)
            return (
              <section key={f.id} className="mt-6 first:mt-5">
                <div className="flex flex-wrap items-center gap-2">
                  <h2 className="flex min-w-0 flex-1 items-center gap-2 text-lg font-extrabold">
                    <Folder size={18} className="shrink-0" />
                    <span className="truncate">{nameOf(f)}</span>
                    <span className="text-xs font-semibold text-ink-muted">
                      {t('notebook.folder_stats', { sets: all.length, words: wordsIn(all) })}
                    </span>
                  </h2>
                  <button
                    type="button"
                    disabled={!wordsIn(all)}
                    onClick={() =>
                      downloadJson(
                        nameOf(f),
                        all.flatMap((s) => s.words.map((w) => wordToJson(w, s.name))),
                      )
                    }
                    title={t('notebook.export_folder')}
                    aria-label={`${t('notebook.export_folder')} ${nameOf(f)}`}
                    className="btn p-2"
                  >
                    <FileDown size={15} />
                  </button>
                  {f.id !== UNCATEGORIZED && (
                    <button
                      type="button"
                      onClick={() => setDialog({ kind: 'edit-folder', folder: f })}
                      title={t('notebook.edit_folder')}
                      aria-label={`${t('notebook.edit_folder')} ${nameOf(f)}`}
                      className="btn p-2"
                    >
                      <Pencil size={15} />
                    </button>
                  )}
                </div>
                <ul className="box mt-3 divide-y-2 divide-line overflow-hidden">
                  {sets.map((s) => (
                    <SetCard
                      key={s.id}
                      to={`/notebook/${s.id}`}
                      name={s.id === UNCATEGORIZED ? t('notebook.uncategorized') : s.name}
                      wordCount={s.words.length}
                      learned={learnedIn(s.words)}
                      actions={setActions(s)}
                    />
                  ))}
                  {!sets.length && <li className="px-4 py-5 text-center text-sm text-ink-soft">{t('notebook.folder_empty')}</li>}
                  {!searching && (
                    <li>
                      <button
                        type="button"
                        onClick={() => setDialog({ kind: 'create', folderId: f.id })}
                        className="flex w-full items-center gap-2 px-4 py-2.5 text-sm font-bold text-ink-soft hover:bg-paper hover:text-ink"
                      >
                        <Plus size={16} />
                        {t('notebook.create_in_folder')}
                      </button>
                    </li>
                  )}
                </ul>
              </section>
            )
          })}

          {searching && !groups.length && <p className="box mt-5 p-8 text-center text-ink-soft">{t('notebook.no_results')}</p>}
          {!searching && !nb.sets.length && <p className="mt-5 text-center text-sm text-ink-soft">{t('notebook.first_set_hint')}</p>}
        </div>
      </div>

      {/* Hộp thoại */}
      {dialog?.kind === 'create' && (
        <CreateSetDialog
          folders={nb.folders}
          defaultFolderId={dialog.folderId}
          createFolder={nb.createFolder}
          onClose={close}
          onCreate={(name, folderId) => {
            nb.createSet(name, folderId)
            close()
            // Ở lại danh sách, chuyển sang thư mục chứa bộ vừa tạo.
            setSelected(folderId ?? UNCATEGORIZED)
          }}
        />
      )}
      {dialog?.kind === 'create-folder' && (
        <RenameDialog
          title={t('notebook.new_folder')}
          initial=""
          onClose={close}
          onSave={(name) => {
            setSelected(nb.createFolder(name))
            close()
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
            setSelected('all')
            close()
          }}
        />
      )}
    </Page>
  )
}
