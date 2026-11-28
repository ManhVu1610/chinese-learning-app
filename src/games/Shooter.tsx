import clsx from 'clsx'
import { Flag, Flame, Gauge, Keyboard, Pause, Play } from 'lucide-react'
import { useEffect, useRef, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { Choice } from '../components/practice/PracticeSetup'
import { hasMeaning } from '../components/practice/checks'
import { useSpeech } from '../hooks/useSpeech'
import { convertPinyinInput, stripTones } from '../lib/pinyinInput'
import { playCorrect, playWrong } from '../lib/sfx'
import type { Word } from '../types'
import { GameFrame, GameOver, GameSetup, Lives, shuffle, Stat, useSetting, type Phase } from './shared'

/**
 * Bắn từ — chủ đề "Hội đèn lồng": đèn lồng mang NGHĨA tiếng Việt bay lên trời đêm, kèm chữ cái đầu của pinyin
 * và các ô trống. Nhớ ra từ rồi gõ đủ pinyin để bắn tên trúng đèn trước khi nó bay mất. Chi tiết: docs/games/ban-tu.md
 */

type Speed = 'slow' | 'normal' | 'fast'
/** Thời gian (ms) một đèn bay hết màn và khoảng cách giữa hai đèn (ms) ở mốc đầu tiên. */
const SPEED: Record<Speed, { travel: number; gap: number }> = {
  slow: { travel: 19000, gap: 4200 },
  normal: { travel: 15000, gap: 3400 },
  fast: { travel: 11000, gap: 2600 },
}
const LIVES = 4
const MAX_ON_SKY = 5
/** Mỗi mốc gồm bấy nhiêu từ; qua mốc thì đèn bay nhanh hơn 8%. */
const PER_MILESTONE = 8
const WORDS = [16, 24, 40] as const

interface Lantern {
  id: number
  word: Word
  key: string
  x: number
  /** thời gian đã bay (ms) — cộng dồn theo khung hình để tạm dừng được */
  age: number
  travel: number
  end?: { at: number; how: 'hit' | 'escaped' }
}

/** Pinyin dạng so sánh: bỏ thanh, số thanh, khoảng trắng, dấu nháy. "wǎnfàn" = "wan3fan4" = "wanfan". */
export const pinyinKey = (s: string) => stripTones(convertPinyinInput(s)).replace(/[^a-z]/g, '')

export default function Shooter() {
  const { t } = useTranslation()
  const { speak, supported } = useSpeech()
  const [phase, setPhase] = useState<Phase>('setup')
  const [speed, setSpeed] = useSetting<Speed>('game_shoot_speed', 'normal')
  const [total, setTotal] = useSetting<number>('game_shoot_words', 24)
  const [pool, setPool] = useState<Word[]>([])
  const [input, setInput] = useState('')
  const [shake, setShake] = useState(false)
  const [paused, setPaused] = useState(false)
  const [fast, setFast] = useState(false)
  const [arrow, setArrow] = useState<{ x: number; y: number; id: number } | null>(null)
  const [, setFrame] = useState(0)
  const inputRef = useRef<HTMLInputElement>(null)
  const sceneRef = useRef<HTMLDivElement>(null)
  const g = useRef({
    queue: [] as Word[],
    lanterns: [] as Lantern[],
    next: 0,
    untilNext: 0,
    lives: LIVES,
    score: 0,
    hits: 0,
    combo: 0,
    best: 0,
    wrong: new Set<string>(),
    seen: [] as Word[],
    seq: 0,
    clock: 0,
  })
  const s = g.current
  const cfg = SPEED[speed]
  const milestone = Math.floor(s.next / PER_MILESTONE)
  const milestones = Math.ceil(s.queue.length / PER_MILESTONE)

  const begin = (words = pool) => {
    g.current = {
      queue: shuffle(words).slice(0, total),
      lanterns: [],
      next: 0,
      untilNext: 500,
      lives: LIVES,
      score: 0,
      hits: 0,
      combo: 0,
      best: 0,
      wrong: new Set(),
      seen: [],
      seq: 0,
      clock: 0,
    }
    setInput('')
    setPaused(false)
    setPhase('play')
    setTimeout(() => inputRef.current?.focus(), 50)
  }

  // Vòng lặp khung hình: thả đèn, cho đèn bay, đèn bay khỏi màn thì mất mạng.
  useEffect(() => {
    if (phase !== 'play' || paused) return
    let id = 0
    let last = performance.now()
    const tick = (now: number) => {
      const st = g.current
      const dt = Math.min(64, now - last) * (fast ? 1.5 : 1)
      last = now
      st.clock += dt
      const ms = Math.floor(st.next / PER_MILESTONE)
      const factor = Math.pow(0.92, ms) // mỗi mốc nhanh hơn
      st.untilNext -= dt
      const flying = st.lanterns.filter((l) => !l.end)
      if (st.next < st.queue.length && st.untilNext <= 0 && flying.length < MAX_ON_SKY) {
        const word = st.queue[st.next++]
        const lastX = st.lanterns.at(-1)?.x ?? -100
        let x = 10 + Math.random() * 80
        if (Math.abs(x - lastX) < 20) x = ((x + 40) % 80) + 10
        st.lanterns.push({ id: ++st.seq, word, key: pinyinKey(word.pinyin), x, age: 0, travel: cfg.travel * factor })
        st.seen.push(word)
        st.untilNext = cfg.gap * factor
      }
      for (const l of flying) {
        l.age += dt
        if (l.age >= l.travel) {
          l.end = { at: st.clock, how: 'escaped' }
          st.lives--
          st.combo = 0
          st.wrong.add(l.word.id)
          playWrong()
        }
      }
      st.lanterns = st.lanterns.filter((l) => !l.end || st.clock - l.end.at < 800)
      setFrame(now)
      if (st.lives <= 0 || (st.next >= st.queue.length && !st.lanterns.some((l) => !l.end))) {
        setTimeout(() => setPhase('over'), 600)
        return
      }
      id = requestAnimationFrame(tick)
    }
    id = requestAnimationFrame(tick)
    return () => cancelAnimationFrame(id)
  }, [phase, paused, fast, cfg])

  const shootAt = (l: Lantern) => {
    const st = g.current
    l.end = { at: st.clock, how: 'hit' }
    st.hits++
    st.combo++
    st.best = Math.max(st.best, st.combo)
    st.score += 10 + Math.min(st.combo - 1, 5) * 2
    playCorrect()
    if (supported) setTimeout(() => speak(l.word.hanzi), 250)
    const box = sceneRef.current
    if (box) setArrow({ x: (l.x / 100) * box.clientWidth, y: (1 - l.age / l.travel) * box.clientHeight * 0.9, id: performance.now() })
  }

  /** Gõ đủ pinyin của một đèn là bắn ngay; nhiều đèn khớp thì bắn đèn bay cao nhất (sắp mất). */
  const onChange = (v: string) => {
    const k = pinyinKey(v)
    const hit = g.current.lanterns.filter((l) => !l.end && l.key === k).sort((a, b) => b.age / b.travel - a.age / a.travel)[0]
    if (k && hit) {
      shootAt(hit)
      setInput('')
      return
    }
    setInput(v)
  }
  const onEnter = () => {
    if (!input.trim()) return
    g.current.combo = 0
    playWrong()
    setShake(true)
    setTimeout(() => setShake(false), 400)
    setInput('')
  }

  if (phase === 'setup')
    return (
      <GameSetup
        game="shooter"
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
          label={t('game.shooter.count')}
          value={String(total)}
          options={WORDS.map((n) => ({ value: String(n), label: String(n) }))}
          onChange={(v) => setTotal(Number(v))}
        />
      </GameSetup>
    )

  if (phase === 'over')
    return (
      <GameOver
        game="shooter"
        win={s.lives > 0}
        lines={[
          { label: t('game.score'), value: s.score },
          { label: t('game.shooter.hits'), value: `${s.hits}/${s.seen.length}` },
          { label: t('game.best_combo'), value: s.best },
        ]}
        words={s.seen}
        wrongIds={[...s.wrong]}
        onReplay={() => begin()}
        onSetup={() => setPhase('setup')}
      />
    )

  const typed = pinyinKey(input)
  return (
    <GameFrame
      game="shooter"
      onExit={() => setPhase('setup')}
      stats={
        <>
          <Stat label={t('game.shooter.milestone')}>
            <Flag size={14} />
            {Math.min(milestone + 1, milestones)}/{milestones}
          </Stat>
          <Stat label={t('game.score')}>⭐ {s.score}</Stat>
          {s.combo > 1 && (
            <Stat className="bg-sand" label={t('game.combo')}>
              <Flame size={14} />x{s.combo}
            </Stat>
          )}
          <Lives left={Math.max(0, s.lives)} total={LIVES} />
          <button type="button" onClick={() => setFast(!fast)} className="btn px-2 py-1 text-xs" title={t('game.speed')}>
            <Gauge size={14} />
            {fast ? '1.5×' : '1×'}
          </button>
          <button
            type="button"
            onClick={() => {
              setPaused(!paused)
              if (paused) setTimeout(() => inputRef.current?.focus(), 30)
            }}
            className="btn p-1.5"
            aria-label={paused ? t('game.resume') : t('game.pause')}
            title={paused ? t('game.resume') : t('game.pause')}
          >
            {paused ? <Play size={14} /> : <Pause size={14} />}
          </button>
        </>
      }
    >
      {/* Trời đêm hội */}
      <div
        ref={sceneRef}
        className="relative h-[58vh] min-h-80 overflow-hidden rounded-3xl border-2 border-ink select-none"
        style={{ background: 'linear-gradient(#2d2452 0%, #4b3a6e 55%, #8a5a7a 100%)' }}
        onClick={() => inputRef.current?.focus()}
      >
        {STARS.map(([x, y, sz], i) => (
          <span key={i} className="absolute rounded-full bg-white/70" style={{ left: `${x}%`, top: `${y}%`, width: sz, height: sz }} />
        ))}
        <div
          className="absolute inset-x-0 bottom-0 h-14"
          style={{
            background: 'linear-gradient(transparent, rgba(30,20,50,.65))',
            clipPath: 'polygon(0 60%,12% 30%,24% 60%,40% 25%,56% 60%,72% 35%,88% 60%,100% 30%,100% 100%,0 100%)',
          }}
        />
        {s.lanterns.map((l) => {
          const p = Math.min(1, l.age / l.travel)
          const top = 88 - p * 105
          // Phần pinyin người chơi đã gõ khớp với đèn này thì hiện ra.
          const shown = typed && l.key.startsWith(typed) ? typed.length : 1
          return (
            <div
              key={l.id}
              className={clsx(
                'absolute flex -translate-x-1/2 flex-col items-center transition-[opacity,scale] duration-500',
                l.end?.how === 'hit' && 'scale-150 opacity-0',
                l.end?.how === 'escaped' && 'opacity-0',
              )}
              style={{ left: `${l.x}%`, top: `${top}%`, rotate: `${Math.sin((s.clock + l.id * 900) / 500) * 3}deg` }}
            >
              <span className="h-2.5 w-0.5 bg-amber-200/80" />
              <span className="h-2 w-12 rounded-t-md border-2 border-amber-900/50 bg-amber-300" />
              <span
                className="flex max-w-40 min-w-28 flex-col items-center rounded-[40%] border-2 border-amber-900/50 px-4 py-2 text-center text-amber-50"
                style={{
                  background: 'radial-gradient(circle at 50% 40%, #ff8a7a, #d6403f 60%, #a3262e)',
                  boxShadow: '0 0 22px 6px rgba(255,170,90,.45)',
                }}
              >
                <span className="line-clamp-2 text-sm leading-tight font-bold">{l.word.meaning_vi}</span>
                <span className="mt-1 font-mono text-base font-bold tracking-[0.15em] text-amber-200">
                  {l.key.slice(0, shown)}
                  <span className="text-amber-100/60">{'_'.repeat(Math.max(0, l.key.length - shown))}</span>
                </span>
              </span>
              <span className="h-2 w-12 rounded-b-md border-2 border-amber-900/50 bg-amber-300" />
              <span className="h-3 w-1 rounded-b-full bg-amber-300" />
              {l.end?.how === 'hit' && <span className="absolute top-6 font-kai text-3xl font-bold text-white">{l.word.hanzi}</span>}
            </div>
          )
        })}
        {arrow && <Arrow key={arrow.id} to={arrow} scene={sceneRef.current} />}
        <div className="pointer-events-none absolute bottom-1 left-1/2 -translate-x-1/2 text-4xl">🏹</div>
        {paused && (
          <div className="absolute inset-0 flex items-center justify-center bg-black/40 text-2xl font-extrabold text-white">
            {t('game.paused')}
          </div>
        )}
      </div>

      <form
        className={clsx('mt-3 flex gap-2', shake && 'animate-wiggle')}
        onSubmit={(e) => {
          e.preventDefault()
          onEnter()
        }}
      >
        <label className="relative flex-1">
          <Keyboard size={16} className="absolute top-1/2 left-3 -translate-y-1/2 text-ink-muted" />
          <input
            ref={inputRef}
            value={input}
            disabled={paused}
            onChange={(e) => onChange(e.target.value)}
            autoComplete="off"
            autoCapitalize="off"
            spellCheck={false}
            placeholder={t('game.shooter.ph')}
            className="field pl-9 text-lg"
          />
        </label>
      </form>
      <p className="mt-2 text-center text-xs text-ink-muted">{t('game.shooter.tip')}</p>
    </GameFrame>
  )
}

const STARS: [number, number, number][] = Array.from({ length: 28 }, (_, i) => [(i * 37) % 100, (i * 53) % 70, 1 + (i % 3)])

/** Mũi tên bay từ cây cung ở giữa đáy tới đèn vừa bắn trong 150 ms. */
function Arrow({ to, scene }: { to: { x: number; y: number }; scene: HTMLDivElement | null }) {
  const [go, setGo] = useState(false)
  useEffect(() => {
    const id = requestAnimationFrame(() => setGo(true))
    return () => cancelAnimationFrame(id)
  }, [])
  if (!scene) return null
  const fromX = scene.clientWidth / 2
  const fromY = scene.clientHeight - 30
  const angle = (Math.atan2(to.y - fromY, to.x - fromX) * 180) / Math.PI + 90
  return (
    <span
      className={clsx(
        'pointer-events-none absolute h-8 w-1 rounded-full bg-amber-100 transition-all duration-150 ease-out',
        go && 'opacity-0',
      )}
      style={{ left: go ? to.x : fromX, top: go ? to.y : fromY, transform: `translate(-50%,-50%) rotate(${angle}deg)` }}
    />
  )
}
