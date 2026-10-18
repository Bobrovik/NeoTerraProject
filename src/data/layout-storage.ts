import type { CityDraft } from '../domain/layout'
import type { CatalogSnapshot, City, DevelopmentStatus, ReliabilityStatus } from '../domain/types'
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
  return typeof draft.cityId === 'string' && Array.isArray(draft.objects) && Array.isArray(draft.systems) && Array.isArray(draft.flows) && Array.isArray(draft.roads)
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
