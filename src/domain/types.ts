export type ReliabilityStatus =
  | 'verified'
  | 'engineering-fact'
  | 'fresco-principle'
  | 'hypothesis'
  | 'demo'

export type Reliability = {
  status: ReliabilityStatus
  source?: string
  note?: string
  updatedAt?: string
}

export type EntityKind = 'city' | 'object' | 'system'

export type EntityRef = {
  kind: EntityKind
  id: string
}

export type Vec3 = {
  x: number
  y: number
  z: number
}

export type DevelopmentStatus = 'concept' | 'schematic'

export type City = {
  id: string
  name: string
  summary: string
  description: string
  latitude: number
  longitude: number
  developmentStatus: DevelopmentStatus
  reliability: Reliability
}

export type ObjectCategory = {
  id: string
  name: string
  description: string
  color: string
}

export type PrimitiveShape = 'box' | 'cylinder'

export type PrimitiveRepresentation = {
  kind: 'primitive'
  shape: PrimitiveShape
  color: string
}

export type ModelRepresentation = {
  kind: 'model'
  url: string
  fallback: {
    shape: PrimitiveShape
    color: string
  }
}

export type ObjectRepresentation = PrimitiveRepresentation | ModelRepresentation

export type Metric = {
  label: string
  value: string
  reliability: Reliability
}

export type CityObject = {
  id: string
  cityId: string
  name: string
  categoryId: string
  description: string
  placement: {
    position: Vec3
    rotation: Vec3
    size: Vec3
  }
  representation: ObjectRepresentation
  facilityType?: string
  systemIds: string[]
  metrics: Metric[]
  reliability: Reliability
  documentIds: string[]
}

export type ResourceType = {
  id: string
  name: string
  unit: string
  color: string
  description: string
  flowKind: string
}

export type CitySystem = {
  id: string
  cityId: string
  kind: string
  name: string
  description: string
  memberObjectIds: string[]
  reliability: Reliability
  documentIds: string[]
}

export type ResourceFlow = {
  id: string
  systemId: string
  resourceTypeId: string
  sourceObjectId: string
  targetObjectId: string
  reliability: Reliability
  quantity?: number
  unit?: string
  interval?: string
  capacity?: number
  loss?: number
  basis?: string
}

export type RoadPoint =
  | { kind: 'control'; x: number; z: number }
  | { kind: 'object'; objectId: string }

export type Road = {
  id: string
  cityId: string
  points: RoadPoint[]
}

export type DocumentKind = 'principle' | 'hypothesis' | 'source' | 'question' | 'note'

export type CatalogDocument = {
  id: string
  title: string
  summary: string
  body: string
  kind: DocumentKind
  reliability: Reliability
  links: EntityRef[]
}

export type TaskStatus = 'open' | 'in-progress' | 'done'

export type TaskPriority = 'low' | 'medium' | 'high'

export type ProjectTask = {
  id: string
  title: string
  description: string
  status: TaskStatus
  priority: TaskPriority
  cityId?: string
  objectId?: string
  systemId?: string
  documentIds: string[]
  createdAt: string
  updatedAt: string
}

export type CatalogSnapshot = {
  cities: City[]
  categories: ObjectCategory[]
  objects: CityObject[]
  resourceTypes: ResourceType[]
  systems: CitySystem[]
  flows: ResourceFlow[]
  roads: Road[]
  documents: CatalogDocument[]
  tasks: ProjectTask[]
}

export type CatalogSource = {
  load(): Promise<CatalogSnapshot>
}

export type CityViewMode = 'overview' | 'layout' | 'systems' | 'map'
export type CameraView = 'perspective' | 'top'
export type LayoutTool = 'select' | 'place' | 'road'

export type NewTaskInput = {
  title: string
  description: string
  priority: TaskPriority
  cityId?: string
  objectId?: string
  systemId?: string
}
