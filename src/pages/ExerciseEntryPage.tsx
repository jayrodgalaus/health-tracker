import { useState } from 'react'
import { useLiveQuery } from 'dexie-react-hooks'
import { Link, useNavigate, useSearchParams } from 'react-router-dom'
import { db } from '../db/database'
import type { Profile } from '../domain/models'
import { deleteExercise } from '../data/exerciseRepository'
import { readDayLocked } from '../data/dayRepository'
import { PageInfoLink } from '../components/PageInfoLink'
import { useToast } from '../components/ToastProvider'
import { ExerciseForm } from '../features/exercise/ExerciseLog'
import { selectedLogDay } from '../lib/logDate'

export function ExerciseEntryPage({profile}: {profile:Profile}) {
  const navigate=useNavigate()
  const toast=useToast()
  const [params]=useSearchParams()
  const dayKey=selectedLogDay(params.get('date'))
  const editId=params.get('edit')
  const entry=useLiveQuery(async()=>editId?await db.exerciseEntries.get(editId):null,[editId],undefined)
  const editingDay=entry?.dayKey??dayKey
  const locked=useLiveQuery(()=>readDayLocked(editingDay),[editingDay],undefined)
  const [confirmDelete,setConfirmDelete]=useState(false)
  const [busy,setBusy]=useState(false)
  const [error,setError]=useState('')
  const back='/log?date='+encodeURIComponent(dayKey)
  function done(date:string) {
    toast.success(editId?'Exercise updated.':'Exercise saved.')
    navigate(editId?'/calendar/'+date:'/log?date='+encodeURIComponent(date),{replace:true})
  }
  async function remove() {
    if(!editId)return
    setBusy(true);setError('')
    try{await deleteExercise(editId);toast.success('Exercise deleted.');navigate('/calendar/'+dayKey,{replace:true})}
    catch(cause){setError(cause instanceof Error?cause.message:'Could not delete exercise.')}
    finally{setBusy(false)}
  }
  if(editId&&entry===undefined)return <p role="status">Loading exercise…</p>
  if(editId&&!entry)return <div className="space-y-3">
    <p role="alert" className="rounded-xl bg-rose-50 p-4 text-rose-900">This exercise entry is unavailable.</p>
    <Link to={back} className="font-semibold text-evergreen-700 underline">Back to Log</Link>
  </div>
  if (locked === undefined) return <p role="status" className="rounded-xl bg-white p-4">Checking day status…</p>
  if (locked) return <section aria-label="Locked day" className="space-y-3 rounded-2xl border border-slate-200 bg-white p-5">
    <h1 className="text-xl font-bold">Completed day · Read only</h1>
    <p className="text-sm text-slate-600">Reopen this date from its Calendar details to add, change, or delete exercise.</p>
    <Link className="inline-flex min-h-11 items-center font-semibold text-evergreen-700 underline" to={'/calendar/'+editingDay}>View locked day</Link>
  </section>
  return <div className="space-y-6">
    <header>
      <PageInfoLink topic="exercise" />
      <Link className="inline-flex min-h-11 items-center text-sm font-semibold text-evergreen-700 underline"
        to={editId?'/calendar/'+dayKey:back}>‹ {editId?'Back to Calendar':'Back to Log'}</Link>
      <h1 className="mt-3 text-3xl font-bold">{editId?'Edit exercise':'Add exercise'}</h1>
    </header>
    <ExerciseForm key={editId??'new'} profile={profile} selectedDay={entry?.dayKey??dayKey}
      editing={entry??undefined}
      onSaved={done} onCancel={()=>navigate(editId?'/calendar/'+dayKey:back)} />
    {editId&&<section className="space-y-3">
      <button type="button" onClick={()=>setConfirmDelete(true)}
        className="min-h-11 rounded-xl border border-rose-300 px-4 text-sm font-semibold text-rose-800">Delete exercise</button>
      {confirmDelete&&<div className="rounded-xl border border-rose-200 bg-rose-50 p-4 text-sm">
        <p>Delete this exercise entry? This cannot be undone.</p>
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
