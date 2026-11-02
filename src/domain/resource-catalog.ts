export const resourceCatalogVersion = 1 as const

export type CatalogCardKind = 'resource' | 'source' | 'consumer'

export type CardStatus = 'draft' | 'verified' | 'archived'

export type Scarcity =
  | 'surplus'
  | 'sufficient'
  | 'limited-access'
  | 'scarce'
  | 'critically-scarce'
  | 'unknown'

export type Priority = 'P1' | 'P2' | 'P3' | 'P4'

export const quantityKinds = [
  'mass',
  'volume',
  'density',
  'power',
  'energy',
  'productionRate',
  'consumptionRate',
  'reserve',
  'area',
  'count',
  'efficiency',
] as const

export type QuantityKind = (typeof quantityKinds)[number]

export const characteristicAspects = ['property', 'quality', 'requirement', 'metric', 'operation'] as const

export type CharacteristicAspect = (typeof characteristicAspects)[number]

export type EvidenceStudyType =
  | 'paper'
  | 'government-statistics'
  | 'study'
  | 'technical-documentation'
  | 'other'

export type EvidenceVerification = 'unreviewed' | 'preliminary' | 'verified'

export type Evidence = {
  id: string
  title: string
  author: string
  year: number | null
  url: string | null
  studyType: EvidenceStudyType
  supports: string
  verification: EvidenceVerification
}

export type MeasuredQuantity = {
  id: string
  name: string
  value: number | null
  unit: string
  quantityKind: QuantityKind
  measuredAt?: string
  periodStart?: string
  periodEnd?: string
  conditions?: string
  evidenceId?: string
  aspect?: CharacteristicAspect
}

export type RegionalAvailability = {
  id: string
  availability?: MeasuredQuantity
  supplyDeficit?: MeasuredQuantity
}

export type ResourceAccounts = {
  physicalAbundance?: MeasuredQuantity
  totalReserves?: MeasuredQuantity
  recoverableReserves?: MeasuredQuantity
  regional: RegionalAvailability[]
  supplyDeficit?: MeasuredQuantity
}

export type SourceProfile = {
  productionVolume?: MeasuredQuantity
  outputPerTime?: MeasuredQuantity
  maxCapacity?: MeasuredQuantity
  energyCost?: MeasuredQuantity
  efficiency?: MeasuredQuantity
  footprint?: MeasuredQuantity
  operations?: string
  continuous?: boolean
  naturalConditions?: string
}

export type ConsumerProfile = {
  quantityUsed?: MeasuredQuantity
  timeUnit?: string
  peakLoad?: MeasuredQuantity
  averageLoad?: MeasuredQuantity
  served?: number | null
  operations?: string
  wasteProcessing?: string
  byproducts?: string
}

export type CatalogImage = {
  kind: 'icon' | 'photo' | 'diagram'
  url: string
}

export type CatalogCard = {
  id: string
  kind: CatalogCardKind
  name: string
  category: string
  subcategory?: string
  summary: string
  image?: CatalogImage
  status: CardStatus
  scarcity: Scarcity
  priority: Priority
  createdAt: string
  updatedAt: string
  quantities: MeasuredQuantity[]
  evidence: Evidence[]
  accounts?: ResourceAccounts
  sourceProfile?: SourceProfile
  consumerProfile?: ConsumerProfile
}

export type CatalogLink =
  | { id: string; role: 'produces'; sourceId: string; resourceId: string }
  | { id: string; role: 'uses'; consumerId: string; resourceId: string }

export type ResourceCatalog = {
  version: typeof resourceCatalogVersion
  cards: CatalogCard[]
  links: CatalogLink[]
}

export type CatalogRead = { ok: true; catalog: ResourceCatalog } | { ok: false; message: string }

export function emptyResourceCatalog(): ResourceCatalog {
  return { version: resourceCatalogVersion, cards: [], links: [] }
}

export function createCatalogCard(input: {
  id: string
  kind: CatalogCardKind
  name: string
  createdAt: string
  category?: string
  summary?: string
  scarcity: Scarcity
  priority: Priority
}): CatalogCard {
  return {
    id: input.id,
    kind: input.kind,
    name: input.name,
    category: input.category ?? '',
    summary: input.summary ?? '',
    status: 'draft',
    scarcity: input.scarcity,
    priority: input.priority,
    createdAt: input.createdAt,
    updatedAt: input.createdAt,
    quantities: [],
    evidence: [],
  }
}

export function parseResourceCatalog(value: unknown): CatalogRead {
  if (!isRecord(value)) {
    return { ok: false, message: 'The resource catalog file is not an object.' }
  }
  if (value.version !== resourceCatalogVersion) {
    return { ok: false, message: 'Версия файла каталога не поддерживается.' }
  }
  if (!Array.isArray(value.cards) || !Array.isArray(value.links)) {
    return { ok: false, message: 'The resource catalog is missing cards or links.' }
  }
  const cards: CatalogCard[] = []
  const seenCards = new Set<string>()
  for (const entry of value.cards) {
    const card = parseCard(entry)
    if (!card.ok) {
      return card
    }
    if (seenCards.has(card.card.id)) {
      return { ok: false, message: 'The resource catalog repeats a card id.' }
    }
    seenCards.add(card.card.id)
    cards.push(card.card)
  }
  const links: CatalogLink[] = []
  const seenLinks = new Set<string>()
  for (const entry of value.links) {
    const link = parseLink(entry, cards)
    if (!link.ok) {
      return link
    }
    if (seenLinks.has(link.link.id)) {
      return { ok: false, message: 'The resource catalog repeats a link id.' }
    }
    seenLinks.add(link.link.id)
    links.push(link.link)
  }
  return { ok: true, catalog: { version: resourceCatalogVersion, cards, links } }
}

function parseCard(value: unknown): { ok: true; card: CatalogCard } | { ok: false; message: string } {
  if (!isRecord(value)) {
    return { ok: false, message: 'A catalog card is not an object.' }
  }
  const id = readId(value.id)
  const name = readText(value.name)
  const category = readText(value.category)
  const summary = readText(value.summary)
  const createdAt = readId(value.createdAt)
  const updatedAt = readId(value.updatedAt)
  if (!id || name === undefined || category === undefined || summary === undefined || !createdAt || !updatedAt) {
    return { ok: false, message: 'A catalog card is missing an id or a text field.' }
  }
  if (!isCardKind(value.kind) || !isCardStatus(value.status) || !isScarcity(value.scarcity) || !isPriority(value.priority)) {
    return { ok: false, message: 'A catalog card has a kind, status, scarcity, or priority that is not supported.' }
  }
  const evidence = parseEvidenceList(value.evidence)
  if (!evidence.ok) {
    return evidence
  }
  const quantities = parseQuantityList(value.quantities, evidence.ids)
  if (!quantities.ok) {
    return quantities
  }
  const accounts = parseAccounts(value.accounts, evidence.ids)
  if (!accounts.ok) {
    return accounts
  }
  const sourceProfile = parseSourceProfile(value.sourceProfile, evidence.ids)
  if (!sourceProfile.ok) {
    return sourceProfile
  }
  const consumerProfile = parseConsumerProfile(value.consumerProfile, evidence.ids)
  if (!consumerProfile.ok) {
    return consumerProfile
  }
  if (sourceProfile.profile && value.kind !== 'source') {
    return { ok: false, message: 'A source profile belongs only on a source card.' }
  }
  if (consumerProfile.profile && value.kind !== 'consumer') {
    return { ok: false, message: 'A consumer profile belongs only on a consumer card.' }
  }
  const image = parseImage(value.image)
  if (!image.ok) {
    return image
  }
  const subcategory = readOptionalString(value, 'subcategory')
  const legacyPlace = [readOptionalString(value, 'cityId'), readOptionalString(value, 'regionId'), readOptionalString(value, 'regionLabel')]
  if (!subcategory.ok || legacyPlace.some((field) => !field.ok)) {
    return { ok: false, message: 'A catalog card has a text field that is not a string.' }
  }
  const card: CatalogCard = {
    id,
    kind: value.kind,
    name,
    category,
    summary,
    status: value.status,
    scarcity: value.scarcity,
    priority: value.priority,
    createdAt,
    updatedAt,
    quantities: quantities.quantities,
    evidence: evidence.evidence,
  }
  assignOptional(card, {
    subcategory: subcategory.value,
    image: image.image,
    accounts: accounts.accounts,
    sourceProfile: sourceProfile.profile,
    consumerProfile: consumerProfile.profile,
  })
  return { ok: true, card }
}

function parseLink(value: unknown, cards: CatalogCard[]): { ok: true; link: CatalogLink } | { ok: false; message: string } {
  if (!isRecord(value) || (value.role !== 'produces' && value.role !== 'uses')) {
    return { ok: false, message: 'A catalog link has a role that is not supported.' }
  }
  const id = readId(value.id)
  const resourceId = readId(value.resourceId)
  if (!id || !resourceId) {
    return { ok: false, message: 'A catalog link is missing an id.' }
  }
  const resource = cards.find((card) => card.id === resourceId)
  if (!resource || resource.kind !== 'resource') {
    return { ok: false, message: 'A catalog link cites a resource card that does not exist.' }
  }
  if (value.role === 'produces') {
    const sourceId = readId(value.sourceId)
    const source = sourceId ? cards.find((card) => card.id === sourceId) : undefined
    if (!sourceId || !source || source.kind !== 'source') {
      return { ok: false, message: 'A catalog link cites a source card that does not exist.' }
    }
    return { ok: true, link: { id, role: 'produces', sourceId, resourceId } }
  }
  const consumerId = readId(value.consumerId)
  const consumer = consumerId ? cards.find((card) => card.id === consumerId) : undefined
  if (!consumerId || !consumer || consumer.kind !== 'consumer') {
    return { ok: false, message: 'A catalog link cites a consumer card that does not exist.' }
  }
  return { ok: true, link: { id, role: 'uses', consumerId, resourceId } }
}

function parseEvidenceList(value: unknown): { ok: true; evidence: Evidence[]; ids: Set<string> } | { ok: false; message: string } {
  if (!Array.isArray(value)) {
    return { ok: false, message: 'A catalog card is missing its evidence list.' }
  }
  const evidence: Evidence[] = []
  const ids = new Set<string>()
  for (const entry of value) {
    const parsed = parseEvidence(entry)
    if (!parsed.ok) {
      return parsed
    }
    if (ids.has(parsed.evidence.id)) {
      return { ok: false, message: 'A catalog card repeats an evidence id.' }
    }
    ids.add(parsed.evidence.id)
    evidence.push(parsed.evidence)
  }
  return { ok: true, evidence, ids }
}

function parseEvidence(value: unknown): { ok: true; evidence: Evidence } | { ok: false; message: string } {
  if (!isRecord(value)) {
    return { ok: false, message: 'An evidence record is not an object.' }
  }
  const id = readId(value.id)
  const title = readText(value.title)
  const author = readText(value.author)
  const supports = readText(value.supports)
  if (!id || title === undefined || author === undefined || supports === undefined) {
    return { ok: false, message: 'An evidence record is missing an id or a text field.' }
  }
  if (!isStudyType(value.studyType) || !isVerification(value.verification)) {
    return { ok: false, message: 'An evidence record has a study type or verification status that is not supported.' }
  }
  const year = value.year === undefined ? null : readNullableNumber(value.year)
  const url = value.url === undefined || value.url === null ? null : readText(value.url)
  if (year === undefined || url === undefined) {
    return { ok: false, message: 'An evidence record has a year or URL that is not usable.' }
  }
  return {
    ok: true,
    evidence: { id, title, author, year, url, studyType: value.studyType, supports, verification: value.verification },
  }
}

function parseQuantityList(value: unknown, evidenceIds: Set<string>): { ok: true; quantities: MeasuredQuantity[] } | { ok: false; message: string } {
  if (!Array.isArray(value)) {
    return { ok: false, message: 'A catalog card is missing its measurements.' }
  }
  const quantities: MeasuredQuantity[] = []
  const ids = new Set<string>()
  for (const entry of value) {
    const parsed = parseQuantity(entry, evidenceIds)
    if (!parsed.ok) {
      return parsed
    }
    if (ids.has(parsed.quantity.id)) {
      return { ok: false, message: 'A catalog card repeats a measurement id.' }
    }
    ids.add(parsed.quantity.id)
    quantities.push(parsed.quantity)
  }
  return { ok: true, quantities }
}

function parseQuantity(value: unknown, evidenceIds: Set<string>): { ok: true; quantity: MeasuredQuantity } | { ok: false; message: string } {
  if (!isRecord(value)) {
    return { ok: false, message: 'A measurement is not an object.' }
  }
  const id = readId(value.id)
  const name = readText(value.name)
  const unit = readText(value.unit)
  if (!id || name === undefined || unit === undefined || !isQuantityKind(value.quantityKind)) {
    return { ok: false, message: 'A measurement is missing an id, a name, a unit, or a quantity kind.' }
  }
  if (!('value' in value)) {
    return { ok: false, message: 'A measurement must include value as a number or null.' }
  }
  const amount = readNullableNumber(value.value)
  if (amount === undefined) {
    return { ok: false, message: 'A measurement must include value as a number or null.' }
  }
  const measuredAt = readOptionalString(value, 'measuredAt')
  const periodStart = readOptionalString(value, 'periodStart')
  const periodEnd = readOptionalString(value, 'periodEnd')
  const conditions = readOptionalString(value, 'conditions')
  const evidenceId = readOptionalString(value, 'evidenceId')
  if (!measuredAt.ok || !periodStart.ok || !periodEnd.ok || !conditions.ok || !evidenceId.ok) {
    return { ok: false, message: 'A measurement has a text field that is not a string.' }
  }
  if (evidenceId.value !== undefined && !evidenceIds.has(evidenceId.value)) {
    return { ok: false, message: 'Измерение ссылается на исследование, которого нет в карточке.' }
  }
  if ('aspect' in value && value.aspect !== undefined && !isCharacteristicAspect(value.aspect)) {
    return { ok: false, message: 'A measurement has a characteristic group that is not supported.' }
  }
  const quantity: MeasuredQuantity = { id, name, value: amount, unit, quantityKind: value.quantityKind }
  assignOptional(quantity, {
    measuredAt: measuredAt.value,
    periodStart: periodStart.value,
    periodEnd: periodEnd.value,
    conditions: conditions.value,
    evidenceId: evidenceId.value,
    aspect: isCharacteristicAspect(value.aspect) ? value.aspect : undefined,
  })
  return { ok: true, quantity }
}

function parseAccounts(value: unknown, evidenceIds: Set<string>): { ok: true; accounts?: ResourceAccounts } | { ok: false; message: string } {
  if (value === undefined) {
    return { ok: true }
  }
  if (!isRecord(value) || !Array.isArray(value.regional)) {
    return { ok: false, message: 'Resource accounts are not usable.' }
  }
  const regional: RegionalAvailability[] = []
  for (const entry of value.regional) {
    const parsed = parseRegion(entry, evidenceIds)
    if (!parsed.ok) {
      return parsed
    }
    regional.push(parsed.region)
  }
  const accounts: ResourceAccounts = { regional }
  const fields = ['physicalAbundance', 'totalReserves', 'recoverableReserves', 'supplyDeficit'] as const
  for (const field of fields) {
    const parsed = parseOptionalQuantity(value[field], evidenceIds)
    if (!parsed.ok) {
      return parsed
    }
    if (parsed.quantity) {
      accounts[field] = parsed.quantity
    }
  }
  return { ok: true, accounts }
}

function parseRegion(value: unknown, evidenceIds: Set<string>): { ok: true; region: RegionalAvailability } | { ok: false; message: string } {
  if (!isRecord(value)) {
    return { ok: false, message: 'A regional availability record is not an object.' }
  }
  const id = readId(value.id)
  if (!id) {
    return { ok: false, message: 'A regional availability record is missing an id.' }
  }
  const regionId = readOptionalString(value, 'regionId')
  const regionLabel = readOptionalString(value, 'regionLabel')
  if (!regionId.ok || !regionLabel.ok) {
    return { ok: false, message: 'A regional availability record has a text field that is not a string.' }
  }
  const availability = parseOptionalQuantity(value.availability, evidenceIds)
  const supplyDeficit = parseOptionalQuantity(value.supplyDeficit, evidenceIds)
  if (!availability.ok) {
    return availability
  }
  if (!supplyDeficit.ok) {
    return supplyDeficit
  }
  const region: RegionalAvailability = { id }
  assignOptional(region, {
    availability: availability.quantity,
    supplyDeficit: supplyDeficit.quantity,
  })
  return { ok: true, region }
}

function parseSourceProfile(value: unknown, evidenceIds: Set<string>): { ok: true; profile?: SourceProfile } | { ok: false; message: string } {
  if (value === undefined) {
    return { ok: true }
  }
  if (!isRecord(value)) {
    return { ok: false, message: 'A source profile is not an object.' }
  }
  const profile: SourceProfile = {}
  const fields = ['productionVolume', 'outputPerTime', 'maxCapacity', 'energyCost', 'efficiency', 'footprint'] as const
  for (const field of fields) {
    const parsed = parseOptionalQuantity(value[field], evidenceIds)
    if (!parsed.ok) {
      return parsed
    }
    if (parsed.quantity) {
      profile[field] = parsed.quantity
    }
  }
  const operations = readOptionalString(value, 'operations')
  const naturalConditions = readOptionalString(value, 'naturalConditions')
  if (!operations.ok || !naturalConditions.ok) {
    return { ok: false, message: 'A source profile has a text field that is not a string.' }
  }
  if ('continuous' in value && value.continuous !== undefined && typeof value.continuous !== 'boolean') {
    return { ok: false, message: 'A source profile has a continuous flag that is not true or false.' }
  }
  assignOptional(profile, {
    operations: operations.value,
    naturalConditions: naturalConditions.value,
    continuous: typeof value.continuous === 'boolean' ? value.continuous : undefined,
  })
  return { ok: true, profile }
}

function parseConsumerProfile(value: unknown, evidenceIds: Set<string>): { ok: true; profile?: ConsumerProfile } | { ok: false; message: string } {
  if (value === undefined) {
    return { ok: true }
  }
  if (!isRecord(value)) {
    return { ok: false, message: 'A consumer profile is not an object.' }
  }
  const profile: ConsumerProfile = {}
  const fields = ['quantityUsed', 'peakLoad', 'averageLoad'] as const
  for (const field of fields) {
    const parsed = parseOptionalQuantity(value[field], evidenceIds)
    if (!parsed.ok) {
      return parsed
    }
    if (parsed.quantity) {
      profile[field] = parsed.quantity
    }
  }
  const timeUnit = readOptionalString(value, 'timeUnit')
  const operations = readOptionalString(value, 'operations')
  const wasteProcessing = readOptionalString(value, 'wasteProcessing')
  const byproducts = readOptionalString(value, 'byproducts')
  if (!timeUnit.ok || !operations.ok || !wasteProcessing.ok || !byproducts.ok) {
    return { ok: false, message: 'A consumer profile has a text field that is not a string.' }
  }
  if ('served' in value && value.served !== undefined) {
    const served = readNullableNumber(value.served)
    if (served === undefined) {
      return { ok: false, message: 'A consumer profile has a served count that is not a number or null.' }
    }
    profile.served = served
  }
  assignOptional(profile, {
    timeUnit: timeUnit.value,
    operations: operations.value,
    wasteProcessing: wasteProcessing.value,
    byproducts: byproducts.value,
  })
  return { ok: true, profile }
}

function parseOptionalQuantity(value: unknown, evidenceIds: Set<string>): { ok: true; quantity?: MeasuredQuantity } | { ok: false; message: string } {
  if (value === undefined) {
    return { ok: true }
  }
  const parsed = parseQuantity(value, evidenceIds)
  if (!parsed.ok) {
    return parsed
  }
  return { ok: true, quantity: parsed.quantity }
}

function parseImage(value: unknown): { ok: true; image?: CatalogImage } | { ok: false; message: string } {
  if (value === undefined) {
    return { ok: true }
  }
  if (!isRecord(value) || (value.kind !== 'icon' && value.kind !== 'photo' && value.kind !== 'diagram') || typeof value.url !== 'string') {
    return { ok: false, message: 'A catalog image is not usable.' }
  }
  return { ok: true, image: { kind: value.kind, url: value.url } }
}

function assignOptional(target: object, fields: Record<string, unknown>): void {
  const record = target as Record<string, unknown>
  for (const [key, value] of Object.entries(fields)) {
    if (value !== undefined) {
      record[key] = value
    }
  }
}

function readOptionalString(record: Record<string, unknown>, key: string): { ok: true; value?: string } | { ok: false } {
  if (!(key in record) || record[key] === undefined) {
    return { ok: true }
  }
  if (typeof record[key] !== 'string') {
    return { ok: false }
  }
  return { ok: true, value: record[key] }
}

function readId(value: unknown): string | undefined {
  return typeof value === 'string' && value.length > 0 ? value : undefined
}

function readText(value: unknown): string | undefined {
  return typeof value === 'string' ? value : undefined
}

function readNullableNumber(value: unknown): number | null | undefined {
  if (value === null) {
    return null
  }
  if (typeof value === 'number' && Number.isFinite(value)) {
    return value
  }
  return undefined
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value)
}

function isCardKind(value: unknown): value is CatalogCardKind {
  return value === 'resource' || value === 'source' || value === 'consumer'
}

function isCardStatus(value: unknown): value is CardStatus {
  return value === 'draft' || value === 'verified' || value === 'archived'
}

function isScarcity(value: unknown): value is Scarcity {
  return value === 'surplus'
    || value === 'sufficient'
    || value === 'limited-access'
    || value === 'scarce'
    || value === 'critically-scarce'
    || value === 'unknown'
}

function isPriority(value: unknown): value is Priority {
  return value === 'P1' || value === 'P2' || value === 'P3' || value === 'P4'
}

function isQuantityKind(value: unknown): value is QuantityKind {
  return typeof value === 'string' && (quantityKinds as readonly string[]).includes(value)
}

function isCharacteristicAspect(value: unknown): value is CharacteristicAspect {
  return typeof value === 'string' && (characteristicAspects as readonly string[]).includes(value)
}

function isStudyType(value: unknown): value is EvidenceStudyType {
  return value === 'paper'
    || value === 'government-statistics'
    || value === 'study'
    || value === 'technical-documentation'
    || value === 'other'
}

function isVerification(value: unknown): value is EvidenceVerification {
  return value === 'unreviewed' || value === 'preliminary' || value === 'verified'
}
