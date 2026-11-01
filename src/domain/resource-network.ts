import type { CatalogCard, CatalogLink, MeasuredQuantity, ResourceCatalog } from './resource-catalog'
import { parseResourceCatalog } from './resource-catalog'

export type NetworkKindFilter = 'all' | CatalogCard['kind']

export type NetworkConnectionFilter = 'all' | 'connected' | 'unconnected'

export type NetworkQuery = {
  text: string
  kind: NetworkKindFilter
  focusId: string
  connection: NetworkConnectionFilter
}

export type NetworkNotice = {
  level: 'error' | 'warning'
  code: 'missing-card' | 'wrong-kind' | 'duplicate' | 'source-unlinked' | 'consumer-unlinked' | 'resource-no-source' | 'resource-no-consumer'
  message: string
  linkId?: string
  cardId?: string
}

export type NetworkView = {
  nodes: CatalogCard[]
  links: CatalogLink[]
  notices: NetworkNotice[]
}

const graphNodeLimit = 18

export function inspectResourceNetwork(catalog: ResourceCatalog): NetworkNotice[] {
  const notices: NetworkNotice[] = []
  const byId = new Map(catalog.cards.map((card) => [card.id, card]))
  const seen = new Set<string>()
  const produced = new Set<string>()
  const used = new Set<string>()
  const sourcesWithOutput = new Set<string>()
  const consumersWithUse = new Set<string>()

  for (const link of catalog.links) {
    const ends = linkEnds(link)
    const key = `${link.role}:${ends.fromId}:${ends.toId}`
    if (seen.has(key)) {
      notices.push({ level: 'error', code: 'duplicate', message: 'A connection with the same cards and role is stored more than once.', linkId: link.id })
    }
    seen.add(key)
    const from = byId.get(ends.fromId)
    const to = byId.get(ends.toId)
    if (!from || !to) {
      notices.push({ level: 'error', code: 'missing-card', message: 'A connection cites a card that is not in the catalog.', linkId: link.id })
      continue
    }
    const valid = link.role === 'produces' ? from.kind === 'source' && to.kind === 'resource' : from.kind === 'consumer' && to.kind === 'resource'
    if (!valid) {
      notices.push({ level: 'error', code: 'wrong-kind', message: 'A connection joins card types that cannot be linked that way.', linkId: link.id })
      continue
    }
    if (link.role === 'produces') {
      produced.add(to.id)
      sourcesWithOutput.add(from.id)
    } else {
      used.add(to.id)
      consumersWithUse.add(from.id)
    }
  }

  for (const card of catalog.cards) {
    if (card.kind === 'source' && !sourcesWithOutput.has(card.id)) {
      notices.push({ level: 'warning', code: 'source-unlinked', message: `${label(card)} has no produced resource.`, cardId: card.id })
    }
    if (card.kind === 'consumer' && !consumersWithUse.has(card.id)) {
      notices.push({ level: 'warning', code: 'consumer-unlinked', message: `${label(card)} has no resource it uses.`, cardId: card.id })
    }
    if (card.kind === 'resource' && !produced.has(card.id)) {
      notices.push({ level: 'warning', code: 'resource-no-source', message: `${label(card)} has no source.`, cardId: card.id })
    }
    if (card.kind === 'resource' && !used.has(card.id)) {
      notices.push({ level: 'warning', code: 'resource-no-consumer', message: `${label(card)} has no consumer.`, cardId: card.id })
    }
  }
  return notices
}

export function resourceNetwork(catalog: ResourceCatalog, query: NetworkQuery): NetworkView {
  const notices = inspectResourceNetwork(catalog)
  const focus = query.focusId ? catalog.cards.find((card) => card.id === query.focusId) : undefined
  const neighborhood = focus ? neighborhoodIds(catalog, focus) : undefined
  const needle = query.text.trim().toLowerCase()
  const nodes = catalog.cards.filter((card) => {
    if (neighborhood && !neighborhood.has(card.id)) {
      return false
    }
    if (query.kind !== 'all' && card.kind !== query.kind) {
      return false
    }
    if (needle && !card.name.toLowerCase().includes(needle)) {
      return false
    }
    const connected = cardIsConnected(catalog, card.id)
    if (query.connection === 'connected' && !connected) {
      return false
    }
    if (query.connection === 'unconnected' && connected) {
      return false
    }
    return true
  })
  const visible = new Set(nodes.map((card) => card.id))
  const links = catalog.links.filter((link) => {
    const ends = linkEnds(link)
    return visible.has(ends.fromId) && visible.has(ends.toId)
  })
  return { nodes, links, notices }
}

export function graphNeedsFocus(nodeCount: number, focusId: string): boolean {
  return focusId === '' && nodeCount > graphNodeLimit
}

export function addCatalogLink(
  catalog: ResourceCatalog,
  input: { role: 'produces'; sourceId: string; resourceId: string } | { role: 'uses'; consumerId: string; resourceId: string },
): { ok: true; catalog: ResourceCatalog } | { ok: false; message: string } {
  const fromId = input.role === 'produces' ? input.sourceId : input.consumerId
  const resource = catalog.cards.find((card) => card.id === input.resourceId)
  const from = catalog.cards.find((card) => card.id === fromId)
  if (!resource || resource.kind !== 'resource' || !from) {
    return { ok: false, message: 'Choose cards that exist in the catalog.' }
  }
  if (input.role === 'produces' && from.kind !== 'source') {
    return { ok: false, message: 'A produces connection starts at a source card.' }
  }
  if (input.role === 'uses' && from.kind !== 'consumer') {
    return { ok: false, message: 'A uses connection starts at a consumer card.' }
  }
  const duplicate = catalog.links.some((link) => {
    const ends = linkEnds(link)
    return link.role === input.role && ends.fromId === fromId && ends.toId === input.resourceId
  })
  if (duplicate) {
    return { ok: false, message: 'This connection already exists.' }
  }
  const link: CatalogLink = input.role === 'produces'
    ? { id: `link:${fromId}:${input.resourceId}:produces`, role: 'produces', sourceId: fromId, resourceId: input.resourceId }
    : { id: `link:${fromId}:${input.resourceId}:uses`, role: 'uses', consumerId: fromId, resourceId: input.resourceId }
  return parseResourceCatalog({ ...catalog, links: [...catalog.links, link] })
}

export function removeCatalogLink(catalog: ResourceCatalog, linkId: string): { ok: true; catalog: ResourceCatalog } | { ok: false; message: string } {
  if (!catalog.links.some((link) => link.id === linkId)) {
    return { ok: false, message: 'That connection is not in the catalog.' }
  }
  return parseResourceCatalog({ ...catalog, links: catalog.links.filter((link) => link.id !== linkId) })
}

export function linkEnds(link: CatalogLink): { fromId: string; toId: string } {
  if (link.role === 'produces') {
    return { fromId: link.sourceId, toId: link.resourceId }
  }
  return { fromId: link.consumerId, toId: link.resourceId }
}

export function measurementLines(card: CatalogCard): string[] {
  const lines: string[] = []
  const push = (prefix: string, quantity: MeasuredQuantity | undefined) => {
    if (!quantity) {
      return
    }
    const value = quantity.value === null ? 'no value' : String(quantity.value)
    lines.push(`${prefix}: ${quantity.name || 'Measurement'} · ${value} ${quantity.unit}`.trim())
  }
  if (card.kind === 'source') {
    push('Production volume', card.sourceProfile?.productionVolume)
    push('Output per time', card.sourceProfile?.outputPerTime)
    push('Maximum capacity', card.sourceProfile?.maxCapacity)
  }
  if (card.kind === 'consumer') {
    push('Quantity used', card.consumerProfile?.quantityUsed)
    push('Peak load', card.consumerProfile?.peakLoad)
    push('Average load', card.consumerProfile?.averageLoad)
  }
  if (card.kind === 'resource') {
    push('Physical abundance', card.accounts?.physicalAbundance)
    push('Total reserves', card.accounts?.totalReserves)
    push('Recoverable reserves', card.accounts?.recoverableReserves)
    push('Supply deficit', card.accounts?.supplyDeficit)
  }
  return lines
}

function neighborhoodIds(catalog: ResourceCatalog, focus: CatalogCard): Set<string> {
  const ids = new Set<string>([focus.id])
  for (const link of catalog.links) {
    const ends = linkEnds(link)
    if (focus.kind === 'resource' && ends.toId === focus.id) {
      ids.add(ends.fromId)
    }
    if (focus.kind === 'source' && link.role === 'produces' && ends.fromId === focus.id) {
      ids.add(ends.toId)
    }
    if (focus.kind === 'consumer' && link.role === 'uses' && ends.fromId === focus.id) {
      ids.add(ends.toId)
    }
  }
  return ids
}

function cardIsConnected(catalog: ResourceCatalog, cardId: string): boolean {
  return catalog.links.some((link) => {
    const ends = linkEnds(link)
    return ends.fromId === cardId || ends.toId === cardId
  })
}

function label(card: CatalogCard): string {
  return card.name.trim() || 'Untitled card'
}
