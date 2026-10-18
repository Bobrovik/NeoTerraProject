import { useMemo, useState } from 'react'
import { useNavigate } from 'react-router'
import { searchCatalog, type SearchHit } from '../../domain/search'
import { useReadyCatalog } from '../../data/useCatalog'
import styles from './SearchField.module.css'

export function SearchField() {
  const { snapshot } = useReadyCatalog()
  const navigate = useNavigate()
  const [query, setQuery] = useState('')
  const [open, setOpen] = useState(false)
  const hits = useMemo(() => searchCatalog(snapshot, query), [snapshot, query])

  function go(hit: SearchHit) {
    setQuery('')
    setOpen(false)
    if (hit.kind === 'city') {
      navigate(`/cities/${hit.id}`)
      return
    }
    if (hit.kind === 'object' && hit.cityId) {
      navigate(`/cities/${hit.cityId}/objects/${hit.id}`)
      return
    }
    if (hit.kind === 'system' && hit.cityId) {
      navigate(`/cities/${hit.cityId}/systems/${hit.id}`)
    }
  }

  return (
    <div className={styles.wrap}>
      <input
        className={styles.input}
        value={query}
        placeholder="Search cities, objects, systems"
        aria-label="Search cities, objects, and systems"
        onChange={(event) => {
          setQuery(event.target.value)
          setOpen(true)
        }}
        onFocus={() => setOpen(true)}
        onBlur={() => {
          window.setTimeout(() => setOpen(false), 150)
        }}
      />
      {open && query.trim().length > 0 ? (
        <ul className={styles.results}>
          {query.trim().length < 2 ? <li className={styles.empty}>Type at least 2 letters.</li> : null}
          {query.trim().length >= 2 && hits.length === 0 ? <li className={styles.empty}>No matches.</li> : null}
          {hits.map((hit) => (
            <li key={`${hit.kind}:${hit.id}`}>
              <button type="button" className={styles.hit} onMouseDown={() => go(hit)}>
                <span className={styles.kind}>{hit.kind}</span>
                <strong>{hit.title}</strong>
                <span>{hit.detail}</span>
              </button>
            </li>
          ))}
        </ul>
      ) : null}
    </div>
  )
}
