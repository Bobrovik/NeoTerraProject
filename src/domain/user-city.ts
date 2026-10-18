import { validateCityDraft, type CityDraft } from './layout'
import type { CatalogSnapshot, City } from './types'

export type UserCityInput = {
  name: string
  cityId: string
  latitude: number
  longitude: number
}

export type StoredLayouts = {
  drafts: CityDraft[]
  cities: City[]
}

const cityIdPattern = /^city:[a-z0-9]+(?:-[a-z0-9]+)*$/

export function normalizeCityId(raw: string): string | undefined {
  const trimmed = raw.trim().toLowerCase()
  if (!trimmed) {
    return undefined
  }
  const withPrefix = trimmed.startsWith('city:') ? trimmed : `city:${trimmed}`
  return cityIdPattern.test(withPrefix) ? withPrefix : undefined
}

export function emptyCityDraft(cityId: string): CityDraft {
  return { cityId, objects: [], systems: [], flows: [], roads: [] }
}

export function createUserCity(
  input: UserCityInput,
  existingCityIds: ReadonlySet<string>,
): { ok: true; city: City; draft: CityDraft } | { ok: false; message: string } {
  const id = normalizeCityId(input.cityId)
  if (!id) {
    return { ok: false, message: 'Use a city id such as city:harbor. Letters, numbers, and hyphens only.' }
  }
  if (existingCityIds.has(id)) {
    return { ok: false, message: `City ${id} already exists.` }
  }
  const name = input.name.trim()
  if (!name) {
    return { ok: false, message: 'A city needs a name.' }
  }
  if (!Number.isFinite(input.latitude) || input.latitude < -90 || input.latitude > 90) {
    return { ok: false, message: 'Latitude must be between -90 and 90.' }
  }
  if (!Number.isFinite(input.longitude) || input.longitude < -180 || input.longitude > 180) {
    return { ok: false, message: 'Longitude must be between -180 and 180.' }
  }
  const city: City = {
    id,
    name,
    summary: 'A city created in this browser.',
    description: 'This city starts empty. Its objects, roads, and links are stored apart from the demo cities. The marker uses the latitude and longitude entered here. The editor grid is still a local meter plane.',
    latitude: input.latitude,
    longitude: input.longitude,
    developmentStatus: 'concept',
    reliability: {
      status: 'demo',
      source: 'Planet page',
      note: 'Created in the editor. The coordinates are the chosen WGS84 point, not a surveyed site.',
    },
  }
  return { ok: true, city, draft: emptyCityDraft(id) }
}

export function collectStoredLayoutIssues(stored: StoredLayouts, snapshot: CatalogSnapshot): string[] {
  const issues: string[] = []
  const demoIds = new Set(snapshot.cities.map((city) => city.id))
  const userIds = new Set<string>()

  for (const city of stored.cities) {
    if (!cityIdPattern.test(city.id)) {
      issues.push(`City id ${city.id} is not a valid city id.`)
    }
    if (!city.name.trim()) {
      issues.push(`City ${city.id} needs a name.`)
    }
    if (!Number.isFinite(city.latitude) || city.latitude < -90 || city.latitude > 90) {
      issues.push(`City ${city.id} has a latitude outside -90 to 90.`)
    }
    if (!Number.isFinite(city.longitude) || city.longitude < -180 || city.longitude > 180) {
      issues.push(`City ${city.id} has a longitude outside -180 to 180.`)
    }
    if (demoIds.has(city.id) || userIds.has(city.id)) {
      issues.push(`City ${city.id} already exists.`)
    }
    userIds.add(city.id)
  }

  const known = new Set([...demoIds, ...userIds])
  const draftIds = new Set<string>()
  for (const draft of stored.drafts) {
    if (draftIds.has(draft.cityId)) {
      issues.push(`More than one draft is stored for ${draft.cityId}.`)
    }
    draftIds.add(draft.cityId)
    if (!known.has(draft.cityId)) {
      issues.push(`The layout refers to an unknown city ${draft.cityId}.`)
      continue
    }
    issues.push(...validateCityDraft(draft, snapshot))
  }

  issues.push(...conflictingRecordIds(stored, snapshot))
  return issues
}

function conflictingRecordIds(stored: StoredLayouts, snapshot: CatalogSnapshot): string[] {
  const issues: string[] = []
  const replaced = new Set(stored.drafts.map((draft) => draft.cityId))
  const objectIds = new Map<string, string>()
  const systemIds = new Map<string, string>()
  const flowIds = new Set<string>()
  const roadIds = new Map<string, string>()

  for (const object of snapshot.objects) {
    if (!replaced.has(object.cityId)) {
      objectIds.set(object.id, object.cityId)
    }
  }
  for (const system of snapshot.systems) {
    if (!replaced.has(system.cityId)) {
      systemIds.set(system.id, system.cityId)
    }
  }
  for (const flow of snapshot.flows) {
    const system = snapshot.systems.find((item) => item.id === flow.systemId)
    if (!system || !replaced.has(system.cityId)) {
      flowIds.add(flow.id)
    }
  }
  for (const road of snapshot.roads) {
    if (!replaced.has(road.cityId)) {
      roadIds.set(road.id, road.cityId)
    }
  }

  for (const draft of stored.drafts) {
    for (const object of draft.objects) {
      const owner = objectIds.get(object.id)
      if (owner && owner !== draft.cityId) {
        issues.push(`Object ${object.id} is already used by ${owner}.`)
      }
      objectIds.set(object.id, draft.cityId)
    }
    for (const system of draft.systems) {
      const owner = systemIds.get(system.id)
      if (owner && owner !== draft.cityId) {
        issues.push(`System ${system.id} is already used by ${owner}.`)
      }
      systemIds.set(system.id, draft.cityId)
    }
    for (const flow of draft.flows) {
      if (flowIds.has(flow.id)) {
        issues.push(`Link ${flow.id} duplicates an existing link id.`)
      }
      flowIds.add(flow.id)
    }
    for (const road of draft.roads) {
      const owner = roadIds.get(road.id)
      if (owner && owner !== draft.cityId) {
        issues.push(`Road ${road.id} is already used by ${owner}.`)
      }
      roadIds.set(road.id, draft.cityId)
    }
  }

  return issues
}

export function applyStoredLayouts(base: CatalogSnapshot, stored: StoredLayouts): CatalogSnapshot {
  const withCities: CatalogSnapshot = { ...base, cities: [...base.cities, ...stored.cities] }
  if (stored.drafts.length === 0) {
    return withCities
  }
  const cityIds = new Set(stored.drafts.map((draft) => draft.cityId))
  const replacedSystems = new Set(withCities.systems.filter((system) => cityIds.has(system.cityId)).map((system) => system.id))
  return {
    ...withCities,
    objects: [...withCities.objects.filter((object) => !cityIds.has(object.cityId)), ...stored.drafts.flatMap((draft) => draft.objects)],
    systems: [...withCities.systems.filter((system) => !cityIds.has(system.cityId)), ...stored.drafts.flatMap((draft) => draft.systems)],
    flows: [...withCities.flows.filter((flow) => !replacedSystems.has(flow.systemId)), ...stored.drafts.flatMap((draft) => draft.flows)],
    roads: [...withCities.roads.filter((road) => !cityIds.has(road.cityId)), ...stored.drafts.flatMap((draft) => draft.roads)],
  }
}
