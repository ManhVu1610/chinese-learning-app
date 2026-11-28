import clsx from 'clsx'
import {
  ArrowRight,
  Check,
  Clock,
  Crown,
  Layers3,
  Lightbulb,
  ListChecks,
  RefreshCw,
  Play,
  RotateCw,
  Shuffle,
  Undo2,
  Volume2,
} from 'lucide-react'
import { useEffect, useState, type ReactNode } from 'react'
import { useTranslation } from 'react-i18next'
import Page from '../components/layout/Page'
import { Choice } from '../components/practice/PracticeSetup'
import { useSpeech } from '../hooks/useSpeech'
import { playCorrect, playWrong } from '../lib/sfx'
import type { Word } from '../types'
import { fmtTime, GameFrame, GameOver, GameSetup, Stat, useSetting, useStopwatch, type Phase } from './shared'
import {
  applyMove,
  buildCategories,
  buildStages,
  canDrop,
  dealSolvable,
  isWon,
  loadTopics,
  moveBudget,
  pickUp,
  bestSolution,
  STAGE,
  stageLayout,
  stageCategories,
  type Category,
  type Grouping,
  type Level,
  type Move,
  type SCard,
  type Source,
  type Stage,
  type State,
  type Target,
} from './solitaireEngine'

/**
 * Xếp từ — solitaire theo nhóm. Hai cách chơi:
 *  - Màn chơi: mỗi màn gồm 5 chủ đề trong tài liệu chủ đề từ vựng (public/games/topics.json), thẻ ghi tiếng Trung;
 *  - Tự chọn từ: lấy từ HSK / Sổ tay, chia nhóm theo loại từ, chữ chung hoặc bộ trong Sổ tay.
 * Mỗi thẻ có nút lật để xem pinyin và nghĩa. Luật: solitaireEngine.ts, docs/games/xep-tu.md
 */

/** Kích thước thẻ (px): chữ nhật đứng như lá bài, tỉ lệ cao/rộng 1.4, thu nhỏ trên màn hình hẹp. */
function useCardSize(cols: number) {
  const [vw, setVw] = useState(() => (typeof window === 'undefined' ? 1024 : window.innerWidth))
  useEffect(() => {
    const on = () => setVw(window.innerWidth)
    window.addEventListener('resize', on)
    return () => window.removeEventListener('resize', on)
  }, [])
  const base = vw < 400 ? 66 : vw < 640 ? 74 : 92
  // Bề rộng còn lại trong bàn chơi (trừ lề trang, lề bàn, khoảng cách giữa các cột) chia đều cho số cột.
  const sm = vw >= 640
  const inner = Math.min(vw, 896) - (sm ? 32 : 24) - (sm ? 44 : 28)
  const gap = sm ? 12 : 8
  const w = Math.max(52, Math.min(base, Math.floor((Math.min(inner, 628) - gap * (cols - 1)) / cols)))
  return { w, h: Math.round(w * 1.4) }
}

const PEEK_DOWN = 16
const PROGRESS_KEY = 'game_sol_progress_v2'

const sameSource = (a: Source | null, b: Source) =>
  !!a && a.type === b.type && (a.type === 'waste' || (b.type === 'col' && a.col === b.col && a.index === b.index))

/** Số nước ít nhất đã thắng của từng màn: { "hsk-n": số nước } */
const readProgress = (): Record<string, number> => {
  try {
    return JSON.parse(localStorage.getItem(PROGRESS_KEY) ?? '{}')
  } catch {
    return {}
  }
}

export default function Solitaire() {
  const { t } = useTranslation()
  const { speak, supported } = useSpeech()
  const [phase, setPhase] = useState<Phase>('setup')
  const [mode, setMode] = useSetting<'stages' | 'custom'>('game_sol_mode', 'stages')
  const [level, setLevel] = useSetting<Level>('game_sol_level', 'normal')
  const [savedGrouping, setGrouping] = useSetting<Grouping>('game_sol_group', 'type')
  // Cách chia theo bộ trong Sổ tay đã bỏ khỏi giao diện; lựa chọn cũ đã lưu thì quay về loại từ.
  const grouping: Grouping = savedGrouping === 'set' ? 'type' : savedGrouping
  const [hskTab, setHskTab] = useSetting<number>('game_sol_hsk', 1)
  const [showPinyin, setShowPinyin] = useSetting<boolean>('game_sol_show_pinyin', false)
  const [lang, setLang] = useSetting<'vi' | 'en'>('game_sol_lang', 'vi')
  const [stages, setStages] = useState<Stage[]>([])
  const [stage, setStage] = useState<Stage | null>(null)
  const [progress, setProgress] = useState(readProgress)
  const [pool, setPool] = useState<Word[]>([])
  const [cats, setCats] = useState<Category[]>([])
  const [state, setState] = useState<State | null>(null)
  const [history, setHistory] = useState<State[]>([])
  const [sel, setSel] = useState<Source | null>(null)
  const [flipped, setFlipped] = useState<string[]>([])
  const [hint, setHint] = useState<{ move: Move | null; none?: boolean; short?: number } | null>(null)
  const [hints, setHints] = useState(0)
  const [bad, setBad] = useState<string | null>(null)
  const [error, setError] = useState('')
  const [game, setGame] = useState(0)
  const [budget, setBudget] = useState(999)
  const ms = useStopwatch(phase === 'play', game)
  const { w: W, h: H } = useCardSize(Math.max(state?.cols.length ?? 4, state?.slots.length ?? 4))
  // Phần lộ ra của thẻ ngửa bị đè: đủ thấy nhãn góc trên, không lộ chữ lớn ở giữa.
  const PEEK_UP = Math.max(28, Math.round(H * 0.3))

  useEffect(() => {
    loadTopics().then((ts) => setStages(buildStages(ts)))
  }, [])

  const startWith = (c: Category[], cfg: Level | typeof STAGE) => {
    setCats(c)
    const dealt = dealSolvable(c, cfg)
    setState(dealt.state)
    setBudget(moveBudget(dealt.solution, cfg))
    setHistory([])
    setSel(null)
    setFlipped([])
    setHint(null)
    setHints(0)
    setGame((g) => g + 1)
    setPhase('play')
  }

  const playStage = (s: Stage) => {
    setStage(s)
    startWith(stageCategories(s), stageLayout(s))
  }

  const begin = () => (stage ? playStage(stage) : beginCustom(pool))

  const beginCustom = (words: Word[]) => {
    const c = buildCategories(words, grouping, level)
    if (c.length < 2) {
      setError(t('game.solitaire.not_enough'))
      setPhase('setup')
      return
    }
    setError('')
    startWith(c, level)
  }

  /* ---------- Màn chọn ---------- */
  if ((phase === 'setup' || !state) && mode === 'custom')
    return (
      <GameSetup
        game="solitaire"
        onStart={(w) => {
          setStage(null)
          setPool(w)
          beginCustom(w)
        }}
      >
        <button type="button" onClick={() => setMode('stages')} className="btn w-full py-2 text-sm">
          <ListChecks size={16} />
          {t('game.solitaire.to_stages')}
        </button>
        <Choice
          label={t('game.solitaire.grouping')}
          value={grouping}
          options={(['type', 'char'] as Grouping[]).map((v) => ({ value: v, label: t(`game.solitaire.group_${v}`) }))}
          onChange={setGrouping}
        />
        <Choice
          label={t('game.level')}
          value={level}
          options={(['easy', 'normal', 'hard'] as Level[]).map((v) => ({
            value: v,
            label: t(`game.level_${v}`),
          }))}
          onChange={setLevel}
        />
        {error && <p className="rounded-2xl border-2 border-ink bg-apricot/60 px-3 py-2 text-sm font-semibold">{error}</p>}
      </GameSetup>
    )

  // Màn nên chơi tiếp: màn đầu tiên chưa qua của cấp HSK đang xem.
  const nextKey = stages.find((s) => s.hsk === hskTab && !progress[s.key])?.key

  if (phase === 'setup' || !state)
    return (
      <Page
        feature="games"
        size="default"
        title={t('game.solitaire.name')}
        description={t('game.solitaire.stages_intro')}
        crumbs={[{ label: t('game.solitaire.name') }]}
        actions={
          <button type="button" onClick={() => setMode('custom')} className="btn px-4 py-2 text-sm">
            <Layers3 size={16} />
            {t('game.solitaire.to_custom')}
          </button>
        }
      >
        <div className="flex flex-wrap gap-2">
          {[1, 2, 3, 4, 5, 6].map((l) => {
            const list = stages.filter((s) => s.hsk === l)
            const won = list.filter((s) => progress[s.key]).length
            return (
              <button
                key={l}
                type="button"
                onClick={() => setHskTab(l)}
                className={clsx('btn px-4 py-1.5 text-sm', hskTab === l && 'bg-sand')}
              >
                HSK {l}
                <span className="text-xs font-semibold text-ink-soft tabular-nums">
                  {won}/{list.length}
                </span>
              </button>
            )
          })}
        </div>
        {!stages.length && <p className="mt-6 text-ink-soft">{t('common.loading')}</p>}
        {[
          [1, 15],
          [16, 35],
          [36, 50],
        ].map(([from, to]) => {
          const list = stages.filter((s) => s.hsk === hskTab && s.n >= from && s.n <= to)
          if (!list.length) return null
          return (
            <section key={from} className="mt-6">
              <h2 className="text-sm font-extrabold text-ink-soft">
                {t('game.solitaire.stage_range', { from, to, k: list[0].topics.length })}
              </h2>
              <ul className="mt-2 grid grid-cols-2 gap-2.5 sm:grid-cols-3 lg:grid-cols-5">
                {list.map((s) => {
                  const best = progress[s.key]
                  const isNext = s.key === nextKey
                  return (
                    <li key={s.key}>
                      <button
                        type="button"
                        onClick={() => playStage(s)}
                        title={s.topics.map((tp) => `${tp.zh} · ${tp.vi}`).join(' | ')}
                        className={clsx(
                          'group relative flex h-full w-full flex-col rounded-2xl border-2 border-ink p-3 text-left shadow-block-sm transition-transform hover:-translate-y-0.5',
                          best ? 'bg-sage' : isNext ? 'bg-sand ring-4 ring-amber-200' : 'bg-card',
                        )}
                      >
                        <span className="flex w-full items-center gap-1.5">
                          <span className="font-extrabold">{t('game.solitaire.stage_n', { n: s.n })}</span>
                          {best ? (
                            <span
                              className="ml-auto inline-flex items-center gap-0.5 rounded-full border-2 border-ink bg-card px-1.5 text-[11px] font-extrabold"
                              title={t('game.solitaire.best', { n: best })}
                            >
                              <Check size={12} strokeWidth={3} />
                              {t('game.solitaire.cleared')}
                            </span>
                          ) : isNext ? (
                            <span className="ml-auto inline-flex items-center gap-0.5 rounded-full border-2 border-ink bg-card px-1.5 text-[11px] font-extrabold">
                              <Play size={11} />
                              {t('game.solitaire.play_next')}
                            </span>
                          ) : (
                            <ArrowRight size={14} className="ml-auto text-ink-muted transition-transform group-hover:translate-x-0.5" />
                          )}
                        </span>
                        <span className="text-[11px] text-ink-soft">
                          {t('game.solitaire.stage_meta', { k: s.topics.length, c: stageLayout(s).cols })}
                          {best ? ` · ${t('game.solitaire.best', { n: best })}` : ''}
                        </span>
                        <span className="mt-1.5 line-clamp-2 font-kai text-xs">{s.topics.map((tp) => tp.zh).join(' · ')}</span>
                      </button>
                    </li>
                  )
                })}
              </ul>
            </section>
          )
        })}
      </Page>
    )

  /* ---------- Kết thúc ---------- */
  const allWords = cats.flatMap((c) => c.words)
  const won = isWon(state, cats)
  const nextStage = stage ? stages.find((s) => s.no === stage.no + 1) : undefined
  if (phase === 'over')
    return (
      <GameOver
        game="solitaire"
        win={won}
        loseText={t('game.solitaire.out_of_moves')}
        lines={[
          ...(stage ? [{ label: t('game.solitaire.stage'), value: `HSK ${stage.hsk} · ${stage.n}` }] : []),
          { label: t('game.time'), value: fmtTime(ms) },
          { label: t('game.solitaire.moves'), value: state.moves },
          { label: t('game.hints'), value: hints },
        ]}
        words={allWords}
        actions={
          won && nextStage ? (
            <button type="button" onClick={() => playStage(nextStage)} className="btn btn-accent px-4 py-2 text-sm">
              <ArrowRight size={15} />
              {t('game.solitaire.next_stage', { n: nextStage.n })}
            </button>
          ) : undefined
        }
        onReplay={() => begin()}
        onSetup={() => setPhase('setup')}
      />
    )

  /* ---------- Đang chơi ---------- */
  const finish = (next: State) => {
    if (stage && isWon(next, cats)) {
      const p = { ...readProgress() }
      if (!p[stage.key] || next.moves < p[stage.key]) p[stage.key] = next.moves
      localStorage.setItem(PROGRESS_KEY, JSON.stringify(p))
      setProgress(p)
    }
    setTimeout(() => setPhase('over'), 800)
  }

  const run = (m: Move): boolean => {
    const next = applyMove(state, m, cats)
    if (!next) return false
    const placedToSlot = m.kind === 'move' && m.to.type === 'slot'
    setHistory((h) => [...h.slice(-80), state])
    setState(next)
    setSel(null)
    setHint(null)
    if (placedToSlot) playCorrect()
    if (isWon(next, cats) || next.moves >= budget) finish(next)
    return true
  }

  const fail = (id: string) => {
    playWrong()
    setBad(id)
    setTimeout(() => setBad(null), 400)
    setSel(null)
  }

  /** Bấm vào một nơi đặt (cột / ô đích) khi đang cầm thẻ. */
  const dropOn = (to: Target, id: string) => {
    if (!sel) return false
    const cards = pickUp(state, sel)
    if (!cards) return false
    if (!canDrop(state, cards, to, cats)) {
      fail(id)
      return true
    }
    run({ kind: 'move', from: sel, to })
    return true
  }

  const select = (src: Source) => {
    const cards = pickUp(state, src)
    if (!cards) return
    if (sameSource(sel, src)) return setSel(null)
    setSel(src)
  }

  /**
   * Chạm một thẻ trong cột: nhấc cả chồng thẻ ngửa cùng chủ đề chứa thẻ đó (tính từ thẻ dưới cùng của chồng),
   * vì tách một chồng cùng chủ đề không bao giờ có ích.
   */
  const runStart = (col: number, index: number) => {
    let i = index
    while (i > 0 && pickUp(state, { type: 'col', col, index: i - 1 })) i--
    return i
  }

  /** Bấm đúp: tự đưa lên ô đích nếu được. */
  const autoSlot = (src: Source) => {
    const cards = pickUp(state, src)
    if (!cards) return
    const i = state.slots.findIndex((_, k) => canDrop(state, cards, { type: 'slot', slot: k }, cats))
    if (i >= 0) run({ kind: 'move', from: src, to: { type: 'slot', slot: i } })
  }

  const onColCard = (col: number, index: number) => {
    const card = state.cols[col][index]
    if (sel && !(sel.type === 'col' && sel.col === col)) {
      if (dropOn({ type: 'col', col }, card.id)) return
    }
    if (card.up) select({ type: 'col', col, index: runStart(col, index) })
  }

  const askHint = () => {
    setHints((h) => h + 1)
    // Gợi ý theo lời giải ngắn nhất tìm được; không còn đủ lượt để thắng thì báo luôn.
    const sol = bestSolution(state, cats)
    if (!sol) return setHint({ move: null, none: true })
    if (sol.length > budget - state.moves) return setHint({ move: sol[0], short: sol.length })
    setHint({ move: sol[0] })
  }

  const undo = () => {
    const prev = history[history.length - 1]
    if (!prev) return
    setState(prev)
    setHistory((h) => h.slice(0, -1))
    setSel(null)
    setHint(null)
  }

  const flip = (id: string) => setFlipped((f) => (f.includes(id) ? f.filter((x) => x !== id) : [...f, id]))

  const hintFrom = hint?.move?.kind === 'move' ? hint.move.from : null
  const hintTo = hint?.move?.kind === 'move' ? hint.move.to : null
  const hintDraw = hint?.move?.kind === 'draw'
  const isSel = (src: Source) => sameSource(sel, src) || sameSource(hintFrom, src)
  const inSelRun = (col: number, index: number) =>
    (sel?.type === 'col' && sel.col === col && index >= sel.index) ||
    (hintFrom?.type === 'col' && hintFrom.col === col && index >= hintFrom.index)
  const movesLeft = Math.max(0, budget - state.moves)
  const wasteTop = state.waste[state.waste.length - 1]
  const gridCols = Math.max(state.cols.length, state.slots.length)

  const faceCard = (c: SCard, opts: { selected: boolean; onClick: () => void; onDoubleClick: () => void }) => (
    <FaceCard
      card={c}
      cats={cats}
      flipped={flipped.includes(c.id)}
      showPinyin={showPinyin}
      lang={lang}
      onFlip={() => flip(c.id)}
      selected={opts.selected}
      bad={bad === c.id}
      onClick={opts.onClick}
      onDoubleClick={opts.onDoubleClick}
    />
  )

  return (
    <GameFrame
      game="solitaire"
      onExit={() => setPhase('setup')}
      stats={
        <>
          {stage && <Stat label={t('game.solitaire.stage')}>{t('game.solitaire.stage_n', { n: stage.n })}</Stat>}
          <Stat label={t('game.time')}>
            <Clock size={14} />
            {fmtTime(ms)}
          </Stat>
          <Stat label={t('game.solitaire.groups_done')}>
            <Crown size={14} />
            {state.done.length}/{cats.length}
          </Stat>
        </>
      }
    >
      <div
        className="relative mx-auto max-w-2xl overflow-hidden rounded-[2rem] border-2 border-ink p-3 shadow-block sm:p-5"
        style={{
          background:
            'radial-gradient(rgba(255,255,255,.55) 1.4px, transparent 1.6px) 0 0 / 22px 22px, radial-gradient(circle at 15% 0%, #fff6d9 0, transparent 45%), linear-gradient(165deg, #d6f1ea 0%, #c4e6f2 55%, #e3dcff 100%)',
        }}
      >
        {/* Hàng trên: lượt còn lại · bài lật · chồng bài */}
        <div className="flex items-start gap-2 sm:gap-3">
          <div
            className={clsx(
              'flex shrink-0 flex-col items-center justify-center rounded-2xl border-2 border-ink px-3 shadow-block-sm sm:px-5',
              movesLeft <= 10 ? 'bg-coral' : 'bg-sand',
            )}
            style={{ height: H }}
            title={t('game.solitaire.moves_left')}
          >
            <span className="text-xs font-extrabold text-ink-soft">{t('game.solitaire.moves_short')}</span>
            <span className="text-3xl leading-none font-extrabold tabular-nums">{movesLeft}</span>
          </div>
          <div className="min-w-0 flex-1" />
          {/* Bài lật: xòe tối đa 3 thẻ vừa rút, thẻ mới nhất nằm trái (cầm được), thẻ cũ hơn lộ một dải bên phải */}
          <div className="relative shrink-0" style={{ width: W + 2 * FAN(W), height: H }}>
            {wasteTop ? (
              <>
                {state.waste
                  .slice(-3, -1)
                  .reverse()
                  .map((c, k) => (
                    <FannedCard key={c.id} card={c} cats={cats} left={(k + 1) * FAN(W)} width={W} height={H} strip={FAN(W)} z={2 - k} />
                  ))
                  .reverse()}
                <div className="absolute top-0 left-0 z-10" style={{ width: W, height: H }}>
                  {faceCard(wasteTop, {
                    selected: isSel({ type: 'waste' }),
                    onClick: () => select({ type: 'waste' }),
                    onDoubleClick: () => autoSlot({ type: 'waste' }),
                  })}
                </div>
              </>
            ) : (
              <span className="block h-full rounded-2xl border-2 border-dashed border-ink/25" style={{ width: W }} />
            )}
          </div>
          <button
            type="button"
            onClick={() => run({ kind: 'draw' })}
            disabled={!state.stock.length && !state.waste.length}
            className={clsx('relative shrink-0 rounded-2xl', hintDraw && 'ring-4 ring-amber-300')}
            style={{ width: W, height: H }}
            aria-label={state.stock.length ? t('game.solitaire.draw') : t('game.solitaire.recycle')}
            title={state.stock.length ? t('game.solitaire.draw') : t('game.solitaire.recycle')}
          >
            {state.stock.length ? (
              <CardBack>
                <span className="absolute bottom-1 left-1 rounded-lg bg-ink/70 px-1.5 text-xs font-bold text-white tabular-nums">
                  {state.stock.length}
                </span>
              </CardBack>
            ) : (
              <span className="flex h-full items-center justify-center rounded-2xl border-2 border-dashed border-ink/40 text-ink-soft">
                <RefreshCw size={22} />
              </span>
            )}
          </button>
        </div>

        {/* Ô đích */}
        <div className="mt-4 grid gap-2 sm:gap-3" style={{ gridTemplateColumns: `repeat(${state.slots.length}, minmax(0, 1fr))` }}>
          {state.slots.map((slot, i) => {
            const target = hintTo?.type === 'slot' && hintTo.slot === i
            const id = `slot${i}`
            const cat = slot ? cats[slot.cat] : null
            const flipKey = slot ? `slot-cat-${slot.cat}` : ''
            const slotFlipped = !!slot && flipped.includes(flipKey)
            return (
              <div key={i} className="relative mx-auto" style={{ width: W, height: H }}>
                <button
                  type="button"
                  onClick={() => dropOn({ type: 'slot', slot: i }, id)}
                  className={clsx(
                    'relative h-full w-full overflow-hidden rounded-2xl border-2 text-center transition-colors',
                    slot ? 'border-ink shadow-block-sm' : 'border-dashed border-ink/30 bg-white/40 text-ink-muted',
                    target && 'ring-4 ring-amber-300',
                    bad === id && 'animate-wiggle',
                  )}
                  style={{ background: slot ? CAT_BG : undefined }}
                >
                  {slot && cat ? (
                    <span className="flex h-full flex-col items-center justify-center gap-0.5 px-1 pt-4 pb-5 leading-tight">
                      <span className="flex items-center gap-1 text-xs font-extrabold">
                        <Crown size={12} />
                        {slot.count}/{cat.words.length}
                      </span>
                      {slotFlipped ? (
                        <>
                          {cat.pinyin && <span className="line-clamp-1 text-[10px] font-bold text-ink-soft italic">{cat.pinyin}</span>}
                          <span className="line-clamp-3 text-[11px] font-bold">
                            {(lang === 'en' ? cat.subEn : cat.sub) || cat.sub || cat.title}
                          </span>
                        </>
                      ) : (
                        <>
                          <span className="line-clamp-2 font-kai text-base font-bold break-all sm:text-lg">{cat.title}</span>
                          {showPinyin && cat.pinyin && <span className="line-clamp-1 text-[10px] text-ink-soft italic">{cat.pinyin}</span>}
                          {slot.last?.word && <span className="truncate font-kai text-xs text-ink-soft">{slot.last.word.hanzi}</span>}
                        </>
                      )}
                      <span className="mt-0.5 flex gap-0.5">
                        {cat.words.map((_, k) => (
                          <span key={k} className={clsx('h-1.5 w-1.5 rounded-full', k < slot.count ? 'bg-ink' : 'bg-ink/20')} />
                        ))}
                      </span>
                    </span>
                  ) : (
                    <span className="flex h-full flex-col items-center justify-center gap-1 px-1 text-[11px] leading-tight font-semibold">
                      <Crown size={18} />
                      {t('game.solitaire.slot_empty')}
                    </span>
                  )}
                </button>
                {/* Thẻ chủ đề trên ô đích cũng lật được và có nút đọc */}
                {slot && cat && (
                  <>
                    <button
                      type="button"
                      onClick={() => flip(flipKey)}
                      className={clsx(
                        'absolute top-1 right-1 flex h-5 w-5 items-center justify-center rounded-full border-2 border-ink/60 bg-white/90 text-ink-soft hover:text-ink',
                        slotFlipped && 'bg-sky text-ink',
                      )}
                      aria-label={slotFlipped ? t('game.solitaire.flip_back') : t('game.solitaire.flip')}
                      title={slotFlipped ? t('game.solitaire.flip_back') : t('game.solitaire.flip')}
                    >
                      <RotateCw size={11} />
                    </button>
                    {supported && (
                      <button
                        type="button"
                        onClick={() => speak(cat.title)}
                        className="absolute bottom-1 left-1 flex h-5 w-5 items-center justify-center rounded-full border-2 border-ink/60 bg-white/90 text-ink-soft hover:text-ink"
                        aria-label={t('game.solitaire.speak', { w: cat.title })}
                        title={t('game.solitaire.speak', { w: cat.title })}
                      >
                        <Volume2 size={11} />
                      </button>
                    )}
                  </>
                )}
              </div>
            )
          })}
        </div>

        {/* Các cột */}
        <div className="mt-4 grid gap-2 sm:gap-3" style={{ gridTemplateColumns: `repeat(${gridCols}, minmax(0, 1fr))` }}>
          {state.cols.map((col, ci) => {
            const target = hintTo?.type === 'col' && hintTo.col === ci
            const height = col.reduce((h, c, i) => h + (i === col.length - 1 ? H : c.up ? PEEK_UP : PEEK_DOWN), 0)
            return (
              <div
                key={ci}
                className={clsx('relative mx-auto rounded-2xl', target && 'ring-4 ring-amber-300')}
                style={{ width: W, minHeight: Math.max(H, height) + 8 }}
                onClick={(e) => {
                  if (e.target === e.currentTarget && sel) dropOn({ type: 'col', col: ci }, `col${ci}`)
                }}
              >
                {!col.length && (
                  <button
                    type="button"
                    onClick={() => dropOn({ type: 'col', col: ci }, `col${ci}`)}
                    className={clsx(
                      'block w-full rounded-2xl border-2 border-dashed border-ink/25 bg-white/30',
                      bad === `col${ci}` && 'animate-wiggle',
                    )}
                    style={{ height: H }}
                    aria-label={t('game.solitaire.empty_col')}
                  />
                )}
                {col.map((c, i) => {
                  const top = col.slice(0, i).reduce((h, x) => h + (x.up ? PEEK_UP : PEEK_DOWN), 0)
                  return (
                    <div key={c.id} className="absolute inset-x-0" style={{ top, height: H }}>
                      {c.up ? (
                        faceCard(c, {
                          selected: inSelRun(ci, i),
                          onClick: () => onColCard(ci, i),
                          onDoubleClick: () => autoSlot({ type: 'col', col: ci, index: runStart(ci, i) }),
                        })
                      ) : (
                        <button
                          type="button"
                          className="block h-full w-full rounded-2xl"
                          onClick={() => onColCard(ci, i)}
                          aria-label={t('game.solitaire.face_down')}
                        >
                          <CardBack />
                        </button>
                      )}
                    </div>
                  )
                })}
              </div>
            )
          })}
        </div>
      </div>

      {/* Chỉ báo khi Gợi ý không tìm được đường thắng */}
      {(hint?.none || hint?.short) && (
        <p
          role="status"
          className="mx-auto mt-3 max-w-2xl rounded-2xl border-2 border-brick bg-coral/50 px-4 py-2 text-center text-sm font-semibold"
        >
          {hint?.none ? t('game.solitaire.stuck') : t('game.solitaire.not_enough_moves', { n: hint?.short, left: budget - state.moves })}
        </p>
      )}

      {/* Công cụ */}
      <div className="mt-4 flex flex-wrap justify-center gap-x-2 gap-y-3 sm:gap-x-4">
        <ToolButton icon={<Lightbulb size={22} />} label={t('game.hint')} color="bg-sand" onClick={askHint} />
        <ToolButton icon={<Undo2 size={22} />} label={t('game.undo')} color="bg-sky" onClick={undo} disabled={!history.length} />
        <ToolButton icon={<Shuffle size={22} />} label={t('game.new_game')} color="bg-coral" onClick={() => begin()} />
        {/* Bật/tắt pinyin trên thẻ; đổi ngôn ngữ nghĩa khi lật thẻ */}
        <ToolButton
          icon={<span className="font-kai text-base font-bold">拼音</span>}
          label={showPinyin ? t('game.solitaire.pinyin_on') : t('game.solitaire.pinyin_off')}
          color={showPinyin ? 'bg-lilac' : 'bg-card'}
          onClick={() => setShowPinyin(!showPinyin)}
          pressed={showPinyin}
          title={t('game.solitaire.pinyin_toggle')}
        />
        <ToolButton
          icon={<span className="text-sm font-extrabold">{lang === 'vi' ? 'VI' : 'EN'}</span>}
          label={lang === 'vi' ? t('game.solitaire.meaning_vi') : t('game.solitaire.meaning_en')}
          color="bg-sage"
          onClick={() => setLang(lang === 'vi' ? 'en' : 'vi')}
          title={t('game.solitaire.meaning_lang')}
        />
      </div>
    </GameFrame>
  )
}

/** Phần lộ ra của mỗi thẻ cũ trong bài lật xòe. */
const FAN = (w: number) => Math.round(w * 0.38)

/** Thẻ cũ trong bài lật: chỉ lộ một dải bên phải, chữ viết dọc như ảnh mẫu. */
function FannedCard({
  card,
  cats,
  left,
  width,
  height,
  strip,
  z,
}: {
  card: SCard
  cats: Category[]
  left: number
  width: number
  height: number
  strip: number
  z: number
}) {
  const cat = card.kind === 'cat' ? cats[card.cat] : null
  const text = cat ? cat.title : (card.word?.hanzi ?? '')
  return (
    <div
      className="absolute top-0 rounded-2xl border-2 border-ink/70 shadow-block-sm"
      style={{ left, width, height, zIndex: z, background: cat ? CAT_BG : '#f6efe0' }}
      aria-hidden
    >
      <span
        className="absolute top-2 right-0 bottom-2 flex items-center justify-center overflow-hidden font-kai text-base font-bold text-ink-soft"
        style={{ width: strip, writingMode: 'vertical-rl' }}
      >
        {text}
      </span>
    </div>
  )
}

/** Nền thẻ nhóm / ô đích đã mở. */
const CAT_BG = 'linear-gradient(160deg, #efe6ff 0%, #ffd9e6 100%)'

function ToolButton({
  icon,
  label,
  color,
  onClick,
  disabled,
  pressed,
  title,
}: {
  icon: ReactNode
  label: string
  color: string
  onClick: () => void
  disabled?: boolean
  pressed?: boolean
  title?: string
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled}
      aria-pressed={pressed}
      title={title}
      className="group flex w-16 flex-col items-center gap-1 text-center disabled:opacity-40"
    >
      <span className={clsx('sticker h-12 w-12 transition-transform group-hover:-translate-y-0.5 group-active:translate-y-0.5', color)}>
        {icon}
      </span>
      <span className="text-xs font-bold">{label}</span>
    </button>
  )
}

function CardBack({ children }: { children?: ReactNode }) {
  return (
    <span
      className="relative block h-full w-full rounded-2xl border-2 border-ink shadow-block-sm"
      style={{
        background: 'repeating-linear-gradient(135deg, #9d8cf0 0 7px, #b5a8f6 7px 14px)',
        boxShadow: 'inset 0 0 0 3px #fffaf0, 0 3px 0 0 var(--color-ink)',
      }}
    >
      <span className="absolute inset-0 flex items-center justify-center">
        <span className="flex h-10 w-10 items-center justify-center rounded-full border-2 border-white/80 bg-white/25 font-kai text-xl font-bold text-white">
          字
        </span>
      </span>
      {children}
    </span>
  )
}

function FaceCard({
  card,
  cats,
  flipped,
  showPinyin,
  lang,
  onFlip,
  selected,
  bad,
  onClick,
  onDoubleClick,
}: {
  card: SCard
  cats: Category[]
  flipped: boolean
  showPinyin: boolean
  lang: 'vi' | 'en'
  onFlip: () => void
  selected: boolean
  bad: boolean
  onClick: () => void
  onDoubleClick: () => void
}) {
  const { t } = useTranslation()
  const { speak, supported } = useSpeech()
  const cat = card.kind === 'cat' ? cats[card.cat] : null
  const spoken = cat ? cat.title : (card.word?.hanzi ?? '')
  const w = card.word
  return (
    <div
      className={clsx(
        'relative h-full w-full rounded-2xl border-2 border-ink shadow-block-sm transition-transform',
        selected && '-translate-y-1.5 ring-4 ring-amber-300',
        bad && 'animate-wiggle',
      )}
      style={{ background: bad ? 'var(--color-coral)' : cat ? CAT_BG : flipped ? '#e6f3ff' : '#fffaf0' }}
    >
      <button
        type="button"
        onClick={onClick}
        onDoubleClick={onDoubleClick}
        className="flex h-full w-full flex-col items-center justify-center px-1.5 pt-5 pb-6 text-center leading-tight"
      >
        {/* Góc trên trái: nhãn nhỏ, vẫn đọc được khi thẻ bị thẻ khác đè lên */}
        <span className="absolute top-1 left-1.5 flex max-w-[calc(100%-2.25rem)] items-center gap-0.5 text-[11px] font-extrabold">
          {cat && <Crown size={11} className="shrink-0" />}
          <span className={clsx('truncate', !cat && 'font-kai text-xs text-ink-soft')}>
            {cat ? `0/${cat.words.length} ${cat.title}` : w?.hanzi}
          </span>
        </span>
        {cat ? (
          flipped ? (
            <>
              {cat.pinyin && <span className="max-w-full text-[11px] font-bold text-ink-soft italic sm:text-xs">{cat.pinyin}</span>}
              <span className="mt-1 line-clamp-4 text-[11px] font-bold sm:text-xs">
                {(lang === 'en' ? cat.subEn : cat.sub) || cat.sub || cat.title}
              </span>
            </>
          ) : (
            <>
              <span className="line-clamp-3 font-kai text-base font-bold break-all sm:text-lg">{cat.title}</span>
              {showPinyin && cat.pinyin && (
                <span className="mt-0.5 line-clamp-2 text-[10px] text-ink-soft italic sm:text-[11px]">{cat.pinyin}</span>
              )}
            </>
          )
        ) : flipped && w ? (
          <>
            <span className="max-w-full truncate text-xs font-bold text-ink-soft italic sm:text-sm">{w.pinyin}</span>
            <span className="mt-1 line-clamp-3 text-[11px] sm:text-xs">{(lang === 'en' && w.meaning_en) || w.meaning_vi}</span>
          </>
        ) : (
          <span
            className={clsx(
              'font-kai font-bold break-all',
              [...(w?.hanzi ?? '')].length >= 4
                ? 'text-sm sm:text-base'
                : [...(w?.hanzi ?? '')].length === 3
                  ? 'text-base sm:text-xl'
                  : 'text-xl sm:text-2xl',
            )}
          >
            {w?.hanzi}
          </span>
        )}
        {!cat && !flipped && showPinyin && w && (
          <span className="mt-0.5 max-w-full truncate text-[11px] text-ink-soft italic sm:text-xs">{w.pinyin}</span>
        )}
      </button>
      {/* Nút loa: đọc từ trên thẻ (thẻ chủ đề: đọc tên chủ đề) */}
      {supported && spoken && (
        <button
          type="button"
          onClick={(e) => {
            e.stopPropagation()
            speak(spoken)
          }}
          className="absolute bottom-1 left-1 flex h-5 w-5 items-center justify-center rounded-full border-2 border-ink/60 bg-white/90 text-ink-soft hover:text-ink"
          aria-label={t('game.solitaire.speak', { w: spoken })}
          title={t('game.solitaire.speak', { w: spoken })}
        >
          <Volume2 size={11} />
        </button>
      )}
      {/* Nút lật xem pinyin / nghĩa */}
      <button
        type="button"
        onClick={(e) => {
          e.stopPropagation()
          onFlip()
        }}
        className={clsx(
          'absolute top-1 right-1 flex h-5 w-5 items-center justify-center rounded-full border-2 border-ink/60 bg-white/90 text-ink-soft hover:text-ink',
          flipped && 'bg-sky text-ink',
        )}
        aria-label={flipped ? t('game.solitaire.flip_back') : t('game.solitaire.flip')}
        title={flipped ? t('game.solitaire.flip_back') : t('game.solitaire.flip')}
      >
        <RotateCw size={11} />
      </button>
    </div>
  )
}
