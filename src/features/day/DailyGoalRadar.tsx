import { useId, useState } from 'react'
import type { DailySummary } from '../../domain/evaluation'
import { alignmentRadar } from '../../domain/alignmentRadar'
import { GoalChecklistRows } from './CalendarGoalChecklist'

const CENTER_X = 160
const CENTER_Y = 150
const RADIUS = 92
type Point = { x: number; y: number }

function radial(index: number, count: number, fraction: number): Point {
  const angle = -Math.PI / 2 + index * Math.PI * 2 / count
  return {
    x: CENTER_X + Math.cos(angle) * RADIUS * fraction,
    y: CENTER_Y + Math.sin(angle) * RADIUS * fraction
  }
}
function pointsFor(count: number, fraction: number) {
  return Array.from({ length: count }, (_, i) => radial(i, count, fraction))
    .map(p => p.x.toFixed(2) + ',' + p.y.toFixed(2)).join(' ')
}
function scoreLabel(score: number | null): string {
  return score === null ? '—' : Number(score.toFixed(1)).toLocaleString('en-US') + '%'
}

/** Tappable chart; the full original checklist remains available on demand. */
export function DailyGoalRadar({ summary }: { summary?: DailySummary }) {
  const [expanded, setExpanded] = useState(false)
  const id = useId()
  if (!summary) return <p role="status" className="rounded-2xl bg-white p-4 text-sm text-slate-600">Loading day evaluation…</p>
  const goals = alignmentRadar(summary)
  const count = goals.length
  const plotted = goals.map((item, index) => item.score === null ? null : radial(index, count, item.score / 100))
  const fullPlot = count >= 3 && goals.every(goal => goal.score !== null)
  const summaryText = goals.map(goal => goal.label + ': ' + (goal.score === null ? 'unavailable' : scoreLabel(goal.score))).join('; ')

  return <section aria-labelledby="today-assessment-heading"
    className="overflow-hidden rounded-[1.75rem] border border-evergreen-100 bg-gradient-to-br from-emerald-50 via-evergreen-100 to-teal-200 p-4 shadow-sm sm:p-6">
    <h2 id="today-assessment-heading" className="text-lg font-bold text-evergreen-900">Daily goal alignment</h2>
    {count === 0
      ? <p className="mt-3 text-sm text-evergreen-900">No daily goals configured.</p>
      : <>
        <button type="button" aria-expanded={expanded}
          aria-controls={id + '-breakdown'} aria-describedby={id + '-chart-description'}
          aria-label={expanded ? 'Hide daily goal details' : 'Show daily goal details'}
          onClick={() => setExpanded(value => !value)}
          className="mt-2 block w-full rounded-2xl px-1 py-2 text-center transition-colors hover:bg-white/30 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-evergreen-700">
          <svg aria-hidden="true" viewBox="0 0 320 306" xmlns="http://www.w3.org/2000/svg"
            className="mx-auto w-full max-w-[390px]" fill="none" strokeLinejoin="round">
            {count >= 3
              ? [0.25, 0.5, 0.75, 1].map(fraction =>
                  <polygon key={fraction} points={pointsFor(count,fraction)}
                    stroke={fraction === 1 ? '#6bb7a0' : '#9ccfbd'} strokeWidth="1.1"
                    fill={fraction === 1 ? 'rgba(255,255,255,0.32)' : 'none'} />)
              : [0.25, 0.5, 0.75, 1].map(fraction =>
                  <circle key={fraction} cx={CENTER_X} cy={CENTER_Y} r={RADIUS*fraction}
                    stroke="#9ccfbd" strokeWidth="1" />)}
            {goals.map((goal,index) => {
              const endpoint = radial(index,count,1)
              return <line key={goal.code} x1={CENTER_X} y1={CENTER_Y}
                x2={endpoint.x} y2={endpoint.y} stroke="#80bca8" strokeWidth="1" />
            })}
            {fullPlot && <polygon data-radar-shape="complete"
              points={plotted.map(p => p!.x.toFixed(2)+','+p!.y.toFixed(2)).join(' ')}
              fill="rgba(15,118,110,0.25)" stroke="#0f766e" strokeWidth="2.5" />}
            {!fullPlot && plotted.map((point,index) => {
              const next = plotted[(index+1)%count]
              return point && next && count >= 3
                ? <line key={index} x1={point.x} y1={point.y} x2={next.x} y2={next.y}
                    stroke="#0f766e" strokeWidth="2.5" /> : null
            })}
            {plotted.map((point,index) => point
              ? <circle key={goals[index].code} data-radar-point={goals[index].code}
                  cx={point.x} cy={point.y} r="4.5" fill="#0f766e" stroke="#fff" strokeWidth="1.5" />
              : null)}
            {goals.map((goal,index) => {
              const label = radial(index,count,1.41)
              return <g key={goal.code} data-radar-label={goal.code} fill="#0b3737"
                textAnchor="middle" fontFamily="inherit">
                <text x={label.x} y={label.y-2} fontSize="12" fontWeight="650">{goal.label}</text>
                <text x={label.x} y={label.y+13} fontSize="11" fontWeight="500" opacity="0.85">
                  {scoreLabel(goal.score)}
                </text>
              </g>
            })}
          </svg>
          <span className="inline-flex min-h-9 items-center gap-2 text-sm font-semibold text-evergreen-700">
            {expanded ? 'Hide details' : 'Show details'}
            <svg aria-hidden="true" width="16" height="16" viewBox="0 0 24 24"
              fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round"
              strokeLinejoin="round" className={expanded ? 'rotate-180' : ''}>
              <path d="m6 9 6 6 6-6" />
            </svg>
          </span>
        </button>
        <p id={id + '-chart-description'} className="sr-only">
          {summary.evaluation.isComplete ? 'Completed day.' : 'Provisional chart for an incomplete day.'}
          {' '}Goal chart values: {summaryText}.
          Unavailable means the metric cannot be assessed from the current logs.
        </p>
        <div id={id + '-breakdown'} hidden={!expanded}
          className="mt-3 rounded-2xl border border-white/70 bg-white/75 px-4 py-2">
          <GoalChecklistRows summary={summary} />
        </div>
      </>}
  </section>
}
