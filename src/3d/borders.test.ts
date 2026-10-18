import { describe, expect, it } from 'vitest'
import { cities } from '../data/demo/records'
import { coasts, countries, fanFromRing, lineSegmentsFromRings, ribbonFromRings } from './borders'
import { conflictZones } from './globe-marks'

describe('world map', () => {
  it('keeps a named country, a flag code, and a continent for every feature', () => {
    expect(countries.length).toBeGreaterThan(150)
    expect(coasts.length).toBeGreaterThan(20)
    expect(countries.every((country) => country.name && /^[A-Z]{2}$/.test(country.iso) && country.continent && country.rings.length > 0)).toBe(true)
    expect(new Set(countries.map((country) => country.continent))).toEqual(new Set(['Africa', 'Asia', 'Europe', 'North America', 'South America', 'Oceania', 'Antarctica', 'Seven seas (open ocean)']))
  })

  it('draws continent edges as wider geometry than a country border segment', () => {
    const country = lineSegmentsFromRings([[[0, 0], [1, 0], [1, 1]]], 1)
    const coast = ribbonFromRings([[[0, 0], [1, 0], [1, 1]]], 1, 0.01)
    expect(country.length).toBe(12)
    expect(coast.length).toBeGreaterThan(country.length)
  })

  it('does not connect a border across the antimeridian', () => {
    expect(lineSegmentsFromRings([[[179, 0], [-179, 0], [-178, 1]]], 1).length).toBe(6)
  })

  it('places the project markers in Africa and Siberia and keeps conflict areas as polygons', () => {
    const aurora = cities.find((city) => city.id === 'city:aurora')
    const meridian = cities.find((city) => city.id === 'city:meridian')
    expect(aurora && aurora.latitude > -35 && aurora.latitude < 38 && aurora.longitude > -18 && aurora.longitude < 52).toBe(true)
    expect(meridian && meridian.latitude > 50 && meridian.latitude < 75 && meridian.longitude > 60 && meridian.longitude < 140).toBe(true)
    expect(conflictZones.every((zone) => zone.ring.length >= 4 && fanFromRing(zone.ring, 1).length > 0)).toBe(true)
  })
})