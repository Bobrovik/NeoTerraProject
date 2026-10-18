import { Link } from 'react-router'
import { appConfig } from '../../app/config'
import { useReadyCatalog } from '../../data/useCatalog'
import { developmentStatusLabel } from '../../shared/labels'
import { ReliabilityBadge } from '../../shared/ui/ReliabilityBadge'
import controls from '../../shared/ui/controls.module.css'
import styles from './HomePage.module.css'

export function HomePage() {
  const { snapshot } = useReadyCatalog()

  return (
    <div className={styles.page}>
      <section className={styles.intro}>
        <h1>{appConfig.name}</h1>
        <p>{appConfig.tagline}</p>
        <p>
          Start from the globe, open a city, then an object or a resource diagram. The shapes are stand-ins.
          Status badges tell you when a statement is a demo, a hypothesis, or a principle from Jacque Fresco rather than a checked result.
        </p>
        <div className={controls.row}>
          <Link className={controls.button} to="/planet">Open the planet</Link>
          <Link className={controls.ghost} to="/documents">Read the notes</Link>
        </div>
      </section>
      <section className={styles.grid} aria-label="Cities">
        {snapshot.cities.map((city) => (
          <Link key={city.id} className={styles.card} to={`/cities/${city.id}`}>
            <div className={controls.row}>
              <h2>{city.name}</h2>
              <ReliabilityBadge reliability={city.reliability} />
            </div>
            <p>{city.summary}</p>
            <span className={styles.meta}>{developmentStatusLabel[city.developmentStatus]}</span>
          </Link>
        ))}
      </section>
    </div>
  )
}
