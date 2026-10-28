import { describe, expect, it } from 'vitest'
import {
  cacheDecision,
  defaultPlanetLayers,
  filterByCategory,
  freshwaterRecords,
  hydrographyMaxAgeMs,
  joinForest,
  joinPopulation,
  matchingCountryRecord,
  parseHydroGeoJson,
  parseWorldBank,
  populationKind,
  resolveFeed,
  shouldLoadPopulation,
  togglePlanetLayer,
  worldBankMaxAgeMs,
} from './planet-feed'

const now = new Date('2026-10-27T12:00:00Z')

describe('planet layers', () => {
  it('starts with every extra layer off and toggles one at a time', () => {
    expect(defaultPlanetLayers).toEqual({ flags: false, conflicts: false, forests: false, freshwater: false, minerals: false, population: false })
    const forests = togglePlanetLayer(defaultPlanetLayers, 'forests')
    expect(forests.forests).toBe(true)
    expect(forests.population).toBe(false)
    expect(togglePlanetLayer(forests, 'forests').forests).toBe(false)
  })

  it('loads population for a selected country while the population layer stays off', () => {
    expect(shouldLoadPopulation(defaultPlanetLayers, 'TZ')).toBe(true)
    expect(shouldLoadPopulation(defaultPlanetLayers, null)).toBe(false)
    expect(shouldLoadPopulation(togglePlanetLayer(defaultPlanetLayers, 'population'), null)).toBe(true)
  })
})

describe('world bank records', () => {
  const payload = [
    { lastupdated: '2026-10-08', pages: 1 },
    [
      { country: { id: 'US', value: 'United States' }, date: '2025', value: 341784857 },
      { country: { id: 'US', value: 'United States' }, date: '2027', value: 1 },
      { country: { id: '1W', value: 'World' }, date: '2025', value: 8000000000 },
      { country: { id: 'TZ', value: 'Tanzania' }, date: '2025', value: null },
      { country: { id: 'ZZ', value: 'Bad' }, date: 'nope', value: 10 },
    ],
  ]

  it('keeps dated country rows and drops aggregates, blanks, and bad coordinates in time', () => {
    const parsed = parseWorldBank(payload)
    expect(parsed).toEqual({
      sourceUpdated: '2026-10-08',
      rows: [
        { iso2: 'US', name: 'United States', year: 2025, value: 341784857 },
        { iso2: 'US', name: 'United States', year: 2027, value: 1 },
      ],
    })
  })

  it('rejects a response that is not a dated dataset', () => {
    expect(parseWorldBank([])).toEqual({ error: 'The World Bank response was not a dataset.' })
    expect(parseWorldBank([{ lastupdated: 'yesterday' }, []])).toEqual({ error: 'The World Bank response has no update date.' })
  })

  it('labels a future observation year as a projection and a current year as an estimate', () => {
    expect(populationKind(2027, now)).toBe('projection')
    expect(populationKind(2026, now)).toBe('estimate')
    expect(populationKind(2025, now)).toBe('estimate')
    const joined = joinPopulation(
      [{ iso2: 'US', name: 'United States', year: 2027, value: 350000000 }],
      [{ iso2: 'US', name: 'United States', year: 2027, value: 0.4 }],
      [{ iso2: 'US', name: 'United States', year: 2024, value: 37.2 }],
      now,
    )
    expect(joined[0]).toMatchObject({ kind: 'projection', population: 350000000, growthYear: 2027, densityYear: 2024 })
  })

  it('keeps forest area and freshwater resources as separate national figures', () => {
    expect(joinForest(
      [{ iso2: 'TZ', name: 'Tanzania', year: 2022, value: 51.2 }],
      [{ iso2: 'TZ', name: 'Tanzania', year: 2022, value: 456000 }],
    )[0]).toEqual({
      iso2: 'TZ',
      name: 'Tanzania',
      percent: { year: 2022, value: 51.2 },
      areaKm2: { year: 2022, value: 456000 },
    })
    expect(freshwaterRecords([{ iso2: 'TZ', name: 'Tanzania', year: 2021, value: 1600 }])).toEqual([
      { iso2: 'TZ', name: 'Tanzania', year: 2021, cubicMetersPerPerson: 1600 },
    ])
  })
})

describe('hydrography', () => {
  it('drops coordinates outside the geographic range and keeps rivers and lake rings', () => {
    const rivers = parseHydroGeoJson({
      features: [
        { properties: { name: 'Nile' }, geometry: { type: 'LineString', coordinates: [[32.5, 15.6], [200, 10], [31, 30]] } },
        { properties: { name: 'Short' }, geometry: { type: 'LineString', coordinates: [[10, 10]] } },
      ],
    }, 'river')
    expect(rivers).toEqual([{ name: 'Nile', kind: 'river', ring: [[32.5, 15.6], [31, 30]] }])
    const lakes = parseHydroGeoJson({
      features: [{ properties: {}, geometry: { type: 'Polygon', coordinates: [[[30, -2], [32, -2], [31, 0], [30, -2]]] } }],
    }, 'lake')
    expect(lakes[0]?.name).toBe('Unnamed')
    expect(lakes[0]?.ring).toHaveLength(4)
  })
})

describe('country codes shared by the map', () => {
  const rows = [
    { iso2: 'SL', name: 'Sierra Leone', year: 2025, population: 8 },
    { iso2: 'CN', name: 'China', year: 2025, population: 1400 },
    { iso2: 'TZ', name: 'Tanzania', year: 2025, population: 70 },
  ]

  it('uses the code when only one mapped country has it', () => {
    expect(matchingCountryRecord(rows, { iso: 'TZ', name: 'Tanzania' }, 1)?.population).toBe(70)
  })

  it('does not give a shared code to the other territory', () => {
    expect(matchingCountryRecord(rows, { iso: 'SL', name: 'Sierra Leone' }, 2)?.population).toBe(8)
    expect(matchingCountryRecord(rows, { iso: 'SL', name: 'Somaliland' }, 2)).toBeUndefined()
    expect(matchingCountryRecord(rows, { iso: 'CN', name: 'N. Cyprus' }, 2)).toBeUndefined()
  })
})

describe('mineral categories', () => {
  it('returns only the requested categories and does not invent a volume', () => {
    const sites = [
      { name: 'Site A', category: 'lithium' },
      { name: 'Site B', category: 'copper' },
    ]
    expect(filterByCategory(sites, new Set(['lithium']))).toEqual([sites[0]])
    expect(filterByCategory(sites, new Set())).toEqual([])
  })
})

describe('feed cache', () => {
  it('uses a fresh cache and does not call the source', async () => {
    let called = false
    const snapshot = await resolveFeed({
      cached: { retrievedAt: '2026-10-20T00:00:00Z', sourceUpdated: '2026-10-08', payload: [1] },
      now,
      maxAgeMs: worldBankMaxAgeMs,
      load: async () => {
        called = true
        return { payload: [2] }
      },
    })
    expect(called).toBe(false)
    expect(snapshot).toMatchObject({ status: 'cache', data: [1], current: true })
  })

  it('treats hydrography as current for half a year and stale after that', () => {
    expect(cacheDecision('2026-06-01T00:00:00Z', now, hydrographyMaxAgeMs)).toBe('fresh')
    expect(cacheDecision('2025-01-01T00:00:00Z', now, hydrographyMaxAgeMs)).toBe('stale')
    expect(cacheDecision('not-a-date', now, worldBankMaxAgeMs)).toBe('stale')
  })

  it('keeps the last successful payload when the update fails and does not call it current', async () => {
    const snapshot = await resolveFeed({
      cached: { retrievedAt: '2026-01-01T00:00:00Z', payload: [7] },
      now,
      maxAgeMs: worldBankMaxAgeMs,
      load: async () => {
        throw new Error('World Bank SP.POP.TOTL responded 503.')
      },
    })
    expect(snapshot).toEqual({
      status: 'error',
      data: [7],
      retrievedAt: '2026-01-01T00:00:00Z',
      error: 'World Bank SP.POP.TOTL responded 503.',
      current: false,
    })
  })

  it('reports an error with no data when the source is unreachable and nothing was saved', async () => {
    const snapshot = await resolveFeed({
      cached: undefined,
      now,
      maxAgeMs: worldBankMaxAgeMs,
      load: async () => {
        throw new Error('failed to fetch')
      },
    })
    expect(snapshot).toEqual({ status: 'error', error: 'failed to fetch', current: false })
  })
})
