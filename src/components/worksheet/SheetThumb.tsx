import Sheet, { type SheetData } from './Sheet'
import type { WorksheetSettings } from './settings'

const SHEET_PX = (210 / 25.4) * 96

/**
 * Ảnh thu nhỏ trang đầu của một mẫu (vẽ thật bằng Sheet rồi thu nhỏ).
 * `crop` (0–1) chỉ hiện phần trên của trang, cho thẻ gọn hơn.
 */
export default function SheetThumb({
  settings,
  data,
  width,
  crop = 1,
}: {
  settings: WorksheetSettings
  data: SheetData
  width: number
  crop?: number
}) {
  const scale = width / SHEET_PX
  return (
    <div
      aria-hidden="true"
      className="ws-thumb pointer-events-none overflow-hidden bg-white"
      style={{ width, height: width * (297 / 210) * crop }}
    >
      <div className="origin-top-left" style={{ transform: `scale(${scale})`, width: SHEET_PX }}>
        <Sheet settings={{ ...settings, pages: 1 }} data={data} />
      </div>
    </div>
  )
}
