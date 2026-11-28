import clsx from 'clsx'
import { Clock, Layers, Link2, Timer } from 'lucide-react'
import { useEffect, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { Choice } from '../components/practice/PracticeSetup'
import { hasMeaning } from '../components/practice/checks'
import { useSpeech } from '../hooks/useSpeech'
import { playCorrect, playWrong } from '../lib/sfx'
import type { Word } from '../types'
import { fmtTime, GameFrame, GameOver, GameSetup, shuffle, Stat, useSetting, useStopwatch, type Phase } from './shared'

/**
 * Nối thẻ — chủ đề "Ao sen": các lá sen nổi trên mặt ao, nửa mang chữ Hán, nửa mang nghĩa (hoặc pinyin).
 * Chạm hai lá thuộc cùng một từ để chúng nở thành hoa sen. Có chế độ úp lá để luyện trí nhớ.
 * Chi tiết: docs/games/noi-the.md
 */

type Pair = 'meaning' | 'pinyin'
type Mode = 'open' | 'memory'
const PAIRS = [6, 8, 10] as const
type Pace = 'relaxed' | 'normal' | 'rush'
/** Số giây cho mỗi cặp: thời gian một ao = số cặp × giây mỗi cặp. */
const SEC_PER_PAIR: Record<Pace, number> = { relaxed: 10, normal: 7, rush: 4.5 }
const BOARDS = [1, 3, 5] as const

interface Card {
  id: string
  word: Word
  side: 'han' | 'other'
  text: string
  state: 'idle' | 'done'
}

const otherText = (w: Word, pair: Pair) => (pair === 'meaning' ? w.meaning_vi : w.pinyin)

/** Lấy n từ không trùng chữ, không trùng nghĩa/pinyin trên cùng một bàn (tránh hai đáp án). */
function pickWords(pool: Word[], n: number, pair: Pair, used: Set<string>) {
  const out: Word[] = []
  const seenHan = new Set<string>()
  const seenOther = new Set<string>()
  const fresh = shuffle(pool.filter((w) => !used.has(w.id)))
  for (const w of [...fresh, ...shuffle(pool)]) {
    if (out.length === n) break
    const o = otherText(w, pair).trim().toLowerCase()
    if (!o || seenHan.has(w.hanzi) || seenOther.has(o)) continue
    seenHan.add(w.hanzi)
    seenOther.add(o)
    out.push(w)
  }
  return out
}

function makeBoard(words: Word[], pair: Pair): Card[] {
  return shuffle(
    words.flatMap((w) => [
      { id: `${w.id}-h`, word: w, side: 'han' as const, text: w.hanzi, state: 'idle' as const },
      { id: `${w.id}-o`, word: w, side: 'other' as const, text: otherText(w, pair), state: 'idle' as const },
    ]),
  )
}

export default function Match() {
  const { t } = useTranslation()
  const { speak, supported } = useSpeech()
  const [phase, setPhase] = useState<Phase>('setup')
  const [pair, setPair] = useSetting<Pair>('game_match_pair', 'meaning')
  const [mode, setMode] = useSetting<Mode>('game_match_mode', 'open')
  const [pairs, setPairs] = useSetting<number>('game_match_pairs', 6)
  const [boards, setBoards] = useSetting<number>('game_match_boards', 1)
  const [pace, setPace] = useSetting<Pace>('game_match_pace', 'normal')
  /** thời điểm hết giờ của ao hiện tại, và tổng thời gian của ao */
  const [deadline, setDeadline] = useState({ at: 0, total: 1 })
  const [now, setNow] = useState(0)
  const [timeUp, setTimeUp] = useState(false)
  const [pool, setPool] = useState<Word[]>([])
  const [board, setBoard] = useState(0)
  const [cards, setCards] = useState<Card[]>([])
  const [picked, setPicked] = useState<string[]>([])
  const [bad, setBad] = useState<string[]>([])
  const [mistakes, setMistakes] = useState(0)
  const [wrongIds, setWrongIds] = useState<string[]>([])
  const [seen, setSeen] = useState<Word[]>([])
  const [game, setGame] = useState(0)
  const [busy, setBusy] = useState(false)
  const ms = useStopwatch(phase === 'play', game)

  // Đồng hồ đếm ngược của ao: hết giờ là thua.
  useEffect(() => {
    if (phase !== 'play') return
    const id = setInterval(() => {
      const n = performance.now()
      setNow(n)
      if (n >= deadline.at) {
        playWrong()
        setTimeUp(true)
        setPhase('over')
      }
    }, 100)
    return () => clearInterval(id)
  }, [phase, deadline])

  const deal = (src: Word[], n: number, used: Set<string>) => {
    const ws = pickWords(src, Math.min(pairs, src.length), pair, used)
    setCards(makeBoard(ws, pair))
    setSeen((s) => [...s, ...ws])
    setPicked([])
    setBoard(n)
    const total = ws.length * SEC_PER_PAIR[pace] * 1000
    setDeadline({ at: performance.now() + total, total })
  }

  const begin = (src = pool) => {
    setSeen([])
    setMistakes(0)
    setWrongIds([])
    setTimeUp(false)
    setGame((g) => g + 1)
    deal(src, 1, new Set())
    setPhase('play')
  }

  if (phase === 'setup')
    return (
      <GameSetup
        game="match"
        filter={hasMeaning}
        onStart={(w) => {
          setPool(w)
          begin(w)
        }}
      >
        <Choice
          label={t('game.match.pair')}
          value={pair}
          options={(['meaning', 'pinyin'] as Pair[]).map((v) => ({ value: v, label: t(`game.match.pair_${v}`) }))}
          onChange={setPair}
        />
        <Choice
          label={t('game.match.mode')}
          value={mode}
          options={(['open', 'memory'] as Mode[]).map((v) => ({ value: v, label: t(`game.match.mode_${v}`) }))}
          onChange={setMode}
        />
        <Choice
          label={t('game.match.pairs')}
          value={String(pairs)}
          options={PAIRS.map((n) => ({ value: String(n), label: String(n) }))}
          onChange={(v) => setPairs(Number(v))}
        />
        <Choice
          label={t('game.match.boards')}
          value={String(boards)}
          options={BOARDS.map((n) => ({ value: String(n), label: String(n) }))}
          onChange={(v) => setBoards(Number(v))}
        />
        <Choice
          label={t('game.match.pace')}
          value={pace}
          options={(['relaxed', 'normal', 'rush'] as Pace[]).map((v) => ({
            value: v,
            label: t(`game.match.pace_${v}`, { s: SEC_PER_PAIR[v] }),
          }))}
          onChange={setPace}
        />
      </GameSetup>
    )

  if (phase === 'over')
    return (
      <GameOver
        game="match"
        win={!timeUp}
        loseText={t('game.match.time_up')}
        lines={[
          { label: t('game.time'), value: fmtTime(ms) },
          { label: t('game.match.matched'), value: seen.length },
          { label: t('game.mistakes'), value: mistakes },
        ]}
        words={seen}
        wrongIds={wrongIds}
        onReplay={() => begin()}
        onSetup={() => setPhase('setup')}
      />
    )

  const tap = (c: Card) => {
    if (busy || c.state === 'done' || picked.includes(c.id)) return
    if (c.side === 'han' && supported) speak(c.word.hanzi)
    if (!picked.length) return setPicked([c.id])
    const first = cards.find((x) => x.id === picked[0])!
    // Chạm lại cùng loại thẻ (vd hai thẻ chữ Hán) ở chế độ mở: đổi lựa chọn.
    if (mode === 'open' && first.side === c.side) return setPicked([c.id])
    if (first.word.id === c.word.id && first.side !== c.side) {
      playCorrect()
      setPicked([first.id, c.id])
      setBusy(true)
      setTimeout(() => {
        const next = cards.map((x) => (x.word.id === c.word.id ? { ...x, state: 'done' as const } : x))
        setCards(next)
        setPicked([])
        setBusy(false)
        if (next.every((x) => x.state === 'done')) {
          setTimeout(() => {
            if (board >= boards) setPhase('over')
            else deal(pool, board + 1, new Set(seen.map((w) => w.id)))
          }, 600)
        }
      }, 450)
    } else {
      playWrong()
      setMistakes((m) => m + 1)
      setWrongIds((w) => [...new Set([...w, first.word.id, c.word.id])])
      setPicked([first.id, c.id])
      setBad([first.id, c.id])
      setBusy(true)
      setTimeout(
        () => {
          setPicked([])
          setBad([])
          setBusy(false)
        },
        mode === 'memory' ? 900 : 500,
      )
    }
  }

  const left = Math.max(0, Math.min(1, (deadline.at - now) / deadline.total))
  const cols = cards.length <= 12 ? 'grid-cols-3 sm:grid-cols-4' : 'grid-cols-4 sm:grid-cols-5'
  return (
    <GameFrame
      game="match"
      onExit={() => setPhase('setup')}
      stats={
        <>
          <Stat label={t('game.time')}>
            <Clock size={14} />
            {fmtTime(ms)}
          </Stat>
          <Stat label={t('game.match.board')}>
            <Layers size={14} />
            {board}/{boards}
          </Stat>
          <Stat label={t('game.match.matched')}>
            <Link2 size={14} />
            {cards.filter((c) => c.state === 'done').length / 2}/{cards.length / 2}
          </Stat>
        </>
      }
    >
      {/* Thời gian còn lại của ao */}
      <div className="mb-3 flex items-center gap-2">
        <Timer size={18} className={clsx(left < 0.25 && 'text-brick')} />
        <div className="h-3 flex-1 overflow-hidden rounded-full border-2 border-ink bg-card">
          <div
            className={clsx('h-full rounded-full transition-[width] duration-100', left < 0.25 ? 'bg-brick' : 'bg-[#5aa0b8]')}
            style={{ width: `${left * 100}%` }}
          />
        </div>
        <span className="w-10 text-right text-sm font-bold tabular-nums">{Math.ceil(Math.max(0, deadline.at - now) / 1000)}s</span>
      </div>
      {/* Mặt ao */}
      <div
        className="rounded-3xl border-2 border-ink p-3 sm:p-5"
        style={{
          background:
            'radial-gradient(circle at 20% 30%, rgba(255,255,255,.35) 0 6%, transparent 7%), radial-gradient(circle at 80% 70%, rgba(255,255,255,.25) 0 8%, transparent 9%), linear-gradient(160deg, #9ad7d9, #6fb7c6 60%, #5aa0b8)',
        }}
      >
        <div className={clsx('grid gap-2.5 sm:gap-4', cols)}>
          {cards.map((c, i) => {
            const open = mode === 'open' || picked.includes(c.id) || c.state === 'done'
            const sel = picked.includes(c.id)
            const isBad = bad.includes(c.id)
            return (
              <button
                key={c.id}
                type="button"
                onClick={() => tap(c)}
                disabled={c.state === 'done'}
                aria-label={open ? c.text : t('game.match.hidden')}
                className={clsx(
                  'relative flex aspect-[5/4] items-center justify-center p-2 text-center transition-all duration-300',
                  c.state === 'done' && 'pointer-events-none scale-75 opacity-0',
                  isBad && 'animate-wiggle',
                  sel && !isBad && '-translate-y-1',
                )}
                style={{ transitionDelay: c.state === 'done' ? '250ms' : undefined }}
              >
                {/* lá sen: hình tròn có khe hình nêm */}
                <span
                  className={clsx(
                    'absolute top-1/2 left-1/2 aspect-square h-[108%] -translate-x-1/2 -translate-y-1/2 rounded-full border-2 border-ink',
                    isBad ? 'bg-coral' : sel ? 'bg-sand' : open ? (c.side === 'han' ? 'bg-[#bfe8a6]' : 'bg-[#d8f2c2]') : 'bg-[#7cc47a]',
                  )}
                  style={{
                    clipPath: 'polygon(50% 50%, 58% 0, 100% 0, 100% 100%, 0 100%, 0 0, 42% 0)',
                    rotate: `${(i * 47) % 360}deg`,
                    boxShadow: '0 4px 0 0 rgba(40,70,60,.35)',
                  }}
                />
                <span className="relative">
                  {c.state === 'done' ? (
                    <span className="text-3xl">🪷</span>
                  ) : open ? (
                    <span
                      className={clsx(
                        'line-clamp-3 leading-tight font-bold break-words',
                        c.side === 'han' ? 'font-kai text-2xl sm:text-3xl' : 'text-xs sm:text-sm',
                      )}
                    >
                      {c.text}
                      {c.side === 'han' && pair === 'meaning' && (
                        <span className="block font-sans text-[11px] font-semibold text-ink-soft italic">{c.word.pinyin}</span>
                      )}
                    </span>
                  ) : (
                    <span className="text-2xl opacity-60">🐸</span>
                  )}
                </span>
              </button>
            )
          })}
        </div>
      </div>
      <p className="mt-3 text-center text-xs text-ink-muted">
        {t('game.mistakes')}: {mistakes}
      </p>
    </GameFrame>
  )
}
