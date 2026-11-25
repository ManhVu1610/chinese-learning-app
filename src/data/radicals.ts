import type { CommonRadical, Radical } from '../types'
import data from './generated/radicals.json'
import data50 from './generated/radicals50.json'

/** 214 bộ thủ, nhập từ app Learn (radicals_214.json). */
export const radicals = data as Radical[]

/** 50 bộ thủ thường dùng kèm từ ví dụ, nhập từ app Learn (radicals_50.json). */
export const commonRadicals = data50 as CommonRadical[]

const byForm = new Map<string, Radical>()
for (const r of radicals) {
  byForm.set(r.radical, r)
  for (const v of r.variants) if (!byForm.has(v)) byForm.set(v, r)
}

export const getRadicalById = (id: number) => radicals.find((r) => r.id === id)

/** Nếu chính chữ đó là một bộ thủ (hoặc biến thể), trả về bộ thủ đó. */
export const getRadicalByForm = (ch: string) => byForm.get(ch)
