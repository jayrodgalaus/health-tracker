import { Link } from 'react-router-dom'
import type { DailySummary } from '../../domain/evaluation'
import { kilogramsTo } from '../../domain/units'

export const DAY_SECTIONS = ['energy', 'nutrition', 'fluids', 'activity', 'weight'] as const
export type DaySection = typeof DAY_SECTIONS[number]

export function isDaySection(value: string | undefined): value is DaySection {
  return DAY_SECTIONS.some(section => section === value)
}

const cardInfo: Record<DaySection, {
  title: string
  backdrop: string
  illustration: string
  pill: string
  circle: string
}> = {
  energy: {
    title: 'Energy',
    backdrop: 'bg-violet-200',
    illustration: 'text-violet-700',
    pill: 'border-violet-600 bg-violet-50 text-violet-800',
    circle: 'bg-violet-600'
  },
  nutrition: {
    title: 'Nutrition',
    backdrop: 'bg-rose-200',
    illustration: 'text-rose-700',
    pill: 'border-rose-600 bg-rose-50 text-rose-800',
    circle: 'bg-rose-600'
  },
  fluids: {
    title: 'Fluids',
    backdrop: 'bg-sky-200',
    illustration: 'text-sky-700',
    pill: 'border-sky-600 bg-sky-50 text-sky-800',
    circle: 'bg-sky-600'
  },
  activity: {
    title: 'Activity',
    backdrop: 'bg-amber-200',
    illustration: 'text-amber-700',
    pill: 'border-amber-700 bg-amber-50 text-amber-900',
    circle: 'bg-amber-700'
  },
  weight: {
    title: 'Weight',
    backdrop: 'bg-emerald-200',
    illustration: 'text-emerald-700',
    pill: 'border-emerald-700 bg-emerald-50 text-emerald-900',
    circle: 'bg-emerald-700'
  }
}

/** Original inline artwork. No CDN, image licensing, or online request. */
export function DaySectionIcon({ section }: { section: DaySection }) {
  return <svg viewBox="0 0 64 64" width="56" height="56" aria-hidden="true"
    fill="none" stroke="currentColor" strokeWidth="2.7"
    strokeLinecap="round" strokeLinejoin="round" className="h-14 w-14 drop-shadow-sm">
    {section === 'energy' && <>
      <path d="M34 5 16 35h16l-3 24 20-34H33l1-20Z" />
      <path d="M13 11 9 7M50 49l5 5" strokeWidth="2" />
    </>}
    {section === 'nutrition' && <>
      <path d="M32 21c-6-8-21-8-25 5-4 14 2 28 12 31 5 2 9-2 13-2s8 4 13 2c10-3 16-17 12-31-4-13-19-13-25-5Z" />
      <path d="M32 21c-2-7 0-13 7-17" />
      <path d="M37 17c3-9 10-12 17-10-1 9-7 13-17 10Z" />
      <path d="M20 31c-3 4-3 9-1 13" strokeWidth="2" />
    </>}
    {section === 'fluids' && <>
      <path d="M32 5C24 17 12 29 12 40a20 20 0 0 0 40 0C52 29 40 17 32 5Z" />
      <path d="M21 40c0 7 5 12 11 13" strokeWidth="2.4" />
    </>}
    {section === 'activity' && <>
      <path d="M20 32h24" />
      <path d="M11 23v18M16 19v26M21 25v14M43 25v14M48 19v26M53 23v18" />
      <path d="M8 26v12M56 26v12" strokeWidth="2" />
    </>}
    {section === 'weight' && <>
      <rect x="9" y="12" width="46" height="43" rx="9" />
      <path d="M23 20h18l4 12H19l4-12Z" />
      <path d="M32 26v5" />
      <circle cx="32" cy="26" r="2" fill="currentColor" stroke="none" />
      <path d="M18 46h28" strokeWidth="2" />
    </>}
  </svg>
}

function amount(value: number | null | undefined): string | null {
  if (value === null || value === undefined || !Number.isFinite(value)) return null
  return Number(value.toFixed(1)).toLocaleString('en-US')
}

/** Display known recorded values only. Missing logs and unknown estimates are
 * not zero. Partial nutrition, fluid and workout totals are lower bounds.
 */
export function calendarSectionValue(
  section: DaySection,
  summary: DailySummary | undefined,
  massUnit: 'kg' | 'lb'
): string {
  if (!summary) return section === 'weight' ? 'No record' : '—'
  if (section === 'energy') {
    const value = summary.expenditure.differenceKcal
    const formatted = amount(value === null ? null : Math.abs(value))
    if (formatted === null) return '—'
    const sign = value! < 0 ? '−' : value! > 0 ? '+' : ''
    return '≈ ' + sign + formatted + ' kcal'
  }
  if (section === 'nutrition' || section === 'fluids') {
    const coverage = section === 'nutrition'
      ? summary.intake.nutrients.energyKcal : summary.intake.fluids
    const formatted = amount(coverage.knownAmount)
    if (formatted === null) return '—'
    return (coverage.complete ? '' : '≥') + formatted + (section === 'nutrition' ? ' kcal' : ' mL')
  }
  if (section === 'activity') {
    const activity = summary.activity
    const formatted = amount(activity.knownIncrementalKcal)
    if (formatted === null) return '—'
    return (activity.energyCoverageComplete ? '≈ ' : '≥') + formatted + ' kcal'
  }
  const recorded = summary.recordedWeightKg
  const formatted = amount(recorded === null ? null : kilogramsTo(recorded, massUnit))
  return formatted === null ? 'No record' : formatted + ' ' + massUnit
}

export function CalendarSectionCards({
  dayKey, summary, massUnit
}: {
  dayKey: string
  summary?: DailySummary
  massUnit: 'kg' | 'lb'
}) {
  return <section aria-label="Day details by section">
    <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
      {DAY_SECTIONS.map((section, index) => {
        const item = cardInfo[section]
        const value = calendarSectionValue(section, summary, massUnit)
        return <Link key={section} to={'/calendar/' + dayKey + '/' + section}
          aria-label={item.title + ' — ' + value + ' — View details'}
          className={'group relative flex min-h-[216px] min-w-0 flex-col items-center overflow-hidden rounded-[2.25rem] border border-slate-200 bg-white px-3 pb-3 pt-3 text-center shadow-sm transition-all hover:-translate-y-0.5 hover:border-slate-300 hover:shadow-md focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-evergreen-700 ' +
            (index === 4 ? 'col-span-2 sm:col-span-1' : '')}>
          <span data-card-layer="blob" aria-hidden="true"
            className={'pointer-events-none absolute -right-[5px] -top-[5px] z-0 h-24 w-24 rounded-full ' + item.backdrop} />
          <span data-card-layer="illustration" aria-hidden="true"
            className={'pointer-events-none absolute right-[15px] top-[15px] z-10 ' + item.illustration}>
            <DaySectionIcon section={section} />
          </span>
          <div aria-hidden="true" className="mb-2 h-[84px] w-full shrink-0" />
          <h3 className="relative z-10 text-lg font-extrabold tracking-tight text-slate-900">{item.title}</h3>
          <p className="relative z-10 flex min-h-8 max-w-full items-center justify-center break-words text-sm font-medium tabular-nums leading-5 text-slate-700">
            {value}
          </p>
          <span className={'relative z-10 mt-auto inline-flex max-w-full items-center gap-1 rounded-full border py-1 pl-3 pr-1 text-xs font-semibold ' + item.pill}>
            <span className="whitespace-nowrap text-[11px] sm:text-xs">View details</span>
            <span aria-hidden="true" className={'flex h-8 w-8 shrink-0 items-center justify-center rounded-full text-white transition-transform group-hover:translate-x-0.5 ' + item.circle}>
              <svg viewBox="0 0 24 24" className="h-4 w-4" fill="none" stroke="currentColor"
                strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M5 12h14m-6-6 6 6-6 6" />
              </svg>
            </span>
          </span>
        </Link>
      })}
    </div>
  </section>
}
