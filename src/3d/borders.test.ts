import { describe, expect, it } from 'vitest'
import { cities } from '../data/demo/records'
import { coasts, countries, countryShadeAttributes, fanFromRing, lineSegmentsFromRings, ribbonFromRings } from './borders'
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
    const tanzania = countries.find((item) => item.iso === 'TZ' && item.name === 'Tanzania')
    const shaded = countryShadeAttributes(tanzania ? [{ iso: 'TZ', name: 'Tanzania', color: [0.2, 0.8, 0.3] }] : [], 1.006)
    expect(shaded.positions.length).toBeGreaterThan(0)
    expect(shaded.colors.length).toBe(shaded.positions.length)
    expect(shaded.colors[1]).toBeCloseTo(0.8)
  })

  it('keeps a large country fill on the sphere, including the antarctic seam', () => {
    const russia = countries.find((item) => item.iso === 'RU' && item.name === 'Russia')
    const antarctica = countries.find((item) => item.name === 'Antarctica')
    const shaded = countryShadeAttributes([
      ...(russia ? [{ iso: 'RU', name: 'Russia', color: [0.2, 0.4, 0.6] as [number, number, number] }] : []),
      ...(antarctica ? [{ iso: antarctica.iso, name: 'Antarctica', color: [0.4, 0.5, 0.6] as [number, number, number] }] : []),
    ], 1)
    expect(shaded.positions.length).toBeGreaterThan(10_000)
    let nearest = 1
    for (let index = 0; index < shaded.positions.length; index += 9) {
      const x = (shaded.positions[index] + shaded.positions[index + 3] + shaded.positions[index + 6]) / 3
      const y = (shaded.positions[index + 1] + shaded.positions[index + 4] + shaded.positions[index + 7]) / 3
      const z = (shaded.positions[index + 2] + shaded.positions[index + 5] + shaded.positions[index + 8]) / 3
      nearest = Math.min(nearest, Math.hypot(x, y, z))
    }
    expect(nearest).toBeGreaterThan(0.997)
  })

  it('keeps a separate color for each country after the fill is subdivided', () => {
    const russia = countries.find((item) => item.iso === 'RU' && item.name === 'Russia')
    const tanzania = countries.find((item) => item.iso === 'TZ' && item.name === 'Tanzania')
    const shaded = countryShadeAttributes([
      ...(russia ? [{ iso: 'RU', name: 'Russia', color: [0.1, 0.2, 0.3] as [number, number, number] }] : []),
      ...(tanzania ? [{ iso: 'TZ', name: 'Tanzania', color: [0.9, 0.4, 0.2] as [number, number, number] }] : []),
    ], 1)
    const reds = new Set<number>()
    for (let index = 0; index < shaded.colors.length; index += 3) {
      reds.add(Math.round(shaded.colors[index] * 10) / 10)
    }
    expect(reds.has(0.1)).toBe(true)
    expect(reds.has(0.9)).toBe(true)
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