import { useState, type FormEvent } from 'react'
import { useLiveQuery } from 'dexie-react-hooks'
import { Link, useNavigate, useSearchParams } from 'react-router-dom'
import { db } from '../db/database'
import { deleteIntake, saveWater } from '../data/intakeRepository'
import { readWaterPresets } from '../data/settingsRepository'
import { PageInfoLink } from '../components/PageInfoLink'
import { FoodEntryForm } from '../features/nutrition/FoodEntryForm'
import { selectedLogDay } from '../lib/logDate'
import { toLocalDay } from '../lib/localDate'

const field='mt-1 block min-h-11 w-full rounded-xl border border-slate-300 bg-white px-3 py-2 text-base'

export function IntakeEntryPage({kind}: {kind:'food'|'beverage'}) {
  const navigate=useNavigate()
  const [params]=useSearchParams()
  const dayKey=selectedLogDay(params.get('date'))
  const editId=params.get('edit')
  const savedId=params.get('saved')
  const recentId=params.get('recent')
  const entry=useLiveQuery(()=>editId?db.foodEntries.get(editId):Promise.resolve(null),[editId],undefined)
  const saved=useLiveQuery(()=>savedId?db.savedFoods.get(savedId):Promise.resolve(null),[savedId],undefined)
  const recent=useLiveQuery(()=>recentId?db.foodEntries.get(recentId):Promise.resolve(null),[recentId],undefined)
  const waterMode=kind==='beverage' && (params.get('water')==='1'||entry?.beverageType==='water')
  const [volume,setVolume]=useState('')
  const [waterDay,setWaterDay]=useState(dayKey)
  const [busy,setBusy]=useState(false)
  const [error,setError]=useState('')
  const [confirmDelete,setConfirmDelete]=useState(false)
  const back='/log?date='+encodeURIComponent(dayKey)
  const destination=(date:string,source?:'water'|'food')=>
    editId?'/calendar/'+date:'/log?date='+encodeURIComponent(date)+'&saved='+(source??'food')+
      (source==='water'?'&volume='+encodeURIComponent(volume):'')

  function finish(date:string,source?:'water'|'food') {
    navigate(destination(date,source),{replace:true})
  }

  async function savePlainWater(event:FormEvent<HTMLFormElement>) {
    event.preventDefault()
    setBusy(true);setError('')
    try {
      const amount=Number(volume)
      if(!volume.trim()||!Number.isFinite(amount)||amount<=0)throw new Error('Enter a valid water amount.')
      await saveWater(waterDay,amount,editId??undefined)
      finish(waterDay,'water')
    }catch(cause){setError(cause instanceof Error?cause.message:'Could not log water.')}
    finally{setBusy(false)}
  }
  async function quickWater(amount:number) {
    setBusy(true);setError('')
    try{
      await saveWater(dayKey,amount)
      navigate('/log?date='+encodeURIComponent(dayKey)+'&saved=water&volume='+encodeURIComponent(amount),{replace:true})
    }catch(cause){setError(cause instanceof Error?cause.message:'Could not log water.')}
    finally{setBusy(false)}
  }
  async function remove() {
    if(!editId)return
    setBusy(true);setError('')
    try{await deleteIntake(editId);navigate('/calendar/'+dayKey,{replace:true})}
    catch(cause){setError(cause instanceof Error?cause.message:'Could not delete entry.')}
    finally{setBusy(false)}
  }

  const waterPresets=useLiveQuery(()=>readWaterPresets(),[],undefined)
  if((editId&&entry===undefined)||(savedId&&saved===undefined)||(recentId&&recent===undefined))
    return <p role="status" className="rounded-xl bg-white p-4 text-sm text-slate-600">Loading entry…</p>
  const relevantEntry=entry&&entry.kind===kind?entry:null
  if((editId&&!relevantEntry)||(savedId&&(!saved||saved.kind!==kind))||(recentId&&(!recent||recent.kind!==kind))) {
    return <div className="space-y-3">
      <p role="alert" className="rounded-xl bg-rose-50 p-4 text-rose-900">This entry is unavailable or does not match this form.</p>
      <Link to={back} className="font-semibold text-evergreen-700 underline">Back to Log</Link>
    </div>
  }
  const infoTopic=kind==='food'?'food':'log'
  return <div className="space-y-6">
    <header>
      <PageInfoLink topic={infoTopic} />
      <Link className="inline-flex min-h-11 items-center text-sm font-semibold text-evergreen-700 underline"
        to={editId?'/calendar/'+dayKey:back}>‹ {editId?'Back to Calendar':'Back to Log'}</Link>
      <h1 className="mt-3 text-3xl font-bold">{waterMode?'Log water':editId?'Edit '+(kind==='food'?'food':'drink'):kind==='food'?'Add food':'Add drink'}</h1>
    </header>

    {kind==='beverage'&&!editId&&<nav aria-label="Drink type" className="flex flex-wrap gap-2">
      <Link className="inline-flex min-h-11 items-center rounded-xl border border-evergreen-500 bg-white px-4 text-sm font-semibold text-evergreen-700"
        to={'/log/drink?date='+dayKey+(waterMode?'':'&water=1')}>
        {waterMode?'Log a different drink':'Log plain water instead'}
      </Link>
    </nav>}

    {waterMode?<section className="rounded-2xl border border-slate-200 bg-white p-5">
      <h2 className="text-lg font-bold">{editId?'Edit water':'Plain water'}</h2>
      {!editId&&<div className="mt-4 flex flex-wrap gap-2" aria-label="Quick water amounts">
        {waterPresets?.map(amount=><button key={amount} type="button" disabled={busy}
          onClick={()=>{void quickWater(amount)}} className="min-h-11 rounded-xl border border-evergreen-600 px-4 text-sm font-semibold text-evergreen-700 disabled:opacity-50">
          + {amount} ml
        </button>)}
      </div>}
      <form key={relevantEntry?.id??'new-water'} onSubmit={event=>{void savePlainWater(event)}} className="mt-4 space-y-4">
        <label className="block text-sm font-semibold">Date
          <input type="date" min="1900-01-01" max={toLocalDay(new Date())} required
            className={field} value={waterDay} onChange={event=>setWaterDay(event.target.value)} />
        </label>
        <label className="block text-sm font-semibold">Volume (ml)
          <input type="number" min="0.01" max="30000" step="any" required inputMode="decimal"
            className={field} value={volume} onChange={event=>setVolume(event.target.value)}
            placeholder={relevantEntry?.fluidMl==null?'Enter volume':String(relevantEntry.fluidMl)} />
        </label>
        <button disabled={busy} type="submit" className="min-h-11 rounded-xl bg-evergreen-600 px-5 text-sm font-semibold text-white disabled:opacity-50">{busy?'Saving…':'Save water'}</button>
      </form>
    </section>:
      <FoodEntryForm key={editId??savedId??recentId??kind}
        dayKey={relevantEntry?.dayKey??dayKey} kind={kind}
        editing={relevantEntry??undefined}
        saved={saved&&saved.kind===kind?saved:undefined}
        recent={recent&&recent.kind===kind?recent:undefined}
        onDone={date=>finish(date)}
        onCancel={()=>navigate(editId?'/calendar/'+dayKey:back)}
      />
    }

    {!editId&&!waterMode&&<Link to={'/log/saved-foods?date='+encodeURIComponent(dayKey)}
      className="inline-flex min-h-11 items-center rounded-xl border border-slate-300 bg-white px-4 text-sm font-semibold text-evergreen-700">
      Manage saved foods and drinks
    </Link>}
    {editId&&<section className="space-y-3">
      <button type="button" disabled={busy} onClick={()=>setConfirmDelete(true)}
        className="min-h-11 rounded-xl border border-rose-300 px-4 text-sm font-semibold text-rose-800">Delete entry</button>
      {confirmDelete&&<div className="rounded-xl border border-rose-200 bg-rose-50 p-4 text-sm">
        <p>Delete this logged entry? This cannot be undone.</p>
        <div className="mt-3 flex gap-2">
          <button type="button" disabled={busy} onClick={()=>{void remove()}}
            className="min-h-11 rounded-xl bg-rose-700 px-4 font-semibold text-white">Confirm delete</button>
          <button type="button" onClick={()=>setConfirmDelete(false)}
            className="min-h-11 rounded-xl border border-slate-300 px-4 font-semibold">Cancel</button>
        </div>
      </div>}
    </section>}
    {error&&<p role="alert" className="rounded-xl bg-rose-50 p-3 text-sm text-rose-900">{error}</p>}
  </div>
}
