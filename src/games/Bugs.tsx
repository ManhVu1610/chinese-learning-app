import clsx from 'clsx'
import { Bug, Flame, Gauge, Pause, Play } from 'lucide-react'
import { useEffect, useRef, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { Choice } from '../components/practice/PracticeSetup'
import { hasMeaning } from '../components/practice/checks'
import { useSpeech } from '../hooks/useSpeech'
import { playCorrect, playWrong } from '../lib/sfx'
import type { Word } from '../types'
import { GameFrame, GameOver, GameSetup, Lives, shuffle, Stat, useSetting, type Phase } from './shared'

/**
 * Diệt bọ — chủ đề "Vườn rau": mỗi lượt một con bọ mang NGHĨA tiếng Việt bò xuống luống cải. Chọn nhanh chữ Hán đúng
 * trong 4 nút (hoặc phím 1–4) để diệt bọ trước khi nó gặm rau. Chi tiết: docs/games/diet-bo.md
 */

type Speed = 'slow' | 'normal' | 'fast'
/** Thời gian bọ bò hết vườn (ms) ở lượt đầu; mỗi lượt sau nhanh hơn 3% (tối đa gấp đôi). */
const TRAVEL: Record<Speed, number> = { slow: 12000, normal: 9000, fast: 6500 }
const LIVES = 3
const COUNTS = [10, 20, 30] as const
const SPRITES = ['🐛', '🐞', '🪲', '🐜']

interface Round {
  answer: Word
  options: Word[]
  /** thời gian đã bò (ms), cộng theo khung hình để tạm dừng được */
  age: number
  travel: number
  x: number
  sprite: string
  wrong: string[]
  /** null = đang chơi; 'caught' = diệt được; 'ate' = bọ gặm rau */
  result: null | 'caught' | 'ate'
}

/** 3 đáp án gây nhiễu: khác chữ, khác nghĩa; ưu tiên cùng số chữ để không đoán được bằng độ dài. */
function makeOptions(answer: Word, pool: Word[]) {
  const others = shuffle(pool.filter((w) => w.hanzi !== answer.hanzi && w.meaning_vi !== answer.meaning_vi))
  const out: Word[] = []
  for (const w of [...others.filter((w) => w.hanzi.length === answer.hanzi.length), ...others]) {
    if (out.length === 3) break
    if (!out.some((o) => o.hanzi === w.hanzi)) out.push(w)
  }
  return shuffle([answer, ...out])
}

export default function Bugs() {
  const { t } = useTranslation()
  const { speak, supported } = useSpeech()
  const [phase, setPhase] = useState<Phase>('setup')
  const [speed, setSpeed] = useSetting<Speed>('game_bugs_speed', 'normal')
  const [count, setCount] = useSetting<number>('game_bugs_count', 20)
  const [pool, setPool] = useState<Word[]>([])
  const [queue, setQueue] = useState<Word[]>([])
  const [index, setIndex] = useState(0)
  const [round, setRound] = useState<Round | null>(null)
  const [lives, setLives] = useState(LIVES)
  const [score, setScore] = useState(0)
  const [combo, setCombo] = useState(0)
  const [best, setBest] = useState(0)
  const [caught, setCaught] = useState(0)
  const [wrongIds, setWrongIds] = useState<string[]>([])
  const [paused, setPaused] = useState(false)
  const [fast, setFast] = useState(false)
  const [, setFrame] = useState(0)
  const livesRef = useRef(LIVES)

  const makeRound = (answer: Word, i: number, src = pool): Round => ({
    answer,
    options: makeOptions(answer, src),
    age: 0,
    travel: Math.max(TRAVEL[speed] * 0.5, TRAVEL[speed] * Math.pow(0.97, i)),
    x: 15 + Math.random() * 70,
    sprite: SPRITES[i % SPRITES.length],
    wrong: [],
    result: null,
  })

  const begin = (words = pool) => {
    const q = shuffle(words).slice(0, count)
    setQueue(q)
    setIndex(0)
    setLives(LIVES)
    livesRef.current = LIVES
    setScore(0)
    setCombo(0)
    setBest(0)
    setCaught(0)
    setWrongIds([])
    setPaused(false)
    setRound(makeRound(q[0], 0, words))
    setPhase('play')
  }

  const nextRound = (left: number) => {
    setTimeout(() => {
      const n = index + 1
      if (left <= 0 || n >= queue.length) return setPhase('over')
      setIndex(n)
      setRound(makeRound(queue[n], n))
    }, 1200)
  }

  // Vòng lặp: bọ bò xuống; chạm luống rau thì mất một cây.
  useEffect(() => {
    if (phase !== 'play' || paused || !round || round.result) return
    let id = 0
    let last = performance.now()
    const tick = (now: number) => {
      const dt = Math.min(64, now - last) * (fast ? 1.5 : 1)
      last = now
      round.age += dt
      if (round.age >= round.travel) {
        round.result = 'ate'
        playWrong()
        setCombo(0)
        setWrongIds((w) => [...new Set([...w, round.answer.id])])
        const left = livesRef.current - 1
        livesRef.current = left
        setLives(left)
        setFrame(now)
        nextRound(left)
        return
      }
      setFrame(now)
      id = requestAnimationFrame(tick)
    }
    id = requestAnimationFrame(tick)
    return () => cancelAnimationFrame(id)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [phase, paused, fast, round])

  const choose = (w: Word) => {
    if (!round || round.result || paused || round.wrong.includes(w.id)) return
    if (w.id === round.answer.id) {
      round.result = 'caught'
      playCorrect()
      if (supported) setTimeout(() => speak(w.hanzi), 250)
      const c = combo + 1
      setCombo(c)
      setBest((b) => Math.max(b, c))
      setCaught((n) => n + 1)
      // Diệt sớm được thêm điểm.
      setScore((s) => s + 10 + Math.min(c - 1, 5) * 2 + Math.round((1 - round.age / round.travel) * 5))
      setFrame(performance.now())
      nextRound(livesRef.current)
    } else {
      playWrong()
      round.wrong.push(w.id)
      setCombo(0)
      setWrongIds((ids) => [...new Set([...ids, round.answer.id])])
      const left = livesRef.current - 1
      livesRef.current = left
      setLives(left)
      if (left <= 0) {
        round.result = 'ate'
        nextRound(left)
      }
    }
  }

  // Phím 1–4 chọn đáp án, P tạm dừng.
  useEffect(() => {
    if (phase !== 'play' || !round) return
    const onKey = (e: KeyboardEvent) => {
      const n = Number(e.key)
      if (n >= 1 && n <= round.options.length) choose(round.options[n - 1])
      else if (e.key === 'p' || e.key === 'P') setPaused((p) => !p)
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  })

  if (phase === 'setup')
    return (
      <GameSetup
        game="bugs"
        filter={hasMeaning}
        onStart={(w) => {
          setPool(w)
          begin(w)
        }}
      >
        <Choice
          label={t('game.speed')}
          value={speed}
          options={(['slow', 'normal', 'fast'] as Speed[]).map((v) => ({ value: v, label: t(`game.speed_${v}`) }))}
          onChange={setSpeed}
        />
        <Choice
          label={t('game.bugs.count')}
          value={String(count)}
          options={COUNTS.map((n) => ({ value: String(n), label: String(n) }))}
          onChange={(v) => setCount(Number(v))}
        />
      </GameSetup>
    )

  if (phase === 'over' || !round)
    return (
      <GameOver
        game="bugs"
        win={lives > 0}
        lines={[
          { label: t('game.score'), value: score },
          { label: t('game.bugs.caught'), value: `${caught}/${index + 1}` },
          { label: t('game.best_combo'), value: best },
        ]}
        words={queue.slice(0, index + 1)}
        wrongIds={wrongIds}
        onReplay={() => begin()}
        onSetup={() => setPhase('setup')}
      />
    )

  const p = Math.min(1, round.age / round.travel)
  const a = round.answer
  return (
    <GameFrame
      game="bugs"
      onExit={() => setPhase('setup')}
      stats={
        <>
          <Stat label={t('game.progress')}>
            <Bug size={14} />
            {index + 1}/{queue.length}
          </Stat>
          <Stat label={t('game.score')}>⭐ {score}</Stat>
          {combo > 1 && (
            <Stat className="bg-sand" label={t('game.combo')}>
              <Flame size={14} />x{combo}
            </Stat>
          )}
          <Lives left={Math.max(0, lives)} total={LIVES} />
          <button type="button" onClick={() => setFast(!fast)} className="btn px-2 py-1 text-xs" title={t('game.speed')}>
            <Gauge size={14} />
            {fast ? '1.5×' : '1×'}
          </button>
          <button
            type="button"
            onClick={() => setPaused(!paused)}
            className="btn p-1.5"
            aria-label={paused ? t('game.resume') : t('game.pause')}
            title={paused ? t('game.resume') : t('game.pause')}
          >
            {paused ? <Play size={14} /> : <Pause size={14} />}
          </button>
        </>
      }
    >
      {/* Vườn: đất nâu kẻ luống, rau ở đáy */}
      <div
        className="relative h-[50vh] min-h-72 overflow-hidden rounded-3xl border-2 border-ink select-none"
        style={{ background: 'repeating-linear-gradient(90deg, #c99a6b 0 46px, #b98a5d 46px 50px), #c99a6b' }}
      >
        <div className="absolute inset-x-0 top-0 h-6 bg-[#8fcf7a]/70" />
        <div
          className={clsx(
            'absolute flex -translate-x-1/2 flex-col items-center transition-[opacity,scale] duration-500',
            round.result === 'caught' && 'scale-0 opacity-0',
          )}
          style={{ left: `${round.x + Math.sin(round.age / 260) * 1.5}%`, top: `${2 + p * 70}%` }}
        >
          <span className="max-w-48 rounded-xl border-2 border-ink bg-card px-3 py-1 text-center text-sm font-bold shadow-block-sm">
            {a.meaning_vi}
          </span>
          <span className="text-4xl" style={{ transform: 'rotate(180deg)' }}>
            {round.result === 'caught' ? '💥' : round.sprite}
          </span>
        </div>
        {round.result && (
          <div className="absolute inset-x-0 top-1/3 text-center">
            <span
              className={clsx(
                'rounded-2xl border-2 border-ink px-4 py-2 text-lg font-bold',
                round.result === 'caught' ? 'bg-sage' : 'bg-coral',
              )}
            >
              <span className="font-kai text-2xl">{a.hanzi}</span> · {a.pinyin}
            </span>
          </div>
        )}
        <div className="absolute inset-x-0 bottom-0 flex h-16 items-end justify-around border-t-4 border-dashed border-[#6b4a2e]/40 bg-[#7cb35f] pb-1">
          {Array.from({ length: LIVES }, (_, i) => (
            <span key={i} className={clsx('text-4xl transition-all', i >= lives && 'scale-50 opacity-30 grayscale')}>
              🥬
            </span>
          ))}
        </div>
        {paused && (
          <div className="absolute inset-0 flex items-center justify-center bg-black/40 text-2xl font-extrabold text-white">
            {t('game.paused')}
          </div>
        )}
      </div>

      {/* 4 đáp án */}
      <div className="mt-3 grid grid-cols-2 gap-2 sm:grid-cols-4">
        {round.options.map((w, i) => {
          const bad = round.wrong.includes(w.id)
          const right = round.result && w.id === a.id
          return (
            <button
              key={w.id}
              type="button"
              onClick={() => choose(w)}
              disabled={bad || !!round.result || paused}
              className={clsx(
                'flex items-center gap-2 rounded-2xl border-2 border-ink px-3 py-2 text-left shadow-block-sm transition-transform active:translate-y-0.5',
                bad ? 'bg-coral opacity-60' : right ? 'bg-sage' : 'bg-card hover:bg-paper',
              )}
            >
              <span className="tag shrink-0 px-1.5 text-[11px]">{i + 1}</span>
              <span className="min-w-0">
                <span className="block font-kai text-xl leading-tight font-bold">{w.hanzi}</span>
                <span className="block truncate text-xs text-ink-soft italic">{w.pinyin}</span>
              </span>
            </button>
          )
        })}
      </div>
      <p className="mt-2 text-center text-xs text-ink-muted">{t('game.bugs.tip')}</p>
    </GameFrame>
  )
}
