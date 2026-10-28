import { Link, useLocation, useParams } from 'react-router'
import { isCityEditorPath } from '../../features/city/city-view'
import { getCity, getDocument, getObject, getSystem } from '../../domain/queries'
import { useReadyCatalog } from '../../data/useCatalog'
import styles from './Breadcrumbs.module.css'

export function Breadcrumbs() {
  const { snapshot } = useReadyCatalog()
  const { cityId, objectId, systemId, documentId } = useParams()
  const location = useLocation()
  const city = cityId ? getCity(snapshot, cityId) : undefined
  const object = objectId ? getObject(snapshot, objectId) : undefined
  const system = systemId ? getSystem(snapshot, systemId) : undefined
  const document = documentId ? getDocument(snapshot, documentId) : undefined

  const crumbs: Array<{ label: string; to?: string }> = []
  if (location.pathname === '/') {
    crumbs.push({ label: 'Home' })
  } else if (location.pathname.startsWith('/planet')) {
    crumbs.push({ label: 'Home', to: '/' }, { label: 'Planet' })
  } else if (isCityEditorPath(location.pathname)) {
    crumbs.push({ label: 'Editor', to: '/editor' })
    if (city) {
      crumbs.push({ label: city.name, to: `/editor/${city.id}${location.search}` })
      if (object) {
        crumbs.push({ label: object.name })
      }
      if (system) {
        crumbs.push({ label: system.name })
      }
    }
  } else if (city) {
    crumbs.push({ label: 'Planet', to: '/planet' }, { label: city.name, to: `/cities/${city.id}${location.search}` })
    if (object) {
      crumbs.push({ label: object.name })
    }
    if (system) {
      crumbs.push({ label: system.name })
    }
  } else if (location.pathname.startsWith('/documents')) {
    crumbs.push({ label: 'Documents', to: '/documents' })
    if (document) {
      crumbs.push({ label: document.title })
    }
  } else if (location.pathname.startsWith('/tasks')) {
    crumbs.push({ label: 'Tasks' })
  } else if (location.pathname.startsWith('/about')) {
    crumbs.push({ label: 'About' })
  }

  if (crumbs.length === 0) {
    return null
  }

  return (
    <ol className={styles.list}>
      {crumbs.map((crumb, index) => (
        <li key={`${crumb.label}-${index}`}>
          {index > 0 ? <span aria-hidden="true"> / </span> : null}
          {crumb.to ? <Link to={crumb.to}>{crumb.label}</Link> : <span>{crumb.label}</span>}
        </li>
      ))}
    </ol>
  )
}
