import { useEffect, useLayoutEffect, useRef, useState, type KeyboardEvent, type RefObject } from 'react'
import { clockDigits, clockFromMinutes, MAX_DURATION_MINUTES, minutesFromClock } from './durationClock'

const ROW_HEIGHT = 56
type Column = 'minutes' | 'seconds'
const MINUTES = Array.from({ length: MAX_DURATION_MINUTES + 1 }, (_, index) => index)
const SECONDS = Array.from({ length: 60 }, (_, index) => index)

function Wheel({
  column, value, max, onChange, wheelRef
}: {
  column: Column
  value: number
  max: number
  onChange: (value: number) => void
  wheelRef: RefObject<HTMLDivElement>
}) {
  const options = column === 'minutes' ? MINUTES : SECONDS
  const label = column === 'minutes' ? 'Minutes' : 'Seconds'
  function select(next: number) {
    const bounded = Math.max(0, Math.min(max, next))
    onChange(bounded)
    wheelRef.current?.scrollTo({ top: bounded * ROW_HEIGHT, behavior: 'auto' })
  }
  function keys(event: KeyboardEvent<HTMLDivElement>) {
    let next: number | null = null
    if (event.key === 'ArrowDown') next = value + 1
    if (event.key === 'ArrowUp') next = value - 1
    if (event.key === 'PageDown') next = value + 10
    if (event.key === 'PageUp') next = value - 10
    if (event.key === 'Home') next = 0
    if (event.key === 'End') next = max
    if (next !== null) { event.preventDefault(); select(next) }
  }
  return <div className="min-w-0 flex-1">
    <div className="mb-2 text-center text-xs font-semibold uppercase tracking-widest text-emerald-100">{label}</div>
    <div className="relative">
      <div aria-hidden="true" className="pointer-events-none absolute inset-x-0 top-1/2 z-10 h-14 -translate-y-1/2 rounded-xl border border-emerald-200/40 bg-white/10" />
      <div aria-hidden="true" className="pointer-events-none absolute inset-0 z-10 bg-gradient-to-b from-emerald-900/90 via-transparent to-emerald-900/90" />
      <div ref={wheelRef} role="listbox" tabIndex={0} aria-label={label}
        aria-activedescendant={column + '-duration-' + value}
        onKeyDown={keys}
        onScroll={event => {
          const next = Math.max(0, Math.min(max, Math.round(event.currentTarget.scrollTop / ROW_HEIGHT)))
          if (next !== value) onChange(next)
        }}
        className="duration-wheel relative h-[168px] overflow-y-auto overscroll-contain rounded-xl outline-none focus-visible:ring-2 focus-visible:ring-emerald-200">
        <div className="h-14" aria-hidden="true" />
        {options.map(item => <div key={item} id={column + '-duration-' + item}
          role="option" aria-selected={item === value}
          aria-label={clockDigits(item) + ' ' + label.toLowerCase()}
          onClick={() => select(item)}
          className={'flex h-14 cursor-pointer snap-center items-center justify-center text-3xl tabular-nums transition-colors ' +
            (item === value ? 'font-bold text-white' : 'font-normal text-emerald-200/50')}>
          {clockDigits(item)}
        </div>)}
        <div className="h-14" aria-hidden="true" />
      </div>
    </div>
  </div>
}

export function DurationPicker({
  value, onChange, disabled = false
}: { value: string; onChange: (minutes: string) => void; disabled?: boolean }) {
  const clock = clockFromMinutes(value)
  const [open, setOpen] = useState(false)
  const [focusColumn, setFocusColumn] = useState<Column>('minutes')
  const [minutes, setMinutes] = useState(0)
  const [seconds, setSeconds] = useState(0)
  const minutesRef = useRef<HTMLDivElement>(null)
  const secondsRef = useRef<HTMLDivElement>(null)
  const openButtonRef = useRef<HTMLButtonElement | null>(null)
  const dialogRef = useRef<HTMLDivElement>(null)

  function show(column: Column) {
    setMinutes(clock?.minutes ?? 0)
    setSeconds(clock?.seconds ?? 0)
    setFocusColumn(column)
    openButtonRef.current = document.activeElement instanceof HTMLButtonElement
      ? document.activeElement : null
    setOpen(true)
  }

  useLayoutEffect(() => {
    if (!open) return
    minutesRef.current?.scrollTo({ top: minutes * ROW_HEIGHT })
    secondsRef.current?.scrollTo({ top: seconds * ROW_HEIGHT })
    const target = focusColumn === 'minutes' ? minutesRef : secondsRef
    target.current?.focus()
    // Deliberately run on opening only: user scrolling owns the wheel position.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open])

  useEffect(() => {
    if (!open) return
    const previous = document.body.style.overflow
    document.body.style.overflow = 'hidden'
    return () => {
      document.body.style.overflow = previous
      window.requestAnimationFrame(() => { if (openButtonRef.current?.isConnected) openButtonRef.current.focus() })
    }
  }, [open])

  function dismiss() { setOpen(false) }
  function apply() {
    onChange(minutesFromClock(minutes, seconds))
    dismiss()
  }
  function setPreset(mm: number) {
    setMinutes(mm)
    setSeconds(0)
    minutesRef.current?.scrollTo({ top: mm * ROW_HEIGHT, behavior: 'auto' })
    secondsRef.current?.scrollTo({ top: 0, behavior: 'auto' })
  }
  function modalKeys(event: KeyboardEvent<HTMLDivElement>) {
    if (event.key === 'Escape') { event.preventDefault(); dismiss(); return }
    if (event.key !== 'Tab' || !dialogRef.current) return
    const focusables = Array.from(dialogRef.current.querySelectorAll<HTMLElement>(
      '[tabindex="0"], button:not([disabled])'
    ))
    const first = focusables[0]
    const last = focusables[focusables.length - 1]
    if (!first || !last) return
    if (event.shiftKey && document.activeElement === first) { event.preventDefault(); last.focus() }
    if (!event.shiftKey && document.activeElement === last) { event.preventDefault(); first.focus() }
  }
  return <>
    <div role="group" aria-label="Duration" className="block text-sm font-semibold">
      <span>Duration</span>
      <div className="mt-1 flex items-center gap-2">
        <button type="button" disabled={disabled} onClick={() => show('minutes')}
          aria-label="Duration minutes"
          className="inline-flex min-h-11 w-16 items-center justify-center rounded-xl border border-slate-300 bg-white px-3 text-lg font-semibold tabular-nums text-slate-900 hover:border-evergreen-600 focus-visible:outline focus-visible:outline-2 focus-visible:outline-evergreen-700 disabled:opacity-50">
          {clockDigits(clock?.minutes ?? 0)}
        </button>
        <span aria-hidden="true" className="text-xl font-bold text-slate-500">:</span>
        <button type="button" disabled={disabled} onClick={() => show('seconds')}
          aria-label="Duration seconds"
          className="inline-flex min-h-11 w-16 items-center justify-center rounded-xl border border-slate-300 bg-white px-3 text-lg font-semibold tabular-nums text-slate-900 hover:border-evergreen-600 focus-visible:outline focus-visible:outline-2 focus-visible:outline-evergreen-700 disabled:opacity-50">
          {clockDigits(clock?.seconds ?? 0)}
        </button>
      </div>
    </div>
    {open && <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/60 p-4"
      role="presentation" onMouseDown={event => { if (event.target === event.currentTarget) dismiss() }}>
      <div ref={dialogRef} role="dialog" aria-modal="true" aria-label="Set exercise duration"
        onKeyDown={modalKeys}
        className="w-full max-w-[350px] space-y-5 rounded-3xl border border-emerald-300/30 bg-gradient-to-br from-emerald-950 via-teal-800 to-emerald-700 p-5 text-white shadow-2xl">
        <div className="flex items-center justify-between">
          <h2 className="text-lg font-bold">Duration</h2>
          <button type="button" onClick={dismiss} aria-label="Close duration picker"
            className="inline-flex min-h-10 min-w-10 items-center justify-center rounded-full text-2xl text-emerald-100 hover:bg-white/10">×</button>
        </div>
        <div className="flex items-center justify-center gap-3">
          <Wheel column="minutes" value={minutes} max={MAX_DURATION_MINUTES}
            onChange={next => {
              setMinutes(next)
              if (next === MAX_DURATION_MINUTES && seconds !== 0) setSeconds(0)
            }}
            wheelRef={minutesRef}/>
          <span aria-hidden="true" className="pt-5 text-3xl font-bold text-white">:</span>
          <Wheel column="seconds" value={seconds} max={minutes === MAX_DURATION_MINUTES ? 0 : 59}
            onChange={setSeconds} wheelRef={secondsRef}/>
        </div>
        <div className="grid grid-cols-3 gap-2">
          {[10, 15, 30].map(mm => <button key={mm} type="button" onClick={() => setPreset(mm)}
            aria-label={mm + ' minute preset'}
            className="min-h-10 rounded-full border border-emerald-200/30 bg-white/10 px-1 text-sm font-semibold text-emerald-50 hover:bg-white/20">
            {clockDigits(mm)}:00
          </button>)}
        </div>
        <div className="flex gap-2">
          <button type="button" onClick={dismiss}
            className="min-h-11 flex-1 rounded-xl border border-emerald-100/50 px-3 font-semibold text-white hover:bg-white/10">
            Cancel
          </button>
          <button type="button" onClick={apply}
            className="min-h-11 flex-1 rounded-xl bg-emerald-50 px-3 font-bold text-emerald-900 hover:bg-white">
            Set duration
          </button>
        </div>
      </div>
    </div>}
  </>
}
