import type { LinkLimit, ObjectResourceRole } from '../domain/balance'
import { validateCityDraft, type CityDraft } from '../domain/layout'
import type { CatalogSnapshot, City, DevelopmentStatus, ReliabilityStatus, Road } from '../domain/types'
import { collectStoredLayoutIssues, type StoredLayouts } from '../domain/user-city'

export const layoutStorageKey = 'future-city.layouts.v1'

export type LayoutFile = {
  version: 1 | 2
  drafts: CityDraft[]
  cities?: City[]
}

export function serializeLayout(stored: StoredLayouts): string {
  const file: LayoutFile = { version: 2, drafts: stored.drafts, cities: stored.cities }
  return JSON.stringify(file, null, 2)
}

export function parseLayout(raw: string, snapshot: CatalogSnapshot): { ok: true; stored: StoredLayouts } | { ok: false; message: string } {
  let parsed: unknown
  try {
    parsed = JSON.parse(raw)
  } catch {
    return { ok: false, message: 'The layout file is not valid JSON.' }
  }
  const read = readLayoutFile(parsed)
  if (!read.ok) {
    return read
  }
  const issues = collectStoredLayoutIssues(read.stored, snapshot)
  if (issues.length > 0) {
    return { ok: false, message: issues[0] ?? 'The layout failed validation.' }
  }
  return { ok: true, stored: read.stored }
}

export function readStoredLayout(snapshot: CatalogSnapshot): { ok: true; stored: StoredLayouts } | { ok: false; message: string } {
  try {
    const raw = localStorage.getItem(layoutStorageKey)
    if (!raw) {
      return { ok: true, stored: { drafts: [], cities: [] } }
    }
    return parseLayout(raw, snapshot)
  } catch {
    return { ok: false, message: 'Saved layouts could not be read from this browser.' }
  }
}

export function writeStoredLayout(stored: StoredLayouts): void {
  localStorage.setItem(layoutStorageKey, serializeLayout(stored))
}

function readLayoutFile(value: unknown): { ok: true; stored: StoredLayouts } | { ok: false; message: string } {
  if (!value || typeof value !== 'object') {
    return { ok: false, message: 'The layout file is missing version 1 drafts.' }
  }
  const record = value as { version?: unknown; drafts?: unknown; cities?: unknown }
  if (record.version !== 1 && record.version !== 2) {
    return { ok: false, message: 'The layout file is missing version 1 drafts.' }
  }
  if (!Array.isArray(record.drafts) || !record.drafts.every(isDraft)) {
    return { ok: false, message: 'The layout file is missing version 1 drafts.' }
  }
  if (record.version === 1 || record.cities === undefined) {
    return { ok: true, stored: { drafts: record.drafts, cities: [] } }
  }
  if (!Array.isArray(record.cities) || !record.cities.every(isCity)) {
    return { ok: false, message: 'The layout file has a city record that is not usable.' }
  }
  return { ok: true, stored: { drafts: record.drafts, cities: record.cities } }
}

function isDraft(value: unknown): value is CityDraft {
  if (!value || typeof value !== 'object') {
    return false
  }
  const draft = value as CityDraft
  const lists = draft.resourceRoles === undefined || (Array.isArray(draft.resourceRoles) && draft.resourceRoles.every(isResourceRole))
  const limits = draft.linkLimits === undefined || (Array.isArray(draft.linkLimits) && draft.linkLimits.every(isLinkLimit))
  return typeof draft.cityId === 'string'
    && Array.isArray(draft.objects)
    && Array.isArray(draft.systems)
    && Array.isArray(draft.flows)
    && Array.isArray(draft.roads)
    && lists
    && limits
}

function isResourceRole(value: unknown): value is ObjectResourceRole {
  if (!value || typeof value !== 'object') {
    return false
  }
  const role = value as ObjectResourceRole
  return typeof role.objectId === 'string'
    && typeof role.resourceTypeId === 'string'
    && isNonNegative(role.produces)
    && isNonNegative(role.consumes)
    && isNonNegative(role.stores)
    && isNonNegative(role.stock)
    && Number.isFinite(role.priority)
}

function isLinkLimit(value: unknown): value is LinkLimit {
  if (!value || typeof value !== 'object') {
    return false
  }
  const limit = value as LinkLimit
  return typeof limit.flowId === 'string'
    && isNonNegative(limit.capacity)
    && typeof limit.loss === 'number'
    && Number.isFinite(limit.loss)
    && limit.loss >= 0
    && limit.loss <= 1
    && typeof limit.inService === 'boolean'
}

function isNonNegative(value: unknown): value is number {
  return typeof value === 'number' && Number.isFinite(value) && value >= 0
}

function isCity(value: unknown): value is City {
  if (!value || typeof value !== 'object') {
    return false
  }
  const city = value as City
  return typeof city.id === 'string'
    && typeof city.name === 'string'
    && typeof city.summary === 'string'
    && typeof city.description === 'string'
    && typeof city.latitude === 'number'
    && typeof city.longitude === 'number'
    && isDevelopmentStatus(city.developmentStatus)
    && isReliability(city.reliability)
}

function isDevelopmentStatus(value: unknown): value is DevelopmentStatus {
  return value === 'concept' || value === 'schematic'
}

function isReliability(value: unknown): value is City['reliability'] {
  if (!value || typeof value !== 'object') {
    return false
  }
  const status = (value as { status?: unknown }).status
  const known: ReliabilityStatus[] = ['verified', 'engineering-fact', 'fresco-principle', 'hypothesis', 'demo']
  return typeof status === 'string' && known.includes(status as ReliabilityStatus)
}

export const cityProjectFormat = 'future-city-project'

export type CityProject = {
  city: City
  draft: CityDraft
}

export function serializeCityProject(city: City, draft: CityDraft): string {
  return JSON.stringify({ format: cityProjectFormat, version: 1, city, draft }, null, 2)
}

export function parseCityProject(raw: string, snapshot: CatalogSnapshot): { ok: true; project: CityProject } | { ok: false; message: string } {
  let parsed: unknown
  try {
    parsed = JSON.parse(raw)
  } catch {
    return { ok: false, message: 'The city file is not valid JSON.' }
  }
  if (!parsed || typeof parsed !== 'object') {
    return { ok: false, message: 'This is not a city project file.' }
  }
  const record = parsed as { format?: unknown; version?: unknown; city?: unknown; draft?: unknown }
  if (record.format !== cityProjectFormat) {
    return { ok: false, message: 'This is not a city project file.' }
  }
  if (record.version !== 1) {
    return { ok: false, message: 'This city file uses a version this application cannot read.' }
  }
  if (!isCity(record.city) || !isDraft(record.draft)) {
    return { ok: false, message: 'The city file is missing the city or its layout.' }
  }
  if (record.draft.cityId !== record.city.id) {
    return { ok: false, message: 'The city file does not match its layout.' }
  }
  const issues = validateCityDraft(record.draft, snapshot)
  if (issues.length > 0) {
    return { ok: false, message: issues[0] ?? 'The city file failed validation.' }
  }
  return { ok: true, project: { city: record.city, draft: record.draft } }
}

export function mergeCityProject(
  stored: StoredLayouts,
  project: CityProject,
  snapshot: CatalogSnapshot,
): { ok: true; stored: StoredLayouts } | { ok: false; message: string } {
  if (snapshot.cities.some((city) => city.id === project.city.id)) {
    return { ok: false, message: `City ${project.city.id} is a demonstration city and was not imported.` }
  }
  const cities = stored.cities.some((city) => city.id === project.city.id)
    ? stored.cities.map((city) => (city.id === project.city.id ? project.city : city))
    : [...stored.cities, project.city]
  const next: StoredLayouts = {
    cities,
    drafts: [...stored.drafts.filter((draft) => draft.cityId !== project.city.id), project.draft],
  }
  const issues = collectStoredLayoutIssues(next, snapshot)
  if (issues.length > 0) {
    return { ok: false, message: issues[0] ?? 'The city file failed validation.' }
  }
  return { ok: true, stored: next }
}

export type CityImportChoice = 'copy' | 'replace'

export type CityImportCommit =
  | { ok: true; cityId: string; stored: StoredLayouts }
  | { ok: false; message: string; needsChoice?: false }
  | { ok: false; needsChoice: true; cityId: string; message: string }

export function commitCityImport(
  stored: StoredLayouts,
  project: CityProject,
  snapshot: CatalogSnapshot,
  choice?: CityImportChoice,
): CityImportCommit {
  const demo = snapshot.cities.some((city) => city.id === project.city.id)
  const saved = stored.cities.some((city) => city.id === project.city.id)
  if (demo || (saved && choice === 'copy')) {
    const copy = copyCityProject(project, takenCityIds(stored, snapshot), takenRecordIds(stored, snapshot))
    const merged = mergeCityProject(stored, copy, snapshot)
    return merged.ok ? { ok: true, cityId: copy.city.id, stored: merged.stored } : merged
  }
  if (saved && choice !== 'replace') {
    return {
      ok: false,
      needsChoice: true,
      cityId: project.city.id,
      message: `City ${project.city.id} is already saved in this browser. Replace that city, or import a copy with a new id.`,
    }
  }
  const merged = mergeCityProject(stored, project, snapshot)
  return merged.ok ? { ok: true, cityId: project.city.id, stored: merged.stored } : merged
}

function takenCityIds(stored: StoredLayouts, snapshot: CatalogSnapshot): Set<string> {
  return new Set([...snapshot.cities.map((city) => city.id), ...stored.cities.map((city) => city.id)])
}

function takenRecordIds(stored: StoredLayouts, snapshot: CatalogSnapshot): Set<string> {
  const used = new Set<string>()
  for (const object of snapshot.objects) used.add(object.id)
  for (const system of snapshot.systems) used.add(system.id)
  for (const flow of snapshot.flows) used.add(flow.id)
  for (const road of snapshot.roads) used.add(road.id)
  for (const draft of stored.drafts) rememberDraftIds(draft, used)
  return used
}

function rememberDraftIds(draft: CityDraft, used: Set<string>): void {
  for (const object of draft.objects) used.add(object.id)
  for (const system of draft.systems) used.add(system.id)
  for (const flow of draft.flows) used.add(flow.id)
  for (const road of draft.roads) used.add(road.id)
  if (draft.energyExampleBackup) rememberDraftIds(draft.energyExampleBackup, used)
}

function copyCityProject(project: CityProject, cityIds: Set<string>, recordIds: Set<string>): CityProject {
  const id = availableCityId(project.city.id, cityIds)
  const slug = id.slice('city:'.length)
  const ids = new Map<string, string>()
  assignRecordIds(project.draft, slug, recordIds, ids)
  const name = project.city.name.endsWith(' (imported)') ? project.city.name : `${project.city.name} (imported)`
  return {
    city: { ...project.city, id, name },
    draft: remapDraft(project.draft, id, ids),
  }
}

function availableCityId(sourceId: string, taken: Set<string>): string {
  const stem = sourceId.startsWith('city:') ? sourceId.slice('city:'.length) : sourceId
  const base = `city:${stem}-imported`
  if (!taken.has(base)) {
    return base
  }
  let suffix = 2
  while (taken.has(`city:${stem}-imported-${suffix}`)) {
    suffix += 1
  }
  return `city:${stem}-imported-${suffix}`
}

function assignRecordIds(draft: CityDraft, slug: string, used: Set<string>, ids: Map<string, string>): void {
  const claim = (previous: string, prefix: string) => {
    if (ids.has(previous)) {
      return
    }
    const tail = previous.split(':').slice(2).join(':')
    const body = tail.length > 0 ? tail : 'item'
    let candidate = `${prefix}:${slug}:${body}`
    let suffix = 2
    while (used.has(candidate)) {
      candidate = `${prefix}:${slug}:${body}-${suffix}`
      suffix += 1
    }
    used.add(candidate)
    ids.set(previous, candidate)
  }
  for (const object of draft.objects) claim(object.id, 'object')
  for (const system of draft.systems) claim(system.id, 'system')
  for (const flow of draft.flows) claim(flow.id, 'flow')
  for (const road of draft.roads) claim(road.id, 'road')
  if (draft.energyExampleBackup) assignRecordIds(draft.energyExampleBackup, slug, used, ids)
}

function remapDraft(draft: CityDraft, cityId: string, ids: Map<string, string>): CityDraft {
  const next: CityDraft = {
    ...draft,
    cityId,
    objects: draft.objects.map((object) => ({
      ...object,
      id: ids.get(object.id) ?? object.id,
      cityId,
      systemIds: object.systemIds.map((systemId) => ids.get(systemId) ?? systemId),
    })),
    systems: draft.systems.map((system) => ({
      ...system,
      id: ids.get(system.id) ?? system.id,
      cityId,
      memberObjectIds: system.memberObjectIds.map((objectId) => ids.get(objectId) ?? objectId),
    })),
    flows: draft.flows.map((flow) => ({
      ...flow,
      id: ids.get(flow.id) ?? flow.id,
      systemId: ids.get(flow.systemId) ?? flow.systemId,
      sourceObjectId: ids.get(flow.sourceObjectId) ?? flow.sourceObjectId,
      targetObjectId: ids.get(flow.targetObjectId) ?? flow.targetObjectId,
    })),
    roads: draft.roads.map((road) => ({
      ...road,
      id: ids.get(road.id) ?? road.id,
      cityId,
      points: road.points.map((point) => remapRoadPoint(point, ids)),
    })),
  }
  if (draft.resourceRoles) {
    next.resourceRoles = draft.resourceRoles.map((role) => ({ ...role, objectId: ids.get(role.objectId) ?? role.objectId }))
  }
  if (draft.linkLimits) {
    next.linkLimits = draft.linkLimits.map((limit) => ({ ...limit, flowId: ids.get(limit.flowId) ?? limit.flowId }))
  }
  if (draft.energyExampleBackup) {
    next.energyExampleBackup = remapDraft(draft.energyExampleBackup, cityId, ids)
  }
  return next
}

function remapRoadPoint(point: Road['points'][number], ids: Map<string, string>): Road['points'][number] {
  if (point.kind === 'object') {
    return { ...point, objectId: ids.get(point.objectId) ?? point.objectId }
  }
  return point
}
