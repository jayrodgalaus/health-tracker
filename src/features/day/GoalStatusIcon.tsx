import type { RuleState } from '../../domain/evaluation'

const iconColors: Record<RuleState, string> = {
  pass: 'text-emerald-700',
  attention: 'text-amber-700',
  significantDeviation: 'text-rose-700',
  notEvaluated: 'text-slate-500'
}

/** Inline vector icons: sharp and consistent at any device scale, with no CDN dependency. */
export function GoalStatusIcon({ status, label, onDark = false }: { status: RuleState; label: string; onDark?: boolean }) {
  return <svg role="img" aria-label={label}
    className={'h-5 w-5 shrink-0 ' + (onDark ? 'text-white' : iconColors[status])}
    viewBox="0 0 24 24" fill="none" stroke="currentColor"
    strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"
    xmlns="http://www.w3.org/2000/svg">
    {status === 'attention' ? <>
      <path d="M10.28 3.86 1.82 18.1a2 2 0 0 0 1.72 3h16.92a2 2 0 0 0 1.72-3L13.72 3.86a2 2 0 0 0-3.44 0Z" />
      <path d="M12 9v4" />
      <path d="M12 17h.01" />
    </> : <>
      <circle cx="12" cy="12" r="9" />
      {status === 'pass'
        ? <path d="m8 12 2.5 2.5L16 9" />
        : status === 'significantDeviation'
          ? <path d="m9 9 6 6m0-6-6 6" />
          : <path d="M8 12h8" />}
    </>}
  </svg>
}
