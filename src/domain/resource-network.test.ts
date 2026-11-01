import { describe, expect, it } from 'vitest'
import { readResourceCatalog, writeResourceCatalog, type CatalogStore } from '../data/resource-catalog-storage'
import { createCatalogCard, emptyResourceCatalog, type CatalogCard, type ResourceCatalog } from './resource-catalog'
import { addCatalogLink, graphNeedsFocus, inspectResourceNetwork, measurementLines, removeCatalogLink, resourceNetwork } from './resource-network'

const now = '2026-11-01T00:00:00.000Z'

function card(kind: CatalogCard['kind'], id: string, name: string): CatalogCard {
  return createCatalogCard({ id, kind, name, createdAt: now, scarcity: 'unknown', priority: 'P3' })
}

function base(): ResourceCatalog {
  return {
    ...emptyResourceCatalog(),
    cards: [
      card('resource', 'card:power', 'Electrical energy'),
      card('resource', 'card:water', 'Fresh water'),
      card('source', 'card:solar', 'Solar power plant'),
      card('source', 'card:intake', 'Water intake'),
      card('consumer', 'card:hospital', 'Hospital'),
      card('consumer', 'card:housing', 'Residential building'),
      card('source', 'card:idle', 'Idle plant'),
    ],
  }
}

describe('resource network links', () => {
  it('maps several sources and consumers without duplicating a connection', () => {
    let catalog = base()
    for (const input of [
      { role: 'produces' as const, sourceId: 'card:solar', resourceId: 'card:power' },
      { role: 'produces' as const, sourceId: 'card:intake', resourceId: 'card:water' },
      { role: 'produces' as const, sourceId: 'card:solar', resourceId: 'card:water' },
      { role: 'uses' as const, consumerId: 'card:hospital', resourceId: 'card:power' },
      { role: 'uses' as const, consumerId: 'card:housing', resourceId: 'card:power' },
      { role: 'uses' as const, consumerId: 'card:hospital', resourceId: 'card:water' },
    ]) {
      const next = addCatalogLink(catalog, input)
      expect(next.ok).toBe(true)
      if (!next.ok) {
        return
      }
      catalog = next.catalog
    }
    expect(addCatalogLink(catalog, { role: 'produces', sourceId: 'card:solar', resourceId: 'card:power' }).ok).toBe(false)
    expect(addCatalogLink(catalog, { role: 'uses', consumerId: 'card:solar', resourceId: 'card:power' }).ok).toBe(false)
    expect(addCatalogLink(catalog, { role: 'produces', sourceId: 'card:missing', resourceId: 'card:power' }).ok).toBe(false)
    const focused = resourceNetwork(catalog, { text: '', kind: 'all', focusId: 'card:power', connection: 'all' })
    expect(focused.nodes.map((item) => item.id).sort()).toEqual(['card:hospital', 'card:housing', 'card:power', 'card:solar'])
    expect(focused.links).toHaveLength(3)
    const solar = resourceNetwork(catalog, { text: '', kind: 'all', focusId: 'card:solar', connection: 'all' })
    expect(solar.nodes.map((item) => item.id).sort()).toEqual(['card:power', 'card:solar', 'card:water'])
    const hospital = resourceNetwork(catalog, { text: '', kind: 'all', focusId: 'card:hospital', connection: 'all' })
    expect(hospital.nodes.map((item) => item.id).sort()).toEqual(['card:hospital', 'card:power', 'card:water'])
    const removed = removeCatalogLink(catalog, 'link:card:solar:card:power:produces')
    expect(removed.ok).toBe(true)
    if (!removed.ok) {
      return
    }
    expect(removed.catalog.cards).toHaveLength(catalog.cards.length)
    expect(removed.catalog.links.some((link) => link.id === 'link:card:solar:card:power:produces')).toBe(false)
    expect(resourceNetwork(removed.catalog, { text: 'hospital', kind: 'consumer', focusId: '', connection: 'connected' }).nodes.map((item) => item.id)).toEqual(['card:hospital'])
    expect(resourceNetwork(catalog, { text: '', kind: 'source', focusId: '', connection: 'unconnected' }).nodes.map((item) => item.id)).toEqual(['card:idle'])
  })

  it('reports broken links as errors and missing relationships as warnings', () => {
    const catalog = base()
    catalog.links = [
      { id: 'link:bad', role: 'produces', sourceId: 'card:missing', resourceId: 'card:power' },
      { id: 'link:kind', role: 'produces', sourceId: 'card:hospital', resourceId: 'card:power' },
      { id: 'link:one', role: 'produces', sourceId: 'card:solar', resourceId: 'card:power' },
      { id: 'link:two', role: 'produces', sourceId: 'card:solar', resourceId: 'card:power' },
    ]
    const notices = inspectResourceNetwork(catalog)
    expect(notices.filter((item) => item.level === 'error').map((item) => item.code).sort()).toEqual(['duplicate', 'missing-card', 'wrong-kind'])
    expect(notices.some((item) => item.code === 'source-unlinked' && item.cardId === 'card:idle')).toBe(true)
    expect(notices.some((item) => item.code === 'resource-no-consumer' && item.cardId === 'card:power')).toBe(true)
    expect(graphNeedsFocus(19, '')).toBe(true)
    expect(graphNeedsFocus(19, 'card:power')).toBe(false)
  })

  it('shows stored measurements without treating a link as a flow', () => {
    const power = card('resource', 'card:power', 'Electrical energy')
    power.accounts = { regional: [], supplyDeficit: { id: 'qty:gap', name: 'Gap', value: null, unit: 'kWh', quantityKind: 'energy' } }
    const solar = card('source', 'card:solar', 'Solar power plant')
    solar.sourceProfile = { maxCapacity: { id: 'qty:cap', name: 'Capacity', value: 0, unit: 'kW', quantityKind: 'power' } }
    expect(measurementLines(power)).toEqual(['Supply deficit: Gap · no value kWh'])
    expect(measurementLines(solar)).toEqual(['Maximum capacity: Capacity · 0 kW'])
  })

  it('writes a connection through the catalog store and reads it back', () => {
    const added = addCatalogLink(base(), { role: 'produces', sourceId: 'card:solar', resourceId: 'card:power' })
    expect(added.ok).toBe(true)
    if (!added.ok) {
      return
    }
    const store = memoryStore()
    expect(writeResourceCatalog(store, added.catalog).ok).toBe(true)
    const read = readResourceCatalog(store)
    expect(read.ok).toBe(true)
    if (!read.ok) {
      return
    }
    expect(read.catalog.cards).toHaveLength(added.catalog.cards.length)
    expect(read.catalog.links.map((link) => link.id)).toEqual(['link:card:solar:card:power:produces'])
  })
})

function memoryStore(): CatalogStore {
  const values = new Map<string, string>()
  return {
    getItem: (key) => values.get(key) ?? null,
    setItem: (key, value) => { values.set(key, value) },
  }
}
