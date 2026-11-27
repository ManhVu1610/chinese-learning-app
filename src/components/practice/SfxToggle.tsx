import { Volume2, VolumeX } from 'lucide-react'
import { useState } from 'react'
import { useTranslation } from 'react-i18next'
import { playCorrect, setSfxEnabled, sfxEnabled } from '../../lib/sfx'

/** Công tắc bật/tắt âm báo đúng/sai (dùng chung cho mọi phần luyện tập). */
export default function SfxToggle({ className }: { className?: string }) {
  const { t } = useTranslation()
  const [on, setOn] = useState(sfxEnabled)
  return (
    <label className={`flex cursor-pointer items-center justify-between gap-3 text-sm ${className ?? ''}`}>
      <span className="flex items-center gap-1.5">
        {on ? <Volume2 size={15} /> : <VolumeX size={15} />}
        {t('practice.sfx')}
      </span>
      <input
        type="checkbox"
        checked={on}
        onChange={(e) => {
          setSfxEnabled(e.target.checked)
          setOn(e.target.checked)
          if (e.target.checked) playCorrect()
        }}
        className="h-4 w-4 accent-[var(--color-brick)]"
      />
    </label>
  )
}
