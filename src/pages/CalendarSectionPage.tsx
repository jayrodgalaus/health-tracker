import { useLiveQuery } from 'dexie-react-hooks'
import { Link, useParams } from 'react-router-dom'
import { PageInfoLink } from '../components/PageInfoLink'
import { readDayRecords } from '../data/dayRepository'
import { listExerciseForWeek } from '../data/exerciseRepository'
import { readNutrientComparisonLimits } from '../data/settingsRepository'
import { calculateDay } from '../domain/evaluation'
import type { Profile } from '../domain/models'
import { kilogramsTo } from '../domain/units'
import { parseLocalDay } from '../lib/localDate'
import { ExpenditurePanel } from '../features/day/ExpenditurePanel'
import {
  DayDrinkEntries, DayExerciseEntries, DayFoodEntries, DayWeightEntries
} from '../features/day/DayEntries'
import { ActivitySummary } from '../features/exercise/ActivitySummary'
import { NutritionSummary } from '../features/nutrition/NutritionSummary'
import { isDaySection, type DaySection } from '../features/day/CalendarSectionCards'

const headings: Record<DaySection, string> = {
  energy: 'Energy', nutrition: 'Nutrition', fluids: 'Fluids',
  activity: 'Activity', weight: 'Weight'
}

function fluidAmount(value: number | null, complete: boolean): string {
  if (value === null) return '—'
  return (complete ? '' : 'At least ') + Number(value.toFixed(1)).toLocaleString('en-US') + ' ml'
}

export function CalendarSectionPage({ profile }: { profile: Profile }) {
  const { dayKey: paramDay, section: paramSection } = useParams()
  const dayKey = paramDay && parseLocalDay(paramDay) &&
    paramDay >= '1900-01-01' && paramDay <= '2100-12-31' ? paramDay : null
  const section = isDaySection(paramSection) ? paramSection : null

  const records = useLiveQuery(
    () => dayKey && section ? readDayRecords(dayKey) : Promise.resolve(null),
    [dayKey, section], undefined
  )
  const week = useLiveQuery(
    () => dayKey && section === 'activity' ? listExerciseForWeek(dayKey) : Promise.resolve([]),
    [dayKey, section], undefined
  )
  const limits = useLiveQuery(
    () => section === 'nutrition' ? readNutrientComparisonLimits() : Promise.resolve(null),
    [section], undefined
  )

  if (!dayKey || !section) return <div role="alert" className="rounded-xl border border-rose-200 bg-rose-50 p-5">
    Invalid date or section. <Link className="font-semibold text-evergreen-700 underline" to="/calendar">Return to calendar</Link>.
  </div>

  const locked = records?.review?.isComplete === true
  const archivedProfile = records?.review?.frozen?.profile ?? profile
  const archivedLimits = locked && records?.review?.frozen ? records.review.frozen.comparisonLimits : limits
  const summary = records ? calculateDay({ dayKey, profile, ...records }, new Date().toISOString()) : undefined
  const fluid = summary?.intake.fluids
  const priorWeight = summary?.expenditure.weight
  // Historical effective-dated goals take precedence over later profile changes.
  const energyGoal = records?.goal?.goalType ?? (locked ? archivedProfile.goal : profile.goal) ?? null

  return <div className="space-y-6">
    <header className="space-y-2">
      <PageInfoLink topic="day-detail" />
      <Link className="inline-flex min-h-11 items-center text-sm font-semibold text-evergreen-700 underline"
        to={'/calendar/' + dayKey}>‹ Back to day details</Link>
      <p className="text-sm font-semibold uppercase tracking-wide text-evergreen-700">{dayKey}</p>
      <h1 className="text-3xl font-bold tracking-tight">{headings[section]}</h1>
    </header>

    {records == null ? <p role="status" className="rounded-xl bg-white p-4 text-sm text-slate-600">
      Loading recorded {headings[section].toLowerCase()}…
    </p> : <>
      {section === 'energy' && <ExpenditurePanel summary={summary} goal={energyGoal} />}

      {section === 'nutrition' && <>
        <NutritionSummary entries={records.intake} loading={archivedLimits === undefined}
          reniProfile={archivedProfile} reniDayKey={dayKey} comparisonLimits={archivedLimits ?? undefined}
          detailDayKey={dayKey} showFluids={false} />
        <DayFoodEntries dayKey={dayKey} records={records} locked={locked} />
        <DayDrinkEntries dayKey={dayKey} records={records} locked={locked} excludeWater />
      </>}

      {section === 'fluids' && <>
        <section aria-label="Daily fluid total" className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
          <h2 className="text-sm font-semibold text-slate-600">Logged fluids</h2>
          <p className="mt-2 text-2xl font-bold tabular-nums">
            {fluid ? fluidAmount(fluid.knownAmount, fluid.complete) : '—'}
          </p>
        </section>
        <DayDrinkEntries dayKey={dayKey} records={records} locked={locked} fluidOnly />
      </>}

      {section === 'activity' && <>
        <ActivitySummary dayKey={dayKey} profile={archivedProfile}
          dayActivities={records.activities} weekActivities={week}
          weights={records.weights}
          frozenDay={locked ? records.review?.frozen?.summary.activity : undefined}
          frozenWeek={locked ? records.review?.frozen?.week : undefined} />
        <DayExerciseEntries dayKey={dayKey} records={records} profile={archivedProfile} locked={locked} />
      </>}

      {section === 'weight' && <>
        <DayWeightEntries dayKey={dayKey} records={records}
          profile={archivedProfile} locked={locked} />
        {summary?.recordedWeightKg === null && priorWeight?.source === 'carriedForward' &&
          priorWeight.weightKg !== null && <section aria-label="Earlier weight measurement"
            className="rounded-2xl border border-slate-200 bg-white p-4">
            <h2 className="text-sm font-semibold text-slate-600">Most recent earlier measurement</h2>
            <p className="mt-2 font-bold tabular-nums">
              {Number(kilogramsTo(priorWeight.weightKg, archivedProfile.units.mass).toFixed(2)).toLocaleString('en-US')}
              {' '}{archivedProfile.units.mass}
            </p>
            <p className="mt-1 text-sm text-slate-600">Measured on {priorWeight.sourceDay}</p>
          </section>}
      </>}
    </>}
  </div>
}
