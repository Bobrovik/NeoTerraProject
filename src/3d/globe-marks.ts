import type { MapRing } from './borders'

export type ConflictZone = {
  id: string
  name: string
  ring: MapRing
}

export type OceanLabel = {
  name: string
  latitude: number
  longitude: number
}

/** Kept for the geometry test. These boxes are not drawn: they cover whole regions and are not a conflict feed. */
export const conflictZones: ConflictZone[] = [
  { id: 'ukraine', name: 'Ukraine', ring: [[22, 52.2], [40.2, 52.2], [40.2, 44.2], [22, 44.2], [22, 52.2]] },
  { id: 'levant', name: 'Levant', ring: [[34.2, 33.4], [36.4, 33.4], [36.4, 29.4], [34.2, 29.4], [34.2, 33.4]] },
  { id: 'sudan', name: 'Sudan', ring: [[22, 22], [38.5, 22], [38.5, 9], [22, 9], [22, 22]] },
  { id: 'yemen', name: 'Yemen', ring: [[42.5, 17.5], [53, 17.5], [53, 12.5], [42.5, 12.5], [42.5, 17.5]] },
  { id: 'sahel', name: 'Sahel', ring: [[-6, 18], [15, 18], [15, 11], [-6, 11], [-6, 18]] },
  { id: 'myanmar', name: 'Myanmar', ring: [[92, 28], [101, 28], [101, 10], [92, 10], [92, 28]] },
  { id: 'east-congo', name: 'Eastern Congo', ring: [[26, 4], [31, 4], [31, -6], [26, -6], [26, 4]] },
]

export const oceans: OceanLabel[] = [
  { name: 'Arctic Ocean', latitude: 78, longitude: 0 },
  { name: 'Atlantic Ocean', latitude: 18, longitude: -32 },
  { name: 'Pacific Ocean', latitude: 0, longitude: -150 },
  { name: 'Indian Ocean', latitude: -20, longitude: 78 },
  { name: 'Southern Ocean', latitude: -60, longitude: 20 },
]
