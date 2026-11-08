import { catalogFailure, type CatalogMessageCode } from './catalog-message'
import { findProperty, type QuantityLibrary } from './quantity/definitions'
import { legacyKindForQuantity } from './quantity/legacy'
import {
  parseResourceCatalog,
  type CatalogCard,
  type CatalogImage,
  type CatalogLink,
  type ConsumerProfile,
  type Evidence,
  type EvidenceStudyType,
  type EvidenceVerification,
  type MeasuredQuantity,
  type CharacteristicAspect,
  type QuantityKind,
  type RegionalAvailability,
  type ValueOrigin,
  type ResourceAccounts,
  type ResourceCatalog,
  type SourceProfile,
} from './resource-catalog'

export type QuantityDraft = {
  id: string
  name: string
  valueText: string
  unit: string
  quantityKind: QuantityKind | ''
  propertyId: string
  quantityId: string
  unitId: string
  valueOrigin: ValueOrigin | ''
  method: string
  uncertaintyText: string
  lowerText: string
  upperText: string
  textValue: string
  conditionTemperatureText: string
  conditionTemperatureUnitId: string
  conditionPressureText: string
  conditionPressureUnitId: string
  measuredAt: string
  periodStart: string
  periodEnd: string
  conditions: string
  evidenceId: string
  aspect: CharacteristicAspect | ''
}

export type EvidenceDraft = {
  id: string
  title: string
  author: string
  yearText: string
  url: string
  studyType: EvidenceStudyType
  supports: string
  verification: EvidenceVerification
}

export type RegionDraft = {
  id: string
  availability: QuantityDraft
  supplyDeficit: QuantityDraft
}

export type CardDraft = {
  id: string
  kind: CatalogCard['kind']
  name: string
  category: string
  subcategory: string
  summary: string
  imageKind: CatalogImage['kind']
  imageUrl: string
  status: CatalogCard['status']
  priority: CatalogCard['priority']
  scarcity: CatalogCard['scarcity']
  createdAt: string
  quantities: QuantityDraft[]
  evidence: EvidenceDraft[]
  physicalAbundance: QuantityDraft
  totalReserves: QuantityDraft
  recoverableReserves: QuantityDraft
  supplyDeficit: QuantityDraft
  regional: RegionDraft[]
  productionVolume: QuantityDraft
  outputPerTime: QuantityDraft
  maxCapacity: QuantityDraft
  energyCost: QuantityDraft
  efficiency: QuantityDraft
  footprint: QuantityDraft
  sourceOperations: string
  continuous: '' | 'yes' | 'no'
  naturalConditions: string
  producedResourceIds: string[]
  quantityUsed: QuantityDraft
  timeUnit: string
  peakLoad: QuantityDraft
  averageLoad: QuantityDraft
  servedText: string
  consumerOperations: string
  wasteProcessing: string
  byproducts: string
  usedResourceIds: string[]
}

export function blankQuantity(id: string): QuantityDraft {
  return {
    id,
    name: '',
    valueText: '',
    unit: '',
    quantityKind: '',
    propertyId: '',
    quantityId: '',
    unitId: '',
    valueOrigin: '',
    method: '',
    uncertaintyText: '',
    lowerText: '',
    upperText: '',
    textValue: '',
    conditionTemperatureText: '',
    conditionTemperatureUnitId: '',
    conditionPressureText: '',
    conditionPressureUnitId: '',
    measuredAt: '',
    periodStart: '',
    periodEnd: '',
    conditions: '',
    evidenceId: '',
    aspect: '',
  }
}

export function createCardDraft(input: { id: string; kind: CatalogCard['kind']; createdAt: string }): CardDraft {
  return {
    id: input.id,
    kind: input.kind,
    name: '',
    category: '',
    subcategory: '',
    summary: '',
    imageKind: 'photo',
    imageUrl: '',
    status: 'draft',
    priority: 'P3',
    scarcity: 'unknown',
    createdAt: input.createdAt,
    quantities: [],
    evidence: [],
    physicalAbundance: blankQuantity(`${input.id}:physical`),
    totalReserves: blankQuantity(`${input.id}:total`),
    recoverableReserves: blankQuantity(`${input.id}:recoverable`),
    supplyDeficit: blankQuantity(`${input.id}:deficit`),
    regional: [],
    productionVolume: blankQuantity(`${input.id}:production`),
    outputPerTime: blankQuantity(`${input.id}:output`),
    maxCapacity: blankQuantity(`${input.id}:capacity`),
    energyCost: blankQuantity(`${input.id}:energy-cost`),
    efficiency: blankQuantity(`${input.id}:efficiency`),
    footprint: blankQuantity(`${input.id}:footprint`),
    sourceOperations: '',
    continuous: '',
    naturalConditions: '',
    producedResourceIds: [],
    quantityUsed: blankQuantity(`${input.id}:used`),
    timeUnit: '',
    peakLoad: blankQuantity(`${input.id}:peak`),
    averageLoad: blankQuantity(`${input.id}:average`),
    servedText: '',
    consumerOperations: '',
    wasteProcessing: '',
    byproducts: '',
    usedResourceIds: [],
  }
}

export function cardToDraft(card: CatalogCard, links: readonly CatalogLink[], library?: QuantityLibrary): CardDraft {
  const draft = createCardDraft({ id: card.id, kind: card.kind, createdAt: card.createdAt })
  draft.name = card.name
  draft.category = card.category
  draft.subcategory = card.subcategory ?? ''
  draft.summary = card.summary
  draft.imageKind = card.image?.kind ?? 'photo'
  draft.imageUrl = card.image?.url ?? ''
  draft.status = card.status
  draft.priority = card.priority
  draft.scarcity = card.scarcity
  draft.quantities = card.quantities.map((quantity) => quantityToDraft(quantity, quantity.id, library))
  draft.evidence = card.evidence.map(evidenceToDraft)
  draft.physicalAbundance = quantityToDraft(card.accounts?.physicalAbundance, draft.physicalAbundance.id, library)
  draft.totalReserves = quantityToDraft(card.accounts?.totalReserves, draft.totalReserves.id, library)
  draft.recoverableReserves = quantityToDraft(card.accounts?.recoverableReserves, draft.recoverableReserves.id, library)
  draft.supplyDeficit = quantityToDraft(card.accounts?.supplyDeficit, draft.supplyDeficit.id, library)
  draft.regional = (card.accounts?.regional ?? []).map((region) => ({
    id: region.id,
    availability: quantityToDraft(region.availability, `${region.id}:availability`, library),
    supplyDeficit: quantityToDraft(region.supplyDeficit, `${region.id}:deficit`, library),
  }))
  draft.productionVolume = quantityToDraft(card.sourceProfile?.productionVolume, draft.productionVolume.id, library)
  draft.outputPerTime = quantityToDraft(card.sourceProfile?.outputPerTime, draft.outputPerTime.id, library)
  draft.maxCapacity = quantityToDraft(card.sourceProfile?.maxCapacity, draft.maxCapacity.id, library)
  draft.energyCost = quantityToDraft(card.sourceProfile?.energyCost, draft.energyCost.id, library)
  draft.efficiency = quantityToDraft(card.sourceProfile?.efficiency, draft.efficiency.id, library)
  draft.footprint = quantityToDraft(card.sourceProfile?.footprint, draft.footprint.id, library)
  draft.sourceOperations = card.sourceProfile?.operations ?? ''
  draft.continuous = card.sourceProfile?.continuous === undefined ? '' : card.sourceProfile.continuous ? 'yes' : 'no'
  draft.naturalConditions = card.sourceProfile?.naturalConditions ?? ''
  draft.producedResourceIds = links.filter((link) => link.role === 'produces' && link.sourceId === card.id).map((link) => link.resourceId)
  draft.quantityUsed = quantityToDraft(card.consumerProfile?.quantityUsed, draft.quantityUsed.id, library)
  draft.timeUnit = card.consumerProfile?.timeUnit ?? ''
  draft.peakLoad = quantityToDraft(card.consumerProfile?.peakLoad, draft.peakLoad.id, library)
  draft.averageLoad = quantityToDraft(card.consumerProfile?.averageLoad, draft.averageLoad.id, library)
  draft.servedText = card.consumerProfile?.served === undefined || card.consumerProfile.served === null ? '' : String(card.consumerProfile.served)
  draft.consumerOperations = card.consumerProfile?.operations ?? ''
  draft.wasteProcessing = card.consumerProfile?.wasteProcessing ?? ''
  draft.byproducts = card.consumerProfile?.byproducts ?? ''
  draft.usedResourceIds = links.filter((link) => link.role === 'uses' && link.consumerId === card.id).map((link) => link.resourceId)
  return draft
}

export function removeEvidenceDraft(draft: CardDraft, evidenceId: string): CardDraft {
  const clear = (quantity: QuantityDraft): QuantityDraft => (
    quantity.evidenceId === evidenceId ? { ...quantity, evidenceId: '' } : quantity
  )
  return {
    ...draft,
    evidence: draft.evidence.filter((item) => item.id !== evidenceId),
    quantities: draft.quantities.map(clear),
    physicalAbundance: clear(draft.physicalAbundance),
    totalReserves: clear(draft.totalReserves),
    recoverableReserves: clear(draft.recoverableReserves),
    supplyDeficit: clear(draft.supplyDeficit),
    regional: draft.regional.map((region) => ({
      ...region,
      availability: clear(region.availability),
      supplyDeficit: clear(region.supplyDeficit),
    })),
    productionVolume: clear(draft.productionVolume),
    outputPerTime: clear(draft.outputPerTime),
    maxCapacity: clear(draft.maxCapacity),
    energyCost: clear(draft.energyCost),
    efficiency: clear(draft.efficiency),
    footprint: clear(draft.footprint),
    quantityUsed: clear(draft.quantityUsed),
    peakLoad: clear(draft.peakLoad),
    averageLoad: clear(draft.averageLoad),
  }
}

export function applyCardDraft(
  catalog: ResourceCatalog,
  draft: CardDraft,
  now: string,
): { ok: true; catalog: ResourceCatalog } | { ok: false; message: CatalogMessageCode } {
  const evidence = draftEvidence(draft.evidence)
  if (!evidence.ok) {
    return evidence
  }
  const evidenceIds = new Set(evidence.evidence.map((item) => item.id))
  const quantities = draftQuantities(draft.quantities, evidenceIds)
  if (!quantities.ok) {
    return quantities
  }
  const accounts = draftAccounts(draft, evidenceIds)
  if (!accounts.ok) {
    return accounts
  }
  const sourceProfile = draft.kind === 'source' ? draftSource(draft, evidenceIds) : { ok: true as const }
  if (!sourceProfile.ok) {
    return sourceProfile
  }
  const consumerProfile = draft.kind === 'consumer' ? draftConsumer(draft, evidenceIds) : { ok: true as const }
  if (!consumerProfile.ok) {
    return consumerProfile
  }
  const card: CatalogCard = {
    id: draft.id,
    kind: draft.kind,
    name: draft.name.trim(),
    category: draft.category.trim(),
    summary: draft.summary.trim(),
    status: draft.status,
    scarcity: draft.scarcity,
    priority: draft.priority,
    createdAt: draft.createdAt,
    updatedAt: now,
    quantities: quantities.quantities,
    evidence: evidence.evidence,
  }
  assignText(card, { subcategory: draft.subcategory })
  const imageUrl = draft.imageUrl.trim()
  if (imageUrl) {
    card.image = { kind: draft.imageKind, url: imageUrl }
  }
  if (accounts.accounts) {
    card.accounts = accounts.accounts
  }
  if (sourceProfile.ok && sourceProfile.profile) {
    card.sourceProfile = sourceProfile.profile
  }
  if (consumerProfile.ok && consumerProfile.profile) {
    card.consumerProfile = consumerProfile.profile
  }
  const links = linksForDraft(catalog, draft)
  if (!links.ok) {
    return links
  }
  const cards = catalog.cards.some((item) => item.id === card.id)
    ? catalog.cards.map((item) => item.id === card.id ? card : item)
    : [...catalog.cards, card]
  return parseResourceCatalog({ version: 1, cards, links: links.links })
}

function draftEvidence(rows: readonly EvidenceDraft[]): { ok: true; evidence: Evidence[] } | { ok: false; message: CatalogMessageCode } {
  const evidence: Evidence[] = []
  for (const row of rows) {
    if (isBlankEvidence(row)) {
      continue
    }
    const year = readOptionalNumber(row.yearText)
    if (!year.ok) {
      return year
    }
    if (year.value !== null && !Number.isInteger(year.value)) {
      return catalogFailure('form.year')
    }
    evidence.push({
      id: row.id,
      title: row.title.trim(),
      author: row.author.trim(),
      year: year.value,
      url: row.url.trim() ? row.url.trim() : null,
      studyType: row.studyType,
      supports: row.supports.trim(),
      verification: row.verification,
    })
  }
  return { ok: true, evidence }
}

function draftQuantities(
  rows: readonly QuantityDraft[],
  evidenceIds: Set<string>,
): { ok: true; quantities: MeasuredQuantity[] } | { ok: false; message: CatalogMessageCode } {
  const quantities: MeasuredQuantity[] = []
  for (const row of rows) {
    const parsed = toQuantity(row, evidenceIds)
    if (!parsed.ok) {
      return parsed
    }
    if (parsed.quantity) {
      quantities.push(parsed.quantity)
    }
  }
  return { ok: true, quantities }
}

function draftAccounts(
  draft: CardDraft,
  evidenceIds: Set<string>,
): { ok: true; accounts?: ResourceAccounts } | { ok: false; message: CatalogMessageCode } {
  const accounts: ResourceAccounts = { regional: [] }
  const fields = [
    ['physicalAbundance', draft.physicalAbundance],
    ['totalReserves', draft.totalReserves],
    ['recoverableReserves', draft.recoverableReserves],
    ['supplyDeficit', draft.supplyDeficit],
  ] as const
  for (const [field, row] of fields) {
    const parsed = toQuantity(row, evidenceIds)
    if (!parsed.ok) {
      return parsed
    }
    if (parsed.quantity) {
      accounts[field] = parsed.quantity
    }
  }
  for (const region of draft.regional) {
    const availability = toQuantity(region.availability, evidenceIds)
    const supplyDeficit = toQuantity(region.supplyDeficit, evidenceIds)
    if (!availability.ok) {
      return availability
    }
    if (!supplyDeficit.ok) {
      return supplyDeficit
    }
    const next: RegionalAvailability = { id: region.id }
    if (availability.quantity) {
      next.availability = availability.quantity
    }
    if (supplyDeficit.quantity) {
      next.supplyDeficit = supplyDeficit.quantity
    }
    if (next.availability || next.supplyDeficit) {
      accounts.regional.push(next)
    }
  }
  if (!accounts.physicalAbundance && !accounts.totalReserves && !accounts.recoverableReserves && !accounts.supplyDeficit && accounts.regional.length === 0) {
    return { ok: true }
  }
  return { ok: true, accounts }
}

function draftSource(
  draft: CardDraft,
  evidenceIds: Set<string>,
): { ok: true; profile?: SourceProfile } | { ok: false; message: CatalogMessageCode } {
  const profile: SourceProfile = {}
  const fields = [
    ['productionVolume', draft.productionVolume],
    ['outputPerTime', draft.outputPerTime],
    ['maxCapacity', draft.maxCapacity],
    ['energyCost', draft.energyCost],
    ['efficiency', draft.efficiency],
    ['footprint', draft.footprint],
  ] as const
  for (const [field, row] of fields) {
    const parsed = toQuantity(row, evidenceIds)
    if (!parsed.ok) {
      return parsed
    }
    if (parsed.quantity) {
      profile[field] = parsed.quantity
    }
  }
  assignText(profile, { operations: draft.sourceOperations, naturalConditions: draft.naturalConditions })
  if (draft.continuous === 'yes') {
    profile.continuous = true
  }
  if (draft.continuous === 'no') {
    profile.continuous = false
  }
  if (Object.keys(profile).length === 0) {
    return { ok: true }
  }
  return { ok: true, profile }
}

function draftConsumer(
  draft: CardDraft,
  evidenceIds: Set<string>,
): { ok: true; profile?: ConsumerProfile } | { ok: false; message: CatalogMessageCode } {
  const profile: ConsumerProfile = {}
  const fields = [
    ['quantityUsed', draft.quantityUsed],
    ['peakLoad', draft.peakLoad],
    ['averageLoad', draft.averageLoad],
  ] as const
  for (const [field, row] of fields) {
    const parsed = toQuantity(row, evidenceIds)
    if (!parsed.ok) {
      return parsed
    }
    if (parsed.quantity) {
      profile[field] = parsed.quantity
    }
  }
  assignText(profile, {
    timeUnit: draft.timeUnit,
    operations: draft.consumerOperations,
    wasteProcessing: draft.wasteProcessing,
    byproducts: draft.byproducts,
  })
  if (draft.servedText.trim()) {
    const served = readOptionalNumber(draft.servedText)
    if (!served.ok) {
      return served
    }
    if (served.value !== null) {
      profile.served = served.value
    }
  }
  if (Object.keys(profile).length === 0) {
    return { ok: true }
  }
  return { ok: true, profile }
}

function linksForDraft(catalog: ResourceCatalog, draft: CardDraft): { ok: true; links: CatalogLink[] } | { ok: false; message: CatalogMessageCode } {
  const kept = catalog.links.filter((link) => {
    if (link.role === 'produces') {
      return link.sourceId !== draft.id
    }
    return link.consumerId !== draft.id
  })
  const resourceIds = unique(draft.kind === 'source' ? draft.producedResourceIds : draft.kind === 'consumer' ? draft.usedResourceIds : [])
  const links = [...kept]
  for (const resourceId of resourceIds) {
    const resource = catalog.cards.find((card) => card.id === resourceId)
    if (!resource || resource.kind !== 'resource') {
      return catalogFailure('form.resource')
    }
    if (draft.kind === 'source') {
      const previous = catalog.links.find((link) => link.role === 'produces' && link.sourceId === draft.id && link.resourceId === resourceId)
      links.push(previous ?? { id: `link:${draft.id}:${resourceId}:produces`, role: 'produces', sourceId: draft.id, resourceId })
    }
    if (draft.kind === 'consumer') {
      const previous = catalog.links.find((link) => link.role === 'uses' && link.consumerId === draft.id && link.resourceId === resourceId)
      links.push(previous ?? { id: `link:${draft.id}:${resourceId}:uses`, role: 'uses', consumerId: draft.id, resourceId })
    }
  }
  return { ok: true, links }
}

function toQuantity(
  draft: QuantityDraft,
  evidenceIds: Set<string>,
): { ok: true; quantity?: MeasuredQuantity } | { ok: false; message: CatalogMessageCode } {
  if (isBlankQuantity(draft)) {
    return { ok: true }
  }
  const amount = readOptionalNumber(draft.valueText)
  const uncertainty = readOptionalNumber(draft.uncertaintyText)
  const lower = readOptionalNumber(draft.lowerText)
  const upper = readOptionalNumber(draft.upperText)
  const temperature = readOptionalNumber(draft.conditionTemperatureText)
  const pressure = readOptionalNumber(draft.conditionPressureText)
  const failed = [amount, uncertainty, lower, upper, temperature, pressure].find((item) => !item.ok)
  if (failed && !failed.ok) {
    return failed
  }
  if (!amount.ok || !uncertainty.ok || !lower.ok || !upper.ok || !temperature.ok || !pressure.ok) {
    return catalogFailure('form.number')
  }
  if (lower.value !== null && upper.value !== null && upper.value < lower.value) {
    return catalogFailure('form.number')
  }
  const mappedKind = draft.propertyId ? legacyKindForQuantity(draft.quantityId || undefined, draft.propertyId) : undefined
  const quantity: MeasuredQuantity = {
    id: draft.id,
    name: draft.name.trim(),
    value: amount.value,
    unit: draft.unit.trim(),
  }
  if (draft.propertyId) {
    quantity.propertyId = draft.propertyId
    if (draft.unitId) {
      quantity.unitId = draft.unitId
    }
    if (mappedKind) {
      quantity.quantityKind = mappedKind
    }
  } else if (draft.quantityKind) {
    quantity.quantityKind = draft.quantityKind
  }
  if (draft.valueOrigin) {
    quantity.valueOrigin = draft.valueOrigin
  }
  if (uncertainty.value !== null) {
    quantity.uncertainty = uncertainty.value
  }
  if (lower.value !== null) {
    quantity.lower = lower.value
  }
  if (upper.value !== null) {
    quantity.upper = upper.value
  }
  if (temperature.value !== null && draft.conditionTemperatureUnitId) {
    quantity.conditionTemperature = { value: temperature.value, unitId: draft.conditionTemperatureUnitId }
  }
  if (pressure.value !== null && draft.conditionPressureUnitId) {
    quantity.conditionPressure = { value: pressure.value, unitId: draft.conditionPressureUnitId }
  }
  assignText(quantity, {
    measuredAt: draft.measuredAt,
    periodStart: draft.periodStart,
    periodEnd: draft.periodEnd,
    conditions: draft.conditions,
    method: draft.method,
    textValue: draft.textValue,
  })
  if (draft.aspect) {
    quantity.aspect = draft.aspect
  }
  if (draft.evidenceId && evidenceIds.has(draft.evidenceId)) {
    quantity.evidenceId = draft.evidenceId
  }
  return { ok: true, quantity }
}

function quantityToDraft(quantity: MeasuredQuantity | undefined, fallbackId: string, library?: QuantityLibrary): QuantityDraft {
  if (!quantity) {
    return blankQuantity(fallbackId)
  }
  const defined = quantity.propertyId && library ? findProperty(library, quantity.propertyId) : undefined
  return {
    id: quantity.id,
    name: quantity.name,
    valueText: quantity.value === null ? '' : String(quantity.value),
    unit: quantity.unit,
    quantityKind: quantity.quantityKind ?? '',
    propertyId: quantity.propertyId ?? '',
    quantityId: defined?.quantityId ?? '',
    unitId: quantity.unitId ?? '',
    valueOrigin: quantity.valueOrigin ?? '',
    method: quantity.method ?? '',
    uncertaintyText: quantity.uncertainty === undefined ? '' : String(quantity.uncertainty),
    lowerText: quantity.lower === undefined ? '' : String(quantity.lower),
    upperText: quantity.upper === undefined ? '' : String(quantity.upper),
    textValue: quantity.textValue ?? '',
    conditionTemperatureText: quantity.conditionTemperature ? String(quantity.conditionTemperature.value) : '',
    conditionTemperatureUnitId: quantity.conditionTemperature?.unitId ?? '',
    conditionPressureText: quantity.conditionPressure ? String(quantity.conditionPressure.value) : '',
    conditionPressureUnitId: quantity.conditionPressure?.unitId ?? '',
    measuredAt: quantity.measuredAt ?? '',
    periodStart: quantity.periodStart ?? '',
    periodEnd: quantity.periodEnd ?? '',
    conditions: quantity.conditions ?? '',
    evidenceId: quantity.evidenceId ?? '',
    aspect: quantity.aspect ?? '',
  }
}

function evidenceToDraft(evidence: Evidence): EvidenceDraft {
  return {
    id: evidence.id,
    title: evidence.title,
    author: evidence.author,
    yearText: evidence.year === null ? '' : String(evidence.year),
    url: evidence.url ?? '',
    studyType: evidence.studyType,
    supports: evidence.supports,
    verification: evidence.verification,
  }
}

function isBlankQuantity(draft: QuantityDraft): boolean {
  return [draft.name, draft.valueText, draft.unit, draft.propertyId, draft.method, draft.uncertaintyText, draft.lowerText, draft.upperText, draft.textValue, draft.measuredAt, draft.periodStart, draft.periodEnd, draft.conditions, draft.evidenceId]
    .every((value) => value.trim() === '')
}

function isBlankEvidence(draft: EvidenceDraft): boolean {
  return [draft.title, draft.author, draft.yearText, draft.url, draft.supports].every((value) => value.trim() === '')
}

function readOptionalNumber(text: string): { ok: true; value: number | null } | { ok: false; message: CatalogMessageCode } {
  const trimmed = text.trim()
  if (!trimmed) {
    return { ok: true, value: null }
  }
  const value = Number(trimmed)
  if (!Number.isFinite(value)) {
    return catalogFailure('form.number')
  }
  return { ok: true, value }
}

function assignText(target: object, fields: Record<string, string>): void {
  const record = target as Record<string, unknown>
  for (const [key, value] of Object.entries(fields)) {
    const trimmed = value.trim()
    if (trimmed) {
      record[key] = trimmed
    }
  }
}

function unique(values: readonly string[]): string[] {
  return [...new Set(values.filter((value) => value.trim() !== ''))]
}
