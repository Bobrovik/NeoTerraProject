import { describe, expect, it } from 'vitest'
import { demoSnapshot } from '../data/demo'
import { parseLayout, serializeLayout } from '../data/layout-storage'
import { buildingTemplates } from './buildings'
import { placeObject } from './layout'
import { applyStoredLayouts, createUserCity, emptyCityDraft } from './user-city'

describe('user cities', () => {
  const existing = new Set(demoSnapshot.cities.map((city) => city.id))

  it('creates an empty city and keeps it independent of Aurora', () => {
    const created = createUserCity({ name: 'Harbor', cityId: 'harbor', latitude: 59.9, longitude: 30.3 }, existing)
    expect(created.ok).toBe(true)
    if (!created.ok) {
      return
    }
    expect(created.city.id).toBe('city:harbor')
    expect(created.draft).toEqual(emptyCityDraft('city:harbor'))
    const template = buildingTemplates[0]
    expect(template).toBeDefined()
    if (!template) {
      return
    }
    const withObject = placeObject(created.draft, template, 3, 5, 'object:harbor:hub')
    const merged = applyStoredLayouts(demoSnapshot, { cities: [created.city], drafts: [withObject] })
    expect(merged.cities.map((city) => city.id)).toContain('city:harbor')
    expect(merged.objects.filter((object) => object.cityId === 'city:harbor').map((object) => object.id)).toEqual(['object:harbor:hub'])
    expect(merged.objects.filter((object) => object.cityId === 'city:aurora')).toEqual(demoSnapshot.objects.filter((object) => object.cityId === 'city:aurora'))
    expect(merged.objects.filter((object) => object.cityId === 'city:meridian')).toEqual(demoSnapshot.objects.filter((object) => object.cityId === 'city:meridian'))
    expect(merged.flows.filter((flow) => flow.systemId.startsWith('system:aurora'))).toEqual(demoSnapshot.flows)
  })

  it('rejects a duplicate city id and a latitude outside WGS84', () => {
    expect(createUserCity({ name: 'Copy', cityId: 'city:aurora', latitude: 0, longitude: 0 }, existing).ok).toBe(false)
    expect(createUserCity({ name: 'North', cityId: 'city:north', latitude: 91, longitude: 0 }, existing).ok).toBe(false)
    expect(createUserCity({ name: ' ', cityId: 'city:blank', latitude: 0, longitude: 0 }, existing).ok).toBe(false)
  })

  it('saves and reloads a user city without accepting a missing object or an id collision', () => {
    const created = createUserCity({ name: 'Harbor', cityId: 'city:harbor', latitude: 1, longitude: 2 }, existing)
    expect(created.ok).toBe(true)
    if (!created.ok) {
      return
    }
    const raw = serializeLayout({ cities: [created.city], drafts: [created.draft] })
    const loaded = parseLayout(raw, demoSnapshot)
    expect(loaded.ok).toBe(true)
    if (!loaded.ok) {
      return
    }
    expect(loaded.stored.cities.map((city) => city.id)).toEqual(['city:harbor'])
    expect(loaded.stored.drafts[0]?.objects).toEqual([])

    const legacy = parseLayout(JSON.stringify({ version: 1, drafts: [] }), demoSnapshot)
    expect(legacy.ok).toBe(true)
    if (legacy.ok) {
      expect(legacy.stored.cities).toEqual([])
    }

    const colliding = parseLayout(JSON.stringify({
      version: 2,
      cities: [created.city],
      drafts: [{
        cityId: 'city:harbor',
        objects: [],
        systems: [],
        flows: [],
        roads: [{ id: 'road:harbor:bad', cityId: 'city:harbor', points: [{ kind: 'object', objectId: 'object:missing' }, { kind: 'control', x: 0, z: 0 }] }],
      }],
    }), demoSnapshot)
    expect(colliding.ok).toBe(false)

    const stolen = parseLayout(JSON.stringify({
      version: 2,
      cities: [created.city],
      drafts: [{
        ...created.draft,
        objects: [{
          id: 'object:aurora:solar-field',
          cityId: 'city:harbor',
          name: 'Taken',
          categoryId: 'category:energy',
          description: 'Collision.',
          placement: { position: { x: 0, y: 1, z: 0 }, rotation: { x: 0, y: 0, z: 0 }, size: { x: 1, y: 1, z: 1 } },
          representation: { kind: 'primitive', shape: 'box', color: '#fff' },
          systemIds: [],
          metrics: [],
          reliability: { status: 'demo' },
          documentIds: [],
        }],
      }],
    }), demoSnapshot)
    expect(stolen.ok).toBe(false)
  })

  it('does not let one user city replace another city draft', () => {
    const first = createUserCity({ name: 'Harbor', cityId: 'city:harbor', latitude: 1, longitude: 2 }, existing)
    const second = createUserCity({ name: 'Ridge', cityId: 'city:ridge', latitude: -10, longitude: 40 }, existing)
    expect(first.ok && second.ok).toBe(true)
    if (!first.ok || !second.ok) {
      return
    }
    const template = buildingTemplates[1]
    expect(template).toBeDefined()
    if (!template) {
      return
    }
    const harbor = placeObject(first.draft, template, 0, 0, 'object:harbor:source')
    const merged = applyStoredLayouts(demoSnapshot, { cities: [first.city, second.city], drafts: [harbor, second.draft] })
    expect(merged.objects.some((object) => object.cityId === 'city:ridge')).toBe(false)
    expect(merged.objects.filter((object) => object.cityId === 'city:harbor')).toHaveLength(1)
    expect(merged.systems.filter((system) => system.cityId === 'city:ridge')).toEqual([])
    expect(merged.roads.filter((road) => road.cityId === 'city:ridge')).toEqual([])
  })
})
