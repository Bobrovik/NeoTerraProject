import { useState } from 'react'
import { Link, useNavigate, useParams } from 'react-router'
import { readResourceCatalog, writeResourceCatalog } from '../../data/resource-catalog-storage'
import {
  applyCardDraft,
  cardToDraft,
  createCardDraft,
  removeEvidenceDraft,
  type CardDraft,
  type EvidenceDraft,
  type QuantityDraft,
  type RegionDraft,
} from '../../domain/resource-catalog-form'
import type { CatalogCard, CatalogCardKind, CatalogLink, EvidenceStudyType, EvidenceVerification, MeasuredQuantity, QuantityKind, ResourceCatalog } from '../../domain/resource-catalog'
import { quantityKinds } from '../../domain/resource-catalog'
import {
  cardStatusLabels,
  catalogKindLabels,
  evidenceStudyLabels,
  evidenceVerificationLabels,
  priorityLabels,
  quantityKindLabels,
  scarcityLabels,
} from '../../domain/resource-catalog-view'
import { EmptyState, ErrorState } from '../../shared/ui/Status'
import controls from '../../shared/ui/controls.module.css'
import styles from './CatalogCardPage.module.css'

const kinds: CatalogCardKind[] = ['resource', 'source', 'consumer']

function newId(prefix: string): string {
  return `${prefix}:${crypto.randomUUID()}`
}

export function CatalogCardPage({ mode }: { mode: 'new' | 'existing' }) {
  const navigate = useNavigate()
  const { cardId } = useParams()
  const [stored, setStored] = useState(() => readResourceCatalog(localStorage))
  const [draft, setDraft] = useState<CardDraft | null>(() => initialDraft(mode, cardId))
  const [editing, setEditing] = useState(mode === 'new')
  const [message, setMessage] = useState<string | undefined>()

  if (!stored.ok) {
    return <ErrorState title="The resource catalog could not be read" detail={stored.message} />
  }
  const catalog = stored.catalog
  const card = mode === 'existing' && cardId ? catalog.cards.find((item) => item.id === cardId) : undefined
  if (mode === 'existing' && !card) {
    return <EmptyState title="Card not found" detail="This card is not in the saved catalog." />
  }
  if (!draft) {
    return (
      <div className={styles.page}>
        <h1>New card</h1>
        <p className={controls.muted}>Choose the kind of card to record.</p>
        <div className={styles.choice}>
          {kinds.map((kind) => (
            <button key={kind} className={controls.button} type="button" onClick={() => setDraft(createCardDraft({ id: newId('card'), kind, createdAt: new Date().toISOString() }))}>
              {catalogKindLabels[kind]}
            </button>
          ))}
        </div>
      </div>
    )
  }

  function save() {
    if (!stored.ok) {
      return
    }
    const next = applyCardDraft(stored.catalog, draft!, new Date().toISOString())
    if (!next.ok) {
      setMessage(next.message)
      return
    }
    const written = writeResourceCatalog(localStorage, next.catalog)
    if (!written.ok) {
      setMessage(written.message)
      return
    }
    const saved = written.catalog.cards.find((item) => item.id === draft!.id)
    setStored(written)
    if (saved) {
      setDraft(cardToDraft(saved, written.catalog.links))
    }
    setEditing(false)
    setMessage(undefined)
    if (mode === 'new') {
      navigate(`/catalog/${draft!.id}`)
    }
  }

  function cancel() {
    if (mode === 'new') {
      navigate('/catalog')
      return
    }
    if (card) {
      setDraft(cardToDraft(card, catalog.links))
      setEditing(false)
      setMessage(undefined)
    }
  }

  return (
    <div className={styles.page}>
      <header className={styles.heading}>
        <div>
          <h1>{draft.name.trim() || 'Untitled card'}</h1>
          <p className={controls.muted}>{catalogKindLabels[draft.kind]} · {cardStatusLabels[draft.status]}</p>
        </div>
        <div className={styles.actions}>
          <Link className={controls.ghost} to="/catalog">Back to catalog</Link>
          {editing ? (
            <>
              <button className={controls.button} type="button" onClick={save}>Save card</button>
              <button className={controls.ghost} type="button" onClick={cancel}>Cancel</button>
            </>
          ) : (
            <button className={controls.button} type="button" onClick={() => setEditing(true)}>Edit card</button>
          )}
        </div>
      </header>
      {message ? <p className={controls.error} role="alert">{message}</p> : null}
      {editing ? (
        <CardForm draft={draft} catalog={catalog} onChange={setDraft} />
      ) : card ? (
        <CardView card={card} links={catalog.links} cards={catalog.cards} />
      ) : null}
    </div>
  )
}

function initialDraft(mode: 'new' | 'existing', cardId: string | undefined): CardDraft | null {
  if (mode !== 'existing' || !cardId) {
    return null
  }
  const read = readResourceCatalog(localStorage)
  if (!read.ok) {
    return null
  }
  const card = read.catalog.cards.find((item) => item.id === cardId)
  return card ? cardToDraft(card, read.catalog.links) : null
}

function CardForm({ draft, catalog, onChange }: { draft: CardDraft; catalog: ResourceCatalog; onChange: (draft: CardDraft) => void }) {
  const resources = catalog.cards.filter((card) => card.kind === 'resource' && card.id !== draft.id)
  const patch = (next: Partial<CardDraft>) => onChange({ ...draft, ...next })
  const resourceIds = draft.kind === 'source' ? draft.producedResourceIds : draft.usedResourceIds
  const setResourceIds = (ids: string[]) => patch(draft.kind === 'source' ? { producedResourceIds: ids } : { usedResourceIds: ids })

  return (
    <>
      <section className={styles.section}>
        <h2>Basic information</h2>
        <div className={styles.grid}>
          <label className={controls.stack}>Name<input className={controls.field} value={draft.name} onChange={(event) => patch({ name: event.target.value })} /></label>
          <label className={controls.stack}>
            Card type
            <select className={controls.select} value={draft.kind} onChange={(event) => patch({ kind: event.target.value as CatalogCardKind })}>
              {kinds.map((kind) => <option key={kind} value={kind}>{catalogKindLabels[kind]}</option>)}
            </select>
          </label>
          <label className={controls.stack}>Category<input className={controls.field} value={draft.category} onChange={(event) => patch({ category: event.target.value })} /></label>
          <label className={controls.stack}>Subcategory<input className={controls.field} value={draft.subcategory} onChange={(event) => patch({ subcategory: event.target.value })} /></label>
          <label className={`${controls.stack} ${styles.wide}`}>Brief description<textarea className={controls.area} value={draft.summary} onChange={(event) => patch({ summary: event.target.value })} /></label>
          <label className={controls.stack}>
            Image kind
            <select className={controls.select} value={draft.imageKind} onChange={(event) => patch({ imageKind: event.target.value as CardDraft['imageKind'] })}>
              <option value="icon">Icon</option>
              <option value="photo">Photograph</option>
              <option value="diagram">Diagram</option>
            </select>
          </label>
          <label className={controls.stack}>Image address<input className={controls.field} value={draft.imageUrl} onChange={(event) => patch({ imageUrl: event.target.value })} /></label>
          <label className={controls.stack}>
            Status
            <select className={controls.select} value={draft.status} onChange={(event) => patch({ status: event.target.value as CardDraft['status'] })}>
              {Object.entries(cardStatusLabels).map(([value, label]) => <option key={value} value={value}>{label}</option>)}
            </select>
          </label>
          <label className={controls.stack}>
            Priority
            <select className={controls.select} value={draft.priority} onChange={(event) => patch({ priority: event.target.value as CardDraft['priority'] })}>
              {Object.entries(priorityLabels).map(([value, label]) => <option key={value} value={value}>{label}</option>)}
            </select>
          </label>
          <label className={controls.stack}>
            Scarcity
            <select className={controls.select} value={draft.scarcity} onChange={(event) => patch({ scarcity: event.target.value as CardDraft['scarcity'] })}>
              {Object.entries(scarcityLabels).map(([value, label]) => <option key={value} value={value}>{label}</option>)}
            </select>
          </label>
          <label className={controls.stack}>City id<input className={controls.field} value={draft.cityId} onChange={(event) => patch({ cityId: event.target.value })} /></label>
          <label className={controls.stack}>Region id<input className={controls.field} value={draft.regionId} onChange={(event) => patch({ regionId: event.target.value })} /></label>
          <label className={controls.stack}>Region label<input className={controls.field} value={draft.regionLabel} onChange={(event) => patch({ regionLabel: event.target.value })} /></label>
        </div>
      </section>

      <section className={styles.section}>
        <h2>Measurements</h2>
        <p className={controls.muted}>Leave a value empty when it is unknown. An empty value is not stored as zero. Power, energy, stock, and rate stay separate kinds. Units are not converted.</p>
        {draft.quantities.map((quantity, index) => (
          <QuantityEditor
            key={quantity.id}
            quantity={quantity}
            evidence={draft.evidence}
            onChange={(next) => patch({ quantities: draft.quantities.map((item, itemIndex) => itemIndex === index ? next : item) })}
            onRemove={() => patch({ quantities: draft.quantities.filter((item) => item.id !== quantity.id) })}
          />
        ))}
        <button className={controls.ghost} type="button" onClick={() => patch({ quantities: [...draft.quantities, blankMeasurement()] })}>Add measurement</button>
      </section>

      <section className={styles.section}>
        <h2>Availability</h2>
        <p className={controls.muted}>Scarcity is the supply classification. These amounts are separate measurements, each with its own unit. A deficit is recorded here; it is not calculated.</p>
        <QuantityEditor quantity={draft.physicalAbundance} evidence={draft.evidence} label="Physical abundance" onChange={(physicalAbundance) => patch({ physicalAbundance })} />
        <QuantityEditor quantity={draft.totalReserves} evidence={draft.evidence} label="Total reserves" onChange={(totalReserves) => patch({ totalReserves })} />
        <QuantityEditor quantity={draft.recoverableReserves} evidence={draft.evidence} label="Recoverable reserves" onChange={(recoverableReserves) => patch({ recoverableReserves })} />
        <QuantityEditor quantity={draft.supplyDeficit} evidence={draft.evidence} label="Supply deficit" onChange={(supplyDeficit) => patch({ supplyDeficit })} />
        {draft.regional.map((region, index) => (
          <div key={region.id} className={styles.entry}>
            <div className={styles.grid}>
              <label className={controls.stack}>Region id<input className={controls.field} value={region.regionId} onChange={(event) => updateRegion(draft, index, { regionId: event.target.value }, onChange)} /></label>
              <label className={controls.stack}>Region label<input className={controls.field} value={region.regionLabel} onChange={(event) => updateRegion(draft, index, { regionLabel: event.target.value }, onChange)} /></label>
            </div>
            <QuantityEditor quantity={region.availability} evidence={draft.evidence} label="Regional availability" onChange={(availability) => updateRegion(draft, index, { availability }, onChange)} />
            <QuantityEditor quantity={region.supplyDeficit} evidence={draft.evidence} label="Regional supply deficit" onChange={(supplyDeficit) => updateRegion(draft, index, { supplyDeficit }, onChange)} />
            <button className={controls.ghost} type="button" onClick={() => patch({ regional: draft.regional.filter((item) => item.id !== region.id) })}>Remove region</button>
          </div>
        ))}
        <button className={controls.ghost} type="button" onClick={() => patch({ regional: [...draft.regional, blankRegion()] })}>Add region</button>
      </section>

      <section className={styles.section}>
        <h2>Evidence</h2>
        <p className={controls.muted}>A URL does not make a study verified. Verification is recorded separately. A draft can be saved with no studies.</p>
        {draft.evidence.map((item, index) => (
          <EvidenceEditor
            key={item.id}
            evidence={item}
            onChange={(next) => patch({ evidence: draft.evidence.map((row, rowIndex) => rowIndex === index ? next : row) })}
            onRemove={() => onChange(removeEvidenceDraft(draft, item.id))}
          />
        ))}
        <button className={controls.ghost} type="button" onClick={() => patch({ evidence: [...draft.evidence, blankEvidence()] })}>Add evidence</button>
      </section>

      {draft.kind === 'source' ? (
        <section className={styles.section}>
          <h2>Source</h2>
          <ResourceChoices resources={resources} selected={resourceIds} onChange={setResourceIds} label="Resources produced" />
          <QuantityEditor quantity={draft.productionVolume} evidence={draft.evidence} label="Production volume" onChange={(productionVolume) => patch({ productionVolume })} />
          <QuantityEditor quantity={draft.outputPerTime} evidence={draft.evidence} label="Output per time" onChange={(outputPerTime) => patch({ outputPerTime })} />
          <QuantityEditor quantity={draft.maxCapacity} evidence={draft.evidence} label="Maximum capacity" onChange={(maxCapacity) => patch({ maxCapacity })} />
          <QuantityEditor quantity={draft.energyCost} evidence={draft.evidence} label="Energy cost" onChange={(energyCost) => patch({ energyCost })} />
          <QuantityEditor quantity={draft.efficiency} evidence={draft.evidence} label="Efficiency" onChange={(efficiency) => patch({ efficiency })} />
          <QuantityEditor quantity={draft.footprint} evidence={draft.evidence} label="Footprint" onChange={(footprint) => patch({ footprint })} />
          <label className={controls.stack}>Operational requirements<textarea className={controls.area} value={draft.sourceOperations} onChange={(event) => patch({ sourceOperations: event.target.value })} /></label>
          <label className={controls.stack}>
            Continuous operation
            <select className={controls.select} value={draft.continuous} onChange={(event) => patch({ continuous: event.target.value as CardDraft['continuous'] })}>
              <option value="">Unknown</option>
              <option value="yes">Yes</option>
              <option value="no">No</option>
            </select>
          </label>
          <label className={controls.stack}>Natural conditions<textarea className={controls.area} value={draft.naturalConditions} onChange={(event) => patch({ naturalConditions: event.target.value })} /></label>
        </section>
      ) : null}

      {draft.kind === 'consumer' ? (
        <section className={styles.section}>
          <h2>Consumer</h2>
          <ResourceChoices resources={resources} selected={resourceIds} onChange={setResourceIds} label="Resources used" />
          <QuantityEditor quantity={draft.quantityUsed} evidence={draft.evidence} label="Quantity used" onChange={(quantityUsed) => patch({ quantityUsed })} />
          <label className={controls.stack}>Time unit<input className={controls.field} value={draft.timeUnit} onChange={(event) => patch({ timeUnit: event.target.value })} /></label>
          <QuantityEditor quantity={draft.peakLoad} evidence={draft.evidence} label="Peak load" onChange={(peakLoad) => patch({ peakLoad })} />
          <QuantityEditor quantity={draft.averageLoad} evidence={draft.evidence} label="Average load" onChange={(averageLoad) => patch({ averageLoad })} />
          <label className={controls.stack}>Number served<input className={controls.field} value={draft.servedText} onChange={(event) => patch({ servedText: event.target.value })} placeholder="Leave empty if unknown" /></label>
          <label className={controls.stack}>Operational requirements<textarea className={controls.area} value={draft.consumerOperations} onChange={(event) => patch({ consumerOperations: event.target.value })} /></label>
          <label className={controls.stack}>Waste processing<textarea className={controls.area} value={draft.wasteProcessing} onChange={(event) => patch({ wasteProcessing: event.target.value })} /></label>
          <label className={controls.stack}>By-products<textarea className={controls.area} value={draft.byproducts} onChange={(event) => patch({ byproducts: event.target.value })} /></label>
        </section>
      ) : null}
    </>
  )
}

function QuantityEditor({ quantity, evidence, label, onChange, onRemove }: {
  quantity: QuantityDraft
  evidence: readonly EvidenceDraft[]
  label?: string
  onChange: (quantity: QuantityDraft) => void
  onRemove?: () => void
}) {
  const patch = (next: Partial<QuantityDraft>) => onChange({ ...quantity, ...next })
  return (
    <div className={styles.entry}>
      {label ? <h3>{label}</h3> : null}
      <div className={styles.grid}>
        <label className={controls.stack}>Name<input className={controls.field} value={quantity.name} onChange={(event) => patch({ name: event.target.value })} /></label>
        <label className={controls.stack}>Value<input className={controls.field} value={quantity.valueText} onChange={(event) => patch({ valueText: event.target.value })} placeholder="Empty if unknown" /></label>
        <label className={controls.stack}>Unit<input className={controls.field} value={quantity.unit} onChange={(event) => patch({ unit: event.target.value })} /></label>
        <label className={controls.stack}>
          Quantity kind
          <select className={controls.select} value={quantity.quantityKind} onChange={(event) => patch({ quantityKind: event.target.value as QuantityKind })}>
            {quantityKinds.map((kind) => <option key={kind} value={kind}>{quantityKindLabels[kind]}</option>)}
          </select>
        </label>
        <label className={controls.stack}>Measured at<input className={controls.field} value={quantity.measuredAt} onChange={(event) => patch({ measuredAt: event.target.value })} /></label>
        <label className={controls.stack}>Period start<input className={controls.field} value={quantity.periodStart} onChange={(event) => patch({ periodStart: event.target.value })} /></label>
        <label className={controls.stack}>Period end<input className={controls.field} value={quantity.periodEnd} onChange={(event) => patch({ periodEnd: event.target.value })} /></label>
        <label className={controls.stack}>
          Evidence
          <select className={controls.select} value={quantity.evidenceId} onChange={(event) => patch({ evidenceId: event.target.value })}>
            <option value="">None</option>
            {evidence.map((item) => <option key={item.id} value={item.id}>{item.title.trim() || 'Untitled study'}</option>)}
          </select>
        </label>
        <label className={`${controls.stack} ${styles.wide}`}>Conditions<textarea className={controls.area} value={quantity.conditions} onChange={(event) => patch({ conditions: event.target.value })} /></label>
      </div>
      {onRemove ? <button className={controls.ghost} type="button" onClick={onRemove}>Remove measurement</button> : null}
    </div>
  )
}

function EvidenceEditor({ evidence, onChange, onRemove }: { evidence: EvidenceDraft; onChange: (evidence: EvidenceDraft) => void; onRemove: () => void }) {
  const patch = (next: Partial<EvidenceDraft>) => onChange({ ...evidence, ...next })
  return (
    <div className={styles.entry}>
      <div className={styles.grid}>
        <label className={controls.stack}>Title<input className={controls.field} value={evidence.title} onChange={(event) => patch({ title: event.target.value })} /></label>
        <label className={controls.stack}>Author or organization<input className={controls.field} value={evidence.author} onChange={(event) => patch({ author: event.target.value })} /></label>
        <label className={controls.stack}>Year<input className={controls.field} value={evidence.yearText} onChange={(event) => patch({ yearText: event.target.value })} placeholder="Empty if unknown" /></label>
        <label className={controls.stack}>URL<input className={controls.field} value={evidence.url} onChange={(event) => patch({ url: event.target.value })} /></label>
        <label className={controls.stack}>
          Source type
          <select className={controls.select} value={evidence.studyType} onChange={(event) => patch({ studyType: event.target.value as EvidenceStudyType })}>
            {Object.entries(evidenceStudyLabels).map(([value, label]) => <option key={value} value={value}>{label}</option>)}
          </select>
        </label>
        <label className={controls.stack}>
          Verification
          <select className={controls.select} value={evidence.verification} onChange={(event) => patch({ verification: event.target.value as EvidenceVerification })}>
            {Object.entries(evidenceVerificationLabels).map(([value, label]) => <option key={value} value={value}>{label}</option>)}
          </select>
        </label>
        <label className={`${controls.stack} ${styles.wide}`}>What this source supports<textarea className={controls.area} value={evidence.supports} onChange={(event) => patch({ supports: event.target.value })} /></label>
      </div>
      <button className={controls.ghost} type="button" onClick={onRemove}>Remove evidence</button>
    </div>
  )
}

function ResourceChoices({ resources, selected, onChange, label }: { resources: CatalogCard[]; selected: string[]; onChange: (ids: string[]) => void; label: string }) {
  return (
    <div className={styles.links}>
      <h3>{label}</h3>
      {resources.length === 0 ? <p className={controls.muted}>No resource cards are saved yet.</p> : null}
      {resources.map((resource) => (
        <label key={resource.id}>
          <input
            type="checkbox"
            checked={selected.includes(resource.id)}
            onChange={(event) => onChange(event.target.checked ? [...selected, resource.id] : selected.filter((id) => id !== resource.id))}
          />
          {' '}{resource.name.trim() || 'Untitled'}
        </label>
      ))}
    </div>
  )
}

function CardView({ card, links, cards }: { card: CatalogCard; links: CatalogLink[]; cards: CatalogCard[] }) {
  const produced = links.filter((link) => link.role === 'produces' && link.sourceId === card.id)
  const used = links.filter((link) => link.role === 'uses' && link.consumerId === card.id)
  const nameOf = (id: string) => cards.find((item) => item.id === id)?.name.trim() || 'Untitled'
  return (
    <>
      <section className={styles.section}>
        <h2>Basic information</h2>
        <div className={styles.detail}>
          <p>{catalogKindLabels[card.kind]} · {card.category || 'No category'}{card.subcategory ? ` · ${card.subcategory}` : ''}</p>
          <p>{card.summary || 'No description'}</p>
          <p>{scarcityLabels[card.scarcity]} · {priorityLabels[card.priority]} · {cardStatusLabels[card.status]}</p>
          {card.image ? <p>{card.image.kind}: {card.image.url}</p> : null}
          {card.cityId ? <p>City id: {card.cityId}</p> : null}
          {card.regionId || card.regionLabel ? <p>Region: {[card.regionLabel, card.regionId].filter(Boolean).join(' · ')}</p> : null}
          <p className={controls.muted}>Created {card.createdAt} · Modified {card.updatedAt}</p>
        </div>
      </section>
      <section className={styles.section}>
        <h2>Measurements</h2>
        {card.quantities.length === 0 ? <p className={controls.muted}>No measurements.</p> : card.quantities.map((quantity) => <QuantityText key={quantity.id} quantity={quantity} evidence={card.evidence} />)}
      </section>
      <section className={styles.section}>
        <h2>Availability</h2>
        <QuantityText label="Physical abundance" quantity={card.accounts?.physicalAbundance} evidence={card.evidence} />
        <QuantityText label="Total reserves" quantity={card.accounts?.totalReserves} evidence={card.evidence} />
        <QuantityText label="Recoverable reserves" quantity={card.accounts?.recoverableReserves} evidence={card.evidence} />
        <QuantityText label="Supply deficit" quantity={card.accounts?.supplyDeficit} evidence={card.evidence} />
        {card.accounts?.regional.map((region) => (
          <div key={region.id} className={styles.detail}>
            <p>{region.regionLabel || region.regionId || 'Region'}</p>
            <QuantityText label="Availability" quantity={region.availability} evidence={card.evidence} />
            <QuantityText label="Supply deficit" quantity={region.supplyDeficit} evidence={card.evidence} />
          </div>
        ))}
        {!card.accounts ? <p className={controls.muted}>No reserve or deficit amounts.</p> : null}
      </section>
      <section className={styles.section}>
        <h2>Evidence</h2>
        {card.evidence.length === 0 ? <p className={controls.muted}>No studies.</p> : card.evidence.map((item) => (
          <div key={item.id} className={styles.detail}>
            <p><strong>{item.title || 'Untitled study'}</strong>{item.year === null ? '' : ` · ${item.year}`}{item.author ? ` · ${item.author}` : ''}</p>
            <p>{evidenceStudyLabels[item.studyType]} · {evidenceVerificationLabels[item.verification]}</p>
            {item.url ? <p><a href={item.url}>{item.url}</a></p> : null}
            {item.supports ? <p>{item.supports}</p> : null}
          </div>
        ))}
      </section>
      {card.kind === 'source' ? (
        <section className={styles.section}>
          <h2>Source</h2>
          <p>{produced.length === 0 ? 'No produced resources.' : `Produces ${produced.map((link) => nameOf(link.resourceId)).join(', ')}`}</p>
          <QuantityText label="Production volume" quantity={card.sourceProfile?.productionVolume} evidence={card.evidence} />
          <QuantityText label="Output per time" quantity={card.sourceProfile?.outputPerTime} evidence={card.evidence} />
          <QuantityText label="Maximum capacity" quantity={card.sourceProfile?.maxCapacity} evidence={card.evidence} />
          <QuantityText label="Energy cost" quantity={card.sourceProfile?.energyCost} evidence={card.evidence} />
          <QuantityText label="Efficiency" quantity={card.sourceProfile?.efficiency} evidence={card.evidence} />
          <QuantityText label="Footprint" quantity={card.sourceProfile?.footprint} evidence={card.evidence} />
          {card.sourceProfile?.operations ? <p>Operations: {card.sourceProfile.operations}</p> : null}
          <p>Continuous operation: {card.sourceProfile?.continuous === undefined ? 'Unknown' : card.sourceProfile.continuous ? 'Yes' : 'No'}</p>
          {card.sourceProfile?.naturalConditions ? <p>Natural conditions: {card.sourceProfile.naturalConditions}</p> : null}
        </section>
      ) : null}
      {card.kind === 'consumer' ? (
        <section className={styles.section}>
          <h2>Consumer</h2>
          <p>{used.length === 0 ? 'No resources used.' : `Uses ${used.map((link) => nameOf(link.resourceId)).join(', ')}`}</p>
          <QuantityText label="Quantity used" quantity={card.consumerProfile?.quantityUsed} evidence={card.evidence} />
          {card.consumerProfile?.timeUnit ? <p>Time unit: {card.consumerProfile.timeUnit}</p> : null}
          <QuantityText label="Peak load" quantity={card.consumerProfile?.peakLoad} evidence={card.evidence} />
          <QuantityText label="Average load" quantity={card.consumerProfile?.averageLoad} evidence={card.evidence} />
          <p>Number served: {card.consumerProfile?.served === undefined || card.consumerProfile.served === null ? 'Unknown' : card.consumerProfile.served}</p>
          {card.consumerProfile?.operations ? <p>Operations: {card.consumerProfile.operations}</p> : null}
          {card.consumerProfile?.wasteProcessing ? <p>Waste processing: {card.consumerProfile.wasteProcessing}</p> : null}
          {card.consumerProfile?.byproducts ? <p>By-products: {card.consumerProfile.byproducts}</p> : null}
        </section>
      ) : null}
    </>
  )
}

function QuantityText({ quantity, evidence, label }: { quantity?: MeasuredQuantity; evidence: CatalogCard['evidence']; label?: string }) {
  if (!quantity) {
    return null
  }
  const study = quantity.evidenceId ? evidence.find((item) => item.id === quantity.evidenceId) : undefined
  const value = quantity.value === null ? 'no value' : String(quantity.value)
  return (
    <p>
      {label ? `${label}: ` : ''}{quantity.name || 'Measurement'} · {value} {quantity.unit} · {quantityKindLabels[quantity.quantityKind]}
      {quantity.measuredAt ? ` · measured ${quantity.measuredAt}` : ''}
      {quantity.periodStart || quantity.periodEnd ? ` · period ${quantity.periodStart || '…'} to ${quantity.periodEnd || '…'}` : ''}
      {quantity.conditions ? ` · ${quantity.conditions}` : ''}
      {study ? ` · ${study.title || 'Untitled study'}` : ''}
    </p>
  )
}

function blankMeasurement(): QuantityDraft {
  return {
    id: newId('qty'),
    name: '',
    valueText: '',
    unit: '',
    quantityKind: 'mass',
    measuredAt: '',
    periodStart: '',
    periodEnd: '',
    conditions: '',
    evidenceId: '',
  }
}

function blankEvidence(): EvidenceDraft {
  return {
    id: newId('evidence'),
    title: '',
    author: '',
    yearText: '',
    url: '',
    studyType: 'study',
    supports: '',
    verification: 'unreviewed',
  }
}

function blankRegion(): RegionDraft {
  const id = newId('region')
  return {
    id,
    regionId: '',
    regionLabel: '',
    availability: { ...blankMeasurement(), id: `${id}:availability` },
    supplyDeficit: { ...blankMeasurement(), id: `${id}:deficit` },
  }
}

function updateRegion(draft: CardDraft, index: number, patch: Partial<RegionDraft>, onChange: (draft: CardDraft) => void) {
  onChange({
    ...draft,
    regional: draft.regional.map((region, regionIndex) => regionIndex === index ? { ...region, ...patch } : region),
  })
}
