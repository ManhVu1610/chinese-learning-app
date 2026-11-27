import clsx from 'clsx'
import { Check, ChevronDown } from 'lucide-react'
import { useEffect, useRef, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { WORD_TYPES } from '../../data/lookup'

/** Chọn nhiều loại từ; hiện các nhãn đã chọn trong ô. */
export default function WordTypeSelect({ value, onChange }: { value: string[]; onChange: (v: string[]) => void }) {
  const { t } = useTranslation()
  const [open, setOpen] = useState(false)
  const ref = useRef<HTMLDivElement>(null)

  useEffect(() => {
    if (!open) return
    const onDown = (e: PointerEvent) => !ref.current?.contains(e.target as Node) && setOpen(false)
    const onKey = (e: KeyboardEvent) => e.key === 'Escape' && setOpen(false)
    document.addEventListener('pointerdown', onDown)
    document.addEventListener('keydown', onKey)
    return () => {
      document.removeEventListener('pointerdown', onDown)
      document.removeEventListener('keydown', onKey)
    }
  }, [open])

  const toggle = (type: string) => onChange(value.includes(type) ? value.filter((x) => x !== type) : [...value, type])
  // Giữ cả loại từ lạ (vd từ dữ liệu nhập) trong danh sách chọn.
  const options = [...WORD_TYPES, ...value.filter((v) => !WORD_TYPES.includes(v))]

  return (
    <div ref={ref} className="relative">
      <button
        type="button"
        onClick={() => setOpen((o) => !o)}
        aria-expanded={open}
        aria-haspopup="listbox"
        aria-label={t('editor.col_type')}
        className="field flex min-h-11 items-center gap-1.5 py-1.5 text-left"
      >
        <span className="flex flex-1 flex-wrap gap-1">
          {value.length ? (
            value.map((v) => (
              <span key={v} className="tag bg-sky py-0 text-[11px]">
                {v}
              </span>
            ))
          ) : (
            <span className="text-sm text-ink-muted">{t('editor.choose_type')}</span>
          )}
        </span>
        <ChevronDown size={16} className="shrink-0" />
      </button>
      {open && (
        <ul role="listbox" aria-multiselectable="true" className="box absolute z-30 mt-1 max-h-64 w-full min-w-44 overflow-y-auto p-1">
          {options.map((type) => {
            const on = value.includes(type)
            return (
              <li key={type}>
                <button
                  type="button"
                  role="option"
                  aria-selected={on}
                  onClick={() => toggle(type)}
                  className={clsx('flex w-full items-center gap-2 rounded-lg px-2 py-1.5 text-left text-sm', on ? 'bg-sand font-semibold' : 'hover:bg-paper')}
                >
                  <span className={clsx('flex h-4 w-4 items-center justify-center border-2 border-ink', on && 'bg-ink text-card')}>
                    {on && <Check size={11} strokeWidth={3} />}
                  </span>
                  {type}
                </button>
              </li>
            )
          })}
        </ul>
      )}
    </div>
  )
}
