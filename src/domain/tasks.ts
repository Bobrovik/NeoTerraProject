import type { CatalogSnapshot, NewTaskInput, ProjectTask } from './types'
import { getCity, getObject, getSystem } from './queries'

export type TaskDraftResult = { ok: true; task: ProjectTask } | { ok: false; message: string }

export function createProjectTask(
  input: NewTaskInput,
  snapshot: CatalogSnapshot,
  id: string,
  nowIso: string,
): TaskDraftResult {
  const title = input.title.trim()
  if (!title) {
    return { ok: false, message: 'A task needs a title.' }
  }

  const cityId = emptyToUndefined(input.cityId)
  const objectId = emptyToUndefined(input.objectId)
  const systemId = emptyToUndefined(input.systemId)

  if (cityId && !getCity(snapshot, cityId)) {
    return { ok: false, message: 'The selected city is not in the catalog.' }
  }

  if (objectId) {
    const object = getObject(snapshot, objectId)
    if (!object) {
      return { ok: false, message: 'The selected object is not in the catalog.' }
    }
    if (cityId && object.cityId !== cityId) {
      return { ok: false, message: 'The object belongs to a different city.' }
    }
  }

  if (systemId) {
    const system = getSystem(snapshot, systemId)
    if (!system) {
      return { ok: false, message: 'The selected system is not in the catalog.' }
    }
    if (cityId && system.cityId !== cityId) {
      return { ok: false, message: 'The system belongs to a different city.' }
    }
  }

  const resolvedCityId = cityId ?? cityIdFromLinks(snapshot, objectId, systemId)

  return {
    ok: true,
    task: {
      id,
      title,
      description: input.description.trim(),
      status: 'open',
      priority: input.priority,
      documentIds: [],
      createdAt: nowIso,
      updatedAt: nowIso,
      ...(resolvedCityId ? { cityId: resolvedCityId } : {}),
      ...(objectId ? { objectId } : {}),
      ...(systemId ? { systemId } : {}),
    },
  }
}

function cityIdFromLinks(
  snapshot: CatalogSnapshot,
  objectId: string | undefined,
  systemId: string | undefined,
): string | undefined {
  if (objectId) {
    return getObject(snapshot, objectId)?.cityId
  }
  if (systemId) {
    return getSystem(snapshot, systemId)?.cityId
  }
  return undefined
}

function emptyToUndefined(value: string | undefined): string | undefined {
  const trimmed = value?.trim()
  return trimmed ? trimmed : undefined
}
