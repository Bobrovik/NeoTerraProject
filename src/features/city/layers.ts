import type { ResourceFlow, ResourceType } from '../../domain/types'

export const linkLayerKinds = ['energy', 'water', 'materials', 'information'] as const

export type LinkLayerKind = (typeof linkLayerKinds)[number]

export type InfrastructureLayersState = {
  buildings: boolean
  roads: boolean
} & Record<LinkLayerKind, boolean>

export type LinkLayerEntry = {
  kind: LinkLayerKind
  label: string
  color: string
  count: number
  empty: boolean
}

const linkLayerLabels: Record<LinkLayerKind, string> = {
  energy: 'Energy',
  water: 'Water',
  materials: 'Materials',
  information: 'Information',
}

const linkLayerFallbackColors: Record<LinkLayerKind, string> = {
  energy: '#e2c27a',
  water: '#7eb6d6',
  materials: '#c4a484',
  information: '#c3b7d8',
}

export const defaultInfrastructureLayers: InfrastructureLayersState = {
  buildings: true,
  roads: true,
  energy: true,
  water: true,
  materials: true,
  information: true,
}

export function flowKindFor(flow: ResourceFlow, resourceTypes: ResourceType[]): string | undefined {
  return resourceTypes.find((resource) => resource.id === flow.resourceTypeId)?.flowKind
}

export function colorForFlowKind(kind: LinkLayerKind, resourceTypes: ResourceType[]): string {
  return resourceTypes.find((resource) => resource.flowKind === kind)?.color ?? linkLayerFallbackColors[kind]
}

export function linkLayerEntries(flows: ResourceFlow[], resourceTypes: ResourceType[]): LinkLayerEntry[] {
  return linkLayerKinds.map((kind) => {
    const count = flows.filter((flow) => flowKindFor(flow, resourceTypes) === kind).length
    return {
      kind,
      label: linkLayerLabels[kind],
      color: colorForFlowKind(kind, resourceTypes),
      count,
      empty: count === 0,
    }
  })
}

export function flowsForLayers(
  flows: ResourceFlow[],
  resourceTypes: ResourceType[],
  layers: InfrastructureLayersState,
): ResourceFlow[] {
  return flows.filter((flow) => {
    const kind = flowKindFor(flow, resourceTypes)
    if (kind === 'energy' || kind === 'water' || kind === 'materials' || kind === 'information') {
      return layers[kind]
    }
    return true
  })
}
