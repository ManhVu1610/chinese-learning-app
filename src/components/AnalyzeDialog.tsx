import clsx from 'clsx'
import { useState } from 'react'
import { useTranslation } from 'react-i18next'
import CharAnalysis from './CharAnalysis'
import Modal from './Modal'

const hanChars = (s: string) => [...new Set([...s].filter((c) => /\p{Script=Han}/u.test(c)))]

/** Hộp thoại phân tích Hán tự cho một từ / bộ thủ; từ nhiều chữ thì chọn từng chữ. */
export default function AnalyzeDialog({ text, onClose }: { text: string; onClose: () => void }) {
  const { t } = useTranslation()
  const chars = hanChars(text)
  const [active, setActive] = useState(0)
  const ch = chars[active] ?? ''

  return (
    <Modal title={`${t('tools.analyze')}: ${text}`} onClose={onClose} wide>
      {chars.length > 1 && (
        <div className="mb-4 flex flex-wrap gap-2" role="tablist">
          {chars.map((c, i) => (
            <button
              key={c}
              type="button"
              role="tab"
              aria-selected={i === active}
              onClick={() => setActive(i)}
              className={clsx('btn px-4 py-1 text-xl', i === active && 'bg-sand')}
            >
              {c}
            </button>
          ))}
        </div>
      )}
      {ch && <CharAnalysis key={ch} ch={ch} compact />}
    </Modal>
  )
}
