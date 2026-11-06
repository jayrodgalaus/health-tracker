import 'fake-indexeddb/auto'
import { afterEach, describe, expect, it } from 'vitest'
import { HealthTrackerDatabase } from '../db/database'
import { readTrendSources } from './trendsRepository'
const names:string[]=[]
afterEach(async()=>{for(const name of names)await new HealthTrackerDatabase(name).delete();names.length=0})
describe('range queries',()=>{
  it('includes older weight and goal but not future measurements',async()=>{
    const database=new HealthTrackerDatabase('trend-records-query');names.push(database.name)
    const stamp='2026-11-07T08:00:00Z'
    await database.weightEntries.bulkAdd([
      {id:'a',dayKey:'2026-10-15',recordedAt:stamp,weightKg:70,createdAt:stamp,updatedAt:stamp},
      {id:'b',dayKey:'2026-11-08',recordedAt:stamp,weightKg:71,createdAt:stamp,updatedAt:stamp}
    ])
    const records=await readTrendSources('2026-11-05','2026-11-07',database,'2026-11-07')
    expect(records.weights.map(v=>v.id)).toEqual(['a'])
    expect(records.intake).toEqual([])
    database.close()
  })
})
