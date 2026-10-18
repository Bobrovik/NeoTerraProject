import { describe, expect, it } from 'vitest'
import type { CityObject, ResourceFlow } from './types'
import { electricityLineDraws, electricitySelection, electricityTones } from './energy-view'

const home = {
  id: 'object:harbor:home',
  name: 'Habitat',
  facilityType: 'habitat',
} as CityObject

describe('electricity selection text', () => {
  it('does not turn a missing calculation into zeros', () => {
    const missing = electricitySelection(home, { status: 'not-set', message: 'Power supply parameters not set' })
    expect(missing.lines.join(' ')).toContain('Power supply parameters not set')
    expect(missing.lines.join(' ')).not.toMatch(/Demand|Generation|Received|Deficit/)
    const blocked = electricitySelection(home, { status: 'unavailable', message: 'Link flow:harbor:power has no limit.' })
    expect(blocked.lines).toContain('Calculation impossible.')
    expect(blocked.lines.join(' ')).not.toMatch(/\d/)
  })

  it('reads supply status from the balance result', () => {
    const ready = electricitySelection(home, {
      status: 'ready',
      balance: {
        ok: true,
        resourceTypeId: 'resource:electricity',
        interval: 'day',
        unit: 'kWh',
        generated: 20,
        requested: 40,
        delivered: 20,
        shortfall: 20,
        limitedBy: 'generation',
        notes: [],
        links: [],
        objects: [{
          objectId: home.id,
          produced: 0,
          requested: 40,
          arrived: 20,
          supplied: 20,
          shortfall: 20,
          forwarded: 0,
          constraint: 'generation',
        }],
      },
    })
    expect(ready.lines).toContain('Received 20 kWh/day')
    expect(ready.lines).toContain('Partially supplied')
    expect(electricityTones({
      status: 'ready',
      balance: {
        ok: true,
        resourceTypeId: 'resource:electricity',
        interval: 'day',
        unit: 'kWh',
        generated: 0,
        requested: 40,
        delivered: 0,
        shortfall: 40,
        limitedBy: 'disconnected',
        notes: [],
        links: [],
        objects: [{
          objectId: home.id,
          produced: 0,
          requested: 40,
          arrived: 0,
          supplied: 0,
          shortfall: 40,
          forwarded: 0,
          constraint: 'disconnected',
        }],
      },
    }).get(home.id)).toBe('deficit')
  })

  it('labels calculated lines and leaves an impossible balance without a flow amount', () => {
    const from = { x: 0, y: 1, z: 0 }
    const to = { x: 10, y: 1, z: 0 }
    const objects = [
      { id: 'a', placement: { position: from } },
      { id: 'b', placement: { position: to } },
    ] as CityObject[]
    const flows: ResourceFlow[] = [{
      id: 'flow:1',
      systemId: 'system:harbor:energy',
      resourceTypeId: 'resource:electricity',
      sourceObjectId: 'a',
      targetObjectId: 'b',
      reliability: { status: 'demo', source: 'Test' },
    }]
    const unknown = electricityLineDraws(flows, objects, { status: 'unavailable', message: 'The connections form a cycle, so the balance cannot be calculated.' })
    expect(unknown[0]?.tone).toBe('unknown')
    expect(unknown[0]?.label).toBeUndefined()
    expect(unknown[0]?.animate).toBe(false)
    const limited = electricityLineDraws(flows, objects, {
      status: 'ready',
      balance: {
        ok: true,
        resourceTypeId: 'resource:electricity',
        interval: 'day',
        unit: 'kWh',
        generated: 100,
        requested: 40,
        delivered: 20,
        shortfall: 20,
        limitedBy: 'link',
        notes: [],
        objects: [],
        links: [{
          flowId: 'flow:1',
          sourceObjectId: 'a',
          targetObjectId: 'b',
          sent: 40,
          arrived: 20,
          capacity: 40,
          loss: 0.5,
          inService: true,
          limited: true,
        }],
      },
    })
    expect(limited[0]).toMatchObject({ tone: 'limited', label: 'Sent 40. Delivered 20.', animate: true })
  })
})
