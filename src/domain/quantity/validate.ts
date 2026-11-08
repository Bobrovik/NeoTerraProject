import { dimensionsEqual, isIntegerDimension } from './dimension'
import {
  findQuantity,
  findUnit,
  unitsAreCompatible,
  type PropertyDefinition,
  type QuantityDefinition,
  type QuantityLibrary,
  type UnitDefinition,
} from './definitions'

export type LibraryCode =
  | 'library.repeat-id'
  | 'library.missing-name'
  | 'library.bad-dimension'
  | 'library.bad-unit'
  | 'library.unit-mismatch'
  | 'library.incompatible'
  | 'library.bad-factor'

export function createQuantityDefinition(input: QuantityDefinition, library: QuantityLibrary): { ok: true; quantity: QuantityDefinition } | { ok: false; code: LibraryCode } {
  if (library.quantities.some((item) => item.id === input.id)) {
    return { ok: false, code: 'library.repeat-id' }
  }
  if (!hasBothNames(input.name) || !hasBothNames(input.description)) {
    return { ok: false, code: 'library.missing-name' }
  }
  if (!isIntegerDimension(input.dimension)) {
    return { ok: false, code: 'library.bad-dimension' }
  }
  const unit = findUnit(library, input.recommendedUnitId)
  if (!unit || !dimensionsEqual(unit.dimension, input.dimension) || unit.temperatureRole !== input.temperatureRole) {
    return { ok: false, code: 'library.unit-mismatch' }
  }
  return { ok: true, quantity: { ...input, status: 'user' } }
}

export function createUnitDefinition(input: UnitDefinition, library: QuantityLibrary): { ok: true; unit: UnitDefinition } | { ok: false; code: LibraryCode } {
  if (library.units.some((item) => item.id === input.id)) {
    return { ok: false, code: 'library.repeat-id' }
  }
  if (library.units.some((item) => item.symbol === input.symbol && item.temperatureRole === input.temperatureRole && dimensionsEqual(item.dimension, input.dimension))) {
    return { ok: false, code: 'library.repeat-id' }
  }
  if (!hasBothNames(input.name) || input.symbol.trim() === '') {
    return { ok: false, code: 'library.missing-name' }
  }
  if (!isIntegerDimension(input.dimension)) {
    return { ok: false, code: 'library.bad-dimension' }
  }
  if (input.conversion.kind === 'affine' && (!Number.isFinite(input.conversion.factor) || input.conversion.factor === 0 || !Number.isFinite(input.conversion.offset))) {
    return { ok: false, code: 'library.bad-factor' }
  }
  return { ok: true, unit: { ...input, symbol: input.symbol.trim(), status: 'user' } }
}

export function createPropertyDefinition(input: PropertyDefinition, library: QuantityLibrary): { ok: true; property: PropertyDefinition } | { ok: false; code: LibraryCode } {
  if (library.properties.some((item) => item.id === input.id)) {
    return { ok: false, code: 'library.repeat-id' }
  }
  if (!hasBothNames(input.name)) {
    return { ok: false, code: 'library.missing-name' }
  }
  const quantity = findQuantity(library, input.quantityId)
  const unit = findUnit(library, input.recommendedUnitId)
  if (!quantity || !unit) {
    return { ok: false, code: 'library.bad-unit' }
  }
  if (!dimensionsEqual(quantity.dimension, unit.dimension) || quantity.temperatureRole !== unit.temperatureRole) {
    return { ok: false, code: 'library.unit-mismatch' }
  }
  for (const unitId of input.permittedUnitIds) {
    const permitted = findUnit(library, unitId)
    if (!permitted || !unitsAreCompatible(unit, permitted)) {
      return { ok: false, code: 'library.incompatible' }
    }
  }
  if (input.minimum !== null && input.maximum !== null && input.maximum < input.minimum) {
    return { ok: false, code: 'library.bad-dimension' }
  }
  return { ok: true, property: { ...input, category: input.category.trim() || 'user', status: 'user' } }
}

function hasBothNames(value: { en: string; ru: string }): boolean {
  return value.en.trim() !== '' && value.ru.trim() !== ''
}
