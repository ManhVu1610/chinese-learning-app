import clsx from 'clsx'
import { Check, Copy, Eye, ExternalLink, FileJson, Layers, Plus, Square, SquareCheck, Upload, X } from 'lucide-react'
import { useEffect, useRef, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { CLAUDE_PROMPT, loadChars, parseJsonWords, type CharInfo } from '../../data/lookup'
import type { Word } from '../../types'

const SAMPLE_JSON = `[
  {
    "word": "你好",
    "reading": "nǐ hǎo",
    "yinHan": "NHĨ HẢO",
    "meaning": "Xin chào",
    "example": "你好，我是学生。",
    "exampleMeaning": "Xin chào, tôi là học sinh."
  }
]`

interface PreviewItem {
  key: string
  source: string
  word: Word | null
  checked: boolean
  duplicate: boolean
}

/**
 * Nhập hàng loạt: dán hoặc tải JSON (thường do Claude tạo từ tài liệu theo prompt mẫu).
 * Bên phải là danh sách xem trước có ô tick; chỉ những từ được tick mới được lưu.
 */
export default function BulkImportDialog({
  setName,
  dictionary,
  existing,
  onSave,
  onClose,
}: {
  setName: string
  dictionary: Word[]
  existing: Set<string>
  onSave: (words: Word[]) => void
  onClose: () => void
}) {
  const { t } = useTranslation()
  const [jsonText, setJsonText] = useState('')
  const [error, setError] = useState<string | null>(null)
  const [items, setItems] = useState<PreviewItem[]>([])
  const [copied, setCopied] = useState(false)
  const [chars, setChars] = useState<CharInfo>()
  const fileRef = useRef<HTMLInputElement>(null)
  const closeRef = useRef(onClose)
  useEffect(() => {
    closeRef.current = onClose
  }, [onClose])

  useEffect(() => {
    loadChars().then(setChars)
    // Khi đang mở hộp thoại key API phía trên thì Esc chỉ đóng hộp thoại đó.
    const onKey = (e: KeyboardEvent) => e.key === 'Escape' && !document.querySelector('[aria-label="' + t('apikeys.title') + '"]') && closeRef.current()
    document.addEventListener('keydown', onKey)
    const prev = document.body.style.overflow
    document.body.style.overflow = 'hidden'
    return () => {
      document.removeEventListener('keydown', onKey)
      document.body.style.overflow = prev
    }
  }, [])

  const toItems = (list: { source: string; word: Word | null }[]): PreviewItem[] =>
    list.map((x, i) => {
      const duplicate = !!x.word && existing.has(x.word.hanzi)
      return { key: `${i}-${x.source}`, source: x.source, word: x.word, checked: !!x.word && !duplicate, duplicate }
    })

  const previewJson = (text: string) => {
    setError(null)
    try {
      const words = parseJsonWords(text, dictionary, chars)
      if (!words.length) throw new Error(t('bulk.json_empty'))
      setItems(toItems(words.map((w) => ({ source: w.hanzi, word: w }))))
    } catch (e) {
      setItems([])
      setError(t('bulk.json_error', { message: e instanceof Error ? e.message : String(e) }))
    }
  }

  const onFile = async (file: File) => setJsonText(await file.text())

  const copyPrompt = async () => {
    await navigator.clipboard.writeText(CLAUDE_PROMPT)
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
  }

  const selected = items.filter((i) => i.checked && i.word)
  const selectable = items.filter((i) => i.word && !i.duplicate)
  const allSelected = selectable.length > 0 && selectable.every((i) => i.checked)
  const [sampleCopied, setSampleCopied] = useState(false)

  // Dán hoặc tải JSON là xem trước ngay (chờ 400ms sau lần gõ cuối).
  useEffect(() => {
    const text = jsonText.trim()
    if (!text) {
      setItems([])
      setError(null)
      return
    }
    const h = setTimeout(() => previewJson(text), 400)
    return () => clearTimeout(h)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [jsonText, chars, dictionary])
  const toggleAll = (v: boolean) => setItems((l) => l.map((i) => (i.word && !i.duplicate ? { ...i, checked: v } : i)))

  return (
    <div className="fixed inset-0 z-[60] flex items-stretch justify-center bg-ink/30 p-2 sm:p-6">
      <div role="dialog" aria-modal="true" aria-label={t('bulk.title')} className="box flex w-full max-w-6xl flex-col overflow-hidden shadow-block-lg">
        {/* Tiêu đề */}
        <div className="flex items-center gap-3 border-b-2 border-ink px-5 py-4">
          <span className="inline-flex border-2 border-ink bg-sand p-2">
            <Plus size={20} />
          </span>
          <div className="flex-1">
            <h2 className="text-xl font-bold">{t('bulk.title')}</h2>
            <p className="text-sm text-ink-soft">{t('bulk.subtitle')}</p>
          </div>
          <button type="button" onClick={onClose} aria-label={t('common.close')} className="p-1 text-ink-soft hover:text-ink">
            <X size={22} />
          </button>
        </div>

        <div className="grid min-h-0 flex-1 md:grid-cols-[minmax(0,26rem)_1fr]">
          {/* Cột trái: nguồn nhập */}
          <div className="min-h-0 space-y-4 overflow-y-auto border-b-2 border-ink bg-paper p-4 md:border-r-2 md:border-b-0">
            <p className="flex items-center gap-2 border-2 border-ink bg-card px-3 py-2 text-sm font-semibold">
              <Layers size={16} />
              {t('bulk.save_to')} <span className="tag">{setName}</span>
            </p>

            <p className="flex items-center gap-2 text-sm font-semibold">
              <FileJson size={16} />
              {t('bulk.tab_json')}
            </p>

            {(
              <>
                <Step n={1} text={t('bulk.json_step1')}>
                  <a
                    href="https://claude.ai/new"
                    target="_blank"
                    rel="noreferrer"
                    className="btn mt-3 px-4"
                  >
                    {t('bulk.open_claude')}
                    <ExternalLink size={14} />
                  </a>
                </Step>
                <Step n={2} text={t('bulk.json_step2')} />
                <Step n={3} text={t('bulk.json_step3')}>
                  <div className="mt-3 flex justify-end">
                    <button type="button" onClick={copyPrompt} className="btn px-3 py-1.5 text-sm">
                      {copied ? <Check size={14} /> : <Copy size={14} />}
                      {copied ? t('bulk.copied') : t('bulk.copy_prompt')}
                    </button>
                  </div>
                  <pre className="mt-2 max-h-40 overflow-auto border-2 border-ink bg-card p-2 text-xs whitespace-pre-wrap">
                    {CLAUDE_PROMPT}
                  </pre>
                </Step>
                <Step n={4} text={t('bulk.json_step4')}>
                  <div className="mt-3 flex justify-end">
                    <input
                      ref={fileRef}
                      type="file"
                      accept=".json,application/json,text/plain"
                      className="hidden"
                      onChange={(e) => {
                        const f = e.target.files?.[0]
                        if (f) onFile(f)
                        e.target.value = ''
                      }}
                    />
                    <button type="button" onClick={() => fileRef.current?.click()} className="btn px-3 py-1.5 text-sm">
                      <Upload size={14} />
                      {t('bulk.upload_json')}
                    </button>
                  </div>
                  <textarea
                    value={jsonText}
                    onChange={(e) => setJsonText(e.target.value)}
                    rows={9}
                    placeholder={SAMPLE_JSON}
                    aria-label={t('bulk.json_step4')}
                    className="field mt-2 resize-y font-mono text-xs"
                  />
                  <button
                    type="button"
                    onClick={async () => {
                      await navigator.clipboard.writeText(SAMPLE_JSON)
                      setSampleCopied(true)
                      setTimeout(() => setSampleCopied(false), 2000)
                    }}
                    className="mt-2 flex items-center gap-1.5 text-xs font-semibold text-ink-soft hover:text-ink"
                  >
                    {sampleCopied ? <Check size={13} /> : <Copy size={13} />}
                    {sampleCopied ? t('bulk.copied') : t('bulk.copy_sample')}
                  </button>
                </Step>
              </>
            )}
            {error && <p className="border-2 border-ink bg-coral px-3 py-2 text-sm">{error}</p>}
          </div>

          {/* Cột phải: xem trước */}
          <div className="flex min-h-64 flex-col">
            <div className="flex items-center gap-2 border-b-2 border-ink bg-sand/60 px-4 py-3 text-sm font-semibold">
              <Eye size={16} />
              {t('bulk.preview_title')}
              <span className="tag bg-card">{items.filter((i) => i.word).length}</span>
              {selectable.length > 0 && (
                <button
                  type="button"
                  onClick={() => toggleAll(!allSelected)}
                  className="ml-auto flex items-center gap-1.5 text-xs hover:underline"
                >
                  {allSelected ? <SquareCheck size={15} /> : <Square size={15} />}
                  {allSelected ? t('bulk.select_none') : t('bulk.select_all')}
                </button>
              )}
            </div>
            <div className="min-h-0 flex-1 overflow-y-auto">
              {items.length === 0 ? (
                <div className="flex h-full flex-col items-center justify-center p-8 text-center">
                  <span className="inline-flex rounded-full border-2 border-dashed border-ink p-4">
                    <Eye size={26} />
                  </span>
                  <p className="mt-4 font-semibold">{t('bulk.empty_title')}</p>
                  <p className="mt-1 max-w-sm text-sm text-ink-soft">{t('bulk.empty_hint')}</p>
                </div>
              ) : (
                <ul className="grid grid-cols-1 gap-3 p-3 sm:grid-cols-2">
                  {items.map((it) => {
                    const disabled = !it.word || it.duplicate
                    return (
                      <li key={it.key}>
                        <label
                          className={clsx(
                            'flex h-full items-start gap-3 border-2 px-3 py-2.5',
                            disabled ? 'cursor-default border-line bg-paper' : 'cursor-pointer border-ink bg-card',
                            it.checked && 'shadow-block-sm',
                            !it.word && 'bg-coral/40',
                          )}
                        >
                          <input
                            type="checkbox"
                            checked={it.checked}
                            disabled={disabled}
                            onChange={(e) => setItems((l) => l.map((x) => (x.key === it.key ? { ...x, checked: e.target.checked } : x)))}
                            aria-label={it.word?.hanzi ?? it.source}
                            className="mt-1.5 h-4 w-4 shrink-0 accent-[var(--color-brick)]"
                          />
                          {it.word ? (
                            <div className="min-w-0 flex-1">
                              <p className="flex flex-wrap items-center gap-x-2 gap-y-1">
                                <span className="text-xl leading-tight font-bold text-brick">{it.word.hanzi}</span>
                                {it.word.pinyin && <span className="text-xs text-ink-soft">{it.word.pinyin}</span>}
                                {it.word.han_viet && (
                                  <span className="border-2 border-ink bg-sand px-1.5 text-[10px] font-bold uppercase">
                                    {it.word.han_viet}
                                  </span>
                                )}
                                {it.duplicate && <span className="tag bg-sky py-0 text-[10px]">{t('bulk.duplicate')}</span>}
                              </p>
                              {it.word.meaning_vi ? (
                                <p className="mt-0.5 text-sm font-semibold">{it.word.meaning_vi}</p>
                              ) : (
                                <span className="tag mt-1 bg-apricot py-0 text-[10px]">{t('bulk.no_meaning')}</span>
                              )}
                              {it.word.example && <p className="mt-0.5 truncate text-sm text-ink-soft">{it.word.example}</p>}
                            </div>
                          ) : (
                            <p className="flex-1 text-sm">
                              <span className="font-semibold">{it.source}</span> · {t('bulk.not_found')}
                            </p>
                          )}
                        </label>
                      </li>
                    )
                  })}
                </ul>
              )}
            </div>
          </div>
        </div>

        {/* Chân */}
        <div className="flex flex-wrap items-center justify-end gap-3 border-t-2 border-ink bg-paper px-5 py-3">
          <span className="mr-auto text-sm text-ink-soft">
            {t('bulk.footer', { total: items.filter((i) => i.word).length, selected: selected.length })}
          </span>
          <button type="button" onClick={onClose} className="btn px-4">
            {t('common.cancel')}
          </button>
          <button
            type="button"
            disabled={!selected.length}
            onClick={() => onSave(selected.map((i) => i.word!))}
            className="btn btn-accent px-4"
          >
            <Plus size={16} />
            {t('bulk.confirm', { count: selected.length })}
          </button>
        </div>
      </div>
    </div>
  )
}

function Step({ n, text, children }: { n: number; text: string; children?: React.ReactNode }) {
  const { t } = useTranslation()
  return (
    <div className="border-2 border-ink bg-card p-3">
      <p className="flex items-start gap-2 text-sm font-semibold">
        <span className="shrink-0 bg-ink px-1.5 py-0.5 text-xs text-card">{t('bulk.step', { n })}</span>
        {text}
      </p>
      {children}
    </div>
  )
}
