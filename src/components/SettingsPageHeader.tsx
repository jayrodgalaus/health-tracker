import { Link } from 'react-router-dom'
import { PageInfoLink, type DocsTopic } from './PageInfoLink'
import { SettingsSectionIcon, type SettingsSectionName } from './SettingsSectionIcon'

/** Shared header for Settings detail pages, using the Profile page's design. */
export function SettingsPageHeader({
  title, topic, icon
}: {
  title: string
  topic?: DocsTopic
  icon: SettingsSectionName
}) {
  return <header className="space-y-4">
    <div className="flex items-center justify-between gap-3">
      <Link to="/settings" className="inline-flex min-h-11 items-center gap-2 text-sm font-semibold text-evergreen-700 underline underline-offset-4">
        <span aria-hidden="true">‹</span> Back to Settings
      </Link>
      {topic && <PageInfoLink topic={topic} />}
    </div>
    <div className="relative isolate overflow-hidden rounded-3xl bg-gradient-to-br from-evergreen-900 via-evergreen-700 to-evergreen-600 p-5 text-white shadow-sm sm:p-7">
      <div aria-hidden="true" className="pointer-events-none absolute -right-12 -top-20 h-52 w-52 rounded-full border-[24px] border-white/10" />
      <div aria-hidden="true" className="pointer-events-none absolute -bottom-14 right-16 h-28 w-28 rounded-full bg-white/5" />
      <div className="relative flex items-center gap-4">
        <span aria-hidden="true" className="flex h-14 w-14 shrink-0 items-center justify-center rounded-2xl sm:h-16 sm:w-16 bg-white/15 ring-1 ring-white/25">
          <SettingsSectionIcon name={icon} className="h-8 w-8 sm:h-10 sm:w-10" />
        </span>
        <h1 className="min-w-0 break-words text-2xl font-bold leading-tight tracking-tight sm:text-3xl">{title}</h1>
      </div>
    </div>
  </header>
}
