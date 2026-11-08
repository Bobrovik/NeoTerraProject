import { dimension, isIntegerDimension, type Dimension } from '../domain/quantity/dimension'
import {
  emptyQuantityLibrary,
  type PropertyDefinition,
  type QuantityDefinition,
  type QuantityLibrary,
  type UnitConversion,
  type UnitDefinition,
} from '../domain/quantity/definitions'
import { mergeQuantityLibraries } from '../domain/quantity/library'
import { createPropertyDefinition, createQuantityDefinition, createUnitDefinition } from '../domain/quantity/validate'

export const quantityLibraryVersion = 1 as const
export const quantityLibraryStorageKey = 'future-city.quantity-library.v1'

export type QuantityLibraryStore = {
  getItem(key: string): string | null
  setItem(key: string, value: string): void
}

export type QuantityLibraryRead = { ok: true; library: QuantityLibrary } | { ok: false; code: 'library.storage.read' | 'library.storage.json' | 'library.version' | 'library.unusable' }

export function readQuantityLibrary(store: QuantityLibraryStore): QuantityLibraryRead {
  let raw: string | null
  try {
    raw = store.getItem(quantityLibraryStorageKey)
  } catch {
    return { ok: false, code: 'library.storage.read' }
  }
  if (raw === null) {
    return { ok: true, library: emptyQuantityLibrary() }
  }
  let parsed: unknown
  try {
    parsed = JSON.parse(raw)
  } catch {
    return { ok: false, code: 'library.storage.json' }
  }
  return parseQuantityLibrary(parsed)
}

export function writeQuantityLibrary(store: QuantityLibraryStore, library: QuantityLibrary): QuantityLibraryRead {
  const parsed = parseQuantityLibrary({ version: quantityLibraryVersion, ...library })
  if (!parsed.ok) {
    return parsed
  }
  try {
    store.setItem(quantityLibraryStorageKey, JSON.stringify({ version: quantityLibraryVersion, ...parsed.library }))
  } catch {
    return { ok: false, code: 'library.storage.read' }
  }
  return parsed
}

export function parseQuantityLibrary(value: unknown): QuantityLibraryRead {
  if (!isRecord(value)) {
    return { ok: false, code: 'library.unusable' }
  }
  if (value.version !== quantityLibraryVersion) {
    return { ok: false, code: 'library.version' }
  }
  if (!Array.isArray(value.properties) || !Array.isArray(value.quantities) || !Array.isArray(value.units)) {
    return { ok: false, code: 'library.unusable' }
  }
  const library = emptyQuantityLibrary()
  for (const entry of value.units) {
    const unit = parseUnit(entry)
    if (!unit) {
      return { ok: false, code: 'library.unusable' }
    }
    const created = createUnitDefinition(unit, mergeQuantityLibraries(library))
    if (!created.ok) {
      return { ok: false, code: 'library.unusable' }
    }
    library.units.push(created.unit)
  }
  for (const entry of value.quantities) {
    const quantity = parseQuantityDefinition(entry)
    if (!quantity) {
      return { ok: false, code: 'library.unusable' }
    }
    const created = createQuantityDefinition(quantity, mergeQuantityLibraries(library))
    if (!created.ok) {
      return { ok: false, code: 'library.unusable' }
    }
    library.quantities.push(created.quantity)
  }
  for (const entry of value.properties) {
    const property = parseProperty(entry)
    if (!property) {
      return { ok: false, code: 'library.unusable' }
    }
    const created = createPropertyDefinition(property, mergeQuantityLibraries(library))
    if (!created.ok) {
      return { ok: false, code: 'library.unusable' }
    }
    library.properties.push(created.property)
  }
  return { ok: true, library }
}

function parseUnit(value: unknown): UnitDefinition | undefined {
  if (!isRecord(value) || typeof value.id !== 'string' || typeof value.symbol !== 'string' || !isName(value.name)) {
    return undefined
  }
  const parsedDimension = parseDimension(value.dimension)
  const conversion = parseConversion(value.conversion)
  if (!parsedDimension || !conversion || !isTemperatureRole(value.temperatureRole) || !isSystem(value.system)) {
    return undefined
  }
  return {
    id: value.id,
    symbol: value.symbol,
    name: value.name,
    dimension: parsedDimension,
    conversion,
    system: value.system,
    temperatureRole: value.temperatureRole,
    status: 'user',
  }
}

function parseQuantityDefinition(value: unknown): QuantityDefinition | undefined {
  if (!isRecord(value) || typeof value.id !== 'string' || typeof value.recommendedUnitId !== 'string' || !isName(value.name) || !isName(value.description)) {
    return undefined
  }
  const parsedDimension = parseDimension(value.dimension)
  if (!parsedDimension || !isTemperatureRole(value.temperatureRole)) {
    return undefined
  }
  return {
    id: value.id,
    name: value.name,
    description: value.description,
    dimension: parsedDimension,
    recommendedUnitId: value.recommendedUnitId,
    temperatureRole: value.temperatureRole,
    status: 'user',
  }
}

function parseProperty(value: unknown): PropertyDefinition | undefined {
  if (!isRecord(value) || typeof value.id !== 'string' || typeof value.category !== 'string' || typeof value.quantityId !== 'string' || typeof value.recommendedUnitId !== 'string' || !isName(value.name) || !isName(value.description)) {
    return undefined
  }
  if (value.dataType !== 'number' && value.dataType !== 'text' && value.dataType !== 'range') {
    return undefined
  }
  if (!Array.isArray(value.permittedUnitIds) || value.permittedUnitIds.some((item) => typeof item !== 'string')) {
    return undefined
  }
  if (typeof value.conditions !== 'string' || !isNullableNumber(value.minimum) || !isNullableNumber(value.maximum)) {
    return undefined
  }
  return {
    id: value.id,
    name: { en: value.name.en, ru: value.name.ru },
    description: { en: value.description.en, ru: value.description.ru },
    category: value.category,
    dataType: value.dataType,
    quantityId: value.quantityId,
    recommendedUnitId: value.recommendedUnitId,
    permittedUnitIds: value.permittedUnitIds,
    conditions: value.conditions,
    minimum: value.minimum,
    maximum: value.maximum,
    status: 'user',
  }
}

function parseDimension(value: unknown): Dimension | undefined {
  if (!isRecord(value)) {
    return undefined
  }
  const keys = ['M', 'L', 'T', 'I', 'Th', 'N', 'J'] as const
  const next = dimension()
  for (const key of keys) {
    if (typeof value[key] !== 'number' || !Number.isInteger(value[key])) {
      return undefined
    }
    next[key] = value[key]
  }
  return isIntegerDimension(next) ? next : undefined
}

function parseConversion(value: unknown): UnitConversion | undefined {
  if (!isRecord(value)) {
    return undefined
  }
  if (value.kind === 'defined') {
    return { kind: 'defined' }
  }
  if (value.kind === 'affine' && typeof value.factor === 'number' && typeof value.offset === 'number') {
    return { kind: 'affine', factor: value.factor, offset: value.offset }
  }
  return undefined
}

function isName(value: unknown): value is { en: string; ru: string } {
  return isRecord(value) && typeof value.en === 'string' && typeof value.ru === 'string'
}

function isNullableNumber(value: unknown): value is number | null {
  return value === null || (typeof value === 'number' && Number.isFinite(value))
}

function isTemperatureRole(value: unknown): value is UnitDefinition['temperatureRole'] {
  return value === 'absolute' || value === 'interval' || value === 'none'
}

function isSystem(value: unknown): value is UnitDefinition['system'] {
  return value === 'SI' || value === 'accepted' || value === 'other' || value === 'analytical'
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value)
}
