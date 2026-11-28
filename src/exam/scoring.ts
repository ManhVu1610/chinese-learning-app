import { SECTIONS, type Answer, type ExamPaper, type ExamQuestion, type ExamRecord, type ExamScope, type SectionKey } from './types'

/** Bỏ khoảng trắng và dấu câu để so câu viết. */
export const normalizeSentence = (s: string) => s.replace(/[\s\p{P}\p{S}]/gu, '')

export const isAnswered = (a: Answer | undefined) => typeof a === 'string' && a.trim() !== ''

/** Câu phải gõ chữ: máy chỉ so với câu mẫu, người học tự chấm lại khi viết khác. */
export const isWritten = (q: ExamQuestion) => q.kind === 'text' || q.kind === 'essay'

/**
 * Câu trả lời có đúng không.
 * - Trắc nghiệm, đúng sai, sắp xếp: khớp đáp án.
 * - Gõ chữ: khớp câu mẫu (bỏ dấu câu, khoảng trắng). Viết khác câu mẫu hoặc bài viết tự do thì tính sai
 *   cho tới khi người học tự chấm lại.
 */
export function isCorrect(q: ExamQuestion, a: Answer | undefined, override?: boolean): boolean {
  if (override !== undefined) return override
  if (!isAnswered(a)) return false
  if (isWritten(q)) return !!q.answer && normalizeSentence(q.answer) === normalizeSentence(a!)
  return a === q.answer
}

/** Câu gõ chữ đã làm nhưng không khớp câu mẫu: cần người học tự chấm. */
export const needsReview = (q: ExamQuestion, a: Answer | undefined) =>
  isWritten(q) && isAnswered(a) && !(q.answer && normalizeSentence(q.answer) === normalizeSentence(a!))

export const sectionsOf = (scope: ExamScope, paper: Pick<ExamPaper, 'counts'>): SectionKey[] =>
  (scope === 'all' ? SECTIONS : [scope]).filter((s) => paper.counts[s] > 0)

export interface SectionScore {
  section: SectionKey
  correct: number
  total: number
  /** Thang 100 điểm mỗi kỹ năng như HSK */
  score: number
}

export interface ExamScore {
  sections: SectionScore[]
  /** Tổng điểm (chỉ khi làm cả đề) */
  total?: number
  max: number
  passed?: boolean
}

/**
 * Mỗi kỹ năng 100 điểm. Đạt khi tổng từ 60%: HSK 1–2 120/200, HSK 3–6 180/300.
 * Bài viết đoạn văn (HSK 5 câu 99–100, HSK 6 câu 101) nặng hơn trong đề thật; ở đây mỗi câu tính như nhau.
 */
export function scoreRecord(paper: ExamPaper, rec: Pick<ExamRecord, 'answers' | 'overrides' | 'scope'>): ExamScore {
  const sections = sectionsOf(rec.scope, paper).map((section) => {
    const qs = paper.questions.filter((q) => q.section === section)
    const correct = qs.filter((q) => isCorrect(q, rec.answers[q.n], rec.overrides[q.n])).length
    return { section, correct, total: qs.length, score: qs.length ? Math.round((correct / qs.length) * 100) : 0 }
  })
  const max = sections.length * 100
  if (rec.scope !== 'all') return { sections, max }
  const total = sections.reduce((s, x) => s + x.score, 0)
  return { sections, total, max, passed: total >= max * 0.6 }
}

/** Lưu kèm điểm tóm tắt để danh sách lịch sử không phải tải lại đề. */
export function withSummary(paper: ExamPaper, rec: ExamRecord): ExamRecord {
  const sc = scoreRecord(paper, rec)
  return {
    ...rec,
    bestTotal: sc.total,
    summary: sc.total !== undefined ? `${sc.total}/${sc.max}` : `${sc.sections[0]?.score ?? 0}/100`,
  }
}
