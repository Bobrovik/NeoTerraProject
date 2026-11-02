import type { CardStatus, CatalogCardKind, CharacteristicAspect, EvidenceStudyType, EvidenceVerification, Priority, QuantityKind, Scarcity } from '../../domain/resource-catalog'
import type { MeasurementAccount, NetworkNoticeCode } from '../../domain/resource-network'
import type { MessageKey } from './messages'

export type Translator = (key: MessageKey, values?: Record<string, string>) => string

const kindKeys: Record<CatalogCardKind, MessageKey> = {
  resource: 'kind.resource',
  source: 'kind.source',
  consumer: 'kind.consumer',
}

const scarcityKeys: Record<Scarcity, MessageKey> = {
  surplus: 'scarcity.surplus',
  sufficient: 'scarcity.sufficient',
  'limited-access': 'scarcity.limited-access',
  scarce: 'scarcity.scarce',
  'critically-scarce': 'scarcity.critically-scarce',
  unknown: 'scarcity.unknown',
}

const priorityKeys: Record<Priority, MessageKey> = {
  P1: 'priority.P1',
  P2: 'priority.P2',
  P3: 'priority.P3',
  P4: 'priority.P4',
}

const statusKeys: Record<CardStatus, MessageKey> = {
  draft: 'status.draft',
  verified: 'status.verified',
  archived: 'status.archived',
}

const quantityKeys: Record<QuantityKind, MessageKey> = {
  mass: 'quantity.mass',
  volume: 'quantity.volume',
  density: 'quantity.density',
  power: 'quantity.power',
  energy: 'quantity.energy',
  productionRate: 'quantity.productionRate',
  consumptionRate: 'quantity.consumptionRate',
  reserve: 'quantity.reserve',
  area: 'quantity.area',
  count: 'quantity.count',
  efficiency: 'quantity.efficiency',
}

const aspectKeys: Record<CharacteristicAspect, MessageKey> = {
  property: 'aspect.property',
  quality: 'aspect.quality',
  requirement: 'aspect.requirement',
  metric: 'aspect.metric',
  operation: 'aspect.operation',
}

const studyKeys: Record<EvidenceStudyType, MessageKey> = {
  paper: 'study.paper',
  'government-statistics': 'study.government-statistics',
  study: 'study.study',
  'technical-documentation': 'study.technical-documentation',
  other: 'study.other',
}

const verificationKeys: Record<EvidenceVerification, MessageKey> = {
  unreviewed: 'verification.unreviewed',
  preliminary: 'verification.preliminary',
  verified: 'verification.verified',
}

const roleKeys = {
  produces: 'role.produces',
  uses: 'role.uses',
} as const satisfies Record<string, MessageKey>

const imageKeys = {
  icon: 'image.icon',
  photo: 'image.photo',
  diagram: 'image.diagram',
} as const satisfies Record<string, MessageKey>

const accountKeys = {
  physicalAbundance: 'account.physicalAbundance',
  totalReserves: 'account.totalReserves',
  recoverableReserves: 'account.recoverableReserves',
  supplyDeficit: 'account.supplyDeficit',
  productionVolume: 'account.productionVolume',
  outputPerTime: 'account.outputPerTime',
  maxCapacity: 'account.maxCapacity',
  energyCost: 'account.energyCost',
  efficiency: 'account.efficiency',
  footprint: 'account.footprint',
  quantityUsed: 'account.quantityUsed',
  peakLoad: 'account.peakLoad',
  averageLoad: 'account.averageLoad',
} as const satisfies Record<string, MessageKey>

const noticeKeys: Record<NetworkNoticeCode, MessageKey> = {
  duplicate: 'notice.duplicate',
  'missing-card': 'notice.missing-card',
  'wrong-kind': 'notice.wrong-kind',
  'source-unlinked': 'notice.source-unlinked',
  'consumer-unlinked': 'notice.consumer-unlinked',
  'resource-no-source': 'notice.resource-no-source',
  'resource-no-consumer': 'notice.resource-no-consumer',
}

export function kindLabel(t: Translator, kind: CatalogCardKind): string {
  return t(kindKeys[kind])
}

export function scarcityLabel(t: Translator, scarcity: Scarcity): string {
  return t(scarcityKeys[scarcity])
}

export function priorityLabel(t: Translator, priority: Priority): string {
  return t(priorityKeys[priority])
}

export function statusLabel(t: Translator, status: CardStatus): string {
  return t(statusKeys[status])
}

export function quantityLabel(t: Translator, kind: QuantityKind): string {
  return t(quantityKeys[kind])
}

export function aspectLabel(t: Translator, aspect: CharacteristicAspect): string {
  return t(aspectKeys[aspect])
}

export function studyLabel(t: Translator, study: EvidenceStudyType): string {
  return t(studyKeys[study])
}

export function verificationLabel(t: Translator, verification: EvidenceVerification): string {
  return t(verificationKeys[verification])
}

export function roleLabel(t: Translator, role: 'produces' | 'uses'): string {
  return t(roleKeys[role])
}

export function imageLabel(t: Translator, kind: 'icon' | 'photo' | 'diagram'): string {
  return t(imageKeys[kind])
}

export function accountLabel(t: Translator, account: MeasurementAccount | 'energyCost' | 'efficiency' | 'footprint'): string {
  return t(accountKeys[account])
}

export function noticeLabel(t: Translator, code: NetworkNoticeCode, name?: string): string {
  return t(noticeKeys[code], name === undefined ? undefined : { name })
}

export const scarcities = Object.keys(scarcityKeys) as Scarcity[]
export const priorities = Object.keys(priorityKeys) as Priority[]
export const statuses = Object.keys(statusKeys) as CardStatus[]
export const aspects = Object.keys(aspectKeys) as CharacteristicAspect[]
export const studyTypes = Object.keys(studyKeys) as EvidenceStudyType[]
export const verifications = Object.keys(verificationKeys) as EvidenceVerification[]
