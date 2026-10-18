import type { CatalogSnapshot } from './types'

export type SearchHit = {
  kind: 'city' | 'object' | 'system'
  id: string
  cityId?: string
  title: string
  detail: string
}

export function searchCatalog(snapshot: CatalogSnapshot, rawQuery: string): SearchHit[] {
  const query = rawQuery.trim().toLocaleLowerCase()
  if (query.length < 2) {
    return []
  }

  const hits: SearchHit[] = []

  for (const city of snapshot.cities) {
    if (contains(city.name, query) || contains(city.summary, query) || contains(city.description, query)) {
      hits.push({ kind: 'city', id: city.id, title: city.name, detail: city.summary })
    }
  }

  for (const object of snapshot.objects) {
    const city = snapshot.cities.find((item) => item.id === object.cityId)
    if (contains(object.name, query) || contains(object.description, query) || contains(city?.name ?? '', query)) {
      hits.push({
        kind: 'object',
        id: object.id,
        cityId: object.cityId,
        title: object.name,
        detail: city ? city.name : object.cityId,
      })
    }
  }

  for (const system of snapshot.systems) {
    if (contains(system.name, query) || contains(system.description, query) || contains(system.kind, query)) {
      const city = snapshot.cities.find((item) => item.id === system.cityId)
      hits.push({
        kind: 'system',
        id: system.id,
        cityId: system.cityId,
        title: system.name,
        detail: city ? `${city.name} · ${system.kind}` : system.kind,
      })
    }
  }

  return hits
}

function contains(value: string, query: string): boolean {
  return value.toLocaleLowerCase().includes(query)
}
