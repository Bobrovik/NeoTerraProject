import { BufferAttribute, BufferGeometry } from 'three'
import { latLonToVector3 } from '../domain/geo'

const WIDTH = 128
const HEIGHT = 80

/** Equirectangular sphere. Texture u follows longitude and v follows latitude, using latLonToVector3. */
export function buildEarthSphere(radius: number, width: number, height: number): BufferGeometry {
  const columns = width + 1
  const positions = new Float32Array(columns * (height + 1) * 3)
  const normals = new Float32Array(columns * (height + 1) * 3)
  const uvs = new Float32Array(columns * (height + 1) * 2)
  let vertex = 0
  for (let y = 0; y <= height; y += 1) {
    const v = y / height
    const latitude = 90 - v * 180
    for (let x = 0; x <= width; x += 1) {
      const u = x / width
      const point = latLonToVector3(latitude, u * 360 - 180, radius)
      const normal = latLonToVector3(latitude, u * 360 - 180, 1)
      const offset = vertex * 3
      positions[offset] = point.x
      positions[offset + 1] = point.y
      positions[offset + 2] = point.z
      normals[offset] = normal.x
      normals[offset + 1] = normal.y
      normals[offset + 2] = normal.z
      uvs[vertex * 2] = u
      uvs[vertex * 2 + 1] = 1 - v
      vertex += 1
    }
  }
  const indices = new Uint32Array(width * height * 6)
  let index = 0
  for (let y = 0; y < height; y += 1) {
    for (let x = 0; x < width; x += 1) {
      const a = y * columns + x
      const b = a + columns
      indices[index] = a
      indices[index + 1] = b
      indices[index + 2] = a + 1
      indices[index + 3] = a + 1
      indices[index + 4] = b
      indices[index + 5] = b + 1
      index += 6
    }
  }
  const geometry = new BufferGeometry()
  geometry.setAttribute('position', new BufferAttribute(positions, 3))
  geometry.setAttribute('normal', new BufferAttribute(normals, 3))
  geometry.setAttribute('uv', new BufferAttribute(uvs, 2))
  geometry.setIndex(new BufferAttribute(indices, 1))
  return geometry
}

let shared: BufferGeometry | undefined

export function earthSphereGeometry(): BufferGeometry {
  shared ??= buildEarthSphere(1, WIDTH, HEIGHT)
  return shared
}
