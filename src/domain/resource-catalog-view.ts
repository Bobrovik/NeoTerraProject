import type { CardStatus, CatalogCard, CatalogCardKind, Priority, Scarcity } from './resource-catalog'

export type CatalogKindFilter = 'all' | CatalogCardKind

export type CatalogSort = 'name' | 'created' | 'updated' | 'priority'

export type CatalogListQuery = {
  kind: CatalogKindFilter
  text: string
  category: string
  scarcity: Scarcity | ''
  priority: Priority | ''
  status: CardStatus | ''
  sort: CatalogSort
}

const priorityRank: Record<Priority, number> = { P1: 0, P2: 1, P3: 2, P4: 3 }

export function countCardsByKind(cards: readonly CatalogCard[]): Record<CatalogCardKind, number> {
  const counts: Record<CatalogCardKind, number> = { resource: 0, source: 0, consumer: 0 }
  for (const card of cards) {
    counts[card.kind] += 1
  }
  return counts
}

export function catalogCategories(cards: readonly CatalogCard[]): string[] {
  const names = new Set<string>()
  for (const card of cards) {
    if (card.category.trim()) {
      names.add(card.category)
    }
  }
  return [...names].sort((left, right) => left.localeCompare(right, undefined, { sensitivity: 'base' }))
}

export function listCatalogCards(cards: readonly CatalogCard[], query: CatalogListQuery): CatalogCard[] {
  const needle = query.text.trim().toLowerCase()
  const matched = cards.filter((card) => {
    if (query.kind !== 'all' && card.kind !== query.kind) {
      return false
    }
    if (query.category && card.category !== query.category) {
      return false
    }
    if (query.scarcity && card.scarcity !== query.scarcity) {
      return false
    }
    if (query.priority && card.priority !== query.priority) {
      return false
    }
    if (query.status && card.status !== query.status) {
      return false
    }
    if (!needle) {
      return true
    }
    const haystack = [card.name, card.summary, card.category, card.subcategory ?? ''].join('\n').toLowerCase()
    return haystack.includes(needle)
  })
  return [...matched].sort((left, right) => {
    const primary = compareCards(left, right, query.sort)
    if (primary !== 0) {
      return primary
    }
    const name = left.name.localeCompare(right.name, undefined, { sensitivity: 'base' })
    if (name !== 0) {
      return name
    }
    return left.id.localeCompare(right.id)
  })
}

function compareCards(left: CatalogCard, right: CatalogCard, sort: CatalogSort): number {
  if (sort === 'name') {
    return left.name.localeCompare(right.name, undefined, { sensitivity: 'base' })
  }
  if (sort === 'priority') {
    return priorityRank[left.priority] - priorityRank[right.priority]
  }
  const field = sort === 'created' ? 'createdAt' : 'updatedAt'
  return right[field].localeCompare(left[field])
}
