import type { CacheEnvelope } from '../domain/planet-feed'

const storageKey = 'future-city.planet-feeds.v1'

type PlanetCacheFile = {
  version: 1
  feeds: Record<string, CacheEnvelope<unknown>>
}

export function readPlanetFeed<T>(id: string, accept: (payload: unknown) => T | undefined): CacheEnvelope<T> | undefined {
  const file = readFile()
  const envelope = file?.feeds[id]
  if (!envelope || typeof envelope.retrievedAt !== 'string') {
    return undefined
  }
  const payload = accept(envelope.payload)
  if (payload === undefined) {
    return undefined
  }
  return {
    retrievedAt: envelope.retrievedAt,
    ...(typeof envelope.sourceUpdated === 'string' ? { sourceUpdated: envelope.sourceUpdated } : {}),
    payload,
  }
}

export function writePlanetFeed<T>(id: string, envelope: CacheEnvelope<T>): void {
  const file = readFile() ?? { version: 1 as const, feeds: {} }
  file.feeds[id] = envelope
  try {
    localStorage.setItem(storageKey, JSON.stringify(file))
  } catch {
    // The globe can still show the response for this session when storage is full.
  }
}

function readFile(): PlanetCacheFile | undefined {
  try {
    const raw = localStorage.getItem(storageKey)
    if (!raw) {
      return undefined
    }
    const parsed = JSON.parse(raw) as PlanetCacheFile
    if (!parsed || parsed.version !== 1 || !parsed.feeds || typeof parsed.feeds !== 'object') {
      return undefined
    }
    return parsed
  } catch {
    return undefined
  }
}
