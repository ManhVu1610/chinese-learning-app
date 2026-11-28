import clsx from 'clsx'
import { BookMarked, BookOpen, ChevronDown, Folder, Layers, Play } from 'lucide-react'
import { useMemo, useState, type ReactNode } from 'react'
import { useTranslation } from 'react-i18next'
import { useDictionary } from '../../hooks/useDictionary'
import Page, { type Crumb } from '../layout/Page'
import SfxToggle from './SfxToggle'
import { UNCATEGORIZED, useNotebook } from '../../hooks/useNotebook'
import type { HSKLevel, Word } from '../../types'

/**
 * Nguồn từ để luyện: chọn cùng lúc nhiều cấp HSK, nhiều bộ trong sổ tay và/hoặc cả thư mục
 * (chọn thư mục = mọi bộ đang có trong thư mục đó, kể cả bộ thêm sau).
 */
export interface Sources {
  levels: HSKLevel[]
  sets: string[]
  folders: string[]
}

const KEY = 'practice_source'
const COUNTS = [10, 20, 50, 0] as const // 0 = tất cả
const LEVELS: HSKLevel[] = [1, 2, 3, 4, 5, 6]

export function shuffle<T>(arr: T[]): T[] {
  const a = [...arr]
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1))
    ;[a[i], a[j]] = [a[j], a[i]]
  }
  return a
}

const readSaved = (): { sources: Sources; count: number } => {
  const fallback = { sources: { levels: [1 as HSKLevel], sets: [], folders: [] }, count: 10 }
  try {
    const v = JSON.parse(localStorage.getItem(KEY) ?? 'null')
    if (!v) return fallback
    const count = typeof v.count === 'number' ? v.count : 10
    if (v.sources)
      return { sources: { levels: v.sources.levels ?? [], sets: v.sources.sets ?? [], folders: v.sources.folders ?? [] }, count }
    // Dạng cũ: một nguồn duy nhất.
    if (v.source?.kind === 'hsk') return { sources: { levels: [v.source.level], sets: [], folders: [] }, count }
    if (v.source?.kind === 'set') return { sources: { levels: [], sets: [v.source.id], folders: [] }, count }
    if (v.source?.kind === 'saved') return { sources: { levels: [], sets: [UNCATEGORIZED], folders: [] }, count }
  } catch {
    /* bỏ qua */
  }
  return fallback
}

const toggle = <T,>(list: T[], v: T) => (list.includes(v) ? list.filter((x) => x !== v) : [...list, v])

/**
 * Bảng chọn trước khi luyện: nguồn từ + số câu + các tuỳ chọn riêng của từng bài (children).
 * Bấm "Bắt đầu" thì trả về danh sách từ đã trộn ngẫu nhiên.
 */
export default function PracticeSetup({
  feature,
  title,
  intro,
  children,
  filter = () => true,
  crumbs,
  showCount = true,
  onStart,
}: {
  /** Khoá tính năng (listening / speaking / typing) để dựng khung trang chung */
  feature: string
  title: string
  intro: string
  children?: ReactNode
  /** Chỉ lấy những từ dùng được cho bài này (vd có câu ví dụ) */
  filter?: (w: Word) => boolean
  /** Trang con sau tên tính năng (vd tên trò chơi) */
  crumbs?: Crumb[]
  /** Ẩn mục "Số câu" (trò chơi tự quyết số từ cần dùng) */
  showCount?: boolean
  onStart: (words: Word[], pool: Word[]) => void
}) {
  const { t } = useTranslation()
  const { words: dictionary, loading } = useDictionary()
  const { sets, folders } = useNotebook()
  const [{ sources, count }, setState] = useState(readSaved)

  const save = (fn: (s: { sources: Sources; count: number }) => { sources: Sources; count: number }) =>
    setState((s) => {
      const v = fn(s)
      localStorage.setItem(KEY, JSON.stringify(v))
      return v
    })
  const update = (next: { count: number }) => save((s) => ({ ...s, ...next }))
  // Luôn tính từ trạng thái mới nhất, để bấm nhanh liên tiếp không bị mất lựa chọn.
  const setSources = (fn: (src: Sources) => Partial<Sources>) => save((s) => ({ ...s, sources: { ...s.sources, ...fn(s.sources) } }))

  // Các bộ được chọn: chọn riêng lẻ + mọi bộ trong thư mục đã chọn.
  const chosenSets = useMemo(
    () => sets.filter((s) => sources.sets.includes(s.id) || (s.folderId !== null && sources.folders.includes(s.folderId))),
    [sets, sources],
  )

  // Gộp từ của mọi nguồn, bỏ trùng theo chữ Hán.
  const pool = useMemo(() => {
    const all = [...dictionary.filter((w) => sources.levels.includes(w.hsk_level as HSKLevel)), ...chosenSets.flatMap((s) => s.words)]
    const seen = new Set<string>()
    return all.filter((w) => {
      const k = w.hanzi.trim()
      if (!k || seen.has(k) || !filter(w)) return false
      seen.add(k)
      return true
    })
  }, [sources.levels, chosenSets, dictionary, filter])

  const folderName = (id: string, name: string) => (id === UNCATEGORIZED ? t('notebook.uncategorized') : name)
  const orderedFolders = [...folders].sort((a, b) => Number(b.id === UNCATEGORIZED) - Number(a.id === UNCATEGORIZED))
  const nothing = !sources.levels.length && !chosenSets.length

  // Bấm một bộ nằm trong thư mục đang chọn cả: bỏ chọn thư mục, giữ lại các bộ còn lại của thư mục.
  const toggleSet = (id: string, folderId: string | null) =>
    setSources((sources) => {
      if (!folderId || !sources.folders.includes(folderId)) return { sets: toggle(sources.sets, id) }
      const siblings = sets.filter((s) => s.folderId === folderId && s.id !== id).map((s) => s.id)
      return {
        folders: sources.folders.filter((f) => f !== folderId),
        sets: [...new Set([...sources.sets, ...siblings])].filter((x) => x !== id),
      }
    })
  const toggleFolder = (id: string) => {
    const inFolder = sets.filter((s) => s.folderId === id).map((s) => s.id)
    setSources((src) => ({ folders: toggle(src.folders, id), sets: src.sets.filter((x) => !inFolder.includes(x)) }))
  }

  // Số từ mỗi cấp HSK (hiện dưới nút chọn cấp).
  const levelCount = useMemo(() => {
    const c: Record<number, number> = {}
    for (const w of dictionary) if (filter(w)) c[w.hsk_level] = (c[w.hsk_level] ?? 0) + 1
    return c
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [dictionary])
  // Thư mục đang mở: mặc định mở những thư mục đang chọn lẻ từng bộ.
  const [expanded, setExpanded] = useState<string[]>(() =>
    folders.filter((f) => sets.some((s) => s.folderId === f.id && sources.sets.includes(s.id))).map((f) => f.id),
  )
  const toggleExpand = (id: string) => setExpanded((l) => toggle(l, id))

  const start = () => {
    const picked = shuffle(pool)
    onStart(count && showCount ? picked.slice(0, count) : picked, pool)
  }

  return (
    <Page feature={feature} size="narrow" title={title} description={intro} crumbs={crumbs}>
      <div className="box space-y-5 p-5">
        <section>
          <div className="flex flex-wrap items-baseline justify-between gap-2">
            <h2 className="text-sm font-bold">{t('practice.source')}</h2>
            {!nothing && (
              <button
                type="button"
                onClick={() => setSources(() => ({ levels: [], sets: [], folders: [] }))}
                className="text-xs font-semibold text-ink-soft underline-offset-2 hover:underline"
              >
                {t('practice.clear_sources')}
              </button>
            )}
          </div>

          <div className="mt-2 overflow-hidden rounded-2xl border-2 border-ink">
            {/* HSK: chọn nhiều cấp */}
            <div className="border-b-2 border-ink bg-paper/60 p-3">
              <p className="flex items-center gap-1.5 text-xs font-extrabold text-ink-soft uppercase">
                <BookOpen size={14} />
                {t('practice.from_vocab')}
              </p>
              <div className="mt-2 grid grid-cols-3 gap-2 sm:grid-cols-6">
                {LEVELS.map((l) => {
                  const on = sources.levels.includes(l)
                  return (
                    <button
                      key={l}
                      type="button"
                      aria-pressed={on}
                      onClick={() => setSources((src) => ({ levels: toggle(src.levels, l) }))}
                      className={clsx(
                        'flex flex-col items-center rounded-xl border-2 px-2 py-1.5 transition-colors',
                        on ? 'border-ink bg-sand shadow-block-sm' : 'border-line bg-card hover:border-ink',
                      )}
                    >
                      <span className="text-sm font-extrabold">HSK {l}</span>
                      <span className="text-[11px] text-ink-muted tabular-nums">{levelCount[l] ?? '…'}</span>
                    </button>
                  )
                })}
              </div>
            </div>

            {/* Sổ tay: mỗi thư mục một hàng, mở ra chọn từng bộ */}
            <div className="p-3">
              <p className="flex items-center gap-1.5 text-xs font-extrabold text-ink-soft uppercase">
                <BookMarked size={14} />
                {t('tools.notebook')}
              </p>
              <ul className="mt-2 max-h-72 space-y-1.5 overflow-y-auto [scrollbar-width:thin]">
                {orderedFolders.map((f) => {
                  const list = sets.filter((s) => s.folderId === f.id)
                  if (!list.length) return null
                  const folderOn = sources.folders.includes(f.id)
                  const picked = folderOn ? list.length : list.filter((s) => sources.sets.includes(s.id)).length
                  const open = expanded.includes(f.id)
                  const words = list.reduce((n, s) => n + s.words.length, 0)
                  return (
                    <li key={f.id} className={clsx('rounded-xl border-2', picked ? 'border-ink' : 'border-line')}>
                      <div className="flex items-center gap-2 px-2.5 py-1.5">
                        <input
                          type="checkbox"
                          checked={folderOn}
                          ref={(el) => {
                            if (el) el.indeterminate = !folderOn && picked > 0
                          }}
                          onChange={() => toggleFolder(f.id)}
                          aria-label={folderName(f.id, f.name)}
                          className="h-4 w-4 shrink-0 accent-[var(--color-brick)]"
                        />
                        <button
                          type="button"
                          onClick={() => toggleExpand(f.id)}
                          aria-expanded={open}
                          className="flex min-w-0 flex-1 items-center gap-2 text-left"
                        >
                          <Folder size={15} className="shrink-0" />
                          <span className="min-w-0 flex-1 truncate text-sm font-bold">{folderName(f.id, f.name)}</span>
                          <span className="shrink-0 text-xs text-ink-muted">
                            {picked > 0 && !folderOn
                              ? t('practice.sets_picked', { picked, total: list.length })
                              : t('practice.folder_stats', { sets: list.length, words })}
                          </span>
                          <ChevronDown size={15} className={clsx('shrink-0 transition-transform', open && 'rotate-180')} />
                        </button>
                      </div>
                      {open && (
                        <ul className="border-t-2 border-line py-1">
                          {list.map((s) => {
                            const on = folderOn || sources.sets.includes(s.id)
                            return (
                              <li key={s.id}>
                                <label className="flex cursor-pointer items-center gap-2 py-1 pr-3 pl-8 text-sm hover:bg-paper">
                                  <input
                                    type="checkbox"
                                    checked={on}
                                    onChange={() => toggleSet(s.id, s.folderId)}
                                    className="h-4 w-4 shrink-0 accent-[var(--color-brick)]"
                                  />
                                  <span className="min-w-0 flex-1 truncate">
                                    {s.id === UNCATEGORIZED ? t('notebook.uncategorized') : s.name}
                                  </span>
                                  <span className="text-xs text-ink-muted tabular-nums">{s.words.length}</span>
                                </label>
                              </li>
                            )
                          })}
                        </ul>
                      )}
                    </li>
                  )
                })}
              </ul>
              {!sets.some((s) => s.words.length) && <p className="py-1 text-xs text-ink-muted">{t('practice.no_sets')}</p>}
            </div>

            {/* Tổng kết */}
            <div
              className={clsx(
                'flex items-center gap-2 border-t-2 border-ink px-3 py-2 text-sm font-bold',
                nothing || !pool.length ? 'bg-apricot/50' : 'bg-sage/40',
              )}
            >
              <Layers size={15} />
              {loading && sources.levels.length
                ? t('common.loading')
                : nothing
                  ? t('practice.pick_source')
                  : t('practice.pool', { count: pool.length })}
            </div>
          </div>
        </section>

        {showCount && (
          <div>
            <span className="text-sm font-bold">{t('practice.count')}</span>
            <div className="mt-1.5 flex flex-wrap gap-2">
              {COUNTS.map((c) => (
                <button
                  key={c}
                  type="button"
                  onClick={() => update({ count: c })}
                  className={clsx('btn px-4 py-1.5 text-sm', count === c && 'bg-sand')}
                >
                  {c ? c : t('practice.all')}
                </button>
              ))}
            </div>
          </div>
        )}

        {children}

        <SfxToggle className="rounded-2xl border-2 border-line px-3 py-2" />

        <button type="button" onClick={start} disabled={!pool.length} className="btn btn-accent w-full py-3">
          <Play size={18} />
          {t('practice.start')}
        </button>
        {!pool.length && !loading && !nothing && <p className="text-center text-sm text-ink-soft">{t('practice.empty_pool')}</p>}
      </div>
    </Page>
  )
}

/** Một nhóm nút chọn (dùng cho tuỳ chọn riêng của từng bài). */
export function Choice<T extends string>({
  label,
  value,
  options,
  onChange,
}: {
  label: string
  value: T
  options: { value: T; label: string }[]
  onChange: (v: T) => void
}) {
  return (
    <div>
      <span className="text-sm font-bold">{label}</span>
      <div className="mt-1.5 flex flex-wrap gap-2">
        {options.map((o) => (
          <button
            key={o.value}
            type="button"
            onClick={() => onChange(o.value)}
            className={clsx('btn px-4 py-1.5 text-sm', value === o.value && 'bg-sand')}
          >
            {o.label}
          </button>
        ))}
      </div>
    </div>
  )
}
