import type { QuantityKind } from '../resource-catalog'

const exactQuantityKinds: Record<string, QuantityKind> = {
  'quantity:mass': 'mass',
  'quantity:volume': 'volume',
  'quantity:density': 'density',
  'quantity:power': 'power',
  'quantity:energy': 'energy',
  'quantity:area': 'area',
}

export function legacyKindForQuantity(quantityId: string | undefined, propertyId?: string): QuantityKind | undefined {
  if (propertyId === 'property:efficiency') {
    return 'efficiency'
  }
  return quantityId ? exactQuantityKinds[quantityId] : undefined
}

export function needsQuantityReview(record: { propertyId?: string }): boolean {
  return record.propertyId === undefined || record.propertyId === ''
}
