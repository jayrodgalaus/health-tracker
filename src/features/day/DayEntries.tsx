import { Link } from 'react-router-dom'
import type { DayRecords } from '../../data/dayRepository'
import type { Profile } from '../../domain/models'
import { kilogramsTo } from '../../domain/units'

const itemClass = 'rounded-xl border border-slate-200 bg-white p-4'
function amount(value: number | null | undefined, unit: string) {
  return value === null || value === undefined ? 'Unknown' : Number(value.toFixed(1)) + ' ' + unit
}
export function DayEntries({ dayKey, records, profile }: { dayKey: string; records: DayRecords; profile: Profile }) {
  const query = '?date=' + encodeURIComponent(dayKey)
  const foods = records.intake.filter(entry => entry.kind === 'food')
  const drinks = records.intake.filter(entry => entry.kind === 'beverage')
  const dayWeights = records.weights.filter(entry => entry.dayKey === dayKey)
  return <section aria-labelledby="day-entries-heading" className="space-y-4">
    <h2 id="day-entries-heading" className="text-xl font-bold">Detailed entries · {dayKey}</h2>
    <div className="space-y-3">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <h3 className="text-lg font-semibold">Foods and meals ({foods.length})</h3>
        <Link className="text-sm font-semibold text-evergreen-700 underline" to={'/log/food' + query}>Add or edit food</Link>
      </div>
      {!foods.length && <p className="text-sm text-slate-600">No foods recorded. This does not imply zero food was eaten.</p>}
      {foods.map(entry => <article key={entry.id} className={itemClass}>
        <h4 className="font-semibold">{entry.name}</h4>
        <p className="mt-1 text-sm text-slate-600">{entry.meal ?? 'Meal not specified'} · {entry.quantity} {entry.unit} · {amount(entry.nutrientsSnapshot.energyKcal, 'kcal')}</p>
        <p className="mt-1 text-xs text-slate-500">Reference: per {entry.labelBasis.quantity} {entry.labelBasis.unit}, retained at log time. Protein: {amount(entry.nutrientsSnapshot.proteinG, 'g')}.</p>
        <Link to={'/log/food' + query + '&edit=' + encodeURIComponent(entry.id)} className="mt-2 inline-block text-sm font-semibold text-evergreen-700 underline">Edit / delete</Link>
      </article>)}
    </div>
    <div className="space-y-3">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <h3 className="text-lg font-semibold">Drinks and water ({drinks.length})</h3>
        <Link className="text-sm font-semibold text-evergreen-700 underline" to={'/log/drink' + query}>Add or edit drinks</Link>
      </div>
      {!drinks.length && <p className="text-sm text-slate-600">No drinks or water recorded.</p>}
      {drinks.map(entry => <article key={entry.id} className={itemClass}>
        <h4 className="font-semibold">{entry.name}</h4>
        <p className="mt-1 text-sm text-slate-600">{entry.quantity} {entry.unit} · Calories {amount(entry.nutrientsSnapshot.energyKcal, 'kcal')} · Logged fluid {amount(entry.fluidMl, 'ml')}</p>
        <Link to={'/log/drink' + query + '&edit=' + encodeURIComponent(entry.id)} className="mt-2 inline-block text-sm font-semibold text-evergreen-700 underline">Edit / delete</Link>
      </article>)}
    </div>
    <div className="space-y-3">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <h3 className="text-lg font-semibold">Exercise ({records.activities.length})</h3>
        <Link className="text-sm font-semibold text-evergreen-700 underline" to={'/log/exercise' + query}>Add or edit exercise</Link>
      </div>
      {!records.activities.length && <p className="text-sm text-slate-600">No workouts recorded. Rest or missing entries are not penalized.</p>}
      {records.activities.map(entry => <article key={entry.id} className={itemClass}>
        <h4 className="font-semibold">{entry.activity}</h4>
        <p className="mt-1 text-sm text-slate-600">{entry.durationMinutes === null ? 'Duration not recorded' : entry.durationMinutes + ' minutes'}{entry.distanceKm != null ? ' · ' + entry.distanceKm + ' km' : ''} · {entry.intensity ?? 'Unclassified intensity'} · {entry.estimationMethod === 'manualActive' ? 'Manual active kcal' : entry.estimationMethod === 'metNet' ? 'MET-based increment' : entry.estimationMethod === 'distanceNet' ? 'Distance-based estimate' : entry.estimationMethod === 'activityTimeNet' ? 'Time-based estimate' : 'Energy unknown'}</p>
        {entry.notes && <p className="mt-1 text-sm text-slate-600">{entry.notes}</p>}
        <Link to={'/log/exercise' + query + '&edit=' + encodeURIComponent(entry.id)} className="mt-2 inline-block text-sm font-semibold text-evergreen-700 underline">Edit / delete</Link>
      </article>)}
    </div>
    <div className="space-y-3">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <h3 className="text-lg font-semibold">Measured weight ({dayWeights.length})</h3>
        <Link className="text-sm font-semibold text-evergreen-700 underline" to={'/log' + query + '#weight'}>Add or edit weight</Link>
      </div>
      {!dayWeights.length && <p className="text-sm text-slate-600">No weight measurement recorded for this date.</p>}
      {dayWeights.map(entry => <article key={entry.id} className={itemClass}>
        <p className="font-semibold">{amount(kilogramsTo(entry.weightKg, profile.units.mass), profile.units.mass)} measured</p>
        <Link to={'/log' + query + '#weight'} className="mt-2 inline-block text-sm font-semibold text-evergreen-700 underline">Edit / delete</Link>
      </article>)}
    </div>
  </section>
}
