/**
 * Các mẫu phiếu luyện viết, chia 3 nhóm:
 *  - Chữ Hán: theo thứ tự nét, ô chữ lớn
 *  - Từ vựng: luyện viết từ vựng, bảng tự kiểm tra, nhìn pinyin viết chữ Hán
 *  - Đoạn văn & giấy ô: chép đoạn văn, bài văn dòng kẻ có pinyin, giấy ô trống, bìa vở
 * Các mẫu cùng nhóm dùng chung nội dung, nên đổi mẫu không mất nội dung.
 */
export type Template = 'strokes' | 'big' | 'trace' | 'check' | 'pinyin' | 'copy' | 'lined' | 'blank' | 'cover'
export type TemplateGroup = 'han' | 'vocab' | 'text'
export type CellType = 'tian' | 'mi' | 'square' | 'hui' | 'jiu'
export type CellColor = 'green' | 'red' | 'blue' | 'gray'
export type FontStyle = 'kai' | 'xing'
export type TraceStyle = 'fill' | 'outline' | 'dashed' | 'thin'

export const templateGroups: { group: TemplateGroup; templates: Template[] }[] = [
  { group: 'han', templates: ['strokes', 'big'] },
  { group: 'vocab', templates: ['trace', 'check', 'pinyin'] },
  { group: 'text', templates: ['copy', 'lined', 'blank', 'cover'] },
]
export const allTemplates = templateGroups.flatMap((g) => g.templates)
export const groupOf = (tp: Template): TemplateGroup => templateGroups.find((g) => g.templates.includes(tp))!.group

/** Phần cài đặt mà mỗi mẫu dùng (để ẩn các mục không liên quan). */
export const uses: Record<Template, Partial<Record<'cell' | 'perRow' | 'traceRows' | 'blankRows' | 'faded' | 'font' | 'trace' | 'pinyin' | 'meaning' | 'fontSize' | 'pages', boolean>>> = {
  strokes: { cell: true, perRow: true, traceRows: true, blankRows: true, faded: true, font: true, trace: true, pinyin: true, meaning: true },
  big: { cell: true, perRow: true, traceRows: true, faded: true, font: true, trace: true, meaning: true },
  trace: { cell: true, perRow: true, traceRows: true, blankRows: true, faded: true, font: true, trace: true, pinyin: true, meaning: true },
  check: { fontSize: true },
  pinyin: { cell: true, perRow: true, blankRows: true },
  copy: { cell: true, perRow: true, blankRows: true, font: true, trace: true, pinyin: true },
  lined: { perRow: true, blankRows: true, font: true, trace: true, pinyin: true },
  blank: { cell: true, perRow: true, pages: true },
  cover: { cell: true, font: true, pinyin: true },
}

export interface WorksheetSettings {
  template: Template
  title: string
  showHeader: boolean
  cell: CellType
  color: CellColor
  perRow: number
  traceRows: number
  blankRows: number
  /** Số chữ tô mờ trên mỗi hàng tô */
  faded: number
  font: FontStyle
  traceStyle: TraceStyle
  /** Độ đậm chữ tô, 10–100 (%) */
  opacity: number
  showPinyin: boolean
  showMeaning: boolean
  /** Cỡ chữ bảng tự kiểm tra (px) */
  fontSize: number
  /** Số trang giấy ô trống */
  pages: number
  coverTitle: string
  coverSub: string
  coverBook: string
  coverSlogan: string
}

export const defaultSettings: WorksheetSettings = {
  template: 'trace',
  title: '',
  showHeader: true,
  cell: 'tian',
  color: 'green',
  perRow: 12,
  traceRows: 1,
  blankRows: 0,
  faded: 3,
  font: 'kai',
  traceStyle: 'fill',
  opacity: 30,
  showPinyin: true,
  showMeaning: true,
  fontSize: 16,
  pages: 1,
  coverTitle: '硬笔书法',
  coverSub: '基本笔画练习 · 生字同步描写',
  coverBook: '硬笔书法教材',
  coverSlogan: '练一手好字  传一代文明',
}

/** Giá trị mặc định riêng của từng mẫu, áp dụng khi bấm "Khôi phục mặc định". */
export const templateDefaults: Partial<Record<Template, Partial<WorksheetSettings>>> = {
  strokes: { cell: 'mi', perRow: 12, traceRows: 1, faded: 12 },
  big: { perRow: 9, traceRows: 1, faded: 9 },
  trace: { perRow: 12, faded: 3 },
  pinyin: { cell: 'mi', perRow: 12, blankRows: 2 },
  copy: { perRow: 12, blankRows: 0 },
  lined: { perRow: 14, blankRows: 0, opacity: 100, color: 'gray' },
  blank: { perRow: 12, pages: 1 },
  cover: { color: 'red' },
}

/** Màu in: dịu, đủ rõ trên giấy. */
export const cellColors: Record<CellColor, string> = {
  green: '#5f9e72',
  red: '#cf7f6f',
  blue: '#5f8fc4',
  gray: '#9b958c',
}

export const fontFamilies: Record<FontStyle, string> = {
  kai: '"App Kai", "KaiTi", "STKaiti", "Kaiti SC", serif',
  xing: '"STXingkai", "Xingkai SC", "Long Cang", cursive',
}

export const limits = {
  perRow: [6, 16],
  linedPerRow: [8, 20],
  traceRows: [0, 4],
  blankRows: [0, 4],
  pages: [1, 20],
  fontSize: [12, 28],
} as const

/** Một chữ Hán trong mẫu nhóm "Chữ Hán". */
export interface HanItem {
  char: string
  pinyin: string
  hanViet: string
  meaning: string
}
