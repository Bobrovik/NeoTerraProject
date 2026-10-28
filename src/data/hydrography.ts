import { parseHydroGeoJson, type HydroFeature } from '../domain/planet-feed'

export const naturalEarthRiversUrl = 'https://cdn.jsdelivr.net/gh/martynafford/natural-earth-geojson@master/110m/physical/ne_110m_rivers_lake_centerlines.json'
export const naturalEarthLakesUrl = 'https://cdn.jsdelivr.net/gh/martynafford/natural-earth-geojson@master/110m/physical/ne_110m_lakes.json'

export async function fetchHydrography(fetchImpl: typeof fetch = fetch): Promise<HydroFeature[]> {
  const [rivers, lakes] = await Promise.all([
    fetchImpl(naturalEarthRiversUrl).then(readJson),
    fetchImpl(naturalEarthLakesUrl).then(readJson),
  ])
  return [...parseHydroGeoJson(rivers, 'river'), ...parseHydroGeoJson(lakes, 'lake')]
}

async function readJson(response: Response): Promise<unknown> {
  if (!response.ok) {
    throw new Error(`Natural Earth hydrography responded ${response.status}.`)
  }
  return response.json()
}
