import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState, type ReactNode } from 'react'

type ToastKind = 'success' | 'error'
interface ToastMessage { id: number; kind: ToastKind; message: string }
interface ToastActions {
  success: (message: string) => void
  error: (message: string) => void
  dismiss: () => void
}

const ToastContext = createContext<ToastActions | null>(null)

/** Transient presentation state only: no localStorage, cookies or database writes. */
export function ToastProvider({ children }: { children: ReactNode }) {
  const [current, setCurrent] = useState<ToastMessage | null>(null)
  const nextId = useRef(0)
  const success = useCallback((message: string) => {
    setCurrent({ id: ++nextId.current, message, kind: 'success' })
  }, [])
  const error = useCallback((message: string) => {
    setCurrent({ id: ++nextId.current, message, kind: 'error' })
  }, [])
  const dismiss = useCallback(() => setCurrent(null), [])
  const actions = useMemo(() => ({ success, error, dismiss }), [success, error, dismiss])

  useEffect(() => {
    if (!current || current.kind === 'error') return
    const timeout = window.setTimeout(() => {
      setCurrent(existing => existing?.id === current.id ? null : existing)
    }, 5000)
    return () => window.clearTimeout(timeout)
  }, [current])

  return <ToastContext.Provider value={actions}>
    {children}
    <div aria-label="Notifications" className="pointer-events-none fixed inset-x-3 z-50 flex justify-center sm:inset-x-6"
      style={{ bottom: 'calc(5.5rem + env(safe-area-inset-bottom, 0px))' }}>
      {current && <div key={current.id} data-testid="app-toast"
        role={current.kind === 'error' ? 'alert' : 'status'}
        className={'pointer-events-auto flex w-full max-w-md items-center gap-3 rounded-2xl border px-4 py-3 text-sm font-semibold shadow-xl ' +
          (current.kind === 'error'
            ? 'border-rose-200 bg-rose-50 text-rose-900'
            : 'border-emerald-200 bg-white text-emerald-900')}>
        <span aria-hidden="true" className="text-lg">{current.kind === 'error' ? '!' : '✓'}</span>
        <span className="min-w-0 flex-1">{current.message}</span>
        <button type="button" onClick={dismiss} aria-label="Dismiss notification"
          className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl border border-current/20 text-xl font-normal hover:bg-slate-100 focus-visible:outline focus-visible:outline-2">
          ×
        </button>
      </div>}
    </div>
  </ToastContext.Provider>
}

export function useToast(): ToastActions {
  const actions = useContext(ToastContext)
  if (!actions) throw new Error('Toast notifications require the app provider.')
  return actions
}
