import clsx from 'clsx'
import { Check, Folder, Star } from 'lucide-react'
import { useEffect, useRef, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { UNCATEGORIZED, useNotebook } from '../hooks/useNotebook'
import { useSavedWords } from '../hooks/useSavedWords'
import type { Word } from '../types'

/**
 * Nút ⭐ lưu một từ vào Sổ tay.
 * Chưa có bộ nào khác ngoài "Chưa phân loại": bấm là lưu / bỏ lưu ngay.
 * Đã có bộ khác: mở danh sách để chọn bộ (bấm để thêm / bỏ từ khỏi từng bộ).
 */
export default function SaveButton({ word }: { word: Word }) {
  const { t } = useTranslation()
  const nb = useNotebook()
  const { isSaved, setsWith, saveWord, unsaveWord } = useSavedWords()
  const [open, setOpen] = useState(false)
  // Vị trí danh sách (cố định theo màn hình) để không bị tràn ra ngoài khi nút nằm sát mép.
  const [pos, setPos] = useState<{ left: number; bottom: number } | null>(null)
  const btnRef = useRef<HTMLButtonElement>(null)
  const ref = useRef<HTMLDivElement>(null)
  const saved = isSaved(word)
  const label = saved ? t('notebook.unsave') : t('notebook.save')
  const otherSets = nb.sets.filter((s) => s.id !== UNCATEGORIZED)
  const inSets = new Set(setsWith(word).map((s) => s.id))

  useEffect(() => {
    if (!open) return
    const onDown = (e: PointerEvent) => !ref.current?.contains(e.target as Node) && setOpen(false)
    const onKey = (e: KeyboardEvent) => e.key === 'Escape' && setOpen(false)
    document.addEventListener('pointerdown', onDown)
    document.addEventListener('keydown', onKey)
    const onScroll = () => setOpen(false)
    window.addEventListener('scroll', onScroll, true)
    return () => {
      document.removeEventListener('pointerdown', onDown)
      document.removeEventListener('keydown', onKey)
      window.removeEventListener('scroll', onScroll, true)
    }
  }, [open])

  const onClick = () => {
    if (!otherSets.length) {
      if (saved) unsaveWord(word)
      else saveWord(word)
    } else {
      const rect = btnRef.current?.getBoundingClientRect()
      if (rect)
        setPos({
          left: Math.min(Math.max(8, rect.right - 256), window.innerWidth - 264),
          bottom: window.innerHeight - rect.top + 8,
        })
      setOpen((o) => !o)
    }
  }

  const toggleIn = (setId: string) => (inSets.has(setId) ? unsaveWord(word, setId) : saveWord(word, setId))

  // Danh sách chọn: "Chưa phân loại" trước, rồi các bộ theo thư mục.
  const folderName = (id: string | null) =>
    id === UNCATEGORIZED ? t('notebook.uncategorized') : (nb.folders.find((f) => f.id === id)?.name ?? '')
  const choices = [
    { id: UNCATEGORIZED, name: t('notebook.uncategorized'), folder: t('notebook.uncategorized') },
    ...otherSets.map((s) => ({ id: s.id, name: s.name, folder: folderName(s.folderId) })),
  ]

  return (
    <div ref={ref} className="relative">
      <button
        ref={btnRef}
        type="button"
        onClick={onClick}
        aria-pressed={saved}
        aria-expanded={otherSets.length ? open : undefined}
        title={otherSets.length ? t('notebook.save_to') : label}
        aria-label={`${otherSets.length ? t('notebook.save_to') : label} ${word.hanzi}`}
        className={clsx('btn p-1.5', saved && 'bg-sand')}
      >
        <Star size={16} fill={saved ? 'currentColor' : 'none'} />
      </button>
      {open && (
        <div role="menu" className="box fixed z-50 w-64 p-2 text-left" style={pos ?? undefined}>
          <p className="px-2 pb-1.5 text-xs font-extrabold text-ink-soft uppercase">{t('notebook.save_to')}</p>
          <ul className="max-h-64 space-y-0.5 overflow-y-auto">
            {choices.map((c) => {
              const on = inSets.has(c.id)
              return (
                <li key={c.id}>
                  <button
                    type="button"
                    role="menuitemcheckbox"
                    aria-checked={on}
                    onClick={() => toggleIn(c.id)}
                    className={clsx(
                      'flex w-full items-center gap-2 rounded-xl px-2 py-1.5 text-left text-sm',
                      on ? 'bg-sand font-bold' : 'hover:bg-paper',
                    )}
                  >
                    <span
                      className={clsx(
                        'flex h-4 w-4 shrink-0 items-center justify-center rounded border-2 border-ink',
                        on && 'bg-ink text-card',
                      )}
                    >
                      {on && <Check size={11} strokeWidth={3} />}
                    </span>
                    <span className="min-w-0 flex-1 truncate">{c.name}</span>
                    {c.id !== UNCATEGORIZED && (
                      <span className="flex max-w-[40%] shrink-0 items-center gap-0.5 truncate text-[10px] text-ink-muted">
                        <Folder size={10} />
                        {c.folder}
                      </span>
                    )}
                  </button>
                </li>
              )
            })}
          </ul>
        </div>
      )}
    </div>
  )
}
