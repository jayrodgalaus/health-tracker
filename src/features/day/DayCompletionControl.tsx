import { useEffect, useRef, useState } from 'react'
import { setDayComplete } from '../../data/dayRepository'
import { useToast } from '../../components/ToastProvider'

/** Shared confirmation + completion behavior for Today, Log and Calendar. */
export function DayCompletionControl({
  dayKey, isComplete, disabled = false, compact = false
}: { dayKey: string; isComplete: boolean; disabled?: boolean; compact?: boolean }) {
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

  return <div className={compact ? 'min-w-0' : 'space-y-3'}>
    <button type="button" disabled={disabled || pending}
      aria-label={compact ? isComplete ? 'Reopen day' : 'Mark day complete' : undefined}
      onClick={() => { if (isComplete) void apply(false); else setConfirming(true) }}
      className={compact
        ? 'min-h-11 shrink-0 rounded-xl border border-evergreen-600 bg-white px-3 py-2 text-sm font-semibold text-evergreen-700 hover:bg-emerald-50 disabled:opacity-50'
        : 'min-h-11 rounded-xl bg-evergreen-600 px-4 py-2 text-sm font-semibold text-white hover:bg-evergreen-700 disabled:opacity-50'}>
      {pending ? 'Saving…' : isComplete ? (compact ? 'Reopen' : 'Reopen day')
        : (compact ? 'Mark complete' : 'Mark day complete')}
    </button>
    {confirming && !isComplete && <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/60 p-4">
      <div role="dialog" aria-modal="true"
        aria-labelledby="complete-day-heading"
        aria-describedby="complete-day-description"
        onKeyDown={event => {
          if (event.key === 'Escape' && !pending) setConfirming(false)
          if (event.key === 'Tab') {
            const buttons = event.currentTarget.querySelectorAll<HTMLButtonElement>('button:not(:disabled)')
            if (buttons.length < 2) return
            const first = buttons[0]!
            const last = buttons[buttons.length - 1]!
            if (event.shiftKey && document.activeElement === first) { event.preventDefault(); last.focus() }
            else if (!event.shiftKey && document.activeElement === last) { event.preventDefault(); first.focus() }
          }
        }}
        className="w-full max-w-md max-h-[90vh] overflow-y-auto rounded-2xl border border-slate-300 bg-white p-5 shadow-xl">
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
      </div>
    </div>}
    {error && <p role="alert" className="rounded-xl bg-rose-50 p-3 text-sm text-rose-900">{error}</p>}
  </div>
}
