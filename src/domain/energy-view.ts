import { reportCityElectricity, type CityElectricityReport, type LinkLimit, type ObjectBalance, type ObjectResourceRole } from './balance'
import type { CityObject, ResourceFlow, Vec3 } from './types'

/** Training figures. They are not measured standards and they are not written into the catalog. */
export const sampleEnergyAssumptions = {
  sourceProducesKwh: 100,
  habitatConsumesKwh: 40,
  workplaceConsumesKwh: 30,
  lineCapacityKwh: 100,
} as const

export type EnergyFacilityRole = 'source' | 'distribution' | 'consumer' | 'unassigned'

export function energyFacilityRole(facilityType: string | undefined): EnergyFacilityRole {
  switch (facilityType) {
    case 'energy-source':
      return 'source'
    case 'distribution-center':
      return 'distribution'
    case 'habitat':
    case 'workshop':
    case 'production-facility':
      return 'consumer'
    default:
      return 'unassigned'
  }
}

export function energyRoleLabel(role: EnergyFacilityRole): string {
  switch (role) {
    case 'source':
      return 'Source'
    case 'distribution':
      return 'Distribution node'
    case 'consumer':
      return 'Consumer'
    default:
      return 'Not assigned by the building type'
  }
}

export function sampleElectricityRole(objectId: string, facilityType: string | undefined): ObjectResourceRole | undefined {
  const role = energyFacilityRole(facilityType)
  if (role === 'unassigned') {
    return undefined
  }
  const consumes = facilityType === 'habitat'
    ? sampleEnergyAssumptions.habitatConsumesKwh
    : role === 'consumer'
      ? sampleEnergyAssumptions.workplaceConsumesKwh
      : 0
  const produces = role === 'source' ? sampleEnergyAssumptions.sourceProducesKwh : 0
  return {
    objectId,
    resourceTypeId: 'resource:electricity',
    produces,
    consumes,
    stores: 0,
    stock: 0,
    priority: 1,
  }
}

export type SupplyTone = 'supplied' | 'partial' | 'deficit'

export function supplyTone(item: ObjectBalance): SupplyTone | undefined {
  if (item.shortfall > 0 && item.supplied > 0) {
    return 'partial'
  }
  if (item.shortfall > 0) {
    return 'deficit'
  }
  if (item.requested > 0) {
    return 'supplied'
  }
  return undefined
}

export function supplyStatusLabel(item: ObjectBalance): string {
  const tone = supplyTone(item)
  if (tone === 'supplied') {
    return 'Fully supplied'
  }
  if (tone === 'partial') {
    return 'Partially supplied'
  }
  if (tone === 'deficit') {
    return 'Undersupplied'
  }
  return 'No electricity demand in this result'
}

export function electricitySelection(object: CityObject, report: CityElectricityReport): { title: string; lines: string[] } {
  const role = energyRoleLabel(energyFacilityRole(object.facilityType))
  const lines = [`Role: ${role}`]
  if (report.status === 'not-set') {
    lines.push(report.message)
    return { title: object.name, lines }
  }
  if (report.status === 'unavailable') {
    lines.push('Calculation impossible.')
    lines.push(report.message)
    return { title: object.name, lines }
  }
  const item = report.balance.objects.find((entry) => entry.objectId === object.id)
  if (!item) {
    lines.push('This building has no electricity result.')
    return { title: object.name, lines }
  }
  lines.push(`Demand ${item.requested} kWh/day`)
  lines.push(`Generation ${item.produced} kWh/day`)
  lines.push(`Received ${item.supplied} kWh/day`)
  lines.push(`Deficit ${item.shortfall} kWh/day`)
  lines.push(supplyStatusLabel(item))
  return { title: object.name, lines }
}

export type EnergyLineTone = 'active' | 'limited' | 'offline' | 'unknown'

export type EnergyLineDraw = {
  flowId: string
  from: Vec3
  to: Vec3
  tone: EnergyLineTone
  label?: string
  animate: boolean
}

export function electricityLineDraws(
  flows: readonly ResourceFlow[],
  objects: readonly CityObject[],
  report: CityElectricityReport,
): EnergyLineDraw[] {
  const byId = new Map(objects.map((object) => [object.id, object]))
  const draws: EnergyLineDraw[] = []
  for (const flow of flows) {
    if (flow.resourceTypeId !== 'resource:electricity') {
      continue
    }
    const source = byId.get(flow.sourceObjectId)
    const target = byId.get(flow.targetObjectId)
    if (!source || !target) {
      continue
    }
    const link = report.status === 'ready' ? report.balance.links.find((item) => item.flowId === flow.id) : undefined
    if (!link) {
      draws.push({
        flowId: flow.id,
        from: source.placement.position,
        to: target.placement.position,
        tone: 'unknown',
        animate: false,
      })
      continue
    }
    const tone: EnergyLineTone = !link.inService ? 'offline' : link.limited ? 'limited' : 'active'
    draws.push({
      flowId: flow.id,
      from: source.placement.position,
      to: target.placement.position,
      tone,
      label: `Sent ${link.sent}. Delivered ${link.arrived}.`,
      animate: link.inService && link.sent > 0,
    })
  }
  return draws
}

export function reportDraftElectricity(
  objects: readonly CityObject[],
  flows: readonly ResourceFlow[],
  draft: { resourceRoles?: readonly ObjectResourceRole[]; linkLimits?: readonly LinkLimit[] } | undefined,
): CityElectricityReport {
  const objectIds = new Set(objects.map((object) => object.id))
  const electrical = flows.filter((flow) => flow.resourceTypeId === 'resource:electricity' && objectIds.has(flow.sourceObjectId) && objectIds.has(flow.targetObjectId))
  const flowIds = new Set(electrical.map((flow) => flow.id))
  return reportCityElectricity({
    resourceTypeId: 'resource:electricity',
    flows: electrical,
    roles: (draft?.resourceRoles ?? []).filter((role) => role.resourceTypeId === 'resource:electricity' && objectIds.has(role.objectId)),
    limits: (draft?.linkLimits ?? []).filter((limit) => flowIds.has(limit.flowId)),
  })
}

export function electricityTones(report: CityElectricityReport): Map<string, SupplyTone> {
  const tones = new Map<string, SupplyTone>()
  if (report.status !== 'ready') {
    return tones
  }
  for (const item of report.balance.objects) {
    const tone = supplyTone(item)
    if (tone) {
      tones.set(item.objectId, tone)
    }
  }
  return tones
}
