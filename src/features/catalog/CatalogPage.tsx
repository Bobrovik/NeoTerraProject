import { useState } from 'react'
import { Link } from 'react-router'
import { readResourceCatalog, writeResourceCatalog } from '../../data/resource-catalog-storage'
import { deletionChoice, type CatalogCard, type CardStatus, type CatalogCardKind, type Priority, type Scarcity } from '../../domain/resource-catalog'
import {
  catalogCategories,
  countCardsByKind,
  listCatalogCards,
  type CatalogListQuery,
  type CatalogSort,
} from '../../domain/resource-catalog-view'
import { kindLabel, priorities, priorityLabel, scarcities, scarcityLabel, statuses, statusLabel } from '../../shared/i18n/catalog-labels'
import { useI18n } from '../../shared/i18n/useI18n'
import { ConfirmDialog } from '../../shared/ui/ConfirmDialog'
import { EmptyState, ErrorState } from '../../shared/ui/Status'
import controls from '../../shared/ui/controls.module.css'
import styles from './CatalogPage.module.css'

const kinds: CatalogCardKind[] = ['resource', 'source', 'consumer']

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
  const { t } = useI18n()
  return (
    <span className={styles.kind}>
      <span className={`${styles.swatch} ${styles[kind]}`} aria-hidden="true" />
      {kindLabel(t, kind)}
    </span>
  )
}

export function CatalogPage() {
  const { t } = useI18n()
  const [stored, setStored] = useState(() => readResourceCatalog(localStorage))
  const [query, setQuery] = useState<CatalogListQuery>(initialQuery)
  const [pending, setPending] = useState<CatalogCard | null>(null)
  const [message, setMessage] = useState<string | undefined>()

  if (!stored.ok) {
    return <ErrorState title={t('catalog.readTitle')} detail={t(stored.message)} />
  }

  const catalog = stored.catalog
  const counts = countCardsByKind(catalog.cards)
  const categories = catalogCategories(catalog.cards)
  const cards = listCatalogCards(catalog.cards, query)
  const update = (patch: Partial<CatalogListQuery>) => setQuery((current) => ({ ...current, ...patch }))

  function finishDelete(choice: 'delete' | 'cancel') {
    if (!pending) {
      return
    }
    const result = deletionChoice(choice, catalog, pending.id)
    if (!result.ok) {
      setMessage(t(result.message))
      setPending(null)
      return
    }
    if (result.cancelled) {
      setPending(null)
      return
    }
    const written = writeResourceCatalog(localStorage, result.catalog)
    if (!written.ok) {
      setMessage(t(written.message))
      return
    }
    setStored(written)
    setPending(null)
    setMessage(undefined)
  }

  return (
    <div className={styles.page}>
      <header className={styles.heading}>
        <div>
          <h1>{t('catalog.title')}</h1>
          <p className={controls.muted}>{t('catalog.intro')}</p>
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
          <Link className={controls.ghost} to="/catalog/network">{t('catalog.network')}</Link>
          <Link className={controls.button} to="/catalog/new">{t('catalog.create')}</Link>
        </div>
      </header>
      <div className={styles.tabs} role="group" aria-label={t('catalog.kindFilter')}>
        <button className={controls.toggle} type="button" aria-pressed={query.kind === 'all'} onClick={() => update({ kind: 'all' })}>{t('catalog.all')}</button>
        {kinds.map((kind) => (
          <button key={kind} className={controls.toggle} type="button" aria-pressed={query.kind === kind} onClick={() => update({ kind })}>
            <KindMark kind={kind} />
          </button>
        ))}
      </div>
      <div className={styles.filters}>
        <label className={controls.stack}>
          {t('catalog.search')}
          <input className={controls.field} value={query.text} onChange={(event) => update({ text: event.target.value })} placeholder={t('catalog.searchPlaceholder')} />
        </label>
        <label className={controls.stack}>
          {t('catalog.category')}
          <select className={controls.select} value={query.category} onChange={(event) => update({ category: event.target.value })}>
            <option value="">{t('catalog.allCategories')}</option>
            {categories.map((category) => <option key={category} value={category}>{category}</option>)}
          </select>
        </label>
        <label className={controls.stack}>
          {t('catalog.scarcity')}
          <select className={controls.select} value={query.scarcity} onChange={(event) => update({ scarcity: event.target.value as Scarcity | '' })}>
            <option value="">{t('catalog.anyScarcity')}</option>
            {scarcities.map((scarcity) => <option key={scarcity} value={scarcity}>{scarcityLabel(t, scarcity)}</option>)}
          </select>
        </label>
        <label className={controls.stack}>
          {t('catalog.priority')}
          <select className={controls.select} value={query.priority} onChange={(event) => update({ priority: event.target.value as Priority | '' })}>
            <option value="">{t('catalog.anyPriority')}</option>
            {priorities.map((priority) => <option key={priority} value={priority}>{priorityLabel(t, priority)}</option>)}
          </select>
        </label>
        <label className={controls.stack}>
          {t('catalog.status')}
          <select className={controls.select} value={query.status} onChange={(event) => update({ status: event.target.value as CardStatus | '' })}>
            <option value="">{t('catalog.anyStatus')}</option>
            {statuses.map((status) => <option key={status} value={status}>{statusLabel(t, status)}</option>)}
          </select>
        </label>
        <label className={controls.stack}>
          {t('catalog.sort')}
          <select className={controls.select} value={query.sort} onChange={(event) => update({ sort: event.target.value as CatalogSort })}>
            <option value="name">{t('catalog.sortName')}</option>
            <option value="created">{t('catalog.sortCreated')}</option>
            <option value="updated">{t('catalog.sortUpdated')}</option>
            <option value="priority">{t('catalog.sortPriority')}</option>
          </select>
        </label>
      </div>
      {message ? <p className={controls.error} role="alert">{message}</p> : null}
      {catalog.cards.length === 0 ? (
        <EmptyState title={t('catalog.emptyTitle')} detail={t('catalog.emptyDetail')} />
      ) : null}
      {catalog.cards.length > 0 && cards.length === 0 ? (
        <EmptyState title={t('catalog.noMatchTitle')} detail={t('catalog.noMatchDetail')} />
      ) : null}
      {cards.length > 0 ? (
        <ul className={styles.list}>
          {cards.map((card) => (
            <li key={card.id} className={styles.entry}>
              <Link className={styles.card} to={`/catalog/${card.id}`}>
              <strong>{card.name.trim() || t('catalog.untitled')}</strong>
              <div className={styles.meta}>
                <KindMark kind={card.kind} />
                <span>{card.category || t('catalog.noCategory')}</span>
                <span>{scarcityLabel(t, card.scarcity)}</span>
                <span>{priorityLabel(t, card.priority)}</span>
                <span>{statusLabel(t, card.status)}</span>
              </div>
              {card.summary ? <p>{card.summary}</p> : null}
              </Link>
              <button className={styles.delete} type="button" onClick={() => setPending(card)}>{t('catalog.delete')}</button>
            </li>
          ))}
        </ul>
      ) : null}
      {pending ? (
        <ConfirmDialog
          title={t('catalog.deleteTitle')}
          confirmLabel={t('catalog.deleteConfirm')}
          cancelLabel={t('catalog.deleteCancel')}
          onConfirm={() => finishDelete('delete')}
          onCancel={() => finishDelete('cancel')}
        >
          {t('catalog.deleteWarning', { name: pending.name.trim() || t('catalog.untitled') })}
        </ConfirmDialog>
      ) : null}
    </div>
  )
}
