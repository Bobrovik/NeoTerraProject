import { createContext, useContext } from 'react'
import type { AppLanguage } from './language'
import type { MessageKey } from './messages'

export type I18n = {
  language: AppLanguage
  setLanguage: (language: AppLanguage) => void
  t: (key: MessageKey, values?: Record<string, string>) => string
}

export const LanguageContext = createContext<I18n | null>(null)

export function useI18n(): I18n {
  const value = useContext(LanguageContext)
  if (!value) {
    throw new Error('LanguageProvider is missing.')
  }
  return value
}
