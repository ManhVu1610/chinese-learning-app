const supported = typeof window !== 'undefined' && 'speechSynthesis' in window

/**
 * Chọn giọng tiếng Trung phổ thông tốt nhất có trên máy.
 * Nếu chỉ đặt lang = 'zh-CN' mà không chọn giọng, một số trình duyệt dùng giọng mặc định
 * (tiếng Anh/Việt hoặc tiếng Quảng Đông) nên đọc sai âm.
 */
function pickVoice(voices: SpeechSynthesisVoice[]): SpeechSynthesisVoice | null {
  const mandarin = voices.filter((v) => {
    const lang = v.lang.toLowerCase().replace('_', '-')
    return (
      (lang === 'zh-cn' || lang === 'cmn-cn' || lang === 'cmn-hans-cn' || lang === 'zh-hans-cn' || lang.startsWith('zh-cn')) &&
      !/cantonese|粤|yue|hong kong|taiwan/i.test(v.name)
    )
  })
  if (!mandarin.length) {
    // Không có giọng Trung Quốc đại lục: thử giọng Đài Loan (vẫn là tiếng phổ thông), không dùng tiếng Quảng Đông.
    return voices.find((v) => /^zh-tw|^cmn-tw/i.test(v.lang)) ?? null
  }
  const score = (v: SpeechSynthesisVoice) => {
    let s = 0
    if (/natural|neural|online/i.test(v.name)) s += 4 // giọng tự nhiên (Edge: Xiaoxiao, Yunxi…)
    if (/xiaoxiao|yunxi|xiaoyi/i.test(v.name)) s += 2
    if (/google/i.test(v.name)) s += 3 // Chrome: "Google 普通话（中国大陆）"
    if (/huihui|yaoyao|kangkang|ting-ting|tingting/i.test(v.name)) s += 1
    return s
  }
  return [...mandarin].sort((a, b) => score(b) - score(a))[0]
}

let cachedVoice: SpeechSynthesisVoice | null = null
function getVoice() {
  if (!supported) return null
  if (!cachedVoice) cachedVoice = pickVoice(speechSynthesis.getVoices())
  return cachedVoice
}
if (supported) {
  // Danh sách giọng được nạp không đồng bộ: chọn lại khi nạp xong.
  speechSynthesis.addEventListener?.('voiceschanged', () => {
    cachedVoice = pickVoice(speechSynthesis.getVoices())
  })
  getVoice()
}

/** Tên giọng đang dùng (để hiển thị / kiểm tra). */
export const currentVoiceName = () => getVoice()?.name ?? null

export function useSpeech() {
  const speak = (text: string, lang = 'zh-CN', rate = 0.8) => {
    if (!supported || !text.trim()) return
    const utterance = new SpeechSynthesisUtterance(text)
    const voice = lang === 'zh-CN' ? getVoice() : null
    if (voice) {
      utterance.voice = voice
      utterance.lang = voice.lang
    } else {
      utterance.lang = lang
    }
    utterance.rate = rate
    speechSynthesis.cancel()
    speechSynthesis.speak(utterance)
  }

  return { speak, supported }
}
