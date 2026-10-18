import { useEffect, useMemo, useState, type ReactNode } from 'react'
import { draftFromSnapshot, validateCityDraft, type CityDraft } from '../domain/layout'
import { createProjectTask } from '../domain/tasks'
import type { CatalogSnapshot, CatalogSource, City, ProjectTask } from '../domain/types'
import { applyStoredLayouts, collectStoredLayoutIssues, createUserCity, emptyCityDraft } from '../domain/user-city'
import { CatalogContext, type CatalogState, type ReadyCatalog } from './catalog-context'
import { parseLayout, readStoredLayout, serializeLayout, writeStoredLayout } from './layout-storage'

export function CatalogProvider({ source, children }: { source: CatalogSource; children: ReactNode }) {
  const [loaded, setLoaded] = useState<Exclude<CatalogState, ReadyCatalog> | { status: 'ready'; snapshot: CatalogSnapshot }>(
    { status: 'loading' },
  )
  const [sessionTasks, setSessionTasks] = useState<ProjectTask[]>([])
  const [drafts, setDrafts] = useState<CityDraft[]>([])
  const [userCities, setUserCities] = useState<City[]>([])
  const [layoutNote, setLayoutNote] = useState<string | undefined>()

  useEffect(() => {
    let active = true
    setLoaded({ status: 'loading' })
    source.load().then(
      (snapshot) => {
        if (active) {
          setLoaded({ status: 'ready', snapshot })
        }
      },
      (error: unknown) => {
        if (active) {
          const message = error instanceof Error ? error.message : 'The catalog could not be loaded.'
          setLoaded({ status: 'error', message })
        }
      },
    )
    return () => {
      active = false
    }
  }, [source])

  useEffect(() => {
    if (loaded.status !== 'ready') {
      return
    }
    const stored = readStoredLayout(loaded.snapshot)
    if (!stored.ok) {
      setLayoutNote(stored.message)
      setDrafts([])
      setUserCities([])
      return
    }
    setLayoutNote(undefined)
    setDrafts(stored.stored.drafts)
    setUserCities(stored.stored.cities)
  }, [loaded])

  const value = useMemo<CatalogState>(() => {
    if (loaded.status !== 'ready') {
      return loaded
    }
    const base = loaded.snapshot
    const snapshot = applyStoredLayouts(base, { drafts, cities: userCities })
    const remember = (nextDrafts: CityDraft[], nextCities: City[]) => {
      const issues = collectStoredLayoutIssues({ drafts: nextDrafts, cities: nextCities }, base)
      if (issues.length > 0) {
        return issues[0]
      }
      writeStoredLayout({ drafts: nextDrafts, cities: nextCities })
      setDrafts(nextDrafts)
      setUserCities(nextCities)
      setLayoutNote(undefined)
      return undefined
    }
    return {
      status: 'ready',
      snapshot,
      tasks: [...base.tasks, ...sessionTasks],
      layoutSaved: drafts.length > 0 || userCities.length > 0,
      userCityIds: userCities.map((city) => city.id),
      drafts,
      ...(layoutNote ? { layoutNote } : {}),
      addTask: (input) => {
        const draft = createProjectTask(input, snapshot, `task:session:${crypto.randomUUID()}`, new Date().toISOString())
        if (!draft.ok) {
          return draft.message
        }
        setSessionTasks((current) => [...current, draft.task])
        return undefined
      },
      createCity: (input) => {
        const existing = new Set([...base.cities, ...userCities].map((city) => city.id))
        const created = createUserCity(input, existing)
        if (!created.ok) {
          return created.message
        }
        return remember([...drafts, created.draft], [...userCities, created.city])
      },
      removeUserCity: (cityId) => {
        if (!userCities.some((city) => city.id === cityId)) {
          return
        }
        remember(drafts.filter((draft) => draft.cityId !== cityId), userCities.filter((city) => city.id !== cityId))
      },
      editCity: (cityId, change) => {
        const baseDraft = drafts.find((item) => item.cityId === cityId) ?? draftFromSnapshot(base, cityId)
        if (!baseDraft) {
          return 'That city is not in the catalog.'
        }
        const produced = change(baseDraft)
        if (!('cityId' in produced)) {
          return produced.error
        }
        const next = produced
        const issues = validateCityDraft(next, base)
        if (issues.length > 0) {
          return issues[0]
        }
        const updated = [...drafts.filter((item) => item.cityId !== cityId), next]
        return remember(updated, userCities)
      },
      replaceLayouts: (raw) => {
        const parsed = parseLayout(raw, base)
        if (!parsed.ok) {
          return parsed.message
        }
        writeStoredLayout(parsed.stored)
        setDrafts(parsed.stored.drafts)
        setUserCities(parsed.stored.cities)
        setLayoutNote(undefined)
        return undefined
      },
      resetCityLayout: (cityId) => {
        if (userCities.some((city) => city.id === cityId)) {
          const updated = [...drafts.filter((draft) => draft.cityId !== cityId), emptyCityDraft(cityId)]
          remember(updated, userCities)
          return
        }
        remember(drafts.filter((item) => item.cityId !== cityId), userCities)
      },
      exportLayouts: () => serializeLayout({ drafts, cities: userCities }),
    }
  }, [loaded, sessionTasks, drafts, userCities, layoutNote])

  return <CatalogContext.Provider value={value}>{children}</CatalogContext.Provider>
}
