import { describe, expect, it } from 'vitest'
import { catalogMessageCodes } from '../../domain/catalog-message'
import { readUiLanguage, uiSettingsKey, writeUiLanguage } from './language'
import { translate } from './messages'

function memoryStore() {
  const values = new Map<string, string>()
  return {
    getItem: (key: string) => values.get(key) ?? null,
    setItem: (key: string, value: string) => { values.set(key, value) },
  }
}

describe('interface language', () => {
  it('defaults to English and keeps a chosen language', () => {
    const store = memoryStore()
    expect(readUiLanguage(store)).toBe('en')
    writeUiLanguage(store, 'ru')
    expect(readUiLanguage(store)).toBe('ru')
    expect(JSON.parse(store.getItem(uiSettingsKey) ?? '')).toMatchObject({ version: 1, language: 'ru' })
  })

  it('leaves a corrupt settings file unread as English', () => {
    const store = memoryStore()
    store.setItem(uiSettingsKey, '{')
    expect(readUiLanguage(store)).toBe('en')
    expect(store.getItem(uiSettingsKey)).toBe('{')
  })

  it('translates catalog failures without changing a stored name', () => {
    const name = 'Пресная вода'
    expect(translate('en', 'notice.resource-no-source', { name })).toBe(`“${name}” has no source.`)
    expect(translate('ru', 'notice.resource-no-source', { name })).toBe(`У «${name}» нет источника.`)
    for (const code of catalogMessageCodes) {
      expect(translate('en', code)).not.toBe(translate('ru', code))
    }
  })
})
