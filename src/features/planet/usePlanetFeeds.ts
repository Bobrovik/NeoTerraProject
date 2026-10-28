import { useEffect, useState } from 'react'
import { fetchConflictFeed } from '../../data/conflict-feed'
import { fetchHydrography } from '../../data/hydrography'
import { fetchMajorDeposits } from '../../data/mineral-feed'
import { readPlanetFeed, writePlanetFeed } from '../../data/planet-cache'
import { fetchWorldBank } from '../../data/world-bank'
import type { ConflictFeed } from '../../domain/conflict-events'
import type { MineralDeposit } from '../../domain/mineral-deposits'
import {
  cacheDecision,
  conflictMaxAgeMs,
  defaultPlanetLayers,
  freshwaterRecords,
  hydrographyMaxAgeMs,
  joinForest,
  joinPopulation,
  mineralMaxAgeMs,
  resolveFeed,
  shouldLoadPopulation,
  worldBankMaxAgeMs,
  type FeedSnapshot,
  type ForestRecord,
  type FreshwaterRecord,
  type HydroFeature,
  type PlanetLayers,
  type PopulationRecord,
} from '../../domain/planet-feed'

export type RemoteFeed<T> = FeedSnapshot<T> | { status: 'idle' | 'loading' | 'unavailable'; current: false; error?: string }

const idle = { status: 'idle' as const, current: false as const }

export function usePlanetFeeds(layers: PlanetLayers, countryIso: string | null) {
  const [population, setPopulation] = useState<RemoteFeed<PopulationRecord[]>>(idle)
  const [forest, setForest] = useState<RemoteFeed<ForestRecord[]>>(idle)
  const [freshwater, setFreshwater] = useState<RemoteFeed<FreshwaterRecord[]>>(idle)
  const [hydrography, setHydrography] = useState<RemoteFeed<HydroFeature[]>>(idle)
  const [conflicts, setConflicts] = useState<RemoteFeed<ConflictFeed>>(idle)
  const [minerals, setMinerals] = useState<RemoteFeed<MineralDeposit[]>>(idle)

  const populationOn = layers.population
  useEffect(() => {
    if (!shouldLoadPopulation({ ...defaultPlanetLayers, population: populationOn }, countryIso)) {
      return
    }
    const controller = new AbortController()
    void loadPopulation(setPopulation, controller.signal)
    return () => controller.abort()
  }, [populationOn, countryIso])

  useEffect(() => {
    if (!layers.forests) {
      return
    }
    const controller = new AbortController()
    void loadForest(setForest, controller.signal)
    return () => controller.abort()
  }, [layers.forests])

  useEffect(() => {
    if (!layers.freshwater) {
      return
    }
    const controller = new AbortController()
    void loadFreshwater(setFreshwater, controller.signal)
    void loadHydrography(setHydrography, controller.signal)
    return () => controller.abort()
  }, [layers.freshwater])

  useEffect(() => {
    if (!layers.conflicts) {
      return
    }
    const controller = new AbortController()
    void loadIndicatorFeed(setConflicts, 'ucdp-candidate', controller.signal, fetchConflictFeed, acceptConflict, conflictMaxAgeMs)
    return () => controller.abort()
  }, [layers.conflicts])

  useEffect(() => {
    if (!layers.minerals) {
      return
    }
    const controller = new AbortController()
    void loadIndicatorFeed(setMinerals, 'usgs-major-deposits', controller.signal, async (fetchImpl) => ({ payload: await fetchMajorDeposits(fetchImpl) }), acceptMinerals, mineralMaxAgeMs)
    return () => controller.abort()
  }, [layers.minerals])

  return { population, forest, freshwater, hydrography, conflicts, minerals }
}

async function loadPopulation(setFeed: (feed: RemoteFeed<PopulationRecord[]>) => void, signal: AbortSignal) {
  await loadIndicatorFeed(setFeed, 'wb-population', signal, async (fetchImpl) => {
    const [total, growth, density] = await Promise.all([
      fetchWorldBank('SP.POP.TOTL', fetchImpl),
      fetchWorldBank('SP.POP.GROW', fetchImpl),
      fetchWorldBank('EN.POP.DNST', fetchImpl),
    ])
    return {
      sourceUpdated: total.sourceUpdated,
      payload: joinPopulation(total.rows, growth.rows, density.rows, new Date()),
    }
  }, acceptPopulation)
}

async function loadForest(setFeed: (feed: RemoteFeed<ForestRecord[]>) => void, signal: AbortSignal) {
  await loadIndicatorFeed(setFeed, 'wb-forest', signal, async (fetchImpl) => {
    const [percent, area] = await Promise.all([
      fetchWorldBank('AG.LND.FRST.ZS', fetchImpl),
      fetchWorldBank('AG.LND.FRST.K2', fetchImpl),
    ])
    return { sourceUpdated: percent.sourceUpdated, payload: joinForest(percent.rows, area.rows) }
  }, acceptForest)
}

async function loadFreshwater(setFeed: (feed: RemoteFeed<FreshwaterRecord[]>) => void, signal: AbortSignal) {
  await loadIndicatorFeed(setFeed, 'wb-freshwater', signal, async (fetchImpl) => {
    const rows = await fetchWorldBank('ER.H2O.INTR.PC', fetchImpl)
    return { sourceUpdated: rows.sourceUpdated, payload: freshwaterRecords(rows.rows) }
  }, acceptFreshwater)
}

async function loadHydrography(setFeed: (feed: RemoteFeed<HydroFeature[]>) => void, signal: AbortSignal) {
  await loadIndicatorFeed(
    setFeed,
    'natural-earth-hydro',
    signal,
    async (fetchImpl) => ({ payload: await fetchHydrography(fetchImpl) }),
    acceptHydrography,
    hydrographyMaxAgeMs,
  )
}

async function loadIndicatorFeed<T>(
  setFeed: (feed: RemoteFeed<T>) => void,
  cacheId: string,
  signal: AbortSignal,
  load: (fetchImpl: typeof fetch) => Promise<{ payload: T; sourceUpdated?: string }>,
  accept: (payload: unknown) => T | undefined,
  maxAgeMs = worldBankMaxAgeMs,
) {
  const cached = readPlanetFeed(cacheId, accept)
  const fresh = cached !== undefined && cacheDecision(cached.retrievedAt, new Date(), maxAgeMs) === 'fresh'
  if (cached) {
    setFeed({ status: 'cache', data: cached.payload, retrievedAt: cached.retrievedAt, sourceUpdated: cached.sourceUpdated, current: fresh })
    if (fresh) {
      return
    }
  } else {
    setFeed({ status: 'loading', current: false })
  }
  const snapshot = await resolveFeed({
    ...(cached ? { cached } : {}),
    now: new Date(),
    maxAgeMs,
    load: () => load((input, init) => fetch(input, { ...init, signal })),
  })
  if (signal.aborted) {
    return
  }
  if (snapshot.status === 'updated' && snapshot.data !== undefined && snapshot.retrievedAt) {
    writePlanetFeed(cacheId, {
      retrievedAt: snapshot.retrievedAt,
      ...(snapshot.sourceUpdated ? { sourceUpdated: snapshot.sourceUpdated } : {}),
      payload: snapshot.data,
    })
  }
  setFeed(snapshot)
}

function acceptPopulation(payload: unknown): PopulationRecord[] | undefined {
  return acceptRecords(payload, (row) => isIso(row.iso2) && typeof row.name === 'string' && Number.isInteger(row.year) && typeof row.population === 'number' && (row.kind === 'estimate' || row.kind === 'projection'))
}

function acceptForest(payload: unknown): ForestRecord[] | undefined {
  return acceptRecords(payload, (row) => isIso(row.iso2) && typeof row.name === 'string')
}

function acceptFreshwater(payload: unknown): FreshwaterRecord[] | undefined {
  return acceptRecords(payload, (row) => isIso(row.iso2) && typeof row.name === 'string' && Number.isInteger(row.year) && typeof row.cubicMetersPerPerson === 'number')
}

function acceptHydrography(payload: unknown): HydroFeature[] | undefined {
  return acceptRecords(payload, (row) => (row.kind === 'river' || row.kind === 'lake') && typeof row.name === 'string' && Array.isArray(row.ring))
}

function acceptConflict(payload: unknown): ConflictFeed | undefined {
  if (!payload || typeof payload !== 'object') {
    return undefined
  }
  const feed = payload as ConflictFeed
  if (typeof feed.datasetUrl !== 'string' || !feed.datasetUrl.startsWith('https://') || !Number.isInteger(feed.omittedCountryOnly) || !Array.isArray(feed.events)) {
    return undefined
  }
  const precisions = new Set(['exact', 'nearby', 'area-point', 'international'])
  if (!feed.events.every((event) => event && typeof event.id === 'string' && typeof event.latitude === 'number' && typeof event.longitude === 'number' && precisions.has(event.precision))) {
    return undefined
  }
  return feed
}

function acceptMinerals(payload: unknown): MineralDeposit[] | undefined {
  return acceptRecords(payload, (row) => typeof row.id === 'string' && typeof row.name === 'string' && typeof row.latitude === 'number' && typeof row.longitude === 'number' && Array.isArray(row.categories))
}

function acceptRecords<T>(payload: unknown, acceptRow: (row: T) => boolean): T[] | undefined {
  if (!Array.isArray(payload) || !payload.every((row) => row && typeof row === 'object' && acceptRow(row as T))) {
    return undefined
  }
  return payload as T[]
}

function isIso(value: unknown): value is string {
  return typeof value === 'string' && /^[A-Z]{2}$/.test(value)
}
