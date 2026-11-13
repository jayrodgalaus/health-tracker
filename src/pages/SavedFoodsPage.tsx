import { Link, useNavigate, useSearchParams } from 'react-router-dom'
import { PageTitle } from '../components/PageTitle'
import { SavedFoodLibrary } from '../features/nutrition/SavedFoodLibrary'
import { selectedLogDay } from '../lib/logDate'

export function SavedFoodsPage() {
  const navigate=useNavigate()
  const [params]=useSearchParams()
  const dayKey=selectedLogDay(params.get('date'))
  return <div className="space-y-6">
    <header>
      
      <Link className="inline-flex min-h-11 items-center text-sm font-semibold text-evergreen-700 underline"
        to={'/log?date='+encodeURIComponent(dayKey)}>‹ Back to Log</Link>
      <PageTitle topic="food" className="mt-3" titleClassName="text-3xl font-bold">Saved foods and drinks</PageTitle>
    </header>
    <SavedFoodLibrary onUse={item=>
      navigate('/log/'+(item.kind==='beverage'?'drink':'food')+
        '?date='+encodeURIComponent(dayKey)+'&saved='+encodeURIComponent(item.id))} />
  </div>
}
