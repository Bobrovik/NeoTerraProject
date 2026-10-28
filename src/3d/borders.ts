import { ShapeUtils, Vector2 } from 'three'
import { latLonToVector3, wrapLongitude } from '../domain/geo'
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

export function countryShadeAttributes(
  shades: readonly { iso: string; name: string; color: readonly [number, number, number] }[],
  radius: number,
): { positions: Float32Array; colors: Float32Array } {
  const positions: number[] = []
  const colors: number[] = []
  for (const shade of shades) {
    const country = countries.find((item) => item.iso === shade.iso && item.name === shade.name)
    if (!country) {
      continue
    }
    for (const ring of country.rings) {
      const fan = fillFromRing(ring, radius)
      for (let index = 0; index < fan.length; index += 3) {
        positions.push(fan[index], fan[index + 1], fan[index + 2])
        colors.push(shade.color[0], shade.color[1], shade.color[2])
      }
    }
  }
  return { positions: new Float32Array(positions), colors: new Float32Array(colors) }
}

const maxFillEdgeDegrees = 4

function fillFromRing(ring: MapRing, radius: number): Float32Array {
  const contour = openRing(ring)
  if (contour.length < 3) {
    return new Float32Array()
  }
  const values: number[] = []
  if (poleSeam(contour)) {
    appendPoleFan(contour, radius, values)
  } else if (!crossesAntimeridian(contour)) {
    appendTriangulated(contour, radius, values)
  }
  return new Float32Array(values)
}

function appendTriangulated(contour: MapRing, radius: number, values: number[]) {
  let faces: number[][]
  try {
    faces = ShapeUtils.triangulateShape(contour.map(([longitude, latitude]) => new Vector2(longitude, latitude)), [])
  } catch {
    return
  }
  for (const [a, b, c] of faces) {
    const first = contour[a]
    const second = contour[b]
    const third = contour[c]
    if (!first || !second || !third) {
      continue
    }
    appendOnSphere(first, second, third, radius, values, 0)
  }
}

function appendPoleFan(contour: MapRing, radius: number, values: number[]) {
  const southern = contour.some((point) => point[1] < -89)
  const pole: [number, number] = [0, southern ? -90 : 90]
  for (let index = 0; index < contour.length; index += 1) {
    const start = contour[index]
    const end = contour[(index + 1) % contour.length]
    if (!start || !end || (Math.abs(start[1]) > 89 && Math.abs(end[1]) > 89)) {
      continue
    }
    appendOnSphere(pole, start, end, radius, values, 0)
  }
}

function appendOnSphere(a: number[], b: number[], c: number[], radius: number, values: number[], depth: number) {
  const longest = Math.max(angularDegrees(a, b), angularDegrees(b, c), angularDegrees(c, a))
  if (depth < 12 && longest > maxFillEdgeDegrees) {
    if (angularDegrees(a, b) >= angularDegrees(b, c) && angularDegrees(a, b) >= angularDegrees(c, a)) {
      const middle = midpoint(a, b)
      appendOnSphere(a, middle, c, radius, values, depth + 1)
      appendOnSphere(middle, b, c, radius, values, depth + 1)
    } else if (angularDegrees(b, c) >= angularDegrees(c, a)) {
      const middle = midpoint(b, c)
      appendOnSphere(a, b, middle, radius, values, depth + 1)
      appendOnSphere(a, middle, c, radius, values, depth + 1)
    } else {
      const middle = midpoint(c, a)
      appendOnSphere(a, b, middle, radius, values, depth + 1)
      appendOnSphere(middle, b, c, radius, values, depth + 1)
    }
    return
  }
  const p0 = latLonToVector3(a[1], a[0], radius)
  const p1 = latLonToVector3(b[1], b[0], radius)
  const p2 = latLonToVector3(c[1], c[0], radius)
  values.push(p0.x, p0.y, p0.z, p1.x, p1.y, p1.z, p2.x, p2.y, p2.z)
}

function angularDegrees(a: number[], b: number[]): number {
  const lat1 = a[1] * Math.PI / 180
  const lat2 = b[1] * Math.PI / 180
  const dLat = lat2 - lat1
  const dLon = (b[0] - a[0]) * Math.PI / 180
  const chord = Math.sin(dLat / 2) ** 2 + Math.cos(lat1) * Math.cos(lat2) * Math.sin(dLon / 2) ** 2
  return 2 * Math.asin(Math.min(1, Math.sqrt(chord))) * 180 / Math.PI
}

function midpoint(a: number[], b: number[]): [number, number] {
  let start = a[0]
  let end = b[0]
  if (end - start > 180) {
    start += 360
  } else if (start - end > 180) {
    end += 360
  }
  return [wrapLongitude((start + end) / 2), (a[1] + b[1]) / 2]
}

function openRing(ring: MapRing): MapRing {
  const points = ring.filter((point, index) => index === 0 || point[0] !== ring[index - 1][0] || point[1] !== ring[index - 1][1])
  const first = points[0]
  const last = points[points.length - 1]
  if (first && last && first[0] === last[0] && first[1] === last[1]) {
    points.pop()
  }
  return points
}

function poleSeam(ring: MapRing): boolean {
  return ring.some((point, index) => {
    const next = ring[(index + 1) % ring.length]
    return Math.abs(next[0] - point[0]) > 180 && Math.abs(point[1]) > 89 && Math.abs(next[1]) > 89
  })
}

function crossesAntimeridian(ring: MapRing): boolean {
  return ring.some((point, index) => {
    const next = ring[(index + 1) % ring.length]
    return Math.abs(next[0] - point[0]) > 180
  })
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
