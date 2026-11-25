import type { Word } from '../types'

/**
 * Xuất từ vựng ra JSON theo đúng schema của prompt mẫu (word, reading, yinHan, meaning, example, exampleMeaning),
 * để có thể nhập lại bằng "Nhập hàng loạt → Nhập từ Claude / JSON". Các trường thêm chỉ có khi từ có dữ liệu đó.
 */
export function wordToJson(w: Word, setName?: string) {
  const types = w.word_types?.length ? w.word_types : w.word_type ? [w.word_type] : []
  return {
    word: w.hanzi,
    reading: w.pinyin ?? '',
    yinHan: (w.han_viet ?? '').toUpperCase(),
    meaning: w.meaning_vi ?? '',
    example: w.example ?? '',
    exampleMeaning: w.example_vi ?? '',
    ...(w.example_pinyin ? { examplePinyin: w.example_pinyin } : {}),
    ...(w.meaning_en ? { meaningEn: w.meaning_en } : {}),
    ...(types.length ? { wordTypes: types } : {}),
    ...(setName ? { set: setName } : {}),
  }
}

/** Tải một tệp .json về máy (không gửi đi đâu). */
export function downloadJson(name: string, data: unknown) {
  const safe = name.replace(/[\\/:*?"<>|]+/g, '-').trim() || 'tu-vung'
  const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' })
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = `${safe}.json`
  document.body.appendChild(a)
  a.click()
  a.remove()
  setTimeout(() => URL.revokeObjectURL(url), 1000)
}
