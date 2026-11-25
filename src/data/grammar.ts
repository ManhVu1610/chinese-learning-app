import type { GrammarPoint } from '../types'
import data from './generated/grammar.json'

/**
 * 341 bài ngữ pháp HSK 1–6, lấy từ app Learn (lib/src/data/grammar_lesson_data.dart)
 * qua scripts/import-learn-data.mjs. Chỉ được nạp cùng trang Ngữ pháp.
 */
export const grammarPoints = data as GrammarPoint[]
