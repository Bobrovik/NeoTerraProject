import { describe, expect, it } from 'vitest'
import { demoSnapshot } from '../../data/demo'
import { defaultInfrastructureLayers, flowsForLayers, linkLayerEntries } from './layers'

describe('infrastructure layers', () => {
  const auroraFlows = demoSnapshot.flows.filter((flow) => flow.systemId.startsWith('system:aurora'))

  it('reports empty link kinds without adding flows', () => {
    const entries = linkLayerEntries(auroraFlows, demoSnapshot.resourceTypes)
    expect(entries.map((entry) => [entry.kind, entry.empty, entry.color])).toEqual([
      ['energy', false, '#e2c27a'],
      ['water', true, '#7eb6d6'],
      ['materials', true, '#c4a484'],
      ['information', true, '#c3b7d8'],
    ])
    expect(demoSnapshot.flows).toHaveLength(auroraFlows.length + demoSnapshot.flows.filter((flow) => !flow.systemId.startsWith('system:aurora')).length)
  })

  it('hides a link kind visually while keeping the flow records', () => {
    const hidden = flowsForLayers(auroraFlows, demoSnapshot.resourceTypes, { ...defaultInfrastructureLayers, energy: false })
    expect(hidden).toHaveLength(0)
    expect(auroraFlows.length).toBeGreaterThan(0)
    const shown = flowsForLayers(auroraFlows, demoSnapshot.resourceTypes, defaultInfrastructureLayers)
    expect(shown.map((flow) => flow.id)).toEqual(auroraFlows.map((flow) => flow.id))
  })
})
