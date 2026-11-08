import { describe, expect, it } from 'vitest'
import { applyCardDraft, blankQuantity, createCardDraft } from '../resource-catalog-form'
import { emptyResourceCatalog } from '../resource-catalog'
import { convertValue, findProperty, findUnit, unitsForProperty } from './definitions'
import { changeMeasurementUnit, propertyLabel, selectPropertyForMeasurement } from './entry'
import { needsQuantityReview } from './legacy'
import { builtinQuantityLibrary, searchProperties } from './library'
import { createPropertyDefinition } from './validate'

const library = builtinQuantityLibrary

function draft() {
  return blankQuantity('qty:row')
}

describe('characteristic entry', () => {
  it('finds a property by an English or Russian name, a quantity, a category, and a unit', () => {
    expect(searchProperties(library, 'Density').map((item) => item.id)).toContain('property:density')
    expect(searchProperties(library, 'pH').map((item) => item.id)).toEqual(['property:ph'])
    expect(searchProperties(library, 'Плотность').map((item) => item.id)).toContain('property:density')
    expect(searchProperties(library, 'удельная теплоёмкость').map((item) => item.id)).toEqual(['property:specific-heat'])
    expect(searchProperties(library, '', { quantityId: 'quantity:dynamic-viscosity' }).map((item) => item.id)).toEqual(['property:dynamic-viscosity'])
    expect(searchProperties(library, 'kg/m³').map((item) => item.id)).toEqual(['property:density'])
    expect(searchProperties(library, 'mg/L').map((item) => item.id)).toEqual(['property:concentration', 'property:nitrates', 'property:heavy-metals'])
    expect(searchProperties(library, '', { category: 'quality' }).map((item) => item.id)).toEqual(['property:ph', 'property:turbidity', 'property:microorganisms'])
  })

  it('selects the recommended unit and converts only inside that property', () => {
    const density = findProperty(library, 'property:density')
    const viscosity = findProperty(library, 'property:dynamic-viscosity')
    const nitrates = findProperty(library, 'property:nitrates')
    expect(density && viscosity && nitrates).toBeTruthy()
    if (!density || !viscosity || !nitrates) {
      return
    }
    const selected = selectPropertyForMeasurement(draft(), density, library)
    expect(selected.ok && selected.draft).toMatchObject({ propertyId: 'property:density', unitId: 'unit:kg-m3', unit: 'kg/m³', valueText: '', quantityId: 'quantity:density' })
    const withValue = selectPropertyForMeasurement({ ...draft(), valueText: '1' }, viscosity, library)
    expect(withValue.ok).toBe(true)
    if (!withValue.ok) {
      return
    }
    const changed = changeMeasurementUnit(withValue.draft, 'unit:mPa-s', library)
    expect(changed.ok && changed.draft.valueText).toBe('1000')
    expect(changeMeasurementUnit(withValue.draft, 'unit:Pa', library).ok).toBe(false)
    const emptySwitch = changeMeasurementUnit({ ...withValue.draft, valueText: '' }, 'unit:mPa-s', library)
    expect(emptySwitch.ok && emptySwitch.draft.valueText).toBe('')
    expect(unitsForProperty(library, density).map((unit) => unit.id)).toEqual(['unit:kg-m3'])
    expect(unitsForProperty(library, nitrates).map((unit) => unit.id)).toEqual(['unit:mg-L', 'unit:ug-L'])
    expect(unitsForProperty(library, density).some((unit) => unitsForProperty(library, nitrates).some((other) => other.id === unit.id))).toBe(false)
  })

  it('keeps pH, NTU, and CFU on their own units and omits a quantity kind', () => {
    for (const id of ['property:ph', 'property:turbidity', 'property:microorganisms'] as const) {
      const property = findProperty(library, id)
      expect(property).toBeTruthy()
      if (!property) {
        return
      }
      const selected = selectPropertyForMeasurement(draft(), property, library)
      expect(selected.ok && selected.draft.quantityKind).toBe('')
      expect(selected.ok && selected.draft.unitId).toBe(property.recommendedUnitId)
    }
    const ph = findUnit(library, 'unit:pH')
    const ntu = findUnit(library, 'unit:NTU')
    const cfu = findUnit(library, 'unit:CFU-100mL')
    const milligram = findUnit(library, 'unit:mg-L')
    expect(ph && ntu && cfu && milligram).toBeTruthy()
    if (!ph || !ntu || !cfu || !milligram) {
      return
    }
    expect(convertValue(7, ph, milligram).ok).toBe(false)
    expect(convertValue(2, ntu, milligram).ok).toBe(false)
    expect(convertValue(3, cfu, milligram).ok).toBe(false)
  })

  it('stores a custom property once and reuses it, including a range, a source, and an empty value', () => {
    const created = createPropertyDefinition({
      id: 'property:user:soil',
      name: { en: 'Soil filtration coefficient', ru: 'Коэффициент фильтрации почвы' },
      description: { en: 'Filtration.', ru: 'Фильтрация.' },
      category: 'environmental',
      dataType: 'number',
      quantityId: 'quantity:velocity',
      recommendedUnitId: 'unit:m-s',
      permittedUnitIds: ['unit:m-s', 'unit:km-h'],
      conditions: 'saturated',
      minimum: null,
      maximum: null,
      status: 'user',
    }, library)
    expect(created.ok).toBe(true)
    if (!created.ok) {
      return
    }
    const merged = { ...library, properties: [...library.properties, created.property] }
    const first = selectPropertyForMeasurement(draft(), created.property, merged)
    const second = selectPropertyForMeasurement({ ...draft(), id: 'qty:other' }, created.property, merged)
    expect(first.ok && second.ok).toBe(true)
    if (!first.ok || !second.ok) {
      return
    }
    expect(first.draft.propertyId).toBe(second.draft.propertyId)
    const card = createCardDraft({ id: 'card:water', kind: 'resource', createdAt: '2026-11-09T00:00:00.000Z' })
    card.name = 'Drinking water'
    card.evidence = [{ id: 'evidence:lab', title: 'Laboratory note', author: 'Lab', yearText: '', url: '', studyType: 'study', supports: 'Method note', verification: 'unreviewed' }]
    const base = first.draft
    card.quantities = [
      { ...base, id: 'qty:soil', valueText: '', lowerText: '0.001', upperText: '', conditions: 'saturated', evidenceId: 'evidence:lab', valueOrigin: 'measured', aspect: 'property' },
      { ...base, id: 'qty:ph', propertyId: 'property:ph', quantityId: 'quantity:ph', unitId: 'unit:pH', unit: 'pH', valueText: '', aspect: 'quality' },
      { ...base, id: 'qty:stock', propertyId: '', quantityId: '', unitId: '', unit: 't', quantityKind: 'reserve', valueText: '', name: 'Stored mass', aspect: 'metric' },
      { ...base, id: 'qty:run', propertyId: 'property:power', quantityId: 'quantity:power', unitId: 'unit:W', unit: 'W', valueText: '', aspect: 'operation' },
    ]
    card.physicalAbundance = { ...card.physicalAbundance, name: 'Physical abundance', unit: 'm³', quantityKind: 'volume', valueText: '' }
    const saved = applyCardDraft(emptyResourceCatalog(), card, '2026-11-09T00:00:00.000Z')
    expect(saved.ok).toBe(true)
    if (!saved.ok) {
      return
    }
    const rows = saved.catalog.cards[0]?.quantities ?? []
    expect(rows.map((item) => item.aspect)).toEqual(['property', 'quality', 'metric', 'operation'])
    expect(rows[0]).toMatchObject({ propertyId: 'property:user:soil', value: null, lower: 0.001, conditions: 'saturated', evidenceId: 'evidence:lab', valueOrigin: 'measured' })
    expect(rows[0]?.quantityKind).toBeUndefined()
    expect(rows[1]?.quantityKind).toBeUndefined()
    expect(rows[2]).toMatchObject({ quantityKind: 'reserve', value: null, unit: 't', name: 'Stored mass' })
    expect(rows[2]?.propertyId).toBeUndefined()
    expect(needsQuantityReview(rows[2]!)).toBe(true)
    expect(saved.catalog.cards[0]?.accounts?.physicalAbundance?.value).toBeNull()
    const english = propertyLabel(created.property, 'en')
    const russian = propertyLabel(created.property, 'ru')
    expect(english).toBe('Soil filtration coefficient')
    expect(russian).toBe('Коэффициент фильтрации почвы')
    expect(saved.catalog.cards[0]?.name).toBe('Drinking water')
    expect(rows[0]?.name).toBe('')
  })
})
