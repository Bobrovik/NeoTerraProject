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
    return <ErrorState title="Каталог не удалось прочитать" detail={stored.message} />
  }

  const counts = countCardsByKind(stored.catalog.cards)
  const categories = catalogCategories(stored.catalog.cards)
  const cards = listCatalogCards(stored.catalog.cards, query)
  const update = (patch: Partial<CatalogListQuery>) => setQuery((current) => ({ ...current, ...patch }))

  return (
    <div className={styles.page}>
      <header className={styles.heading}>
        <div>
          <h1>Каталог</h1>
          <p className={controls.muted}>
            Универсальные описания ресурсов, источников и потребителей. Расположение и фактические показатели хранит модель города.
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
          <Link className={controls.ghost} to="/catalog/network">Сеть связей</Link>
          <Link className={controls.button} to="/catalog/new">Создать карточку</Link>
        </div>
      </header>
      <div className={styles.tabs} role="group" aria-label="Тип карточки">
        <button className={controls.toggle} type="button" aria-pressed={query.kind === 'all'} onClick={() => update({ kind: 'all' })}>Все</button>
        {kinds.map((kind) => (
          <button key={kind} className={controls.toggle} type="button" aria-pressed={query.kind === kind} onClick={() => update({ kind })}>
            <KindMark kind={kind} />
          </button>
        ))}
      </div>
      <div className={styles.filters}>
        <label className={controls.stack}>
          Поиск
          <input className={controls.field} value={query.text} onChange={(event) => update({ text: event.target.value })} placeholder="Название, описание или категория" />
        </label>
        <label className={controls.stack}>
          Категория
          <select className={controls.select} value={query.category} onChange={(event) => update({ category: event.target.value })}>
            <option value="">Все категории</option>
            {categories.map((category) => <option key={category} value={category}>{category}</option>)}
          </select>
        </label>
        <label className={controls.stack}>
          Дефицитность
          <select className={controls.select} value={query.scarcity} onChange={(event) => update({ scarcity: event.target.value as Scarcity | '' })}>
            <option value="">Любая дефицитность</option>
            {scarcities.map((scarcity) => <option key={scarcity} value={scarcity}>{scarcityLabels[scarcity]}</option>)}
          </select>
        </label>
        <label className={controls.stack}>
          Приоритет
          <select className={controls.select} value={query.priority} onChange={(event) => update({ priority: event.target.value as Priority | '' })}>
            <option value="">Любой приоритет</option>
            {priorities.map((priority) => <option key={priority} value={priority}>{priorityLabels[priority]}</option>)}
          </select>
        </label>
        <label className={controls.stack}>
          Статус
          <select className={controls.select} value={query.status} onChange={(event) => update({ status: event.target.value as CardStatus | '' })}>
            <option value="">Любой статус</option>
            {statuses.map((status) => <option key={status} value={status}>{cardStatusLabels[status]}</option>)}
          </select>
        </label>
        <label className={controls.stack}>
          Сортировка
          <select className={controls.select} value={query.sort} onChange={(event) => update({ sort: event.target.value as CatalogSort })}>
            <option value="name">Название</option>
            <option value="created">Дата создания</option>
            <option value="updated">Дата изменения</option>
            <option value="priority">Приоритет</option>
          </select>
        </label>
      </div>
      {stored.catalog.cards.length === 0 ? (
        <EmptyState title="Карточек пока нет" detail="Создайте карточку ресурса, источника или потребителя." />
      ) : null}
      {stored.catalog.cards.length > 0 && cards.length === 0 ? (
        <EmptyState title="Нет подходящих карточек" detail="В сохранённом каталоге нет карточек с таким поиском и фильтрами." />
      ) : null}
      {cards.length > 0 ? (
        <ul className={styles.list}>
          {cards.map((card) => (
            <li key={card.id}>
              <Link className={styles.card} to={`/catalog/${card.id}`}>
              <strong>{card.name.trim() || 'Без названия'}</strong>
              <div className={styles.meta}>
                <KindMark kind={card.kind} />
                <span>{card.category || 'Без категории'}</span>
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
