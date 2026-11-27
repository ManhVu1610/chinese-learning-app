import { useState } from 'react'
import type { Word } from '../../types'
import { playResult } from '../../lib/sfx'
import { shuffle } from './PracticeSetup'

/** Trạng thái một lượt luyện: cài đặt → làm từng câu → kết quả. */
export function useSession() {
  const [phase, setPhase] = useState<'setup' | 'run' | 'done'>('setup')
  const [words, setWords] = useState<Word[]>([])
  const [pool, setPool] = useState<Word[]>([])
  const [index, setIndex] = useState(0)
  const [score, setScore] = useState(0)
  const [wrong, setWrong] = useState<Word[]>([])
  /** null = chưa trả lời câu hiện tại */
  const [result, setResult] = useState<boolean | null>(null)

  const begin = (list: Word[], fullPool: Word[] = pool) => {
    setWords(list)
    setPool(fullPool)
    setIndex(0)
    setScore(0)
    setWrong([])
    setResult(null)
    setPhase(list.length ? 'run' : 'setup')
  }

  /** Ghi nhận câu trả lời của câu hiện tại (chỉ lần đầu). */
  const answer = (ok: boolean) => {
    if (result !== null) return
    setResult(ok)
    playResult(ok)
    if (ok) setScore((s) => s + 1)
    else setWrong((ws) => [...ws, words[index]])
  }

  /** Người học tự chấm lại là đúng (vd nghĩa đồng nghĩa mà máy không nhận ra). */
  const override = () => {
    if (result !== false) return
    setResult(true)
    playResult(true)
    setScore((s) => s + 1)
    setWrong((ws) => ws.slice(0, -1))
  }

  const next = () => {
    setResult(null)
    if (index + 1 >= words.length) setPhase('done')
    else setIndex((i) => i + 1)
  }

  return {
    phase,
    words,
    pool,
    index,
    current: words[index] as Word | undefined,
    score,
    wrong,
    result,
    begin,
    answer,
    override,
    next,
    restart: () => begin(shuffle(words)),
    retryWrong: () => begin(shuffle(wrong)),
    toSetup: () => setPhase('setup'),
  }
}
