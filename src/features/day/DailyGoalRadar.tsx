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
    className="overflow-hidden rounded-[1.75rem] border border-evergreen-700 bg-gradient-to-br from-evergreen-900 via-evergreen-700 to-evergreen-600 text-white p-4 shadow-sm sm:p-6">
    <h2 id="today-assessment-heading" className="text-lg font-bold text-white">Daily goal alignment</h2>
    {count === 0
      ? <p className="mt-3 text-sm text-white">No daily goals configured.</p>
      : <>
        <button type="button" aria-expanded={expanded}
          aria-controls={id + '-breakdown'} aria-describedby={id + '-chart-description'}
          aria-label={expanded ? 'Hide daily goal details' : 'Show daily goal details'}
          onClick={() => setExpanded(value => !value)}
          className="mt-2 block w-full rounded-2xl px-1 py-2 text-center transition-colors text-white hover:bg-white/10 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-white">
          <svg aria-hidden="true" viewBox="0 0 320 306" xmlns="http://www.w3.org/2000/svg"
            className="mx-auto w-full max-w-[390px]" fill="none" strokeLinejoin="round">
            {count >= 3
              ? [0.25, 0.5, 0.75, 1].map(fraction =>
                  <polygon key={fraction} points={pointsFor(count,fraction)}
                    stroke="#ffffff" strokeOpacity={fraction === 1 ? 0.75 : 0.33} strokeWidth="1.1"
                    fill={fraction === 1 ? 'rgba(255,255,255,0.06)' : 'none'} />)
              : [0.25, 0.5, 0.75, 1].map(fraction =>
                  <circle key={fraction} cx={CENTER_X} cy={CENTER_Y} r={RADIUS*fraction}
                    stroke="#ffffff" strokeOpacity="0.45" strokeWidth="1" />)}
            {goals.map((goal,index) => {
              const endpoint = radial(index,count,1)
              return <line key={goal.code} x1={CENTER_X} y1={CENTER_Y}
                x2={endpoint.x} y2={endpoint.y} stroke="#ffffff" strokeOpacity="0.35" strokeWidth="1" />
            })}
            {fullPlot && <polygon data-radar-shape="complete"
              points={plotted.map(p => p!.x.toFixed(2)+','+p!.y.toFixed(2)).join(' ')}
              fill="rgba(255,255,255,0.18)" stroke="#ffffff" strokeWidth="2.5" />}
            {!fullPlot && plotted.map((point,index) => {
              const next = plotted[(index+1)%count]
              return point && next && count >= 3
                ? <line key={index} x1={point.x} y1={point.y} x2={next.x} y2={next.y}
                    stroke="#ffffff" strokeWidth="2.5" /> : null
            })}
            {plotted.map((point,index) => point
              ? <circle key={index} data-radar-point={goals[index]?.code}
                  cx={point.x} cy={point.y} r="4.5" fill="#ffffff" stroke="#ffffff" strokeWidth="1.5" />
              : null)}
            {goals.map((goal,index) => {
              const label = radial(index,count,1.41)
              return <g key={goal.code} data-radar-label={goal.code} fill="#ffffff"
                textAnchor="middle" fontFamily="inherit">
                <text x={label.x} y={label.y-2} fontSize="12" fontWeight="650">{goal.label}</text>
                <text x={label.x} y={label.y+13} fontSize="11" fontWeight="500" opacity="0.85">
                  {scoreLabel(goal.score)}
                </text>
              </g>
            })}
          </svg>
          <span className="inline-flex min-h-9 items-center gap-2 text-sm font-semibold text-white">
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
          className="mt-3 rounded-2xl border border-white/25 bg-white/10 px-4 py-2 text-white">
          <GoalChecklistRows summary={summary} onDark />
        </div>
      </>}
  </section>
}
