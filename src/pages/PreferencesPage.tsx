import { SettingsPageHeader } from '../components/SettingsPageHeader'
import { WaterPresetSettings } from '../features/nutrition/WaterPresetSettings'
import { NutrientLimitSettings } from '../features/nutrition/NutrientLimitSettings'

export function PreferencesPage() {
  return <div className="space-y-6">
    <SettingsPageHeader title="Preferences" topic="preferences" icon="preferences" />
    <WaterPresetSettings />
    <NutrientLimitSettings />
  </div>
}
