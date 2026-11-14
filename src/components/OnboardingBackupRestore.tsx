import { useState, type ChangeEvent } from 'react'
import { useNavigate } from 'react-router-dom'
import { parseBackupJson, backupCounts, BACKUP_MAX_BYTES, type HealthBackup } from '../domain/backup'
import { replaceLocalData } from '../data/backupRepository'
import { useToast } from './ToastProvider'

/** Restores an old or new local JSON backup without creating a throwaway profile. */
export function OnboardingBackupRestore() {
  const navigate = useNavigate()
  const toast = useToast()
  const [preview, setPreview] = useState<HealthBackup | null>(null)
  const [fileName, setFileName] = useState('')
  const [confirm, setConfirm] = useState('')
  const [error, setError] = useState('')
  const [busy, setBusy] = useState(false)

  async function selectFile(event: ChangeEvent<HTMLInputElement>) {
    setPreview(null)
    setFileName('')
    setConfirm('')
    setError('')
    const file = event.target.files?.[0]
    if (!file) return
    setBusy(true)
    try {
      if (file.size > BACKUP_MAX_BYTES) throw new Error('Backup file exceeds 25 MiB.')
      const validated = parseBackupJson(await file.text())
      if (validated.tables.profiles.length !== 1) {
        throw new Error('An onboarding restore requires a backup containing a profile.')
      }
      setFileName(file.name)
      setPreview(validated)
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : 'Could not validate the backup.')
    } finally {
      setBusy(false)
      event.target.value = ''
    }
  }

  async function restore() {
    if (!preview || confirm !== 'REPLACE' || busy) return
    setBusy(true)
    setError('')
    try {
      const counts = await replaceLocalData(preview)
      toast.success('Restored ' + Object.values(counts).reduce((sum, value) => sum + value, 0) + ' records.')
      setPreview(null)
      setConfirm('')
      navigate('/today', { replace: true })
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : 'Could not restore backup.')
    } finally {
      setBusy(false)
    }
  }

  return <section className="rounded-2xl border border-slate-200 bg-white p-4">
    <details>
      <summary className="min-h-11 cursor-pointer py-2 text-base font-bold text-evergreen-700">
        Import existing JSON backup
      </summary>
      <div className="space-y-3 pt-3">
        <label className="block text-sm font-semibold">Choose JSON backup
          <input type="file" accept=".json,application/json" disabled={busy}
            onChange={event => { void selectFile(event) }}
            className="mt-2 block min-h-12 w-full min-w-0 rounded-xl border border-slate-300 bg-white p-3 text-sm" />
        </label>
        {error && <p role="alert" className="rounded-xl bg-rose-50 p-3 text-sm text-rose-900">{error}</p>}
        {preview && <div className="space-y-3 rounded-xl border border-amber-200 bg-amber-50 p-3">
          <p className="text-sm font-semibold">Verified backup: {fileName}</p>
          <p className="text-sm">Format v{preview.formatVersion} · {Object.values(backupCounts(preview)).reduce((a,b) => a+b,0)} records</p>
          <p className="text-sm font-semibold text-amber-950">Import replaces all current local records, including any records not visible on this setup screen. This cannot be undone.</p>
          <label className="block text-sm font-semibold">Type REPLACE to confirm
            <input value={confirm} onChange={event => setConfirm(event.target.value)}
              autoComplete="off" className="mt-2 block min-h-11 w-full rounded-xl border border-amber-400 bg-white px-3 text-base" />
          </label>
          <button type="button" disabled={busy || confirm !== 'REPLACE'}
            onClick={() => { void restore() }}
            className="min-h-11 rounded-xl bg-evergreen-600 px-4 py-2 text-sm font-bold text-white disabled:opacity-50">
            {busy ? 'Restoring…' : 'Restore existing backup'}
          </button>
        </div>}
      </div>
    </details>
  </section>
}
