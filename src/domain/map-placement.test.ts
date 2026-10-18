import { describe, expect, it } from 'vitest'
import { demoSnapshot } from '../data/demo'
import { buildingTemplates } from './buildings'
import { localToGeodetic } from './geo'
import { emptyCityDraft } from './user-city'
import { placeObject } from './layout'
import { mercatorMetersPerPixel, objectMapAnchors, placementFromGeodetic, roadMapLines } from './map-placement'

describe('map placement', () => {
  const aurora = demoSnapshot.cities.find((city) => city.id === 'city:aurora')
  const template = buildingTemplates[0]

  it('keeps a clicked geographic point in local east/north meters, independent of zoom', () => {
    expect(aurora && template).toBeTruthy()
    if (!aurora || !template) {
      return
    }
    const target = localToGeodetic(aurora, { east: 120, north: -40 })
    expect(target).toBeTruthy()
    if (!target) {
      return
    }
    const first = placementFromGeodetic(aurora, target)
    const second = placementFromGeodetic(aurora, target)
    expect(first).toEqual(second)
    expect(first?.east).toBeCloseTo(120, 3)
    expect(first?.north).toBeCloseTo(-40, 3)
    expect(first?.outsideFrame).toBe(false)
    expect(placementFromGeodetic(aurora, aurora)).toEqual({ east: 0, north: 0, outsideFrame: false })

    const placed = placeObject(emptyCityDraft(aurora.id), template, first!.east, first!.north, 'object:aurora:map-test')
    const stored = placed.objects[0]?.placement.position
    expect(stored).toEqual({ x: 120, y: template.size.y / 2, z: -40 })
    const anchor = objectMapAnchors(aurora, placed.objects)[0]
    expect(anchor?.objectId).toBe('object:aurora:map-test')
    expect(anchor?.longitude).toBeCloseTo(target.longitude, 6)
    expect(anchor?.latitude).toBeCloseTo(target.latitude, 6)
  })

  it('places an existing object from its stored meters and flags points past 20 km', () => {
    expect(aurora).toBeTruthy()
    if (!aurora) {
      return
    }
    const solar = demoSnapshot.objects.find((object) => object.id === 'object:aurora:solar-field')
    const anchor = objectMapAnchors(aurora, solar ? [solar] : [])[0]
    const back = anchor ? placementFromGeodetic(aurora, anchor) : undefined
    expect(back?.east).toBeCloseTo(-32, 3)
    expect(back?.north).toBeCloseTo(10, 3)
    expect(back?.outsideFrame).toBe(false)

    const far = localToGeodetic(aurora, { east: 25_000, north: 0 })
    expect(far && placementFromGeodetic(aurora, far)?.outsideFrame).toBe(true)
    expect(placementFromGeodetic({ latitude: 89, longitude: 0 }, { latitude: 89, longitude: 0.01 })).toBeUndefined()

    const road = roadMapLines(
      aurora,
      demoSnapshot.roads.filter((item) => item.cityId === aurora.id),
      demoSnapshot.objects.filter((object) => object.cityId === aurora.id),
    )
    expect(road.some((line) => line.roadId === 'road:aurora:solar-hub' && line.coordinates.length >= 2)).toBe(true)
  })

  it('reports Web Mercator screen scale without using it as a coordinate', () => {
    const equator = mercatorMetersPerPixel(0, 0)
    expect(equator).toBeCloseTo((2 * Math.PI * 6_378_137) / 512, 6)
    const closer = mercatorMetersPerPixel(6.8, 15)
    expect(closer).toBeLessThan(3)
    expect(mercatorMetersPerPixel(6.8, 16)).toBeCloseTo((closer ?? 0) / 2, 6)
    expect(mercatorMetersPerPixel(91, 10)).toBeUndefined()
  })
})
