import { Link } from 'react-router-dom'
import type { DailySummary } from '../../domain/evaluation'

export const DAY_SECTIONS = ['energy', 'nutrition', 'fluids', 'activity', 'weight'] as const
export type DaySection = typeof DAY_SECTIONS[number]

export function isDaySection(value: string | undefined): value is DaySection {
  return DAY_SECTIONS.some(section => section === value)
}

const cardInfo: Record<DaySection, {
  title: string; label: string; backdrop: string; illustration: string; arrow: string
}> = {
  energy: {
    title: 'Energy', label: 'Estimated energy difference',
    backdrop: 'bg-violet-100', illustration: 'text-violet-700', arrow: 'bg-violet-100 text-violet-800'
  },
  nutrition: {
    title: 'Nutrition', label: 'Recorded nutrients',
    backdrop: 'bg-rose-100', illustration: 'text-rose-700', arrow: 'bg-rose-100 text-rose-800'
  },
  fluids: {
    title: 'Fluids', label: 'Recorded drinks and water',
    backdrop: 'bg-sky-100', illustration: 'text-sky-700', arrow: 'bg-sky-100 text-sky-800'
  },
  activity: {
    title: 'Activity', label: 'Recorded exercises',
    backdrop: 'bg-amber-100', illustration: 'text-amber-700', arrow: 'bg-amber-100 text-amber-800'
  },
  weight: {
    title: 'Weight', label: 'Recorded weight',
    backdrop: 'bg-emerald-100', illustration: 'text-emerald-700', arrow: 'bg-emerald-100 text-emerald-800'
  }
}

/** Original inline artwork. No CDN, image licensing, or online request. */
export function DaySectionIcon({ section }: { section: DaySection }) {
  return <svg viewBox="0 0 64 64" width="66" height="66" aria-hidden="true"
    fill="none" stroke="currentColor" strokeWidth="2.7"
    strokeLinecap="round" strokeLinejoin="round" className="h-16 w-16 drop-shadow-sm">
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

export function energyDifferenceSubtitle(summary?: DailySummary): string {
  const value = summary?.expenditure.differenceKcal
  if (value === null || value === undefined || !Number.isFinite(value)) {
    return 'Est. difference unavailable'
  }
  const shown = Number(Math.abs(value).toFixed(1)).toLocaleString('en-US')
  const sign = value < 0 ? '−' : value > 0 ? '+' : ''
  return 'Est. difference: ≈ ' + sign + shown + ' kcal'
}

export function CalendarSectionCards({ dayKey, summary }: { dayKey: string; summary?: DailySummary }) {
  return <section aria-label="Day details by section">
    <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
      {DAY_SECTIONS.map((section, index) => {
        const item = cardInfo[section]
        const subtitle = section === 'energy' ? energyDifferenceSubtitle(summary) : 'View details'
        return <Link key={section} to={'/calendar/' + dayKey + '/' + section}
          aria-label={item.title + ' — ' + subtitle}
          className={'group relative flex min-h-[210px] min-w-0 flex-col overflow-hidden rounded-3xl border border-slate-200 bg-white p-4 shadow-sm transition-all hover:-translate-y-0.5 hover:border-slate-300 hover:shadow-md focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-evergreen-700 ' +
            (index === 4 ? 'col-span-2 sm:col-span-1' : '')}>
          <div className="relative mb-4 flex h-[86px] items-start justify-end">
            <span aria-hidden="true" className={'absolute right-0 top-0 h-20 w-24 rounded-[1.6rem] ' + item.backdrop} />
            <span className={'relative -mr-1 mt-2 ' + item.illustration}><DaySectionIcon section={section} /></span>
          </div>
          <h3 className="text-base font-extrabold tracking-tight text-slate-900">{item.title}</h3>
          <p className="mt-1 min-h-9 text-xs leading-4 text-slate-600">{subtitle}</p>
          <div className="mt-auto flex justify-end pt-2">
            <span aria-hidden="true" className={'flex h-9 w-9 items-center justify-center rounded-full transition-transform group-hover:translate-x-0.5 ' + item.arrow}>
              <svg viewBox="0 0 24 24" className="h-5 w-5" fill="none" stroke="currentColor"
                strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M5 12h14m-6-6 6 6-6 6" />
              </svg>
            </span>
          </div>
        </Link>
      })}
    </div>
  </section>
}
