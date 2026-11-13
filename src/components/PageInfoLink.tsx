import { Link } from 'react-router-dom'

export type DocsTopic = 'today' | 'log' | 'food' | 'exercise' | 'weight' |
  'calendar' | 'day-detail' | 'trends' | 'kitchen' | 'profile' | 'goals' |
  'preferences' | 'data' | 'about' | 'nutrition'

/** Consistent tiny help icon with a 44px-tall touch target. */
export function PageInfoLink({ topic, onDark = false }: { topic: DocsTopic; onDark?: boolean }) {
  return <Link
    to={'/settings/docs/' + topic}
    aria-label={'About this page: ' + topic.replace('-', ' ')}
    title="Documentation for this page"
    className={'relative -top-1 inline-flex h-11 w-6 shrink-0 items-center justify-center rounded-full focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 ' +
      (onDark ? 'text-white focus-visible:outline-white' : 'text-evergreen-700 focus-visible:outline-evergreen-600')}
  >
    <span aria-hidden="true"
      className="flex h-[18px] w-[18px] items-center justify-center rounded-full border border-current text-[11px] font-bold leading-none">i</span>
  </Link>
}
