import { useState } from 'react'
import type { DailySummary, EvaluationStatus } from '../../domain/evaluation'
import { setDayComplete } from '../../data/dayRepository'
import { toLocalDay } from '../../lib/localDate'
import { useToast } from '../../components/ToastProvider'

export const DAY_STATUS: Record<EvaluationStatus, { label: string; short: string; className: string; symbol: string }> = {
  onTarget: { label: 'On target', short: 'On', className: 'bg-emerald-50 text-emerald-900 border-emerald-200', symbol: '●' },
  mixed: { label: 'Mixed / needs attention', short: 'Mixed', className: 'bg-amber-50 text-amber-950 border-amber-200', symbol: '◆' },
  offTarget: { label: 'Off target', short: 'Off', className: 'bg-rose-50 text-rose-900 border-rose-200', symbol: '▲' },
  incomplete: { label: 'Incomplete / no evaluation', short: '—', className: 'bg-slate-100 text-slate-700 border-slate-300', symbol: '○' }
}

export function DayAssessment({ summary, fullRules = false }: { summary?: DailySummary; fullRules?: boolean }) {
  const toast = useToast()
  const [pending, setPending] = useState(false)
  const [error, setError] = useState('')
  if (!summary) return <p role="status" className="rounded-2xl bg-white p-4 text-sm text-slate-600">Loading day evaluation…</p>
  const evalResult = summary.evaluation
  const style = DAY_STATUS[evalResult.status]
  const canMark = summary.dayKey <= toLocalDay(new Date())
  async function toggle() {
    setPending(true)
    setError('')
    try {
      await setDayComplete(summary!.dayKey, !evalResult.isComplete)
      toast.success(!evalResult.isComplete ? 'Day marked complete.' : 'Day reopened.')
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : 'Unable to update day completion.')
    } finally {
      setPending(false)
    }
  }

  return (
    <section aria-labelledby="day-assessment-heading" className="space-y-4 rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h2 id="day-assessment-heading" className="text-lg font-bold">Daily goal alignment</h2>
        </div>
        <span className={'inline-flex items-center gap-2 rounded-xl border px-3 py-2 text-sm font-semibold ' + style.className}>
          <span aria-hidden="true">{style.symbol}</span>{style.label}
        </span>
      </div>
      <p className="text-sm leading-6 text-slate-700">
        {evalResult.isComplete ? 'Day marked complete.' : 'Day not marked complete.'}
        {' '}Coverage: {evalResult.assessedRuleCount}/{evalResult.expectedRuleCount} configured daily target rules assessable.
        {evalResult.isComplete && !evalResult.isAssessable ? ' The day remains neutral because the available evidence does not support an overall status.' : ''}
      </p>
      {evalResult.keyObservations.length > 0 && <ul className="list-disc space-y-2 pl-5 text-sm leading-6 text-slate-700">
        {evalResult.keyObservations.map((item, index) => <li key={index}>{item}</li>)}
      </ul>}
      <div className="flex flex-wrap items-center gap-3">
        {canMark ? <button type="button" disabled={pending} onClick={() => { void toggle() }}
          className="min-h-11 rounded-xl bg-evergreen-600 px-4 py-2 text-sm font-semibold text-white disabled:opacity-50">
          {pending ? 'Saving…' : evalResult.isComplete ? 'Reopen day' : 'Mark day complete'}
        </button> : <p className="text-sm text-slate-600">Future dates cannot be marked complete.</p>}
      </div>
      {error && <p role="alert" className="rounded-xl bg-rose-50 p-3 text-sm text-rose-900">{error}</p>}
      <details open={fullRules} className="rounded-xl border border-slate-200 p-3">
        <summary className="cursor-pointer font-semibold text-sm">Review each rule and its source</summary>
        {evalResult.results.length === 0 ? <p className="mt-3 text-sm text-slate-600">No supported daily target was configured for this date. Add optional targets in Settings. Activity is assessed weekly, not as a daily pass/fail condition.</p> :
          <ol className="mt-3 space-y-3">
            {evalResult.results.map(result => <li key={result.code} className="rounded-xl bg-slate-50 p-3 text-sm">
              <div className="flex flex-wrap items-center justify-between gap-2">
                <strong>{result.label}</strong>
                <span className="text-xs font-semibold">{result.state === 'pass' ? 'Aligned' : result.state === 'attention' ? 'Attention' : result.state === 'significantDeviation' ? 'Large deviation' : 'Not evaluated'}</span>
              </div>
              <p className="mt-1 text-slate-600">{result.explanation}</p>
              <p className="mt-1 text-xs text-slate-500">Recorded: {result.actual === null ? 'unknown' : result.actual + ' ' + result.unit} · Target: {result.target === null ? 'not configured' : result.target + ' ' + result.unit}</p>
            </li>)}
          </ol>}
      </details>
    </section>
  )
}
