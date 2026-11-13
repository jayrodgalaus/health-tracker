import { PageTitle } from '../components/PageTitle'
import { useMemo, useState } from 'react'
import { useLiveQuery } from 'dexie-react-hooks'
import type { Profile } from '../domain/models'
import { addLocalDays } from '../domain/calendar'
import { buildTrends, trendDays, type TrendMetric } from '../domain/trends'
import { readTrendSources } from '../data/trendsRepository'
import { readNutrientComparisonLimits } from '../data/settingsRepository'
import { buildTrendExcelReport } from '../domain/trendExcelReport'
import { createXlsxWorkbook, XLSX_MIME } from '../lib/xlsx'
import { toLocalDay } from '../lib/localDate'
import { TrendChart } from '../features/trends/TrendChart'
import { WeekActivityChart } from '../features/trends/WeekActivityChart'

type RangeOption='7'|'30'|'90'|'custom'
const metrics:TrendMetric[]=['proteinG','carbohydratesG','fatG','fiberG']
const nutrientLabels:Record<string,string>={
  proteinG:'Protein',carbohydratesG:'Carbohydrates',fatG:'Fat',fiberG:'Fiber'
}

export function TrendsPage({ profile }: { profile:Profile }) {
  const today=toLocalDay(new Date())
  const [range,setRange]=useState<RangeOption>('30')
  const [customStart,setCustomStart]=useState(addLocalDays(today,-29))
  const [customEnd,setCustomEnd]=useState(today)
  const [nutrients,setNutrients]=useState<TrendMetric[]>(['proteinG'])
  const [exporting,setExporting]=useState(false)
  const [exportError,setExportError]=useState('')
  const start=range==='custom'?customStart:addLocalDays(today,-(Number(range)-1))
  const end=range==='custom'?customEnd:today
  const error=useMemo(()=>{
    try {trendDays(start,end,today);return ''}
    catch(cause){return cause instanceof Error?cause.message:'Invalid date range'}
  },[start,end,today])
  const query=useLiveQuery(()=>error?Promise.resolve(null):
    readTrendSources(start,end,undefined,today).then(data=>({data,error:''})).catch(cause=>({
      data:null,error:cause instanceof Error?cause.message:'Could not read trends'
    })),[start,end,error,today],undefined)
  const series=useMemo(()=>query?.data&&!error?
    buildTrends(start,end,today,profile,query.data,new Date().toISOString()):null,
  [start,end,today,profile,query,error])
  async function exportExcel() {
    if (error || exporting || !series || query?.error) return
    setExporting(true)
    setExportError('')
    try {
      // Re-read the current range at click time; never export stale or sample data.
      const [sources, limits] = await Promise.all([
        readTrendSources(start, end, undefined, today), readNutrientComparisonLimits()
      ])
      const sheets = buildTrendExcelReport(
        start, end, today, profile, sources, limits, new Date().toISOString()
      )
      const bytes = createXlsxWorkbook(sheets)
      const blob = new Blob([bytes.buffer as ArrayBuffer], { type: XLSX_MIME })
      const url = URL.createObjectURL(blob)
      const link = document.createElement('a')
      link.href = url
      link.download = 'health-tracker-trends-' + start + '-to-' + end + '.xlsx'
      document.body.appendChild(link)
      link.click()
      link.remove()
      window.setTimeout(() => URL.revokeObjectURL(url), 60_000)
    } catch (cause) {
      setExportError(cause instanceof Error ? cause.message : 'Could not create the Excel report.')
    } finally {
      setExporting(false)
    }
  }
  function toggleNutrient(metric:TrendMetric,checked:boolean){
    setNutrients(current=>checked?[...new Set([...current,metric])]:current.filter(value=>value!==metric))
  }
  return <div className="space-y-7">
    <header>
      
      <PageTitle topic="trends" className="mt-2">Recorded history</PageTitle>
    </header>
    <section aria-label="Trend date filters" className="space-y-4 rounded-2xl border border-slate-200 bg-white p-4">
      <h2 className="font-semibold">Choose date range</h2>
      <div className="flex flex-wrap gap-2">
        {(['7','30','90','custom'] as RangeOption[]).map(value=>
          <button type="button" key={value} aria-pressed={range===value}
            className={'min-h-11 rounded-xl px-4 py-2 text-sm font-semibold '+
              (range===value?'bg-evergreen-600 text-white':'border border-slate-300 bg-white text-slate-800')}
            onClick={()=>setRange(value)}>
            {value==='custom'?'Custom':value+' days'}
          </button>)}
      </div>
      {range==='custom'&&<div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
        <label className="text-sm font-semibold">From
          <input type="date" min="1900-01-01" max={today}
            className="mt-1 block min-h-11 w-full rounded-xl border border-slate-300 px-3 text-base"
            value={customStart} onChange={event=>setCustomStart(event.target.value)} />
        </label>
        <label className="text-sm font-semibold">Through
          <input type="date" min="1900-01-01" max={today}
            className="mt-1 block min-h-11 w-full rounded-xl border border-slate-300 px-3 text-base"
            value={customEnd} onChange={event=>setCustomEnd(event.target.value)} />
        </label>
      </div>}
      <p className="text-xs text-slate-600">{start} – {end} (inclusive, up to 366 calendar days)</p>
      {error&&<p role="alert" className="rounded-xl bg-rose-50 p-3 text-sm text-rose-900">{error}</p>}
      <div className="flex justify-end">
        <button type="button" aria-label="Export trends to Excel" disabled={!!error || !series || !!query?.error || exporting}
          className="inline-flex min-h-11 items-center gap-2 rounded-xl bg-evergreen-600 px-4 py-2 text-sm font-semibold text-white hover:bg-evergreen-700 disabled:cursor-not-allowed disabled:opacity-50"
          onClick={exportExcel}>
          <svg aria-hidden="true" viewBox="0 0 24 24" width="20" height="20" fill="none"
            stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <path d="M12 3v12m-4-4 4 4 4-4M4 17v3h16v-3" />
          </svg>
          {exporting ? 'Preparing Excel…' : 'Export Excel'}
        </button>
      </div>
      {exportError&&<p role="alert" className="rounded-xl bg-rose-50 p-3 text-sm text-rose-900">{exportError}</p>}
    </section>
    {!error&&query===undefined&&<p role="status" className="rounded-xl bg-white p-4 text-sm text-slate-600">Loading local trend history…</p>}
    {query?.error&&<p role="alert" className="rounded-xl bg-rose-50 p-4 text-sm text-rose-900">{query.error}</p>}
    {series&&<>
      <section aria-label="Daily energy trends" className="space-y-4">
        <h2 className="text-xl font-bold">Calories and estimated energy</h2>
        <TrendChart days={series.days} metric="intakeKcal" profile={profile} />
        <TrendChart days={series.days} metric="expenditureKcal" profile={profile} />
        <TrendChart days={series.days} metric="differenceKcal" profile={profile} />
      </section>
      <section aria-label="Measured weight trends" className="space-y-4">
        <h2 className="text-xl font-bold">Weight measurements</h2>
        <TrendChart days={series.days} metric="weightKg" profile={profile} />
      </section>
      <section aria-label="Nutrient trends" className="space-y-4">
        <h2 className="text-xl font-bold">Nutrients</h2>
        <div className="rounded-2xl border border-slate-200 bg-white p-4">
          <p className="mb-3 text-sm font-semibold">Choose one or more nutrients</p>
          <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
            {metrics.map(metric=><label key={metric} className="flex min-h-11 items-center gap-2 text-sm">
              <input type="checkbox" checked={nutrients.includes(metric)}
                onChange={event=>toggleNutrient(metric,event.target.checked)} />{nutrientLabels[metric]}
            </label>)}
          </div>
        </div>
        {!nutrients.length&&<p className="text-sm text-slate-600">Select at least one nutrient to view its recorded trend.</p>}
        {nutrients.map(metric=><TrendChart key={metric} days={series.days} metric={metric} profile={profile} />)}
      </section>
      <section aria-label="Fluid trends" className="space-y-4">
        <h2 className="text-xl font-bold">Fluid tracking</h2>
        <TrendChart days={series.days} metric="fluidMl" profile={profile} />
      </section>
      <section aria-label="Activity trends" className="space-y-4">
        <h2 className="text-xl font-bold">Activity history</h2>
        <WeekActivityChart weeks={series.weeks} />
      </section>
      <section aria-labelledby="adherence-heading" className="space-y-3 rounded-2xl border border-slate-200 bg-white p-5">
        <h2 id="adherence-heading" className="text-xl font-bold">Calendar alignment</h2>
        <p className="text-sm text-slate-600">
          {series.adherence.assessable} of {series.days.length} dates were marked complete and assessable.
          On-target percent is calculated <strong>only</strong> among those assessable completed dates.
        </p>
        <p className="text-xl font-semibold">
          {series.adherence.onTargetPercent===null?'No assessable days':
            Number(series.adherence.onTargetPercent.toFixed(1))+'% of assessable days on target'}
        </p>
        <dl className="grid grid-cols-2 gap-3 text-sm sm:grid-cols-4">
          <div><dt className="text-xs text-slate-600">On target</dt><dd className="font-bold">{series.adherence.onTarget}</dd></div>
          <div><dt className="text-xs text-slate-600">Mixed</dt><dd className="font-bold">{series.adherence.mixed}</dd></div>
          <div><dt className="text-xs text-slate-600">Off target</dt><dd className="font-bold">{series.adherence.offTarget}</dd></div>
          <div><dt className="text-xs text-slate-600">Incomplete / unassessed</dt><dd className="font-bold">{series.adherence.incomplete}</dd></div>
        </dl>
      </section>
    </>}
  </div>
}
