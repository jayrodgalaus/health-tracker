import { Link, Navigate, useLocation } from 'react-router-dom'
import { SettingsPageHeader } from '../components/SettingsPageHeader'
import { DOCS_TOPICS } from './docsTopics'

export function DocsPage() {
  const { hash } = useLocation()
  // Keep previously shared in-app /settings/docs#topic links working.
  const oldTopic = hash.slice(1)
  if (DOCS_TOPICS.some(item => item.id === oldTopic)) {
    return <Navigate to={'/settings/docs/' + oldTopic} replace />
  }

  return <div className="space-y-6">
    <SettingsPageHeader title="Docs" icon="docs" />
    <nav aria-label="Documentation contents" className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
      <ul className="divide-y divide-slate-200">
        {DOCS_TOPICS.map(item => <li key={item.id}>
          <Link to={'/settings/docs/' + item.id} className="flex min-h-16 items-center justify-between gap-4 px-5 py-4 hover:bg-evergreen-50 focus-visible:bg-evergreen-50">
            <span className="text-base font-semibold text-slate-900">{item.label}</span>
            <span aria-hidden="true" className="text-xl text-evergreen-700">›</span>
          </Link>
        </li>)}
      </ul>
    </nav>
  </div>
}
