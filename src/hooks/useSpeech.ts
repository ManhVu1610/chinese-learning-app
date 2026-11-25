export function useSpeech() {
  const supported = typeof window !== 'undefined' && 'speechSynthesis' in window

  const speak = (text: string, lang = 'zh-CN') => {
    if (!supported) return
    const utterance = new SpeechSynthesisUtterance(text)
    utterance.lang = lang
    utterance.rate = 0.8
    speechSynthesis.cancel()
    speechSynthesis.speak(utterance)
  }

  return { speak, supported }
}
