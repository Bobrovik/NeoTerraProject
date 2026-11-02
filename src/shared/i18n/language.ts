import type { CatalogStore } from '../../data/resource-catalog-storage'

export const uiSettingsKey = 'future-city.settings.v1'

export const appLanguages = ['en', 'ru'] as const

export type AppLanguage = (typeof appLanguages)[number]

export function readUiLanguage(store: CatalogStore): AppLanguage {
  try {
    const raw = store.getItem(uiSettingsKey)
    if (raw === null) {
      return 'en'
    }
    const parsed: unknown = JSON.parse(raw)
    if (!isSettings(parsed)) {
      return 'en'
    }
    return parsed.language
  } catch {
    return 'en'
  }
}

export function writeUiLanguage(store: CatalogStore, language: AppLanguage): void {
  let current: Record<string, unknown> = { version: 1 }
  try {
    const raw = store.getItem(uiSettingsKey)
    if (raw !== null) {
      const parsed: unknown = JSON.parse(raw)
      if (isRecord(parsed) && parsed.version === 1) {
        current = parsed
      }
    }
  } catch {
    current = { version: 1 }
  }
  store.setItem(uiSettingsKey, JSON.stringify({ ...current, version: 1, language }))
}

function isSettings(value: unknown): value is { version: 1; language: AppLanguage } {
  return isRecord(value) && value.version === 1 && (value.language === 'en' || value.language === 'ru')
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value)
}
