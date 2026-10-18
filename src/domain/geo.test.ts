import { describe, expect, it } from 'vitest'
import { demoSnapshot } from '../data/demo'
import {
  LOCAL_FRAME_RADIUS_METERS,
  geodeticToLocal,
  localFrameMetersPerDegree,
  localHorizontalDistance,
  localToGeodetic,
  wrapLongitude,
} from './geo'

const roundTripMeters = 0.001

describe('local city frame', () => {
  const aurora = demoSnapshot.cities.find((city) => city.id === 'city:aurora')
  const meridian = demoSnapshot.cities.find((city) => city.id === 'city:meridian')

  it('maps the local origin to the city center and keeps stored object positions', () => {
    expect(aurora && meridian).toBeTruthy()
    if (!aurora || !meridian) {
      return
    }
    const origin = localToGeodetic(aurora, { east: 0, north: 0 })
    expect(origin?.latitude).toBeCloseTo(aurora.latitude, 8)
    expect(origin?.longitude).toBeCloseTo(aurora.longitude, 8)
    expect(geodeticToLocal(aurora, aurora)).toEqual({ east: 0, north: 0 })
    const solar = demoSnapshot.objects.find((object) => object.id === 'object:aurora:solar-field')
    expect(solar?.placement.position.x).toBe(-32)
    expect(solar?.placement.position.z).toBe(10)
    const back = geodeticToLocal(aurora, localToGeodetic(aurora, { east: solar!.placement.position.x, north: solar!.placement.position.z })!)
    expect(back?.east).toBeCloseTo(-32, 3)
    expect(back?.north).toBeCloseTo(10, 3)
  })

  it('moves east into greater longitude and north into greater latitude', () => {
    const origin = { latitude: 6.8, longitude: 22.4 }
    const east = localToGeodetic(origin, { east: 1000, north: 0 })
    const north = localToGeodetic(origin, { east: 0, north: 1000 })
    expect(east && east.longitude).toBeGreaterThan(origin.longitude)
    expect(north && north.latitude).toBeGreaterThan(origin.latitude)
    expect(east?.latitude).toBeCloseTo(origin.latitude, 8)
    const equator = localFrameMetersPerDegree(0)
    expect(equator?.east).toBeGreaterThan(111_319)
    expect(equator?.east).toBeLessThan(111_320)
    expect(equator?.north).toBeGreaterThan(110_574)
    expect(equator?.north).toBeLessThan(110_575)
  })

  it('round-trips inside 20 km to 1 mm, including the southern hemisphere and a high latitude', () => {
    const origins = [
      { latitude: 6.8, longitude: 22.4 },
      { latitude: 62.3, longitude: 102.8 },
      { latitude: -33.4, longitude: 18.5 },
      { latitude: 80, longitude: -40 },
    ]
    for (const origin of origins) {
      for (const local of [
        { east: 0, north: 0 },
        { east: 1000, north: -250 },
        { east: -LOCAL_FRAME_RADIUS_METERS, north: LOCAL_FRAME_RADIUS_METERS },
      ]) {
        const geographic = localToGeodetic(origin, local)
        const back = geographic ? geodeticToLocal(origin, geographic) : undefined
        expect(back?.east).toBeCloseTo(local.east, 3)
        expect(back?.north).toBeCloseTo(local.north, 3)
        expect(Math.abs((back?.east ?? 0) - local.east)).toBeLessThan(roundTripMeters)
        expect(Math.abs((back?.north ?? 0) - local.north)).toBeLessThan(roundTripMeters)
      }
    }
  })

  it('uses a shorter east-west degree at high latitude and measures stored meters directly', () => {
    const low = localFrameMetersPerDegree(6.8)
    const high = localFrameMetersPerDegree(62.3)
    expect(low && high && high.east < low.east).toBe(true)
    expect(localHorizontalDistance({ x: 0, z: 0 }, { x: 300, z: 400 })).toBe(500)
    expect(localFrameMetersPerDegree(89)).toBeUndefined()
  })

  it('wraps longitude across ±180', () => {
    const eastbound = localToGeodetic({ latitude: 0, longitude: 179.9 }, { east: 25_000, north: 0 })
    const westbound = localToGeodetic({ latitude: 0, longitude: -179.9 }, { east: -25_000, north: 0 })
    expect(eastbound && eastbound.longitude).toBeLessThan(0)
    expect(westbound && westbound.longitude).toBeGreaterThan(0)
    expect(wrapLongitude(180)).toBe(-180)
    const back = eastbound ? geodeticToLocal({ latitude: 0, longitude: 179.9 }, eastbound) : undefined
    expect(back?.east).toBeCloseTo(25_000, 3)
    expect(Math.abs((back?.east ?? 0) - 25_000)).toBeLessThan(roundTripMeters)
  })
})
