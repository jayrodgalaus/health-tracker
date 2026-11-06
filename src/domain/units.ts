/** Exact conversion constants; canonical stored quantities are kg, cm and ml. */
const KG_PER_LB = 0.45359237
const CM_PER_INCH = 2.54

export function kilogramsFrom(value: number, unit: 'kg' | 'lb'): number {
  return unit === 'kg' ? value : value * KG_PER_LB
}
export function kilogramsTo(valueKg: number, unit: 'kg' | 'lb'): number {
  return unit === 'kg' ? valueKg : valueKg / KG_PER_LB
}
export function centimetersFromInches(inches: number): number {
  return inches * CM_PER_INCH
}
export function inchesFromCentimeters(cm: number): number {
  return cm / CM_PER_INCH
}
/** Round only for display; never round canonical values on storage. */
export function displayNumber(value: number, decimals = 1): string {
  return value.toFixed(decimals).replace(/\.0+$/, '')
}
