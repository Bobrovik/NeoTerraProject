/// <reference types="node" />
import { readFileSync } from 'node:fs'
import { describe, expect, it } from 'vitest'
import { GLTFLoader } from 'three/examples/jsm/loaders/GLTFLoader.js'
import { demoSnapshot } from '../data/demo'
import { modelFit, primitiveFallback } from './model'

describe('model representation', () => {
  const commons = demoSnapshot.objects.find((object) => object.id === 'object:aurora:commons')
  const solar = demoSnapshot.objects.find((object) => object.id === 'object:aurora:solar-field')

  it('points Commons at the test model without moving or renaming it', () => {
    expect(commons?.representation).toEqual({
      kind: 'model',
      url: '/models/test-cube.glb',
      fallback: { shape: 'cylinder', color: '#c3b7d8' },
    })
    expect(commons?.placement.position).toEqual({ x: 0, y: 1.5, z: 0 })
    expect(commons?.placement.size).toEqual({ x: 16, y: 3, z: 16 })
    expect(commons?.name).toBe('Commons')
    expect(commons?.cityId).toBe('city:aurora')
    expect(commons?.systemIds).toEqual([])
    expect(solar?.representation.kind).toBe('primitive')
    expect(primitiveFallback(commons!.representation)).toEqual({
      kind: 'primitive',
      shape: 'cylinder',
      color: '#c3b7d8',
    })
  })

  it('fits a model bounding box to stored meters and centers it', () => {
    expect(modelFit({ min: { x: -0.5, y: -0.5, z: -0.5 }, max: { x: 0.5, y: 0.5, z: 0.5 } }, { x: 16, y: 3, z: 16 })).toEqual({
      scale: { x: 16, y: 3, z: 16 },
      offset: { x: 0, y: 0, z: 0 },
    })
    const grounded = modelFit({ min: { x: 0, y: 0, z: 0 }, max: { x: 1, y: 1, z: 1 } }, { x: 10, y: 4, z: 10 })
    expect(grounded.scale).toEqual({ x: 10, y: 4, z: 10 })
    expect(grounded.offset).toEqual({ x: -5, y: -2, z: -5 })
  })

  it('parses the test cube glb', async () => {
    const bytes = readFileSync(new URL('../../public/models/test-cube.glb', import.meta.url))
    const loader = new GLTFLoader()
    const gltf = await loader.parseAsync(bytes.buffer.slice(bytes.byteOffset, bytes.byteOffset + bytes.byteLength), '')
    expect(gltf.scene.children.length).toBeGreaterThan(0)
  })
})