import { SECTIONS, type Answer, type ExamPaper, type ExamQuestion, type ExamRecord, type ExamScope, type SectionKey } from './types'

/** Bỏ khoảng trắng và dấu câu để so câu viết. */
export const normalizeSentence = (s: string) => s.replace(/[\s\p{P}\p{S}]/gu, '')

const hanCount = (s: string) => (s.match(/\p{Script=Han}/gu) ?? []).length

/**
 * Câu trả lời có đúng không.
 * - Trắc nghiệm: đúng chỉ số.
 * - Sắp xếp: đúng thứ tự của đáp án.
 * - Viết phần 1: khớp câu đáp án (bỏ dấu câu, khoảng trắng).
 * - Viết phần 2 (câu theo tranh): chấm tạm là đúng nếu có từ khoá và đủ dài; người học tự chấm lại khi xem đáp án.
 */
export function isCorrect(q: ExamQuestion, a: Answer | undefined, override?: boolean): boolean {
  if (override !== undefined) return override
  if (a === undefined || a === '') return false
  if (q.section === 'writing') {
    if (typeof a !== 'string') return false
    const mine = normalizeSentence(a)
    if (!mine) return false
    if ((q.accepted ?? []).some((r) => normalizeSentence(r) === mine)) return true
    if (q.part === 2 && q.keyword) return mine.includes(q.keyword) && hanCount(mine) >= q.keyword.length + 3
    return false
  }
  if (q.type === 'reading_ordering' && typeof a === 'string') return q.orders?.[q.answer] === a
  return a === q.answer
}

export const isAnswered = (a: Answer | undefined) => a !== undefined && a !== '' && !(typeof a === 'string' && !a.trim())

/** Câu viết theo tranh được chấm tạm (không khớp câu mẫu) — cần người học xem lại. */
export function needsReview(q: ExamQuestion, a: Answer | undefined) {
  if (q.section !== 'writing' || q.part !== 2 || typeof a !== 'string' || !a.trim()) return false
  const mine = normalizeSentence(a)
  return !(q.accepted ?? []).some((r) => normalizeSentence(r) === mine)
}

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

/** HSK 3–6: mỗi kỹ năng 100 điểm, đạt khi tổng ≥ 60% (HSK 4: 180/300). */
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
