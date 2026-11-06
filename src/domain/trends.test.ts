import { describe, expect, it } from 'vitest'
import type { ExerciseEntry, FoodEntry, Profile, WeightEntry } from './models'
import { EMPTY_TARGETS } from './profile'
import { emptyNutrition } from './nutrition'
import { buildTrends, summarizeTrendMetric, trendDays } from './trends'

const now = '2026-11-07T08:00:00Z'
const profile: Profile = {
  id:'primary', birthDate:'1990-11-06', heightCm:170, sexForEquation:null,
  activityLevel:null, goal:'maintain', units:{mass:'kg',height:'cm',fluid:'ml'},
  createdAt:now,updatedAt:now
}
const meal = (dayKey:string, energyKcal:number|null):FoodEntry => ({
  id: dayKey, dayKey, name:'Synthetic food', kind:'food', savedFoodId:null,
  quantity:1, unit:'serving', labelBasis:{quantity:1,unit:'serving'},
  nutrientsSnapshot:{...emptyNutrition(),energyKcal},
  fluidMl:null,recordedAt:now,createdAt:now,updatedAt:now
})
const weight = (dayKey:string,weightKg:number):WeightEntry => ({
  id:dayKey,dayKey,weightKg, recordedAt:now,createdAt:now,updatedAt:now
})
const exercise = (dayKey:string):ExerciseEntry => ({
  id:dayKey,dayKey, activity:'Strength',durationMinutes:45,intensity:'moderate',
  estimatedEnergyKcal:null, estimationMethod:'unknown',isStrengthTraining:true,
  startedAt:now,createdAt:now,updatedAt:now
})
describe('trend math matches Today and Calendar',()=>{
  it('supports inclusive 7/30/90-day and local leap-day ranges',()=>{
    expect(trendDays('2026-11-01','2026-11-07','2026-11-07')).toHaveLength(7)
    expect(trendDays('2026-10-09','2026-11-07','2026-11-07')).toHaveLength(30)
    expect(trendDays('2026-08-10','2026-11-07','2026-11-07')).toHaveLength(90)
    expect(trendDays('2024-02-28','2024-03-01','2026-11-07')).toEqual(['2024-02-28','2024-02-29','2024-03-01'])
    expect(()=>trendDays('2025-01-01','2026-11-07','2026-11-07')).toThrow()
    expect(()=>trendDays('2026-11-05','2026-11-08','2026-11-07')).toThrow()
  })
  it('does not fill missing days with zero kcal, fluid or body weight',()=>{
    const series=buildTrends('2026-11-05','2026-11-07','2026-11-07',profile,{
      intake:[meal('2026-11-06',400)],activities:[],weights:[weight('2026-11-05',70)],goals:[],reviews:[]
    },now)
    expect(series.days.map(day=>day.intakeKcal.value)).toEqual([null,400,null])
    expect(series.days.map(day=>day.weightKg.value)).toEqual([70,null,null])
    expect(series.days[0]?.expenditureKcal.value).toBeNull()
    expect(series.days[0]?.fluidMl.value).toBeNull()
  })
  it('preserves partial known sums and unknown coverage from same Today rule',()=>{
    const series=buildTrends('2026-11-06','2026-11-06','2026-11-07',profile,{
      intake:[meal('2026-11-06',400),{...meal('2026-11-06',null),id:'missing'}],
      activities:[],weights:[],goals:[],reviews:[]
    },now)
    expect(series.days[0]?.intakeKcal).toEqual({value:400,partial:true})
    expect(summarizeTrendMetric(series.days,'intakeKcal')).toMatchObject({knownDays:1,partialDays:1})
  })
  it('adherence percentages exclude incomplete and unassessable dates',()=>{
    const series=buildTrends('2026-11-05','2026-11-07','2026-11-07',profile,{
      intake:[meal('2026-11-05',2000),meal('2026-11-06',3000)],
      activities:[],weights:[],
      goals:[{id:'goal',effectiveFrom:'2026-11-01',createdAt:now,targets:{...EMPTY_TARGETS,energyKcal:2000}}],
      reviews:[
        {dayKey:'2026-11-05',isComplete:true,markedAt:now},
        {dayKey:'2026-11-06',isComplete:true,markedAt:now}
      ]
    },now)
    expect(series.adherence).toMatchObject({onTarget:1,offTarget:1,incomplete:1,assessable:2,onTargetPercent:50})
  })
  it('uses full Monday–Sunday weeks and counts distinct strength days',()=>{
    const series=buildTrends('2026-11-06','2026-11-07','2026-11-07',profile,{
      intake:[],activities:[exercise('2026-11-02'),exercise('2026-11-06'),exercise('2026-11-08')],
      weights:[],goals:[],reviews:[]
    },now)
    expect(series.weeks).toHaveLength(1)
    expect(series.weeks[0]).toMatchObject({start:'2026-11-02',end:'2026-11-08',loggedMinutes:135,strengthDays:3})
  })
})
