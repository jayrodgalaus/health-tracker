import { Link } from 'react-router-dom'

type LogActionKind = 'food' | 'drink' | 'exercise' | 'weight'

const appearance: Record<LogActionKind, { label: string; pill: string; icon: string; text: string }> = {
  food: {
    label: 'Food',
    pill: 'border-rose-200 bg-rose-50/80 hover:bg-rose-100',
    icon: 'bg-rose-600',
    text: 'text-rose-950'
  },
  drink: {
    label: 'Drink',
    pill: 'border-sky-200 bg-sky-50/80 hover:bg-sky-100',
    icon: 'bg-sky-600',
    text: 'text-sky-950'
  },
  exercise: {
    label: 'Exercise',
    pill: 'border-amber-200 bg-amber-50/80 hover:bg-amber-100',
    icon: 'bg-amber-600',
    text: 'text-amber-950'
  },
  weight: {
    label: 'Weight',
    pill: 'border-emerald-200 bg-emerald-50/80 hover:bg-emerald-100',
    icon: 'bg-emerald-600',
    text: 'text-emerald-950'
  }
}

function ActionIcon({ kind }: { kind: LogActionKind }) {
  return <svg aria-hidden="true" viewBox="0 0 24 24" width="34" height="34"
    fill="none" stroke="white" strokeWidth="1.8"
    strokeLinecap="round" strokeLinejoin="round">
    {kind === 'food' && <>
      <path d="M12 6c-2-2-5-2-7 0-2.7 2.6-2.1 7.4-.7 10.3C5.8 19.5 7.5 22 10 22c.9 0 1.3-.5 2-.5s1.1.5 2 .5c2.5 0 4.2-2.5 5.7-5.7C21 13.4 21.7 8.6 19 6c-2-2-5-2-7 0Z" />
      <path d="M12 6c0-2 1.7-4 4-4M12 6c-1.3-1.6-2.3-2.4-4-3" />
    </>}
    {kind === 'drink' && <>
      <path d="M12 2c-3.1 4.5-7.1 8.7-7.1 12.4a7.1 7.1 0 0 0 14.2 0C19.1 10.7 15.1 6.5 12 2Z" />
      <path d="M9 16c.3 1.6 1.7 2.5 3 2.5" />
    </>}
    {kind === 'exercise' && <>
      <path d="M3 10v4M6 8v8M9 6v12M9 12h6M15 6v12M18 8v8M21 10v4" />
    </>}
    {kind === 'weight' && <>
      <rect x="4" y="4" width="16" height="16" rx="3" />
      <path d="M9 8h6l2 5H7l2-5ZM12 9l-1 2M8 17h8" />
    </>}
  </svg>
}

export function LogActionPill({ kind, to }: { kind: LogActionKind; to: string }) {
  const style = appearance[kind]
  return <Link to={to}
    className={`group flex min-h-[5.5rem] w-full items-center gap-4 rounded-full border py-2.5 pl-2.5 pr-6 shadow-sm transition-colors focus-visible:outline-offset-4 ${style.pill}`}>
    <span data-log-icon className={`flex h-16 w-16 shrink-0 items-center justify-center rounded-full ${style.icon}`}>
      <ActionIcon kind={kind} />
    </span>
    <span className={`text-lg font-bold ${style.text}`}>{style.label}</span>
    <svg aria-hidden="true" className={`ml-auto h-5 w-5 shrink-0 ${style.text}`} viewBox="0 0 24 24"
      fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="m9 5 7 7-7 7" />
    </svg>
  </Link>
}
