/** Pure inputs for walking/running. No assumptions about unrecorded data. */
export type PaceField = 'duration' | 'distance' | 'speed'
export type PaceValues = Record<PaceField, string>
export interface PaceInputState {
  values: PaceValues
  /** At most two values entered by the person; the third is derived. */
  entered: PaceField[]
}
const fields: PaceField[] = ['duration', 'distance', 'speed']

function positive(raw: string): number | null {
  const value = raw.trim().replace(',', '.')
  if (!/^(?:\d+(?:\.\d*)?|\.\d+)$/.test(value)) return null
  const n = Number(value)
  return Number.isFinite(n) && n > 0 ? n : null
}

/** Compute exactly the missing metric, never from a single value or invalid input. */
export function calculatedPaceValue(values: PaceValues, missing: PaceField): number | null {
  const duration = positive(values.duration)
  const distance = positive(values.distance)
  const speed = positive(values.speed)
  let result: number | null = null
  if (missing === 'duration' && distance !== null && speed !== null) {
    result = 60 * distance / speed
  } else if (missing === 'distance' && duration !== null && speed !== null) {
    result = speed * duration / 60
  } else if (missing === 'speed' && duration !== null && distance !== null) {
    result = 60 * distance / duration
  }
  return result !== null && Number.isFinite(result) && result > 0 ? result : null
}

/** Keep six decimal places for practical entry, without presenting false zeros. */
function displayComputed(value: number): string {
  return String(Number(value.toFixed(6)))
}

function derive(state: PaceInputState): PaceInputState {
  const values: PaceValues = { duration: '', distance: '', speed: '' }
  for (const field of state.entered) values[field] = state.values[field]
  if (state.entered.length === 2) {
    const missing = fields.find(field => !state.entered.includes(field))!
    const computed = calculatedPaceValue(values, missing)
    if (computed !== null) values[missing] = displayComputed(computed)
  }
  return { entered: state.entered, values }
}

export function initialPaceInputs(values: PaceValues): PaceInputState {
  const entered = fields.filter(field => values[field].trim() !== '').slice(0, 2)
  return derive({ values, entered })
}

/**
 * The two most recently edited nonblank fields are authoritative.
 * Editing the calculated field switches which field is calculated.
 * Clearing one source clears the derived value; it cannot become fabricated evidence.
 */
export function updatePaceInputs(state: PaceInputState, field: PaceField, value: string): PaceInputState {
  const entered = state.entered.filter(item => item !== field)
  if (value.trim()) entered.push(field)
  return derive({ values: { ...state.values, [field]: value }, entered: entered.slice(-2) })
}

export function hasTwoPaceInputs(state: PaceInputState): boolean {
  return state.entered.length === 2 &&
    state.entered.every(field => positive(state.values[field]) !== null) &&
    fields.every(field => positive(state.values[field]) !== null)
}
