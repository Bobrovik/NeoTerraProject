import { useState } from 'react'
import { Link } from 'react-router'
import { readResourceCatalog } from '../../data/resource-catalog-storage'
import type { CardStatus, CatalogCardKind, Priority, Scarcity } from '../../domain/resource-catalog'
import {
  cardStatusLabels,
  catalogCategories,
  catalogKindLabels,
  countCardsByKind,
  listCatalogCards,
  priorityLabels,
  scarcityLabels,
  type CatalogListQuery,
  type CatalogSort,
} from '../../domain/resource-catalog-view'
import { EmptyState, ErrorState } from '../../shared/ui/Status'
import controls from '../../shared/ui/controls.module.css'
import styles from './CatalogPage.module.css'

const kinds: CatalogCardKind[] = ['resource', 'source', 'consumer']
const scarcities = Object.keys(scarcityLabels) as Scarcity[]
const priorities = Object.keys(priorityLabels) as Priority[]
const statuses = Object.keys(cardStatusLabels) as CardStatus[]

const initialQuery: CatalogListQuery = {
  kind: 'all',
  text: '',
  category: '',
  scarcity: '',
  priority: '',
  status: '',
  sort: 'name',
}

function KindMark({ kind }: { kind: CatalogCardKind }) {
  return (
    <span className={styles.kind}>
      <span className={`${styles.swatch} ${styles[kind]}`} aria-hidden="true" />
      {catalogKindLabels[kind]}
    </span>
  )
}

export function CatalogPage() {
  const [stored] = useState(() => readResourceCatalog(localStorage))
  const [query, setQuery] = useState<CatalogListQuery>(initialQuery)

  if (!stored.ok) {
    return <ErrorState title="The resource catalog could not be read" detail={stored.message} />
  }

  const counts = countCardsByKind(stored.catalog.cards)
  const categories = catalogCategories(stored.catalog.cards)
  const cards = listCatalogCards(stored.catalog.cards, query)
  const update = (patch: Partial<CatalogListQuery>) => setQuery((current) => ({ ...current, ...patch }))

  return (
    <div className={styles.page}>
      <header className={styles.heading}>
        <div>
          <h1>Catalog</h1>
          <p className={controls.muted}>
            Resources, the sources that provide them, and the consumers that use them.
          </p>
          <p className={styles.counts}>
            {kinds.map((kind) => (
              <span key={kind} className={styles.count}>
                <KindMark kind={kind} />
                {counts[kind]}
              </span>
            ))}
          </p>
        </div>
        <div className={styles.actions}>
          <Link className={controls.ghost} to="/catalog/network">Resource network</Link>
          <Link className={controls.button} to="/catalog/new">Create card</Link>
        </div>
      </header>
      <div className={styles.tabs} role="group" aria-label="Card type">
        <button className={controls.toggle} type="button" aria-pressed={query.kind === 'all'} onClick={() => update({ kind: 'all' })}>All</button>
        {kinds.map((kind) => (
          <button key={kind} className={controls.toggle} type="button" aria-pressed={query.kind === kind} onClick={() => update({ kind })}>
            <KindMark kind={kind} />
          </button>
        ))}
      </div>
      <div className={styles.filters}>
        <label className={controls.stack}>
          Search
          <input className={controls.field} value={query.text} onChange={(event) => update({ text: event.target.value })} placeholder="Name, description, or category" />
        </label>
        <label className={controls.stack}>
          Category
          <select className={controls.select} value={query.category} onChange={(event) => update({ category: event.target.value })}>
            <option value="">All categories</option>
            {categories.map((category) => <option key={category} value={category}>{category}</option>)}
          </select>
        </label>
        <label className={controls.stack}>
          Scarcity
          <select className={controls.select} value={query.scarcity} onChange={(event) => update({ scarcity: event.target.value as Scarcity | '' })}>
            <option value="">All scarcity levels</option>
            {scarcities.map((scarcity) => <option key={scarcity} value={scarcity}>{scarcityLabels[scarcity]}</option>)}
          </select>
        </label>
        <label className={controls.stack}>
          Priority
          <select className={controls.select} value={query.priority} onChange={(event) => update({ priority: event.target.value as Priority | '' })}>
            <option value="">All priorities</option>
            {priorities.map((priority) => <option key={priority} value={priority}>{priorityLabels[priority]}</option>)}
          </select>
        </label>
        <label className={controls.stack}>
          Status
          <select className={controls.select} value={query.status} onChange={(event) => update({ status: event.target.value as CardStatus | '' })}>
            <option value="">All statuses</option>
            {statuses.map((status) => <option key={status} value={status}>{cardStatusLabels[status]}</option>)}
          </select>
        </label>
        <label className={controls.stack}>
          Sort
          <select className={controls.select} value={query.sort} onChange={(event) => update({ sort: event.target.value as CatalogSort })}>
            <option value="name">Name</option>
            <option value="created">Creation date</option>
            <option value="updated">Modification date</option>
            <option value="priority">Priority</option>
          </select>
        </label>
      </div>
      {stored.catalog.cards.length === 0 ? (
        <EmptyState title="No cards yet" detail="Create a card to record a resource, a source, or a consumer." />
      ) : null}
      {stored.catalog.cards.length > 0 && cards.length === 0 ? (
        <EmptyState title="No matching cards" detail="Nothing in the saved catalog matches this search and these filters." />
      ) : null}
      {cards.length > 0 ? (
        <ul className={styles.list}>
          {cards.map((card) => (
            <li key={card.id}>
              <Link className={styles.card} to={`/catalog/${card.id}`}>
              <strong>{card.name.trim() || 'Untitled'}</strong>
              <div className={styles.meta}>
                <KindMark kind={card.kind} />
                <span>{card.category || 'No category'}</span>
                <span>{scarcityLabels[card.scarcity]}</span>
                <span>{priorityLabels[card.priority]}</span>
                <span>{cardStatusLabels[card.status]}</span>
              </div>
              {card.summary ? <p>{card.summary}</p> : null}
              </Link>
            </li>
          ))}
        </ul>
      ) : null}
    </div>
  )
}
