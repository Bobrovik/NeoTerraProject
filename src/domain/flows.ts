import type { CityObject, ResourceFlow, ResourceType, Vec3 } from './types'

export type FlowSegment = {
  flowId: string
  resourceTypeId: string
  color: string
  from: Vec3
  to: Vec3
}

export function resolveFlowSegments(
  flows: ResourceFlow[],
  objects: CityObject[],
  resourceTypes: ResourceType[],
  visibleObjectIds?: ReadonlySet<string>,
): FlowSegment[] {
  const objectsById = new Map(objects.map((object) => [object.id, object]))
  const colors = new Map(resourceTypes.map((resourceType) => [resourceType.id, resourceType.color]))
  const segments: FlowSegment[] = []

  for (const flow of flows) {
    if (visibleObjectIds && (!visibleObjectIds.has(flow.sourceObjectId) || !visibleObjectIds.has(flow.targetObjectId))) {
      continue
    }
    const source = objectsById.get(flow.sourceObjectId)
    const target = objectsById.get(flow.targetObjectId)
    if (!source || !target) {
      continue
    }
    segments.push({
      flowId: flow.id,
      resourceTypeId: flow.resourceTypeId,
      color: colors.get(flow.resourceTypeId) ?? '#8eb8d4',
      from: source.placement.position,
      to: target.placement.position,
    })
  }

  return segments
}
