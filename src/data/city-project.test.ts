import { describe, expect, it } from 'vitest'
import { demoSnapshot } from '../data/demo'
import { commitCityImport, mergeCityProject, parseCityProject, serializeCityProject } from '../data/layout-storage'
import { reportCityElectricity } from '../domain/balance'
import { buildingTemplates } from '../domain/buildings'
import { loadEnergyExample, upsertRoad } from '../domain/layout'
import { applyStoredLayouts, createUserCity } from '../domain/user-city'

describe('city project file', () => {
  it('exports a city and restores objects, roads, links, and energy parameters', () => {
    const created = createUserCity({ name: 'Harbor', cityId: 'city:harbor', latitude: 10, longitude: 20 }, new Set(demoSnapshot.cities.map((city) => city.id)))
    const ridge = createUserCity({ name: 'Ridge', cityId: 'city:ridge', latitude: 3, longitude: 4 }, new Set(['city:aurora', 'city:meridian', 'city:harbor']))
    expect(created.ok && ridge.ok).toBe(true)
    if (!created.ok || !ridge.ok) {
      return
    }
    const example = loadEnergyExample(created.draft, buildingTemplates, demoSnapshot.resourceTypes)
    expect('error' in example).toBe(false)
    if ('error' in example) {
      return
    }
    const draft = upsertRoad(example, {
      id: 'road:harbor:main',
      cityId: 'city:harbor',
      points: [{ kind: 'control', x: 8, z: 12 }, { kind: 'control', x: 20, z: 4 }],
    })
    const raw = serializeCityProject(created.city, draft)
    const parsed = parseCityProject(raw, demoSnapshot)
    expect(parsed.ok).toBe(true)
    if (!parsed.ok) {
      return
    }
    const merged = mergeCityProject({ cities: [ridge.city], drafts: [ridge.draft] }, parsed.project, demoSnapshot)
    expect(merged.ok).toBe(true)
    if (!merged.ok) {
      return
    }
    const restored = merged.stored.drafts.find((item) => item.cityId === 'city:harbor')
    expect(restored?.objects.map((object) => object.placement.position)).toEqual(draft.objects.map((object) => object.placement.position))
    expect(restored?.roads).toEqual(draft.roads)
    expect(restored?.flows).toEqual(draft.flows)
    expect(restored?.systems).toEqual(draft.systems)
    expect(restored?.resourceRoles).toEqual(draft.resourceRoles)
    expect(restored?.linkLimits).toEqual(draft.linkLimits)
    expect(restored?.energyExampleBackup?.objects.map((object) => object.id)).toEqual(draft.energyExampleBackup?.objects.map((object) => object.id))
    expect(merged.stored.drafts.find((item) => item.cityId === 'city:ridge')?.objects).toEqual([])
    const applied = applyStoredLayouts(demoSnapshot, merged.stored)
    expect(applied.objects.filter((object) => object.cityId === 'city:aurora')).toEqual(demoSnapshot.objects.filter((object) => object.cityId === 'city:aurora'))
    expect(applied.objects.filter((object) => object.cityId === 'city:meridian')).toEqual(demoSnapshot.objects.filter((object) => object.cityId === 'city:meridian'))
    const balance = reportCityElectricity({
      resourceTypeId: 'resource:electricity',
      flows: restored?.flows ?? [],
      roles: restored?.resourceRoles ?? [],
      limits: restored?.linkLimits ?? [],
    })
    expect(balance.status).toBe('ready')
    if (balance.status === 'ready') {
      expect(balance.balance.generated).toBe(100)
      expect(balance.balance.requested).toBe(70)
      expect(balance.balance.shortfall).toBe(0)
    }

    const replaced = mergeCityProject(merged.stored, parsed.project, demoSnapshot)
    expect(replaced.ok).toBe(true)
    if (replaced.ok) {
      expect(replaced.stored.cities.filter((city) => city.id === 'city:harbor')).toHaveLength(1)
      expect(replaced.stored.drafts.filter((item) => item.cityId === 'city:harbor')).toHaveLength(1)
    }
  })

  it('rejects a demonstration city, an unknown version, and a whole-browser layout file', () => {
    const created = createUserCity({ name: 'Harbor', cityId: 'city:harbor', latitude: 1, longitude: 2 }, new Set(demoSnapshot.cities.map((city) => city.id)))
    expect(created.ok).toBe(true)
    if (!created.ok) {
      return
    }
    const aurora = demoSnapshot.cities.find((city) => city.id === 'city:aurora')
    expect(aurora).toBeDefined()
    if (!aurora) {
      return
    }
    const demoFile = parseCityProject(serializeCityProject(aurora, {
      cityId: aurora.id,
      objects: demoSnapshot.objects.filter((object) => object.cityId === aurora.id),
      systems: demoSnapshot.systems.filter((system) => system.cityId === aurora.id),
      flows: demoSnapshot.flows,
      roads: demoSnapshot.roads.filter((road) => road.cityId === aurora.id),
    }), demoSnapshot)
    expect(demoFile.ok).toBe(true)
    if (!demoFile.ok) {
      return
    }
    expect(mergeCityProject({ cities: [], drafts: [] }, demoFile.project, demoSnapshot).ok).toBe(false)

    expect(parseCityProject(JSON.stringify({ format: 'future-city-project', version: 2, city: created.city, draft: created.draft }), demoSnapshot).ok).toBe(false)
    expect(parseCityProject(JSON.stringify({ version: 2, drafts: [], cities: [] }), demoSnapshot).ok).toBe(false)
    expect(parseCityProject('{', demoSnapshot).ok).toBe(false)
  })

  it('imports a demonstration city as a copy and leaves the original in place', () => {
    const aurora = demoSnapshot.cities.find((city) => city.id === 'city:aurora')
    const meridian = demoSnapshot.cities.find((city) => city.id === 'city:meridian')
    expect(aurora && meridian).toBeTruthy()
    if (!aurora || !meridian) {
      return
    }
    const project = parseCityProject(serializeCityProject(aurora, {
      cityId: aurora.id,
      objects: demoSnapshot.objects.filter((object) => object.cityId === aurora.id),
      systems: demoSnapshot.systems.filter((system) => system.cityId === aurora.id),
      flows: demoSnapshot.flows.filter((flow) => demoSnapshot.systems.some((system) => system.cityId === aurora.id && system.id === flow.systemId)),
      roads: demoSnapshot.roads.filter((road) => road.cityId === aurora.id),
    }), demoSnapshot)
    expect(project.ok).toBe(true)
    if (!project.ok) {
      return
    }
    const imported = commitCityImport({ cities: [], drafts: [] }, project.project, demoSnapshot)
    expect(imported.ok).toBe(true)
    if (!imported.ok) {
      return
    }
    expect(imported.cityId).toBe('city:aurora-imported')
    const copy = imported.stored.drafts[0]
    expect(copy?.cityId).toBe('city:aurora-imported')
    expect(copy?.objects.map((object) => object.placement)).toEqual(project.project.draft.objects.map((object) => object.placement))
    expect(copy?.flows).toHaveLength(project.project.draft.flows.length)
    expect(copy?.objects.every((object) => object.id.startsWith('object:aurora-imported:'))).toBe(true)
    expect(new Set(copy?.objects.map((object) => object.id)).size).toBe(copy?.objects.length)
    const applied = applyStoredLayouts(demoSnapshot, imported.stored)
    expect(applied.objects.filter((object) => object.cityId === 'city:aurora')).toEqual(demoSnapshot.objects.filter((object) => object.cityId === 'city:aurora'))
    expect(applied.objects.filter((object) => object.cityId === 'city:meridian')).toEqual(demoSnapshot.objects.filter((object) => object.cityId === 'city:meridian'))
    expect(applied.cities.filter((city) => city.id === 'city:aurora')).toHaveLength(1)

    const again = commitCityImport(imported.stored, project.project, demoSnapshot)
    expect(again.ok).toBe(true)
    if (again.ok) {
      expect(again.cityId).toBe('city:aurora-imported-2')
    }
  })

  it('restores a free user city, asks before replacing one, and keeps the balance on a copy', () => {
    const created = createUserCity({ name: 'Harbor', cityId: 'city:harbor', latitude: 10, longitude: 20 }, new Set(demoSnapshot.cities.map((city) => city.id)))
    expect(created.ok).toBe(true)
    if (!created.ok) {
      return
    }
    const example = loadEnergyExample(created.draft, buildingTemplates, demoSnapshot.resourceTypes)
    expect('error' in example).toBe(false)
    if ('error' in example) {
      return
    }
    const draft = upsertRoad(example, {
      id: 'road:harbor:main',
      cityId: 'city:harbor',
      points: [{ kind: 'control', x: 8, z: 12 }, { kind: 'control', x: 20, z: 4 }],
    })
    const parsed = parseCityProject(serializeCityProject(created.city, draft), demoSnapshot)
    expect(parsed.ok).toBe(true)
    if (!parsed.ok) {
      return
    }
    const restored = commitCityImport({ cities: [], drafts: [] }, parsed.project, demoSnapshot)
    expect(restored.ok).toBe(true)
    if (!restored.ok) {
      return
    }
    expect(restored.cityId).toBe('city:harbor')
    expect(restored.stored.drafts[0]?.resourceRoles).toEqual(draft.resourceRoles)
    expect(restored.stored.drafts[0]?.linkLimits).toEqual(draft.linkLimits)

    const blocked = commitCityImport(restored.stored, parsed.project, demoSnapshot)
    expect(blocked.ok).toBe(false)
    if (!blocked.ok) {
      expect(blocked.needsChoice).toBe(true)
    }
    expect(restored.stored.cities).toHaveLength(1)

    const renamed = { ...parsed.project, city: { ...parsed.project.city, name: 'Harbor renamed' } }
    const replaced = commitCityImport(restored.stored, renamed, demoSnapshot, 'replace')
    expect(replaced.ok).toBe(true)
    if (replaced.ok) {
      expect(replaced.stored.cities.map((city) => city.name)).toEqual(['Harbor renamed'])
      expect(replaced.stored.drafts).toHaveLength(1)
    }

    const copied = commitCityImport(restored.stored, parsed.project, demoSnapshot, 'copy')
    expect(copied.ok).toBe(true)
    if (!copied.ok) {
      return
    }
    expect(copied.cityId).toBe('city:harbor-imported')
    const copy = copied.stored.drafts.find((item) => item.cityId === 'city:harbor-imported')
    const balance = reportCityElectricity({
      resourceTypeId: 'resource:electricity',
      flows: copy?.flows ?? [],
      roles: copy?.resourceRoles ?? [],
      limits: copy?.linkLimits ?? [],
    })
    expect(balance.status).toBe('ready')
    if (balance.status === 'ready') {
      expect(balance.balance.generated).toBe(100)
      expect(balance.balance.requested).toBe(70)
      expect(balance.balance.shortfall).toBe(0)
    }
    expect(copied.stored.drafts.find((item) => item.cityId === 'city:harbor')?.objects.map((object) => object.id)).toEqual(draft.objects.map((object) => object.id))
    expect(applyStoredLayouts(demoSnapshot, copied.stored).objects.filter((object) => object.cityId === 'city:aurora')).toEqual(
      demoSnapshot.objects.filter((object) => object.cityId === 'city:aurora'),
    )
  })
})
