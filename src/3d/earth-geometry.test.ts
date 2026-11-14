import { Vector3 } from 'three'
import { describe, expect, it } from 'vitest'
import { latLonToVector3 } from '../domain/geo'
import { buildEarthSphere } from './earth-geometry'

describe('earth sphere', () => {
  it('places the prime meridian and equator on the same vector as the map', () => {
    const geometry = buildEarthSphere(1, 4, 2)
    const position = geometry.getAttribute('position')
    const uv = geometry.getAttribute('uv')
    const index = 1 * 5 + 2
    const point = new Vector3().fromBufferAttribute(position, index)
    const expected = latLonToVector3(0, 0, 1)
    expect(point.x).toBeCloseTo(expected.x)
    expect(point.y).toBeCloseTo(expected.y)
    expect(point.z).toBeCloseTo(expected.z)
    expect(uv.getX(index)).toBeCloseTo(0.5)
    expect(uv.getY(index)).toBeCloseTo(0.5)
    geometry.dispose()
  })

  it('keeps the north pole at the top of an equirectangular image', () => {
    const geometry = buildEarthSphere(1, 4, 2)
    const position = geometry.getAttribute('position')
    const uv = geometry.getAttribute('uv')
    const pole = new Vector3().fromBufferAttribute(position, 0)
    expect(pole.y).toBeCloseTo(1)
    expect(uv.getY(0)).toBeCloseTo(1)
    geometry.dispose()
  })

  it('faces the surface outward', () => {
    const geometry = buildEarthSphere(1, 4, 2)
    const index = geometry.getIndex()
    const position = geometry.getAttribute('position')
    if (!index) {
      throw new Error('missing index')
    }
    const start = 4 * 6
    const a = new Vector3().fromBufferAttribute(position, index.getX(start))
    const b = new Vector3().fromBufferAttribute(position, index.getX(start + 1))
    const c = new Vector3().fromBufferAttribute(position, index.getX(start + 2))
    const outward = a.clone().add(b).add(c).normalize()
    const facing = b.clone().sub(a).cross(c.clone().sub(a)).normalize()
    expect(facing.dot(outward)).toBeGreaterThan(0.5)
    geometry.dispose()
  })
})
