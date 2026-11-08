import { describe, expect, it } from 'vitest'
import { readQuantityLibrary, quantityLibraryStorageKey, writeQuantityLibrary } from '../../data/quantity-library-storage'
import { applyCardDraft, createCardDraft } from '../resource-catalog-form'
import { emptyResourceCatalog } from '../resource-catalog'
import { dimension, dimensionsEqual, divideDimensions, formatDimension, isDimensionless, multiplyDimensions } from './dimension'
import { convertValue, findUnit, type QuantityLibrary, type UnitDefinition } from './definitions'
import { pumpPowerDimensionMatchesPower } from './formula'
import { needsQuantityReview } from './legacy'
import { builtinQuantityLibrary } from './library'
import { createPropertyDefinition, createQuantityDefinition, createUnitDefinition } from './validate'

const library = builtinQuantityLibrary

function unit(id: string): UnitDefinition {
  const found = findUnit(library, id)
  if (!found) {
    throw new Error(id)
  }
  return found
}

function converted(value: number, from: string, to: string): number {
  const result = convertValue(value, unit(from), unit(to))
  if (!result.ok) {
    throw new Error(result.code)
  }
  return result.value
}

describe('physical dimensions', () => {
  it('builds base and derived dimensions and rejects an incompatible pair', () => {
    expect(formatDimension(dimension({ M: 1 }))).toBe('M')
    expect(formatDimension(dimension({ L: 2 }))).toBe('L²')
    expect(formatDimension(dimension({ L: 3 }))).toBe('L³')
    expect(formatDimension(dimension({ L: 1, T: -1 }))).toBe('L·T⁻¹')
    expect(formatDimension(dimension({ L: 1, T: -2 }))).toBe('L·T⁻²')
    expect(formatDimension(dimension({ M: 1, L: -3 }))).toBe('M·L⁻³')
    expect(formatDimension(dimension({ M: 1, L: -1, T: -2 }))).toBe('M·L⁻¹·T⁻²')
    expect(formatDimension(dimension({ M: 1, L: 2, T: -2 }))).toBe('M·L²·T⁻²')
    expect(formatDimension(dimension({ M: 1, L: 2, T: -3 }))).toBe('M·L²·T⁻³')
    expect(formatDimension(dimension({ M: 1, L: -1, T: -1 }))).toBe('M·L⁻¹·T⁻¹')
    expect(formatDimension(dimension({ L: 3, T: -1 }))).toBe('L³·T⁻¹')
    expect(formatDimension(dimension({ M: 1, T: -1 }))).toBe('M·T⁻¹')
    expect(isDimensionless(dimension())).toBe(true)
    expect(dimensionsEqual(unit('unit:kg').dimension, unit('unit:m').dimension)).toBe(false)
    expect(dimensionsEqual(multiplyDimensions(dimension({ M: 1 }), dimension({ L: -3 })), dimension({ M: 1, L: -3 }))).toBe(true)
    expect(dimensionsEqual(divideDimensions(dimension({ L: 3 }), dimension({ T: 1 })), dimension({ L: 3, T: -1 }))).toBe(true)
  })

  it('checks the pump power relation by dimension only', () => {
    expect(pumpPowerDimensionMatchesPower()).toBe(true)
  })
})

describe('units of measurement', () => {
  it('converts the required units, including compound density units and prefixes', () => {
    expect(converted(1, 'unit:t', 'unit:kg')).toBe(1000)
    expect(converted(1000, 'unit:kg', 'unit:t')).toBe(1)
    expect(converted(1, 'unit:L', 'unit:m3')).toBe(0.001)
    expect(converted(1, 'unit:m3', 'unit:L')).toBe(1000)
    expect(converted(1, 'unit:h', 'unit:s')).toBe(3600)
    expect(converted(1, 'unit:kWh', 'unit:J')).toBe(3_600_000)
    expect(converted(1, 'unit:MPa', 'unit:Pa')).toBe(1_000_000)
    expect(converted(1, 'unit:mg-L', 'unit:kg-m3')).toBe(0.001)
    expect(converted(1, 'unit:kg-m3', 'unit:mg-L')).toBe(1000)
    expect(converted(1, 'unit:km', 'unit:m')).toBe(1000)
    expect(converted(1, 'unit:MHz', 'unit:Hz')).toBe(1_000_000)
    expect(converted(1, 'unit:mHz', 'unit:Hz')).toBe(0.001)
    expect(converted(1, 'unit:MHz', 'unit:mHz')).toBe(1_000_000_000)
    expect(unit('unit:MHz').symbol).not.toBe(unit('unit:mHz').symbol)
    expect(library.units.filter((item) => item.symbol.toLowerCase() === 'mhz').map((item) => item.symbol).sort()).toEqual(['MHz', 'mHz'])
  })

  it('keeps absolute temperature apart from a temperature interval and blocks incompatible units', () => {
    expect(converted(0, 'unit:C', 'unit:K')).toBe(273.15)
    expect(converted(10, 'unit:C-interval', 'unit:K-interval')).toBe(10)
    expect(convertValue(0, unit('unit:C'), unit('unit:K-interval')).ok).toBe(false)
    expect(convertValue(1, unit('unit:kg'), unit('unit:m')).ok).toBe(false)
    expect(convertValue(1, unit('unit:kWh'), unit('unit:W')).ok).toBe(false)
    expect(convertValue(7, unit('unit:pH'), unit('unit:percent')).ok).toBe(false)
    expect(convertValue(2, unit('unit:NTU'), unit('unit:S-m')).ok).toBe(false)
    expect(convertValue(3, unit('unit:CFU-100mL'), unit('unit:mg-L')).ok).toBe(false)
  })
})

describe('property definitions', () => {
  it('creates a reusable custom property and rejects a bad dimension, a repeated id, and an incompatible unit', () => {
    const soil = createPropertyDefinition({
      id: 'property:user:soil',
      name: { en: 'Soil filtration coefficient', ru: 'Коэффициент фильтрации почвы' },
      description: { en: 'Filtration in saturated soil.', ru: 'Фильтрация в насыщенной почве.' },
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
    expect(soil.ok).toBe(true)
    if (!soil.ok) {
      return
    }
    const again = createPropertyDefinition(soil.property, { ...library, properties: [...library.properties, soil.property] })
    expect(again.ok).toBe(false)
    const mismatch = createPropertyDefinition({ ...soil.property, id: 'property:user:other', recommendedUnitId: 'unit:Pa' }, library)
    expect(mismatch.ok).toBe(false)
    const broken = createQuantityDefinition({
      id: 'quantity:user:broken',
      name: { en: 'Broken', ru: 'Broken' },
      description: { en: 'Broken', ru: 'Broken' },
      dimension: dimension({ L: 1.5 }),
      recommendedUnitId: 'unit:m',
      temperatureRole: 'none',
      status: 'user',
    }, library)
    expect(broken.ok).toBe(false)
    const factor = createUnitDefinition({
      ...unit('unit:kg'),
      id: 'unit:user:zero',
      symbol: 'zz',
      conversion: { kind: 'affine', factor: 0, offset: 0 },
    }, library)
    expect(factor.ok).toBe(false)
  })

  it('stores only the user library and reads it back once', () => {
    const soil = createPropertyDefinition({
      id: 'property:user:soil',
      name: { en: 'Soil filtration coefficient', ru: 'Коэффициент фильтрации почвы' },
      description: { en: 'Filtration in saturated soil.', ru: 'Фильтрация в насыщенной почве.' },
      category: 'user',
      dataType: 'number',
      quantityId: 'quantity:velocity',
      recommendedUnitId: 'unit:m-s',
      permittedUnitIds: [],
      conditions: '',
      minimum: null,
      maximum: null,
      status: 'user',
    }, library)
    expect(soil.ok).toBe(true)
    if (!soil.ok) {
      return
    }
    const data: Record<string, string> = {}
    const store = {
      getItem: (key: string) => data[key] ?? null,
      setItem: (key: string, value: string) => {
        data[key] = value
      },
    }
    const user: QuantityLibrary = { properties: [soil.property], quantities: [], units: [] }
    expect(writeQuantityLibrary(store, user).ok).toBe(true)
    const read = readQuantityLibrary(store)
    expect(read).toEqual({ ok: true, library: user })
    expect(data[quantityLibraryStorageKey]).not.toContain('unit:kg')
    const second = writeQuantityLibrary(store, read.ok ? read.library : user)
    expect(second).toEqual(read)
    const corrupt = '{not json'
    data[quantityLibraryStorageKey] = corrupt
    expect(readQuantityLibrary(store)).toEqual({ ok: false, code: 'library.storage.json' })
    expect(data[quantityLibraryStorageKey]).toBe(corrupt)
  })

  it('records several measurements of one property, with a range, conditions, uncertainty, and a study', () => {
    const draft = createCardDraft({ id: 'card:water', kind: 'resource', createdAt: '2026-11-02T00:00:00.000Z' })
    draft.name = 'Drinking water'
    draft.evidence = [{
      id: 'evidence:lab',
      title: 'Laboratory note',
      author: 'Lab',
      yearText: '2024',
      url: '',
      studyType: 'study',
      supports: 'Density at the stated temperature',
      verification: 'unreviewed',
    }]
    const row = {
      ...draft.physicalAbundance,
      id: 'qty:density-a',
      name: 'Density',
      valueText: '998',
      unit: 'kg/m³',
      quantityKind: '' as const,
      propertyId: 'property:density',
      quantityId: 'quantity:density',
      unitId: 'unit:kg-m3',
      valueOrigin: 'measured' as const,
      method: 'pycnometer',
      uncertaintyText: '0.2',
      lowerText: '997',
      upperText: '999',
      conditions: 'sample at the recorded temperature',
      evidenceId: 'evidence:lab',
      aspect: 'property' as const,
      conditionTemperatureText: '20',
      conditionTemperatureUnitId: 'unit:C',
    }
    draft.quantities = [
      row,
      { ...row, id: 'qty:density-b', valueText: '995', measuredAt: '2024-06-01', conditionTemperatureText: '30' },
    ]
    const applied = applyCardDraft(emptyResourceCatalog(), draft, '2026-11-02T00:00:00.000Z')
    expect(applied.ok).toBe(true)
    if (!applied.ok) {
      return
    }
    const saved = applied.catalog.cards[0]?.quantities ?? []
    expect(saved.map((item) => item.propertyId)).toEqual(['property:density', 'property:density'])
    expect(saved[0]).toMatchObject({
      value: 998,
      unit: 'kg/m³',
      quantityKind: 'density',
      uncertainty: 0.2,
      lower: 997,
      upper: 999,
      method: 'pycnometer',
      evidenceId: 'evidence:lab',
      conditionTemperature: { value: 20, unitId: 'unit:C' },
    })
    expect(needsQuantityReview(saved[0]!)).toBe(false)
    const acidity = { ...row, id: 'qty:ph', name: 'pH', propertyId: 'property:ph', quantityId: 'quantity:ph', unitId: 'unit:pH', unit: 'pH', valueText: '7.2', lowerText: '', upperText: '', uncertaintyText: '' }
    draft.quantities = [acidity]
    const ph = applyCardDraft(emptyResourceCatalog(), draft, '2026-11-02T00:00:00.000Z')
    expect(ph.ok).toBe(true)
    if (ph.ok) {
      expect(ph.catalog.cards[0]?.quantities[0]?.quantityKind).toBeUndefined()
      expect(ph.catalog.cards[0]?.quantities[0]?.value).toBe(7.2)
    }
  })
})
