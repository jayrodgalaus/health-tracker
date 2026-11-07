import { useState, type FormEvent } from 'react'
import type { ActivityLevel, GoalPeriod, HealthGoal, Profile, UnitPreferences } from '../../domain/models'
import { EMPTY_TARGETS, type GoalValues, type ProfileValues } from '../../domain/profile'
import { ALIGNMENT_RULES } from '../../domain/evaluation'
import { BACKGROUND_MOVEMENT_PRESETS, hasCustomBackgroundMultiplier } from '../../domain/backgroundMovement'
import { centimetersFromInches, displayNumber, fluidFrom, fluidTo, inchesFromCentimeters, kilogramsFrom, kilogramsTo } from '../../domain/units'
import { saveGoalSettings, saveProfileAndGoals, saveProfileSettings } from '../../data/profileRepository'
import { toLocalDay } from '../../lib/localDate'
import { useToast } from '../../components/ToastProvider'

const inputClass = 'mt-1 block min-h-11 w-full rounded-xl border border-slate-300 bg-white px-3 py-2 text-base text-slate-900 focus:border-evergreen-600'
const labelClass = 'block text-sm font-medium text-slate-800'
const today = () => toLocalDay(new Date())

function parseNumber(value: string, field: string, optional = false): number | null {
  const raw = value.trim()
  if (!raw) {
    if (optional) return null
    throw new Error(`Enter ${field}.`)
  }
  const standardized = raw.replace(',', '.')
  if (!/^(?:\d+(?:\.\d*)?|\.\d+)$/.test(standardized)) throw new Error(`Enter a valid number for ${field}.`)
  const number = Number(standardized)
  if (!Number.isFinite(number)) throw new Error(`Enter a finite number for ${field}.`)
  return number
}

interface Props {
  mode: 'onboarding' | 'settings'
  section?: 'profile' | 'goals'
  initialProfile?: Profile | null
  initialGoal?: GoalPeriod | null
  onSaved?: () => void
}

export function ProfileForm({ mode, section = 'profile', initialProfile, initialGoal, onSaved }: Props) {
  const toast = useToast()
  const onboarding = mode === 'onboarding'
  const initialUnits: UnitPreferences = initialProfile?.units ?? { mass: 'kg', height: 'cm', fluid: 'ml' }
  const baseHeight = initialProfile?.heightCm ?? null
  const heightInches = baseHeight === null ? null : inchesFromCentimeters(baseHeight)
  const initialWeightGoal = initialGoal?.targetWeightKg ?? null
  const [units, setUnits] = useState<UnitPreferences>(initialUnits)
  const [dateMode, setDateMode] = useState<'dob' | 'age'>(initialProfile?.birthDate === null && initialProfile.ageYears != null ? 'age' : 'dob')
  const [birthDate, setBirthDate] = useState(initialProfile?.birthDate ?? '')
  const [age, setAge] = useState(initialProfile?.ageYears?.toString() ?? '')
  const [ageAsOf, setAgeAsOf] = useState(initialProfile?.ageAsOf ?? today())
  const [heightMetric, setHeightMetric] = useState(baseHeight === null ? '' : displayNumber(baseHeight, 2))
  const [feet, setFeet] = useState(heightInches === null ? '' : String(Math.floor(heightInches / 12)))
  const [inches, setInches] = useState(heightInches === null ? '' : displayNumber(heightInches % 12, 2))
  const [heightTouched, setHeightTouched] = useState(false)
  const [firstWeight, setFirstWeight] = useState('')
  const [goalType, setGoalType] = useState<HealthGoal | ''>(initialGoal?.goalType ?? initialProfile?.goal ?? '')
  const [goalStart, setGoalStart] = useState(today())
  const [targetWeight, setTargetWeight] = useState(initialWeightGoal == null ? '' : displayNumber(kilogramsTo(initialWeightGoal, units.mass), 2))
  const [targetWeightTouched, setTargetWeightTouched] = useState(false)
  const [sexForEquation, setSexForEquation] = useState(initialProfile?.sexForEquation ?? '')
  const [activityLevel, setActivityLevel] = useState(initialProfile?.activityLevel ?? '')
  const [backgroundMultiplier, setBackgroundMultiplier] = useState(initialProfile?.backgroundActivityMultiplier == null ? '' : String(initialProfile.backgroundActivityMultiplier))
  const [energyTarget, setEnergyTarget] = useState(initialGoal?.targets.energyKcal?.toString() ?? '')
  const [proteinTarget, setProteinTarget] = useState(initialGoal?.targets.proteinG?.toString() ?? '')
  const [fiberTarget, setFiberTarget] = useState(initialGoal?.targets.fiberG?.toString() ?? '')
  const [sodiumTarget, setSodiumTarget] = useState(initialGoal?.targets.sodiumMg?.toString() ?? '')
  const [energyAligned, setEnergyAligned] = useState(String(initialGoal?.ruleSettings?.energyAlignedPercent ?? ALIGNMENT_RULES.energyAlignedPercent))
  const [energyAttention, setEnergyAttention] = useState(String(initialGoal?.ruleSettings?.energyAttentionPercent ?? ALIGNMENT_RULES.energyAttentionPercent))
  const [minimumLarge, setMinimumLarge] = useState(String(initialGoal?.ruleSettings?.minimumLargeDeviationPercent ?? ALIGNMENT_RULES.minimumLargeDeviationPercent))
  const [sodiumLarge, setSodiumLarge] = useState(String(initialGoal?.ruleSettings?.sodiumLargeDeviationPercent ?? ALIGNMENT_RULES.sodiumLargeDeviationPercent))
  const [fluidTarget, setFluidTarget] = useState(initialGoal?.targets.fluidMl == null ? '' : displayNumber(fluidTo(initialGoal.targets.fluidMl, units.fluid), 2))
  const [fluidTargetTouched, setFluidTargetTouched] = useState(false)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')

  function updateMass(next: UnitPreferences['mass']) {
    if (units.mass === next) return
    if (firstWeight.trim()) {
      const value = Number(firstWeight.replace(',', '.'))
      if (Number.isFinite(value)) setFirstWeight(displayNumber(kilogramsTo(kilogramsFrom(value, units.mass), next), 2))
    }
    if (targetWeight.trim()) {
      const value = Number(targetWeight.replace(',', '.'))
      if (Number.isFinite(value)) setTargetWeight(displayNumber(kilogramsTo(kilogramsFrom(value, units.mass), next), 2))
    }
    setUnits({ ...units, mass: next })
  }

  function updateHeight(next: UnitPreferences['height']) {
    if (units.height === next) return
    if (next === 'ft-in') {
      const cm = Number(heightMetric.replace(',', '.'))
      if (heightMetric.trim() && Number.isFinite(cm)) {
        const totalInches = inchesFromCentimeters(cm)
        setFeet(String(Math.floor(totalInches / 12)))
        setInches(displayNumber(totalInches % 12, 2))
      }
    } else {
      const foot = Number(feet.replace(',', '.'))
      const inch = Number(inches.replace(',', '.'))
      if (feet.trim() && Number.isFinite(foot) && Number.isFinite(inch)) {
        setHeightMetric(displayNumber(centimetersFromInches(foot * 12 + inch), 2))
      }
    }
    setUnits({ ...units, height: next })
  }

  function updateFluid(next: UnitPreferences['fluid']) {
    if (units.fluid === next) return
    if (fluidTarget.trim()) {
      const value = Number(fluidTarget.replace(',', '.'))
      if (Number.isFinite(value)) setFluidTarget(displayNumber(fluidTo(fluidFrom(value, units.fluid), next), 2))
    }
    setUnits({ ...units, fluid: next })
  }

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    setError('')
    setSaving(true)
    try {
      if (!goalType) throw new Error('Select your primary goal.')
      let heightCm: number
      if (!heightTouched && baseHeight !== null) {
        heightCm = baseHeight
      } else if (units.height === 'cm') {
        heightCm = parseNumber(heightMetric, 'height')!
      } else {
        const footValue = parseNumber(feet, 'feet')!
        const inchValue = parseNumber(inches, 'additional inches')!
        if (!Number.isInteger(footValue) || inchValue >= 12) {
          throw new Error('Enter whole feet and additional inches below 12.')
        }
        heightCm = centimetersFromInches(footValue * 12 + inchValue)
      }
      const profileValues: ProfileValues = {
        birthDate: dateMode === 'dob' ? birthDate : null,
        ageYears: dateMode === 'age' ? parseNumber(age, 'age') : null,
        ageAsOf: dateMode === 'age' ? ageAsOf : null,
        heightCm,
        sexForEquation: sexForEquation === 'male' || sexForEquation === 'female' ? sexForEquation : null,
        activityLevel: activityLevel ? activityLevel as ActivityLevel : null,
        backgroundActivityMultiplier: parseNumber(backgroundMultiplier, 'background multiplier', true),
        goal: goalType,
        units
      }
      const goalValues: GoalValues = {
        effectiveFrom: onboarding ? today() : goalStart,
        goalType,
        ruleSettings: {
          energyAlignedPercent: parseNumber(energyAligned, 'energy aligned band')!,
          energyAttentionPercent: parseNumber(energyAttention, 'energy significant-deviation band')!,
          minimumLargeDeviationPercent: parseNumber(minimumLarge, 'minimum-goal large deviation band')!,
          sodiumLargeDeviationPercent: parseNumber(sodiumLarge, 'sodium large deviation band')!
        },
        targetWeightKg: !targetWeightTouched && initialWeightGoal !== null ? initialWeightGoal :
          targetWeight.trim() ? kilogramsFrom(parseNumber(targetWeight, 'target weight')!, units.mass) : null,
        targets: {
          ...EMPTY_TARGETS,
          ...(initialGoal?.targets ?? {}),
          energyKcal: parseNumber(energyTarget, 'calorie target', true),
          proteinG: parseNumber(proteinTarget, 'protein target', true),
          fiberG: parseNumber(fiberTarget, 'fiber target', true),
          sodiumMg: parseNumber(sodiumTarget, 'sodium upper tracking limit', true),
          fluidMl: !fluidTargetTouched && initialGoal?.targets.fluidMl != null ? initialGoal.targets.fluidMl :
            fluidTarget.trim() ? fluidFrom(parseNumber(fluidTarget, 'fluid target')!, units.fluid) : null
        }
      }
      const weight = onboarding ? kilogramsFrom(parseNumber(firstWeight, 'initial weight')!, units.mass) : null
      if (onboarding) await saveProfileAndGoals(profileValues, goalValues, weight)
      else if (section === 'profile') await saveProfileSettings(profileValues)
      else await saveGoalSettings(goalValues)
      if (onboarding) toast.success('Profile created.')
      onSaved?.()
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : 'Unable to save. Please check local storage and retry.')
    } finally {
      setSaving(false)
    }
  }

  return (
    <form onSubmit={(event) => { void submit(event) }} className="space-y-6" noValidate>
      {(onboarding || section === 'profile') && <fieldset className="rounded-2xl border border-slate-200 bg-white p-5">
        <legend className="px-1 text-lg font-bold">Personal profile</legend>
        <div className="mb-4 grid grid-cols-2 gap-3">
          <label className={labelClass}>Weight units
            <select className={inputClass} value={units.mass} onChange={(e) => updateMass(e.target.value as UnitPreferences['mass'])}>
              <option value="kg">Kilograms (kg)</option><option value="lb">Pounds (lb)</option>
            </select>
          </label>
          <label className={labelClass}>Height units
            <select className={inputClass} value={units.height} onChange={(e) => updateHeight(e.target.value as UnitPreferences['height'])}>
              <option value="cm">Centimeters</option><option value="ft-in">Feet / inches</option>
            </select>
          </label>
            <label className={labelClass}>Fluid display units
              <select className={inputClass} value={units.fluid} onChange={e => updateFluid(e.target.value as UnitPreferences['fluid'])}>
                <option value="ml">Milliliters</option><option value="fl-oz">US fluid ounces</option>
              </select>
            </label>
        </div>
        <div className="mb-4">
          <p className={labelClass}>How would you like to give your age?</p>
          <div className="mt-2 flex flex-wrap gap-4 text-sm">
            <label className="flex min-h-11 items-center gap-2"><input type="radio" name="age-mode" checked={dateMode === 'dob'} onChange={() => setDateMode('dob')} /> Date of birth</label>
            <label className="flex min-h-11 items-center gap-2"><input type="radio" name="age-mode" checked={dateMode === 'age'} onChange={() => setDateMode('age')} /> Age as of a date</label>
          </div>
        </div>
        {dateMode === 'dob' ? (
          <label className={labelClass}>Date of birth
            <input className={inputClass} type="date" max={today()} value={birthDate} onChange={e => setBirthDate(e.target.value)} required />
          </label>
        ) : (
          <div className="grid grid-cols-2 gap-3">
            <label className={labelClass}>Age (years)
              <input className={inputClass} type="number" min="0" max="120" step="1" value={age} onChange={e => setAge(e.target.value)} required />
            </label>
            <label className={labelClass}>Age as of
              <input className={inputClass} type="date" max={today()} value={ageAsOf} onChange={e => setAgeAsOf(e.target.value)} required />
            </label>
          </div>
        )}
        <div className="mt-4">
          {units.height === 'cm' ? (
            <label className={labelClass}>Height (cm)
              <input className={inputClass} type="number" min="50" max="260" step="any" inputMode="decimal" value={heightMetric} onChange={e => { setHeightMetric(e.target.value); setHeightTouched(true) }} required />
            </label>
          ) : (
            <div className="grid grid-cols-2 gap-3">
              <label className={labelClass}>Height (feet)
                <input className={inputClass} type="number" min="0" step="1" value={feet} onChange={e => { setFeet(e.target.value); setHeightTouched(true) }} required />
              </label>
              <label className={labelClass}>Additional inches
                <input className={inputClass} type="number" min="0" max="11.99" step="any" value={inches} onChange={e => { setInches(e.target.value); setHeightTouched(true) }} required />
              </label>
            </div>
          )}
        </div>
        {onboarding && <label className={`${labelClass} mt-4`}>Initial measured weight ({units.mass})
          <input className={inputClass} type="number" min="1" step="any" inputMode="decimal" value={firstWeight} onChange={e => setFirstWeight(e.target.value)} required />
        </label>}
        <div className="mt-4 grid gap-4 sm:grid-cols-2">
          <label className={labelClass}>General activity note (optional; not used in calculations)
            <select className={inputClass} value={activityLevel} onChange={e => setActivityLevel(e.target.value as ActivityLevel | '')}>
              <option value="">Not set</option>
              <option value="sedentary">Mostly seated</option><option value="light">Light</option>
              <option value="moderate">Moderate</option><option value="high">High</option><option value="very-high">Very high</option>
            </select>
          </label>
          <label className={labelClass}>Sex-based reference for energy equation and RENI
            <select className={inputClass} value={sexForEquation} onChange={e => setSexForEquation(e.target.value)}>
              <option value="">Prefer not to specify</option><option value="male">Male reference</option><option value="female">Female reference</option>
            </select>
          </label>
        </div>
        <label className={`${labelClass} mt-4`}>Usual everyday movement (optional, excluding workouts)
          <select
            className={inputClass}
            value={backgroundMultiplier}
            onChange={e => setBackgroundMultiplier(e.target.value)}
          >
            <option value="">Not set — skip daily expenditure estimate</option>
            {BACKGROUND_MOVEMENT_PRESETS.map(preset => (
              <option key={preset.value} value={String(preset.value)}>
                {preset.label} ({preset.range}) — uses ×{preset.value.toFixed(2)}
              </option>
            ))}
            {hasCustomBackgroundMultiplier(backgroundMultiplier) && (
              <option value={backgroundMultiplier}>
                Keep previously saved custom value — ×{Number(backgroundMultiplier).toFixed(2)}
              </option>
            )}
          </select>
        </label>
      </fieldset>}

      {(onboarding || section === 'goals') && <fieldset className="rounded-2xl border border-slate-200 bg-white p-5">
        <legend className="px-1 text-lg font-bold">Your goals</legend>
        <label className={labelClass}>Primary goal
          <select className={inputClass} value={goalType} onChange={e => setGoalType(e.target.value as HealthGoal | '')} required>
            <option value="">Choose a goal</option><option value="maintain">Maintain weight</option>
            <option value="lose">Track toward lower weight</option><option value="gain">Track toward higher weight</option>
            <option value="general-wellness">General wellness</option>
          </select>
        </label>
        {!onboarding && <label className={`${labelClass} mt-4`}>Apply revised goals from
          <input className={inputClass} type="date" min={today()} value={goalStart} onChange={e => setGoalStart(e.target.value)} required />
        </label>}
        <div className="mt-4 grid gap-4 sm:grid-cols-2">
          <label className={labelClass}>Optional target weight ({units.mass})
            <input className={inputClass} type="number" step="any" inputMode="decimal" value={targetWeight} onChange={e => { setTargetWeight(e.target.value); setTargetWeightTouched(true) }} placeholder="Not set" />
          </label>
          <label className={labelClass}>Optional calorie target (kcal/day)
            <input className={inputClass} type="number" step="any" inputMode="decimal" value={energyTarget} onChange={e => setEnergyTarget(e.target.value)} placeholder="Not set" />
          </label>
          <label className={labelClass}>Optional protein target (g/day)
            <input className={inputClass} type="number" step="any" inputMode="decimal" value={proteinTarget} onChange={e => setProteinTarget(e.target.value)} placeholder="Not set" />
          </label>
          <label className={labelClass}>Optional fiber target (g/day)
            <input className={inputClass} type="number" step="any" inputMode="decimal" value={fiberTarget} onChange={e => setFiberTarget(e.target.value)} placeholder="Not set" />
          </label>
          <label className={labelClass}>Optional sodium upper tracking limit (mg/day)
            <input className={inputClass} type="number" step="any" min="0" inputMode="decimal" value={sodiumTarget} onChange={e => setSodiumTarget(e.target.value)} placeholder="Not set" />
          </label>
          <label className={labelClass}>Fluid tracking target ({units.fluid}/day)
            <input className={inputClass} type="number" step="any" inputMode="decimal" value={fluidTarget} onChange={e => { setFluidTarget(e.target.value); setFluidTargetTouched(true) }} placeholder="Not set" />
          </label>
        </div>
        <fieldset className="mt-5 rounded-xl border border-slate-200 p-4">
          <legend className="px-1 text-base font-semibold">Adjustable calendar alignment rules</legend>
          <div className="mt-3 grid grid-cols-2 gap-3">
            <label className={labelClass}>Calories aligned within ±%
              <input className={inputClass} type="number" min="5" max="30" step="any" inputMode="decimal" value={energyAligned} onChange={e => setEnergyAligned(e.target.value)} required />
            </label>
            <label className={labelClass}>Calories large deviation beyond ±%
              <input className={inputClass} type="number" min="15" max="60" step="any" inputMode="decimal" value={energyAttention} onChange={e => setEnergyAttention(e.target.value)} required />
            </label>
            <label className={labelClass}>Minimum goal large deviation below % of target
              <input className={inputClass} type="number" min="10" max="80" step="any" inputMode="decimal" value={minimumLarge} onChange={e => setMinimumLarge(e.target.value)} required />
            </label>
            <label className={labelClass}>Sodium large deviation beyond % over limit
              <input className={inputClass} type="number" min="10" max="70" step="any" inputMode="decimal" value={sodiumLarge} onChange={e => setSodiumLarge(e.target.value)} required />
            </label>
          </div>
        </fieldset>
      </fieldset>}
      {error && <p role="alert" className="rounded-xl bg-rose-50 p-3 text-sm text-rose-900">{error}</p>}
      <button type="submit" disabled={saving} className="min-h-12 w-full rounded-xl bg-evergreen-600 px-5 py-3 font-semibold text-white disabled:opacity-50 hover:bg-evergreen-700">
        {saving ? 'Saving locally…' : onboarding ? 'Create local profile' : section === 'profile' ? 'Save profile' : 'Save goals'}
      </button>
    </form>
  )
}
