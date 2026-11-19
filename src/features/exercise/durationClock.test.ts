import { describe, expect, it } from 'vitest'
import { clockDigits, clockFromMinutes, minutesFromClock } from './durationClock'
import { initialPaceInputs, updatePaceInputs } from '../../domain/paceInputs'

describe('exercise minute/second picker conversion', () => {
  it('starts visibly at 00:00 without inventing a recorded zero', () => {
    expect(clockFromMinutes('')).toBeNull()
    expect(clockDigits(0)).toBe('00')
    expect(minutesFromClock(0,0)).toBe('')
  })
  it('converts seconds into fractional minutes without premature rounding', () => {
    expect(minutesFromClock(7,30)).toBe('7.5')
    expect(minutesFromClock(0,1)).toBe(String(1/60))
    expect(clockFromMinutes(minutesFromClock(7,59))).toEqual({minutes:7,seconds:59})
    expect(clockFromMinutes('8.5')).toEqual({minutes:8,seconds:30})
    expect(clockFromMinutes('48')).toEqual({minutes:48,seconds:0})
  })
  it('preserves the full 1440-minute exercise bound and rejects invalid input', () => {
    expect(clockFromMinutes('1440')).toEqual({minutes:1440,seconds:0})
    expect(minutesFromClock(1440,0)).toBe('1440')
    expect(()=>minutesFromClock(1440,1)).toThrow()
    expect(()=>minutesFromClock(-1,30)).toThrow()
    expect(()=>minutesFromClock(1,60)).toThrow()
    expect(clockFromMinutes('not a number')).toBeNull()
    expect(clockFromMinutes('0')).toBeNull()
  })
  it('feeds walking/running pace calculations exactly as decimal minutes', () => {
    const pace=initialPaceInputs({duration:'',distance:'',speed:''})
    const withTime=updatePaceInputs(pace,'duration',minutesFromClock(7,30))
    const withDistance=updatePaceInputs(withTime,'distance','1')
    expect(withDistance.values.duration).toBe('7.5')
    expect(withDistance.values.speed).toBe('8')
    const computed=updatePaceInputs(
      updatePaceInputs(pace,'distance','4'),'speed','5')
    expect(clockFromMinutes(computed.values.duration)).toEqual({minutes:48,seconds:0})
  })
})
