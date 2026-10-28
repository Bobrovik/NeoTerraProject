export type PlanetLayerId = 'flags' | 'conflicts' | 'forests' | 'freshwater' | 'minerals' | 'population'

export type PlanetLayers = Record<PlanetLayerId, boolean>

export const defaultPlanetLayers: PlanetLayers = {
  flags: false,
  conflicts: false,
  forests: false,
  freshwater: false,
  minerals: false,
  population: false,
}

export function togglePlanetLayer(layers: PlanetLayers, id: PlanetLayerId): PlanetLayers {
  return { ...layers, [id]: !layers[id] }
}

export function shouldLoadPopulation(layers: PlanetLayers, countryIso: string | null): boolean {
  return layers.population || countryIso !== null
}

export type FeedStatus = 'idle' | 'loading' | 'updated' | 'cache' | 'error' | 'unavailable'

export type CacheEnvelope<T> = {
  retrievedAt: string
  sourceUpdated?: string
  payload: T
}

export type FeedSnapshot<T> = {
  status: 'updated' | 'cache' | 'error'
  data?: T
  retrievedAt?: string
  sourceUpdated?: string
  error?: string
  current: boolean
}

export function cacheDecision(retrievedAt: string, now: Date, maxAgeMs: number): 'fresh' | 'stale' {
  const retrieved = Date.parse(retrievedAt)
  if (!Number.isFinite(retrieved) || now.getTime() < retrieved) {
    return 'stale'
  }
  return now.getTime() - retrieved <= maxAgeMs ? 'fresh' : 'stale'
}

export const worldBankMaxAgeMs = 30 * 24 * 60 * 60 * 1000
export const hydrographyMaxAgeMs = 180 * 24 * 60 * 60 * 1000
export const conflictMaxAgeMs = 30 * 24 * 60 * 60 * 1000
export const mineralMaxAgeMs = 180 * 24 * 60 * 60 * 1000

export async function resolveFeed<T>(input: {
  cached?: CacheEnvelope<T>
  now: Date
  maxAgeMs: number
  load: () => Promise<{ payload: T; sourceUpdated?: string }>
}): Promise<FeedSnapshot<T>> {
  if (input.cached && cacheDecision(input.cached.retrievedAt, input.now, input.maxAgeMs) === 'fresh') {
    return { status: 'cache', data: input.cached.payload, retrievedAt: input.cached.retrievedAt, current: true }
  }
  try {
    const fresh = await input.load()
    return {
      status: 'updated',
      data: fresh.payload,
      retrievedAt: input.now.toISOString(),
      ...(fresh.sourceUpdated ? { sourceUpdated: fresh.sourceUpdated } : {}),
      current: true,
    }
  } catch (error) {
    const message = error instanceof Error ? error.message : 'The update failed.'
    if (input.cached) {
      return { status: 'error', data: input.cached.payload, retrievedAt: input.cached.retrievedAt, error: message, current: false }
    }
    return { status: 'error', error: message, current: false }
  }
}

export type PopulationKind = 'estimate' | 'projection'

export function populationKind(observationYear: number, today: Date): PopulationKind {
  return observationYear > today.getFullYear() ? 'projection' : 'estimate'
}

export type WorldBankPoint = {
  iso2: string
  name: string
  year: number
  value: number
}

export function parseWorldBank(payload: unknown): { sourceUpdated: string; rows: WorldBankPoint[] } | { error: string } {
  if (!Array.isArray(payload) || payload.length < 2 || !payload[0] || typeof payload[0] !== 'object') {
    return { error: 'The World Bank response was not a dataset.' }
  }
  const sourceUpdated = (payload[0] as { lastupdated?: unknown }).lastupdated
  if (typeof sourceUpdated !== 'string' || !/^\d{4}-\d{2}-\d{2}$/.test(sourceUpdated)) {
    return { error: 'The World Bank response has no update date.' }
  }
  if (!Array.isArray(payload[1])) {
    return { error: 'The World Bank response has no rows.' }
  }
  const rows: WorldBankPoint[] = []
  for (const row of payload[1]) {
    if (!row || typeof row !== 'object') {
      continue
    }
    const record = row as { country?: { id?: unknown; value?: unknown }; date?: unknown; value?: unknown }
    const iso2 = record.country?.id
    const name = record.country?.value
    const year = typeof record.date === 'string' ? Number(record.date) : Number.NaN
    if (typeof iso2 !== 'string' || !/^[A-Z]{2}$/.test(iso2)) {
      continue
    }
    if (typeof name !== 'string' || name.trim().length === 0) {
      continue
    }
    if (!Number.isInteger(year) || year < 1900 || year > 2100) {
      continue
    }
    if (typeof record.value !== 'number' || !Number.isFinite(record.value)) {
      continue
    }
    rows.push({ iso2, name: name.trim(), year, value: record.value })
  }
  return { sourceUpdated, rows }
}

export type PopulationRecord = {
  iso2: string
  name: string
  year: number
  population: number
  kind: PopulationKind
  growthPercent?: number
  growthYear?: number
  densityPerKm2?: number
  densityYear?: number
}

export function joinPopulation(
  total: WorldBankPoint[],
  growth: WorldBankPoint[],
  density: WorldBankPoint[],
  today: Date,
): PopulationRecord[] {
  const growthByIso = new Map(growth.map((row) => [row.iso2, row]))
  const densityByIso = new Map(density.map((row) => [row.iso2, row]))
  return total.map((row) => {
    const growthRow = growthByIso.get(row.iso2)
    const densityRow = densityByIso.get(row.iso2)
    const record: PopulationRecord = {
      iso2: row.iso2,
      name: row.name,
      year: row.year,
      population: row.value,
      kind: populationKind(row.year, today),
    }
    if (growthRow) {
      record.growthPercent = growthRow.value
      record.growthYear = growthRow.year
    }
    if (densityRow) {
      record.densityPerKm2 = densityRow.value
      record.densityYear = densityRow.year
    }
    return record
  })
}

export type ForestRecord = {
  iso2: string
  name: string
  percent?: { year: number; value: number }
  areaKm2?: { year: number; value: number }
}

export function joinForest(percent: WorldBankPoint[], areaKm2: WorldBankPoint[]): ForestRecord[] {
  const areaByIso = new Map(areaKm2.map((row) => [row.iso2, row]))
  const seen = new Set<string>()
  const records: ForestRecord[] = []
  for (const row of percent) {
    seen.add(row.iso2)
    const area = areaByIso.get(row.iso2)
    records.push({
      iso2: row.iso2,
      name: row.name,
      percent: { year: row.year, value: row.value },
      ...(area ? { areaKm2: { year: area.year, value: area.value } } : {}),
    })
  }
  for (const row of areaKm2) {
    if (seen.has(row.iso2)) {
      continue
    }
    records.push({ iso2: row.iso2, name: row.name, areaKm2: { year: row.year, value: row.value } })
  }
  return records
}

export type FreshwaterRecord = {
  iso2: string
  name: string
  year: number
  cubicMetersPerPerson: number
}

export function freshwaterRecords(rows: WorldBankPoint[]): FreshwaterRecord[] {
  return rows.map((row) => ({
    iso2: row.iso2,
    name: row.name,
    year: row.year,
    cubicMetersPerPerson: row.value,
  }))
}

export type HydroFeature = {
  name: string
  kind: 'river' | 'lake'
  ring: number[][]
}

export function parseHydroGeoJson(payload: unknown, kind: 'river' | 'lake'): HydroFeature[] {
  if (!payload || typeof payload !== 'object' || !Array.isArray((payload as { features?: unknown }).features)) {
    return []
  }
  const features: HydroFeature[] = []
  for (const feature of (payload as { features: unknown[] }).features) {
    if (!feature || typeof feature !== 'object') {
      continue
    }
    const record = feature as { geometry?: { type?: unknown; coordinates?: unknown }; properties?: { name?: unknown } }
    const name = typeof record.properties?.name === 'string' && record.properties.name.trim() ? record.properties.name.trim() : 'Unnamed'
    const geometry = record.geometry
    if (!geometry || typeof geometry.type !== 'string') {
      continue
    }
    for (const ring of ringsForGeometry(geometry.type, geometry.coordinates, kind)) {
      if (ring.length >= (kind === 'lake' ? 3 : 2)) {
        features.push({ name, kind, ring })
      }
    }
  }
  return features
}

export function matchingCountryRecord<T extends { iso2: string; name: string }>(
  rows: readonly T[],
  country: { iso: string; name: string },
  sameCodeCount: number,
): T | undefined {
  const matches = rows.filter((row) => row.iso2 === country.iso)
  if (sameCodeCount <= 1) {
    return matches[0]
  }
  return matches.find((row) => row.name === country.name)
}

export function filterByCategory<T extends { category: string }>(records: readonly T[], categories: ReadonlySet<string>): T[] {
  return records.filter((record) => categories.has(record.category))
}

function ringsForGeometry(type: string, coordinates: unknown, kind: 'river' | 'lake'): number[][][] {
  if (kind === 'river' && type === 'LineString') {
    return [readRing(coordinates)].filter((ring) => ring.length > 0)
  }
  if (kind === 'river' && type === 'MultiLineString' && Array.isArray(coordinates)) {
    return coordinates.map((line) => readRing(line)).filter((ring) => ring.length > 0)
  }
  if (kind === 'lake' && type === 'Polygon' && Array.isArray(coordinates)) {
    return [readRing(coordinates[0])].filter((ring) => ring.length > 0)
  }
  if (kind === 'lake' && type === 'MultiPolygon' && Array.isArray(coordinates)) {
    return coordinates
      .map((polygon) => (Array.isArray(polygon) ? readRing(polygon[0]) : []))
      .filter((ring) => ring.length > 0)
  }
  return []
}

function readRing(value: unknown): number[][] {
  if (!Array.isArray(value)) {
    return []
  }
  const ring: number[][] = []
  for (const point of value) {
    if (!Array.isArray(point) || point.length < 2 || typeof point[0] !== 'number' || typeof point[1] !== 'number') {
      continue
    }
    const longitude = point[0]
    const latitude = point[1]
    if (latitude < -90 || latitude > 90 || longitude < -180 || longitude > 180 || !Number.isFinite(latitude) || !Number.isFinite(longitude)) {
      continue
    }
    ring.push([longitude, latitude])
  }
  return ring
}
