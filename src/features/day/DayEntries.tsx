import { gradePercentToDegrees } from '../../domain/paceGrade'
import { estimateWorkout } from '../../domain/activity'
import { ageOnDay } from '../../domain/profile'
import { Link } from 'react-router-dom'
import type { DayRecords } from '../../data/dayRepository'
import type { Profile } from '../../domain/models'
import { isPlainWaterEntry } from '../../domain/nutrition'
import { kilogramsTo } from '../../domain/units'

const itemClass = 'rounded-xl border border-slate-200 bg-white p-4'

function amount(value: number | null | undefined, unit: string): string {
  return value === null || value === undefined
    ? 'Unknown' : Number(value.toFixed(1)).toLocaleString() + ' ' + unit
}

interface EntryProps {
  dayKey: string
  records: DayRecords
  locked?: boolean
}

export function DayFoodEntries({ dayKey, records, locked = false }: EntryProps) {
  const foods = records.intake.filter(entry => entry.kind === 'food')
  const query = '?date=' + encodeURIComponent(dayKey)
  return <section className="space-y-3" aria-label="Foods and meals">
    <div className="flex flex-wrap items-center justify-between gap-2">
      <h3 className="text-lg font-semibold">Foods and meals ({foods.length})</h3>
      {!locked && <Link className="text-sm font-semibold text-evergreen-700 underline"
        to={'/log/food' + query}>Add or edit food</Link>}
    </div>
    {!foods.length && <p className="text-sm text-slate-600">No foods recorded.</p>}
    {foods.map(entry => <article key={entry.id} className={itemClass}>
      <h4 className="font-semibold">{entry.name}</h4>
      <p className="mt-1 text-sm text-slate-600">{entry.meal ?? 'Meal not specified'} · {entry.quantity} {entry.unit} · {amount(entry.nutrientsSnapshot.energyKcal, 'kcal')}</p>
      <p className="mt-1 text-xs text-slate-500">Reference: per {entry.labelBasis.quantity} {entry.labelBasis.unit}, retained at log time. Protein: {amount(entry.nutrientsSnapshot.proteinG, 'g')}.</p>
      {!locked && <Link to={'/log/food' + query + '&edit=' + encodeURIComponent(entry.id)}
        className="mt-2 inline-block text-sm font-semibold text-evergreen-700 underline">Edit / delete</Link>}
    </article>)}
  </section>
}

/** Nutrition excludes only explicitly tagged plain water. Other drinks remain
 * visible, even if their nutrient fields are unknown and affect coverage.
 * Fluids includes every drink/water entry, with its volume counted once.
 */
export function DayDrinkEntries({
  dayKey, records, locked = false, excludeWater = false, fluidOnly = false
}: EntryProps & { excludeWater?: boolean; fluidOnly?: boolean }) {
  const drinks = records.intake.filter(entry => entry.kind === 'beverage' &&
    (!excludeWater || !isPlainWaterEntry(entry)))
  const query = '?date=' + encodeURIComponent(dayKey)
  const title = excludeWater ? 'Other drinks' : 'Drinks and water'
  return <section className="space-y-3" aria-label={title}>
    <div className="flex flex-wrap items-center justify-between gap-2">
      <h3 className="text-lg font-semibold">{title} ({drinks.length})</h3>
      {!locked && <Link className="text-sm font-semibold text-evergreen-700 underline"
        to={'/log/drink' + query}>Add or edit drinks</Link>}
    </div>
    {!drinks.length && <p className="text-sm text-slate-600">{excludeWater
      ? 'No non-water drinks recorded.' : 'No drinks or water recorded.'}</p>}
    {drinks.map(entry => <article key={entry.id} className={itemClass}>
      <h4 className="font-semibold">{entry.name}</h4>
      <p className="mt-1 text-sm text-slate-600">{entry.quantity} {entry.unit}
        {!fluidOnly && <> · Calories {amount(entry.nutrientsSnapshot.energyKcal, 'kcal')}</>}
        {!excludeWater && <> · Logged fluid {amount(entry.fluidMl, 'ml')}</>}
      </p>
      {fluidOnly && <p className="mt-1 text-sm font-semibold text-slate-700">
        Fluid: {amount(entry.fluidMl, 'ml')}
      </p>}
      {!locked && <Link to={'/log/drink' + query + '&edit=' + encodeURIComponent(entry.id)}
        className="mt-2 inline-block text-sm font-semibold text-evergreen-700 underline">Edit / delete</Link>}
    </article>)}
  </section>
}

export function DayExerciseEntries({
  dayKey, records, profile, locked = false
}: EntryProps & { profile: Profile }) {
  const query = '?date=' + encodeURIComponent(dayKey)
  const age = ageOnDay({
    birthDate: profile.birthDate, ageYears: profile.ageYears ?? null, ageAsOf: profile.ageAsOf ?? null
  }, dayKey)
  const adult = age !== null && age >= 18
  return <section className="space-y-3" aria-label="Exercise entries">
    <div className="flex flex-wrap items-center justify-between gap-2">
      <h3 className="text-lg font-semibold">Exercise ({records.activities.length})</h3>
      {!locked && <Link className="text-sm font-semibold text-evergreen-700 underline"
        to={'/log/exercise' + query}>Add or edit exercise</Link>}
    </div>
    {!records.activities.length && <p className="text-sm text-slate-600">No workouts recorded.</p>}
    {records.activities.map(entry => {
      const estimate = estimateWorkout(entry, records.weights, adult)
      return <article key={entry.id} className={itemClass}>
      <h4 className="font-semibold">{entry.activity}</h4>
      <p className="mt-1 text-sm text-slate-600">{entry.durationMinutes === null
        ? 'Duration not recorded' : entry.durationMinutes + ' minutes'}
        {entry.distanceKm != null ? ' · ' + entry.distanceKm + ' km' : ''}
        {entry.speedKmh != null ? ' · ' + entry.speedKmh + ' km/h' : ''}
        {entry.inclinePercent != null ? ' · ' + Number(gradePercentToDegrees(entry.inclinePercent).toFixed(2)) + '° incline' : ''}
        {' · '}{entry.estimationMethod === 'manualActive' ? 'Manual active kcal'
          : entry.estimationMethod === 'metNet' ? 'MET-based increment'
            : entry.estimationMethod === 'paceGradeNet' ? 'Pace and incline estimate'
              : entry.estimationMethod === 'distanceNet' ? 'Distance-based estimate'
                : entry.estimationMethod === 'activityTimeNet' ? 'Time-based estimate'
                  : 'Energy unknown'}
      </p>
      <p className="mt-2 text-sm font-semibold text-slate-800">
        Estimated additional burned kcal: {!adult ? 'Not evaluated'
          : estimate.kcal === null ? 'Unknown'
            : '≈ ' + Number(estimate.kcal.toFixed(1)).toLocaleString() + ' kcal'}
      </p>
      {entry.notes && <p className="mt-1 text-sm text-slate-600">{entry.notes}</p>}
      {!locked && <Link to={'/log/exercise' + query + '&edit=' + encodeURIComponent(entry.id)}
        className="mt-2 inline-block text-sm font-semibold text-evergreen-700 underline">Edit / delete</Link>}
    </article>
    })}
  </section>
}

export function DayWeightEntries({
  dayKey, records, profile, locked = false
}: EntryProps & { profile: Profile }) {
  const query = '?date=' + encodeURIComponent(dayKey)
  const measurements = records.weights.filter(entry => entry.dayKey === dayKey)
  return <section className="space-y-3" aria-label="Measured weight">
    <div className="flex flex-wrap items-center justify-between gap-2">
      <h3 className="text-lg font-semibold">Measured weight ({measurements.length})</h3>
      {!locked && <Link className="text-sm font-semibold text-evergreen-700 underline"
        to={'/log/weight' + query}>Add or edit weight</Link>}
    </div>
    {!measurements.length && <p className="text-sm text-slate-600">No weight measurement recorded for this date.</p>}
    {measurements.map(entry => <article key={entry.id} className={itemClass}>
      <p className="font-semibold">{amount(kilogramsTo(entry.weightKg, profile.units.mass), profile.units.mass)} measured</p>
      {!locked && <Link to={'/log/weight' + query}
        className="mt-2 inline-block text-sm font-semibold text-evergreen-700 underline">Edit / delete</Link>}
    </article>)}
  </section>
}

/** Full Today view remains unchanged in scope; Calendar links to dedicated pages. */
export function DayEntries({ dayKey, records, profile, locked = false }: EntryProps & { profile: Profile }) {
  return <section aria-labelledby="day-entries-heading" className="space-y-4">
    <h2 id="day-entries-heading" className="text-xl font-bold">Detailed entries · {dayKey}</h2>
    <DayFoodEntries dayKey={dayKey} records={records} locked={locked} />
    <DayDrinkEntries dayKey={dayKey} records={records} locked={locked} />
    <DayExerciseEntries dayKey={dayKey} records={records} profile={profile} locked={locked} />
    <DayWeightEntries dayKey={dayKey} records={records} profile={profile} locked={locked} />
  </section>
}
