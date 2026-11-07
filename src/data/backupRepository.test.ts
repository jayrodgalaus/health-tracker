import 'fake-indexeddb/auto'
import { afterEach, describe, expect, it } from 'vitest'
import { HealthTrackerDatabase } from '../db/database'
import { parseBackupJson, validateBackup } from '../domain/backup'
import { EMPTY_TARGETS } from '../domain/profile'
import { emptyNutrition } from '../domain/nutrition'
import { countLocalRecords, deleteAllLocalRecords, readLocalBackup, replaceLocalData } from './backupRepository'

const names:string[]=[]
const newDb=(name:string)=>{names.push(name);return new HealthTrackerDatabase(name)}
afterEach(async()=>{
  for(const name of names) await new HealthTrackerDatabase(name).delete()
  names.length=0
})
const now='2026-11-07T09:00:00.000Z'
async function seed(db:HealthTrackerDatabase){
  await db.profiles.add({
    id:'primary',birthDate:'1991-02-03',heightCm:170,activityLevel:null,
    sexForEquation:'male',backgroundActivityMultiplier:1.1,goal:'maintain',
    units:{mass:'kg',height:'cm',fluid:'ml'},createdAt:now,updatedAt:now
  })
  await db.goalPeriods.add({
    id:'goal',effectiveFrom:'2026-11-01',goalType:'maintain',targetWeightKg:null,
    ruleSettings:{energyAlignedPercent:15,energyAttentionPercent:30,
      minimumLargeDeviationPercent:50,sodiumLargeDeviationPercent:30},
    targets:{...EMPTY_TARGETS,energyKcal:2100},createdAt:now
  })
  await db.savedFoods.add({
    id:'saved',name:'Synthetic oats',brand:'Synthetic brand',kind:'food',
    labelBasis:{quantity:100,unit:'g'},nutrientsPerBasis:{...emptyNutrition(),energyKcal:400},
    isFavorite:true,createdAt:now,updatedAt:now
  })
  await db.foodEntries.add({
    id:'meal',dayKey:'2026-11-06',recordedAt:now,createdAt:now,updatedAt:now,
    kind:'food',name:'Synthetic oats',savedFoodId:'saved',
    quantity:75,unit:'g',labelBasis:{quantity:100,unit:'g'},
    referenceNutrientsSnapshot:{...emptyNutrition(),energyKcal:400},
    nutrientsSnapshot:{...emptyNutrition(),energyKcal:300},fluidMl:null
  })
  await db.exerciseEntries.add({
    id:'workout',dayKey:'2026-11-06',startedAt:now,createdAt:now,updatedAt:now,
    activity:'Walking',durationMinutes:30,intensity:'light',met:3,
    estimationMethod:'metNet',estimatedEnergyKcal:null,isStrengthTraining:false
  })
  await db.weightEntries.add({
    id:'weight',dayKey:'2026-11-06',recordedAt:now,
    weightKg:70,createdAt:now,updatedAt:now
  })
  await db.dayReviews.add({
    dayKey:'2026-11-06',isComplete:true,markedAt:now,updatedAt:now
  })
  await db.appSettings.add({
    id:'local',waterPresetsMl:[100,250,400,600],updatedAt:now
  })
}
describe('complete local JSON backup and restore',()=>{
  it('round-trips every table through a full wipe and reopened IndexedDB',async()=>{
    const name='backup-roundtrip'
    const database=newDb(name)
    await seed(database)
    const backup=await readLocalBackup(database)
    expect(backup.formatVersion).toBe(1)
    expect(backup.app.schemaVersion).toBe(2)
    expect(backup.tables.foodEntries[0]?.referenceNutrientsSnapshot?.energyKcal).toBe(400)
    const serialized=JSON.stringify(backup)
    await deleteAllLocalRecords(database)
    expect(Object.values(await countLocalRecords(database)).every(count=>count===0)).toBe(true)
    const preview=parseBackupJson(serialized)
    await replaceLocalData(preview,database)
    database.close()
    const reopened=new HealthTrackerDatabase(name)
    const restored=await readLocalBackup(reopened)
    expect(restored.tables).toEqual(backup.tables)
    expect(restored.tables.foodEntries[0]?.nutrientsSnapshot.energyKcal).toBe(300)
    reopened.close()
  })
  it('round-trips optional nutrient comparison limits and rejects corrupt limits atomically', async () => {
    const database = newDb('backup-nutrient-limits')
    await seed(database)
    const legacyBackup = await readLocalBackup(database)
    // Previously exported settings contain only water presets; they remain valid.
    expect(validateBackup(legacyBackup).tables.appSettings[0]?.sugarLimitG).toBeUndefined()
    const withLimits = structuredClone(legacyBackup)
    withLimits.tables.appSettings[0]!.sugarLimitG = 38.5
    withLimits.tables.appSettings[0]!.sodiumLimitMg = 2100
    await replaceLocalData(withLimits, database)
    const restored = await readLocalBackup(database)
    expect(restored.tables.appSettings[0]).toMatchObject({
      waterPresetsMl: [100, 250, 400, 600], sugarLimitG: 38.5, sodiumLimitMg: 2100
    })
    const invalidSugar = structuredClone(restored)
    invalidSugar.tables.appSettings[0]!.sugarLimitG = 0
    await expect(replaceLocalData(invalidSugar, database)).rejects.toThrow(/invalid number/)
    const invalidSodium = structuredClone(restored)
    invalidSodium.tables.appSettings[0]!.sodiumLimitMg = Number.POSITIVE_INFINITY
    await expect(replaceLocalData(invalidSodium, database)).rejects.toThrow(/invalid number/)
    expect((await readLocalBackup(database)).tables.appSettings).toEqual(restored.tables.appSettings)
    database.close()
  })
  it('round-trips lookup provenance and rejects a forged source code', async () => {
    const database = newDb('lookup-provenance')
    await seed(database)
    const original = await readLocalBackup(database)
    const withSource = structuredClone(original)
    withSource.tables.foodEntries[0]!.nutritionSource = {
      provider: 'open-food-facts', productCode: '3017624010701',
      fetchedAt: now
    }
    await replaceLocalData(withSource, database)
    expect((await readLocalBackup(database)).tables.foodEntries[0]?.nutritionSource)
      .toEqual(withSource.tables.foodEntries[0]?.nutritionSource)
    const malformed = structuredClone(withSource)
    const invalidSource = malformed.tables.foodEntries[0]!.nutritionSource
    if (invalidSource?.provider !== 'open-food-facts') throw new Error('Expected an Open Food Facts fixture')
    invalidSource.productCode = '../../wrong'
    await expect(replaceLocalData(malformed, database)).rejects.toThrow(/invalid barcode/)
    expect((await readLocalBackup(database)).tables.foodEntries[0]?.nutritionSource)
      .toEqual(withSource.tables.foodEntries[0]?.nutritionSource)
    database.close()
  })
  it('preserves a USDA ingredient record ID in JSON backup/restore without recalculating old food logs', async () => {
    const database = newDb('usda-provenance')
    await seed(database)
    const base = await readLocalBackup(database)
    const withUsda = structuredClone(base)
    withUsda.tables.foodEntries[0]!.nutritionSource = {
      provider: 'usda-sr-legacy', fdcId: 169976, release: '2018-04'
    }
    await replaceLocalData(withUsda, database)
    const restored = await readLocalBackup(database)
    expect(restored.tables.foodEntries[0]?.nutritionSource)
      .toEqual({provider:'usda-sr-legacy',fdcId:169976,release:'2018-04'})
    expect(restored.tables.foodEntries[0]?.nutrientsSnapshot.energyKcal).toBe(300)
    const invalid = structuredClone(withUsda)
    invalid.tables.foodEntries[0]!.nutritionSource = {
      provider:'usda-sr-legacy', fdcId:-1, release:'2018-04'
    }
    await expect(replaceLocalData(invalid,database)).rejects.toThrow(/invalid number/)
    expect((await readLocalBackup(database)).tables.foodEntries[0]?.nutritionSource)
      .toEqual(restored.tables.foodEntries[0]?.nutritionSource)
    database.close()
  })
  it('round-trips verified Foundation Food provenance and rejects mismatched USDA releases',async()=>{
    const database=newDb('usda-foundation-provenance')
    await seed(database)
    const base=await readLocalBackup(database)
    const withFoundation=structuredClone(base)
    withFoundation.tables.foodEntries[0]!.nutritionSource={
      provider:'usda-foundation',fdcId:790577,release:'2026-04'
    }
    await replaceLocalData(withFoundation,database)
    const restored=await readLocalBackup(database)
    expect(restored.tables.foodEntries[0]?.nutritionSource).toEqual({
      provider:'usda-foundation',fdcId:790577,release:'2026-04'
    })
    expect(restored.tables.foodEntries[0]?.nutrientsSnapshot.energyKcal).toBe(300)
    const badRelease=structuredClone(withFoundation)
    badRelease.tables.foodEntries[0]!.nutritionSource={
      provider:'usda-foundation',fdcId:790577,release:'2018-04'
    } as unknown as typeof badRelease.tables.foodEntries[number]['nutritionSource']
    await expect(replaceLocalData(badRelease,database)).rejects.toThrow(/unsupported USDA release/)
    const invalidId=structuredClone(withFoundation)
    invalidId.tables.foodEntries[0]!.nutritionSource={
      provider:'usda-foundation',fdcId:-2,release:'2026-04'
    }
    await expect(replaceLocalData(invalidId,database)).rejects.toThrow(/invalid number/)
    expect((await readLocalBackup(database)).tables.foodEntries[0]?.nutritionSource)
      .toEqual(restored.tables.foodEntries[0]?.nutritionSource)
    database.close()
  })
  it('rejects malformed, future versions, invalid values, and unknown fields with no data loss',async()=>{
    const database=newDb('backup-invalid')
    await seed(database)
    const original=await readLocalBackup(database)
    expect(()=>parseBackupJson('{bad JSON')).toThrow()
    const future={...original,formatVersion:99}
    await expect(replaceLocalData(future,database)).rejects.toThrow(/version/)
    const weightCorrupt=structuredClone(original)
    weightCorrupt.tables.weightEntries[0]!.weightKg=-5
    await expect(replaceLocalData(weightCorrupt,database)).rejects.toThrow()
    const proto=JSON.parse(JSON.stringify(original).replace('"formatVersion":1','"__proto__":{"admin":true},"formatVersion":1'))
    await expect(replaceLocalData(proto,database)).rejects.toThrow(/unexpected field/)
    const duplicate=structuredClone(original)
    duplicate.tables.weightEntries.push({...duplicate.tables.weightEntries[0]!,id:'another'})
    await expect(replaceLocalData(duplicate,database)).rejects.toThrow(/duplicate dated/)
    expect((await readLocalBackup(database)).tables).toEqual(original.tables)
    database.close()
  })
  it('atomically rolls back a write failure after clearing all stores',async()=>{
    const database=newDb('backup-rollback')
    await seed(database)
    const original=await readLocalBackup(database)
    const fixture=structuredClone(original)
    fixture.tables.foodEntries[0]!.name='Different synthetic item'
    const failWrite=()=>{throw new Error('synthetic insert failure')}
    database.foodEntries.hook('creating',failWrite)
    await expect(replaceLocalData(fixture,database)).rejects.toThrow(/synthetic insert failure/)
    database.foodEntries.hook('creating').unsubscribe(failWrite)
    expect((await readLocalBackup(database)).tables).toEqual(original.tables)
    database.close()
  })
  it('deletes every user-owned store only when explicitly invoked',async()=>{
    const database=newDb('backup-reset')
    await seed(database)
    await deleteAllLocalRecords(database)
    expect(Object.values(await countLocalRecords(database)).every(count=>count===0)).toBe(true)
    expect(await database.profiles.count()).toBe(0)
    database.close()
  })
  it('validates timestamps and nutrient snapshots without silently converting missing to zero',async()=>{
    const database=newDb('backup-nutrients')
    await seed(database)
    const original=await readLocalBackup(database)
    const changed=structuredClone(original)
    changed.tables.foodEntries[0]!.nutrientsSnapshot.proteinG=null
    expect(validateBackup(changed).tables.foodEntries[0]?.nutrientsSnapshot.proteinG).toBeNull()
    changed.tables.foodEntries[0]!.nutrientsSnapshot.proteinG=-1
    expect(()=>validateBackup(changed)).toThrow(/invalid number/)
    const inconsistent=structuredClone(original)
    inconsistent.tables.foodEntries[0]!.nutrientsSnapshot.energyKcal=999
    expect(()=>validateBackup(inconsistent)).toThrow(/does not match original label/)
    const conflicting=structuredClone(original)
    conflicting.tables.exerciseEntries[0]!.estimatedEnergyKcal=300
    expect(()=>validateBackup(conflicting)).toThrow(/cannot also store manual/)
    const stamp=structuredClone(original)
    stamp.tables.weightEntries[0]!.recordedAt='2026-02-30T12:00:00Z'
    expect(()=>validateBackup(stamp)).toThrow(/impossible timestamp/)
    database.close()
  })
})
