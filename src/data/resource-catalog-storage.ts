import { catalogFailure, type CatalogMessageCode } from '../domain/catalog-message'
import { emptyResourceCatalog, parseResourceCatalog, type CatalogRead, type ResourceCatalog } from '../domain/resource-catalog'

export const resourceCatalogStorageKey = 'future-city.resource-catalog.v1'

export type CatalogStore = {
  getItem(key: string): string | null
  setItem(key: string, value: string): void
}

export function readResourceCatalog(store: CatalogStore): CatalogRead {
  let raw: string | null
  try {
    raw = store.getItem(resourceCatalogStorageKey)
  } catch {
    return catalogFailure('catalog.storage.read')
  }
  if (raw === null) {
    return { ok: true, catalog: emptyResourceCatalog() }
  }
  let parsed: unknown
  try {
    parsed = JSON.parse(raw)
  } catch {
    return catalogFailure('catalog.storage.json')
  }
  return parseResourceCatalog(parsed)
}

export function writeResourceCatalog(store: CatalogStore, value: unknown): { ok: true; catalog: ResourceCatalog } | { ok: false; message: CatalogMessageCode } {
  const parsed = parseResourceCatalog(value)
  if (!parsed.ok) {
    return parsed
  }
  try {
    store.setItem(resourceCatalogStorageKey, JSON.stringify(parsed.catalog))
  } catch {
    return catalogFailure('catalog.storage.write')
  }
  return parsed
}
