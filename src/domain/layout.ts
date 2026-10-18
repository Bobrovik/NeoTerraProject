import type { LinkLimit, ObjectResourceRole } from './balance'
import { sampleElectricityRole, sampleEnergyAssumptions } from './energy-view'
import type {
  CatalogSnapshot,
  CityObject,
  CitySystem,
  ObjectRepresentation,
  ResourceFlow,
  ResourceType,
  Road,
  RoadPoint,
  Vec3,
} from './types'

export const GRID_METERS = 4

export type BuildingTemplate = {
  id: string
  name: string
  facilityType: string
  categoryId: string
  description: string
  size: Vec3
  representation: ObjectRepresentation
}

export type CityDraft = {
  cityId: string
  objects: CityObject[]
  systems: CitySystem[]
  flows: ResourceFlow[]
  roads: Road[]
  /** Absent means no rates have been entered. An empty list is not written for a new city. */
  resourceRoles?: ObjectResourceRole[]
  /** Absent means no line limits have been entered. */
  linkLimits?: LinkLimit[]
  /** The city as it was before the first tutorial change. A later example load or sample apply keeps this copy. */
  energyExampleBackup?: CityDraft
}

export type DraftResult = { ok: true; draft: CityDraft } | { ok: false; message: string }

export function snapToGrid(value: number, grid = GRID_METERS): number {
  return Math.round(value / grid) * grid
}

export function draftFromSnapshot(snapshot: CatalogSnapshot, cityId: string): CityDraft | undefined {
  if (!snapshot.cities.some((city) => city.id === cityId)) {
    return undefined
  }
  const systems = snapshot.systems.filter((system) => system.cityId === cityId)
  const systemIds = new Set(systems.map((system) => system.id))
  return {
    cityId,
    objects: snapshot.objects.filter((object) => object.cityId === cityId).map(clone),
    systems: systems.map(clone),
    flows: snapshot.flows.filter((flow) => systemIds.has(flow.systemId)).map(clone),
    roads: snapshot.roads.filter((road) => road.cityId === cityId).map(clone),
  }
}

export function placeObject(draft: CityDraft, template: BuildingTemplate, x: number, z: number, id: string): CityDraft {
  const object: CityObject = {
    id,
    cityId: draft.cityId,
    name: template.name,
    categoryId: template.categoryId,
    facilityType: template.facilityType,
    description: template.description,
    placement: {
      position: { x: snapToGrid(x), y: template.size.y / 2, z: snapToGrid(z) },
      rotation: { x: 0, y: 0, z: 0 },
      size: { ...template.size },
    },
    representation: { ...template.representation },
    systemIds: [],
    metrics: [],
    reliability: {
      status: 'demo',
      source: 'Layout editor',
      note: 'Placed in the editor. Not a measured design.',
    },
    documentIds: [],
  }
  return { ...draft, objects: [...draft.objects, object] }
}

export function moveObject(draft: CityDraft, objectId: string, x: number, z: number): CityDraft {
  return {
    ...draft,
    objects: draft.objects.map((object) => {
      if (object.id !== objectId) {
        return object
      }
      return {
        ...object,
        placement: {
          ...object.placement,
          position: { x: snapToGrid(x), y: object.placement.position.y, z: snapToGrid(z) },
        },
      }
    }),
  }
}

export function updateObjectDetails(
  draft: CityDraft,
  objectId: string,
  input: { name: string; description: string; size: Vec3 },
): CityDraft | { error: string } {
  const current = draft.objects.find((object) => object.id === objectId)
  if (!current) {
    return { error: 'That object is not in this city.' }
  }
  const name = input.name.trim()
  if (!name) {
    return { error: 'An object needs a name.' }
  }
  const sizeError = validateSize(input.size)
  if (sizeError) {
    return { error: sizeError }
  }
  return {
    ...draft,
    objects: draft.objects.map((object) => {
      if (object.id !== objectId) {
        return object
      }
      return {
        ...object,
        name,
        description: input.description.trim(),
        placement: {
          ...object.placement,
          position: { ...object.placement.position, y: input.size.y / 2 },
          size: { x: input.size.x, y: input.size.y, z: input.size.z },
        },
      }
    }),
  }
}

function validateSize(size: Vec3): string | undefined {
  for (const [label, value] of [['Width', size.x], ['Height', size.y], ['Depth', size.z]] as const) {
    if (!Number.isFinite(value) || value <= 0 || value > 200) {
      return `${label} must be a number of meters greater than 0 and at most 200.`
    }
  }
  return undefined
}

export function rotateObject(draft: CityDraft, objectId: string): CityDraft {
  return {
    ...draft,
    objects: draft.objects.map((object) => {
      if (object.id !== objectId) {
        return object
      }
      const next = object.placement.rotation.y + Math.PI / 2
      return {
        ...object,
        placement: {
          ...object.placement,
          rotation: { ...object.placement.rotation, y: next >= Math.PI * 2 ? next - Math.PI * 2 : next },
        },
      }
    }),
  }
}

export function deleteObject(draft: CityDraft, objectId: string): CityDraft {
  const removedFlowIds = new Set(
    draft.flows.filter((flow) => flow.sourceObjectId === objectId || flow.targetObjectId === objectId).map((flow) => flow.id),
  )
  const flows = draft.flows.filter((flow) => !removedFlowIds.has(flow.id))
  const roads = draft.roads.flatMap((road) => {
    const points = road.points.filter((point) => point.kind !== 'object' || point.objectId !== objectId)
    return points.length >= 2 ? [{ ...road, points }] : []
  })
  return syncMembership(dropRates({
    ...draft,
    objects: draft.objects.filter((object) => object.id !== objectId),
    flows,
    roads,
  }, { objectId, flowIds: removedFlowIds }))
}

export function upsertRoad(draft: CityDraft, road: Road): CityDraft {
  const exists = draft.roads.some((item) => item.id === road.id)
  return {
    ...draft,
    roads: exists ? draft.roads.map((item) => (item.id === road.id ? road : item)) : [...draft.roads, road],
  }
}

export function moveRoadControl(draft: CityDraft, roadId: string, index: number, x: number, z: number): CityDraft {
  return {
    ...draft,
    roads: draft.roads.map((road) => {
      if (road.id !== roadId) {
        return road
      }
      return {
        ...road,
        points: road.points.map((point, pointIndex) => {
          if (pointIndex !== index || point.kind !== 'control') {
            return point
          }
          return { kind: 'control', x: snapToGrid(x), z: snapToGrid(z) }
        }),
      }
    }),
  }
}

export function deleteRoad(draft: CityDraft, roadId: string): CityDraft {
  return { ...draft, roads: draft.roads.filter((road) => road.id !== roadId) }
}

export function createConnection(
  draft: CityDraft,
  input: { sourceObjectId: string; targetObjectId: string; resourceTypeId: string; flowId: string },
  resourceTypes: ResourceType[],
): DraftResult {
  if (input.sourceObjectId === input.targetObjectId) {
    return { ok: false, message: 'Choose two different objects.' }
  }
  const source = draft.objects.find((object) => object.id === input.sourceObjectId)
  const target = draft.objects.find((object) => object.id === input.targetObjectId)
  if (!source || !target) {
    return { ok: false, message: 'Both objects have to exist in this city.' }
  }
  const resource = resourceTypes.find((item) => item.id === input.resourceTypeId)
  if (!resource) {
    return { ok: false, message: 'That resource type is not in the catalog.' }
  }
  const duplicate = draft.flows.some(
    (flow) =>
      flow.sourceObjectId === source.id &&
      flow.targetObjectId === target.id &&
      flow.resourceTypeId === resource.id,
  )
  if (duplicate) {
    return { ok: false, message: 'That link already exists.' }
  }

  const system = ensureSystem(draft, resource)
  const flow: ResourceFlow = {
    id: input.flowId,
    systemId: system.id,
    resourceTypeId: resource.id,
    sourceObjectId: source.id,
    targetObjectId: target.id,
    reliability: {
      status: 'demo',
      source: 'Layout editor',
      note: 'Recorded link only. Quantity is not calculated, so this is not a distribution.',
    },
  }
  return { ok: true, draft: syncMembership({ ...draft, systems: system.systems, flows: [...draft.flows, flow] }) }
}

export function setResourceRole(draft: CityDraft, role: ObjectResourceRole): CityDraft | { error: string } {
  if (!draft.objects.some((object) => object.id === role.objectId)) {
    return { error: 'That object is not in this city.' }
  }
  if (!nonNegativeRate(role.produces) || !nonNegativeRate(role.consumes) || !nonNegativeRate(role.stores) || !nonNegativeRate(role.stock)) {
    return { error: 'Production, demand, and storage must be numbers of kWh per day, zero or greater.' }
  }
  if (!Number.isFinite(role.priority)) {
    return { error: 'Priority must be a number. A lower number is served first.' }
  }
  const resourceRoles = [
    ...(draft.resourceRoles ?? []).filter((item) => item.objectId !== role.objectId || item.resourceTypeId !== role.resourceTypeId),
    role,
  ]
  return { ...draft, resourceRoles }
}

export function clearResourceRole(draft: CityDraft, objectId: string, resourceTypeId: string): CityDraft {
  if (!draft.resourceRoles) {
    return draft
  }
  const resourceRoles = draft.resourceRoles.filter((role) => role.objectId !== objectId || role.resourceTypeId !== resourceTypeId)
  if (resourceRoles.length === 0) {
    const next = { ...draft }
    delete next.resourceRoles
    return next
  }
  return { ...draft, resourceRoles }
}

export function setLinkLimit(draft: CityDraft, limit: LinkLimit): CityDraft | { error: string } {
  if (!draft.flows.some((flow) => flow.id === limit.flowId)) {
    return { error: 'That link is not in this city.' }
  }
  if (!nonNegativeRate(limit.capacity) || !Number.isFinite(limit.loss) || limit.loss < 0 || limit.loss > 1 || typeof limit.inService !== 'boolean') {
    return { error: 'Capacity must be zero or greater, and loss must be a fraction from 0 to 1.' }
  }
  const linkLimits = [...(draft.linkLimits ?? []).filter((item) => item.flowId !== limit.flowId), limit]
  return { ...draft, linkLimits }
}

export function loadEnergyExample(draft: CityDraft, templates: BuildingTemplate[], resourceTypes: ResourceType[]): CityDraft | { error: string } {
  const source = templates.find((item) => item.facilityType === 'energy-source')
  const hub = templates.find((item) => item.facilityType === 'distribution-center')
  const habitat = templates.find((item) => item.facilityType === 'habitat')
  if (!source || !hub || !habitat) {
    return { error: 'The building catalog has no source, hub, and home to build the example.' }
  }
  const slug = draft.cityId.split(':')[1] ?? draft.cityId
  const backup = draft.energyExampleBackup ?? withoutEnergyBackup(draft)
  let next: CityDraft = { cityId: draft.cityId, objects: [], systems: [], flows: [], roads: [] }
  next = placeObject(next, source, -24, 0, `object:${slug}:example-plant`)
  next = placeObject(next, hub, 0, 0, `object:${slug}:example-hub`)
  next = placeObject(next, habitat, 24, -16, `object:${slug}:example-home-a`)
  next = placeObject(next, habitat, 24, 16, `object:${slug}:example-home-b`)
  const plant = exampleRole(`object:${slug}:example-plant`, 100, 0, 1)
  const center = exampleRole(`object:${slug}:example-hub`, 0, 0, 1)
  const homeA = exampleRole(`object:${slug}:example-home-a`, 0, 40, 1)
  const homeB = exampleRole(`object:${slug}:example-home-b`, 0, 30, 2)
  for (const role of [plant, center, homeA, homeB]) {
    const saved = setResourceRole(next, role)
    if ('error' in saved) {
      return saved
    }
    next = saved
  }
  const links = [
    [`flow:${slug}:example-plant-hub`, `object:${slug}:example-plant`, `object:${slug}:example-hub`],
    [`flow:${slug}:example-hub-a`, `object:${slug}:example-hub`, `object:${slug}:example-home-a`],
    [`flow:${slug}:example-hub-b`, `object:${slug}:example-hub`, `object:${slug}:example-home-b`],
  ] as const
  for (const [flowId, sourceObjectId, targetObjectId] of links) {
    const connected = createConnection(next, { flowId, sourceObjectId, targetObjectId, resourceTypeId: 'resource:electricity' }, resourceTypes)
    if (!connected.ok) {
      return { error: connected.message }
    }
    next = connected.draft
    const limited = setLinkLimit(next, { flowId, capacity: 100, loss: 0, inService: true })
    if ('error' in limited) {
      return limited
    }
    next = limited
  }
  next.energyExampleBackup = backup
  return next
}

export function applySampleEnergyRates(draft: CityDraft): CityDraft | { error: string } {
  const electricity = draft.flows.filter((flow) => flow.resourceTypeId === 'resource:electricity')
  if (electricity.length === 0) {
    return { error: 'This city has no electrical connections. Sample values were not applied, and no supply network was created.' }
  }
  const backup = draft.energyExampleBackup ?? withoutEnergyBackup(draft)
  const keptRoles = (draft.resourceRoles ?? []).filter((role) => role.resourceTypeId !== 'resource:electricity')
  const sampleRoles = draft.objects.flatMap((object) => {
    const role = sampleElectricityRole(object.id, object.facilityType)
    return role ? [role] : []
  })
  const keptLimits = (draft.linkLimits ?? []).filter((limit) => !electricity.some((flow) => flow.id === limit.flowId))
  const sampleLimits: LinkLimit[] = electricity.map((flow) => ({
    flowId: flow.id,
    capacity: sampleEnergyAssumptions.lineCapacityKwh,
    loss: 0,
    inService: true,
  }))
  const resourceRoles = [...keptRoles, ...sampleRoles]
  const next: CityDraft = {
    ...draft,
    linkLimits: [...keptLimits, ...sampleLimits],
    energyExampleBackup: backup,
  }
  if (resourceRoles.length > 0) {
    next.resourceRoles = resourceRoles
  } else {
    delete next.resourceRoles
  }
  return next
}

export function revertEnergyExample(draft: CityDraft): CityDraft | { error: string } {
  if (!draft.energyExampleBackup) {
    return { error: 'There is no saved copy from before the example.' }
  }
  return withoutEnergyBackup(draft.energyExampleBackup)
}

export function clearLinkLimit(draft: CityDraft, flowId: string): CityDraft {
  if (!draft.linkLimits) {
    return draft
  }
  const linkLimits = draft.linkLimits.filter((limit) => limit.flowId !== flowId)
  if (linkLimits.length === 0) {
    const next = { ...draft }
    delete next.linkLimits
    return next
  }
  return { ...draft, linkLimits }
}

export function deleteConnection(draft: CityDraft, flowId: string): CityDraft {
  return syncMembership(dropRates(
    { ...draft, flows: draft.flows.filter((flow) => flow.id !== flowId) },
    { flowIds: new Set([flowId]) },
  ))
}

export function resolveRoadPolyline(road: Road, objects: CityObject[]): Vec3[] {
  const byId = new Map(objects.map((object) => [object.id, object]))
  const points: Vec3[] = []
  for (const point of road.points) {
    if (point.kind === 'control') {
      points.push({ x: point.x, y: 0.25, z: point.z })
      continue
    }
    const object = byId.get(point.objectId)
    if (object) {
      points.push({ x: object.placement.position.x, y: 0.25, z: object.placement.position.z })
    }
  }
  return points
}

export function validateCityDraft(draft: CityDraft, snapshot: CatalogSnapshot): string[] {
  const issues: string[] = []
  const categories = new Set(snapshot.categories.map((category) => category.id))
  const resources = new Set(snapshot.resourceTypes.map((resource) => resource.id))
  const objectIds = new Set<string>()

  for (const object of draft.objects) {
    if (object.cityId !== draft.cityId) {
      issues.push(`Object ${object.id} is outside ${draft.cityId}.`)
    }
    if (objectIds.has(object.id)) {
      issues.push(`Duplicate object id ${object.id}.`)
    }
    objectIds.add(object.id)
    if (!categories.has(object.categoryId)) {
      issues.push(`Object ${object.id} uses an unknown category.`)
    }
  }

  const systemIds = new Set<string>()
  for (const system of draft.systems) {
    if (system.cityId !== draft.cityId) {
      issues.push(`System ${system.id} is outside ${draft.cityId}.`)
    }
    if (systemIds.has(system.id)) {
      issues.push(`Duplicate system id ${system.id}.`)
    }
    systemIds.add(system.id)
    for (const objectId of system.memberObjectIds) {
      if (!objectIds.has(objectId)) {
        issues.push(`System ${system.id} references missing object ${objectId}.`)
      }
    }
  }

  for (const flow of draft.flows) {
    if (!systemIds.has(flow.systemId)) {
      issues.push(`Link ${flow.id} references missing system ${flow.systemId}.`)
    }
    if (!resources.has(flow.resourceTypeId)) {
      issues.push(`Link ${flow.id} references missing resource ${flow.resourceTypeId}.`)
    }
    if (!objectIds.has(flow.sourceObjectId) || !objectIds.has(flow.targetObjectId)) {
      issues.push(`Link ${flow.id} references a missing object.`)
    }
    if (flow.sourceObjectId === flow.targetObjectId) {
      issues.push(`Link ${flow.id} starts and ends on the same object.`)
    }
    const system = draft.systems.find((item) => item.id === flow.systemId)
    if (system) {
      for (const endpoint of [flow.sourceObjectId, flow.targetObjectId]) {
        if (objectIds.has(endpoint) && !system.memberObjectIds.includes(endpoint)) {
          issues.push(`Link ${flow.id} uses ${endpoint}, which is not a member of ${system.id}.`)
        }
      }
    }
  }

  if (draft.resourceRoles) {
    const seenRoles = new Set<string>()
    for (const role of draft.resourceRoles) {
      const key = `${role.objectId}\n${role.resourceTypeId}`
      if (seenRoles.has(key)) {
        issues.push(`Object ${role.objectId} has more than one rate for ${role.resourceTypeId}.`)
      }
      seenRoles.add(key)
      if (!objectIds.has(role.objectId)) {
        issues.push(`A rate refers to missing object ${role.objectId}.`)
      }
      if (!resources.has(role.resourceTypeId)) {
        issues.push(`A rate refers to missing resource ${role.resourceTypeId}.`)
      }
    }
  }

  if (draft.linkLimits) {
    const flowIds = new Set(draft.flows.map((flow) => flow.id))
    const seenLimits = new Set<string>()
    for (const limit of draft.linkLimits) {
      if (seenLimits.has(limit.flowId)) {
        issues.push(`Link ${limit.flowId} has more than one limit.`)
      }
      seenLimits.add(limit.flowId)
      if (!flowIds.has(limit.flowId)) {
        issues.push(`A line limit refers to missing link ${limit.flowId}.`)
      }
    }
  }

  for (const road of draft.roads) {
    if (road.cityId !== draft.cityId) {
      issues.push(`Road ${road.id} is outside ${draft.cityId}.`)
    }
    if (road.points.length < 2) {
      issues.push(`Road ${road.id} needs at least two points.`)
    }
    for (const point of road.points) {
      if (point.kind === 'object' && !objectIds.has(point.objectId)) {
        issues.push(`Road ${road.id} references missing object ${point.objectId}.`)
      }
    }
  }

  return issues
}

function ensureSystem(draft: CityDraft, resource: ResourceType): { id: string; systems: CitySystem[] } {
  const existing = draft.systems.find((system) => system.kind === resource.flowKind)
  if (existing) {
    return { id: existing.id, systems: draft.systems }
  }
  const slug = draft.cityId.split(':')[1] ?? draft.cityId
  const system: CitySystem = {
    id: `system:${slug}:${resource.flowKind}`,
    cityId: draft.cityId,
    kind: resource.flowKind,
    name: `${resource.name} links`,
    description: 'Links recorded in the editor. This list is not a supply calculation.',
    memberObjectIds: [],
    reliability: {
      status: 'demo',
      source: 'Layout editor',
      note: 'Created because a link of this kind was added.',
    },
    documentIds: [],
  }
  return { id: system.id, systems: [...draft.systems, system] }
}

function syncMembership(draft: CityDraft): CityDraft {
  const systems = draft.systems.map((system) => {
    const members = new Set<string>()
    for (const flow of draft.flows) {
      if (flow.systemId === system.id) {
        members.add(flow.sourceObjectId)
        members.add(flow.targetObjectId)
      }
    }
    return { ...system, memberObjectIds: [...members] }
  })
  const objects = draft.objects.map((object) => ({
    ...object,
    systemIds: systems.filter((system) => system.memberObjectIds.includes(object.id)).map((system) => system.id),
  }))
  return { ...draft, systems, objects }
}

function exampleRole(objectId: string, produces: number, consumes: number, priority: number): ObjectResourceRole {
  return { objectId, resourceTypeId: 'resource:electricity', produces, consumes, stores: 0, stock: 0, priority }
}

function withoutEnergyBackup(draft: CityDraft): CityDraft {
  const next = { ...draft }
  delete next.energyExampleBackup
  return next
}

function nonNegativeRate(value: number): boolean {
  return Number.isFinite(value) && value >= 0
}

function dropRates(draft: CityDraft, removed: { objectId?: string; flowIds: ReadonlySet<string> }): CityDraft {
  const next: CityDraft = { ...draft }
  if (draft.resourceRoles && removed.objectId) {
    next.resourceRoles = draft.resourceRoles.filter((role) => role.objectId !== removed.objectId)
  }
  if (draft.linkLimits && removed.flowIds.size > 0) {
    next.linkLimits = draft.linkLimits.filter((limit) => !removed.flowIds.has(limit.flowId))
  }
  return next
}

function clone<T>(value: T): T {
  return JSON.parse(JSON.stringify(value)) as T
}

export function roadPoint(kind: 'control', x: number, z: number): RoadPoint
export function roadPoint(kind: 'object', objectId: string): RoadPoint
export function roadPoint(kind: 'control' | 'object', a: number | string, b?: number): RoadPoint {
  if (kind === 'object') {
    return { kind: 'object', objectId: String(a) }
  }
  return { kind: 'control', x: snapToGrid(Number(a)), z: snapToGrid(b ?? 0) }
}
