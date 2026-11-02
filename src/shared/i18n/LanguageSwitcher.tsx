import controls from '../ui/controls.module.css'
import { useI18n } from './useI18n'
import { appLanguages, type AppLanguage } from './language'
import styles from './LanguageSwitcher.module.css'

const marks: Record<AppLanguage, string> = { en: 'EN', ru: 'RU' }

export function LanguageSwitcher() {
  const { language, setLanguage, t } = useI18n()
  return (
    <div className={styles.group} role="group" aria-label={t('language.group')}>
      {appLanguages.map((item) => (
        <button key={item} className={controls.toggle} type="button" aria-pressed={language === item} onClick={() => setLanguage(item)}>
          {marks[item]}
        </button>
      ))}
    </div>
  )
}
