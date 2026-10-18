import { describe, expect, it } from 'vitest'
import { demoSnapshot } from '../data/demo'
import { parseLayout, serializeLayout } from '../data/layout-storage'
import { buildingTemplates } from './buildings'
import {
  createConnection,
  deleteObject,
  draftFromSnapshot,
  moveObject,
  placeObject,
  resolveRoadPolyline,
  snapToGrid,
  updateObjectDetails,
  upsertRoad,
} from './layout'
import { applyStoredLayouts, createUserCity } from './user-city'

describe('layout editor', () => {
  it('snaps placement and keeps the position on the object', () => {
    const draft = draftFromSnapshot(demoSnapshot, 'city:meridian')
    expect(draft).toBeDefined()
    if (!draft) {
      return
    }
    const template = buildingTemplates.find((item) => item.facilityType === 'distribution-center')
    expect(template).toBeDefined()
    if (!template) {
      return
    }
    const placed = placeObject(draft, template, 5, 7, 'object:meridian:center')
    const object = placed.objects.find((item) => item.id === 'object:meridian:center')
    expect(object?.placement.position).toEqual({ x: snapToGrid(5), y: 3, z: snapToGrid(7) })
    expect(object?.facilityType).toBe('distribution-center')
    const moved = moveObject(placed, 'object:meridian:center', 9, -3)
    expect(moved.objects.find((item) => item.id === 'object:meridian:center')?.placement.position.x).toBe(8)
  })

  it('moves a road endpoint when the attached object moves', () => {
    const draft = draftFromSnapshot(demoSnapshot, 'city:aurora')
    expect(draft).toBeDefined()
    if (!draft) {
      return
    }
    const moved = moveObject(draft, 'object:aurora:distribution-hub', -4, 12)
    const road = moved.roads.find((item) => item.id === 'road:aurora:solar-hub')
    expect(road).toBeDefined()
    if (!road) {
      return
    }
    const polyline = resolveRoadPolyline(road, moved.objects)
    expect(polyline[2]).toMatchObject({ x: -4, z: 12 })
    expect(polyline[0]).toMatchObject({ x: -32, z: 10 })
  })

  it('drops links and road anchors that pointed at a deleted object', () => {
    const draft = draftFromSnapshot(demoSnapshot, 'city:aurora')
    if (!draft) {
      return
    }
    const next = deleteObject(draft, 'object:aurora:distribution-hub')
    expect(next.objects.some((object) => object.id === 'object:aurora:distribution-hub')).toBe(false)
    expect(next.flows.some((flow) => flow.sourceObjectId === 'object:aurora:distribution-hub' || flow.targetObjectId === 'object:aurora:distribution-hub')).toBe(false)
    const road = next.roads.find((item) => item.id === 'road:aurora:solar-hub')
    expect(road?.points.some((point) => point.kind === 'object' && point.objectId === 'object:aurora:distribution-hub')).toBe(false)
  })

  it('records a water link without treating it as a calculated distribution', () => {
    const draft = draftFromSnapshot(demoSnapshot, 'city:meridian')
    if (!draft) {
      return
    }
    const result = createConnection(
      draft,
      {
        sourceObjectId: 'object:meridian:depot',
        targetObjectId: 'object:meridian:west-habitat',
        resourceTypeId: 'resource:potable-water',
        flowId: 'flow:meridian:water:1',
      },
      demoSnapshot.resourceTypes,
    )
    expect(result.ok).toBe(true)
    if (!result.ok) {
      return
    }
    const flow = result.draft.flows[0]
    expect(flow?.quantity).toBeUndefined()
    expect(flow?.reliability.note).toContain('not a distribution')
    expect(result.draft.systems.find((system) => system.kind === 'water')?.memberObjectIds).toEqual([
      'object:meridian:depot',
      'object:meridian:west-habitat',
    ])
    const duplicate = createConnection(
      result.draft,
      {
        sourceObjectId: 'object:meridian:depot',
        targetObjectId: 'object:meridian:west-habitat',
        resourceTypeId: 'resource:potable-water',
        flowId: 'flow:meridian:water:2',
      },
      demoSnapshot.resourceTypes,
    )
    expect(duplicate.ok).toBe(false)
    const missing = createConnection(
      draft,
      {
        sourceObjectId: 'object:missing',
        targetObjectId: 'object:meridian:depot',
        resourceTypeId: 'resource:potable-water',
        flowId: 'flow:bad',
      },
      demoSnapshot.resourceTypes,
    )
    expect(missing.ok).toBe(false)
  })

  it('rejects a layout that still points at a deleted object', () => {
    const draft = draftFromSnapshot(demoSnapshot, 'city:aurora')
    if (!draft) {
      return
    }
    const broken = upsertRoad(draft, {
      id: 'road:aurora:broken',
      cityId: 'city:aurora',
      points: [
        { kind: 'object', objectId: 'object:gone' },
        { kind: 'control', x: 0, z: 0 },
      ],
    })
    const parsed = parseLayout(JSON.stringify({ version: 1, drafts: [broken] }), demoSnapshot)
    expect(parsed.ok).toBe(false)
  })

  it('edits one object without changing its id, links, or the same name in another city', () => {
    const kinds = buildingTemplates.map((template) => template.facilityType)
    expect(kinds).toEqual(expect.arrayContaining(['distribution-center', 'energy-source', 'habitat', 'production-facility']))
    const aurora = draftFromSnapshot(demoSnapshot, 'city:aurora')
    const meridian = draftFromSnapshot(demoSnapshot, 'city:meridian')
    expect(aurora && meridian).toBeTruthy()
    if (!aurora || !meridian) {
      return
    }
    const before = aurora.objects.find((object) => object.id === 'object:aurora:solar-field')
    const edited = updateObjectDetails(aurora, 'object:aurora:solar-field', {
      name: 'South array',
      description: 'Renamed source.',
      size: { x: 20, y: 6, z: 8 },
    })
    expect('error' in edited).toBe(false)
    if ('error' in edited) {
      return
    }
    const object = edited.objects.find((item) => item.id === 'object:aurora:solar-field')
    expect(object?.name).toBe('South array')
    expect(object?.description).toBe('Renamed source.')
    expect(object?.placement.size).toEqual({ x: 20, y: 6, z: 8 })
    expect(object?.placement.position).toEqual({ x: before?.placement.position.x, y: 3, z: before?.placement.position.z })
    expect(object?.facilityType).toBe(before?.facilityType)
    expect(object?.systemIds).toEqual(before?.systemIds)
    expect(edited.flows.map((flow) => flow.id)).toEqual(aurora.flows.map((flow) => flow.id))
    expect(edited.roads.find((road) => road.id === 'road:aurora:solar-hub')?.points).toEqual(
      aurora.roads.find((road) => road.id === 'road:aurora:solar-hub')?.points,
    )
    const line = resolveRoadPolyline(edited.roads.find((road) => road.id === 'road:aurora:solar-hub')!, edited.objects)
    expect(line.length).toBeGreaterThan(1)
    const habitat = buildingTemplates.find((template) => template.facilityType === 'habitat')
    expect(habitat).toBeDefined()
    if (!habitat) {
      return
    }
    const auroraHabitat = placeObject(edited, habitat, 0, 0, 'object:aurora:extra-habitat')
    const meridianHabitat = placeObject(meridian, habitat, 12, 12, 'object:meridian:extra-habitat')
    const renamed = updateObjectDetails(auroraHabitat, 'object:aurora:extra-habitat', {
      name: 'North block',
      description: 'Only Aurora.',
      size: habitat.size,
    })
    expect('error' in renamed).toBe(false)
    if ('error' in renamed) {
      return
    }
    const created = createUserCity({ name: 'Ridge', cityId: 'city:ridge', latitude: 10, longitude: 20 }, new Set(demoSnapshot.cities.map((city) => city.id)))
    expect(created.ok).toBe(true)
    if (!created.ok) {
      return
    }
    const merged = applyStoredLayouts(demoSnapshot, { cities: [created.city], drafts: [renamed, meridianHabitat, created.draft] })
    expect(merged.objects.find((item) => item.id === 'object:aurora:extra-habitat')?.name).toBe('North block')
    expect(merged.objects.find((item) => item.id === 'object:meridian:extra-habitat')?.name).toBe('Habitat')
    const raw = serializeLayout({ cities: [created.city], drafts: [renamed] })
    const loaded = parseLayout(raw, demoSnapshot)
    expect(loaded.ok).toBe(true)
    if (!loaded.ok) {
      return
    }
    const restored = loaded.stored.drafts[0]?.objects.find((item) => item.id === 'object:aurora:solar-field')
    expect(restored?.name).toBe('South array')
    expect(restored?.placement.size).toEqual({ x: 20, y: 6, z: 8 })
    expect(updateObjectDetails(aurora, 'object:missing', { name: 'Nope', description: '', size: { x: 1, y: 1, z: 1 } })).toEqual({ error: 'That object is not in this city.' })
    expect('error' in updateObjectDetails(aurora, 'object:aurora:solar-field', { name: ' ', description: '', size: { x: 1, y: 0, z: 1 } })).toBe(true)
  })
})
