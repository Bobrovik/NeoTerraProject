import { Link, useParams, useSearchParams } from 'react-router'
import { useReadyCatalog } from '../../data/useCatalog'
import { getCategory, getCity, objectsForCity, systemsForCity } from '../../domain/queries'
import { developmentStatusLabel } from '../../shared/labels'
import { ReliabilityBadge } from '../../shared/ui/ReliabilityBadge'
import { EmptyState } from '../../shared/ui/Status'
import controls from '../../shared/ui/controls.module.css'
import styles from './Inspector.module.css'

export function CitySummary() {
  const { snapshot } = useReadyCatalog()
  const { cityId } = useParams()
  const [searchParams] = useSearchParams()
  const city = cityId ? getCity(snapshot, cityId) : undefined
  if (!city) {
    return <EmptyState title="City not found" />
  }
  const objects = objectsForCity(snapshot, city.id)
  const systems = systemsForCity(snapshot, city.id)
  const search = searchParams.toString()

  return (
    <div className={styles.block}>
      <div className={controls.row}>
        <h2>{city.name}</h2>
        <ReliabilityBadge reliability={city.reliability} />
      </div>
      <p className={controls.muted}>{developmentStatusLabel[city.developmentStatus]}</p>
      <p>{city.description}</p>
      <section className={styles.block}>
        <h3>Systems</h3>
        {systems.length === 0 ? (
          <p className={controls.muted}>No resource systems are configured for this city.</p>
        ) : (
          <ul className={styles.list}>
            {systems.map((system) => (
              <li key={system.id}>
                <Link className={styles.item} to={`/cities/${city.id}/systems/${system.id}`}>
                  <strong>{system.name}</strong>
                  <span className={controls.muted}>{system.kind}</span>
                </Link>
              </li>
            ))}
          </ul>
        )}
      </section>
      <section className={styles.block}>
        <h3>Objects</h3>
        <ul className={styles.list}>
          {objects.map((object) => {
            const category = getCategory(snapshot, object.categoryId)
            return (
              <li key={object.id}>
                <Link className={styles.item} to={{ pathname: `/cities/${city.id}/objects/${object.id}`, search: search ? `?${search}` : '' }}>
                  <strong>{object.name}</strong>
                  <span className={controls.muted}>{category?.name ?? object.categoryId}</span>
                </Link>
              </li>
            )
          })}
        </ul>
      </section>
    </div>
  )
}
