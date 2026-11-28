import clsx from 'clsx'
import { ChevronRight, Clock, FileText, Headphones, History, Play, Trash2, VolumeX } from 'lucide-react'
import { useEffect, useMemo, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { Link, Navigate, Route, Routes, useNavigate, useParams } from 'react-router-dom'
import Page from '../components/layout/Page'
import { Choice } from '../components/practice/PracticeSetup'
import SettingsSection from '../components/ui/SettingsSection'
import ExamResult from '../exam/ExamResult'
import ExamRunner, { fmtClock, SECTION_ZH, sectionSeconds } from '../exam/ExamRunner'
import { sectionsOf, withSummary } from '../exam/scoring'
import { addRecord, clearSession, loadHistory, loadIndex, loadPaper, loadSession, removeRecord, saveSession } from '../exam/storage'
import type { ExamMeta, ExamMode, ExamPaper, ExamRecord, ExamScope, ExamSession } from '../exam/types'

/** /test: danh sách đề · /test/:id: chọn cách làm · /test/:id/run: làm bài · /test/result/:rid: kết quả. */
export default function Test() {
  return (
    <Routes>
      <Route index element={<PaperList />} />
      <Route path="result/:rid" element={<ResultScreen />} />
      <Route path=":id" element={<Setup />} />
      <Route path=":id/run" element={<Run />} />
      <Route path="*" element={<Navigate to="/test" replace />} />
    </Routes>
  )
}

function useIndex() {
  const [list, setList] = useState<ExamMeta[] | null>(null)
  const [error, setError] = useState(false)
  useEffect(() => {
    loadIndex().then(setList, () => setError(true))
  }, [])
  return { list, error }
}

function usePaper(file: string | undefined) {
  const [paper, setPaper] = useState<ExamPaper | null>(null)
  const [error, setError] = useState(false)
  useEffect(() => {
    if (!file) return
    loadPaper(file).then(setPaper, () => setError(true))
  }, [file])
  return { paper, error }
}

const paperName = (m: Pick<ExamMeta, 'level' | 'code'>) => `HSK ${m.level} · ${m.code}`
const passMark = (level: number) => (level <= 2 ? 120 : 180)
const LEVEL_KEY = 'hsk_exam_level'

function Loading({ error }: { error?: boolean }) {
  const { t } = useTranslation()
  return (
    <Page feature="test" size="narrow">
      <p className="box p-6 text-center text-ink-soft">{error ? t('exam.load_error') : t('common.loading')}</p>
    </Page>
  )
}

// ---------------- Danh sách đề ----------------

function PaperList() {
  const { t, i18n } = useTranslation()
  const nav = useNavigate()
  const { list, error } = useIndex()
  const [history, setHistory] = useState(loadHistory)
  const [session, setSession] = useState(loadSession)
  const [level, setLevel] = useState(() => Number(localStorage.getItem(LEVEL_KEY)) || 4)
  const pickLevel = (lv: number) => {
    localStorage.setItem(LEVEL_KEY, String(lv))
    setLevel(lv)
  }

  const best = useMemo(() => {
    const m = new Map<string, number>()
    for (const r of history) {
      if (r.scope !== 'all' || r.bestTotal === undefined) continue
      m.set(r.paperId, Math.max(m.get(r.paperId) ?? 0, r.bestTotal))
    }
    return m
  }, [history])

  if (!list) return <Loading error={error} />
  const levels = [...new Set(list.map((m) => m.level))].sort()
  const items = list.filter((m) => m.level === level)
  const sessionMeta = session && list.find((m) => m.id === session.paperId)

  return (
    <Page feature="test" size="wide" description={t('exam.intro')}>
      {session && sessionMeta && (
        <div className="box mb-6 flex flex-wrap items-center gap-3 bg-sand/60 p-4">
          <Clock size={20} />
          <p className="min-w-0 flex-1 font-semibold">
            {t('exam.in_progress', { name: paperName(sessionMeta) })}
            <span className="block text-sm font-normal text-ink-soft">
              {t(`exam.mode.${session.mode}`)} · {t(`exam.scope.${session.scope}`)}
            </span>
          </p>
          <button type="button" onClick={() => nav(`/test/${session.paperId}/run`)} className="btn btn-accent px-4 py-2 text-sm">
            <Play size={15} />
            {t('exam.continue')}
          </button>
          <button
            type="button"
            onClick={() => {
              clearSession()
              setSession(null)
            }}
            className="btn px-4 py-2 text-sm"
          >
            {t('exam.discard')}
          </button>
        </div>
      )}

      <div className="mb-4 flex flex-wrap gap-2" role="tablist">
        {levels.map((lv) => (
          <button
            key={lv}
            type="button"
            role="tab"
            aria-selected={lv === level}
            onClick={() => pickLevel(lv)}
            className={clsx('btn px-4 py-1.5 text-sm', lv === level && 'bg-sand')}
          >
            HSK {lv}
            <span className="text-xs font-semibold text-ink-soft">{list.filter((m) => m.level === lv).length}</span>
          </button>
        ))}
      </div>
      <p className="mb-3 text-sm text-ink-soft">{t('exam.level_hint', { level, count: items.length, pass: passMark(level), max: level <= 2 ? 200 : 300 })}</p>
      <ul className="mb-8 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {items.map((m) => {
          const b = best.get(m.id)
          return (
            <li key={m.id}>
              <Link to={`/test/${m.id}`} className="group box flex h-full items-start gap-3 p-4 transition-transform hover:-translate-y-0.5">
                <span className="sticker shrink-0 bg-sky p-2.5">
                  <FileText size={22} />
                </span>
                <span className="min-w-0 flex-1">
                  <span className="block text-xs font-bold text-ink-soft">HSK {m.level}</span>
                  <span className="block text-lg font-extrabold group-hover:text-brick">{m.code}</span>
                  <span className="mt-1 block text-sm text-ink-soft">
                    {m.counts.writing
                      ? t('exam.counts', { l: m.counts.listening, r: m.counts.reading, w: m.counts.writing })
                      : t('exam.counts2', { l: m.counts.listening, r: m.counts.reading })}
                  </span>
                  <span className="mt-2 flex flex-wrap gap-1.5">
                    <span className={clsx('tag', !m.audio && 'bg-coral')}>
                      {m.audio ? <Headphones size={11} /> : <VolumeX size={11} />}
                      {m.audio ? t('exam.audio_file') : t('exam.audio_none')}
                    </span>
                    {b !== undefined && <span className={clsx('tag', b >= passMark(m.level) ? 'bg-sage' : 'bg-coral')}>{t('exam.best', { score: b })}</span>}
                  </span>
                </span>
                <ChevronRight size={18} className="mt-1 shrink-0 text-ink-muted" />
              </Link>
            </li>
          )
        })}
      </ul>

      {history.length > 0 && (
        <section>
          <h2 className="flex items-center gap-2 text-lg font-extrabold">
            <History size={18} />
            {t('exam.history')}
          </h2>
          <ul className="box mt-3 divide-y-2 divide-line">
            {history.slice(0, 15).map((r) => {
              const m = list.find((x) => x.id === r.paperId)
              return (
                <li key={r.id} className="flex flex-wrap items-center gap-3 px-4 py-2.5">
                  <Link to={`/test/result/${r.id}`} className="min-w-0 flex-1 hover:text-brick">
                    <span className="font-bold">{m ? paperName(m) : r.paperId}</span>
                    <span className="block text-xs text-ink-soft">
                      {new Date(r.date).toLocaleString(i18n.language)} · {t(`exam.mode.${r.mode}`)} · {t(`exam.scope.${r.scope}`)}
                    </span>
                  </Link>
                  <span className="font-extrabold tabular-nums">{r.summary}</span>
                  <button
                    type="button"
                    onClick={() => {
                      removeRecord(r.id)
                      setHistory(loadHistory())
                    }}
                    className="btn h-8 w-8 p-0 text-brick hover:bg-coral"
                    title={t('exam.delete_record')}
                    aria-label={t('exam.delete_record')}
                  >
                    <Trash2 size={14} />
                  </button>
                </li>
              )
            })}
          </ul>
        </section>
      )}
    </Page>
  )
}

// ---------------- Chọn cách làm ----------------

const MODE_KEY = 'hsk_exam_mode'

function Setup() {
  const { t } = useTranslation()
  const nav = useNavigate()
  const { id } = useParams()
  const { list, error } = useIndex()
  const meta = list?.find((m) => m.id === id)
  const { paper, error: paperError } = usePaper(meta?.file)
  const [mode, setMode] = useState<ExamMode>(() => (localStorage.getItem(MODE_KEY) === 'practice' ? 'practice' : 'strict'))
  const [scope, setScope] = useState<ExamScope>('all')

  if (list && !meta) return <Navigate to="/test" replace />
  if (!meta || !paper) return <Loading error={error || paperError} />

  const secs = sectionsOf(scope, paper)
  const minutes = secs.reduce((s, k) => s + sectionSeconds(paper, k) / 60, 0)

  const start = () => {
    localStorage.setItem(MODE_KEY, mode)
    const first = paper.questions.find((q) => q.section === secs[0])!.n
    const session: ExamSession = {
      paperId: meta.id,
      file: meta.file,
      mode,
      scope,
      answers: {},
      flags: [],
      sectionIdx: 0,
      current: first,
      clock: mode === 'strict' ? sectionSeconds(paper, secs[0]) : 0,
      started: mode === 'practice',
      startedAt: Date.now(),
    }
    saveSession(session)
    nav(`/test/${meta.id}/run`)
  }

  return (
    <Page
      feature="test"
      size="narrow"
      title={paperName(meta)}
      description={t('exam.setup_desc', { level: meta.level })}
      crumbs={[{ label: paperName(meta) }]}
    >
      <div className="space-y-3">
        <SettingsSection title={t('exam.choose_mode')} summary={t(`exam.mode.${mode}`)} storageKey="exam_mode">
          <Choice
            label=""
            value={mode}
            onChange={setMode}
            options={(['strict', 'practice'] as ExamMode[]).map((m) => ({ value: m, label: t(`exam.mode.${m}`) }))}
          />
          <p className="mt-2 text-sm text-ink-soft">{t(`exam.mode_desc.${mode}`)}</p>
        </SettingsSection>
        <SettingsSection title={t('exam.choose_scope')} summary={t(`exam.scope.${scope}`)} storageKey="exam_scope">
          <Choice
            label=""
            value={scope}
            onChange={setScope}
            options={(['all', 'listening', 'reading', 'writing'] as ExamScope[])
              .filter((s) => s === 'all' || paper.counts[s] > 0)
              .map((s) => ({ value: s, label: t(`exam.scope.${s}`) }))}
          />
        </SettingsSection>
        <ul className="grid gap-2 sm:grid-cols-3">
          {secs.map((k) => (
            <li key={k} className="rounded-2xl border-2 border-ink bg-paper p-3">
              <p className="font-extrabold">
                <span lang="zh-CN">{SECTION_ZH[k]}</span> · {t(`exam.section.${k}`)}
              </p>
              <p className="text-sm text-ink-soft">
                {t('exam.section_info', { count: paper.counts[k], minutes: sectionSeconds(paper, k) / 60 })}
              </p>
            </li>
          ))}
        </ul>
        <p className="text-sm text-ink-soft">
          {mode === 'strict' ? t('exam.total_time', { minutes }) : t('exam.no_limit')}
          {!paper.audio && secs.includes('listening') && <> · {t('exam.no_audio')}</>}
        </p>
        {secs.includes('writing') && <p className="text-sm text-ink-soft">{t('exam.ime_note')}</p>}
        <button type="button" onClick={start} className="btn btn-accent px-6">
          <Play size={17} />
          {t('exam.start')}
        </button>
      </div>
    </Page>
  )
}

// ---------------- Làm bài ----------------

function Run() {
  const nav = useNavigate()
  const { id } = useParams()
  const [session] = useState(loadSession)
  const { paper, error } = usePaper(session && session.paperId === id ? session.file : undefined)

  if (!session || session.paperId !== id) return <Navigate to={`/test/${id}`} replace />
  if (!paper) return <Loading error={error} />

  const submit = (s: ExamSession) => {
    const rec: ExamRecord = {
      id: `${s.paperId}-${Date.now()}`,
      paperId: s.paperId,
      file: s.file,
      mode: s.mode,
      scope: s.scope,
      date: Date.now(),
      duration:
        s.mode === 'practice'
          ? s.clock
          : Math.round((Date.now() - s.startedAt) / 1000),
      answers: s.answers,
      overrides: {},
    }
    addRecord(withSummary(paper, rec))
    clearSession()
    nav(`/test/result/${rec.id}`, { replace: true })
  }

  return <ExamRunner paper={paper} initial={session} onSubmit={submit} onExit={() => nav('/test')} />
}

// ---------------- Kết quả ----------------

function ResultScreen() {
  const { t } = useTranslation()
  const nav = useNavigate()
  const { rid } = useParams()
  const record = useMemo(() => loadHistory().find((r) => r.id === rid), [rid])
  const { paper, error } = usePaper(record?.file)
  if (!record) return <Navigate to="/test" replace />
  if (!paper) return <Loading error={error} />
  return (
    <Page
      feature="test"
      size="default"
      title={paperName(paper)}
      description={`${t('exam.result')} · ${t(`exam.scope.${record.scope}`)} · ${fmtClock(record.duration)}`}
      crumbs={[{ label: paperName(paper), to: `/test/${paper.id}` }, { label: t('exam.result') }]}
    >
      <ExamResult paper={paper} record={record} onRetry={() => nav(`/test/${paper.id}`)} />
    </Page>
  )
}
