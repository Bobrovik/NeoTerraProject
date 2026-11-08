import { useState } from 'react'
import { Link, useNavigate, useParams } from 'react-router'
import { readResourceCatalog, writeResourceCatalog } from '../../data/resource-catalog-storage'
import { readQuantityLibrary } from '../../data/quantity-library-storage'
import {
  applyCardDraft,
  blankQuantity,
  cardToDraft,
  createCardDraft,
  removeEvidenceDraft,
  type CardDraft,
  type EvidenceDraft,
  type QuantityDraft,
  type RegionDraft,
} from '../../domain/resource-catalog-form'
import { emptyQuantityLibrary, findProperty, type QuantityLibrary } from '../../domain/quantity/definitions'
import { mergeQuantityLibraries } from '../../domain/quantity/library'
import { needsQuantityReview } from '../../domain/quantity/legacy'
import { CharacteristicFields } from './CharacteristicFields'
import { QuantityLibraryContext, useQuantityLibrary } from './quantity-library-context'
import { catalogListPath, deletionChoice, type CatalogCard, type CatalogCardKind, type CatalogLink, type CharacteristicAspect, type EvidenceStudyType, type EvidenceVerification, type MeasuredQuantity, type QuantityKind, type ResourceCatalog } from '../../domain/resource-catalog'
import { quantityKinds } from '../../domain/resource-catalog'
import { accountLabel, aspectLabel, aspects, imageLabel, kindLabel, priorityLabel, priorities, quantityLabel, scarcityLabel, scarcities, statusLabel, statuses, studyLabel, studyTypes, verificationLabel, verifications } from '../../shared/i18n/catalog-labels'
import { useI18n } from '../../shared/i18n/useI18n'
import { ConfirmDialog } from '../../shared/ui/ConfirmDialog'
import { EmptyState, ErrorState } from '../../shared/ui/Status'
import controls from '../../shared/ui/controls.module.css'
import styles from './CatalogCardPage.module.css'

const kinds: CatalogCardKind[] = ['resource', 'source', 'consumer']

function newId(prefix: string): string {
  return `${prefix}:${crypto.randomUUID()}`
}

export function CatalogCardPage({ mode }: { mode: 'new' | 'existing' }) {
  const { t } = useI18n()
  const navigate = useNavigate()
  const { cardId } = useParams()
  const [stored, setStored] = useState(() => readResourceCatalog(localStorage))
  const [libraryRead, setLibraryRead] = useState(() => readQuantityLibrary(localStorage))
  const userLibrary = libraryRead.ok ? libraryRead.library : emptyQuantityLibrary()
  const library = mergeQuantityLibraries(userLibrary)
  const [draft, setDraft] = useState<CardDraft | null>(() => initialDraft(mode, cardId, library))
  const [editing, setEditing] = useState(mode === 'new')
  const [message, setMessage] = useState<string | undefined>()
  const [pendingDelete, setPendingDelete] = useState(false)

  if (!stored.ok) {
    return <ErrorState title={t('catalog.readTitle')} detail={t(stored.message)} />
  }
  const catalog = stored.catalog
  const card = mode === 'existing' && cardId ? catalog.cards.find((item) => item.id === cardId) : undefined
  if (mode === 'existing' && !card) {
    return <EmptyState title={t('catalog.notFoundTitle')} detail={t('catalog.notFoundDetail')} />
  }
  if (!draft) {
    return (
      <div className={styles.page}>
        <h1>{t('card.newTitle')}</h1>
        <p className={controls.muted}>{t('card.newHint')}</p>
        <div className={styles.choice}>
          {kinds.map((kind) => (
            <button key={kind} className={controls.button} type="button" onClick={() => setDraft(createCardDraft({ id: newId('card'), kind, createdAt: new Date().toISOString() }))}>
              {kindLabel(t, kind)}
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
      setMessage(t(next.message))
      return
    }
    const written = writeResourceCatalog(localStorage, next.catalog)
    if (!written.ok) {
      setMessage(t(written.message))
      return
    }
    const saved = written.catalog.cards.find((item) => item.id === draft!.id)
    setStored(written)
    if (saved) {
      setDraft(cardToDraft(saved, written.catalog.links, library))
    }
    setEditing(false)
    setMessage(undefined)
    if (mode === 'new') {
      navigate(`/catalog/${draft!.id}`)
    }
  }

  function finishDelete(choice: 'delete' | 'cancel') {
    if (!stored.ok || !card) {
      return
    }
    const result = deletionChoice(choice, stored.catalog, card.id)
    setPendingDelete(false)
    if (!result.ok) {
      setMessage(t(result.message))
      return
    }
    if (result.cancelled) {
      return
    }
    const written = writeResourceCatalog(localStorage, result.catalog)
    if (!written.ok) {
      setMessage(t(written.message))
      return
    }
    navigate(catalogListPath)
  }

  function cancel() {
    if (mode === 'new') {
      navigate('/catalog')
      return
    }
    if (card) {
      setDraft(cardToDraft(card, catalog.links, library))
      setEditing(false)
      setMessage(undefined)
    }
  }

  return (
    <div className={styles.page}>
      <header className={styles.heading}>
        <div>
          <h1>{draft.name.trim() || t('card.untitled')}</h1>
          <p className={controls.muted}>{kindLabel(t, draft.kind)} · {statusLabel(t, draft.status)}</p>
        </div>
        <div className={styles.actions}>
          <Link className={controls.ghost} to="/catalog">{t('card.back')}</Link>
          {editing ? (
            <>
              <button className={controls.button} type="button" onClick={save}>{t('card.save')}</button>
              <button className={controls.ghost} type="button" onClick={cancel}>{t('card.cancel')}</button>
            </>
          ) : (
            <button className={controls.button} type="button" onClick={() => setEditing(true)}>{t('card.edit')}</button>
          )}
          {card ? <button className={styles.delete} type="button" onClick={() => setPendingDelete(true)}>{t('catalog.delete')}</button> : null}
        </div>
      </header>
      {message ? <p className={controls.error} role="alert">{message}</p> : null}
      {pendingDelete && card ? (
        <ConfirmDialog
          title={t('catalog.deleteTitle')}
          confirmLabel={t('catalog.deleteConfirm')}
          cancelLabel={t('catalog.deleteCancel')}
          onConfirm={() => finishDelete('delete')}
          onCancel={() => finishDelete('cancel')}
        >
          {t('catalog.deleteWarning', { name: card.name.trim() || t('catalog.untitled') })}
        </ConfirmDialog>
      ) : null}
      {editing ? (
        <CardForm draft={draft} catalog={catalog} library={library} userLibrary={userLibrary} libraryMessage={libraryRead.ok ? undefined : t(libraryRead.code)} onLibrary={(next) => setLibraryRead({ ok: true, library: next })} onChange={setDraft} />
      ) : card ? (
        <CardView card={card} links={catalog.links} cards={catalog.cards} library={library} />
      ) : null}
    </div>
  )
}

function initialDraft(mode: 'new' | 'existing', cardId: string | undefined, library: QuantityLibrary): CardDraft | null {
  if (mode !== 'existing' || !cardId) {
    return null
  }
  const read = readResourceCatalog(localStorage)
  if (!read.ok) {
    return null
  }
  const card = read.catalog.cards.find((item) => item.id === cardId)
  return card ? cardToDraft(card, read.catalog.links, library) : null
}

function CardForm({ draft, catalog, library, userLibrary, libraryMessage, onLibrary, onChange }: {
  draft: CardDraft
  catalog: ResourceCatalog
  library: QuantityLibrary
  userLibrary: QuantityLibrary
  libraryMessage?: string
  onLibrary: (library: QuantityLibrary) => void
  onChange: (draft: CardDraft) => void
}) {
  const { t } = useI18n()
  const resources = catalog.cards.filter((card) => card.kind === 'resource' && card.id !== draft.id)
  const patch = (next: Partial<CardDraft>) => onChange({ ...draft, ...next })
  const resourceIds = draft.kind === 'source' ? draft.producedResourceIds : draft.usedResourceIds
  const setResourceIds = (ids: string[]) => patch(draft.kind === 'source' ? { producedResourceIds: ids } : { usedResourceIds: ids })

  return (
    <QuantityLibraryContext.Provider value={{ library, userLibrary, libraryMessage, onLibrary }}>
      <section className={styles.section}>
        <h2>{t('card.basic')}</h2>
        <p className={controls.muted}>{t('card.basicNote')}</p>
        <div className={styles.grid}>
          <label className={`${controls.stack} ${styles.wide}`}>{t('card.name')}<input className={controls.field} value={draft.name} onChange={(event) => patch({ name: event.target.value })} /></label>
          <label className={controls.stack}>{t('card.category')}<input className={controls.field} value={draft.category} onChange={(event) => patch({ category: event.target.value })} /></label>
          <label className={controls.stack}>{t('card.subcategory')}<input className={controls.field} value={draft.subcategory} onChange={(event) => patch({ subcategory: event.target.value })} /></label>
          <label className={`${controls.stack} ${styles.wide}`}>{t('card.summary')}<textarea className={controls.area} value={draft.summary} onChange={(event) => patch({ summary: event.target.value })} /></label>
          <label className={controls.stack}>
            {t('card.status')}
            <select className={controls.select} value={draft.status} onChange={(event) => patch({ status: event.target.value as CardDraft['status'] })}>
              {statuses.map((status) => <option key={status} value={status}>{statusLabel(t, status)}</option>)}
            </select>
          </label>
          <label className={controls.stack}>
            {t('card.priority')}
            <select className={controls.select} value={draft.priority} onChange={(event) => patch({ priority: event.target.value as CardDraft['priority'] })}>
              {priorities.map((priority) => <option key={priority} value={priority}>{priorityLabel(t, priority)}</option>)}
            </select>
          </label>
          <label className={controls.stack}>
            {t('card.scarcity')}
            <select className={controls.select} value={draft.scarcity} onChange={(event) => patch({ scarcity: event.target.value as CardDraft['scarcity'] })}>
              {scarcities.map((scarcity) => <option key={scarcity} value={scarcity}>{scarcityLabel(t, scarcity)}</option>)}
            </select>
          </label>
          <label className={controls.stack}>
            {t('card.type')}
            <select className={controls.select} value={draft.kind} onChange={(event) => patch({ kind: event.target.value as CatalogCardKind })}>
              {kinds.map((kind) => <option key={kind} value={kind}>{kindLabel(t, kind)}</option>)}
            </select>
          </label>
        </div>
        <details className={styles.extra}>
          <summary>{t('card.image')}</summary>
          <div className={styles.grid}>
            <label className={controls.stack}>
              {t('card.imageKind')}
              <select className={controls.select} value={draft.imageKind} onChange={(event) => patch({ imageKind: event.target.value as CardDraft['imageKind'] })}>
                <option value="icon">{t('image.icon')}</option>
                <option value="photo">{t('image.photo')}</option>
                <option value="diagram">{t('image.diagram')}</option>
              </select>
            </label>
            <label className={controls.stack}>{t('card.imageUrl')}<input className={controls.field} value={draft.imageUrl} onChange={(event) => patch({ imageUrl: event.target.value })} /></label>
          </div>
        </details>
      </section>

      <section className={styles.section}>
        <h2>{t('card.evidence')}</h2>
        <p className={controls.muted}>{t('card.evidenceNote')}</p>
        {draft.evidence.map((item, index) => (
          <EvidenceEditor
            key={item.id}
            evidence={item}
            onChange={(next) => patch({ evidence: draft.evidence.map((row, rowIndex) => rowIndex === index ? next : row) })}
            onRemove={() => onChange(removeEvidenceDraft(draft, item.id))}
          />
        ))}
        <button className={controls.ghost} type="button" onClick={() => patch({ evidence: [...draft.evidence, blankEvidence()] })}>{t('card.addStudy')}</button>
      </section>

      <MeasurementGroup
        title={t('card.properties')}
        note={t('card.propertiesNote')}
        draft={draft}
        aspects={['property']}
        addAspect="property"
        onChange={onChange}
      />
      <MeasurementGroup
        title={t('card.quality')}
        note={t('card.qualityNote')}
        draft={draft}
        aspects={['quality', 'requirement']}
        addAspect="quality"
        onChange={onChange}
      />
      <section className={styles.section}>
        <h2>{t('card.metrics')}</h2>
        <p className={controls.muted}>{t('card.metricsNote')}</p>
        <MeasurementRows draft={draft} aspects={['metric', '']} onChange={onChange} />
        <QuantityEditor quantity={draft.physicalAbundance} evidence={draft.evidence} label={accountLabel(t, 'physicalAbundance')} onChange={(physicalAbundance) => patch({ physicalAbundance })} />
        <QuantityEditor quantity={draft.totalReserves} evidence={draft.evidence} label={accountLabel(t, 'totalReserves')} onChange={(totalReserves) => patch({ totalReserves })} />
        <QuantityEditor quantity={draft.recoverableReserves} evidence={draft.evidence} label={accountLabel(t, 'recoverableReserves')} onChange={(recoverableReserves) => patch({ recoverableReserves })} />
        <QuantityEditor quantity={draft.supplyDeficit} evidence={draft.evidence} label={accountLabel(t, 'supplyDeficit')} onChange={(supplyDeficit) => patch({ supplyDeficit })} />
        {draft.regional.map((region, index) => (
          <div key={region.id} className={styles.entry}>
            <QuantityEditor quantity={region.availability} evidence={draft.evidence} label={t('card.savedAmount')} onChange={(availability) => updateRegion(draft, index, { availability }, onChange)} />
            <QuantityEditor quantity={region.supplyDeficit} evidence={draft.evidence} label={t('card.savedDeficit')} onChange={(supplyDeficit) => updateRegion(draft, index, { supplyDeficit }, onChange)} />
          </div>
        ))}
        <button className={controls.ghost} type="button" onClick={() => patch({ quantities: [...draft.quantities, { ...blankMeasurement(), aspect: 'metric' }] })}>{t('card.addMetric')}</button>
      </section>

      <section className={styles.section}>
        <h2>{t('card.technology')}</h2>
        <p className={controls.muted}>{t('card.technologyNote')}</p>
        <MeasurementRows draft={draft} aspects={['operation']} onChange={onChange} />
        <button className={controls.ghost} type="button" onClick={() => patch({ quantities: [...draft.quantities, { ...blankMeasurement(), aspect: 'operation' }] })}>{t('card.addOperation')}</button>
        {draft.kind === 'source' ? (
          <>
            <ResourceChoices resources={resources} selected={resourceIds} onChange={setResourceIds} label={t('card.produced')} />
            <QuantityEditor quantity={draft.productionVolume} evidence={draft.evidence} label={accountLabel(t, 'productionVolume')} onChange={(productionVolume) => patch({ productionVolume })} />
            <QuantityEditor quantity={draft.outputPerTime} evidence={draft.evidence} label={accountLabel(t, 'outputPerTime')} onChange={(outputPerTime) => patch({ outputPerTime })} />
            <QuantityEditor quantity={draft.maxCapacity} evidence={draft.evidence} label={accountLabel(t, 'maxCapacity')} onChange={(maxCapacity) => patch({ maxCapacity })} />
            <QuantityEditor quantity={draft.energyCost} evidence={draft.evidence} label={accountLabel(t, 'energyCost')} onChange={(energyCost) => patch({ energyCost })} />
            <QuantityEditor quantity={draft.efficiency} evidence={draft.evidence} label={accountLabel(t, 'efficiency')} onChange={(efficiency) => patch({ efficiency })} />
            <QuantityEditor quantity={draft.footprint} evidence={draft.evidence} label={accountLabel(t, 'footprint')} onChange={(footprint) => patch({ footprint })} />
            <label className={controls.stack}>{t('card.operations')}<textarea className={controls.area} value={draft.sourceOperations} onChange={(event) => patch({ sourceOperations: event.target.value })} /></label>
            <label className={controls.stack}>
              {t('card.continuous')}
              <select className={controls.select} value={draft.continuous} onChange={(event) => patch({ continuous: event.target.value as CardDraft['continuous'] })}>
                <option value="">{t('card.unknown')}</option>
                <option value="yes">{t('card.yes')}</option>
                <option value="no">{t('card.no')}</option>
              </select>
            </label>
            <label className={controls.stack}>{t('card.natural')}<textarea className={controls.area} value={draft.naturalConditions} onChange={(event) => patch({ naturalConditions: event.target.value })} /></label>
          </>
        ) : null}
        {draft.kind === 'consumer' ? (
          <>
            <ResourceChoices resources={resources} selected={resourceIds} onChange={setResourceIds} label={t('card.used')} />
            <QuantityEditor quantity={draft.quantityUsed} evidence={draft.evidence} label={accountLabel(t, 'quantityUsed')} onChange={(quantityUsed) => patch({ quantityUsed })} />
            <label className={controls.stack}>{t('card.timeUnit')}<input className={controls.field} value={draft.timeUnit} onChange={(event) => patch({ timeUnit: event.target.value })} /></label>
            <QuantityEditor quantity={draft.peakLoad} evidence={draft.evidence} label={accountLabel(t, 'peakLoad')} onChange={(peakLoad) => patch({ peakLoad })} />
            <QuantityEditor quantity={draft.averageLoad} evidence={draft.evidence} label={accountLabel(t, 'averageLoad')} onChange={(averageLoad) => patch({ averageLoad })} />
            <label className={controls.stack}>{t('card.served')}<input className={controls.field} value={draft.servedText} onChange={(event) => patch({ servedText: event.target.value })} placeholder={t('card.servedEmpty')} /></label>
            <label className={controls.stack}>{t('card.operations')}<textarea className={controls.area} value={draft.consumerOperations} onChange={(event) => patch({ consumerOperations: event.target.value })} /></label>
            <label className={controls.stack}>{t('card.waste')}<textarea className={controls.area} value={draft.wasteProcessing} onChange={(event) => patch({ wasteProcessing: event.target.value })} /></label>
            <label className={controls.stack}>{t('card.byproducts')}<textarea className={controls.area} value={draft.byproducts} onChange={(event) => patch({ byproducts: event.target.value })} /></label>
          </>
        ) : null}
      </section>
    </QuantityLibraryContext.Provider>
  )
}

function MeasurementGroup({ title, note, draft, aspects: visibleAspects, addAspect, onChange }: {
  title: string
  note: string
  draft: CardDraft
  aspects: Array<QuantityDraft['aspect']>
  addAspect: CharacteristicAspect
  onChange: (draft: CardDraft) => void
}) {
  const { t } = useI18n()
  return (
    <section className={styles.section}>
      <h2>{title}</h2>
      <p className={controls.muted}>{note}</p>
      <MeasurementRows draft={draft} aspects={visibleAspects} onChange={onChange} />
      <button className={controls.ghost} type="button" onClick={() => onChange({ ...draft, quantities: [...draft.quantities, { ...blankMeasurement(), aspect: addAspect }] })}>{t('card.addCharacteristic')}</button>
    </section>
  )
}

function MeasurementRows({ draft, aspects: visibleAspects, onChange }: {
  draft: CardDraft
  aspects: Array<QuantityDraft['aspect']>
  onChange: (draft: CardDraft) => void
}) {
  return draft.quantities.map((quantity, index) => visibleAspects.includes(quantity.aspect) ? (
    <QuantityEditor
      key={quantity.id}
      quantity={quantity}
      evidence={draft.evidence}
      onChange={(next) => onChange({ ...draft, quantities: draft.quantities.map((item, itemIndex) => itemIndex === index ? next : item) })}
      onRemove={() => onChange({ ...draft, quantities: draft.quantities.filter((item) => item.id !== quantity.id) })}
    />
  ) : null)
}

function QuantityEditor({ quantity, evidence, label, onChange, onRemove }: {
  quantity: QuantityDraft
  evidence: readonly EvidenceDraft[]
  label?: string
  onChange: (quantity: QuantityDraft) => void
  onRemove?: () => void
}) {
  const { language, t } = useI18n()
  const { library, userLibrary, libraryMessage, onLibrary } = useQuantityLibrary()
  const recorded = quantityHasContent(quantity)
  const [open, setOpen] = useState(Boolean(onRemove) && !recorded)
  const patch = (next: Partial<QuantityDraft>) => onChange({ ...quantity, ...next })
  const study = quantity.evidenceId ? evidence.find((item) => item.id === quantity.evidenceId) : undefined
  const sourceName = quantity.evidenceId ? (study?.title.trim() || t('card.untitledStudy')) : t('card.sourceMissing')
  const value = quantity.valueText.trim() === '' ? t('card.unknownValue') : quantity.valueText.trim()
  const title = label || quantity.name.trim() || t('card.characteristic')

  if (!recorded && !open) {
    return (
      <div className={styles.measure}>
        <div>
          <strong>{title}</strong>
          <p className={controls.muted}>{t('card.notRecorded')}</p>
        </div>
        <button className={controls.ghost} type="button" onClick={() => setOpen(true)}>{t('card.add')}</button>
      </div>
    )
  }

  return (
    <div className={styles.measure}>
      <div className={styles.measureHead}>
        <div>
          <strong>{title}</strong>
          <p>{quantity.name.trim() || t('catalog.untitled')} · {value}{quantity.unit.trim() ? ` ${quantity.unit.trim()}` : ''} · {draftQuantityLabel(t, language, library, quantity)}{quantity.aspect ? ` · ${aspectLabel(t, quantity.aspect)}` : ''}</p>
          <p className={controls.muted}>{sourceName}</p>
        </div>
        <div className={styles.actions}>
          <button className={controls.ghost} type="button" aria-expanded={open} onClick={() => setOpen((current) => !current)}>{open ? t('card.close') : t('card.edit')}</button>
          {onRemove ? <button className={controls.ghost} type="button" onClick={onRemove}>{t('card.remove')}</button> : null}
          {!onRemove && recorded ? <button className={controls.ghost} type="button" onClick={() => { onChange(clearedQuantity(quantity)); setOpen(false) }}>{t('card.remove')}</button> : null}
        </div>
      </div>
      {open ? (
        <>
          <div className={styles.grid}>
            <label className={controls.stack}>{t('card.name')}<input className={controls.field} value={quantity.name} onChange={(event) => patch({ name: event.target.value })} /></label>
            <label className={controls.stack}>{t('card.value')}<input className={controls.field} value={quantity.valueText} onChange={(event) => patch({ valueText: event.target.value })} placeholder={t('card.servedEmpty')} /></label>
            {quantity.propertyId ? null : (
              <>
                <label className={controls.stack}>{t('card.unit')}<input className={controls.field} value={quantity.unit} onChange={(event) => patch({ unit: event.target.value })} /></label>
                <label className={controls.stack}>
                  {t('card.quantityKind')}
                  <select className={controls.select} value={quantity.quantityKind} onChange={(event) => patch({ quantityKind: event.target.value as QuantityKind })}>
                    {quantityKinds.map((kind) => <option key={kind} value={kind}>{quantityLabel(t, kind)}</option>)}
                  </select>
                </label>
              </>
            )}
            <CharacteristicFields quantity={quantity} library={library} userLibrary={userLibrary} libraryMessage={libraryMessage} onChange={patch} onUserLibrary={onLibrary} />
            <label className={controls.stack}>
              {t('card.group')}
              <select className={controls.select} value={quantity.aspect} onChange={(event) => patch({ aspect: event.target.value as CharacteristicAspect })}>
                <option value="">{t('aspect.metric')}</option>
                {aspects.map((aspect) => <option key={aspect} value={aspect}>{aspectLabel(t, aspect)}</option>)}
              </select>
            </label>
            <label className={`${controls.stack} ${styles.wide}`}>
              {t('card.dataSource')}
              <select className={controls.select} value={quantity.evidenceId} onChange={(event) => patch({ evidenceId: event.target.value })}>
                <option value="">{t('card.sourceMissing')}</option>
                {evidence.map((item) => <option key={item.id} value={item.id}>{item.title.trim() || t('card.untitledStudy')}</option>)}
              </select>
            </label>
          </div>
          <details className={styles.extra}>
            <summary>{t('card.extra')}</summary>
            <div className={styles.grid}>
              <label className={controls.stack}>{t('card.measuredAt')}<input className={controls.field} value={quantity.measuredAt} onChange={(event) => patch({ measuredAt: event.target.value })} /></label>
              <label className={controls.stack}>{t('card.periodStart')}<input className={controls.field} value={quantity.periodStart} onChange={(event) => patch({ periodStart: event.target.value })} /></label>
              <label className={controls.stack}>{t('card.periodEnd')}<input className={controls.field} value={quantity.periodEnd} onChange={(event) => patch({ periodEnd: event.target.value })} /></label>
              <label className={controls.stack}>{t('card.method')}<input className={controls.field} value={quantity.method} onChange={(event) => patch({ method: event.target.value })} /></label>
              <label className={controls.stack}>{t('card.uncertainty')}<input className={controls.field} value={quantity.uncertaintyText} onChange={(event) => patch({ uncertaintyText: event.target.value })} /></label>
              <label className={controls.stack}>{t('card.lower')}<input className={controls.field} value={quantity.lowerText} onChange={(event) => patch({ lowerText: event.target.value })} /></label>
              <label className={controls.stack}>{t('card.upper')}<input className={controls.field} value={quantity.upperText} onChange={(event) => patch({ upperText: event.target.value })} /></label>
              <label className={controls.stack}>{t('card.textValue')}<input className={controls.field} value={quantity.textValue} onChange={(event) => patch({ textValue: event.target.value })} /></label>
              <label className={controls.stack}>{t('card.conditionTemperature')}<input className={controls.field} value={quantity.conditionTemperatureText} onChange={(event) => patch({ conditionTemperatureText: event.target.value, conditionTemperatureUnitId: quantity.conditionTemperatureUnitId || 'unit:C' })} /></label>
              <label className={controls.stack}>{t('card.conditionPressure')}<input className={controls.field} value={quantity.conditionPressureText} onChange={(event) => patch({ conditionPressureText: event.target.value, conditionPressureUnitId: quantity.conditionPressureUnitId || 'unit:Pa' })} /></label>
              <label className={`${controls.stack} ${styles.wide}`}>{t('card.conditions')}<textarea className={controls.area} value={quantity.conditions} onChange={(event) => patch({ conditions: event.target.value })} /></label>
            </div>
          </details>
        </>
      ) : null}
    </div>
  )
}

function EvidenceEditor({ evidence, onChange, onRemove }: { evidence: EvidenceDraft; onChange: (evidence: EvidenceDraft) => void; onRemove: () => void }) {
  const { t } = useI18n()
  const [open, setOpen] = useState(evidence.title.trim() === '')
  const patch = (next: Partial<EvidenceDraft>) => onChange({ ...evidence, ...next })
  const heading = evidence.title.trim() || t('card.untitledStudy')
  return (
    <div className={styles.measure}>
      <div className={styles.measureHead}>
        <div>
          <strong>{heading}</strong>
          <p className={controls.muted}>{[evidence.author.trim(), evidence.yearText.trim(), studyLabel(t, evidence.studyType), verificationLabel(t, evidence.verification)].filter(Boolean).join(' · ') || t('card.noReference')}</p>
        </div>
        <div className={styles.actions}>
          <button className={controls.ghost} type="button" aria-expanded={open} onClick={() => setOpen((current) => !current)}>{open ? t('card.close') : t('card.edit')}</button>
          <button className={controls.ghost} type="button" onClick={onRemove}>{t('card.remove')}</button>
        </div>
      </div>
      {open ? (
        <div className={styles.grid}>
          <label className={controls.stack}>{t('card.studyName')}<input className={controls.field} value={evidence.title} onChange={(event) => patch({ title: event.target.value })} /></label>
          <label className={controls.stack}>{t('card.author')}<input className={controls.field} value={evidence.author} onChange={(event) => patch({ author: event.target.value })} /></label>
          <label className={controls.stack}>{t('card.year')}<input className={controls.field} value={evidence.yearText} onChange={(event) => patch({ yearText: event.target.value })} placeholder={t('card.yearEmpty')} /></label>
          <label className={controls.stack}>{t('card.url')}<input className={controls.field} value={evidence.url} onChange={(event) => patch({ url: event.target.value })} /></label>
          <label className={controls.stack}>
            {t('card.studyType')}
            <select className={controls.select} value={evidence.studyType} onChange={(event) => patch({ studyType: event.target.value as EvidenceStudyType })}>
              {studyTypes.map((studyType) => <option key={studyType} value={studyType}>{studyLabel(t, studyType)}</option>)}
            </select>
          </label>
          <label className={controls.stack}>
            {t('card.verification')}
            <select className={controls.select} value={evidence.verification} onChange={(event) => patch({ verification: event.target.value as EvidenceVerification })}>
              {verifications.map((verification) => <option key={verification} value={verification}>{verificationLabel(t, verification)}</option>)}
            </select>
          </label>
          <label className={`${controls.stack} ${styles.wide}`}>{t('card.supports')}<textarea className={controls.area} value={evidence.supports} onChange={(event) => patch({ supports: event.target.value })} /></label>
        </div>
      ) : null}
    </div>
  )
}

function ResourceChoices({ resources, selected, onChange, label }: { resources: CatalogCard[]; selected: string[]; onChange: (ids: string[]) => void; label: string }) {
  const { t } = useI18n()
  return (
    <div className={styles.links}>
      <h3>{label}</h3>
      {resources.length === 0 ? <p className={controls.muted}>{t('card.noResources')}</p> : null}
      {resources.map((resource) => (
        <label key={resource.id}>
          <input
            type="checkbox"
            checked={selected.includes(resource.id)}
            onChange={(event) => onChange(event.target.checked ? [...selected, resource.id] : selected.filter((id) => id !== resource.id))}
          />
          {' '}{resource.name.trim() || t('catalog.untitled')}
        </label>
      ))}
    </div>
  )
}

function CardView({ card, links, cards, library }: { card: CatalogCard; links: CatalogLink[]; cards: CatalogCard[]; library: QuantityLibrary }) {
  const { t } = useI18n()
  const produced = links.filter((link) => link.role === 'produces' && link.sourceId === card.id)
  const used = links.filter((link) => link.role === 'uses' && link.consumerId === card.id)
  const nameOf = (id: string) => cards.find((item) => item.id === id)?.name.trim() || t('catalog.untitled')
  const grouped = (groups: Array<MeasuredQuantity['aspect'] | undefined>) => card.quantities.filter((quantity) => groups.includes(quantity.aspect))
  return (
    <>
      <section className={styles.section}>
        <h2>{t('card.basic')}</h2>
        <div className={styles.detail}>
          <p>{kindLabel(t, card.kind)} · {card.category || t('catalog.noCategory')}{card.subcategory ? ` · ${card.subcategory}` : ''}</p>
          <p>{card.summary || t('card.noDescription')}</p>
          <p>{scarcityLabel(t, card.scarcity)} · {priorityLabel(t, card.priority)} · {statusLabel(t, card.status)}</p>
          {card.image ? <p>{imageLabel(t, card.image.kind)}: {card.image.url}</p> : null}
          <p className={controls.muted}>{t('card.created')} {card.createdAt} · {t('card.modified')} {card.updatedAt}</p>
        </div>
      </section>
      <section className={styles.section}>
        <h2>{t('card.evidence')}</h2>
        {card.evidence.length === 0 ? <p className={controls.muted}>{t('card.noStudies')}</p> : card.evidence.map((item) => (
          <div key={item.id} className={styles.detail}>
            <p><strong>{item.title || t('card.untitledStudy')}</strong>{item.year === null ? '' : ` · ${item.year}`}{item.author ? ` · ${item.author}` : ''}</p>
            <p>{studyLabel(t, item.studyType)} · {verificationLabel(t, item.verification)}</p>
            {item.url ? <p><a href={item.url}>{item.url}</a></p> : null}
            {item.supports ? <p>{item.supports}</p> : null}
          </div>
        ))}
      </section>
      <QuantityGroup title={t('card.properties')} quantities={grouped(['property'])} evidence={card.evidence} empty={t('card.noProperties')} library={library} />
      <QuantityGroup title={t('card.quality')} quantities={grouped(['quality', 'requirement'])} evidence={card.evidence} empty={t('card.noQuality')} library={library} />
      <section className={styles.section}>
        <h2>{t('card.metrics')}</h2>
        {grouped(['metric', undefined]).map((quantity) => <QuantityText key={quantity.id} quantity={quantity} evidence={card.evidence} library={library} />)}
        <QuantityText label={accountLabel(t, 'physicalAbundance')} quantity={card.accounts?.physicalAbundance} evidence={card.evidence} library={library} />
        <QuantityText label={accountLabel(t, 'totalReserves')} quantity={card.accounts?.totalReserves} evidence={card.evidence} library={library} />
        <QuantityText label={accountLabel(t, 'recoverableReserves')} quantity={card.accounts?.recoverableReserves} evidence={card.evidence} library={library} />
        <QuantityText label={accountLabel(t, 'supplyDeficit')} quantity={card.accounts?.supplyDeficit} evidence={card.evidence} library={library} />
        {card.accounts?.regional.map((region) => (
          <div key={region.id}>
            <QuantityText label={t('card.savedAmount')} quantity={region.availability} evidence={card.evidence} library={library} />
            <QuantityText label={t('card.savedDeficit')} quantity={region.supplyDeficit} evidence={card.evidence} library={library} />
          </div>
        ))}
      </section>
      <section className={styles.section}>
        <h2>{t('card.technology')}</h2>
        {grouped(['operation']).map((quantity) => <QuantityText key={quantity.id} quantity={quantity} evidence={card.evidence} library={library} />)}
        {card.kind === 'source' ? (
          <>
            <p>{produced.length === 0 ? t('card.producesNone') : t('card.produces', { name: produced.map((link) => nameOf(link.resourceId)).join(', ') })}</p>
            <QuantityText label={accountLabel(t, 'productionVolume')} quantity={card.sourceProfile?.productionVolume} evidence={card.evidence} library={library} />
            <QuantityText label={accountLabel(t, 'outputPerTime')} quantity={card.sourceProfile?.outputPerTime} evidence={card.evidence} library={library} />
            <QuantityText label={accountLabel(t, 'maxCapacity')} quantity={card.sourceProfile?.maxCapacity} evidence={card.evidence} library={library} />
            <QuantityText label={accountLabel(t, 'energyCost')} quantity={card.sourceProfile?.energyCost} evidence={card.evidence} library={library} />
            <QuantityText label={accountLabel(t, 'efficiency')} quantity={card.sourceProfile?.efficiency} evidence={card.evidence} library={library} />
            <QuantityText label={accountLabel(t, 'footprint')} quantity={card.sourceProfile?.footprint} evidence={card.evidence} library={library} />
            {card.sourceProfile?.operations ? <p>{t('card.labeled', { label: t('card.operations'), name: card.sourceProfile.operations })}</p> : null}
            {card.sourceProfile?.continuous === undefined ? null : <p>{t('card.continuousValue', { name: card.sourceProfile.continuous ? t('card.yes') : t('card.no') })}</p>}
            {card.sourceProfile?.naturalConditions ? <p>{t('card.labeled', { label: t('card.natural'), name: card.sourceProfile.naturalConditions })}</p> : null}
          </>
        ) : null}
        {card.kind === 'consumer' ? (
          <>
            <p>{used.length === 0 ? t('card.usesNone') : t('card.uses', { name: used.map((link) => nameOf(link.resourceId)).join(', ') })}</p>
            <QuantityText label={accountLabel(t, 'quantityUsed')} quantity={card.consumerProfile?.quantityUsed} evidence={card.evidence} library={library} />
            {card.consumerProfile?.timeUnit ? <p>{t('card.labeled', { label: t('card.timeUnit'), name: card.consumerProfile.timeUnit })}</p> : null}
            <QuantityText label={accountLabel(t, 'peakLoad')} quantity={card.consumerProfile?.peakLoad} evidence={card.evidence} library={library} />
            <QuantityText label={accountLabel(t, 'averageLoad')} quantity={card.consumerProfile?.averageLoad} evidence={card.evidence} library={library} />
            {card.consumerProfile ? <p>{t('card.servedValue', { name: card.consumerProfile.served === undefined || card.consumerProfile.served === null ? t('card.unknown') : String(card.consumerProfile.served) })}</p> : null}
            {card.consumerProfile?.operations ? <p>{t('card.labeled', { label: t('card.operations'), name: card.consumerProfile.operations })}</p> : null}
            {card.consumerProfile?.wasteProcessing ? <p>{t('card.labeled', { label: t('card.waste'), name: card.consumerProfile.wasteProcessing })}</p> : null}
            {card.consumerProfile?.byproducts ? <p>{t('card.labeled', { label: t('card.byproducts'), name: card.consumerProfile.byproducts })}</p> : null}
          </>
        ) : null}
        {card.kind === 'resource' ? <p className={controls.muted}>{t('card.resourceLinksNote')}</p> : null}
      </section>
    </>
  )
}

function QuantityGroup({ title, quantities, evidence, empty, library }: { title: string; quantities: MeasuredQuantity[]; evidence: CatalogCard['evidence']; empty: string; library: QuantityLibrary }) {
  return (
    <section className={styles.section}>
      <h2>{title}</h2>
      {quantities.length === 0 ? <p className={controls.muted}>{empty}</p> : quantities.map((quantity) => <QuantityText key={quantity.id} quantity={quantity} evidence={evidence} library={library} />)}
    </section>
  )
}

function QuantityText({ quantity, evidence, label, library }: { quantity?: MeasuredQuantity; evidence: CatalogCard['evidence']; label?: string; library: QuantityLibrary }) {
  const { language, t } = useI18n()
  if (!quantity) {
    return null
  }
  const study = quantity.evidenceId ? evidence.find((item) => item.id === quantity.evidenceId) : undefined
  const value = quantity.value === null ? t('card.noValue') : String(quantity.value)
  const period = `${quantity.periodStart || '…'} — ${quantity.periodEnd || '…'}`
  return (
    <p>
      {label ? `${label}: ` : ''}{storedQuantityLabel(t, language, library, quantity)} · {value} {quantity.unit}{quantity.quantityKind ? ` · ${quantityLabel(t, quantity.quantityKind)}` : ''}
      {quantity.aspect ? ` · ${aspectLabel(t, quantity.aspect)}` : ''}
      {quantity.measuredAt ? ` · ${t('card.measured', { name: quantity.measuredAt })}` : ''}
      {quantity.periodStart || quantity.periodEnd ? ` · ${t('card.period', { name: period })}` : ''}
      {quantity.conditions ? ` · ${quantity.conditions}` : ''}
      {quantity.method ? ` · ${quantity.method}` : ''}
      {quantity.valueOrigin ? ` · ${t(`origin.${quantity.valueOrigin}`)}` : ''}
      {quantity.uncertainty === undefined ? '' : ` ± ${quantity.uncertainty}`}
      {quantity.lower !== undefined || quantity.upper !== undefined ? ` · ${quantity.lower ?? '…'}…${quantity.upper ?? '…'}` : ''}
      {needsQuantityReview(quantity) ? ` · ${t('card.reviewQuantity')}` : ''}
      {study ? ` · ${study.title || t('card.untitledStudy')}` : ` · ${t('card.sourceMissing')}`}
    </p>
  )
}

function quantityHasContent(quantity: QuantityDraft): boolean {
  return [quantity.name, quantity.valueText, quantity.unit, quantity.propertyId, quantity.method, quantity.uncertaintyText, quantity.lowerText, quantity.upperText, quantity.textValue, quantity.measuredAt, quantity.periodStart, quantity.periodEnd, quantity.conditions, quantity.evidenceId].some((value) => value.trim() !== '')
}

function clearedQuantity(quantity: QuantityDraft): QuantityDraft {
  return { ...blankMeasurement(), id: quantity.id }
}

function blankMeasurement(): QuantityDraft {
  return blankQuantity(newId('qty'))
}

function draftQuantityLabel(t: ReturnType<typeof useI18n>['t'], language: 'en' | 'ru', library: QuantityLibrary, quantity: QuantityDraft): string {
  const property = quantity.propertyId ? findProperty(library, quantity.propertyId) : undefined
  if (property) {
    return language === 'ru' ? property.name.ru : property.name.en
  }
  return quantity.quantityKind ? quantityLabel(t, quantity.quantityKind) : t('card.reviewQuantity')
}

function storedQuantityLabel(t: ReturnType<typeof useI18n>['t'], language: 'en' | 'ru', library: QuantityLibrary, quantity: MeasuredQuantity): string {
  const property = quantity.propertyId ? findProperty(library, quantity.propertyId) : undefined
  if (property) {
    return language === 'ru' ? property.name.ru : property.name.en
  }
  return quantity.name || t('card.characteristic')
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

function updateRegion(draft: CardDraft, index: number, patch: Partial<RegionDraft>, onChange: (draft: CardDraft) => void) {
  onChange({
    ...draft,
    regional: draft.regional.map((region, regionIndex) => regionIndex === index ? { ...region, ...patch } : region),
  })
}
