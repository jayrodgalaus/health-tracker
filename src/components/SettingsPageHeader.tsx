import { Link } from 'react-router-dom'
import { PageInfoLink, type DocsTopic } from './PageInfoLink'

type HeaderIcon = 'profile' | 'goals' | 'preferences' | 'data' | 'about'

/** Shared header for Settings detail pages, using the Profile page's design. */
export function SettingsPageHeader({
  title, topic, icon
}: {
  title: string
  topic: DocsTopic
  icon: HeaderIcon
}) {
  return <header className="space-y-4">
    <div className="flex items-center justify-between gap-3">
      <Link to="/settings" className="inline-flex min-h-11 items-center gap-2 text-sm font-semibold text-evergreen-700 underline underline-offset-4">
        <span aria-hidden="true">‹</span> Back to Settings
      </Link>
      <PageInfoLink topic={topic} />
    </div>
    <div className="relative isolate overflow-hidden rounded-3xl bg-gradient-to-br from-evergreen-900 via-evergreen-700 to-evergreen-600 p-5 text-white shadow-sm sm:p-7">
      <div aria-hidden="true" className="pointer-events-none absolute -right-12 -top-20 h-52 w-52 rounded-full border-[24px] border-white/10" />
      <div aria-hidden="true" className="pointer-events-none absolute -bottom-14 right-16 h-28 w-28 rounded-full bg-white/5" />
      <div className="relative flex items-center gap-4">
        <span aria-hidden="true" className="flex h-14 w-14 shrink-0 items-center justify-center rounded-2xl sm:h-16 sm:w-16 bg-white/15 ring-1 ring-white/25">
          <svg viewBox="0 0 48 48" className="h-8 w-8 sm:h-10 sm:w-10" fill="none" stroke="currentColor"
            strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
            {icon === 'profile' && <>
              <circle cx="24" cy="17" r="8" />
              <path d="M9 40c1.5-8 7.5-12 15-12s13.5 4 15 12" />
            </>}
            {icon === 'goals' && <>
              <circle cx="23" cy="25" r="17" />
              <circle cx="23" cy="25" r="10" />
              <circle cx="23" cy="25" r="3" />
              <path d="m26 22 16-16M33 6h9v9" />
            </>}
            {icon === 'preferences' && <>
              <path d="M8 10h32M8 24h32M8 38h32" />
              <circle cx="18" cy="10" r="4" fill="#0e625e" />
              <circle cx="31" cy="24" r="4" fill="#0e625e" />
              <circle cx="20" cy="38" r="4" fill="#0e625e" />
            </>}
            {icon === 'data' && <>
              <ellipse cx="24" cy="10" rx="15" ry="6" />
              <path d="M9 10v13c0 3.3 6.7 6 15 6s15-2.7 15-6V10M9 23v13c0 3.3 6.7 6 15 6s15-2.7 15-6V23" />
            </>}
            {icon === 'about' && <>
              <path d="M24 43 8.5 28.5C-1 19 13 5 24 17c11-12 25-2 15.5 11.5z" />
              <path d="M24 19v12M18 25h12" />
            </>}
          </svg>
        </span>
        <h1 className="min-w-0 break-words text-2xl font-bold leading-tight tracking-tight sm:text-3xl">{title}</h1>
      </div>
    </div>
  </header>
}
