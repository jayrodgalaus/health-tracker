import { describe, expect, it } from 'vitest'
import type { Profile } from './models'
import { reniPercent, reniReferenceForDay } from './reni'
import type { MetricCoverage } from './nutrition'

const baseProfile: Pick<Profile, 'birthDate' | 'ageYears' | 'ageAsOf' | 'sexForEquation'> = {
  birthDate: '1990-03-12', ageYears:null, ageAsOf:null, sexForEquation:'female'
}
const complete = (knownAmount: number): MetricCoverage => ({
  knownAmount, knownEntryCount:1, unknownEntryCount:0, totalEntryCount:1, complete:true
})

describe('FNRI PDRI 2015 Calendar comparison (adults only)', () => {
  it('matches the exact 49.1 g (80.5%) example for an 18-year-old female reference', () => {
    const profile={...baseProfile,birthDate:'2008-03-12'}
    const ref=reniReferenceForDay('proteinG',profile,'2026-03-12')
    expect(ref).toMatchObject({amount:61, unit:'g', basis:'RNI', ageYears:18})
    expect(reniPercent(complete(49.1),ref)).toBe(80.5)
  })
  it('uses recorded male/female selection, adult ages and the 18→19 birthday boundary', () => {
    const female18={...baseProfile,birthDate:'2008-03-12'}
    expect(reniReferenceForDay('proteinG',female18,'2027-03-11')?.amount).toBe(61)
    expect(reniReferenceForDay('proteinG',female18,'2027-03-12')?.amount).toBe(62)
    const male18={...female18,sexForEquation:'male' as const}
    expect(reniReferenceForDay('proteinG',male18,'2026-03-11')).toBeNull()
    expect(reniReferenceForDay('proteinG',male18,'2026-03-12')?.amount).toBe(72)
    expect(reniReferenceForDay('proteinG',male18,'2027-03-12')?.amount).toBe(71)
    expect(reniPercent(complete(49.1),reniReferenceForDay('proteinG',male18,'2027-03-12'))).toBe(69.2)
  })
  it('uses single, explicitly documented 25 g / 23 g fiber comparisons and 2,000 mg potassium AI', () => {
    expect(reniReferenceForDay('fiberG',baseProfile,'2026-11-07')).toMatchObject({amount:25,basis:'AI',unit:'g'})
    expect(reniPercent(complete(12.5),reniReferenceForDay('fiberG',baseProfile,'2026-11-07'))).toBe(50)
    const at18={...baseProfile,birthDate:'2008-03-12'}
    expect(reniReferenceForDay('fiberG',at18,'2026-03-12')?.amount).toBe(23)
    expect(reniReferenceForDay('potassiumMg',at18,'2026-03-12')?.amount).toBe(2000)
    expect(reniPercent(complete(1000),reniReferenceForDay('potassiumMg',baseProfile,'2026-11-07'))).toBe(50)
    expect(reniPercent(complete(3000),reniReferenceForDay('potassiumMg',baseProfile,'2026-11-07'))).toBe(150)
  })
  it('never fabricates unsupported gram-based ranges or treats sodium AI as an upper-limit goal', () => {
    for(const field of ['carbohydratesG','fatG','saturatedFatG','sugarsG','sodiumMg','energyKcal'] as const){
      expect(reniReferenceForDay(field,baseProfile,'2026-11-07')).toBeNull()
    }
  })
  it('keeps unknown profile sex, missing age and underage people unassessed', () => {
    expect(reniReferenceForDay('proteinG',{...baseProfile,sexForEquation:null},'2026-11-07')).toBeNull()
    expect(reniReferenceForDay('fiberG',{...baseProfile,sexForEquation:null},'2026-11-07')?.amount).toBe(25)
    expect(reniReferenceForDay('proteinG',{...baseProfile,birthDate:null,ageYears:null,ageAsOf:null},'2026-11-07')).toBeNull()
    expect(reniReferenceForDay('potassiumMg',{...baseProfile,birthDate:'2010-10-05'},'2026-11-07')).toBeNull()
    expect(reniReferenceForDay('fiberG',{...baseProfile,birthDate:null,ageYears:36,ageAsOf:'2026-11-07'},'2026-01-15')).toBeNull()
    expect(reniReferenceForDay('proteinG',{...baseProfile,ageYears:36,ageAsOf:'2026-11-07',birthDate:null},'2026-11-07')?.amount).toBe(62)
  })
  it('compares known amounts even with missing entries; zero is known but all-unknown stays unknown', () => {
    const r=reniReferenceForDay('proteinG',baseProfile,'2026-11-07')
    expect(reniPercent(complete(0),r)).toBe(0)
    expect(reniPercent(complete(75),r)).toBe(121)
    // The UI labels this partial-coverage result as a minimum (≥79.2%).
    expect(reniPercent({...complete(49.1),complete:false,unknownEntryCount:1,totalEntryCount:2},r)).toBe(79.2)
    expect(reniPercent({...complete(0),complete:false,unknownEntryCount:1,totalEntryCount:2},r)).toBe(0)
    expect(reniPercent({...complete(49.1),knownAmount:null,complete:false,knownEntryCount:0},r)).toBeNull()
    expect(reniPercent(complete(49.1),null)).toBeNull()
  })
})
