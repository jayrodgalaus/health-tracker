import { Link } from 'react-router-dom'
import { SettingsSectionIcon, type SettingsSectionName } from '../components/SettingsSectionIcon'

const items: readonly { path: string; title: string; icon: SettingsSectionName }[] = [
  { path: '/settings/profile', title: 'Profile', icon: 'profile' },
  { path: '/settings/goals', title: 'Goals and targets', icon: 'goals' },
  { path: '/settings/preferences', title: 'Preferences', icon: 'preferences' },
  { path: '/settings/data', title: 'Data and backups', icon: 'data' },
  { path: '/settings/docs', title: 'Docs', icon: 'docs' },
  { path: '/settings/about', title: 'About and health notice', icon: 'about' }
]

export function SettingsPage() {
  return <div className="space-y-6">
    <header>
      <h1 className="text-2xl font-bold tracking-tight sm:text-3xl">Settings</h1>
    </header>
    <nav aria-label="Settings sections" className="-mx-5 border-y border-slate-200 bg-white">
      <ul className="divide-y divide-slate-200">
        {items.map(item => <li key={item.path}>
          <Link to={item.path}
            className="group flex min-h-[76px] items-center gap-4 px-5 py-3 transition-colors hover:bg-evergreen-50 focus-visible:bg-evergreen-50">
            <span data-settings-icon={item.icon} aria-hidden="true"
              className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl bg-evergreen-50 text-evergreen-700 ring-1 ring-evergreen-100 transition-colors group-hover:bg-evergreen-100">
              <SettingsSectionIcon name={item.icon} className="h-7 w-7" />
            </span>
            <span className="min-w-0 flex-1 text-base font-semibold text-slate-900">{item.title}</span>
            <svg aria-hidden="true" viewBox="0 0 24 24" fill="none" stroke="currentColor"
              strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"
              className="h-5 w-5 shrink-0 text-slate-400 transition-colors group-hover:text-evergreen-700">
              <path d="m9 5 7 7-7 7" />
            </svg>
          </Link>
        </li>)}
      </ul>
    </nav>
  </div>
}
