/**
 * Đề thi HSK 1–6 (đề gốc dạng ảnh quét). Dữ liệu ở public/hsk-exams/<id>/paper.json:
 * mỗi câu là một hoặc vài vùng cắt từ trang đề gốc, kèm phần chung (tiêu đề phần, ví dụ, ngân hàng từ, đoạn văn).
 */

export type SectionKey = 'listening' | 'reading' | 'writing'
export const SECTIONS: SectionKey[] = ['listening', 'reading', 'writing']

/**
 * Cách trả lời:
 * tf: đúng / sai · abc, abcd, ae, af: chọn chữ cái · order: sắp xếp 3 câu A B C ·
 * text: gõ chữ Hán (ghép câu, điền chữ, viết câu theo tranh) · essay: viết đoạn văn.
 */
export type QuestionKind = 'tf' | 'abc' | 'abcd' | 'ae' | 'af' | 'order' | 'text' | 'essay'

export const KIND_OPTIONS: Partial<Record<QuestionKind, string>> = {
  abc: 'ABC',
  abcd: 'ABCD',
  ae: 'ABCDE',
  af: 'ABCDEF',
  order: 'ABC',
}

/**
 * Một vùng trên trang đề: [trang, y trên, y dưới] (tỉ lệ 0–1 theo chiều cao trang),
 * có thể thêm [x trái, x phải] (tỉ lệ trong khung cắt của đề) khi đề in hai cột.
 */
export type Region = [number, number, number] | [number, number, number, number, number]

export interface ExamQuestion {
  n: number
  section: SectionKey
  kind: QuestionKind
  /** "A"…"F", "√"/"×", "CAB" hoặc câu mẫu; không có với bài viết tự do */
  answer?: string
  regions: Region[]
  /** Phần chung hiện phía trên câu (khoá trong paper.intros) */
  intro: string[]
  /** Câu ★ thứ mấy trong một đoạn văn: [thứ tự, số câu] */
  sub?: [number, number]
  /** Lời thoại phần Nghe (khi đề có tệp lời thoại đọc được) */
  transcript?: string
}

export interface ExamMeta {
  id: string
  code: string
  level: number
  counts: Record<SectionKey, number>
  minutes: Record<SectionKey, number>
  audio: boolean
  transcript: boolean
  file: string
}

export interface ExamPaper {
  id: string
  code: string
  level: number
  minutes: Record<SectionKey, number>
  counts: Record<SectionKey, number>
  /** Thư mục chứa ảnh trang, vd /hsk-exams/h41004/ */
  base: string
  pages: string[]
  /** Cao / rộng của ảnh trang */
  ratio: number
  /** Khung cắt ngang [x trái, x phải] dùng cho mọi vùng */
  crop: [number, number]
  intros: Record<string, Region[]>
  questions: ExamQuestion[]
  /** Tệp nghe của cả đề */
  audio: string | null
}

/** strict: như thi thật (nghe một lượt, tính giờ từng phần, không quay lại); practice: tự do, tua lại được. */
export type ExamMode = 'strict' | 'practice'
/** Làm cả đề hay một kỹ năng */
export type ExamScope = 'all' | SectionKey

/** Câu trả lời: chữ cái, √ / ×, thứ tự "CAB" hoặc chữ viết. */
export type Answer = string

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
  /** Thi thật: vị trí đang nghe (giây) để làm tiếp sau khi tải lại trang */
  audioPos?: number
  /** Thi thật: đã nghe hết tệp, đang trong thời gian điền đáp án */
  audioDone?: boolean
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
  /** Câu người học tự chấm lại: true = tính đúng */
  overrides: Record<number, boolean>
  /** Tổng điểm khi làm cả đề (để tìm điểm cao nhất) */
  bestTotal?: number
  /** Điểm tóm tắt hiển thị trong lịch sử, vd "212/300" */
  summary?: string
}

/** Sau khi nghe hết, thời gian điền đáp án phần Nghe (giây): HSK 1–2 ba phút, HSK 3–6 năm phút. */
export const answerWindow = (level: number) => (level <= 2 ? 3 : 5) * 60
