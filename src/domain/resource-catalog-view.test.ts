import { describe, expect, it } from 'vitest'
import { createCatalogCard, type CatalogCard } from './resource-catalog'
import { catalogCategories, countCardsByKind, listCatalogCards, type CatalogListQuery } from './resource-catalog-view'

function sample(): CatalogCard[] {
  const solar = createCatalogCard({
    id: 'card:solar',
    kind: 'source',
    name: 'Solar power plant',
    createdAt: '2026-01-02T00:00:00.000Z',
    category: 'Energy',
    summary: 'Daylight generation',
    scarcity: 'sufficient',
    priority: 'P2',
  })
  solar.subcategory = 'Solar'
  solar.status = 'verified'
  solar.updatedAt = '2026-03-01T00:00:00.000Z'
  const water = createCatalogCard({
    id: 'card:water',
    kind: 'resource',
    name: 'Fresh water',
    createdAt: '2026-02-01T00:00:00.000Z',
    category: 'Water',
    summary: 'Potable supply',
    scarcity: 'limited-access',
    priority: 'P1',
  })
  water.subcategory = 'Surface'
  water.updatedAt = '2026-02-02T00:00:00.000Z'
  const hospital = createCatalogCard({
    id: 'card:hospital',
    kind: 'consumer',
    name: 'Hospital',
    createdAt: '2026-01-01T00:00:00.000Z',
    category: 'Energy',
    summary: 'Clinical building',
    scarcity: 'unknown',
    priority: 'P1',
  })
  hospital.status = 'archived'
  hospital.updatedAt = '2026-04-01T00:00:00.000Z'
  return [solar, water, hospital]
}

const open: CatalogListQuery = {
  kind: 'all',
  text: '',
  category: '',
  scarcity: '',
  priority: '',
  status: '',
  sort: 'name',
}

describe('resource catalog list', () => {
  it('counts each kind from the stored cards', () => {
    expect(countCardsByKind(sample())).toEqual({ resource: 1, source: 1, consumer: 1 })
    expect(countCardsByKind([])).toEqual({ resource: 0, source: 0, consumer: 0 })
  })

  it('applies kind, text, category, scarcity, priority, and status together', () => {
    const cards = sample()
    expect(listCatalogCards(cards, { ...open, kind: 'source' }).map((card) => card.id)).toEqual(['card:solar'])
    expect(listCatalogCards(cards, { ...open, text: 'surface' }).map((card) => card.id)).toEqual(['card:water'])
    expect(listCatalogCards(cards, { ...open, text: 'energy', kind: 'consumer', status: 'archived' }).map((card) => card.id)).toEqual(['card:hospital'])
    expect(listCatalogCards(cards, {
      ...open,
      kind: 'source',
      text: 'daylight',
      category: 'Energy',
      scarcity: 'sufficient',
      priority: 'P2',
      status: 'verified',
    }).map((card) => card.id)).toEqual(['card:solar'])
    expect(listCatalogCards(cards, { ...open, text: 'daylight', scarcity: 'scarce' })).toEqual([])
  })

  it('sorts by name, dates, and priority', () => {
    const cards = sample()
    expect(listCatalogCards(cards, open).map((card) => card.name)).toEqual(['Fresh water', 'Hospital', 'Solar power plant'])
    expect(listCatalogCards(cards, { ...open, sort: 'created' }).map((card) => card.id)).toEqual(['card:water', 'card:solar', 'card:hospital'])
    expect(listCatalogCards(cards, { ...open, sort: 'updated' }).map((card) => card.id)).toEqual(['card:hospital', 'card:solar', 'card:water'])
    expect(listCatalogCards(cards, { ...open, sort: 'priority' }).map((card) => card.id)).toEqual(['card:water', 'card:hospital', 'card:solar'])
  })

  it('lists the categories that cards actually use', () => {
    expect(catalogCategories(sample())).toEqual(['Energy', 'Water'])
  })
})
