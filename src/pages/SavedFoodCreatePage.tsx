import { Link, useNavigate, useSearchParams } from 'react-router-dom'
import { PageTitle } from '../components/PageTitle'
import { useToast } from '../components/ToastProvider'
import { SavedFoodEditor } from '../features/nutrition/SavedFoodLibrary'
import { selectedLogDay } from '../lib/logDate'

type SavedKind = 'food' | 'beverage'

/** Dedicated reusable-label creation screens; no daily food/drink log is created. */
export function SavedFoodCreatePage({ kind }: { kind: SavedKind }) {
  const [params] = useSearchParams()
  const dayKey = selectedLogDay(params.get('date'))
  const navigate = useNavigate()
  const toast = useToast()
  const libraryPath = (selectedKind: SavedKind) =>
    '/log/saved-foods?date=' + encodeURIComponent(dayKey) +
    '&kind=' + (selectedKind === 'beverage' ? 'drink' : 'food')

  return <div className="space-y-6">
    <header>
      
      <Link className="inline-flex min-h-11 items-center text-sm font-semibold text-evergreen-700 underline"
        to={libraryPath(kind)}>‹ Back to Saved Foods and Drinks</Link>
      <PageTitle topic="food" className="mt-3" titleClassName="text-2xl font-bold tracking-tight sm:text-3xl">
        Save a {kind === 'food' ? 'food' : 'drink'}
      </PageTitle>
    </header>
    <SavedFoodEditor key={kind} initialKind={kind} standalone
      onDone={savedKind => {
        toast.success('Label saved.')
        navigate(libraryPath(savedKind), { replace: true })
      }}
      onCancel={() => navigate(libraryPath(kind))}
    />
  </div>
}
