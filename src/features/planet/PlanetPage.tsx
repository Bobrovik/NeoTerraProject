import { useEffect, useState } from 'react'
import { Link } from 'react-router'
import { useReadyCatalog } from '../../data/useCatalog'
import { GlobeView } from '../../3d/GlobeView'
import { SceneBoundary } from '../../3d/SceneBoundary'
import { normalizeCityId } from '../../domain/user-city'
import { developmentStatusLabel } from '../../shared/labels'
import { ReliabilityBadge } from '../../shared/ui/ReliabilityBadge'
import controls from '../../shared/ui/controls.module.css'
import styles from './PlanetPage.module.css'

export function PlanetPage() {
  const { snapshot, createCity, removeUserCity, userCityIds } = useReadyCatalog()
  const [selectedId, setSelectedId] = useState<string | null>(snapshot.cities[0]?.id ?? null)
  const [name, setName] = useState('')
  const [cityId, setCityId] = useState('')
  const [latitude, setLatitude] = useState('')
  const [longitude, setLongitude] = useState('')
  const [formMessage, setFormMessage] = useState<string | undefined>()
  const selected = snapshot.cities.find((city) => city.id === selectedId) ?? null

  useEffect(() => {
    return () => {
      document.body.style.cursor = ''
    }
  }, [])

  return (
    <div className={styles.layout}>
      <div className={styles.viewport}>
        <SceneBoundary>
          <GlobeView cities={snapshot.cities} selectedId={selectedId} onSelect={setSelectedId} />
        </SceneBoundary>
      </div>
      <aside className={styles.side}>
        <p className={controls.muted}>Drag to rotate the globe. Scroll to zoom. Markers come from the city catalog. Red areas highlight conflict regions. This view does not receive a live report.</p>
        <ul className={styles.list}>
          {snapshot.cities.map((city) => (
            <li key={city.id}>
              <button type="button" className={styles.city} aria-pressed={city.id === selectedId} onClick={() => setSelectedId(city.id)}>
                <strong>{city.name}</strong>
                <span className={controls.muted}>{city.summary}</span>
              </button>
            </li>
          ))}
        </ul>
        {selected ? (
          <article className={styles.card}>
            <div className={controls.row}>
              <h2>{selected.name}</h2>
              <ReliabilityBadge reliability={selected.reliability} />
            </div>
            <p>{selected.description}</p>
            <p className={controls.muted}>
              {developmentStatusLabel[selected.developmentStatus]} · {selected.latitude.toFixed(1)}°, {selected.longitude.toFixed(1)}°
            </p>
            <Link className={controls.button} to={`/cities/${selected.id}`}>Open city</Link>
            {userCityIds.includes(selected.id) ? (
              <button
                type="button"
                className={controls.ghost}
                onClick={() => {
                  const next = snapshot.cities.find((city) => city.id !== selected.id)
                  removeUserCity(selected.id)
                  setSelectedId(next?.id ?? null)
                }}
              >
                Remove city
              </button>
            ) : null}
          </article>
        ) : (
          <p className={controls.muted}>No cities are in the catalog.</p>
        )}
        <form
          className={styles.form}
          onSubmit={(event) => {
            event.preventDefault()
            const message = createCity({
              name,
              cityId,
              latitude: Number(latitude),
              longitude: Number(longitude),
            })
            setFormMessage(message)
            if (!message) {
              setSelectedId(normalizeCityId(cityId) ?? null)
              setName('')
              setCityId('')
              setLatitude('')
              setLongitude('')
            }
          }}
        >
          <h2>New city</h2>
          <label className={styles.field}>
            Name
            <input className={controls.field} value={name} onChange={(event) => setName(event.target.value)} required />
          </label>
          <label className={styles.field}>
            City id
            <input className={controls.field} value={cityId} onChange={(event) => setCityId(event.target.value)} placeholder="city:harbor" required />
          </label>
          <label className={styles.field}>
            Latitude
            <input className={controls.field} value={latitude} onChange={(event) => setLatitude(event.target.value)} inputMode="decimal" required />
          </label>
          <label className={styles.field}>
            Longitude
            <input className={controls.field} value={longitude} onChange={(event) => setLongitude(event.target.value)} inputMode="decimal" required />
          </label>
          <button type="submit" className={controls.button}>Create city</button>
          {formMessage ? <p className={controls.error}>{formMessage}</p> : null}
        </form>
      </aside>
    </div>
  )
}
