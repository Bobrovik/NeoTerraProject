import type { CityViewMode } from '../../domain/types'

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
