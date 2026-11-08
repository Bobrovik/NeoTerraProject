import type { QuantityDraft } from '../resource-catalog-form'
import {
  convertValue,
  findProperty,
  findUnit,
  formatQuantityValue,
  unitsForProperty,
  type PropertyDefinition,
  type QuantityLibrary,
} from './definitions'

export function propertyLabel(property: PropertyDefinition, language: 'en' | 'ru'): string {
  const preferred = language === 'ru' ? property.name.ru : property.name.en
  const fallback = language === 'ru' ? property.name.en : property.name.ru
  return preferred.trim() || fallback.trim()
}

export function selectPropertyForMeasurement(
  draft: QuantityDraft,
  property: PropertyDefinition,
  library: QuantityLibrary,
): { ok: true; draft: QuantityDraft } | { ok: false; code: 'unit.incompatible' } {
  const allowed = unitsForProperty(library, property)
  const recommended = findUnit(library, property.recommendedUnitId)
  if (!recommended || !allowed.some((unit) => unit.id === recommended.id)) {
    return { ok: false, code: 'unit.incompatible' }
  }
  const known = draft.unitId ? findUnit(library, draft.unitId) : undefined
  const bySymbol = allowed.find((unit) => unit.symbol === draft.unit.trim())
  const current = known ?? bySymbol
  let nextUnit = recommended
  let valueText = draft.valueText
  if (current && allowed.some((unit) => unit.id === current.id)) {
    nextUnit = current
  } else if (current && draft.valueText.trim() !== '') {
    const numeric = Number(draft.valueText)
    const converted = Number.isFinite(numeric) ? convertValue(numeric, current, recommended) : { ok: false as const, code: 'unit.incompatible' as const }
    if (!converted.ok) {
      return { ok: false, code: 'unit.incompatible' }
    }
    valueText = formatQuantityValue(converted.value)
  } else if ((draft.unit.trim() !== '' || draft.unitId !== '') && draft.valueText.trim() !== '') {
    return { ok: false, code: 'unit.incompatible' }
  }
  return {
    ok: true,
    draft: {
      ...draft,
      propertyId: property.id,
      quantityId: property.quantityId,
      unitId: nextUnit.id,
      unit: nextUnit.symbol,
      valueText,
      conditions: draft.conditions.trim() || property.conditions,
    },
  }
}

export function changeMeasurementUnit(
  draft: QuantityDraft,
  unitId: string,
  library: QuantityLibrary,
): { ok: true; draft: QuantityDraft } | { ok: false; code: 'unit.incompatible' } {
  const property = draft.propertyId ? findProperty(library, draft.propertyId) : undefined
  const next = property ? unitsForProperty(library, property).find((unit) => unit.id === unitId) : undefined
  if (!property || !next) {
    return { ok: false, code: 'unit.incompatible' }
  }
  if (draft.valueText.trim() === '') {
    return { ok: true, draft: { ...draft, unitId: next.id, unit: next.symbol } }
  }
  const current = findUnit(library, draft.unitId)
  const numeric = Number(draft.valueText)
  if (!current || !Number.isFinite(numeric)) {
    return { ok: false, code: 'unit.incompatible' }
  }
  const converted = convertValue(numeric, current, next)
  if (!converted.ok) {
    return converted
  }
  return { ok: true, draft: { ...draft, unitId: next.id, unit: next.symbol, valueText: formatQuantityValue(converted.value) } }
}

export function observationConditionsMatter(quantityId: string): boolean {
  return quantityId === 'quantity:temperature'
    || quantityId === 'quantity:pressure'
    || quantityId === 'quantity:density'
    || quantityId === 'quantity:dynamic-viscosity'
    || quantityId === 'quantity:specific-heat'
    || quantityId === 'quantity:conductivity'
}
