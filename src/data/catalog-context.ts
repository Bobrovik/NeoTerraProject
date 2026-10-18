import { createContext } from 'react'
import type { CityDraft } from '../domain/layout'
import type { CatalogSnapshot, NewTaskInput, ProjectTask } from '../domain/types'
import type { UserCityInput } from '../domain/user-city'

export type ReadyCatalog = {
  status: 'ready'
  snapshot: CatalogSnapshot
  tasks: ProjectTask[]
  layoutSaved: boolean
  layoutNote?: string
  userCityIds: string[]
  addTask: (input: NewTaskInput) => string | undefined
  createCity: (input: UserCityInput) => string | undefined
  removeUserCity: (cityId: string) => void
  editCity: (cityId: string, change: (draft: CityDraft) => CityDraft | { error: string }) => string | undefined
  replaceLayouts: (raw: string) => string | undefined
  resetCityLayout: (cityId: string) => void
  exportLayouts: () => string
}

export type CatalogState =
  | { status: 'loading' }
  | { status: 'error'; message: string }
  | ReadyCatalog

export const CatalogContext = createContext<CatalogState | null>(null)
