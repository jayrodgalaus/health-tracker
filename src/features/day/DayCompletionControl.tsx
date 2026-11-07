import { useEffect, useRef, useState } from 'react'
import { setDayComplete } from '../../data/dayRepository'
import { useToast } from '../../components/ToastProvider'

/** Shared confirmation + completion behavior for Today, Log and Calendar. */
export function DayCompletionControl({
  dayKey, isComplete, disabled = false
}: { dayKey: string; isComplete: boolean; disabled?: boolean }) {
  const toast = useToast()
  const [confirming, setConfirming] = useState(false)
  const [pending, setPending] = useState(false)
  const [error, setError] = useState('')
  const cancelButton = useRef<HTMLButtonElement>(null)

  useEffect(() => { if (confirming) cancelButton.current?.focus() }, [confirming])
  useEffect(() => { setConfirming(false); setError('') }, [dayKey, isComplete])

  async function apply(next: boolean) {
    setPending(true)
    setError('')
    try {
      await setDayComplete(dayKey, next)
      setConfirming(false)
      toast.success(next ? 'Day completed and locked.' : 'Day reopened for editing.')
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : 'Could not change completion.')
    } finally { setPending(false) }
  }

  return <div className="space-y-3">
    <button type="button" disabled={disabled || pending}
      onClick={() => { if (isComplete) void apply(false); else setConfirming(true) }}
      className="min-h-11 rounded-xl bg-evergreen-600 px-4 py-2 text-sm font-semibold text-white disabled:opacity-50">
      {pending ? 'Saving…' : isComplete ? 'Reopen day' : 'Mark day complete'}
    </button>
    {confirming && !isComplete && <div role="dialog" aria-modal="true"
      aria-labelledby="complete-day-heading"
      aria-describedby="complete-day-description"
      onKeyDown={event => { if (event.key === 'Escape' && !pending) setConfirming(false) }}
      className="rounded-xl border-2 border-evergreen-600 bg-white p-4 shadow-lg">
      <h3 id="complete-day-heading" className="font-bold">Lock and complete {dayKey}?</h3>
      <p id="complete-day-description" className="mt-2 text-sm leading-6 text-slate-700">
        This locks the day's food, drinks, exercise and weight records. The daily goal alignment and its targets
        will be saved exactly as they are now, even if you change Goals later.
        You can reopen the day to make corrections, but doing so discards its saved evaluation until you complete it again.
      </p>
      <div className="mt-4 flex flex-wrap gap-3">
        <button type="button" disabled={pending} onClick={() => { void apply(true) }}
          className="min-h-11 rounded-xl bg-evergreen-600 px-4 py-2 text-sm font-semibold text-white disabled:opacity-50">
          {pending ? 'Locking…' : 'Confirm complete and lock'}
        </button>
        <button ref={cancelButton} type="button" disabled={pending} onClick={() => setConfirming(false)}
          className="min-h-11 rounded-xl border border-slate-300 px-4 py-2 text-sm font-semibold">
          Cancel
        </button>
      </div>
    </div>}
    {error && <p role="alert" className="rounded-xl bg-rose-50 p-3 text-sm text-rose-900">{error}</p>}
  </div>
}
