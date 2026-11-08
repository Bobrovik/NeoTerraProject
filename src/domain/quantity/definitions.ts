import { dimension, dimensionsEqual, type Dimension } from './dimension'

export type LocalizedName = { en: string; ru: string }

export type TemperatureRole = 'absolute' | 'interval' | 'none'

export type UnitSystem = 'SI' | 'accepted' | 'other' | 'analytical'

export type DefinitionStatus = 'library' | 'user' | 'review'

export type UnitConversion =
  | { kind: 'affine'; factor: number; offset: number }
  | { kind: 'defined' }

export type UnitDefinition = {
  id: string
  symbol: string
  name: LocalizedName
  dimension: Dimension
  conversion: UnitConversion
  system: UnitSystem
  temperatureRole: TemperatureRole
  status: DefinitionStatus
}

export type QuantityDefinition = {
  id: string
  name: LocalizedName
  description: LocalizedName
  dimension: Dimension
  recommendedUnitId: string
  temperatureRole: TemperatureRole
  status: DefinitionStatus
}

export type PropertyDataType = 'number' | 'text' | 'range'

export type PropertyDefinition = {
  id: string
  name: LocalizedName
  description: LocalizedName
  category: string
  dataType: PropertyDataType
  quantityId: string
  recommendedUnitId: string
  permittedUnitIds: string[]
  conditions: string
  minimum: number | null
  maximum: number | null
  status: DefinitionStatus
}

export type QuantityLibrary = {
  properties: PropertyDefinition[]
  quantities: QuantityDefinition[]
  units: UnitDefinition[]
}

export const suggestedPropertyCategories = [
  'physical',
  'chemical',
  'biological',
  'radiological',
  'mechanical',
  'energy',
  'technological',
  'environmental',
  'quantitative',
] as const

export function emptyQuantityLibrary(): QuantityLibrary {
  return { properties: [], quantities: [], units: [] }
}

export function affineUnit(input: {
  id: string
  symbol: string
  name: LocalizedName
  dimension: Dimension
  factor: number
  offset?: number
  system?: UnitSystem
  temperatureRole?: TemperatureRole
  status?: DefinitionStatus
}): UnitDefinition {
  return {
    id: input.id,
    symbol: input.symbol,
    name: input.name,
    dimension: input.dimension,
    conversion: { kind: 'affine', factor: input.factor, offset: input.offset ?? 0 },
    system: input.system ?? 'SI',
    temperatureRole: input.temperatureRole ?? 'none',
    status: input.status ?? 'library',
  }
}

export function definedUnit(input: {
  id: string
  symbol: string
  name: LocalizedName
  system?: UnitSystem
}): UnitDefinition {
  return {
    id: input.id,
    symbol: input.symbol,
    name: input.name,
    dimension: dimension(),
    conversion: { kind: 'defined' },
    system: input.system ?? 'analytical',
    temperatureRole: 'none',
    status: 'library',
  }
}

export function convertValue(value: number, from: UnitDefinition, to: UnitDefinition): { ok: true; value: number } | { ok: false; code: 'unit.incompatible' } {
  if (!Number.isFinite(value)) {
    return { ok: false, code: 'unit.incompatible' }
  }
  if (from.id === to.id) {
    return { ok: true, value }
  }
  if (from.conversion.kind !== 'affine' || to.conversion.kind !== 'affine') {
    return { ok: false, code: 'unit.incompatible' }
  }
  if (!dimensionsEqual(from.dimension, to.dimension) || from.temperatureRole !== to.temperatureRole) {
    return { ok: false, code: 'unit.incompatible' }
  }
  if (from.conversion.factor === 0 || to.conversion.factor === 0) {
    return { ok: false, code: 'unit.incompatible' }
  }
  const base = value * from.conversion.factor + from.conversion.offset
  const next = (base - to.conversion.offset) / to.conversion.factor
  if (!Number.isFinite(next)) {
    return { ok: false, code: 'unit.incompatible' }
  }
  return { ok: true, value: next }
}

export function unitsAreCompatible(left: UnitDefinition, right: UnitDefinition): boolean {
  return convertValue(1, left, right).ok || left.id === right.id
}

export function findUnit(library: QuantityLibrary, id: string): UnitDefinition | undefined {
  return library.units.find((unit) => unit.id === id)
}

export function findQuantity(library: QuantityLibrary, id: string): QuantityDefinition | undefined {
  return library.quantities.find((quantity) => quantity.id === id)
}

export function findProperty(library: QuantityLibrary, id: string): PropertyDefinition | undefined {
  return library.properties.find((property) => property.id === id)
}

export function compatibleUnits(library: QuantityLibrary, unitId: string): UnitDefinition[] {
  const unit = findUnit(library, unitId)
  if (!unit) {
    return []
  }
  return library.units.filter((candidate) => unitsAreCompatible(unit, candidate))
}

export function formatQuantityValue(value: number): string {
  return String(Number(value.toPrecision(12)))
}

export function unitsForProperty(library: QuantityLibrary, property: PropertyDefinition): UnitDefinition[] {
  const permitted = property.permittedUnitIds
    .map((id) => findUnit(library, id))
    .filter((unit): unit is UnitDefinition => unit !== undefined)
  if (permitted.length > 0) {
    return permitted
  }
  return compatibleUnits(library, property.recommendedUnitId)
}
