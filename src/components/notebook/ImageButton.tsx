import { ImagePlus, X } from 'lucide-react'
import { useRef } from 'react'
import { useTranslation } from 'react-i18next'

/** Thu nhỏ ảnh về tối đa `max` px và nén JPEG để lưu gọn trong trình duyệt. */
async function shrink(file: File, max = 240): Promise<string> {
  const url = URL.createObjectURL(file)
  try {
    const img = await new Promise<HTMLImageElement>((resolve, reject) => {
      const i = new Image()
      i.onload = () => resolve(i)
      i.onerror = reject
      i.src = url
    })
    const scale = Math.min(1, max / Math.max(img.width, img.height))
    const canvas = document.createElement('canvas')
    canvas.width = Math.round(img.width * scale)
    canvas.height = Math.round(img.height * scale)
    canvas.getContext('2d')!.drawImage(img, 0, 0, canvas.width, canvas.height)
    return canvas.toDataURL('image/jpeg', 0.8)
  } finally {
    URL.revokeObjectURL(url)
  }
}

/** Nút "Thêm ảnh" cho một từ; khi đã có ảnh thì hiện ảnh nhỏ kèm nút xoá. */
export default function ImageButton({ value, onChange }: { value?: string; onChange: (v: string | undefined) => void }) {
  const { t } = useTranslation()
  const ref = useRef<HTMLInputElement>(null)

  return (
    <div className="mt-2">
      <input
        ref={ref}
        type="file"
        accept="image/*"
        className="hidden"
        onChange={async (e) => {
          const f = e.target.files?.[0]
          e.target.value = ''
          if (f) onChange(await shrink(f))
        }}
      />
      {value ? (
        <div className="relative inline-block">
          <img src={value} alt="" className="h-16 w-16 border-2 border-ink object-cover" />
          <button
            type="button"
            onClick={() => onChange(undefined)}
            aria-label={t('editor.remove_image')}
            className="absolute -top-2 -right-2 border-2 border-ink bg-card p-0.5 hover:bg-coral"
          >
            <X size={12} />
          </button>
        </div>
      ) : (
        <button type="button" onClick={() => ref.current?.click()} className="btn px-2 py-1 text-xs">
          <ImagePlus size={14} />
          {t('editor.add_image')}
        </button>
      )}
    </div>
  )
}
