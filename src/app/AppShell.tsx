import { useEffect } from 'react'
import { Link, NavLink, Outlet } from 'react-router'
import { useCatalogState } from '../data/useCatalog'
import { Breadcrumbs } from '../shared/ui/Breadcrumbs'
import { SearchField } from '../shared/ui/SearchField'
import { ErrorState, LoadingState } from '../shared/ui/Status'
import { appConfig } from './config'
import styles from './AppShell.module.css'

const links = [
  { to: '/', label: 'Home', end: true },
  { to: '/planet', label: 'Planet', end: false },
  { to: '/editor', label: 'Editor', end: false },
  { to: '/documents', label: 'Documents', end: false },
  { to: '/tasks', label: 'Tasks', end: false },
  { to: '/about', label: 'About', end: false },
]

export function AppShell() {
  const catalog = useCatalogState()

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
        {catalog.status === 'ready' ? <SearchField /> : <span />}
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
