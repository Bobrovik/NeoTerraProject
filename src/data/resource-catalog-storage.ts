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
    return { ok: false, message: 'Не удалось прочитать каталог в этом браузере.' }
  }
  if (raw === null) {
    return { ok: true, catalog: emptyResourceCatalog() }
  }
  let parsed: unknown
  try {
    parsed = JSON.parse(raw)
  } catch {
    return { ok: false, message: 'Файл каталога не является корректным JSON.' }
  }
  return parseResourceCatalog(parsed)
}

export function writeResourceCatalog(store: CatalogStore, value: unknown): { ok: true; catalog: ResourceCatalog } | { ok: false; message: string } {
  const parsed = parseResourceCatalog(value)
  if (!parsed.ok) {
    return parsed
  }
  try {
    store.setItem(resourceCatalogStorageKey, JSON.stringify(parsed.catalog))
  } catch {
    return { ok: false, message: 'Не удалось сохранить каталог в этом браузере.' }
  }
  return parsed
}
