import { describe, expect, it } from 'vitest'
import { renderToStaticMarkup } from 'react-dom/server'
import type { DailySummary } from '../../domain/evaluation'
import { ExpenditurePanel } from './ExpenditurePanel'

const base = {
  intake: { nutrients: { energyKcal: { knownAmount: 1900, knownEntryCount: 1, unknownEntryCount: 0, totalEntryCount: 1, complete: true } } },
  expenditure: {
    restingKcal: 1440, backgroundKcal: 1750, workoutIncrementKcal: 250,
    totalExpenditureKcal: 2000, differenceKcal: -100, multiplier: 1.2
  },
  activity: { knownEnergyEntries: 1, unknownEnergyEntries: 0 },
  evaluation: { isComplete: true }
} as DailySummary

describe('Energy page gauge and separate cards', () => {
  it('renders eaten, expended, signed difference and four metric cards', () => {
    const html = renderToStaticMarkup(<ExpenditurePanel summary={base} goal="lose" />)
    expect(html).toContain('data-goal-state="aligned"')
    expect(html).toContain('≈ −100 kcal')
    expect(html).toContain('1,900')
    expect(html).toContain('2,000')
    expect(html).toContain('>Eaten<')
    expect(html).toContain('>Difference<')
    expect(html).toContain('>Expended<')
    expect(html).toContain('Estimated resting kcal/day')
    expect(html).toContain('Estimated non-workout background')
    expect(html).toContain('Additional logged workout kcal')
    expect(html).toContain('Lifestyle activity multiplier')
    expect(html).not.toContain('Selected background multiplier')
    expect(html).toContain('1.20×')
    expect(html).toContain('stroke-dasharray="95 100"')
  })
  it('does not color an open day despite a provisional difference', () => {
    const html = renderToStaticMarkup(<ExpenditurePanel
      summary={{ ...base, evaluation: { ...base.evaluation, isComplete: false } }} goal="lose" />)
    expect(html).toContain('data-goal-state="unassessed"')
    expect(html).toContain('≈ −100 kcal')
  })
  it('preserves unknown difference and partial workout estimates', () => {
    const html = renderToStaticMarkup(<ExpenditurePanel summary={{
      ...base,
      expenditure: { ...base.expenditure, differenceKcal: null, totalExpenditureKcal: null },
      activity: { ...base.activity, unknownEnergyEntries: 1 }
    }} goal="lose" />)
    expect(html).toContain('data-goal-state="unassessed"')
    expect(html).toContain('Known ≥ ≈ 250 kcal')
    expect(html).toContain('Unknown')
  })
  it('shows loading state before a summary is available', () => {
    expect(renderToStaticMarkup(<ExpenditurePanel />)).toContain('Calculating recorded energy')
  })
})
