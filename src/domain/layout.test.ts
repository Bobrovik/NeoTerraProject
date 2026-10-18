import { describe, expect, it } from 'vitest'
import { demoSnapshot } from '../data/demo'
import { parseLayout, serializeLayout } from '../data/layout-storage'
import { reportCityElectricity } from './balance'
import { buildingTemplates } from './buildings'
import {
  createConnection,
  deleteConnection,
  deleteObject,
  draftFromSnapshot,
  applySampleEnergyRates,
  loadEnergyExample,
  moveObject,
  revertEnergyExample,
  placeObject,
  setLinkLimit,
  setResourceRole,
  clearResourceRole,
  resolveRoadPolyline,
  snapToGrid,
  updateObjectDetails,
  upsertRoad,
} from './layout'
import { applyStoredLayouts, createUserCity, emptyCityDraft } from './user-city'

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

  it('keeps saved energy rates when an object moves or its size and model change', () => {
    const draft = withRates(draftFromSnapshot(demoSnapshot, 'city:aurora'))
    expect(draft).toBeDefined()
    if (!draft) {
      return
    }
    const moved = moveObject(draft, 'object:aurora:solar-field', 4, 8)
    expect(moved.resourceRoles).toEqual(draft.resourceRoles)
    expect(moved.linkLimits).toEqual(draft.linkLimits)
    expect(moved.objects.find((object) => object.id === 'object:aurora:solar-field')?.placement.position.x).toBe(4)

    const resized = updateObjectDetails(moved, 'object:aurora:solar-field', {
      name: 'Solar field',
      description: 'Same rates.',
      size: { x: 18, y: 4, z: 12 },
    })
    expect('error' in resized).toBe(false)
    if ('error' in resized) {
      return
    }
    const swapped = {
      ...resized,
      objects: resized.objects.map((object) => object.id === 'object:aurora:solar-field'
        ? { ...object, representation: { kind: 'model' as const, url: '/models/test-cube.glb', fallback: { shape: 'box' as const, color: '#d4b483' } } }
        : object),
    }
    expect(swapped.resourceRoles).toEqual(draft.resourceRoles)
    expect(swapped.linkLimits).toEqual(draft.linkLimits)
    const raw = serializeLayout({ cities: [], drafts: [swapped] })
    const loaded = parseLayout(raw, demoSnapshot)
    expect(loaded.ok).toBe(true)
    if (!loaded.ok) {
      return
    }
    expect(loaded.stored.drafts[0]?.resourceRoles).toEqual(draft.resourceRoles)
    expect(loaded.stored.drafts[0]?.linkLimits).toEqual(draft.linkLimits)
    expect(loaded.stored.drafts[0]?.objects.find((object) => object.id === 'object:aurora:solar-field')?.representation).toEqual({
      kind: 'model',
      url: '/models/test-cube.glb',
      fallback: { shape: 'box', color: '#d4b483' },
    })
  })

  it('drops only the rates of a deleted object or line and opens a file that has none', () => {
    const legacy = parseLayout(JSON.stringify({
      version: 1,
      drafts: [{
        cityId: 'city:aurora',
        objects: demoSnapshot.objects.filter((object) => object.cityId === 'city:aurora'),
        systems: demoSnapshot.systems.filter((system) => system.cityId === 'city:aurora'),
        flows: demoSnapshot.flows,
        roads: demoSnapshot.roads.filter((road) => road.cityId === 'city:aurora'),
      }],
    }), demoSnapshot)
    expect(legacy.ok).toBe(true)
    if (!legacy.ok) {
      return
    }
    expect(legacy.stored.drafts[0]?.resourceRoles).toBeUndefined()
    expect(legacy.stored.drafts[0]?.linkLimits).toBeUndefined()
    expect(draftFromSnapshot(demoSnapshot, 'city:aurora')?.resourceRoles).toBeUndefined()
    expect(emptyCityDraft('city:meridian').linkLimits).toBeUndefined()

    const draft = withRates(draftFromSnapshot(demoSnapshot, 'city:aurora'))
    if (!draft) {
      return
    }
    const removedObject = deleteObject(draft, 'object:aurora:north-habitat')
    expect(removedObject.resourceRoles?.some((role) => role.objectId === 'object:aurora:north-habitat')).toBe(false)
    expect(removedObject.resourceRoles?.some((role) => role.objectId === 'object:aurora:solar-field')).toBe(true)
    expect(removedObject.linkLimits?.some((limit) => limit.flowId === 'flow:aurora:energy:hub-north')).toBe(false)
    expect(removedObject.linkLimits?.some((limit) => limit.flowId === 'flow:aurora:energy:solar-hub')).toBe(true)

    const removedLine = deleteConnection(draft, 'flow:aurora:energy:solar-hub')
    expect(removedLine.linkLimits?.map((limit) => limit.flowId)).toEqual(['flow:aurora:energy:hub-north'])
    expect(removedLine.resourceRoles).toEqual(draft.resourceRoles)
    expect(deleteObject(draftFromSnapshot(demoSnapshot, 'city:aurora')!, 'object:aurora:commons').resourceRoles).toBeUndefined()

    const reset = applyStoredLayouts(demoSnapshot, { cities: [], drafts: [] })
    expect(reset.objects).toEqual(demoSnapshot.objects)
    expect(reset.flows).toEqual(demoSnapshot.flows)
    const cleared = emptyCityDraft('city:aurora')
    expect(cleared).toEqual({ cityId: 'city:aurora', objects: [], systems: [], flows: [], roads: [] })
  })

  it('saves electricity rates with the city and recalculates without storing the result', () => {
    const created = createUserCity({ name: 'Harbor', cityId: 'city:harbor', latitude: 1, longitude: 2 }, new Set(demoSnapshot.cities.map((city) => city.id)))
    expect(created.ok).toBe(true)
    if (!created.ok) {
      return
    }
    const source = buildingTemplates.find((item) => item.facilityType === 'energy-source')
    const habitat = buildingTemplates.find((item) => item.facilityType === 'habitat')
    expect(source && habitat).toBeTruthy()
    if (!source || !habitat) {
      return
    }
    const placed = placeObject(placeObject(created.draft, source, 0, 0, 'object:harbor:plant'), habitat, 12, 0, 'object:harbor:home')
    const linked = createConnection(placed, {
      sourceObjectId: 'object:harbor:plant',
      targetObjectId: 'object:harbor:home',
      resourceTypeId: 'resource:electricity',
      flowId: 'flow:harbor:power',
    }, demoSnapshot.resourceTypes)
    expect(linked.ok).toBe(true)
    if (!linked.ok) {
      return
    }
    const plant = { objectId: 'object:harbor:plant', resourceTypeId: 'resource:electricity', produces: 100, consumes: 0, stores: 5, stock: 1, priority: 1 }
    const home = { objectId: 'object:harbor:home', resourceTypeId: 'resource:electricity', produces: 0, consumes: 40, stores: 0, stock: 0, priority: 1 }
    const rated = asDraft(setResourceRole(asDraft(setResourceRole(linked.draft, plant)), home))
    const supplied = asDraft(setLinkLimit(rated, { flowId: 'flow:harbor:power', capacity: 100, loss: 0, inService: true }))
    const full = reportCityElectricity(balanceInput(supplied))
    expect(full.status).toBe('ready')
    if (full.status !== 'ready') {
      return
    }
    expect(full.balance.delivered).toBe(40)
    expect(full.balance.shortfall).toBe(0)

    const scarce = asDraft(setResourceRole(supplied, { ...plant, produces: 30 }))
    const short = reportCityElectricity(balanceInput(scarce))
    expect(short.status).toBe('ready')
    if (short.status !== 'ready') {
      return
    }
    expect(short.balance.delivered).toBe(30)
    expect(short.balance.shortfall).toBe(10)
    expect(short.balance.limitedBy).toBe('generation')

    const opened = asDraft(setLinkLimit(supplied, { flowId: 'flow:harbor:power', capacity: 100, loss: 0, inService: false }))
    const disconnected = reportCityElectricity(balanceInput(opened))
    expect(disconnected.status).toBe('ready')
    if (disconnected.status !== 'ready') {
      return
    }
    expect(disconnected.balance.delivered).toBe(0)
    expect(disconnected.balance.limitedBy).toBe('disconnected')

    const unset = reportCityElectricity(balanceInput(clearResourceRole(clearResourceRole(supplied, plant.objectId, plant.resourceTypeId), home.objectId, home.resourceTypeId)))
    expect(unset).toEqual({ status: 'not-set', message: 'Power supply parameters not set' })

    const missingLimit = reportCityElectricity({ ...balanceInput(rated), limits: [] })
    expect(missingLimit.status).toBe('unavailable')
    if (missingLimit.status === 'unavailable') {
      expect(missingLimit.message).toContain('flow:harbor:power')
      expect(missingLimit).not.toHaveProperty('balance')
    }

    const reversed = createConnection(supplied, {
      sourceObjectId: 'object:harbor:home',
      targetObjectId: 'object:harbor:plant',
      resourceTypeId: 'resource:electricity',
      flowId: 'flow:harbor:return',
    }, demoSnapshot.resourceTypes)
    expect(reversed.ok).toBe(true)
    if (!reversed.ok) {
      return
    }
    const loop = asDraft(setLinkLimit(reversed.draft, { flowId: 'flow:harbor:return', capacity: 100, loss: 0, inService: true }))
    const cycle = reportCityElectricity(balanceInput(loop))
    expect(cycle.status).toBe('unavailable')
    if (cycle.status === 'unavailable') {
      expect(cycle.message).toBe('The connections form a cycle, so the balance cannot be calculated.')
    }

    const moved = moveObject(supplied, 'object:harbor:plant', 8, 4)
    expect(moved.resourceRoles).toEqual(supplied.resourceRoles)
    expect(moved.linkLimits).toEqual(supplied.linkLimits)
    expect(moved.objects.find((object) => object.id === 'object:harbor:plant')?.placement.position).not.toEqual(
      supplied.objects.find((object) => object.id === 'object:harbor:plant')?.placement.position,
    )
    const raw = serializeLayout({ cities: [created.city], drafts: [supplied] })
    expect(raw).not.toContain('"delivered"')
    const loaded = parseLayout(raw, demoSnapshot)
    expect(loaded.ok).toBe(true)
    if (!loaded.ok) {
      return
    }
    expect(loaded.stored.drafts[0]?.resourceRoles).toEqual(supplied.resourceRoles)
    expect(loaded.stored.drafts[0]?.linkLimits).toEqual(supplied.linkLimits)
  })

  it('loads a tutorial electricity example for one city and can restore the previous draft', () => {
    const created = createUserCity({ name: 'Harbor', cityId: 'city:harbor', latitude: 1, longitude: 2 }, new Set(demoSnapshot.cities.map((city) => city.id)))
    const other = createUserCity({ name: 'Ridge', cityId: 'city:ridge', latitude: 3, longitude: 4 }, new Set(['city:aurora', 'city:meridian', 'city:harbor']))
    expect(created.ok && other.ok).toBe(true)
    if (!created.ok || !other.ok) {
      return
    }
    const template = buildingTemplates[0]
    expect(template).toBeDefined()
    if (!template) {
      return
    }
    const harbor = placeObject(created.draft, template, 0, 0, 'object:harbor:kept')
    const example = loadEnergyExample(harbor, buildingTemplates, demoSnapshot.resourceTypes)
    expect('error' in example).toBe(false)
    if ('error' in example) {
      return
    }
    expect(example.energyExampleBackup?.objects.map((object) => object.id)).toEqual(['object:harbor:kept'])
    expect(example.objects.map((object) => object.facilityType)).toEqual(['energy-source', 'distribution-center', 'habitat', 'habitat'])
    expect(example.flows).toHaveLength(3)
    const again = loadEnergyExample(example, buildingTemplates, demoSnapshot.resourceTypes)
    expect('error' in again).toBe(false)
    if ('error' in again) {
      return
    }
    expect(again.energyExampleBackup?.objects.map((object) => object.id)).toEqual(['object:harbor:kept'])
    const balance = reportCityElectricity({
      resourceTypeId: 'resource:electricity',
      flows: example.flows,
      roles: example.resourceRoles ?? [],
      limits: example.linkLimits ?? [],
    })
    expect(balance.status).toBe('ready')
    if (balance.status === 'ready') {
      expect(balance.balance.shortfall).toBe(0)
      expect(balance.balance.delivered).toBe(balance.balance.requested)
    }
    const restored = revertEnergyExample(example)
    expect('error' in restored).toBe(false)
    if ('error' in restored) {
      return
    }
    expect(restored.objects.map((object) => object.id)).toEqual(['object:harbor:kept'])
    expect(restored.energyExampleBackup).toBeUndefined()
    expect(demoSnapshot.objects.filter((object) => object.cityId === 'city:aurora').map((object) => object.id)).not.toContain('object:harbor:example-plant')
    const raw = serializeLayout({ cities: [created.city, other.city], drafts: [example, other.draft] })
    const loaded = parseLayout(raw, demoSnapshot)
    expect(loaded.ok).toBe(true)
    if (!loaded.ok) {
      return
    }
    expect(loaded.stored.drafts.find((draft) => draft.cityId === 'city:ridge')?.objects).toEqual([])
    expect(loaded.stored.drafts.find((draft) => draft.cityId === 'city:harbor')?.energyExampleBackup?.objects[0]?.id).toBe('object:harbor:kept')
  })

  it('applies sample electricity rates to existing objects and can restore the first copy', () => {
    const created = createUserCity({ name: 'Harbor', cityId: 'city:harbor', latitude: 1, longitude: 2 }, new Set(['city:aurora', 'city:meridian']))
    expect(created.ok).toBe(true)
    if (!created.ok) {
      return
    }
    const source = buildingTemplates.find((item) => item.facilityType === 'energy-source')
    const home = buildingTemplates.find((item) => item.facilityType === 'habitat')
    const hub = buildingTemplates.find((item) => item.facilityType === 'distribution-center')
    expect(source && home && hub).toBeTruthy()
    if (!source || !home || !hub) {
      return
    }
    let draft = placeObject(created.draft, source, 0, 0, 'object:harbor:plant')
    draft = placeObject(draft, hub, 8, 0, 'object:harbor:hub')
    draft = placeObject(draft, home, 16, 0, 'object:harbor:home')
    draft = placeObject(draft, { ...home, facilityType: 'civic', name: 'Commons' }, 24, 0, 'object:harbor:commons')
    const connected = createConnection(draft, {
      flowId: 'flow:harbor:plant-hub',
      sourceObjectId: 'object:harbor:plant',
      targetObjectId: 'object:harbor:hub',
      resourceTypeId: 'resource:electricity',
    }, demoSnapshot.resourceTypes)
    expect(connected.ok).toBe(true)
    if (!connected.ok) {
      return
    }
    const before = connected.draft
    const empty = applySampleEnergyRates(created.draft)
    expect(empty).toEqual({ error: 'This city has no electrical connections. Sample values were not applied, and no supply network was created.' })
    const applied = applySampleEnergyRates(before)
    expect('error' in applied).toBe(false)
    if ('error' in applied) {
      return
    }
    expect(applied.objects.map((object) => object.id)).toEqual(before.objects.map((object) => object.id))
    expect(applied.flows.map((flow) => flow.id)).toEqual(before.flows.map((flow) => flow.id))
    expect(applied.resourceRoles?.find((role) => role.objectId === 'object:harbor:plant')).toMatchObject({ produces: 100, consumes: 0 })
    expect(applied.resourceRoles?.find((role) => role.objectId === 'object:harbor:hub')).toMatchObject({ produces: 0, consumes: 0 })
    expect(applied.resourceRoles?.find((role) => role.objectId === 'object:harbor:home')).toMatchObject({ produces: 0, consumes: 40 })
    expect(applied.resourceRoles?.some((role) => role.objectId === 'object:harbor:commons')).toBe(false)
    expect(applied.linkLimits).toEqual([{ flowId: 'flow:harbor:plant-hub', capacity: 100, loss: 0, inService: true }])
    expect(applied.energyExampleBackup?.resourceRoles).toBeUndefined()
    const renamed = { ...applied, objects: applied.objects.map((object) => object.id === 'object:harbor:plant' ? { ...object, name: 'Renamed' } : object) }
    const again = applySampleEnergyRates(renamed)
    expect('error' in again).toBe(false)
    if ('error' in again) {
      return
    }
    expect(again.energyExampleBackup?.objects.find((object) => object.id === 'object:harbor:plant')?.name).not.toBe('Renamed')
    const restored = revertEnergyExample(again)
    expect('error' in restored).toBe(false)
    if ('error' in restored) {
      return
    }
    expect(restored.resourceRoles).toBeUndefined()
    expect(restored.linkLimits).toBeUndefined()
    expect(restored.energyExampleBackup).toBeUndefined()
    expect(demoSnapshot.cities.map((city) => city.id)).toEqual(['city:aurora', 'city:meridian'])
  })
})

function asDraft(result: ReturnType<typeof setResourceRole>): Extract<ReturnType<typeof setResourceRole>, { cityId: string }> {
  if ('error' in result) {
    throw new Error(result.error)
  }
  return result
}

function balanceInput(draft: Extract<ReturnType<typeof setResourceRole>, { cityId: string }>) {
  return {
    resourceTypeId: 'resource:electricity',
    flows: draft.flows.filter((flow) => flow.resourceTypeId === 'resource:electricity'),
    roles: draft.resourceRoles ?? [],
    limits: draft.linkLimits ?? [],
  }
}

function withRates(draft: ReturnType<typeof draftFromSnapshot>) {
  if (!draft) {
    return undefined
  }
  return {
    ...draft,
    resourceRoles: [
      { objectId: 'object:aurora:solar-field', resourceTypeId: 'resource:electricity', produces: 100, consumes: 0, stores: 0, stock: 0, priority: 1 },
      { objectId: 'object:aurora:north-habitat', resourceTypeId: 'resource:electricity', produces: 0, consumes: 40, stores: 10, stock: 4, priority: 2 },
    ],
    linkLimits: [
      { flowId: 'flow:aurora:energy:solar-hub', capacity: 80, loss: 0.1, inService: true },
      { flowId: 'flow:aurora:energy:hub-north', capacity: 30, loss: 0, inService: false },
    ],
  }
}
