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
    className={'inline-flex items-center justify-center rounded-full border border-slate-300 bg-white font-bold text-evergreen-700 shadow-sm hover:bg-evergreen-50 focus-visible:outline focus-visible:outline-2 focus-visible:outline-evergreen-600 ' +
      (compact
        ? 'relative -top-1 h-9 w-9 shrink-0 text-base'
        : 'float-right ml-3 h-11 w-11 text-lg')}
  ><span aria-hidden="true">i</span></Link>
}
