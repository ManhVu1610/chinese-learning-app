/** Dữ liệu một đề thi HSK đã chuẩn hoá (sinh bởi scripts/build-hsk-exams.mjs, đọc từ public/hsk-exams). */

export type SectionKey = 'listening' | 'reading' | 'writing'
export const SECTIONS: SectionKey[] = ['listening', 'reading', 'writing']

export interface ExamOption {
  label: string
  text: string
}

export interface ExamQuestion {
  /** Số câu trong đề (liên tục từ 1) */
  n: number
  type:
    | 'listening_true_false'
    | 'listening_choice'
    | 'fill_in_blank'
    | 'reading_ordering'
    | 'reading_comprehension'
    | 'writing_construction'
  section: SectionKey
  /** Phần trong kỹ năng (第一部分, 第二部分…) */
  part: number
  /** Chỉ số đáp án đúng trong options */
  answer: number
  options?: ExamOption[]
  audio?: string
  transcript?: string
  image?: string
  explanation?: string
  /** Nghe phần 1: câu in trên đề để phán đoán đúng sai */
  statement?: string
  /** Đoạn văn (đọc hiểu, nghe đoạn dài) */
  passage?: string
  question?: string
  /** Chọn điền: các câu cùng số bank dùng chung danh sách từ */
  bank?: number
  /** Sắp xếp câu */
  sentences?: ExamOption[] | null
  orders?: string[]
  /** Viết */
  prompt?: string
  words?: string[]
  keyword?: string
  accepted?: string[]
}

export interface ExamMeta {
  id: string
  level: number
  number: number
  title: string
  code?: string
  official: boolean
  partial: boolean
  source: string
  /** file: có tệp âm thanh; tts: đọc lời thoại bằng giọng máy */
  audio: 'file' | 'tts'
  counts: Record<SectionKey, number>
  file: string
}

export interface ExamPaper extends Omit<ExamMeta, 'file'> {
  questions: ExamQuestion[]
}

/** strict: như thi thật (nghe một lần, tính giờ từng phần, không quay lại); practice: tự do, nghe lại được. */
export type ExamMode = 'strict' | 'practice'
/** Làm cả đề hay một kỹ năng */
export type ExamScope = 'all' | SectionKey

/** Câu trả lời: chỉ số lựa chọn, chuỗi thứ tự ("CAB") hoặc câu viết. */
export type Answer = number | string

export interface ExamSession {
  paperId: string
  file: string
  mode: ExamMode
  scope: ExamScope
  answers: Record<number, Answer>
  flags: number[]
  /** Chỉ số phần đang làm trong danh sách phần của lượt thi */
  sectionIdx: number
  /** Câu đang xem */
  current: number
  /** Giây còn lại của phần đang làm (thi thật) hoặc giây đã làm (luyện tập) */
  clock: number
  /** Đã bấm bắt đầu phần đang làm chưa (màn giới thiệu phần) */
  started: boolean
  /** Thi thật: các câu nghe đã phát xong (không quay lại được) */
  heard: number[]
  startedAt: number
}

export interface ExamRecord {
  id: string
  paperId: string
  file: string
  mode: ExamMode
  scope: ExamScope
  date: number
  /** Thời gian làm bài (giây) */
  duration: number
  answers: Record<number, Answer>
  /** Câu viết người học tự chấm lại: true = tính đúng */
  overrides: Record<number, boolean>
  /** Tổng điểm khi làm cả đề (để tìm điểm cao nhất) */
  bestTotal?: number
  /** Điểm tóm tắt hiển thị trong lịch sử, vd "212/300" */
  summary?: string
}

/** Thời gian chuẩn của HSK 4 (phút): nghe ~30, đọc 40, viết 25. */
export const SECTION_MINUTES: Record<number, Record<SectionKey, number>> = {
  4: { listening: 30, reading: 40, writing: 25 },
}
/** Thời gian chờ trả lời sau mỗi đoạn nghe (giây) */
export const LISTEN_GAP = 12
