import type { CatalogSnapshot, EntityRef } from './types'

export function collectIntegrityIssues(snapshot: CatalogSnapshot): string[] {
  const issues: string[] = []
  const cityIds = uniqueIds(snapshot.cities.map((city) => city.id), 'city', issues)
  const categoryIds = uniqueIds(snapshot.categories.map((category) => category.id), 'category', issues)
  const objectIds = uniqueIds(snapshot.objects.map((object) => object.id), 'object', issues)
  const resourceIds = uniqueIds(snapshot.resourceTypes.map((resource) => resource.id), 'resource type', issues)
  const systemIds = uniqueIds(snapshot.systems.map((system) => system.id), 'system', issues)
  uniqueIds(snapshot.flows.map((flow) => flow.id), 'flow', issues)
  uniqueIds(snapshot.roads.map((road) => road.id), 'road', issues)
  const documentIds = uniqueIds(snapshot.documents.map((document) => document.id), 'document', issues)
  uniqueIds(snapshot.tasks.map((task) => task.id), 'task', issues)

  for (const object of snapshot.objects) {
    requireId(cityIds, object.cityId, `Object ${object.id} city`, issues)
    requireId(categoryIds, object.categoryId, `Object ${object.id} category`, issues)
    for (const systemId of object.systemIds) {
      requireId(systemIds, systemId, `Object ${object.id} system`, issues)
      const system = snapshot.systems.find((item) => item.id === systemId)
      if (system && system.cityId !== object.cityId) {
        issues.push(`Object ${object.id} lists system ${systemId} from another city.`)
      }
    }
    for (const documentId of object.documentIds) {
      requireId(documentIds, documentId, `Object ${object.id} document`, issues)
    }
  }

  for (const system of snapshot.systems) {
    requireId(cityIds, system.cityId, `System ${system.id} city`, issues)
    if (!system.kind.trim()) {
      issues.push(`System ${system.id} needs a kind.`)
    }
    for (const objectId of system.memberObjectIds) {
      requireId(objectIds, objectId, `System ${system.id} member`, issues)
      const object = snapshot.objects.find((item) => item.id === objectId)
      if (object && object.cityId !== system.cityId) {
        issues.push(`System ${system.id} includes object ${objectId} from another city.`)
      }
    }
    for (const documentId of system.documentIds) {
      requireId(documentIds, documentId, `System ${system.id} document`, issues)
    }
  }

  for (const flow of snapshot.flows) {
    requireId(systemIds, flow.systemId, `Flow ${flow.id} system`, issues)
    requireId(resourceIds, flow.resourceTypeId, `Flow ${flow.id} resource`, issues)
    requireId(objectIds, flow.sourceObjectId, `Flow ${flow.id} source`, issues)
    requireId(objectIds, flow.targetObjectId, `Flow ${flow.id} target`, issues)
    if (flow.sourceObjectId === flow.targetObjectId) {
      issues.push(`Flow ${flow.id} starts and ends on the same object.`)
    }
    const system = snapshot.systems.find((item) => item.id === flow.systemId)
    if (system) {
      for (const endpoint of [flow.sourceObjectId, flow.targetObjectId]) {
        if (!system.memberObjectIds.includes(endpoint)) {
          issues.push(`Flow ${flow.id} uses ${endpoint}, which is not a member of ${system.id}.`)
        }
      }
    }
  }

  for (const road of snapshot.roads) {
    requireId(cityIds, road.cityId, `Road ${road.id} city`, issues)
    if (road.points.length < 2) {
      issues.push(`Road ${road.id} needs at least two points.`)
    }
    for (const point of road.points) {
      if (point.kind === 'object') {
        requireId(objectIds, point.objectId, `Road ${road.id} object`, issues)
        const object = snapshot.objects.find((item) => item.id === point.objectId)
        if (object && object.cityId !== road.cityId) {
          issues.push(`Road ${road.id} attaches to an object from another city.`)
        }
      } else if (!Number.isFinite(point.x) || !Number.isFinite(point.z)) {
        issues.push(`Road ${road.id} has a control point that is not a number.`)
      }
    }
  }

  for (const document of snapshot.documents) {
    for (const link of document.links) {
      requireEntity(snapshot, link, `Document ${document.id}`, issues)
    }
  }

  for (const task of snapshot.tasks) {
    if (task.cityId) {
      requireId(cityIds, task.cityId, `Task ${task.id} city`, issues)
    }
    if (task.objectId) {
      requireId(objectIds, task.objectId, `Task ${task.id} object`, issues)
      const object = snapshot.objects.find((item) => item.id === task.objectId)
      if (object && task.cityId && object.cityId !== task.cityId) {
        issues.push(`Task ${task.id} object is outside its city.`)
      }
    }
    if (task.systemId) {
      requireId(systemIds, task.systemId, `Task ${task.id} system`, issues)
      const system = snapshot.systems.find((item) => item.id === task.systemId)
      if (system && task.cityId && system.cityId !== task.cityId) {
        issues.push(`Task ${task.id} system is outside its city.`)
      }
    }
    for (const documentId of task.documentIds) {
      requireId(documentIds, documentId, `Task ${task.id} document`, issues)
    }
  }

  return issues
}

export function assertValidCatalog(snapshot: CatalogSnapshot): void {
  const issues = collectIntegrityIssues(snapshot)
  if (issues.length > 0) {
    throw new Error(`Catalog integrity failed:\n${issues.join('\n')}`)
  }
}

function uniqueIds(ids: string[], label: string, issues: string[]): Set<string> {
  const seen = new Set<string>()
  for (const id of ids) {
    if (!id.trim()) {
      issues.push(`A ${label} is missing an id.`)
      continue
    }
    if (seen.has(id)) {
      issues.push(`Duplicate ${label} id ${id}.`)
    }
    seen.add(id)
  }
  return seen
}

function requireId(ids: Set<string>, id: string, label: string, issues: string[]): void {
  if (!ids.has(id)) {
    issues.push(`${label} references missing id ${id}.`)
  }
}

function requireEntity(snapshot: CatalogSnapshot, ref: EntityRef, label: string, issues: string[]): void {
  const found =
    ref.kind === 'city'
      ? snapshot.cities.some((city) => city.id === ref.id)
      : ref.kind === 'object'
        ? snapshot.objects.some((object) => object.id === ref.id)
        : snapshot.systems.some((system) => system.id === ref.id)
  if (!found) {
    issues.push(`${label} links to missing ${ref.kind} ${ref.id}.`)
  }
}
