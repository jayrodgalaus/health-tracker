import { Link } from 'react-router-dom'

export type DocsTopic = 'today' | 'log' | 'food' | 'exercise' | 'weight' |
  'calendar' | 'day-detail' | 'trends' | 'profile' | 'goals' |
  'preferences' | 'data' | 'about'

/** Topic-specific help is deliberately one touch away on every main screen. */
export function PageInfoLink({ topic }: {topic: DocsTopic}) {
  return <Link
    to={'/settings/docs/' + topic}
    aria-label={'About this page: ' + topic.replace('-', ' ')}
    title="Documentation for this page"
    className="float-right ml-3 inline-flex h-11 w-11 items-center justify-center rounded-full border border-slate-300 bg-white text-lg font-bold text-evergreen-700 shadow-sm hover:bg-evergreen-50 focus-visible:outline focus-visible:outline-2 focus-visible:outline-evergreen-600"
  ><span aria-hidden="true">i</span></Link>
}
