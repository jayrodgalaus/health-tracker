import type { WeekTrend } from '../../domain/trends'

const parts=[
  {key:'lightMinutes',name:'Light',color:'bg-emerald-200'},
  {key:'moderateMinutes',name:'Moderate',color:'bg-emerald-600'},
  {key:'vigorousMinutes',name:'Vigorous',color:'bg-amber-600'},
  {key:'unclassifiedMinutes',name:'Unclassified',color:'bg-slate-400'}
] as const

export function WeekActivityChart({ weeks }: { weeks:readonly WeekTrend[] }) {
  return <section className="space-y-4 rounded-2xl border border-slate-200 bg-white p-4"
    aria-labelledby="activity-week-heading">
    <div>
      <h3 id="activity-week-heading" className="font-bold">Weekly recorded activity</h3>
    </div>
    <div className="flex flex-wrap gap-x-4 gap-y-2 text-xs">
      {parts.map(part=><span key={part.key} className="flex items-center gap-2">
        <span aria-hidden="true" className={'inline-block h-3 w-3 rounded-sm '+part.color}></span>{part.name}
      </span>)}
    </div>
    {weeks.length===0&&<p className="text-sm text-slate-600">No weeks selected.</p>}
    <ul className="space-y-4">
      {weeks.map(week=><li key={week.start} className="space-y-2">
        <div className="flex flex-wrap justify-between gap-2 text-xs text-slate-700">
          <strong>{week.start} – {week.end}</strong>
          <span>{week.loggedMinutes===null?(week.missingDurationEntries?'Minutes not recorded':'No activity logged'):(week.missingDurationEntries?'At least ':'')+week.loggedMinutes+' min logged'} · {week.strengthDays===null?'Strength days unknown':week.strengthDays+' strength days logged'}</span>
        </div>
        {week.loggedMinutes!==null?
          <div className="flex h-4 overflow-hidden rounded-full bg-slate-100" role="img"
            aria-label={parts.map(part=>part.name+': '+(week[part.key]===null?'unknown':week[part.key]+' known minutes')).join('; ')+(week.missingDurationEntries?'; missing durations for '+week.missingDurationEntries+' sessions':'')}>
            {parts.map(part=><span key={part.key} className={part.color}
              style={{width:((week[part.key]??0)/Math.max(week.loggedMinutes!,1)*100)+'%'}} />)}
          </div>:<div className="h-3 rounded-full border border-dashed border-slate-300" aria-hidden="true" />}
        {week.loggedMinutes===null&&week.missingDurationEntries>0&&<p className="text-xs text-slate-600">{week.missingDurationEntries} session(s) with unknown minutes.</p>}
        {week.loggedMinutes!==null&&<p className="text-xs text-slate-600">
          {parts.map(part=>part.name+' '+(week[part.key]===null?'unknown':week[part.key]+' min')).join(' · ')}{week.missingDurationEntries?' · '+week.missingDurationEntries+' distance-only session(s) without recorded minutes':''}
        </p>}
      </li>)}
    </ul>
  </section>
}
