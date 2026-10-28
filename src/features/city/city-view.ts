import type { CityViewMode } from '../../domain/types'

export type CityIntent = 'view' | 'edit'

export function isCityEditorPath(pathname: string): boolean {
  return pathname === '/editor' || pathname.startsWith('/editor/')
}

export function cityBasePath(editing: boolean, cityId: string): string {
  return editing ? `/editor/${cityId}` : `/cities/${cityId}`
}

export function parseCityView(value: string | null): CityViewMode {
  if (value === 'layout') {
    return 'layout'
  }
  if (value === 'systems' || value === 'flows') {
    return 'systems'
  }
  if (value === 'map') {
    return 'map'
  }
  return 'overview'
}
