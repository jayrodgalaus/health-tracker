import { Link } from 'react-router-dom'
import { PageInfoLink } from '../components/PageInfoLink'
import { WaterPresetSettings } from '../features/nutrition/WaterPresetSettings'
import { NutrientLimitSettings } from '../features/nutrition/NutrientLimitSettings'

export function PreferencesPage() {
  return <div className="space-y-6">
    <header>
      <PageInfoLink topic="preferences" />
      <Link to="/settings" className="text-sm font-semibold text-evergreen-700 underline">Back to Settings</Link>
      <h1 className="mt-4 text-3xl font-bold">Preferences</h1>
    </header>
    <WaterPresetSettings />
    <NutrientLimitSettings />
  </div>
}
