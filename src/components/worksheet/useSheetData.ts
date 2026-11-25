import { useEffect, useMemo, useState } from 'react'
import { hanChars, type CharInfo } from '../../data/lookup'
import { useStrokes } from '../../lib/strokes'
import { toPinyinTokens, type PinyinToken } from '../../lib/textTools'
import type { Word } from '../../types'
import type { HanItem } from './settings'
import type { SheetData } from './Sheet'

export type HanEdits = Record<string, Partial<Omit<HanItem, 'char'>>>

/** Thông tin một chữ Hán: lấy từ mục một chữ trong từ điển HSK, nếu không có thì chỉ lấy pinyin. */
export function buildHanItems(text: string, dictionary: Word[], chars?: CharInfo, edits: HanEdits = {}): HanItem[] {
  const single = new Map<string, Word>()
  for (const w of dictionary) if ([...w.hanzi].length === 1 && !single.has(w.hanzi)) single.set(w.hanzi, w)
  const list = [...new Set(hanChars(text))]
  // Hán Việt của chữ không có mục riêng: lấy âm tương ứng trong một từ có chứa chữ đó (永远 → VĨNH VIỄN).
  const need = new Set(list.filter((c) => !single.get(c)?.han_viet))
  const hv = new Map<string, string>()
  if (need.size)
    for (const w of dictionary) {
      if (!w.han_viet) continue
      const hs = hanChars(w.hanzi)
      const parts = w.han_viet.trim().split(/\s+/)
      if (parts.length !== hs.length) continue
      hs.forEach((c, i) => need.has(c) && !hv.has(c) && hv.set(c, parts[i]))
    }
  return list.map((c) => {
    const w = single.get(c)
    return {
      char: c,
      pinyin: w?.pinyin ?? chars?.[c]?.p?.[0] ?? '',
      hanViet: w?.han_viet || hv.get(c) || '',
      meaning: w?.meaning_vi ?? '',
      ...edits[c],
    }
  })
}

/** Gom dữ liệu cho trang in: chữ Hán (kèm nét bút), từ vựng, đoạn văn đã phiên âm, chữ tiêu đề bìa. */
export function useSheetData({
  words,
  hanText,
  passageText,
  coverTitle,
  dictionary,
  chars,
  edits,
  needStrokes,
}: {
  words: Word[]
  hanText: string
  passageText: string
  coverTitle: string
  dictionary: Word[]
  chars?: CharInfo
  edits?: HanEdits
  needStrokes: boolean
}): SheetData {
  const han = useMemo(() => buildHanItems(hanText, dictionary, chars, edits), [hanText, dictionary, chars, edits])
  const strokes = useStrokes(needStrokes ? han.map((h) => h.char) : [])

  const [passage, setPassage] = useState<PinyinToken[][]>([])
  useEffect(() => {
    let alive = true
    const paras = passageText
      .split('\n')
      .map((p) => p.trim())
      .filter(Boolean)
    Promise.all(paras.map((p) => toPinyinTokens(p))).then((r) => alive && setPassage(r))
    return () => {
      alive = false
    }
  }, [passageText])

  const [coverTokens, setCoverTokens] = useState<PinyinToken[]>([])
  useEffect(() => {
    let alive = true
    toPinyinTokens(coverTitle).then((r) => alive && setCoverTokens(r))
    return () => {
      alive = false
    }
  }, [coverTitle])

  return { words, han, strokes, passage, coverTokens, chars }
}
