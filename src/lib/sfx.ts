/**
 * Âm báo đúng / sai khi luyện tập, tạo bằng Web Audio (không cần tệp âm thanh).
 * Bật/tắt chung cho cả app: localStorage 'sfx_on' ('0' = tắt).
 */
const KEY = 'sfx_on'
let ctx: AudioContext | null = null

export const sfxEnabled = () => localStorage.getItem(KEY) !== '0'
export const setSfxEnabled = (on: boolean) => localStorage.setItem(KEY, on ? '1' : '0')

function tone(freq: number, start: number, duration: number, type: OscillatorType, volume: number) {
  if (!ctx) return
  const osc = ctx.createOscillator()
  const gain = ctx.createGain()
  osc.type = type
  osc.frequency.setValueAtTime(freq, ctx.currentTime + start)
  gain.gain.setValueAtTime(0.0001, ctx.currentTime + start)
  gain.gain.exponentialRampToValueAtTime(volume, ctx.currentTime + start + 0.015)
  gain.gain.exponentialRampToValueAtTime(0.0001, ctx.currentTime + start + duration)
  osc.connect(gain).connect(ctx.destination)
  osc.start(ctx.currentTime + start)
  osc.stop(ctx.currentTime + start + duration + 0.02)
}

function ready(): boolean {
  if (!sfxEnabled() || typeof window === 'undefined') return false
  const AC = window.AudioContext ?? (window as unknown as { webkitAudioContext?: typeof AudioContext }).webkitAudioContext
  if (!AC) return false
  ctx ??= new AC()
  if (ctx.state === 'suspended') void ctx.resume()
  return true
}

/** "Ting ting" vui tai khi trả lời đúng. */
export function playCorrect() {
  if (!ready()) return
  tone(880, 0, 0.14, 'sine', 0.18) // A5
  tone(1318.5, 0.1, 0.22, 'sine', 0.16) // E6
}

/** Tiếng "bùm" trầm khi trả lời sai. */
export function playWrong() {
  if (!ready()) return
  tone(220, 0, 0.16, 'triangle', 0.2)
  tone(174.6, 0.13, 0.26, 'triangle', 0.18)
}

export const playResult = (ok: boolean) => (ok ? playCorrect() : playWrong())

/** Thời gian chờ để âm báo phát xong rồi mới đọc từ (tránh chồng tiếng). */
export const SFX_GAP_MS = 380
