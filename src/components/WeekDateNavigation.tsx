import { useNavigate, Link } from 'react-router-dom'
import { addLocalDays, weekDays } from '../domain/calendar'
import { parseLocalDay } from '../lib/localDate'

const FIRST_DAY = '1900-01-01'
const weekdayNames = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'] as const

/**
 * Exactly seven Monday–Sunday dates, not a scrollable strip.
 * Today remains today's overview; choosing another date opens Calendar detail.
 */
export function WeekDateNavigation({ selectedDay, today }: { selectedDay: string; today: string }) {
  const navigate = useNavigate()
  const days = weekDays(selectedDay)
  const selectedDate = parseLocalDay(selectedDay)!
  const month = new Intl.DateTimeFormat(undefined, { month: 'short' }).format(selectedDate)
  const previous = addLocalDays(selectedDay, -7)
  const nextWeekBegins = addLocalDays(days[0]!, 7)
  const next = addLocalDays(selectedDay, 7)
  const canGoPrevious = previous >= FIRST_DAY
  const canGoNext = nextWeekBegins <= today && selectedDay < today

  const arrowClass = 'flex h-11 w-8 shrink-0 items-center justify-center rounded-full text-evergreen-700 hover:bg-evergreen-100 focus-visible:outline focus-visible:outline-2 focus-visible:outline-evergreen-700 disabled:cursor-not-allowed disabled:text-slate-300 disabled:hover:bg-transparent'

  return <nav aria-label="Week navigation"
    className="-mx-3 rounded-[2rem] border border-evergreen-100 bg-white px-2 py-4 shadow-sm sm:mx-0 sm:px-4">
    <div className="mb-3 flex items-center justify-between gap-2 px-2">
      <Link to={'/calendar/' + today}
        aria-label="Go to today"
        className="inline-flex min-h-11 items-center text-lg font-bold text-evergreen-700 hover:underline">Today</Link>
      <div className="flex items-center gap-0.5">
        <button type="button" aria-label="Previous week" title="Previous week"
          className={arrowClass} disabled={!canGoPrevious}
          onClick={() => navigate('/calendar/' + previous)}>
          <svg aria-hidden="true" className="h-5 w-5" viewBox="0 0 24 24"
            fill="none" stroke="currentColor" strokeWidth="2.2"
            strokeLinecap="round" strokeLinejoin="round">
            <path d="m15 18-6-6 6-6" />
          </svg>
        </button>
        <span aria-live="polite" className="min-w-[5.75rem] whitespace-nowrap text-center text-sm font-semibold tabular-nums text-slate-600">
          {month} · {selectedDate.getFullYear()}
        </span>
        <button type="button" aria-label="Next week" title="Next week"
          className={arrowClass} disabled={!canGoNext}
          onClick={() => navigate('/calendar/' + (next > today ? today : next))}>
          <svg aria-hidden="true" className="h-5 w-5" viewBox="0 0 24 24"
            fill="none" stroke="currentColor" strokeWidth="2.2"
            strokeLinecap="round" strokeLinejoin="round">
            <path d="m9 18 6-6-6-6" />
          </svg>
        </button>
      </div>
    </div>
    <div role="group" aria-label="Week dates" className="grid grid-cols-7 gap-0.5 sm:gap-2">
      {days.map((day, index) => {
        const selected = day === selectedDay
        const unavailable = day > today || day < FIRST_DAY
        const label = day + ' (' + weekdayNames[index] + ')'
        const style = 'flex h-[4.5rem] min-w-0 flex-col items-center justify-center gap-1 rounded-full border py-1 text-center transition-colors ' +
          (selected
            ? 'border-evergreen-600 bg-evergreen-600 font-semibold text-white shadow-md'
            : unavailable
              ? 'cursor-not-allowed border-slate-100 bg-slate-50 text-slate-400'
              : 'border-evergreen-100 bg-evergreen-50 text-evergreen-700 hover:border-evergreen-600 hover:bg-evergreen-100') 
        const content = <>
          <span aria-hidden="true" className={'flex h-8 w-8 shrink-0 items-center justify-center rounded-full text-sm font-bold tabular-nums ' +
            (selected ? 'bg-white text-evergreen-700' : unavailable
              ? 'bg-slate-100 text-slate-400' : 'bg-white text-evergreen-900 shadow-sm')}>
            {Number(day.slice(-2))}
          </span>
          <span aria-hidden="true" className="text-[10px] font-semibold sm:text-xs">{weekdayNames[index]}</span>
        </>
        if (unavailable) return <span key={day} data-week-day={day}
          aria-label={label} aria-disabled="true" className={style}>{content}</span>
        if (selected) return <span key={day} data-week-day={day}
          aria-label={label} aria-current="date" className={style}>{content}</span>
        return <Link key={day} data-week-day={day} to={'/calendar/' + day}
          aria-label={label} className={style + ' focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-evergreen-700'}>{content}</Link>
      })}
    </div>
  </nav>
}
