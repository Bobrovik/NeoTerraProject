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
  const flows = draft.flows.filter((flow) => flow.sourceObjectId !== objectId && flow.targetObjectId !== objectId)
  const roads = draft.roads.flatMap((road) => {
    const points = road.points.filter((point) => point.kind !== 'object' || point.objectId !== objectId)
    return points.length >= 2 ? [{ ...road, points }] : []
  })
  return syncMembership({
    ...draft,
    objects: draft.objects.filter((object) => object.id !== objectId),
    flows,
    roads,
  })
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

export function deleteConnection(draft: CityDraft, flowId: string): CityDraft {
  return syncMembership({ ...draft, flows: draft.flows.filter((flow) => flow.id !== flowId) })
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
