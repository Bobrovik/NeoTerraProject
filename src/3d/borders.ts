import { latLonToVector3 } from '../domain/geo'
import worldMap from './world-map.json'

export type MapRing = number[][]

export type MapCountry = {
  name: string
  iso: string
  continent: string
  label: [number, number]
  rings: MapRing[]
}

export const countries = worldMap.countries as MapCountry[]
export const coasts = worldMap.coasts as MapRing[]

export function lineSegmentsFromRings(rings: MapRing[], radius: number): Float32Array {
  const values: number[] = []
  for (const ring of rings) {
    for (let index = 1; index < ring.length; index += 1) {
      const [lon0, lat0] = ring[index - 1]
      const [lon1, lat1] = ring[index]
      if (Math.abs(lon1 - lon0) > 180) {
        continue
      }
      const start = latLonToVector3(lat0, lon0, radius)
      const end = latLonToVector3(lat1, lon1, radius)
      values.push(start.x, start.y, start.z, end.x, end.y, end.z)
    }
  }
  return new Float32Array(values)
}

export function ribbonFromRings(rings: MapRing[], radius: number, halfWidth: number): Float32Array {
  const values: number[] = []
  for (const ring of rings) {
    for (let index = 1; index < ring.length; index += 1) {
      const [lon0, lat0] = ring[index - 1]
      const [lon1, lat1] = ring[index]
      if (Math.abs(lon1 - lon0) > 180) {
        continue
      }
      const start = latLonToVector3(lat0, lon0, radius)
      const end = latLonToVector3(lat1, lon1, radius)
      const dx = end.x - start.x
      const dy = end.y - start.y
      const dz = end.z - start.z
      let sx = start.y * dz - start.z * dy
      let sy = start.z * dx - start.x * dz
      let sz = start.x * dy - start.y * dx
      const length = Math.hypot(sx, sy, sz) || 1
      sx = (sx / length) * halfWidth
      sy = (sy / length) * halfWidth
      sz = (sz / length) * halfWidth
      values.push(
        start.x - sx, start.y - sy, start.z - sz,
        start.x + sx, start.y + sy, start.z + sz,
        end.x - sx, end.y - sy, end.z - sz,
        start.x + sx, start.y + sy, start.z + sz,
        end.x + sx, end.y + sy, end.z + sz,
        end.x - sx, end.y - sy, end.z - sz,
      )
    }
  }
  return new Float32Array(values)
}

export function fanFromRing(ring: MapRing, radius: number): Float32Array {
  if (ring.length < 3) {
    return new Float32Array()
  }
  const count = ring.length
  const center = latLonToVector3(
    ring.reduce((sum, point) => sum + point[1], 0) / count,
    ring.reduce((sum, point) => sum + point[0], 0) / count,
    radius,
  )
  const values: number[] = []
  for (let index = 1; index < ring.length; index += 1) {
    const [lon0, lat0] = ring[index - 1]
    const [lon1, lat1] = ring[index]
    if (Math.abs(lon1 - lon0) > 180) {
      continue
    }
    const start = latLonToVector3(lat0, lon0, radius)
    const end = latLonToVector3(lat1, lon1, radius)
    values.push(center.x, center.y, center.z, start.x, start.y, start.z, end.x, end.y, end.z)
  }
  return new Float32Array(values)
}
