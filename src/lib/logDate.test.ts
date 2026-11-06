import { describe, expect, it } from 'vitest'
import { selectedLogDay } from './logDate'

describe('log date deep linking', () => {
  it('accepts a historical local day without moving it through UTC', () => {
    expect(selectedLogDay('2026-10-31', '2026-11-06')).toBe('2026-10-31')
  })
  it('rejects a future, malformed, or empty selection', () => {
    expect(selectedLogDay('2026-11-07', '2026-11-06')).toBe('2026-11-06')
    expect(selectedLogDay('2026-02-30', '2026-11-06')).toBe('2026-11-06')
    expect(selectedLogDay(null, '2026-11-06')).toBe('2026-11-06')
  })
})
