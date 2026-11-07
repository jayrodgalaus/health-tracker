import { Link } from 'react-router-dom'
import type { StorageStatus } from '../App'

const items = [
  { path: '/settings/profile', title: 'Profile', description: 'Age, height, preferred units and everyday movement' },
  { path: '/settings/goals', title: 'Goals and targets', description: 'Daily targets, calendar rules and goal history' },
  { path: '/settings/preferences', title: 'Preferences', description: 'Water quick-add amounts and Calendar sugar/sodium limits' },
  { path: '/settings/data', title: 'Data and backups', description: 'Export, restore and erase local records' },
  { path: '/settings/docs', title: 'Docs', description: 'Definitions, calculations, food sources and how to use the tracker' },
  { path: '/settings/about', title: 'About and health notice', description: 'Privacy, limitations and safety information' }
] as const

export function SettingsPage({ storage }: { storage: StorageStatus }) {
  return <div className="space-y-6">
    <header>
      <h1 className="text-3xl font-bold tracking-tight">Settings</h1>
    </header>
    <nav aria-label="Settings sections" className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
      <ul className="divide-y divide-slate-200">
        {items.map(item => <li key={item.path}>
          <Link to={item.path} className="flex min-h-20 items-center justify-between gap-3 px-5 py-4 hover:bg-evergreen-50 focus-visible:bg-evergreen-50">
            <span className="space-y-1">
              <span className="block text-base font-semibold text-slate-900">{item.title}</span>
              <span className="block text-xs leading-5 text-slate-600">{item.description}</span>
            </span>
            <span aria-hidden="true" className="text-xl text-evergreen-700">›</span>
          </Link>
        </li>)}
      </ul>
    </nav>
    <p className="text-xs text-slate-600" role="status">
      {storage === 'ready' ? 'Local storage ready.' : storage === 'opening' ? 'Checking local storage…' : 'Local storage unavailable.'}
    </p>
  </div>
}
