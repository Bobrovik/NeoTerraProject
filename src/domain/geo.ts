import type { Vec3 } from './types'

const DEGREES = Math.PI / 180
const WGS84_A = 6_378_137
const WGS84_F = 1 / 298.257223563
const WGS84_E2 = WGS84_F * (2 - WGS84_F)

/** Horizontal distance from a city origin inside which the flat local frame is the intended reading. */
export const LOCAL_FRAME_RADIUS_METERS = 20_000

/** Origins closer to a pole than this are rejected. East-west scale collapses there. */
export const LOCAL_FRAME_MAX_ABS_LATITUDE = 85

export type GeodeticPoint = {
  latitude: number
  longitude: number
}

export type LocalHorizontal = {
  east: number
  north: number
}

export function latLonToVector3(latitude: number, longitude: number, radius: number): Vec3 {
  const lat = latitude * DEGREES
  const lon = longitude * DEGREES
  const cosLat = Math.cos(lat)
  return {
    x: radius * cosLat * Math.sin(lon),
    y: radius * Math.sin(lat),
    z: radius * cosLat * Math.cos(lon),
  }
}

export function wrapLongitude(longitude: number): number {
  const turns = ((longitude + 180) % 360 + 360) % 360
  return turns - 180
}

export function localFrameMetersPerDegree(latitude: number): { east: number; north: number } | undefined {
  if (!Number.isFinite(latitude) || Math.abs(latitude) > LOCAL_FRAME_MAX_ABS_LATITUDE) {
    return undefined
  }
  const phi = latitude * DEGREES
  const sinPhi = Math.sin(phi)
  const oneMinus = 1 - WGS84_E2 * sinPhi * sinPhi
  const primeVertical = WGS84_A / Math.sqrt(oneMinus)
  const meridian = (WGS84_A * (1 - WGS84_E2)) / (oneMinus * Math.sqrt(oneMinus))
  return {
    east: primeVertical * Math.cos(phi) * DEGREES,
    north: meridian * DEGREES,
  }
}

export function localToGeodetic(origin: GeodeticPoint, local: LocalHorizontal): GeodeticPoint | undefined {
  const scale = localFrameMetersPerDegree(origin.latitude)
  if (!scale || !Number.isFinite(origin.longitude) || !Number.isFinite(local.east) || !Number.isFinite(local.north)) {
    return undefined
  }
  return {
    latitude: origin.latitude + local.north / scale.north,
    longitude: wrapLongitude(origin.longitude + local.east / scale.east),
  }
}

export function geodeticToLocal(origin: GeodeticPoint, point: GeodeticPoint): LocalHorizontal | undefined {
  const scale = localFrameMetersPerDegree(origin.latitude)
  if (!scale || !Number.isFinite(point.latitude) || !Number.isFinite(point.longitude) || !Number.isFinite(origin.longitude)) {
    return undefined
  }
  return {
    east: wrapLongitude(point.longitude - origin.longitude) * scale.east,
    north: (point.latitude - origin.latitude) * scale.north,
  }
}

export function localHorizontalDistance(a: { x: number; z: number }, b: { x: number; z: number }): number {
  return Math.hypot(b.x - a.x, b.z - a.z)
}
