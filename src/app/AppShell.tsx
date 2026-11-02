import { useEffect } from 'react'
import { Link, NavLink, Outlet, useLocation } from 'react-router'
import { useCatalogState } from '../data/useCatalog'
import { useI18n } from '../shared/i18n/useI18n'
import { LanguageSwitcher } from '../shared/i18n/LanguageSwitcher'
import { Breadcrumbs } from '../shared/ui/Breadcrumbs'
import { SearchField } from '../shared/ui/SearchField'
import { ErrorState, LoadingState } from '../shared/ui/Status'
import { appConfig } from './config'
import styles from './AppShell.module.css'

export function AppShell() {
  const catalog = useCatalogState()
  const { t } = useI18n()
  const location = useLocation()
  const links = [
    { to: '/', label: 'Home', end: true },
    { to: '/planet', label: 'Planet', end: false },
    { to: '/catalog', label: t('nav.catalog'), end: false },
    { to: '/editor', label: 'Editor', end: false },
    { to: '/documents', label: 'Documents', end: false },
    { to: '/tasks', label: 'Tasks', end: false },
    { to: '/about', label: 'About', end: false },
  ]

  useEffect(() => {
    document.title = appConfig.name
  }, [])

  return (
    <div className={styles.shell}>
      <header className={styles.header}>
        <Link className={styles.brand} to="/">{appConfig.name}</Link>
        <nav className={styles.nav} aria-label="Primary">
          {links.map((link) => (
            <NavLink key={link.to} to={link.to} end={link.end}>
              {link.label}
            </NavLink>
          ))}
        </nav>
        <div className={styles.tools}>
          {location.pathname.startsWith('/catalog') ? <LanguageSwitcher /> : null}
          {catalog.status === 'ready' ? <SearchField /> : <span />}
        </div>
      </header>
      <main className={styles.main}>
        {catalog.status === 'loading' ? <LoadingState /> : null}
        {catalog.status === 'error' ? <ErrorState title="The catalog could not be loaded" detail={catalog.message} /> : null}
        {catalog.status === 'ready' ? (
          <>
            <Breadcrumbs />
            <Outlet />
          </>
        ) : null}
      </main>
    </div>
  )
}
