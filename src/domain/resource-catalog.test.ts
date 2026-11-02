import { describe, expect, it } from 'vitest'
import { layoutStorageKey } from '../data/layout-storage'
import { readResourceCatalog, resourceCatalogStorageKey, writeResourceCatalog, type CatalogStore } from '../data/resource-catalog-storage'
import { createCatalogCard, parseResourceCatalog, type CatalogCard, type Evidence, type MeasuredQuantity } from './resource-catalog'

function memoryStore(initial: Record<string, string> = {}): CatalogStore & { data: Record<string, string> } {
  const data = { ...initial }
  return {
    data,
    getItem(key) {
      return Object.prototype.hasOwnProperty.call(data, key) ? data[key] : null
    },
    setItem(key, value) {
      data[key] = value
    },
  }
}

function card(kind: 'resource' | 'source' | 'consumer', id: string, name: string): CatalogCard {
  return createCatalogCard({
    id,
    kind,
    name,
    createdAt: '2026-11-01T00:00:00.000Z',
    category: kind === 'resource' ? 'water' : 'infrastructure',
    summary: `${name} draft`,
    scarcity: 'unknown',
    priority: 'P3',
  })
}

function quantity(partial: Partial<MeasuredQuantity> & Pick<MeasuredQuantity, 'id' | 'quantityKind' | 'unit'>): MeasuredQuantity {
  return {
    name: partial.name ?? partial.id,
    value: partial.value === undefined ? null : partial.value,
    ...partial,
  }
}

describe('resource catalog cards', () => {
  it('creates a resource, a source, and a consumer without filling missing numbers', () => {
    const kinds = ['resource', 'source', 'consumer'] as const
    const cards = kinds.map((kind) => card(kind, `card:${kind}`, kind))
    expect(cards.map((item) => item.kind)).toEqual([...kinds])
    expect(cards.every((item) => item.status === 'draft' && item.evidence.length === 0)).toBe(true)
    expect(cards.every((item) => item.sourceProfile === undefined && item.consumerProfile === undefined)).toBe(true)
    const parsed = parseResourceCatalog({ version: 1, cards, links: [] })
    expect(parsed.ok).toBe(true)
  })

  it('keeps a measured zero distinct from an absent value', () => {
    const resource = card('resource', 'card:water', 'Fresh water')
    resource.quantities = [
      quantity({ id: 'qty:absent', quantityKind: 'volume', unit: 'm3', value: null }),
      quantity({ id: 'qty:zero', quantityKind: 'volume', unit: 'm3', value: 0 }),
    ]
    resource.consumerProfile = undefined
    const parsed = parseResourceCatalog({ version: 1, cards: [resource], links: [] })
    expect(parsed.ok).toBe(true)
    if (!parsed.ok) {
      return
    }
    expect(parsed.catalog.cards[0]?.quantities.map((item) => item.value)).toEqual([null, 0])
  })

  it('stores several measurements, units, and evidence records on one card', () => {
    const resource = card('resource', 'card:electricity', 'Electrical energy')
    const evidence: Evidence[] = [
      {
        id: 'evidence:power',
        title: 'Plant meter log',
        author: 'Plant office',
        year: null,
        url: null,
        studyType: 'technical-documentation',
        supports: 'Nameplate power',
        verification: 'unreviewed',
      },
      {
        id: 'evidence:energy',
        title: 'Annual output note',
        author: 'Plant office',
        year: 2024,
        url: 'https://example.test/output',
        studyType: 'study',
        supports: 'Energy delivered in one year',
        verification: 'preliminary',
      },
    ]
    resource.evidence = evidence
    resource.quantities = [
      quantity({
        id: 'qty:power',
        name: 'Rated power',
        quantityKind: 'power',
        unit: 'kW',
        value: 500,
        measuredAt: '2026-01-01',
        evidenceId: 'evidence:power',
      }),
      quantity({
        id: 'qty:energy',
        name: 'Delivered energy',
        quantityKind: 'energy',
        unit: 'kWh',
        value: 1200,
        periodStart: '2024-01-01',
        periodEnd: '2024-12-31',
        conditions: 'Metered at the plant gate',
        evidenceId: 'evidence:energy',
      }),
      quantity({
        id: 'qty:flow',
        name: 'Throughput',
        quantityKind: 'productionRate',
        unit: 'm3/h',
        value: 100,
      }),
    ]
    const parsed = parseResourceCatalog({
      version: 1,
      cards: [{
        ...resource,
        cityId: 'city:aurora',
        regionId: 'region:basin',
        regionLabel: 'Example basin',
        accounts: {
          regional: [{
            id: 'region:1',
            regionLabel: 'Example basin',
            regionId: 'region:basin',
            availability: quantity({ id: 'qty:basin', name: 'Stored volume', quantityKind: 'volume', unit: 'm3', value: null }),
          }],
        },
      }],
      links: [],
    })
    expect(parsed.ok).toBe(true)
    if (!parsed.ok) {
      return
    }
    const stored = parsed.catalog.cards[0]
    expect(stored?.quantities.map((item) => item.quantityKind)).toEqual(['power', 'energy', 'productionRate'])
    expect(stored?.quantities.map((item) => item.unit)).toEqual(['kW', 'kWh', 'm3/h'])
    expect(stored?.evidence).toHaveLength(2)
    expect(stored).not.toHaveProperty('cityId')
    expect(stored).not.toHaveProperty('regionId')
    expect(stored).not.toHaveProperty('regionLabel')
    expect(stored?.accounts?.regional[0]).not.toHaveProperty('regionLabel')
    expect(stored?.accounts?.regional[0]?.availability?.value).toBeNull()
    expect(stored?.accounts?.regional[0]?.availability?.name).toBe('Stored volume')
    expect(stored?.quantities[0]?.value).toBe(500)
  })

  it('rejects a measurement that cites missing evidence and still accepts a draft with none', () => {
    const draft = card('resource', 'card:sand', 'Sand')
    expect(parseResourceCatalog({ version: 1, cards: [draft], links: [] }).ok).toBe(true)
    draft.quantities = [quantity({ id: 'qty:mass', quantityKind: 'mass', unit: 'kg', value: 1, evidenceId: 'evidence:missing' })]
    const parsed = parseResourceCatalog({ version: 1, cards: [draft], links: [] })
    expect(parsed.ok).toBe(false)
    if (!parsed.ok) {
      expect(parsed.message).toBe('Измерение ссылается на исследование, которого нет в карточке.')
    }
  })
})

describe('resource catalog links', () => {
  it('keeps many producers and consumers on one resource', () => {
    const electricity = card('resource', 'card:electricity', 'Electrical energy')
    const solar = card('source', 'card:solar', 'Solar power plant')
    const wind = card('source', 'card:wind', 'Wind turbine')
    const hospital = card('consumer', 'card:hospital', 'Hospital')
    const housing = card('consumer', 'card:housing', 'Residential building')
    solar.sourceProfile = { continuous: false, naturalConditions: 'Daylight' }
    hospital.consumerProfile = { served: null, timeUnit: 'day' }
    const parsed = parseResourceCatalog({
      version: 1,
      cards: [electricity, solar, wind, hospital, housing],
      links: [
        { id: 'link:solar', role: 'produces', sourceId: 'card:solar', resourceId: 'card:electricity' },
        { id: 'link:wind', role: 'produces', sourceId: 'card:wind', resourceId: 'card:electricity' },
        { id: 'link:hospital', role: 'uses', consumerId: 'card:hospital', resourceId: 'card:electricity' },
        { id: 'link:housing', role: 'uses', consumerId: 'card:housing', resourceId: 'card:electricity' },
      ],
    })
    expect(parsed.ok).toBe(true)
    if (!parsed.ok) {
      return
    }
    expect(parsed.catalog.links).toHaveLength(4)
    expect(parsed.catalog.cards.find((item) => item.id === 'card:hospital')?.consumerProfile?.served).toBeNull()
    expect(parsed.catalog.cards.find((item) => item.id === 'card:solar')?.sourceProfile?.continuous).toBe(false)
  })

  it('does not accept a link whose card id is missing or the wrong kind', () => {
    const electricity = card('resource', 'card:electricity', 'Electrical energy')
    const solar = card('source', 'card:solar', 'Solar power plant')
    const missing = parseResourceCatalog({
      version: 1,
      cards: [electricity, solar],
      links: [{ id: 'link:missing', role: 'produces', sourceId: 'card:missing', resourceId: 'card:electricity' }],
    })
    const swapped = parseResourceCatalog({
      version: 1,
      cards: [electricity, solar],
      links: [{ id: 'link:swapped', role: 'uses', consumerId: 'card:solar', resourceId: 'card:electricity' }],
    })
    expect(missing.ok).toBe(false)
    expect(swapped.ok).toBe(false)
  })
})

describe('resource catalog storage', () => {
  it('loads an empty catalog when nothing has been saved', () => {
    const store = memoryStore()
    const read = readResourceCatalog(store)
    expect(read).toEqual({ ok: true, catalog: { version: 1, cards: [], links: [] } })
    expect(store.data).toEqual({})
  })

  it('saves a catalog and reads the same cards back', () => {
    const store = memoryStore()
    const resource = card('resource', 'card:copper', 'Copper')
    resource.quantities = [quantity({ id: 'qty:stock', quantityKind: 'reserve', unit: 't', value: null })]
    const written = writeResourceCatalog(store, { version: 1, cards: [resource], links: [] })
    expect(written.ok).toBe(true)
    const read = readResourceCatalog(store)
    expect(read).toEqual(written)
  })

  it('reports corrupt JSON and an unknown version without replacing stored text', () => {
    const corrupt = memoryStore({ [resourceCatalogStorageKey]: '{not json' })
    expect(readResourceCatalog(corrupt)).toEqual({ ok: false, message: 'Файл каталога не является корректным JSON.' })
    expect(corrupt.data[resourceCatalogStorageKey]).toBe('{not json')

    const unknown = memoryStore({ [resourceCatalogStorageKey]: JSON.stringify({ version: 2, cards: [], links: [] }) })
    const read = readResourceCatalog(unknown)
    expect(read.ok).toBe(false)
    if (!read.ok) {
      expect(read.message).toBe('Версия файла каталога не поддерживается.')
    }
    expect(unknown.data[resourceCatalogStorageKey]).toContain('"version":2')
  })

  it('refuses a broken link and leaves city layouts untouched', () => {
    const cityFile = '{"version":2,"drafts":[],"cities":[]}'
    const store = memoryStore({ [layoutStorageKey]: cityFile })
    const resource = card('resource', 'card:timber', 'Timber')
    const rejected = writeResourceCatalog(store, {
      version: 1,
      cards: [resource],
      links: [{ id: 'link:missing', role: 'produces', sourceId: 'card:missing', resourceId: 'card:timber' }],
    })
    expect(rejected.ok).toBe(false)
    expect(store.data[layoutStorageKey]).toBe(cityFile)
    expect(store.data[resourceCatalogStorageKey]).toBeUndefined()

    const saved = writeResourceCatalog(store, { version: 1, cards: [resource], links: [] })
    expect(saved.ok).toBe(true)
    expect(store.data[layoutStorageKey]).toBe(cityFile)
    expect(Object.keys(store.data).sort()).toEqual([layoutStorageKey, resourceCatalogStorageKey].sort())
  })
})
