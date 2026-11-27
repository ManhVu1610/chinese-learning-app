import { useEffect, useRef, useState } from 'react'

export const canRecord = typeof window !== 'undefined' && 'MediaRecorder' in window && !!navigator.mediaDevices?.getUserMedia

/** Ghi âm bằng micro của máy; bản ghi chỉ nằm trong trình duyệt, không gửi đi đâu. */
export function useRecorder() {
  const [recording, setRecording] = useState(false)
  const [url, setUrl] = useState<string | null>(null)
  const [error, setError] = useState<string | null>(null)
  const recRef = useRef<MediaRecorder | null>(null)

  const clear = () => {
    setUrl((u) => {
      if (u) URL.revokeObjectURL(u)
      return null
    })
  }
  const start = async () => {
    setError(null)
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true })
      const rec = new MediaRecorder(stream)
      const chunks: Blob[] = []
      rec.ondataavailable = (e) => e.data.size && chunks.push(e.data)
      rec.onstop = () => {
        stream.getTracks().forEach((tr) => tr.stop())
        clear()
        setUrl(URL.createObjectURL(new Blob(chunks, { type: rec.mimeType })))
        setRecording(false)
      }
      recRef.current = rec
      rec.start()
      setRecording(true)
    } catch (e) {
      setError((e as Error).name === 'NotAllowedError' ? 'denied' : 'failed')
    }
  }
  const stop = () => {
    if (recRef.current?.state === 'recording') recRef.current.stop()
  }
  useEffect(() => () => stop(), [])
  return { recording, url, error, start, stop, clear }
}
