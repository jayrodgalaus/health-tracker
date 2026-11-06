import type { LabelBasis, ServingUnit } from '../../domain/models'

export type BasisMode = 'serving' | 'piece' | '100g' | '100ml' | 'custom'

export function inferBasisMode(basis: LabelBasis): BasisMode {
  if (basis.unit === 'serving' && basis.quantity === 1) return 'serving'
  if (basis.unit === 'piece' && basis.quantity === 1) return 'piece'
  if (basis.unit === 'g' && basis.quantity === 100) return '100g'
  if (basis.unit === 'ml' && basis.quantity === 100) return '100ml'
  return 'custom'
}

export function basisFor(mode: BasisMode, quantity: string, unit: ServingUnit): LabelBasis {
  switch (mode) {
    case 'serving': return { quantity: 1, unit: 'serving' }
    case 'piece': return { quantity: 1, unit: 'piece' }
    case '100g': return { quantity: 100, unit: 'g' }
    case '100ml': return { quantity: 100, unit: 'ml' }
    case 'custom': return { quantity: Number(quantity.replace(',', '.')), unit }
  }
}

export const SERVING_UNITS: ServingUnit[] = ['serving', 'piece', 'g', 'oz', 'ml', 'fl-oz']
