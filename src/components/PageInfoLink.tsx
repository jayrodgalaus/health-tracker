import { Link } from 'react-router-dom'

export type DocsTopic = 'today' | 'log' | 'food' | 'exercise' | 'weight' |
  'calendar' | 'day-detail' | 'trends' | 'profile' | 'goals' |
  'preferences' | 'data' | 'about' | 'nutrition'

/** Topic-specific help is deliberately one touch away on every main screen. */
export function PageInfoLink({ topic, compact = false }: { topic: DocsTopic; compact?: boolean }) {
  return <Link
    to={'/settings/docs/' + topic}
    aria-label={'About this page: ' + topic.replace('-', ' ')}
    title="Documentation for this page"
    className={compact
      ? 'relative -top-1 inline-flex h-11 w-6 shrink-0 items-center justify-center text-evergreen-700 focus-visible:rounded-full focus-visible:outline focus-visible:outline-2 focus-visible:outline-evergreen-600'
      : 'float-right ml-3 inline-flex h-11 w-11 items-center justify-center rounded-full border border-slate-300 bg-white text-lg font-bold text-evergreen-700 shadow-sm hover:bg-evergreen-50 focus-visible:outline focus-visible:outline-2 focus-visible:outline-evergreen-600'}
  ><span aria-hidden="true" className={compact
    ? 'flex h-[18px] w-[18px] items-center justify-center rounded-full border border-evergreen-700 text-[11px] font-bold leading-none'
    : undefined}>i</span></Link>
}
