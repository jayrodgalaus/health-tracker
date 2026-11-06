import { useState, type ChangeEvent } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { useLiveQuery } from 'dexie-react-hooks'
import { BACKUP_MAX_BYTES, BACKUP_TABLES, backupCounts, parseBackupJson, type HealthBackup } from '../domain/backup'
import { countLocalRecords, deleteAllLocalRecords, readLocalBackup, replaceLocalData } from '../data/backupRepository'
import { toLocalDay } from '../lib/localDate'

const titles: Record<(typeof BACKUP_TABLES)[number], string> = {
  profiles:'Profiles', goalPeriods:'Dated goal periods', savedFoods:'Saved foods / drinks',
  foodEntries:'Food / drink entries', exerciseEntries:'Exercise entries',
  weightEntries:'Dated weight measurements', dayReviews:'Day completion reviews',
  appSettings:'Local preferences'
}
const action='min-h-11 rounded-xl px-4 py-2 text-sm font-semibold disabled:opacity-50'
const readable=(iso:string)=>new Date(iso).toLocaleString(undefined,{dateStyle:'medium',timeStyle:'short'})

export function DataPage() {
  const navigate = useNavigate()
  const counts = useLiveQuery(() => countLocalRecords(), [], undefined)
  const [preview,setPreview]=useState<HealthBackup|null>(null)
  const [exportPreview,setExportPreview]=useState<HealthBackup|null>(null)
  const [filename,setFilename]=useState('')
  const [confirmReplace,setConfirmReplace]=useState('')
  const [confirmReset,setConfirmReset]=useState('')
  const [resetExpanded,setResetExpanded]=useState(false)
  const [busy,setBusy]=useState(false)
  const [error,setError]=useState('')
  const [notice,setNotice]=useState('')

  async function prepareExport() {
    setBusy(true);setError('');setNotice('');setExportPreview(null)
    try {
      const backup=await readLocalBackup()
      const json=JSON.stringify(backup,null,2)
      if(new TextEncoder().encode(json).length>BACKUP_MAX_BYTES)throw new Error('Backup exceeds the supported 25 MiB size; no file was created.')
      setExportPreview(backup)
      setNotice('Export preview ready. Review its record counts and timestamp, then download the file.')
    } catch(cause) {
      setError(cause instanceof Error?cause.message:'Could not prepare your local export.')
    } finally {setBusy(false)}
  }

  async function exportFile() {
    if(!exportPreview)return
    setBusy(true);setError('');setNotice('')
    try {
      const backup=exportPreview
      const json=JSON.stringify(backup,null,2)
      if(new TextEncoder().encode(json).length>BACKUP_MAX_BYTES)throw new Error('Backup exceeds the supported 25 MiB size; no file was created.')
      const blob=new Blob([json],{type:'application/json'})
      const url=URL.createObjectURL(blob)
      const link=document.createElement('a')
      link.href=url
      link.download='health-tracker-backup-'+toLocalDay(new Date())+'.json'
      document.body.appendChild(link)
      link.click()
      link.remove()
      window.setTimeout(()=>URL.revokeObjectURL(url),3000)
      setNotice('Backup download requested for '+readable(backup.exportedAt)+'. Confirm the file is saved before resetting your data.')
    } catch(cause) {
      setError(cause instanceof Error?cause.message:'Could not export your local data.')
    } finally {setBusy(false)}
  }

  async function selectedFile(event:ChangeEvent<HTMLInputElement>){
    setPreview(null);setFilename('');setConfirmReplace('');setError('');setNotice('')
    const file=event.target.files?.[0]
    if(!file)return
    setBusy(true)
    try {
      if(file.size>BACKUP_MAX_BYTES)throw new Error('Backup file is over the 25 MiB limit.')
      const text=await file.text()
      const validated=parseBackupJson(text)
      setPreview(validated)
      setFilename(file.name)
    } catch(cause) {
      setError(cause instanceof Error?cause.message:'Could not open or validate the backup file.')
    } finally {
      setBusy(false)
      event.target.value=''
    }
  }

  async function restore() {
    if(!preview||confirmReplace!=='REPLACE')return
    setBusy(true);setError('');setNotice('')
    try {
      const counts=await replaceLocalData(preview)
      setPreview(null);setConfirmReplace('');setExportPreview(null)
      const total=Object.values(counts).reduce((sum,value)=>sum+value,0)
      setNotice('Successfully restored '+total+' records on this device. No records were uploaded.')
      navigate('/today')
    } catch(cause) {
      setError(cause instanceof Error?cause.message:'Restore failed. Existing records should remain unchanged.')
    } finally {setBusy(false)}
  }

  async function reset() {
    if(confirmReset!=='DELETE')return
    setBusy(true);setError('');setNotice('')
    try {
      await deleteAllLocalRecords()
      setResetExpanded(false);setConfirmReset('');setExportPreview(null)
      setNotice('All browser-local Health Tracker records were deleted. Start again with a new profile.')
      navigate('/onboarding')
    } catch(cause) {
      setError(cause instanceof Error?cause.message:'Could not delete local records; no reset was confirmed.')
    } finally {setBusy(false)}
  }

  const localTotal=counts?Object.values(counts).reduce((sum,count)=>sum+count,0):0
  const importCounts=preview?backupCounts(preview):null
  return <div className="space-y-8">
    <header>
      <Link to="/settings" className="text-sm font-semibold text-evergreen-700 underline">Back to Settings</Link>
      <p className="mt-5 text-sm font-semibold uppercase tracking-wide text-evergreen-700">Settings · Data and privacy</p>
      <h1 className="mt-2 text-3xl font-bold">Your local records</h1>
      <p className="mt-3 text-sm leading-6 text-slate-600">Your data stays in this browser's IndexedDB. A backup is a portable JSON file and is not automatically encrypted or synced anywhere.</p>
    </header>

    {error&&<p role="alert" className="rounded-xl bg-rose-50 p-4 text-sm text-rose-900">{error}</p>}
    {notice&&<p role="status" className="rounded-xl bg-emerald-50 p-4 text-sm text-emerald-900">{notice}</p>}

    <section aria-labelledby="local-data-title" className="space-y-3 rounded-2xl border border-slate-200 bg-white p-5">
      <h2 id="local-data-title" className="text-xl font-bold">Local storage status</h2>
      {counts===undefined?<p role="status" className="text-sm text-slate-600">Reading browser records…</p>:<>
        <p className="text-sm font-semibold">IndexedDB available · {localTotal} stored records</p>
        <dl className="grid grid-cols-2 gap-3 text-sm sm:grid-cols-4">
          {BACKUP_TABLES.map(key=><div key={key}><dt className="text-xs text-slate-600">{titles[key]}</dt><dd className="mt-1 font-semibold">{counts[key]}</dd></div>)}
        </dl>
      </>}
      <p className="text-xs leading-5 text-slate-600">Clearing browser data, switching origin, losing this device or deleting the browser profile can erase these records. Back up regularly and store the file in a secure location.</p>
    </section>

    <section aria-labelledby="export-heading" className="space-y-3 rounded-2xl border border-slate-200 bg-white p-5">
      <h2 id="export-heading" className="text-xl font-bold">1. Export backup</h2>
      <p className="text-sm leading-6 text-slate-600">
        Download all eight local tables as a self-contained JSON file.
        It includes dated food, drinks, exercise, weights, targets, saved labels,
        profile details, day reviews and preferences. The file contains sensitive lifestyle
        information: keep it private. No password or encryption is added automatically.
      </p>
      <button type="button" disabled={busy} className={action+' bg-evergreen-600 text-white'} onClick={()=>{void prepareExport()}}>
        {exportPreview?'Refresh export preview':'Prepare export preview'}
      </button>
      {exportPreview&&<div className="space-y-3 rounded-xl border border-emerald-200 bg-emerald-50 p-4">
        <h3 className="font-semibold">Ready to export · {readable(exportPreview.exportedAt)}</h3>
        <p className="text-xs text-slate-700">This downloadable snapshot is fixed at the preparation time above. If you log more data, refresh the preview before exporting.</p>
        <dl className="grid grid-cols-2 gap-3 text-sm sm:grid-cols-4">
          {BACKUP_TABLES.map(key=><div key={key}>
            <dt className="text-xs text-slate-600">{titles[key]}</dt>
            <dd className="font-semibold">{backupCounts(exportPreview)[key]}</dd>
          </div>)}
        </dl>
        <button type="button" disabled={busy} className={action+' bg-evergreen-600 text-white'} onClick={()=>{void exportFile()}}>
          Download this validated JSON backup
        </button>
      </div>}
      <p className="text-xs text-slate-600">The browser will download a file containing the exact previewed records. Confirm its filename and storage location yourself.</p>
    </section>

    <section aria-labelledby="restore-heading" className="space-y-4 rounded-2xl border border-slate-200 bg-white p-5">
      <h2 id="restore-heading" className="text-xl font-bold">2. Import backup — replace all records</h2>
      <p className="text-sm leading-6 text-slate-600">Choose a Health Tracker JSON export. The file is validated locally and its record counts appear before you confirm. Unsupported versions and malformed records are rejected without changing the current database.</p>
      <label className="block text-sm font-semibold">Choose JSON file
        <input type="file" accept=".json,application/json" disabled={busy}
          className="mt-2 block min-h-11 w-full rounded-xl border border-slate-300 bg-white p-3 text-sm"
          onChange={event=>{void selectedFile(event)}} />
      </label>
      {preview&&importCounts&&<div className="space-y-3 rounded-xl border border-amber-200 bg-amber-50 p-4">
        <h3 className="font-bold">Verified backup preview: {filename}</h3>
        <p className="text-sm">Exported: {readable(preview.exportedAt)} · Format v{preview.formatVersion} · App: {preview.app.name}</p>
        <dl className="grid grid-cols-2 gap-3 text-sm sm:grid-cols-4">
          {BACKUP_TABLES.map(key=><div key={key}><dt className="text-xs">{titles[key]}</dt><dd className="font-semibold">{importCounts[key]}</dd></div>)}
        </dl>
        <p className="text-sm font-semibold text-amber-950">Replace means all {localTotal} current local records will be overwritten by this backup. There is no merge and no undo. Export your existing dataset first and confirm its file is saved.</p>
        <label className="block text-sm font-semibold">Type REPLACE to confirm overwriting
          <input className="mt-2 block min-h-11 w-full rounded-xl border border-amber-400 bg-white px-3 text-base"
            value={confirmReplace} onChange={event=>setConfirmReplace(event.target.value)}
            autoComplete="off" placeholder="REPLACE" />
        </label>
        <div className="flex flex-wrap gap-2">
          <button type="button" disabled={busy||confirmReplace!=='REPLACE'}
            className={action+' bg-rose-700 text-white'} onClick={()=>{void restore()}}>Replace all local data</button>
          <button type="button" className={action+' border border-slate-300 bg-white'}
            onClick={()=>{setPreview(null);setConfirmReplace('')}}>Cancel</button>
        </div>
      </div>}
    </section>

    <section aria-labelledby="reset-heading" className="space-y-3 border-t-2 border-rose-200 pt-8">
      <h2 id="reset-heading" className="text-xl font-bold">Danger zone · Delete all local data</h2>
      <p className="text-sm leading-6 text-slate-700">Deleting all records is irreversible without an exported backup. It removes your profile, goals, every food and exercise entry, weight measurements, saved products, reviews and local settings from this browser.</p>
      {!resetExpanded?<button type="button" className={action+' border border-rose-300 bg-white text-rose-900'}
        onClick={()=>{setResetExpanded(true);setConfirmReset('')}}>Show deletion confirmation</button>:
        <div className="space-y-3 rounded-xl border border-rose-300 bg-rose-50 p-4">
          <p className="font-semibold text-rose-950">Export and securely save a current backup first. This permanently clears the entire local dataset.</p>
          <label className="block text-sm font-semibold">Type DELETE to confirm
            <input className="mt-2 block min-h-11 w-full rounded-xl border border-rose-300 bg-white px-3 text-base"
              value={confirmReset} autoComplete="off" onChange={event=>setConfirmReset(event.target.value)} />
          </label>
          <div className="flex flex-wrap gap-2">
            <button type="button" disabled={busy||confirmReset!=='DELETE'}
              className={action+' bg-rose-700 text-white'} onClick={()=>{void reset()}}>Permanently delete all local data</button>
            <button type="button" className={action+' border border-slate-300 bg-white'}
              onClick={()=>{setResetExpanded(false);setConfirmReset('')}}>Cancel deletion</button>
          </div>
        </div>}
    </section>
  </div>
}
