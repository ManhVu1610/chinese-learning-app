import clsx from 'clsx'
import { ArrowRight, Check, Clock, Eraser, Flag, Lightbulb, Search, Volume2 } from 'lucide-react'
import { useEffect, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { Choice } from '../components/practice/PracticeSetup'
import { useSpeech } from '../hooks/useSpeech'
import { playCorrect, playWrong } from '../lib/sfx'
import { fetchStrokes, type StrokeData } from '../lib/strokes'
import type { Word } from '../types'
import { loadFindChar, shapeDistance, SHAPE_OK, type FindCharData } from './findCharData'
import { fmtTime, GameFrame, GameOver, GameSetup, han, shuffle, Stat, useSetting, useStopwatch, type Phase } from './shared'

/**
 * Tìm chữ (字中找字): một chữ lớn hiện mờ trong ô 田, người chơi chọn các nét để ghép thành một chữ ẩn bên trong
 * (vd chọn 3 nét trong 减 thành 口) rồi bấm Kiểm tra. Mỗi chữ cần tìm 3 / 5 / 7 chữ ẩn. Chi tiết: docs/games/tim-chu.md
 */

type Level = 3 | 5 | 7
const ROUNDS = [3, 5, 10] as const

interface Part {
  char: string
  strokes: number[]
  data: StrokeData | null
}
interface Round {
  char: string
  word: Word
  big: StrokeData
  parts: Part[]
  /** các chữ ẩn dùng làm gợi ý (đúng bằng số ô) */
  hints: string[]
}

const key = (a: number[]) => [...a].sort((x, y) => x - y).join(',')

export default function FindChar() {
  const { t } = useTranslation()
  const { speak, supported } = useSpeech()
  const [phase, setPhase] = useState<Phase>('setup')
  const [level, setLevel] = useSetting<Level>('game_fc_level', 3)
  const [rounds, setRounds] = useSetting<number>('game_fc_rounds', 5)
  const [data, setData] = useState<FindCharData | null>(null)
  const [pool, setPool] = useState<Word[]>([])
  const [error, setError] = useState('')
  const [queue, setQueue] = useState<{ char: string; word: Word }[]>([])
  const [index, setIndex] = useState(0)
  const [round, setRound] = useState<Round | null>(null)
  const [sel, setSel] = useState<number[]>([])
  const [found, setFound] = useState<string[]>([])
  const [msg, setMsg] = useState<{ kind: 'ok' | 'extra' | 'dup' | 'bad'; char?: string } | null>(null)
  const [hintStep, setHintStep] = useState<{ char: string; show: boolean } | null>(null)
  const [revealed, setRevealed] = useState(false)
  const [glow, setGlow] = useState<number[]>([])
  const [stats, setStats] = useState({ found: 0, mistakes: 0, hints: 0 })
  const [game, setGame] = useState(0)
  const ms = useStopwatch(phase === 'play', game)

  useEffect(() => {
    loadFindChar().then(setData)
  }, [])

  const openRound = async (q: { char: string; word: Word }[], i: number, d = data!) => {
    const { char, word } = q[i]
    const big = await fetchStrokes(char)
    const list = d.puzzles[char]
    const parts: Part[] = await Promise.all(list.map(async ([c, s]) => ({ char: c, strokes: s, data: await fetchStrokes(c) })))
    if (!big) return
    setRound({ char, word, big, parts, hints: shuffle(list.map(([c]) => c)).slice(0, level) })
    setIndex(i)
    setSel([])
    setFound([])
    setMsg(null)
    setHintStep(null)
    setRevealed(false)
  }

  const begin = async (pool: Word[]) => {
    setPool(pool)
    const d = data ?? (await loadFindChar())
    setData(d)
    // Mỗi chữ của các từ trong nguồn, nếu chữ đó có đủ số chữ ẩn của mức đã chọn.
    const seen = new Set<string>()
    const cands: { char: string; word: Word }[] = []
    for (const w of shuffle(pool))
      for (const c of han(w))
        if (!seen.has(c) && (d.puzzles[c]?.length ?? 0) >= level) {
          seen.add(c)
          cands.push({ char: c, word: w })
        }
    if (!cands.length) {
      setError(t('game.word-search.no_chars', { n: level }))
      return
    }
    setError('')
    const q = cands.slice(0, rounds)
    setQueue(q)
    setStats({ found: 0, mistakes: 0, hints: 0 })
    setGame((g) => g + 1)
    await openRound(q, 0, d)
    setPhase('play')
  }

  if (phase === 'setup' || !round)
    return (
      <GameSetup game="word-search" onStart={(w) => void begin(w)}>
        <Choice
          label={t('game.level')}
          value={String(level)}
          options={([3, 5, 7] as Level[]).map((l) => ({ value: String(l), label: t('game.word-search.level_n', { n: l }) }))}
          onChange={(v) => setLevel(Number(v) as Level)}
        />
        <Choice
          label={t('game.word-search.rounds')}
          value={String(rounds)}
          options={ROUNDS.map((n) => ({ value: String(n), label: String(n) }))}
          onChange={(v) => setRounds(Number(v))}
        />
        {error && <p className="rounded-2xl border-2 border-ink bg-apricot/60 px-3 py-2 text-sm font-semibold">{error}</p>}
      </GameSetup>
    )

  if (phase === 'over')
    return (
      <GameOver
        game="word-search"
        win
        lines={[
          { label: t('game.time'), value: fmtTime(ms) },
          { label: t('game.word-search.found'), value: stats.found },
          { label: t('game.mistakes'), value: stats.mistakes },
          { label: t('game.hints'), value: stats.hints },
        ]}
        words={[...new Map(queue.slice(0, index + 1).map((q) => [q.word.id, q.word])).values()]}
        onReplay={() => void begin(pool)}
        onSetup={() => setPhase('setup')}
      />
    )

  const info = (c: string) => data?.info[c] ?? ['', '', '']
  const done = found.length >= level
  const toggle = (i: number) => {
    if (done || revealed) return
    setMsg(null)
    setSel((s) => (s.includes(i) ? s.filter((x) => x !== i) : [...s, i]))
  }

  const check = () => {
    if (sel.length < 2) return
    const k = key(sel)
    // Khớp đúng nhóm nét đã lưu, hoặc cùng hình với một chữ ẩn có cùng số nét (cách chọn khác vẫn đúng hình).
    const hit =
      round.parts.find((p) => key(p.strokes) === k) ??
      round.parts
        .filter((p) => p.data)
        .map((p) => ({ p, d: shapeDistance(round.big, sel, p.data!) }))
        .filter((x) => x.d < SHAPE_OK)
        .sort((a, b) => a.d - b.d)[0]?.p
    if (!hit) {
      playWrong()
      setStats((s) => ({ ...s, mistakes: s.mistakes + 1 }))
      setMsg({ kind: 'bad' })
      return
    }
    if (found.includes(hit.char)) {
      setMsg({ kind: 'dup', char: hit.char })
      setSel([])
      return
    }
    playCorrect()
    if (supported) setTimeout(() => speak(hit.char), 300)
    setFound((f) => [...f, hit.char])
    setStats((s) => ({ ...s, found: s.found + 1 }))
    setMsg({ kind: round.hints.includes(hit.char) ? 'ok' : 'extra', char: hit.char })
    setGlow(sel)
    setTimeout(() => setGlow([]), 900)
    setSel([])
    if (hintStep?.char === hit.char) setHintStep(null)
  }

  const hint = () => {
    const next = round.hints.find((c) => !found.includes(c)) ?? round.parts.find((p) => !found.includes(p.char))?.char
    if (!next) return
    setStats((s) => ({ ...s, hints: s.hints + 1 }))
    // Lần 1: cho biết pinyin + nghĩa; lần 2 (cùng chữ): tô các nét của nó.
    setHintStep((h) => (h?.char === next ? { char: next, show: true } : { char: next, show: false }))
  }

  const next = () => {
    if (index + 1 >= queue.length) setPhase('over')
    else void openRound(queue, index + 1)
  }

  const partOf = (c: string) => round.parts.find((p) => p.char === c)
  const hinted = hintStep?.show ? (partOf(hintStep.char)?.strokes ?? []) : []
  const revealStrokes = (c: string) => setGlow(partOf(c)?.strokes ?? [])

  return (
    <GameFrame
      game="word-search"
      onExit={() => setPhase('setup')}
      stats={
        <>
          <Stat label={t('game.progress')}>
            {index + 1}/{queue.length}
          </Stat>
          <Stat label={t('game.time')}>
            <Clock size={14} />
            {fmtTime(ms)}
          </Stat>
          <Stat label={t('game.word-search.found')}>
            <Search size={14} />
            {Math.min(found.length, level)}/{level}
          </Stat>
        </>
      }
    >
      <div className="mx-auto max-w-md">
        <p className="text-center text-sm text-ink-soft">
          {t('game.word-search.find_in', { n: level })}{' '}
          <span className="font-bold text-ink">
            {round.word.hanzi} · {round.word.pinyin} · {round.word.meaning_vi}
          </span>
        </p>

        {/* Chữ lớn trong ô 田 */}
        <div className="box mt-3 p-3">
          <svg viewBox="0 0 1024 1024" className="w-full touch-manipulation select-none" role="group" aria-label={round.char}>
            <rect x="8" y="8" width="1008" height="1008" fill="none" stroke="var(--color-line)" strokeWidth="6" />
            <line x1="512" y1="8" x2="512" y2="1016" stroke="var(--color-line)" strokeWidth="4" strokeDasharray="18 14" />
            <line x1="8" y1="512" x2="1016" y2="512" stroke="var(--color-line)" strokeWidth="4" strokeDasharray="18 14" />
            <g transform="translate(0 900) scale(1 -1)">
              {round.big.strokes.map((d, i) => (
                <path
                  key={i}
                  d={d}
                  className="transition-colors"
                  fill={
                    sel.includes(i)
                      ? 'var(--color-brick)'
                      : glow.includes(i)
                        ? '#3f9a6b'
                        : hinted.includes(i)
                          ? '#e7b24a'
                          : 'rgba(87,69,89,.2)'
                  }
                />
              ))}
              {/* vùng bấm rộng theo đường giữa nét */}
              {round.big.medians.map((m, i) => (
                <polyline
                  key={`h${i}`}
                  points={m.map((p) => p.join(',')).join(' ')}
                  fill="none"
                  stroke="transparent"
                  strokeWidth={70}
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  className="cursor-pointer"
                  onClick={() => toggle(i)}
                />
              ))}
            </g>
          </svg>
        </div>

        {/* Thông báo */}
        {msg && (
          <p
            role="status"
            className={clsx(
              'mt-3 rounded-2xl border-2 px-3 py-2 text-center text-sm font-semibold',
              msg.kind === 'bad' ? 'border-brick bg-coral/60' : 'border-ink bg-sage/60',
            )}
          >
            {msg.kind === 'bad' && t('game.word-search.msg_bad')}
            {msg.kind === 'dup' && t('game.word-search.msg_dup', { c: msg.char })}
            {msg.kind === 'ok' && t('game.word-search.msg_ok', { c: msg.char, p: info(msg.char!)[0] })}
            {msg.kind === 'extra' && t('game.word-search.msg_extra', { c: msg.char, p: info(msg.char!)[0] })}
          </p>
        )}
        {hintStep && !msg && (
          <p className="mt-3 rounded-2xl border-2 border-ink bg-sand/60 px-3 py-2 text-center text-sm">
            {t('game.word-search.hint_text', { p: info(hintStep.char)[0], m: info(hintStep.char)[2] })}
          </p>
        )}

        {/* Các ô chữ ẩn */}
        <div className="mt-3 flex flex-wrap justify-center gap-2">
          {Array.from({ length: level }, (_, i) => {
            const c = found[i]
            return (
              <button
                key={i}
                type="button"
                disabled={!c}
                onClick={() => c && (supported && speak(c), revealStrokes(c))}
                className={clsx(
                  'flex h-20 w-16 flex-col items-center justify-center rounded-2xl border-2 leading-tight',
                  c ? 'border-ink bg-card' : 'border-dashed border-line bg-paper text-2xl text-ink-muted',
                )}
              >
                {c ? (
                  <>
                    <span className="font-kai text-2xl font-bold text-[#3f9a6b]">{c}</span>
                    <span className="text-[11px] text-ink-soft italic">{info(c)[0]}</span>
                    <span className="max-w-full truncate px-1 text-[10px] font-bold uppercase">{info(c)[1]}</span>
                  </>
                ) : (
                  '?'
                )}
              </button>
            )
          })}
        </div>

        {/* Nút */}
        {done || revealed ? (
          <div className="mt-4 space-y-3">
            <div className="box p-3 text-sm">
              <p className="font-bold">{t('game.word-search.all_parts', { c: round.char, n: round.parts.length })}</p>
              <div className="mt-2 flex flex-wrap gap-1.5">
                {round.parts.map((p) => (
                  <button
                    key={p.char}
                    type="button"
                    onMouseEnter={() => revealStrokes(p.char)}
                    onFocus={() => revealStrokes(p.char)}
                    onClick={() => (revealStrokes(p.char), supported && speak(p.char))}
                    className={clsx('tag gap-1', found.includes(p.char) ? 'bg-sage' : 'bg-paper')}
                    title={`${info(p.char)[0]} · ${info(p.char)[1]} · ${info(p.char)[2]}`}
                  >
                    <span className="font-kai text-base">{p.char}</span>
                    <span className="font-normal text-ink-soft">{info(p.char)[0]}</span>
                  </button>
                ))}
              </div>
            </div>
            <button type="button" onClick={next} className="btn btn-accent w-full py-3">
              {index + 1 >= queue.length ? <Check size={18} /> : <ArrowRight size={18} />}
              {index + 1 >= queue.length ? t('game.word-search.finish') : t('game.word-search.next_char')}
            </button>
          </div>
        ) : (
          <>
            <div className="mt-4 flex gap-2">
              <button type="button" onClick={check} disabled={sel.length < 2} className="btn btn-accent flex-1 py-3">
                <Check size={18} />
                {t('practice.check')}
              </button>
              <button type="button" onClick={() => setSel([])} disabled={!sel.length} className="btn px-4">
                <Eraser size={16} />
                {t('game.word-search.clear')}
              </button>
            </div>
            <div className="mt-3 flex justify-center gap-4 text-sm font-semibold text-ink-soft">
              <button type="button" onClick={hint} className="inline-flex items-center gap-1 hover:text-ink">
                <Lightbulb size={15} />
                {t('game.hint')}
              </button>
              <button type="button" onClick={() => setRevealed(true)} className="inline-flex items-center gap-1 hover:text-ink">
                <Flag size={15} />
                {t('game.word-search.give_up')}
              </button>
              {supported && (
                <button type="button" onClick={() => speak(round.char)} className="inline-flex items-center gap-1 hover:text-ink">
                  <Volume2 size={15} />
                  {round.char}
                </button>
              )}
            </div>
          </>
        )}
      </div>
    </GameFrame>
  )
}
