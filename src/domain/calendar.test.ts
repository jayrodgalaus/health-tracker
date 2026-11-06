import { describe, expect, it } from 'vitest'
import { addLocalDays, monthDays, monthGrid, shiftMonth } from './calendar'

describe('local calendar helpers', () => {
  it('creates a leap February and complete Monday-first rows', () => {
    expect(monthDays('2024-02')).toHaveLength(29)
    const rows = monthGrid('2024-02')
    expect(rows.length).toBe(5)
    expect(rows[0]?.[0]).toBeNull()
    expect(rows[0]?.[3]).toBe('2024-02-01')
    expect(rows.flat().filter(Boolean)).toHaveLength(29)
  })
  it('navigates years and local-day boundaries without UTC midnight', () => {
    expect(shiftMonth('2026-01', -1)).toBe('2025-12')
    expect(shiftMonth('2026-12', 1)).toBe('2027-01')
    expect(addLocalDays('2024-02-28', 1)).toBe('2024-02-29')
    expect(addLocalDays('2024-02-29', 1)).toBe('2024-03-01')
  })
  it('rejects invalid dates rather than creating arbitrary days', () => {
    expect(() => monthGrid('2026-13')).toThrow()
    expect(() => addLocalDays('2026-02-29', 1)).toThrow()
  })
})
