import { createContext } from 'react'
import type { CityDraft } from '../domain/layout'
import type { CatalogSnapshot, NewTaskInput, ProjectTask } from '../domain/types'
import type { CityImportChoice } from './layout-storage'
import type { UserCityInput } from '../domain/user-city'

export type ReadyCatalog = {
  status: 'ready'
  snapshot: CatalogSnapshot
  tasks: ProjectTask[]
  layoutSaved: boolean
  layoutNote?: string
  userCityIds: string[]
  drafts: CityDraft[]
  addTask: (input: NewTaskInput) => string | undefined
  createCity: (input: UserCityInput) => string | undefined
  removeUserCity: (cityId: string) => void
  editCity: (cityId: string, change: (draft: CityDraft) => CityDraft | { error: string }) => string | undefined
  replaceLayouts: (raw: string) => string | undefined
  resetCityLayout: (cityId: string) => void
  exportLayouts: () => string
  exportCity: (cityId: string) => string | undefined
  importCity: (raw: string, choice?: CityImportChoice) => { ok: true; cityId: string } | { ok: false; message: string; needsChoice?: boolean; cityId?: string }
}

export type CatalogState =
  | { status: 'loading' }
  | { status: 'error'; message: string }
  | ReadyCatalog

export const CatalogContext = createContext<CatalogState | null>(null)
