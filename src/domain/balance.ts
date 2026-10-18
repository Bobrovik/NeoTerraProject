import type { ResourceFlow } from './types'

/** Rates for one object and one resource over a single day. Storage is recorded and not used yet. */
export type ObjectResourceRole = {
  objectId: string
  resourceTypeId: string
  produces: number
  consumes: number
  stores: number
  stock: number
  /** A smaller number is served first. */
  priority: number
}

/** What one existing connection is allowed to carry. This is not a new connection. */
export type LinkLimit = {
  flowId: string
  /** Maximum kWh this line may send during the day. */
  capacity: number
  /** Fraction of the sent amount that does not arrive. 0 means no loss. */
  loss: number
  inService: boolean
}

export type BalanceInput = {
  resourceTypeId: string
  flows: readonly ResourceFlow[]
  roles: readonly ObjectResourceRole[]
  limits: readonly LinkLimit[]
}

export type ObjectConstraint = 'none' | 'generation' | 'line-capacity' | 'line-loss' | 'disconnected'

export type ObjectBalance = {
  objectId: string
  produced: number
  requested: number
  /** kWh that arrived on incoming lines. */
  arrived: number
  /** kWh counted toward this object's request. */
  supplied: number
  shortfall: number
  /** kWh sent onward to other objects. */
  forwarded: number
  constraint: ObjectConstraint
  /** The line that explains a shortfall, when a line is the cause. */
  constraintLineId?: string
}

export type LinkBalance = {
  flowId: string
  sourceObjectId: string
  targetObjectId: string
  sent: number
  arrived: number
  capacity: number
  loss: number
  inService: boolean
  limited: boolean
}

export type BalanceLimitKind = 'none' | 'generation' | 'link' | 'disconnected'

export type EnergyBalance = {
  ok: true
  resourceTypeId: string
  interval: 'day'
  unit: 'kWh'
  generated: number
  requested: number
  delivered: number
  shortfall: number
  limitedBy: BalanceLimitKind
  objects: ObjectBalance[]
  links: LinkBalance[]
  notes: string[]
}

export type BalanceRefusal = {
  ok: false
  reason: 'cycle' | 'no-rates' | 'invalid'
  message: string
}

export type EnergyBalanceResult = EnergyBalance | BalanceRefusal

const EPS = 1e-9

type NodeState = {
  id: string
  produces: number
  consumes: number
  priority: number
  remainingProduce: number
  arrived: number
  supplied: number
  forwarded: number
  incoming: EdgeState[]
  outgoing: EdgeState[]
}

type EdgeState = {
  flowId: string
  sourceId: string
  targetId: string
  capacity: number
  loss: number
  inService: boolean
  residual: number
  sent: number
  arrived: number
  demandShare: number
  blockedDemand: number
  passWant: number
  passAccepted: number
  passRequestedSend: number
  passSent: number
}

/**
 * One-day electricity balance for the connections that already exist.
 * Capacity limits what a line sends. Loss reduces what the next object receives.
 * A lower priority number is served first. Equal priorities share in proportion to demand.
 * The inputs are not modified, and the result is not stored.
 */
export function calculateEnergyBalance(input: BalanceInput): EnergyBalanceResult {
  const invalid = validate(input)
  if (invalid) {
    return invalid
  }

  const roles = input.roles.filter((role) => role.resourceTypeId === input.resourceTypeId)
  if (roles.length === 0) {
    return { ok: false, reason: 'no-rates', message: 'No rates entered.' }
  }

  const flows = input.flows.filter((flow) => flow.resourceTypeId === input.resourceTypeId)
  const limits = new Map<string, LinkLimit>()
  for (const limit of input.limits) {
    if (limits.has(limit.flowId)) {
      return { ok: false, reason: 'invalid', message: `Link ${limit.flowId} has more than one limit.` }
    }
    limits.set(limit.flowId, limit)
  }
  for (const flow of flows) {
    if (!limits.has(flow.id)) {
      return { ok: false, reason: 'invalid', message: `Link ${flow.id} has no limit.` }
    }
  }

  const graph = buildGraph(flows, roles, limits)
  const sinksFirst = topologicalOrder(graph)
  if (sinksFirst === 'cycle') {
    return {
      ok: false,
      reason: 'cycle',
      message: 'The connections form a cycle, so the balance cannot be calculated.',
    }
  }

  runPasses(graph, sinksFirst)
  return assemble(input.resourceTypeId, graph, flows)
}

function validate(input: BalanceInput): BalanceRefusal | undefined {
  const seenRoles = new Set<string>()
  for (const role of input.roles) {
    if (role.resourceTypeId !== input.resourceTypeId) {
      continue
    }
    if (seenRoles.has(role.objectId)) {
      return { ok: false, reason: 'invalid', message: `Object ${role.objectId} has more than one rate for this resource.` }
    }
    seenRoles.add(role.objectId)
    if (!nonNegative(role.produces) || !nonNegative(role.consumes) || !nonNegative(role.stores) || !nonNegative(role.stock)) {
      return { ok: false, reason: 'invalid', message: `Rates for ${role.objectId} must be zero or greater.` }
    }
    if (!Number.isFinite(role.priority)) {
      return { ok: false, reason: 'invalid', message: `Priority for ${role.objectId} must be a finite number.` }
    }
  }
  for (const limit of input.limits) {
    if (!nonNegative(limit.capacity) || !Number.isFinite(limit.loss) || limit.loss < 0 || limit.loss > 1) {
      return { ok: false, reason: 'invalid', message: `Loss and capacity for ${limit.flowId} must be a capacity of at least 0 and a loss from 0 to 1.` }
    }
  }
  return undefined
}

function nonNegative(value: number): boolean {
  return Number.isFinite(value) && value >= 0
}

function buildGraph(flows: readonly ResourceFlow[], roles: readonly ObjectResourceRole[], limits: Map<string, LinkLimit>): Map<string, NodeState> {
  const nodes = new Map<string, NodeState>()
  const ensure = (objectId: string): NodeState => {
    const existing = nodes.get(objectId)
    if (existing) {
      return existing
    }
    const role = roles.find((item) => item.objectId === objectId)
    const produced = role?.produces ?? 0
    const node: NodeState = {
      id: objectId,
      produces: produced,
      consumes: role?.consumes ?? 0,
      priority: role?.priority ?? 1,
      remainingProduce: produced,
      arrived: 0,
      supplied: 0,
      forwarded: 0,
      incoming: [],
      outgoing: [],
    }
    nodes.set(objectId, node)
    return node
  }

  for (const role of roles) {
    ensure(role.objectId)
  }
  for (const flow of flows) {
    const limit = limits.get(flow.id)
    if (!limit) {
      continue
    }
    const source = ensure(flow.sourceObjectId)
    const target = ensure(flow.targetObjectId)
    const edge: EdgeState = {
      flowId: flow.id,
      sourceId: source.id,
      targetId: target.id,
      capacity: limit.capacity,
      loss: limit.loss,
      inService: limit.inService,
      residual: limit.inService ? limit.capacity : 0,
      sent: 0,
      arrived: 0,
      demandShare: 0,
      blockedDemand: 0,
      passWant: 0,
      passAccepted: 0,
      passRequestedSend: 0,
      passSent: 0,
    }
    source.outgoing.push(edge)
    target.incoming.push(edge)
  }
  return nodes
}

function topologicalOrder(nodes: Map<string, NodeState>): string[] | 'cycle' {
  const state = new Map<string, 0 | 1 | 2>()
  const sinksFirst: string[] = []

  const visit = (id: string): boolean => {
    const mark = state.get(id) ?? 0
    if (mark === 1) {
      return false
    }
    if (mark === 2) {
      return true
    }
    state.set(id, 1)
    const node = nodes.get(id)
    if (node) {
      for (const edge of node.outgoing) {
        if (!visit(edge.targetId)) {
          return false
        }
      }
    }
    state.set(id, 2)
    sinksFirst.push(id)
    return true
  }

  for (const id of nodes.keys()) {
    if (!visit(id)) {
      return 'cycle'
    }
  }
  return sinksFirst
}

function runPasses(nodes: Map<string, NodeState>, sinksFirst: readonly string[]): void {
  const sourcesFirst = [...sinksFirst].reverse()
  const priorities = [...nodes.values()]
    .filter((node) => node.consumes > EPS)
    .map((node) => node.priority)
    .filter((priority, index, all) => all.indexOf(priority) === index)
    .sort((left, right) => left - right)

  for (const priority of priorities) {
    for (const node of nodes.values()) {
      for (const edge of node.outgoing) {
        edge.passWant = 0
        edge.passAccepted = 0
        edge.passRequestedSend = 0
        edge.passSent = 0
      }
    }
    for (const id of sinksFirst) {
      const node = nodes.get(id)
      if (node) {
        requestFromParents(node, priority)
      }
    }
    for (const id of sourcesFirst) {
      const node = nodes.get(id)
      if (node) {
        sendToChildren(node, priority)
      }
    }
  }
}

function requestFromParents(node: NodeState, priority: number): void {
  const ownRequest = node.priority === priority ? Math.max(0, node.consumes - node.produces) : 0
  let want = ownRequest
  let passable = ownRequest
  for (const edge of node.outgoing) {
    want += edge.passWant
    passable += edge.passAccepted
  }
  if (want <= EPS) {
    return
  }

  const inService = node.incoming.filter((edge) => edge.inService)
  if (node.incoming.length > 0 && inService.length === 0) {
    for (const edge of node.incoming) {
      edge.blockedDemand += want
    }
    return
  }

  const usable = inService.filter((edge) => edge.loss < 1 && edge.residual > EPS)
  if (inService.length > 0 && usable.length === 0) {
    for (const edge of inService) {
      edge.passWant = want / inService.length
      edge.demandShare += edge.passWant
    }
    return
  }

  const residualSum = usable.reduce((sum, edge) => sum + edge.residual, 0)
  for (const edge of usable) {
    const share = residualSum <= EPS ? 0 : edge.residual / residualSum
    edge.passWant = want * share
    edge.demandShare += edge.passWant
    const receiptCap = edge.residual * (1 - edge.loss)
    edge.passAccepted = Math.min(passable * share, receiptCap)
    edge.passRequestedSend = edge.loss === 0 ? edge.passAccepted : edge.passAccepted / (1 - edge.loss)
  }
}

function sendToChildren(node: NodeState, priority: number): void {
  const arrived = node.incoming.reduce((sum, edge) => sum + edge.passSent * (1 - edge.loss), 0)
  const pool = node.remainingProduce + arrived
  const ownNeed = node.priority === priority ? node.consumes : 0
  const kept = Math.min(ownNeed, Math.max(0, pool))
  const leftover = Math.max(0, pool - kept)
  const unused = allocate(node.outgoing, leftover)
  const sent = leftover - unused
  const usedFromProduction = Math.min(node.remainingProduce, kept + sent)
  node.remainingProduce = Math.max(0, node.remainingProduce - usedFromProduction)
  node.arrived += arrived
  node.supplied += kept
  node.forwarded += sent

  for (const edge of node.outgoing) {
    const delivered = edge.passSent * (1 - edge.loss)
    edge.sent += edge.passSent
    edge.arrived += delivered
    edge.residual = Math.max(0, edge.residual - edge.passSent)
  }
}

function allocate(edges: readonly EdgeState[], available: number): number {
  const pending = edges
    .filter((edge) => edge.passRequestedSend > EPS && edge.passWant > EPS)
    .map((edge) => ({ edge, weight: edge.passWant, room: edge.passRequestedSend }))
  let remaining = available
  let open = pending

  while (open.length > 0 && remaining > EPS) {
    const weightSum = open.reduce((sum, item) => sum + item.weight, 0)
    if (weightSum <= EPS) {
      break
    }
    const base = remaining
    const capped = open.filter((item) => (base * item.weight) / weightSum > item.room + EPS)
    if (capped.length === 0) {
      for (const item of open) {
        item.edge.passSent += (base * item.weight) / weightSum
      }
      return 0
    }
    let consumed = 0
    for (const item of capped) {
      item.edge.passSent += item.room
      remaining -= item.room
      consumed += item.room
      item.room = 0
    }
    if (consumed <= EPS) {
      break
    }
    open = open.filter((item) => item.room > EPS)
  }
  return remaining
}

function assemble(resourceTypeId: string, nodes: Map<string, NodeState>, flows: readonly ResourceFlow[]): EnergyBalance {
  const objects = [...nodes.values()]
    .sort((left, right) => left.id.localeCompare(right.id))
    .map((node) => toObjectBalance(node, nodes))
  const links = flows.map((flow) => {
    const edge = findEdge(nodes, flow.id)
    return toLinkBalance(flow, edge)
  })

  const generated = objects.reduce((sum, item) => sum + item.produced, 0)
  const requested = objects.reduce((sum, item) => sum + item.requested, 0)
  const delivered = objects.reduce((sum, item) => sum + item.supplied, 0)
  const shortfall = Math.max(0, requested - delivered)
  const limitedBy = cityLimit(generated, requested, shortfall, objects)
  const notes = explain(generated, requested, delivered, limitedBy, objects, links)

  return {
    ok: true,
    resourceTypeId,
    interval: 'day',
    unit: 'kWh',
    generated: round(generated),
    requested: round(requested),
    delivered: round(delivered),
    shortfall: round(shortfall),
    limitedBy,
    objects: objects.map(roundObject),
    links: links.map(roundLink),
    notes,
  }
}

function toObjectBalance(node: NodeState, nodes: Map<string, NodeState>): ObjectBalance {
  const shortfall = Math.max(0, node.consumes - node.supplied)
  const cause = shortfall <= EPS ? { constraint: 'none' as const } : causeOfShortfall(node, nodes, new Set(), true)
  return {
    objectId: node.id,
    produced: node.produces,
    requested: node.consumes,
    arrived: node.arrived,
    supplied: node.supplied,
    shortfall,
    forwarded: node.forwarded,
    constraint: cause.constraint,
    constraintLineId: cause.lineId,
  }
}

function causeOfShortfall(
  node: NodeState,
  nodes: Map<string, NodeState>,
  seen: Set<string>,
  isConsumer: boolean,
): { constraint: ObjectConstraint; lineId?: string } {
  if (seen.has(node.id)) {
    return { constraint: 'generation' }
  }
  seen.add(node.id)
  if (node.incoming.length === 0) {
    return { constraint: isConsumer ? 'disconnected' : 'generation' }
  }
  if (node.incoming.every((edge) => !edge.inService)) {
    const blocked = node.incoming.find((edge) => edge.blockedDemand > EPS)
    return { constraint: 'disconnected', lineId: blocked?.flowId }
  }

  const live = node.incoming.filter((edge) => edge.inService && (edge.demandShare > EPS || edge.sent > EPS || edge.arrived > EPS))
  for (const edge of live) {
    if (edge.sent >= edge.capacity - EPS && edge.demandShare > edge.arrived + EPS) {
      return { constraint: 'line-capacity', lineId: edge.flowId }
    }
  }
  for (const edge of live) {
    if (edge.loss > EPS && edge.demandShare > edge.arrived + EPS) {
      return { constraint: 'line-loss', lineId: edge.flowId }
    }
  }
  for (const edge of live) {
    const parent = nodes.get(edge.sourceId)
    if (!parent) {
      continue
    }
    const upstream = causeOfShortfall(parent, nodes, seen, false)
    if (upstream.constraint !== 'generation') {
      return upstream
    }
  }
  return { constraint: 'generation' }
}

function findEdge(nodes: Map<string, NodeState>, flowId: string): EdgeState | undefined {
  for (const node of nodes.values()) {
    const edge = node.outgoing.find((item) => item.flowId === flowId)
    if (edge) {
      return edge
    }
  }
  return undefined
}

function toLinkBalance(flow: ResourceFlow, edge: EdgeState | undefined): LinkBalance {
  return {
    flowId: flow.id,
    sourceObjectId: flow.sourceObjectId,
    targetObjectId: flow.targetObjectId,
    sent: edge?.sent ?? 0,
    arrived: edge?.arrived ?? 0,
    capacity: edge?.capacity ?? 0,
    loss: edge?.loss ?? 0,
    inService: edge?.inService ?? false,
    limited: edgeIsLimiting(edge),
  }
}

function edgeIsLimiting(edge: EdgeState | undefined): boolean {
  if (!edge) {
    return false
  }
  if (edge.blockedDemand > EPS) {
    return true
  }
  const shortDelivery = edge.demandShare > edge.arrived + EPS
  if (!edge.inService || !shortDelivery) {
    return false
  }
  return edge.sent >= edge.capacity - EPS || edge.loss > EPS
}

function cityLimit(generated: number, requested: number, shortfall: number, objects: readonly ObjectBalance[]): BalanceLimitKind {
  if (shortfall <= EPS) {
    return 'none'
  }
  const short = objects.filter((item) => item.shortfall > EPS)
  if (generated + EPS < requested) {
    return 'generation'
  }
  if (short.every((item) => item.constraint === 'disconnected')) {
    return 'disconnected'
  }
  if (short.some((item) => item.constraint === 'line-capacity' || item.constraint === 'line-loss')) {
    return 'link'
  }
  if (short.some((item) => item.constraint === 'disconnected')) {
    return 'disconnected'
  }
  return 'generation'
}

function explain(
  generated: number,
  requested: number,
  delivered: number,
  limitedBy: BalanceLimitKind,
  objects: readonly ObjectBalance[],
  links: readonly LinkBalance[],
): string[] {
  const notes = [`Generated ${fmt(generated)} kWh. Requested ${fmt(requested)} kWh. Delivered ${fmt(delivered)} kWh.`]
  if (limitedBy === 'none') {
    notes.push('Every request was met.')
  } else if (limitedBy === 'generation') {
    notes.push('Generation is short. Raising production would reduce the deficit if the lines can carry it.')
  } else if (limitedBy === 'disconnected') {
    notes.push('A line is out of service. Switching it back on would restore that path.')
  } else {
    notes.push('Generation covers the request, but a line is limiting delivery.')
  }

  for (const item of objects) {
    if (item.shortfall <= EPS) {
      continue
    }
    const line = links.find((link) => link.flowId === item.constraintLineId)
    if (item.constraint === 'disconnected') {
      const name = line ? line.flowId : 'no line'
      notes.push(`${item.objectId} is short by ${fmt(item.shortfall)} kWh because ${name} is out of service. Switching that line back on would restore the path.`)
    } else if (item.constraint === 'line-capacity' && line) {
      notes.push(`${item.objectId} is short by ${fmt(item.shortfall)} kWh. The line ${line.flowId} can carry only ${fmt(line.capacity)} kWh per day. Generation covers the request. Raising that capacity would close this gap.`)
    } else if (item.constraint === 'line-loss' && line) {
      notes.push(`${item.objectId} is short by ${fmt(item.shortfall)} kWh because loss on ${line.flowId} reduced what arrived.`)
    } else {
      notes.push(`${item.objectId} is short by ${fmt(item.shortfall)} kWh because generation is short.`)
    }
  }

  for (const link of links) {
    if (link.loss > EPS) {
      notes.push(`${link.flowId} sent ${fmt(link.sent)} kWh and ${fmt(link.arrived)} kWh arrived after a loss of ${fmt(link.loss)}.`)
    }
  }
  return notes
}

function round(value: number): number {
  return Math.round(value * 1e9) / 1e9
}

function fmt(value: number): string {
  return String(round(value))
}

function roundObject(item: ObjectBalance): ObjectBalance {
  return {
    ...item,
    produced: round(item.produced),
    requested: round(item.requested),
    arrived: round(item.arrived),
    supplied: round(item.supplied),
    shortfall: round(item.shortfall),
    forwarded: round(item.forwarded),
  }
}

function roundLink(item: LinkBalance): LinkBalance {
  return {
    ...item,
    sent: round(item.sent),
    arrived: round(item.arrived),
    capacity: round(item.capacity),
    loss: round(item.loss),
  }
}

export type CityElectricityReport =
  | { status: 'not-set'; message: 'Power supply parameters not set' }
  | { status: 'unavailable'; message: string }
  | { status: 'ready'; balance: EnergyBalance }

/** Reads saved rates. It does not invent zeros, and it does not store the result. */
export function reportCityElectricity(input: BalanceInput): CityElectricityReport {
  const roles = input.roles.filter((role) => role.resourceTypeId === input.resourceTypeId)
  if (roles.length === 0) {
    return { status: 'not-set', message: 'Power supply parameters not set' }
  }
  const result = calculateEnergyBalance({ ...input, roles })
  if (!result.ok) {
    if (result.reason === 'no-rates') {
      return { status: 'not-set', message: 'Power supply parameters not set' }
    }
    return { status: 'unavailable', message: result.message }
  }
  return { status: 'ready', balance: result }
}
