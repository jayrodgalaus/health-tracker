import type {
  AppSettings, DayReview, ExerciseEntry, FoodEntry, GoalPeriod, Profile, SavedFood, WeightEntry
} from './models'
import { assertLocalDay } from './profile'
import { MAX_INCLINE_PERCENT } from './paceGrade'
import { portionRatio, scaleNutrition, validatePortion } from './nutrition'

export const BACKUP_FORMAT_VERSION = 1
export const BACKUP_MAX_BYTES = 25 * 1024 * 1024
export const BACKUP_MAX_ROWS = 100000
export const BACKUP_TABLES = [
  'profiles','goalPeriods','savedFoods','foodEntries','exerciseEntries',
  'weightEntries','dayReviews','appSettings'
] as const
export type BackupTableName = typeof BACKUP_TABLES[number]
export interface BackupTables {
  profiles: Profile[]; goalPeriods: GoalPeriod[]; savedFoods: SavedFood[]
  foodEntries: FoodEntry[]; exerciseEntries: ExerciseEntry[]
  weightEntries: WeightEntry[]; dayReviews: DayReview[]; appSettings: AppSettings[]
}
export interface HealthBackup {
  formatVersion: 1
  exportedAt: string
  app: { name: 'health-tracker'; version: string; schemaVersion: 2 | 3 }
  tables: BackupTables
}
export type BackupCounts = Record<BackupTableName, number>
export function backupCounts(backup: HealthBackup): BackupCounts {
  return Object.fromEntries(BACKUP_TABLES.map(k=>[k,backup.tables[k].length])) as BackupCounts
}

function invalid(field:string,reason:string):never { throw new Error('Backup: '+field+': '+reason) }
function obj(raw:unknown,field:string):Record<string,unknown>{
  if(!raw||typeof raw!=='object'||Array.isArray(raw)||Object.getPrototypeOf(raw)!==Object.prototype)
    invalid(field,'expected plain object')
  return raw as Record<string,unknown>
}
function shape(raw:unknown,field:string,allowed:readonly string[],required:readonly string[]=[]){
  const record=obj(raw,field)
  for(const k of Object.keys(record))if(!allowed.includes(k))invalid(field,'unexpected field '+k)
  for(const k of required)if(!Object.hasOwn(record,k))invalid(field,'missing '+k)
  return record
}
function text(raw:unknown,field:string,max=500,optional=false){
  if(optional&&(raw===null||raw===undefined))return
  if(typeof raw!=='string'||!raw.trim()||raw.length>max)invalid(field,'invalid text')
}
function numeric(raw:unknown,field:string,min:number,max:number,optional=false){
  if(optional&&(raw===null||raw===undefined))return
  if(typeof raw!=='number'||!Number.isFinite(raw)||raw<min||raw>max)invalid(field,'invalid number')
}
function day(raw:unknown,field:string){
  text(raw,field,10)
  try {assertLocalDay(raw as string)} catch {invalid(field,'invalid local date')}
}
function iso(raw:unknown,field:string){
  text(raw,field,28)
  const s=raw as string
  if(!/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}(?:\.\d{1,3})?Z$/.test(s))
    invalid(field,'expected UTC ISO timestamp')
  const d=new Date(s)
  if(!Number.isFinite(d.getTime())||d.getUTCFullYear()<1900||d.getUTCFullYear()>2100||
    d.toISOString().slice(0,19)!==s.slice(0,19))invalid(field,'impossible timestamp')
}
function choice(raw:unknown,field:string,choices:readonly string[],optional=false){
  if(optional&&(raw===null||raw===undefined))return
  if(typeof raw!=='string'||!choices.includes(raw))invalid(field,'unknown option')
}
function common(record:Record<string,unknown>,field:string){
  text(record.id,field+'.id',128)
  iso(record.createdAt,field+'.createdAt');iso(record.updatedAt,field+'.updatedAt')
}
const nutrients=[
  'energyKcal','proteinG','carbohydratesG','fatG',
  'saturatedFatG','fiberG','sugarsG','sodiumMg','potassiumMg'
]
const nutrientLimits:Record<string,number>={
  energyKcal:15000,proteinG:2000,carbohydratesG:3000,fatG:2000,
  saturatedFatG:2000,fiberG:1000,sugarsG:3000,sodiumMg:100000,potassiumMg:100000
}
function nutrition(raw:unknown,field:string){
  const r=shape(raw,field,nutrients,nutrients.filter(k=>k!=='potassiumMg'))
  for(const k of nutrients)numeric(r[k],field+'.'+k,0,nutrientLimits[k]!,true)
}
const units=['g','oz','ml','fl-oz','piece','serving']
function basis(raw:unknown,field:string){
  const r=shape(raw,field,['quantity','unit'],['quantity','unit'])
  numeric(r.quantity,field+'.quantity',0.000001,100000)
  choice(r.unit,field+'.unit',units)
  validatePortion(r.quantity as number,r.unit as FoodEntry['unit'])
}
const dates=['createdAt','updatedAt']
const goalTargets=['energyKcal','proteinG','carbohydratesG','fatG','fiberG','sodiumMg','fluidMl','activityMinutes']
const targetMax:Record<string,number>={
  energyKcal:15000,proteinG:1000,carbohydratesG:2000,fatG:1000,
  fiberG:500,sodiumMg:50000,fluidMl:30000,activityMinutes:1440
}
const rules=['energyAlignedPercent','energyAttentionPercent','minimumLargeDeviationPercent','sodiumLargeDeviationPercent']
/** Narrow, finite snapshot validation: never trust an arbitrary JSON payload in local backups. */
function validateArchivedSnapshot(raw: unknown, field: string, reviewDay: string) {
  const s = shape(raw, field, ['version', 'summary', 'profile', 'comparisonLimits', 'week'],
    ['version', 'summary', 'profile', 'comparisonLimits', 'week'])
  if (s.version !== 1) invalid(field, 'unsupported locked-day snapshot version')
  validateRecord('profiles', s.profile, field + '.profile')
  const limits = shape(s.comparisonLimits, field + '.comparisonLimits',
    ['carbohydratesG','sugarsG','sodiumMg'], ['carbohydratesG','sugarsG','sodiumMg'])
  numeric(limits.carbohydratesG, field + '.carbohydratesG', 0.1, 2000, true)
  numeric(limits.sugarsG, field + '.sugarsG', 0.1, 3000, true)
  numeric(limits.sodiumMg, field + '.sodiumMg', 1, 100000, true)
  const summary = shape(s.summary, field + '.summary',
    ['dayKey','intake','activity','expenditure','evaluation','recordedWeightKg','entryCount'],
    ['dayKey','intake','activity','expenditure','evaluation','recordedWeightKg','entryCount'])
  if (summary.dayKey !== reviewDay) invalid(field, 'snapshot date does not match review date')
  numeric(summary.recordedWeightKg, field + '.recordedWeightKg', 10, 500, true)
  numeric(summary.entryCount, field + '.entryCount', 0, 100000)
  const evalResult = shape(summary.evaluation, field + '.evaluation',
    ['status','isComplete','isAssessable','assessedRuleCount','expectedRuleCount','results',
      'keyObservations','calculatedAt','evaluationRuleVersion','ruleSettings'],
    ['status','isComplete','isAssessable','assessedRuleCount','expectedRuleCount','results',
      'keyObservations','calculatedAt','evaluationRuleVersion','ruleSettings'])
  choice(evalResult.status, field + '.status', ['onTarget','mixed','offTarget','incomplete'])
  if (evalResult.isComplete !== true || typeof evalResult.isAssessable !== 'boolean') {
    invalid(field, 'completed snapshot needs an explicit assessability flag')
  }
  numeric(evalResult.assessedRuleCount, field + '.assessedRuleCount', 0, 10)
  numeric(evalResult.expectedRuleCount, field + '.expectedRuleCount', 0, 10)
  iso(evalResult.calculatedAt, field + '.calculatedAt')
  text(evalResult.evaluationRuleVersion, field + '.evaluationRuleVersion', 30)
  const ruleSettings = shape(evalResult.ruleSettings,field + '.ruleSettings',rules,rules)
  for (const k of rules) numeric(ruleSettings[k],field + '.' + k,0,100)
  if(!Array.isArray(evalResult.results)||evalResult.results.length>10)invalid(field,'invalid rule results')
  for (const [i, result] of evalResult.results.entries()) {
    const r = shape(result, field + '.results[' + i + ']',
      ['code','state','label','explanation','actual','target','unit','source'],
      ['code','state','label','explanation','actual','target','unit','source'])
    text(r.code,field+'.code',150)
    choice(r.state,field+'.state',['pass','attention','significantDeviation','notEvaluated'])
    text(r.label,field+'.label',150)
    text(r.explanation,field+'.explanation',1000)
    numeric(r.actual,field+'.actual',0,10000000,true)
    numeric(r.target,field+'.target',0,10000000,true)
    if(typeof r.unit!=='string'||r.unit.length>16)invalid(field,'invalid result unit')
    choice(r.source,field+'.source',['recorded','userTarget'])
  }
  if (!Array.isArray(evalResult.keyObservations) || evalResult.keyObservations.length > 10) {
    invalid(field, 'invalid archived observations')
  }
  for (const [i, item] of evalResult.keyObservations.entries()) text(item,field+'.observation['+i+']',1000)

  // The archived totals and estimates are structured aggregates; verify finite
  // numeric leaves and bounded depth/size to avoid corrupted or malicious input.
  function safeValue(value: unknown, label: string, depth = 0): void {
    if(depth > 12) invalid(label,'snapshot nesting exceeds supported depth')
    if(value === null || value === undefined || typeof value === 'boolean') return
    if(typeof value === 'number') {
      if(!Number.isFinite(value))invalid(label,'non-finite number'); return
    }
    if(typeof value === 'string') {
      if(value.length > 2000)invalid(label,'oversized text'); return
    }
    if(Array.isArray(value)) {
      if(value.length>100)invalid(label,'oversized array')
      value.forEach((x,i)=>safeValue(x,label+'['+i+']',depth+1))
      return
    }
    const o = obj(value,label)
    if(Object.keys(o).length>50)invalid(label,'oversized object')
    for (const [k,v] of Object.entries(o)) safeValue(v,label+'.'+k,depth+1)
  }
  safeValue(summary.intake,field+'.intake')
  safeValue(summary.activity,field+'.activity')
  safeValue(summary.expenditure,field+'.expenditure')
  safeValue(s.week,field+'.week')
}

function validateRecord(table:BackupTableName,raw:unknown,field:string){
  if(table==='profiles'){
    const r=shape(raw,field,[
      'id','birthDate','ageYears','ageAsOf','heightCm','sexForEquation','activityLevel',
      'backgroundActivityMultiplier','goal','units',...dates
    ],['id','birthDate','heightCm','activityLevel','goal','units',...dates])
    common(r,field)
    if(r.id!=='primary')invalid(field,'unexpected profile ID')
    if(r.birthDate!==null)day(r.birthDate,field+'.birthDate')
    numeric(r.ageYears,field+'.ageYears',0,120,true)
    if(r.ageYears!=null&&!Number.isInteger(r.ageYears))invalid(field,'fractional age')
    if(r.ageAsOf!=null)day(r.ageAsOf,field+'.ageAsOf')
    numeric(r.heightCm,field+'.heightCm',50,260,true)
    choice(r.sexForEquation,field+'.sexForEquation',['male','female'],true)
    choice(r.activityLevel,field+'.activityLevel',['sedentary','light','moderate','high','very-high'],true)
    choice(r.goal,field+'.goal',['maintain','lose','gain','general-wellness'],true)
    numeric(r.backgroundActivityMultiplier,field+'.backgroundActivityMultiplier',1,1.6,true)
    const u=shape(r.units,field+'.units',['mass','height','fluid'],['mass','height','fluid'])
    choice(u.mass,field+'.units.mass',['kg','lb']);choice(u.height,field+'.units.height',['cm','ft-in'])
    choice(u.fluid,field+'.units.fluid',['ml','fl-oz'])
  } else if(table==='goalPeriods'){
    const r=shape(raw,field,['id','effectiveFrom','goalType','targetWeightKg','ruleSettings','targets','createdAt'],
      ['id','effectiveFrom','targets','createdAt'])
    text(r.id,field+'.id',128);day(r.effectiveFrom,field+'.effectiveFrom');iso(r.createdAt,field+'.createdAt')
    choice(r.goalType,field+'.goalType',['maintain','lose','gain','general-wellness'],true)
    numeric(r.targetWeightKg,field+'.targetWeightKg',10,500,true)
    const t=shape(r.targets,field+'.targets',goalTargets,goalTargets)
    for(const k of goalTargets)numeric(t[k],field+'.targets.'+k,k==='energyKcal'?1:0,targetMax[k]!,true)
    if(r.ruleSettings!==undefined){
      const s=shape(r.ruleSettings,field+'.ruleSettings',rules,rules)
      numeric(s.energyAlignedPercent,field+'.energyAlignedPercent',5,30)
      numeric(s.energyAttentionPercent,field+'.energyAttentionPercent',15,60)
      if((s.energyAttentionPercent as number)<=(s.energyAlignedPercent as number))invalid(field,'invalid alignment bands')
      numeric(s.minimumLargeDeviationPercent,field+'.minimumLargeDeviationPercent',10,80)
      numeric(s.sodiumLargeDeviationPercent,field+'.sodiumLargeDeviationPercent',10,70)
    }
  } else if(table==='savedFoods'){
    const r=shape(raw,field,[
      'id','name','brand','labelBasis','nutrientsPerBasis','kind','servingDescription',
      'fluidMlPerBasis','isFavorite',...dates
    ],['id','name','brand','labelBasis','nutrientsPerBasis',...dates])
    common(r,field);text(r.name,field+'.name',150);text(r.brand,field+'.brand',150,true)
    basis(r.labelBasis,field+'.labelBasis');nutrition(r.nutrientsPerBasis,field+'.nutrientsPerBasis')
    choice(r.kind,field+'.kind',['food','beverage'],true)
    text(r.servingDescription,field+'.servingDescription',150,true)
    numeric(r.fluidMlPerBasis,field+'.fluidMlPerBasis',0,30000,true)
    if(r.isFavorite!==undefined&&typeof r.isFavorite!=='boolean')invalid(field,'invalid favorite')
  } else if(table==='foodEntries'){
    const r=shape(raw,field,[
      'id','dayKey','recordedAt','kind','beverageType','meal','name','savedFoodId',
      'quantity','unit','labelBasis','nutrientsSnapshot','referenceNutrientsSnapshot',
      'servingDescription','fluidMl','nutritionSource',...dates
    ],['id','dayKey','recordedAt','kind','name','savedFoodId','quantity','unit','labelBasis','nutrientsSnapshot','fluidMl',...dates])
    common(r,field);day(r.dayKey,field+'.dayKey');iso(r.recordedAt,field+'.recordedAt')
    choice(r.kind,field+'.kind',['food','beverage']);choice(r.beverageType,field+'.beverageType',['water','other'],true)
    choice(r.meal,field+'.meal',['breakfast','lunch','dinner','snack'],true)
    text(r.name,field+'.name',150);text(r.savedFoodId,field+'.savedFoodId',128,true)
    numeric(r.quantity,field+'.quantity',0.000001,100000);choice(r.unit,field+'.unit',units)
    basis(r.labelBasis,field+'.labelBasis')
    portionRatio(r.labelBasis as FoodEntry['labelBasis'],r.quantity as number,r.unit as FoodEntry['unit'])
    if(r.nutritionSource!==undefined&&r.nutritionSource!==null){
      const origin=obj(r.nutritionSource,field+'.nutritionSource')
      if(origin.provider==='open-food-facts'){
        shape(origin,field+'.nutritionSource',
          ['provider','productCode','fetchedAt'],['provider','productCode','fetchedAt'])
        text(origin.productCode,field+'.nutritionSource.productCode',14)
        if(!/^\d{8,14}$/.test(origin.productCode as string))invalid(field+'.nutritionSource.productCode','invalid barcode')
        iso(origin.fetchedAt,field+'.nutritionSource.fetchedAt')
      }else if(origin.provider==='usda-sr-legacy'||origin.provider==='usda-foundation'){
        shape(origin,field+'.nutritionSource',
          ['provider','fdcId','release'],['provider','fdcId','release'])
        numeric(origin.fdcId,field+'.nutritionSource.fdcId',1,999999999)
        if(!Number.isSafeInteger(origin.fdcId))invalid(field+'.nutritionSource.fdcId','invalid food ID')
        if(origin.release!==(origin.provider==='usda-foundation'?'2026-04':'2018-04')){
          invalid(field+'.nutritionSource.release','unsupported USDA release')
        }
      }else invalid(field+'.nutritionSource','unsupported provider')
    }
    nutrition(r.nutrientsSnapshot,field+'.nutrientsSnapshot')
    if(r.referenceNutrientsSnapshot!==undefined) {
      nutrition(r.referenceNutrientsSnapshot,field+'.referenceNutrientsSnapshot')
      // Each new-format log includes the original label. Its consumed snapshot
      // must match that immutable reference and quantity, not merely be nonnegative.
      const expected=scaleNutrition(
        r.referenceNutrientsSnapshot as FoodEntry['nutrientsSnapshot'],
        r.labelBasis as FoodEntry['labelBasis'],
        r.quantity as number, r.unit as FoodEntry['unit']
      )
      const consumed=r.nutrientsSnapshot as FoodEntry['nutrientsSnapshot']
      for(const nutrient of nutrients){
        const stored=consumed[nutrient as keyof typeof consumed] ?? null
        const calculated=expected[nutrient as keyof typeof expected] ?? null
        if((stored===null)!==(calculated===null) ||
          (stored!==null&&calculated!==null&&
            Math.abs(stored-calculated)>0.000001*Math.max(1,Math.abs(calculated)))) {
          invalid(field+'.nutrientsSnapshot.'+nutrient,'does not match original label snapshot and portion')
        }
      }
    }
    text(r.servingDescription,field+'.servingDescription',150,true)
    numeric(r.fluidMl,field+'.fluidMl',0,30000,true)
    if(r.kind==='food'&&r.fluidMl!=null)invalid(field,'solid food must not contain beverage fluid volume')
    if(r.beverageType==='water'&&(r.kind!=='beverage'||(r.nutrientsSnapshot as FoodEntry['nutrientsSnapshot']).energyKcal!==0))
      invalid(field,'water must have known zero kcal')
  } else if(table==='exerciseEntries'){
    const r=shape(raw,field,[
      'id','dayKey','startedAt','activity','durationMinutes','distanceKm','speedKmh','inclinePercent','intensity','estimatedEnergyKcal',
      'estimationMethod','met','isStrengthTraining','timeOfDay','notes',...dates
    ],['id','dayKey','startedAt','activity','durationMinutes','intensity','estimatedEnergyKcal','estimationMethod',...dates])
    common(r,field);day(r.dayKey,field+'.dayKey');iso(r.startedAt,field+'.startedAt')
    text(r.activity,field+'.activity',120)
    numeric(r.durationMinutes,field+'.durationMinutes',0.000001,1440,true)
    numeric(r.distanceKm,field+'.distanceKm',0.000001,300,true)
    const walkRun=r.activity==='Walking'||r.activity==='Running'
    if(r.distanceKm!=null&&!walkRun)invalid(field,'distance supported only for walking/running')
    const speed=r.speedKmh
    const grade=r.inclinePercent
    if(speed!=null){
      if(!walkRun)invalid(field,'speed supported only for walking/running')
      numeric(speed,field+'.speedKmh',r.activity==='Walking'?2:6,r.activity==='Walking'?8:25)
    }
    if(grade!=null){
      if(!walkRun)invalid(field,'incline supported only for walking/running')
      numeric(grade,field+'.inclinePercent',0,MAX_INCLINE_PERCENT)
    }
    if(r.durationMinutes==null&&(!walkRun||r.distanceKm==null))invalid(field,'duration or walking/running distance required')
    choice(r.intensity,field+'.intensity',['light','moderate','vigorous'],true)
    choice(r.estimationMethod,field+'.estimationMethod',['unknown','metNet','manualActive','distanceNet','activityTimeNet','paceGradeNet'],true)
    numeric(r.estimatedEnergyKcal,field+'.estimatedEnergyKcal',0,6000,true)
    numeric(r.met,field+'.met',1,25,true)
    if(r.estimationMethod==='manualActive'&&r.estimatedEnergyKcal==null)invalid(field,'manual active kcal missing')
    if(r.estimationMethod==='metNet'&&(r.met==null||r.durationMinutes==null))invalid(field,'MET and duration required')
    if(r.estimationMethod==='manualActive'&&r.met!=null)invalid(field,'manual active kcal cannot also contain a MET')
    if(r.estimationMethod==='metNet'&&r.estimatedEnergyKcal!=null)invalid(field,'MET method cannot also store manual kcal')
    if(r.estimationMethod==='paceGradeNet'&&!walkRun)invalid(field,'pace/grade method supports walking/running only')
    if(r.estimationMethod==='distanceNet'&&(!walkRun||r.distanceKm==null))invalid(field,'distance method needs walking/running distance')
    if(r.estimationMethod==='activityTimeNet'&&(!walkRun||r.durationMinutes==null||r.distanceKm!=null))invalid(field,'time method needs walking/running duration without distance')
    if((r.estimationMethod==='distanceNet'||r.estimationMethod==='activityTimeNet'||r.estimationMethod==='paceGradeNet')&&(r.met!=null||r.estimatedEnergyKcal!=null))invalid(field,'automatic method cannot store MET or manual kcal')
    if(r.estimationMethod==='unknown'&&(r.met!=null||r.estimatedEnergyKcal!=null))invalid(field,'unknown energy method cannot contain an energy figure')
    if(r.isStrengthTraining!==undefined&&typeof r.isStrengthTraining!=='boolean')invalid(field,'invalid strength flag')
    if(r.timeOfDay!=null&&!/^(?:[01]\d|2[0-3]):[0-5]\d$/.test(r.timeOfDay as string))invalid(field,'invalid time')
    text(r.notes,field+'.notes',500,true)
  } else if(table==='weightEntries'){
    const r=shape(raw,field,['id','dayKey','recordedAt','weightKg',...dates],
      ['id','dayKey','recordedAt','weightKg',...dates])
    common(r,field);day(r.dayKey,field+'.dayKey');iso(r.recordedAt,field+'.recordedAt')
    numeric(r.weightKg,field+'.weightKg',10,500)
  } else if(table==='dayReviews'){
    const r=shape(raw,field,['dayKey','isComplete','markedAt','note','updatedAt','frozen'],
      ['dayKey','isComplete','markedAt'])
    day(r.dayKey,field+'.dayKey')
    if(typeof r.isComplete!=='boolean')invalid(field,'invalid completion flag')
    if(r.markedAt!==null)iso(r.markedAt,field+'.markedAt')
    if(r.isComplete&&r.markedAt===null)invalid(field,'complete day missing timestamp')
    if(r.frozen!==undefined&&r.frozen!==null) {
      if(!r.isComplete)invalid(field,'reopened day cannot carry a locked snapshot')
      validateArchivedSnapshot(r.frozen, field+'.frozen', r.dayKey as string)
    }
    text(r.note,field+'.note',500,true)
    if(r.updatedAt!==undefined)iso(r.updatedAt,field+'.updatedAt')
  } else {
    const r=shape(raw,field,
      ['id','waterPresetsMl','carbohydrateLimitG','sugarLimitG','sodiumLimitMg','updatedAt'],
      ['id','waterPresetsMl','updatedAt'])
    if(r.id!=='local')invalid(field,'unexpected settings id')
    if(!Array.isArray(r.waterPresetsMl)||r.waterPresetsMl.length!==4)invalid(field,'four presets required')
    const amounts=r.waterPresetsMl as unknown[]
    for(const x of amounts)numeric(x,field+'.waterPresetsMl',25,3000)
    if(new Set(amounts).size!==4)invalid(field,'duplicate presets')
    numeric(r.carbohydrateLimitG,field+'.carbohydrateLimitG',0.1,2000,true)
    numeric(r.sugarLimitG,field+'.sugarLimitG',0.1,3000,true)
    numeric(r.sodiumLimitMg,field+'.sodiumLimitMg',1,100000,true)
    iso(r.updatedAt,field+'.updatedAt')
  }
}

export function validateBackup(raw:unknown):HealthBackup {
  const root=shape(raw,'root',['formatVersion','exportedAt','app','tables'],
    ['formatVersion','exportedAt','app','tables'])
  if(root.formatVersion!==BACKUP_FORMAT_VERSION)invalid('formatVersion','unsupported backup version')
  iso(root.exportedAt,'exportedAt')
  const app=shape(root.app,'app',['name','version','schemaVersion'],['name','version','schemaVersion'])
  if(app.name!=='health-tracker'||(app.schemaVersion!==2&&app.schemaVersion!==3))invalid('app','unsupported application or database version')
  text(app.version,'app.version',32)
  const tables=shape(root.tables,'tables',BACKUP_TABLES,BACKUP_TABLES)
  for(const table of BACKUP_TABLES){
    const rows=tables[table]
    if(!Array.isArray(rows)||rows.length>BACKUP_MAX_ROWS)invalid(table,'invalid or oversized array')
    const identifiers=new Set<string>()
    const dated=new Set<string>()
    rows.forEach((row,index)=>{
      const label=table+'['+index+']'
      validateRecord(table,row,label)
      const value=obj(row,label)
      const key=(table==='dayReviews'?value.dayKey:value.id) as string
      if(identifiers.has(key))invalid(table,'duplicate primary key')
      identifiers.add(key)
      if(table==='weightEntries'||table==='goalPeriods'){
        const date=(table==='weightEntries'?value.dayKey:value.effectiveFrom) as string
        if(dated.has(date))invalid(table,'duplicate dated measurement or goal')
        dated.add(date)
      }
    })
    if((table==='profiles'||table==='appSettings')&&rows.length>1)invalid(table,'duplicate singleton')
  }
  return raw as HealthBackup
}
export function parseBackupJson(json:string):HealthBackup {
  if(new TextEncoder().encode(json).length>BACKUP_MAX_BYTES)invalid('file','exceeds 25 MiB')
  let raw:unknown
  try {raw=JSON.parse(json) as unknown}
  catch {return invalid('file','malformed JSON')}
  return validateBackup(raw)
}
