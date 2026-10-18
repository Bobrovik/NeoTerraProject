import type {
  CatalogDocument,
  CatalogSnapshot,
  City,
  CityObject,
  CitySystem,
  EntityRef,
  ObjectCategory,
  ProjectTask,
  ResourceFlow,
  ResourceType,
} from './types'

export function getCity(snapshot: CatalogSnapshot, cityId: string): City | undefined {
  return snapshot.cities.find((city) => city.id === cityId)
}

export function getObject(snapshot: CatalogSnapshot, objectId: string): CityObject | undefined {
  return snapshot.objects.find((object) => object.id === objectId)
}

export function getSystem(snapshot: CatalogSnapshot, systemId: string): CitySystem | undefined {
  return snapshot.systems.find((system) => system.id === systemId)
}

export function getCategory(snapshot: CatalogSnapshot, categoryId: string): ObjectCategory | undefined {
  return snapshot.categories.find((category) => category.id === categoryId)
}

export function getResourceType(snapshot: CatalogSnapshot, resourceTypeId: string): ResourceType | undefined {
  return snapshot.resourceTypes.find((resourceType) => resourceType.id === resourceTypeId)
}

export function getDocument(snapshot: CatalogSnapshot, documentId: string): CatalogDocument | undefined {
  return snapshot.documents.find((document) => document.id === documentId)
}

export function objectsForCity(snapshot: CatalogSnapshot, cityId: string): CityObject[] {
  return snapshot.objects.filter((object) => object.cityId === cityId)
}

export function systemsForCity(snapshot: CatalogSnapshot, cityId: string): CitySystem[] {
  return snapshot.systems.filter((system) => system.cityId === cityId)
}

export function flowsForSystem(snapshot: CatalogSnapshot, systemId: string): ResourceFlow[] {
  return snapshot.flows.filter((flow) => flow.systemId === systemId)
}

export function flowsForObject(snapshot: CatalogSnapshot, objectId: string): ResourceFlow[] {
  return snapshot.flows.filter(
    (flow) => flow.sourceObjectId === objectId || flow.targetObjectId === objectId,
  )
}

export function categoriesForCity(snapshot: CatalogSnapshot, cityId: string): ObjectCategory[] {
  const used = new Set(objectsForCity(snapshot, cityId).map((object) => object.categoryId))
  return snapshot.categories.filter((category) => used.has(category.id))
}

export function documentsForEntity(snapshot: CatalogSnapshot, ref: EntityRef): CatalogDocument[] {
  return snapshot.documents.filter(
    (document) =>
      document.links.some((link) => link.kind === ref.kind && link.id === ref.id) ||
      (ref.kind === 'object' && getObject(snapshot, ref.id)?.documentIds.includes(document.id)) ||
      (ref.kind === 'system' && getSystem(snapshot, ref.id)?.documentIds.includes(document.id)),
  )
}

export function tasksForCity(tasks: ProjectTask[], cityId: string): ProjectTask[] {
  return tasks.filter((task) => task.cityId === cityId)
}

export function tasksForObject(tasks: ProjectTask[], objectId: string): ProjectTask[] {
  return tasks.filter((task) => task.objectId === objectId)
}

export function tasksForSystem(tasks: ProjectTask[], systemId: string): ProjectTask[] {
  return tasks.filter((task) => task.systemId === systemId)
}

export function entityLabel(snapshot: CatalogSnapshot, ref: EntityRef): string {
  if (ref.kind === 'city') {
    return getCity(snapshot, ref.id)?.name ?? ref.id
  }
  if (ref.kind === 'object') {
    return getObject(snapshot, ref.id)?.name ?? ref.id
  }
  return getSystem(snapshot, ref.id)?.name ?? ref.id
}
