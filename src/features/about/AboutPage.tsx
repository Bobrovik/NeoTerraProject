import { appConfig } from '../../app/config'
import styles from './AboutPage.module.css'

export function AboutPage() {
  return (
    <article className={styles.page}>
      <h1>About</h1>
      <p>
        {appConfig.name} is a local research tool for exploring how a city model can be navigated from the planet down to a building and a resource link.
        The demonstration cities are not proposals for construction, and the diagrams are not simulations.
      </p>
      <p>
        Ideas associated with Jacque Fresco and The Venus Project are labeled as principles when they appear. They stay separate from engineering facts,
        project hypotheses, placeholder data, and verified results.
      </p>
      {appConfig.publicSiteUrl ? (
        <p>
          Public site: <a href={appConfig.publicSiteUrl}>{appConfig.publicSiteUrl}</a>
        </p>
      ) : (
        <p>A public website link has not been set. Add it later in the application config.</p>
      )}
    </article>
  )
}
