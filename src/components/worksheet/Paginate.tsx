import { useLayoutEffect, useRef, useState, type ReactNode } from 'react'

export interface Block {
  key: string
  node: ReactNode
}

const PAGE_CONTENT_PX = (273 / 25.4) * 96 // 297 mm − 2 × 12 mm lề, ở 96 dpi

/**
 * Chia các khối nội dung thành từng trang A4: đo chiều cao từng khối trong một vùng ẩn
 * rộng bằng vùng in (186 mm), rồi xếp lần lượt vào trang cho tới khi đầy.
 * Mỗi trang lặp lại `header` (tiêu đề, họ tên) và `repeat` (vd hàng tiêu đề của bảng).
 * Nhờ vậy bản xem trước và bản in có cùng số trang và cùng chỗ ngắt trang.
 */
export default function Paginate({ header, repeat, blocks }: { header: ReactNode; repeat?: ReactNode; blocks: Block[] }) {
  const measureRef = useRef<HTMLDivElement>(null)
  const [pages, setPages] = useState<number[][]>([blocks.map((_, i) => i)])
  const [tick, setTick] = useState(0)

  // Đo lại sau mỗi lần vẽ; chỉ cập nhật khi cách chia trang thực sự đổi.
  useLayoutEffect(() => {
    const root = measureRef.current
    if (!root) return
    const fixed =
      (root.querySelector<HTMLElement>('[data-m="header"]')?.offsetHeight ?? 0) +
      (root.querySelector<HTMLElement>('[data-m="repeat"]')?.offsetHeight ?? 0)
    const heights = [...root.querySelectorAll<HTMLElement>('[data-m="block"]')].map((el) => el.offsetHeight)
    const next: number[][] = []
    let cur: number[] = []
    let used = fixed
    heights.forEach((h, i) => {
      if (cur.length && used + h > PAGE_CONTENT_PX) {
        next.push(cur)
        cur = []
        used = fixed
      }
      cur.push(i)
      used += h
    })
    next.push(cur)
    if (JSON.stringify(next) !== JSON.stringify(pages)) setPages(next)
  })

  // Font tải xong làm chữ đổi kích thước: đo lại.
  useLayoutEffect(() => {
    const root = measureRef.current
    if (!root) return
    const ro = new ResizeObserver(() => setTick((t) => t + 1))
    ro.observe(root)
    return () => ro.disconnect()
  }, [])
  void tick

  const valid = pages.flat().length === blocks.length ? pages : [blocks.map((_, i) => i)]

  return (
    <>
      <div
        ref={measureRef}
        aria-hidden="true"
        className="pointer-events-none invisible absolute top-0 -left-[99999px] print:hidden"
        style={{ width: '186mm' }}
      >
        <div data-m="header" className="flow-root">
          {header}
        </div>
        {repeat && (
          <div data-m="repeat" className="flow-root">
            {repeat}
          </div>
        )}
        {blocks.map((b) => (
          <div key={b.key} data-m="block" className="flow-root">
            {b.node}
          </div>
        ))}
      </div>
      {valid.map((idxs, p) => (
        <div key={p} className="ws-page">
          {header}
          {repeat}
          {idxs.map((i) => (
            <div key={blocks[i].key} className="flow-root">
              {blocks[i].node}
            </div>
          ))}
        </div>
      ))}
    </>
  )
}
