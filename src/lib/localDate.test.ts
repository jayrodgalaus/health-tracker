import { describe, expect, it } from 'vitest'
import { parseLocalDay, toLocalDay } from './localDate'

describe('local calendar keys', () => {
  it('formats local components without converting to UTC', () => {
    const localMidnight = new Date(2025, 0, 2, 0, 30)
    expect(toLocalDay(localMidnight)).toBe('2025-01-02')
  })

  it('round trips valid days including leap dates', () => {
    expect(toLocalDay(parseLocalDay('2024-02-29')!)).toBe('2024-02-29')
    expect(parseLocalDay('2025-02-29')).toBeNull()
    expect(parseLocalDay('2025-13-01')).toBeNull()
    expect(parseLocalDay('2025-1-01')).toBeNull()
  })
})
