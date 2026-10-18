import { flowsForSystem, getResourceType, getSystem, objectsForCity } from './queries'
import type { CatalogSnapshot, CityObject } from './types'

export type GraphColumn = 'source' | 'middle' | 'sink'

export type SystemGraphNode = {
  objectId: string
  name: string
  column: GraphColumn
  x: number
  y: number
}

export type SystemGraphEdge = {
  flowId: string
  resourceName: string
  color: string
  x1: number
  y1: number
  x2: number
  y2: number
}

export type SystemGraphModel = {
  systemId: string
  width: number
  height: number
  nodes: SystemGraphNode[]
  edges: SystemGraphEdge[]
}

const COLUMN_X: Record<GraphColumn, number> = {
  source: 24,
  middle: 250,
  sink: 476,
}

const NODE_WIDTH = 168
const NODE_HEIGHT = 44
const ROW_GAP = 18
const TOP = 16

export function buildSystemGraph(snapshot: CatalogSnapshot, systemId: string): SystemGraphModel | undefined {
  const system = getSystem(snapshot, systemId)
  if (!system) {
    return undefined
  }

  const objects = objectsForCity(snapshot, system.cityId)
  const byId = new Map(objects.map((object) => [object.id, object]))
  const members = system.memberObjectIds.flatMap((objectId) => {
    const object = byId.get(objectId)
    return object ? [object] : []
  })
  const flows = flowsForSystem(snapshot, system.id)
  const nodes = layoutNodes(members, flows)

  const edges: SystemGraphEdge[] = []
  for (const flow of flows) {
    const source = nodes.find((node) => node.objectId === flow.sourceObjectId)
    const target = nodes.find((node) => node.objectId === flow.targetObjectId)
    if (!source || !target) {
      continue
    }
    const resource = getResourceType(snapshot, flow.resourceTypeId)
    edges.push({
      flowId: flow.id,
      resourceName: resource?.name ?? flow.resourceTypeId,
      color: resource?.color ?? '#8eb8d4',
      x1: source.x + NODE_WIDTH,
      y1: source.y + NODE_HEIGHT / 2,
      x2: target.x,
      y2: target.y + NODE_HEIGHT / 2,
    })
  }

  const height = Math.max(...nodes.map((node) => node.y + NODE_HEIGHT), NODE_HEIGHT) + TOP
  return {
    systemId: system.id,
    width: COLUMN_X.sink + NODE_WIDTH + 24,
    height,
    nodes,
    edges,
  }
}

function layoutNodes(members: CityObject[], flows: { sourceObjectId: string; targetObjectId: string }[]): SystemGraphNode[] {
  const sources = new Set(flows.map((flow) => flow.sourceObjectId))
  const targets = new Set(flows.map((flow) => flow.targetObjectId))
  const columns: Record<GraphColumn, CityObject[]> = { source: [], middle: [], sink: [] }

  for (const member of members) {
    const isSource = sources.has(member.id)
    const isTarget = targets.has(member.id)
    const column: GraphColumn = isSource && !isTarget ? 'source' : isTarget && !isSource ? 'sink' : 'middle'
    columns[column].push(member)
  }

  const nodes: SystemGraphNode[] = []
  for (const column of ['source', 'middle', 'sink'] as const) {
    columns[column].forEach((member, index) => {
      nodes.push({
        objectId: member.id,
        name: member.name,
        column,
        x: COLUMN_X[column],
        y: TOP + index * (NODE_HEIGHT + ROW_GAP),
      })
    })
  }
  return nodes
}

export const systemGraphNodeSize = {
  width: NODE_WIDTH,
  height: NODE_HEIGHT,
}
