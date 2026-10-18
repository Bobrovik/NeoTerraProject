import { describe, expect, it } from 'vitest'
import { demoSnapshot } from '../data/demo'
import { latLonToVector3 } from './geo'
import { collectIntegrityIssues } from './integrity'
import { resolveFlowSegments } from './flows'
import { systemsForCity } from './queries'
import { searchCatalog } from './search'
import { buildSystemGraph } from './system-graph'
import { createProjectTask } from './tasks'
import type { CatalogSnapshot, CitySystem, ResourceFlow } from './types'

describe('latLonToVector3', () => {
  it('places the north pole on +Y and the lat/lon origin on +Z', () => {
    const north = latLonToVector3(90, 0, 2)
    expect(north.y).toBeCloseTo(2)
    expect(north.x).toBeCloseTo(0)
    expect(north.z).toBeCloseTo(0)

    const origin = latLonToVector3(0, 0, 2)
    expect(origin.z).toBeCloseTo(2)
    expect(origin.x).toBeCloseTo(0)
    expect(origin.y).toBeCloseTo(0)
  })
})

describe('demo catalog', () => {
  it('has no dangling references', () => {
    expect(collectIntegrityIssues(demoSnapshot)).toEqual([])
  })

  it('gives Meridian objects and no systems', () => {
    expect(demoSnapshot.objects.some((object) => object.cityId === 'city:meridian')).toBe(true)
    expect(systemsForCity(demoSnapshot, 'city:meridian')).toEqual([])
  })

  it('keeps electricity as the only flowing resource while other types exist', () => {
    const used = new Set(demoSnapshot.flows.map((flow) => flow.resourceTypeId))
    expect(used).toEqual(new Set(['resource:electricity']))
    expect(demoSnapshot.resourceTypes.map((resource) => resource.id)).toEqual(
      expect.arrayContaining([
        'resource:potable-water',
        'resource:materials',
        'resource:goods',
        'resource:solid-waste',
      ]),
    )
  })
})

describe('resolveFlowSegments', () => {
  it('builds one segment per resolvable flow and skips hidden endpoints', () => {
    const flows = demoSnapshot.flows.filter((flow) => flow.systemId === 'system:aurora:energy')
    const segments = resolveFlowSegments(flows, demoSnapshot.objects, demoSnapshot.resourceTypes)
    expect(segments).toHaveLength(4)
    expect(segments[0]?.from).toEqual({ x: -32, y: 2, z: 10 })

    const visible = new Set(['object:aurora:solar-field', 'object:aurora:distribution-hub'])
    const filtered = resolveFlowSegments(flows, demoSnapshot.objects, demoSnapshot.resourceTypes, visible)
    expect(filtered.map((segment) => segment.flowId)).toEqual(['flow:aurora:energy:solar-hub'])
  })
})

describe('buildSystemGraph', () => {
  it('classifies the electricity diagram without special-casing energy', () => {
    const graph = buildSystemGraph(demoSnapshot, 'system:aurora:energy')
    expect(graph).toBeDefined()
    expect(graph?.nodes.find((node) => node.objectId === 'object:aurora:solar-field')?.column).toBe('source')
    expect(graph?.nodes.find((node) => node.objectId === 'object:aurora:distribution-hub')?.column).toBe('middle')
    expect(graph?.nodes.find((node) => node.objectId === 'object:aurora:north-habitat')?.column).toBe('sink')
    expect(graph?.edges.every((edge) => edge.resourceName === 'Electricity')).toBe(true)
  })

  it('lays out a water system from the same function', () => {
    const waterSystem: CitySystem = {
      id: 'system:meridian:water',
      cityId: 'city:meridian',
      kind: 'water',
      name: 'Meridian water sketch',
      description: 'Test-only system.',
      memberObjectIds: ['object:meridian:depot', 'object:meridian:west-habitat'],
      reliability: { status: 'demo' },
      documentIds: [],
    }
    const flow: ResourceFlow = {
      id: 'flow:test:water',
      systemId: waterSystem.id,
      resourceTypeId: 'resource:potable-water',
      sourceObjectId: 'object:meridian:depot',
      targetObjectId: 'object:meridian:west-habitat',
      reliability: { status: 'demo' },
    }
    const snapshot: CatalogSnapshot = {
      ...demoSnapshot,
      systems: [...demoSnapshot.systems, waterSystem],
      flows: [...demoSnapshot.flows, flow],
    }
    const graph = buildSystemGraph(snapshot, waterSystem.id)
    expect(graph?.nodes.find((node) => node.objectId === 'object:meridian:depot')?.column).toBe('source')
    expect(graph?.edges[0]?.resourceName).toBe('Potable water')
    expect(graph?.edges[0]?.color).toBe('#7eb6d6')
  })
})

describe('searchCatalog', () => {
  it('finds cities, objects, and systems without a short query', () => {
    expect(searchCatalog(demoSnapshot, 'a')).toEqual([])
    const hits = searchCatalog(demoSnapshot, 'aurora')
    expect(hits.map((hit) => hit.kind)).toContain('city')
    expect(hits.some((hit) => hit.id === 'object:aurora:solar-field')).toBe(true)
    expect(hits.some((hit) => hit.id === 'system:aurora:energy')).toBe(true)
  })

  it('includes a city that exists only in the snapshot passed to search', () => {
    const extra: CatalogSnapshot = {
      ...demoSnapshot,
      cities: [
        ...demoSnapshot.cities,
        {
          id: 'city:north',
          name: 'Northreach',
          summary: 'Added in a test.',
          description: 'Not part of the demo file.',
          latitude: 0,
          longitude: 0,
          developmentStatus: 'concept',
          reliability: { status: 'demo' },
        },
      ],
    }
    expect(searchCatalog(extra, 'northreach').map((hit) => hit.id)).toEqual(['city:north'])
  })
})

describe('createProjectTask', () => {
  it('rejects an empty title and a mismatched object', () => {
    expect(createProjectTask({ title: '  ', description: '', priority: 'low' }, demoSnapshot, 'task:x', '2026-10-18T00:00:00.000Z').ok).toBe(
      false,
    )
    const mismatch = createProjectTask(
      {
        title: 'Check depot',
        description: '',
        priority: 'low',
        cityId: 'city:aurora',
        objectId: 'object:meridian:depot',
      },
      demoSnapshot,
      'task:x',
      '2026-10-18T00:00:00.000Z',
    )
    expect(mismatch.ok).toBe(false)
  })

  it('stores a session task against the object city', () => {
    const result = createProjectTask(
      {
        title: 'Inspect the depot',
        description: 'Session note',
        priority: 'high',
        objectId: 'object:meridian:depot',
      },
      demoSnapshot,
      'task:session:1',
      '2026-10-18T12:00:00.000Z',
    )
    expect(result.ok).toBe(true)
    if (result.ok) {
      expect(result.task.cityId).toBe('city:meridian')
      expect(result.task.status).toBe('open')
      expect(result.task.objectId).toBe('object:meridian:depot')
    }
  })
})
