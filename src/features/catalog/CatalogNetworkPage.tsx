import { useState } from 'react'
import { Link, useNavigate } from 'react-router'
import { readResourceCatalog, writeResourceCatalog } from '../../data/resource-catalog-storage'
import type { CatalogCard, CatalogLink, ResourceCatalog } from '../../domain/resource-catalog'
import {
  addCatalogLink,
  graphNeedsFocus,
  linkEnds,
  measurementLines,
  removeCatalogLink,
  resourceNetwork,
  type NetworkConnectionFilter,
  type NetworkKindFilter,
  type NetworkQuery,
} from '../../domain/resource-network'
import { accountLabel, kindLabel, noticeLabel, roleLabel } from '../../shared/i18n/catalog-labels'
import { useI18n } from '../../shared/i18n/useI18n'
import { EmptyState, ErrorState } from '../../shared/ui/Status'
import controls from '../../shared/ui/controls.module.css'
import styles from './CatalogNetworkPage.module.css'

const initialQuery: NetworkQuery = { text: '', kind: 'all', focusId: '', connection: 'all' }
const nodeWidth = 200
const nodeHeight = 42
const rowGap = 16
const columns = [24, 300, 576]

export function CatalogNetworkPage() {
  const { t } = useI18n()
  const navigate = useNavigate()
  const [stored, setStored] = useState(() => readResourceCatalog(localStorage))
  const [query, setQuery] = useState<NetworkQuery>(initialQuery)
  const [view, setView] = useState<'graph' | 'list'>('graph')
  const [selectedId, setSelectedId] = useState<string | undefined>()
  const [role, setRole] = useState<'produces' | 'uses'>('produces')
  const [fromId, setFromId] = useState('')
  const [resourceId, setResourceId] = useState('')
  const [message, setMessage] = useState<string | undefined>()

  if (!stored.ok) {
    return <ErrorState title={t('catalog.readTitle')} detail={t(stored.message)} />
  }
  const catalog = stored.catalog
  const network = resourceNetwork(catalog, query)
  const narrowed = query.text.trim() !== '' || query.kind !== 'all' || query.focusId !== '' || query.connection !== 'all'
  const selected = catalog.cards.find((card) => card.id === selectedId)
  const sources = catalog.cards.filter((card) => card.kind === 'source')
  const consumers = catalog.cards.filter((card) => card.kind === 'consumer')
  const resources = catalog.cards.filter((card) => card.kind === 'resource')
  const fromCards = role === 'produces' ? sources : consumers
  const update = (patch: Partial<NetworkQuery>) => setQuery((current) => ({ ...current, ...patch }))
  const cardName = (card: CatalogCard) => card.name.trim() || t('catalog.untitled')

  function save(next: ResourceCatalog) {
    const written = writeResourceCatalog(localStorage, next)
    if (!written.ok) {
      setMessage(t(written.message))
      return
    }
    setStored(written)
    setMessage(undefined)
  }

  function createConnection() {
    const result = role === 'produces'
      ? addCatalogLink(catalog, { role, sourceId: fromId, resourceId })
      : addCatalogLink(catalog, { role, consumerId: fromId, resourceId })
    if (!result.ok) {
      setMessage(t(result.message))
      return
    }
    save(result.catalog)
  }

  return (
    <div className={styles.page}>
      <header className={styles.heading}>
        <div>
          <h1>{t('network.title')}</h1>
          <p className={controls.muted}>{t('network.intro')}</p>
        </div>
        <Link className={controls.ghost} to="/catalog">{t('network.back')}</Link>
      </header>
      <div className={styles.actions} role="group" aria-label={t('network.view')}>
        <button className={controls.toggle} type="button" aria-pressed={view === 'graph'} onClick={() => setView('graph')}>{t('network.graph')}</button>
        <button className={controls.toggle} type="button" aria-pressed={view === 'list'} onClick={() => setView('list')}>{t('network.list')}</button>
      </div>
      <div className={styles.filters}>
        <label className={controls.stack}>{t('network.search')}<input className={controls.field} value={query.text} onChange={(event) => update({ text: event.target.value })} placeholder={t('network.searchPlaceholder')} /></label>
        <label className={controls.stack}>
          {t('network.nodeType')}
          <select className={controls.select} value={query.kind} onChange={(event) => update({ kind: event.target.value as NetworkKindFilter })}>
            <option value="all">{t('network.allTypes')}</option>
            <option value="resource">{t('network.resources')}</option>
            <option value="source">{t('network.sources')}</option>
            <option value="consumer">{t('network.consumers')}</option>
          </select>
        </label>
        <label className={controls.stack}>
          {t('network.focus')}
          <select className={controls.select} value={query.focusId} onChange={(event) => update({ focusId: event.target.value })}>
            <option value="">{t('network.whole')}</option>
            {catalog.cards.map((card) => <option key={card.id} value={card.id}>{kindLabel(t, card.kind)} · {cardName(card)}</option>)}
          </select>
        </label>
        <label className={controls.stack}>
          {t('network.connections')}
          <select className={controls.select} value={query.connection} onChange={(event) => update({ connection: event.target.value as NetworkConnectionFilter })}>
            <option value="all">{t('network.allCards')}</option>
            <option value="connected">{t('network.connected')}</option>
            <option value="unconnected">{t('network.unconnected')}</option>
          </select>
        </label>
      </div>
      <section className={styles.row}>
        <label className={controls.stack}>
          {t('network.link')}
          <select className={controls.select} value={role} onChange={(event) => { setRole(event.target.value as 'produces' | 'uses'); setFromId('') }}>
            <option value="produces">{t('network.producesOption')}</option>
            <option value="uses">{t('network.usesOption')}</option>
          </select>
        </label>
        <label className={controls.stack}>
          {role === 'produces' ? t('network.source') : t('network.consumer')}
          <select className={controls.select} value={fromId} onChange={(event) => setFromId(event.target.value)}>
            <option value="">{t('network.chooseCard')}</option>
            {fromCards.map((card) => <option key={card.id} value={card.id}>{cardName(card)}</option>)}
          </select>
        </label>
        <label className={controls.stack}>
          {t('network.resource')}
          <select className={controls.select} value={resourceId} onChange={(event) => setResourceId(event.target.value)}>
            <option value="">{t('network.chooseResource')}</option>
            {resources.map((card) => <option key={card.id} value={card.id}>{cardName(card)}</option>)}
          </select>
        </label>
        <button className={controls.button} type="button" onClick={createConnection} disabled={!fromId || !resourceId}>{t('network.add')}</button>
      </section>
      {message ? <p className={controls.error} role="alert">{message}</p> : null}
      {network.notices.length > 0 ? (
        <section className={styles.notices} aria-label={t('network.check')}>
          {network.notices.map((notice) => {
            const named = notice.cardId ? catalog.cards.find((card) => card.id === notice.cardId) : undefined
            const text = noticeLabel(t, notice.code, named ? cardName(named) : undefined)
            return <p key={`${notice.code}-${notice.linkId ?? notice.cardId}`} className={notice.level === 'error' ? controls.error : styles.warning}>{text}</p>
          })}
        </section>
      ) : null}
      {view === 'graph' ? (
        <NetworkGraph nodes={network.nodes} links={network.links} focusId={query.focusId} narrowed={narrowed} onOpen={(id) => navigate(`/catalog/${id}`)} />
      ) : (
        <ConnectionList catalog={catalog} nodes={network.nodes} links={network.links} narrowed={narrowed} onSelect={setSelectedId} onDelete={(linkId) => {
          const result = removeCatalogLink(catalog, linkId)
          if (!result.ok) {
            setMessage(t(result.message))
            return
          }
          save(result.catalog)
        }} />
      )}
      {selected ? <NodePanel card={selected} /> : null}
    </div>
  )
}

function NetworkGraph({ nodes, links, focusId, narrowed, onOpen }: { nodes: CatalogCard[]; links: CatalogLink[]; focusId: string; narrowed: boolean; onOpen: (id: string) => void }) {
  const { t } = useI18n()
  if (nodes.length === 0) {
    return <EmptyState title={narrowed ? t('network.noCards') : t('network.noLinks')} detail={narrowed ? t('network.noCardsDetail') : t('network.noLinksDetail')} />
  }
  if (graphNeedsFocus(nodes.length, focusId)) {
    return <EmptyState title={t('network.focusTitle')} detail={t('network.focusDetail')} />
  }
  const grouped = {
    source: nodes.filter((card) => card.kind === 'source').sort(byName),
    resource: nodes.filter((card) => card.kind === 'resource').sort(byName),
    consumer: nodes.filter((card) => card.kind === 'consumer').sort(byName),
  }
  const height = 36 + Math.max(grouped.source.length, grouped.resource.length, grouped.consumer.length, 1) * (nodeHeight + rowGap)
  const drawn = new Set<string>()
  return (
    <div className={styles.graph}>
      {links.length === 0 ? <p className={controls.muted}>{t('network.noVisibleLinks')}</p> : null}
      <svg viewBox={`0 0 820 ${height}`} role="img" aria-label={t('network.graphLabel')}>
        <defs>
          <marker id="arrow-produces" markerWidth="8" markerHeight="8" refX="7" refY="4" orient="auto"><path d="M0,0 L8,4 L0,8 Z" fill="#4c88d8" /></marker>
          <marker id="arrow-uses" markerWidth="8" markerHeight="8" refX="7" refY="4" orient="auto"><path d="M0,0 L8,4 L0,8 Z" fill="#e0923a" /></marker>
        </defs>
        <text className={styles.column} x={columns[0]} y={18}>{t('network.sources')}</text>
        <text className={styles.column} x={columns[1]} y={18}>{t('network.resources')}</text>
        <text className={styles.column} x={columns[2]} y={18}>{t('network.consumers')}</text>
        {links.map((link) => {
          const ends = linkEnds(link)
          const key = `${link.role}:${ends.fromId}:${ends.toId}`
          if (drawn.has(key)) {
            return null
          }
          drawn.add(key)
          const sourceIndex = grouped.source.findIndex((card) => card.id === ends.fromId)
          const resourceIndex = grouped.resource.findIndex((card) => card.id === ends.toId)
          const consumerIndex = grouped.consumer.findIndex((card) => card.id === ends.fromId)
          if (link.role === 'produces' && (sourceIndex < 0 || resourceIndex < 0)) {
            return null
          }
          if (link.role === 'uses' && (resourceIndex < 0 || consumerIndex < 0)) {
            return null
          }
          const y1 = nodeY(link.role === 'produces' ? sourceIndex : resourceIndex)
          const y2 = nodeY(link.role === 'produces' ? resourceIndex : consumerIndex)
          const x1 = (link.role === 'produces' ? columns[0] : columns[1]) + nodeWidth
          const x2 = link.role === 'produces' ? columns[1] : columns[2]
          return (
            <g key={key}>
              <line x1={x1} y1={y1} x2={x2 - 8} y2={y2} stroke={link.role === 'produces' ? '#4c88d8' : '#e0923a'} strokeWidth="1.5" markerEnd={link.role === 'produces' ? 'url(#arrow-produces)' : 'url(#arrow-uses)'} />
              <text className={styles.kind} x={(x1 + x2) / 2} y={(y1 + y2) / 2 - 4} textAnchor="middle">{roleLabel(t, link.role)}</text>
            </g>
          )
        })}
        {grouped.source.map((card, index) => <GraphNode key={card.id} card={card} x={columns[0]} y={nodeTop(index)} onOpen={onOpen} />)}
        {grouped.resource.map((card, index) => <GraphNode key={card.id} card={card} x={columns[1]} y={nodeTop(index)} onOpen={onOpen} />)}
        {grouped.consumer.map((card, index) => <GraphNode key={card.id} card={card} x={columns[2]} y={nodeTop(index)} onOpen={onOpen} />)}
      </svg>
    </div>
  )
}

function GraphNode({ card, x, y, onOpen }: { card: CatalogCard; x: number; y: number; onOpen: (id: string) => void }) {
  const { t } = useI18n()
  const name = card.name.trim() || t('catalog.untitled')
  return (
    <g role="link" tabIndex={0} onClick={() => onOpen(card.id)} onKeyDown={(event) => { if (event.key === 'Enter') onOpen(card.id) }}>
      <rect className={`${styles.node} ${styles[card.kind]}`} x={x} y={y} width={nodeWidth} height={nodeHeight} rx="8" />
      <text className={styles.label} x={x + 10} y={y + 18}>{name.length > 24 ? `${name.slice(0, 23)}…` : name}</text>
      <text className={styles.kind} x={x + 10} y={y + 34}>{kindLabel(t, card.kind)}</text>
    </g>
  )
}

function ConnectionList({ catalog, nodes, links, narrowed, onSelect, onDelete }: { catalog: ResourceCatalog; nodes: CatalogCard[]; links: CatalogLink[]; narrowed: boolean; onSelect: (id: string) => void; onDelete: (linkId: string) => void }) {
  const { t } = useI18n()
  if (links.length === 0 && nodes.length === 0) {
    return <EmptyState title={narrowed ? t('network.noCards') : t('network.noLinks')} detail={narrowed ? t('network.noCardsDetail') : t('network.noLinksDetail')} />
  }
  if (links.length === 0) {
    return (
      <ul className={styles.list}>
        {nodes.map((card) => (
          <li key={card.id} className={styles.row}>
            <button className={controls.ghost} type="button" onClick={() => onSelect(card.id)}>{card.name.trim() || t('catalog.untitled')}</button>
            <span>{kindLabel(t, card.kind)}</span>
          </li>
        ))}
      </ul>
    )
  }
  const nameOf = (id: string) => catalog.cards.find((card) => card.id === id)?.name.trim() || t('network.missingCard')
  return (
    <ul className={styles.list}>
      {links.map((link) => {
        const ends = linkEnds(link)
        return (
          <li key={link.id} className={styles.row}>
            <button className={controls.ghost} type="button" onClick={() => onSelect(ends.fromId)}>{nameOf(ends.fromId)}</button>
            <span>{roleLabel(t, link.role)}</span>
            <button className={controls.ghost} type="button" onClick={() => onSelect(ends.toId)}>{nameOf(ends.toId)}</button>
            <button className={controls.ghost} type="button" onClick={() => onDelete(link.id)}>{t('network.delete')}</button>
          </li>
        )
      })}
    </ul>
  )
}

function NodePanel({ card }: { card: CatalogCard }) {
  const { t } = useI18n()
  const lines = measurementLines(card)
  return (
    <section className={styles.panel}>
      <div>
        <strong>{card.name.trim() || t('catalog.untitled')}</strong>
        <p className={controls.muted}>{t('network.panelNote', { kind: kindLabel(t, card.kind) })}</p>
        {lines.length === 0 ? <p className={controls.muted}>{t('network.noMeasurements')}</p> : lines.map((line) => (
          <p key={line.account}>{accountLabel(t, line.account)}: {line.name || t('card.characteristic')} · {line.value === null ? t('card.noValue') : String(line.value)} {line.unit}</p>
        ))}
      </div>
      <Link className={controls.button} to={`/catalog/${card.id}`}>{t('network.open')}</Link>
    </section>
  )
}

function nodeTop(index: number): number {
  return 32 + index * (nodeHeight + rowGap)
}

function nodeY(index: number): number {
  return nodeTop(index) + nodeHeight / 2
}

function byName(left: CatalogCard, right: CatalogCard): number {
  return left.name.localeCompare(right.name, undefined, { sensitivity: 'base' })
}
