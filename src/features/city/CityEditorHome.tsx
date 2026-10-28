import { useState } from 'react'
import { Link, useNavigate } from 'react-router'
import { useReadyCatalog } from '../../data/useCatalog'
import { normalizeCityId } from '../../domain/user-city'
import { developmentStatusLabel } from '../../shared/labels'
import controls from '../../shared/ui/controls.module.css'
import styles from '../planet/PlanetPage.module.css'
import { ImportCityButton } from './CityFileActions'

export function CityEditorHome() {
  const { snapshot, createCity, removeUserCity, userCityIds } = useReadyCatalog()
  const navigate = useNavigate()
  const [name, setName] = useState('')
  const [cityId, setCityId] = useState('')
  const [latitude, setLatitude] = useState('')
  const [longitude, setLongitude] = useState('')
  const [formMessage, setFormMessage] = useState<string | undefined>()

  return (
    <div className={styles.layout}>
      <section className={styles.side}>
        <h1>City editor</h1>
        <p className={controls.muted}>
          Create a city, then place buildings, roads, and resource links. The viewer opens the finished city without these tools.
        </p>
        <ul className={styles.list}>
          {snapshot.cities.map((city) => (
            <li key={city.id} className={styles.card}>
              <strong>{city.name}</strong>
              <span className={controls.muted}>{developmentStatusLabel[city.developmentStatus]}</span>
              <div className={controls.row}>
                <Link className={controls.button} to={`/editor/${city.id}`}>Edit</Link>
                <Link className={controls.ghost} to={`/cities/${city.id}`}>View</Link>
                {userCityIds.includes(city.id) ? (
                  <button type="button" className={controls.ghost} onClick={() => removeUserCity(city.id)}>Remove city</button>
                ) : null}
              </div>
            </li>
          ))}
        </ul>
      </section>
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
            const id = normalizeCityId(cityId)
            if (id) {
              navigate(`/editor/${id}`)
            }
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
        <ImportCityButton
          onImported={(result) => {
            if (!result.ok) {
              setFormMessage(result.message)
              return
            }
            setFormMessage(undefined)
            navigate(`/cities/${result.cityId}`)
          }}
        />
      </form>
    </div>
  )
}
