import Sheet, { type SheetData } from './Sheet'
import type { WorksheetSettings } from './settings'

const SHEET_PX = (210 / 25.4) * 96

/** Ảnh thu nhỏ trang đầu của một mẫu (vẽ thật bằng Sheet rồi thu nhỏ). */
export default function SheetThumb({ settings, data, width }: { settings: WorksheetSettings; data: SheetData; width: number }) {
  const scale = width / SHEET_PX
  return (
    <div
      aria-hidden="true"
      className="pointer-events-none overflow-hidden bg-white"
      style={{ width, height: width * (297 / 210) }}
    >
      <div className="origin-top-left" style={{ transform: `scale(${scale})`, width: SHEET_PX }}>
        <Sheet settings={{ ...settings, pages: 1 }} data={data} />
      </div>
    </div>
  )
}
