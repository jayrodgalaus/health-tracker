import { Link } from 'react-router-dom'
import type { Profile } from '../../domain/models'
import {
  summarizeTrendMetric, TREND_METRICS, type TrendDay, type TrendMetric
} from '../../domain/trends'
import { fluidTo, kilogramsTo } from '../../domain/units'

interface Props { days: readonly TrendDay[]; metric: TrendMetric; profile: Profile }

export function TrendChart({ days, metric, profile }: Props) {
  const meta = TREND_METRICS.find(item=>item.key===metric)!
  const unit = metric==='weightKg' ? profile.units.mass :
    metric==='fluidMl' ? profile.units.fluid : meta.unit
  function convert(value:number):number {
    if(metric==='weightKg')return kilogramsTo(value,profile.units.mass)
    if(metric==='fluidMl')return fluidTo(value,profile.units.fluid)
    return value
  }
  const records = days.map(day=>({
    day:day.day, partial:day[metric].partial,
    value:day[metric].value===null?null:convert(day[metric].value!)
  }))
  const present=records.filter((record):record is typeof record & {value:number}=>record.value!==null)
  const maximum = Math.max(1,...present.map(p=>Math.abs(p.value)))
  const minWeight = present.length ? Math.min(...present.map(p=>p.value)) : 0
  const maxWeight = present.length ? Math.max(...present.map(p=>p.value)) : 1
  const width=Math.max(360,days.length*44)
  const chartBaseline = metric==='differenceKcal'?86:148
  const weightY=(number:number)=>126-(number-minWeight)/Math.max(0.000001,maxWeight-minWeight)*96
  const xAt=(i:number)=>i*44+25
  const format=(v:number)=>Number(v.toFixed(1)).toLocaleString()
  const summary=summarizeTrendMetric(days,metric)
  const interval=days.length>60?7:days.length>14?3:1
  const label=meta.label+' from '+(days[0]?.day??'')+' to '+(days.at(-1)?.day??'')
  const weightPoints=records.flatMap((r,i)=>r.value===null?[]:[xAt(i)+11+','+weightY(r.value)])
  return <section className="space-y-3 rounded-2xl border border-slate-200 bg-white p-4"
    aria-label={meta.label+' trend'}>
    <div>
      <h3 className="font-bold">{meta.label}</h3>
      <p className="mt-1 text-xs leading-5 text-slate-600">
        {summary.knownDays} of {days.length} dates have known values; {summary.partialDays} partial and {summary.missingDays} missing.
        {metric==='expenditureKcal'||metric==='differenceKcal' ? ' Estimates, not measurements.' : ''}
      </p>
    </div>
    {present.length===0?<p className="rounded-xl bg-slate-50 p-4 text-sm text-slate-600">
      No assessable {meta.label.toLowerCase()} values in this range. Blank does not mean zero.
    </p>:<>
      <div className="overflow-x-auto rounded-xl border border-slate-100 bg-slate-50 p-2" tabIndex={0}
        aria-label={'Scrollable '+meta.label+' chart'}>
        <svg viewBox={'0 0 '+width+' 184'} width={width} height={184} role="img"
          aria-label={label+'. Missing dates are not drawn as zero.'} className="block max-w-none">
          <title>{label}. Actual records only. Partial totals have dashed borders.</title>
          {metric==='differenceKcal' ?
            <line x1={0} x2={width} y1={chartBaseline} y2={chartBaseline} stroke="#64748b" strokeWidth={1} /> :
            <line x1={0} x2={width} y1={148} y2={148} stroke="#94a3b8" strokeWidth={1} />}
          {metric==='weightKg'&&weightPoints.length>1&&
            <polyline points={weightPoints.join(' ')} fill="none" stroke="#047857" strokeWidth={2.5} />}
          {records.map((item,i)=>{
            const x=xAt(i)
            const showTick=i%interval===0||i===records.length-1
            return <g key={item.day}>
              {item.value===null?<text x={x+11} y={metric==='differenceKcal'?100:146}
                fill="#94a3b8" fontSize="11" textAnchor="middle">·</text>:
                metric==='weightKg'?
                  <circle cx={x+11} cy={weightY(item.value)} r={4.5}
                    fill="#047857" stroke="#fff" strokeWidth={1.5}>
                    <title>{item.day}: actual recorded {format(item.value)} {unit}</title>
                  </circle>:
                  <rect x={x} y={item.value<0&&metric==='differenceKcal'?
                    chartBaseline:chartBaseline-Math.max(2,Math.abs(item.value)/maximum*(metric==='differenceKcal'?59:107))}
                    width={22} height={Math.max(2,Math.abs(item.value)/maximum*(metric==='differenceKcal'?59:107))}
                    rx={3} fill={item.partial?'#f59e0b':'#0f766e'}
                    stroke={item.partial?'#92400e':'none'} strokeDasharray={item.partial?'3 2':undefined}>
                    <title>{item.day}: {item.partial?'at least ':''}{format(item.value)} {unit}</title>
                  </rect>}
              {showTick&&<text x={x+11} y={172} fontSize="10" fill="#475569" textAnchor="middle">{item.day.slice(5)}</text>}
            </g>
          })}
        </svg>
      </div>
      <p className="text-xs leading-5 text-slate-600">
        Known {unit} values range from {format(convert(summary.minimum!))} to {format(convert(summary.maximum!))}.
      </p>
    </>}
    <details className="text-sm">
      <summary className="min-h-11 cursor-pointer py-2 font-semibold">Dated values and accessible links</summary>
      <ul className="max-h-56 space-y-1 overflow-y-auto text-sm">
        {records.map(item=><li key={item.day} className="flex items-center justify-between gap-3 border-t border-slate-100 py-2">
          <Link to={'/calendar/'+item.day} className="font-medium text-evergreen-700 underline">{item.day}</Link>
          <span>{item.value===null?'Not recorded / not assessable':(item.partial?'At least ':'')+format(item.value)+' '+unit}</span>
        </li>)}
      </ul>
    </details>
  </section>
}
