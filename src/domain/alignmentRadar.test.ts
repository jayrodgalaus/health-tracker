import { describe, expect, it } from 'vitest'
import type { DailySummary, RuleResult, RuleState } from './evaluation'
import { alignmentRadar, radarScore } from './alignmentRadar'

const rule = (code: string, actual: number | null, target: number | null,
  state: RuleState = 'pass'): RuleResult => ({
  code: code + '.' + state, label: code, actual, target, state,
  unit: '', source: 'recorded', explanation: 'Synthetic example'
})

describe('Today radar point scoring', () => {
  it('scores calorie deviation symmetrically, including within a ±15% alignment band', () => {
    expect(radarScore(rule('energyKcal',1600,1600))).toBe(100)
    expect(radarScore(rule('energyKcal',1760,1600))).toBeCloseTo(90)
    expect(radarScore(rule('energyKcal',1440,1600))).toBeCloseTo(90)
    expect(radarScore(rule('energyKcal',1840,1600))).toBeCloseTo(85)
    expect(radarScore(rule('energyKcal',1360,1600))).toBeCloseTo(85)
    expect(radarScore(rule('energyKcal',3200,1600))).toBe(0)
    expect(radarScore(rule('energyKcal',0,1600))).toBe(0)
    expect(radarScore(rule('energyKcal',100,0))).toBeNull()
  })

  it('gives full sodium points at or below limit, then subtracts 10 per 1% excess', () => {
    expect(radarScore(rule('sodiumMg',1000,2000))).toBe(100)
    expect(radarScore(rule('sodiumMg',2000,2000))).toBe(100)
    expect(radarScore(rule('sodiumMg',2020,2000))).toBeCloseTo(90)
    expect(radarScore(rule('sodiumMg',2100,2000))).toBeCloseTo(50)
    expect(radarScore(rule('sodiumMg',2200,2000))).toBe(0)
    expect(radarScore(rule('sodiumMg',0,0))).toBe(100)
    expect(radarScore(rule('sodiumMg',1,0))).toBe(0)
  })

  it('caps minimum-goal progress at 100 percent and retains valid measured zeros', () => {
    expect(radarScore(rule('proteinG',150,100))).toBe(100)
    expect(radarScore(rule('fiberG',12.5,25))).toBe(50)
    expect(radarScore(rule('fluidMl',0,2000))).toBe(0)
    expect(radarScore(rule('fluidMl',1000,0))).toBe(100)
  })

  it('does not plot missing, partial, invalid or unconfigured metrics as zero', () => {
    expect(radarScore(rule('proteinG',null,100))).toBeNull()
    expect(radarScore(rule('sodiumMg',2000,2000,'notEvaluated'))).toBeNull()
    expect(radarScore(rule('energyKcal',1500,null))).toBeNull()
    expect(radarScore(rule('energyKcal',Number.NaN,1600))).toBeNull()
    expect(radarScore(rule('energyKcal',-1,1600))).toBeNull()
    const summary = { evaluation: {
      isComplete:false,
      results:[rule('energyKcal',1600,1600),rule('sodiumMg',null,2000,'notEvaluated')]
    }} as DailySummary
    expect(alignmentRadar(summary)).toMatchObject([
      { code:'energyKcal',label:'Calories',score:100 },
      { code:'sodiumMg',label:'Sodium',score:null }
    ])
  })
})
