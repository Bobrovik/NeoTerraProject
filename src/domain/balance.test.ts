import { describe, expect, it } from 'vitest'
import { calculateEnergyBalance, type BalanceInput, type LinkLimit, type ObjectResourceRole } from './balance'
import type { ResourceFlow } from './types'

const resourceTypeId = 'resource:electricity'

describe('energy balance', () => {
  it('supplies both homes when generation and both lines are large enough', () => {
    const result = calculateEnergyBalance(direct({ produces: 100, demandA: 40, demandB: 40 }))
    expect(result.ok).toBe(true)
    if (!result.ok) {
      return
    }
    expect(result.interval).toBe('day')
    expect(result.unit).toBe('kWh')
    expect(result.generated).toBe(100)
    expect(result.requested).toBe(80)
    expect(result.delivered).toBe(80)
    expect(result.shortfall).toBe(0)
    expect(result.limitedBy).toBe('none')
    expect(home(result, 'object:home-a')).toMatchObject({ supplied: 40, shortfall: 0, constraint: 'none' })
    expect(home(result, 'object:home-b')).toMatchObject({ supplied: 40, shortfall: 0, constraint: 'none' })
    expect(result.notes).toContain('Every request was met.')
  })

  it('splits a generation deficit in proportion to demand when priority is equal', () => {
    const result = calculateEnergyBalance(direct({ produces: 50, demandA: 40, demandB: 40 }))
    expect(result.ok).toBe(true)
    if (!result.ok) {
      return
    }
    expect(result.limitedBy).toBe('generation')
    expect(result.shortfall).toBe(30)
    expect(home(result, 'object:home-a').supplied).toBe(25)
    expect(home(result, 'object:home-b').supplied).toBe(25)
    expect(result.notes.some((note) => note.includes('Generation is short'))).toBe(true)
  })

  it('keeps the same proportion when the two requests are different sizes', () => {
    const result = calculateEnergyBalance(direct({ produces: 40, demandA: 20, demandB: 60 }))
    expect(result.ok).toBe(true)
    if (!result.ok) {
      return
    }
    expect(home(result, 'object:home-a').supplied).toBe(10)
    expect(home(result, 'object:home-b').supplied).toBe(30)
    expect(home(result, 'object:home-a').shortfall).toBe(10)
    expect(home(result, 'object:home-b').shortfall).toBe(30)
  })

  it('fills the lower priority number before sharing what remains', () => {
    const result = calculateEnergyBalance(direct({ produces: 50, demandA: 40, demandB: 40, priorityA: 1, priorityB: 2 }))
    expect(result.ok).toBe(true)
    if (!result.ok) {
      return
    }
    expect(home(result, 'object:home-a').supplied).toBe(40)
    expect(home(result, 'object:home-b').supplied).toBe(10)
    expect(home(result, 'object:home-a').shortfall).toBe(0)
    expect(home(result, 'object:home-b').shortfall).toBe(30)
    expect(result.limitedBy).toBe('generation')
  })

  it('names the line when generation is enough but one line is too small', () => {
    const result = calculateEnergyBalance(direct({ produces: 100, demandA: 40, demandB: 40, capacityA: 10, capacityB: 100 }))
    expect(result.ok).toBe(true)
    if (!result.ok) {
      return
    }
    expect(result.generated).toBeGreaterThanOrEqual(result.requested)
    expect(result.limitedBy).toBe('link')
    expect(home(result, 'object:home-a')).toMatchObject({ supplied: 10, shortfall: 30, constraint: 'line-capacity', constraintLineId: 'flow:plant-a' })
    expect(home(result, 'object:home-b').supplied).toBe(40)
    const line = result.links.find((item) => item.flowId === 'flow:plant-a')
    expect(line).toMatchObject({ sent: 10, arrived: 10, limited: true })
    expect(result.notes.some((note) => note.includes('flow:plant-a') && note.includes('can carry only 10'))).toBe(true)
    expect(result.notes.some((note) => note.includes('Generation covers the request'))).toBe(true)
  })

  it('delivers nothing through a line that is out of service and leaves the other home unchanged', () => {
    const result = calculateEnergyBalance(direct({ produces: 100, demandA: 40, demandB: 40, inServiceA: false }))
    expect(result.ok).toBe(true)
    if (!result.ok) {
      return
    }
    expect(result.limitedBy).toBe('disconnected')
    expect(home(result, 'object:home-a')).toMatchObject({ supplied: 0, shortfall: 40, constraint: 'disconnected' })
    expect(home(result, 'object:home-b')).toMatchObject({ supplied: 40, shortfall: 0 })
    const line = result.links.find((item) => item.flowId === 'flow:plant-a')
    expect(line).toMatchObject({ sent: 0, arrived: 0, inService: false, limited: true })
    expect(result.notes.some((note) => note.includes('out of service'))).toBe(true)
  })

  it('reduces what arrives by the loss fraction after capacity has limited the send', () => {
    const covered = calculateEnergyBalance(direct({ produces: 100, demandA: 40, demandB: 0, lossA: 0.2 }))
    expect(covered.ok).toBe(true)
    if (!covered.ok) {
      return
    }
    const coveredLine = covered.links.find((item) => item.flowId === 'flow:plant-a')
    expect(coveredLine?.sent).toBeCloseTo(50)
    expect(coveredLine?.arrived).toBeCloseTo(40)
    expect(home(covered, 'object:home-a').shortfall).toBe(0)

    const short = calculateEnergyBalance(direct({ produces: 40, demandA: 40, demandB: 0, lossA: 0.2 }))
    expect(short.ok).toBe(true)
    if (!short.ok) {
      return
    }
    const shortLine = short.links.find((item) => item.flowId === 'flow:plant-a')
    expect(shortLine?.sent).toBeCloseTo(40)
    expect(shortLine?.arrived).toBeCloseTo(32)
    expect(home(short, 'object:home-a')).toMatchObject({ supplied: 32, shortfall: 8, constraint: 'line-loss' })
    expect(short.limitedBy).toBe('link')
    expect(short.notes.some((note) => note.includes('flow:plant-a') && note.includes('loss'))).toBe(true)
  })

  it('lets a distribution node pass on what it receives without producing or consuming', () => {
    const result = calculateEnergyBalance(throughHub({ produces: 100, intoHub: 100, capacityA: 100, capacityB: 100 }))
    expect(result.ok).toBe(true)
    if (!result.ok) {
      return
    }
    expect(home(result, 'object:hub')).toMatchObject({ produced: 0, requested: 0, arrived: 80, supplied: 0, shortfall: 0, forwarded: 80 })
    expect(home(result, 'object:home-a').supplied).toBe(40)
    expect(home(result, 'object:home-b').supplied).toBe(40)
    expect(result.limitedBy).toBe('none')
  })

  it('limits each home by the hub outgoing line and still forwards only what the hub received', () => {
    const result = calculateEnergyBalance(throughHub({ produces: 100, intoHub: 100, capacityA: 10, capacityB: 100 }))
    expect(result.ok).toBe(true)
    if (!result.ok) {
      return
    }
    expect(home(result, 'object:hub')).toMatchObject({ arrived: 50, forwarded: 50, requested: 0, produced: 0 })
    expect(home(result, 'object:home-a')).toMatchObject({ supplied: 10, shortfall: 30, constraint: 'line-capacity', constraintLineId: 'flow:hub-a' })
    expect(home(result, 'object:home-b').supplied).toBe(40)
    expect(result.limitedBy).toBe('link')
  })

  it('names the line into the hub when that line is full and the plant made enough', () => {
    const result = calculateEnergyBalance(throughHub({ produces: 100, intoHub: 30, capacityA: 100, capacityB: 100 }))
    expect(result.ok).toBe(true)
    if (!result.ok) {
      return
    }
    expect(home(result, 'object:hub').arrived).toBeCloseTo(30)
    expect(home(result, 'object:hub').forwarded).toBeCloseTo(30)
    expect(home(result, 'object:home-a').supplied).toBeCloseTo(15)
    expect(home(result, 'object:home-b').supplied).toBeCloseTo(15)
    expect(home(result, 'object:home-a').constraint).toBe('line-capacity')
    expect(home(result, 'object:home-a').constraintLineId).toBe('flow:plant-hub')
    expect(result.limitedBy).toBe('link')
    expect(result.notes.some((note) => note.includes('flow:plant-hub') && note.includes('can carry only 30'))).toBe(true)
  })

  it('refuses a cycle instead of returning an estimated balance', () => {
    const input: BalanceInput = {
      resourceTypeId,
      roles: [role('object:plant', 100, 0), role('object:home-a', 0, 40)],
      flows: [
        flow('flow:loop-a', 'object:plant', 'object:home-a'),
        flow('flow:loop-b', 'object:home-a', 'object:plant'),
      ],
      limits: [limit('flow:loop-a', 100), limit('flow:loop-b', 100)],
    }
    const result = calculateEnergyBalance(input)
    expect(result.ok).toBe(false)
    if (result.ok) {
      return
    }
    expect(result.reason).toBe('cycle')
    expect(result.message).toBe('The connections form a cycle, so the balance cannot be calculated.')
    expect(result).not.toHaveProperty('delivered')
  })

  it('reports that no rates were entered and does not invent a balance', () => {
    const empty = calculateEnergyBalance({
      resourceTypeId,
      roles: [],
      flows: [flow('flow:plant-a', 'object:plant', 'object:home-a')],
      limits: [limit('flow:plant-a', 100)],
    })
    expect(empty).toEqual({ ok: false, reason: 'no-rates', message: 'No rates entered.' })

    const otherResource = calculateEnergyBalance({
      resourceTypeId,
      roles: [{ ...role('object:plant', 100, 0), resourceTypeId: 'resource:potable-water' }],
      flows: [],
      limits: [],
    })
    expect(otherResource).toEqual({ ok: false, reason: 'no-rates', message: 'No rates entered.' })
  })

  it('does not change its inputs and ignores storage, pictures, and unused flow fields', () => {
    const input = direct({ produces: 100, demandA: 40, demandB: 40 })
    input.flows = input.flows.map((item) => ({ ...item, quantity: 999, capacity: 1, loss: 0.9 }))
    input.roles = input.roles.map((item) => ({ ...item, stores: 800, stock: 500 }))
    const before = structuredClone(input)
    deepFreeze(input)
    const result = calculateEnergyBalance(input)
    expect(input).toEqual(before)
    expect(result.ok).toBe(true)
    if (!result.ok) {
      return
    }
    expect(result.delivered).toBe(80)
    const moved = calculateEnergyBalance({
      ...input,
      roles: input.roles.map((item) => ({ ...item, stock: 1, stores: 2 })),
    })
    expect(moved).toEqual(result)
    expect(result.objects.some((item) => 'placement' in item || 'representation' in item)).toBe(false)
  })
})

function direct(options: {
  produces: number
  demandA: number
  demandB: number
  priorityA?: number
  priorityB?: number
  capacityA?: number
  capacityB?: number
  lossA?: number
  inServiceA?: boolean
}): BalanceInput {
  return {
    resourceTypeId,
    roles: [
      role('object:plant', options.produces, 0),
      role('object:home-a', 0, options.demandA, options.priorityA ?? 1),
      role('object:home-b', 0, options.demandB, options.priorityB ?? 1),
    ],
    flows: [
      flow('flow:plant-a', 'object:plant', 'object:home-a'),
      flow('flow:plant-b', 'object:plant', 'object:home-b'),
    ],
    limits: [
      limit('flow:plant-a', options.capacityA ?? 100, options.lossA ?? 0, options.inServiceA ?? true),
      limit('flow:plant-b', options.capacityB ?? 100),
    ],
  }
}

function throughHub(options: { produces: number; intoHub: number; capacityA: number; capacityB: number }): BalanceInput {
  return {
    resourceTypeId,
    roles: [
      role('object:plant', options.produces, 0),
      role('object:home-a', 0, 40),
      role('object:home-b', 0, 40),
    ],
    flows: [
      flow('flow:plant-hub', 'object:plant', 'object:hub'),
      flow('flow:hub-a', 'object:hub', 'object:home-a'),
      flow('flow:hub-b', 'object:hub', 'object:home-b'),
    ],
    limits: [
      limit('flow:plant-hub', options.intoHub),
      limit('flow:hub-a', options.capacityA),
      limit('flow:hub-b', options.capacityB),
    ],
  }
}

function role(objectId: string, produces: number, consumes: number, priority = 1): ObjectResourceRole {
  return { objectId, resourceTypeId, produces, consumes, stores: 0, stock: 0, priority }
}

function limit(flowId: string, capacity: number, loss = 0, inService = true): LinkLimit {
  return { flowId, capacity, loss, inService }
}

function flow(id: string, sourceObjectId: string, targetObjectId: string): ResourceFlow {
  return {
    id,
    systemId: 'system:test:energy',
    resourceTypeId,
    sourceObjectId,
    targetObjectId,
    reliability: { status: 'demo', note: 'Test link only.' },
  }
}

function home(result: Extract<ReturnType<typeof calculateEnergyBalance>, { ok: true }>, objectId: string) {
  const found = result.objects.find((item) => item.objectId === objectId)
  if (!found) {
    throw new Error(`Missing ${objectId}`)
  }
  return found
}

function deepFreeze(value: unknown): void {
  if (!value || typeof value !== 'object' || Object.isFrozen(value)) {
    return
  }
  Object.freeze(value)
  for (const item of Object.values(value)) {
    deepFreeze(item)
  }
}
