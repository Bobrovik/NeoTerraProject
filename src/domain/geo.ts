import type { Vec3 } from './types'

const DEGREES = Math.PI / 180

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
