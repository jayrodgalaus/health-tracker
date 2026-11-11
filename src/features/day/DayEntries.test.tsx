import { describe, expect, it } from 'vitest'
import { renderToStaticMarkup } from 'react-dom/server'
import { MemoryRouter } from 'react-router-dom'
import type { DayRecords } from '../../data/dayRepository'
import type { ExerciseEntry, Profile, WeightEntry } from '../../domain/models'
import { DayExerciseEntries } from './DayEntries'

const at = '2026-11-06T12:00:00.000Z'
const dayKey = '2026-11-06'
const profile: Profile = {
  id: 'primary', birthDate: '1990-02-03', heightCm: 170,
  activityLevel: null, goal: 'maintain', sexForEquation: null,
  units: { mass: 'kg', height: 'cm', fluid: 'ml' },
  createdAt: at, updatedAt: at
}
function exercise(id: string, overrides: Partial<ExerciseEntry>): ExerciseEntry {
  return {
    id, dayKey, activity: 'Strength training', durationMinutes: 5,
    intensity: null, estimationMethod: 'metNet', met: 3.5,
    estimatedEnergyKcal: null, startedAt: at, createdAt: at, updatedAt: at,
    ...overrides
  }
}
const weights: WeightEntry[] = [{
  id: 'weight', dayKey: '2026-11-05', weightKg: 68,
  recordedAt: at, createdAt: at, updatedAt: at
}]
function render(records: DayRecords, currentProfile: Profile = profile, locked = false): string {
  return renderToStaticMarkup(
    <MemoryRouter>
      <DayExerciseEntries dayKey={dayKey} records={records} profile={currentProfile} locked={locked} />
    </MemoryRouter>
  )
}
function records(activities: ExerciseEntry[], recordedWeights = weights): DayRecords {
  return { activities, weights: recordedWeights, intake: [], goal: null, review: null }
}

describe('Calendar Activity exercise cards', () => {
  it('shows each workout estimate from the existing calculation, including an earlier weight', () => {
    const walking = exercise('walking', {
      activity: 'Walking', durationMinutes: 20, distanceKm: 2, speedKmh: 6,
      inclinePercent: Math.tan(10 * Math.PI / 180) * 100, estimationMethod: 'paceGradeNet', met: null
    })
    const lifting = exercise('lifting', { activity: 'Strength training' })
    const html = render(records([walking, lifting]))
    expect(html).toContain('Walking')
    expect(html).toContain('Strength training')
    expect(html).toContain('Estimated additional burned kcal: ≈ 306.3 kcal')
    expect(html).toContain('Estimated additional burned kcal: ≈ 14.9 kcal')
    expect(html.match(/Estimated additional burned kcal/g)).toHaveLength(2)
    expect(html).toContain('Add or edit exercise')
    expect(html.match(/Edit \/ delete/g)).toHaveLength(2)
  })

  it('distinguishes unknown and zero kcal, without inventing a number for missing weight', () => {
    const unknown = exercise('unknown', { activity: 'Cycling', estimationMethod: 'unknown', met: null })
    const zero = exercise('zero', {
      activity: 'Other', estimationMethod: 'manualActive', met: null,
      estimatedEnergyKcal: 0
    })
    const needsWeight = exercise('needs-weight', { activity: 'Strength training' })
    const html = render(records([unknown, zero, needsWeight], []))
    expect(html.match(/Estimated additional burned kcal: Unknown/g)).toHaveLength(2)
    expect(html).toContain('Estimated additional burned kcal: ≈ 0 kcal')
  })

  it('does not generate adult estimates for minors and preserves locked-day read-only UI', () => {
    const html = render(records([exercise('lifting', {})]), {
      ...profile, birthDate: '2014-01-01'
    }, true)
    expect(html).toContain('Estimated additional burned kcal: Not evaluated')
    expect(html).not.toContain('Edit / delete')
    expect(html).not.toContain('Add or edit exercise')
  })
})
