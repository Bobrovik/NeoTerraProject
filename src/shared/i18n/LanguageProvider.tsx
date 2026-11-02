import { useMemo, useState, type ReactNode } from 'react'
import { readUiLanguage, writeUiLanguage, type AppLanguage } from './language'
import { translate } from './messages'
import { LanguageContext, type I18n } from './useI18n'

export function LanguageProvider({ children }: { children: ReactNode }) {
  const [language, setLanguageState] = useState<AppLanguage>(() => readUiLanguage(localStorage))
  const value = useMemo<I18n>(() => ({
    language,
    setLanguage: (next) => {
      writeUiLanguage(localStorage, next)
      setLanguageState(next)
    },
    t: (key, values) => translate(language, key, values),
  }), [language])
  return <LanguageContext.Provider value={value}>{children}</LanguageContext.Provider>
}
