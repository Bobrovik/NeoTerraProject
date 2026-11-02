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
import type { CatalogCard, CatalogCardKind, CatalogLink, CharacteristicAspect, EvidenceStudyType, EvidenceVerification, MeasuredQuantity, QuantityKind, ResourceCatalog } from '../../domain/resource-catalog'
import { quantityKinds } from '../../domain/resource-catalog'
import {
  cardStatusLabels,
  catalogKindLabels,
  characteristicAspectLabels,
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
    return <ErrorState title="Каталог не удалось прочитать" detail={stored.message} />
  }
  const catalog = stored.catalog
  const card = mode === 'existing' && cardId ? catalog.cards.find((item) => item.id === cardId) : undefined
  if (mode === 'existing' && !card) {
    return <EmptyState title="Карточка не найдена" detail="Этой карточки нет в сохранённом каталоге." />
  }
  if (!draft) {
    return (
      <div className={styles.page}>
        <h1>Новая карточка</h1>
        <p className={controls.muted}>Выберите тип универсальной карточки.</p>
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
          <h1>{draft.name.trim() || 'Карточка без названия'}</h1>
          <p className={controls.muted}>{catalogKindLabels[draft.kind]} · {cardStatusLabels[draft.status]}</p>
        </div>
        <div className={styles.actions}>
          <Link className={controls.ghost} to="/catalog">К каталогу</Link>
          {editing ? (
            <>
              <button className={controls.button} type="button" onClick={save}>Сохранить</button>
              <button className={controls.ghost} type="button" onClick={cancel}>Отмена</button>
            </>
          ) : (
            <button className={controls.button} type="button" onClick={() => setEditing(true)}>Изменить</button>
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
        <h2>Основные сведения</h2>
        <p className={controls.muted}>Карточка описывает универсальный объект. Расположение, фактический запас и текущая работа относятся к экземпляру в городе и здесь не записываются.</p>
        <div className={styles.grid}>
          <label className={`${controls.stack} ${styles.wide}`}>Название<input className={controls.field} value={draft.name} onChange={(event) => patch({ name: event.target.value })} /></label>
          <label className={controls.stack}>Категория<input className={controls.field} value={draft.category} onChange={(event) => patch({ category: event.target.value })} /></label>
          <label className={controls.stack}>Подкатегория<input className={controls.field} value={draft.subcategory} onChange={(event) => patch({ subcategory: event.target.value })} /></label>
          <label className={`${controls.stack} ${styles.wide}`}>Краткое описание<textarea className={controls.area} value={draft.summary} onChange={(event) => patch({ summary: event.target.value })} /></label>
          <label className={controls.stack}>
            Статус
            <select className={controls.select} value={draft.status} onChange={(event) => patch({ status: event.target.value as CardDraft['status'] })}>
              {Object.entries(cardStatusLabels).map(([value, label]) => <option key={value} value={value}>{label}</option>)}
            </select>
          </label>
          <label className={controls.stack}>
            Приоритет
            <select className={controls.select} value={draft.priority} onChange={(event) => patch({ priority: event.target.value as CardDraft['priority'] })}>
              {Object.entries(priorityLabels).map(([value, label]) => <option key={value} value={value}>{label}</option>)}
            </select>
          </label>
          <label className={controls.stack}>
            Дефицитность
            <select className={controls.select} value={draft.scarcity} onChange={(event) => patch({ scarcity: event.target.value as CardDraft['scarcity'] })}>
              {Object.entries(scarcityLabels).map(([value, label]) => <option key={value} value={value}>{label}</option>)}
            </select>
          </label>
          <label className={controls.stack}>
            Тип карточки
            <select className={controls.select} value={draft.kind} onChange={(event) => patch({ kind: event.target.value as CatalogCardKind })}>
              {kinds.map((kind) => <option key={kind} value={kind}>{catalogKindLabels[kind]}</option>)}
            </select>
          </label>
        </div>
        <details className={styles.extra}>
          <summary>Изображение</summary>
          <div className={styles.grid}>
            <label className={controls.stack}>
              Вид изображения
              <select className={controls.select} value={draft.imageKind} onChange={(event) => patch({ imageKind: event.target.value as CardDraft['imageKind'] })}>
                <option value="icon">Значок</option>
                <option value="photo">Фотография</option>
                <option value="diagram">Схема</option>
              </select>
            </label>
            <label className={controls.stack}>Адрес изображения<input className={controls.field} value={draft.imageUrl} onChange={(event) => patch({ imageUrl: event.target.value })} /></label>
          </div>
        </details>
      </section>

      <section className={styles.section}>
        <h2>Научные источники (Scientific references)</h2>
        <p className={controls.muted}>Добавьте исследование один раз и выбирайте его как источник данных у любой характеристики. Адрес страницы не делает исследование подтверждённым. Проверка записывается отдельно. Карточку можно сохранить без исследований.</p>
        {draft.evidence.map((item, index) => (
          <EvidenceEditor
            key={item.id}
            evidence={item}
            onChange={(next) => patch({ evidence: draft.evidence.map((row, rowIndex) => rowIndex === index ? next : row) })}
            onRemove={() => onChange(removeEvidenceDraft(draft, item.id))}
          />
        ))}
        <button className={controls.ghost} type="button" onClick={() => patch({ evidence: [...draft.evidence, blankEvidence()] })}>Добавить исследование</button>
      </section>

      <MeasurementGroup
        title="Свойства и характеристики"
        note="Добавляйте только нужные свойства. Пустое значение остаётся неизвестным и не записывается как ноль. Единицы не пересчитываются."
        draft={draft}
        aspects={['property']}
        addAspect="property"
        onChange={onChange}
      />
      <MeasurementGroup
        title="Качество и пригодность"
        note="Качественная характеристика описывает состав или пригодность. Нормативное требование — записанный предел или условие, а не измеренный образец и не диапазон из двух границ."
        draft={draft}
        aspects={['quality', 'requirement']}
        addAspect="quality"
        onChange={onChange}
      />
      <section className={styles.section}>
        <h2>Количественные показатели</h2>
        <p className={controls.muted}>Запас, мощность, энергия и расход остаются разными видами величин. Дефицитность выше — это классификация снабжения, а не расчёт.</p>
        <MeasurementRows draft={draft} aspects={['metric', '']} onChange={onChange} />
        <QuantityEditor quantity={draft.physicalAbundance} evidence={draft.evidence} label="Физическое наличие (Physical abundance)" onChange={(physicalAbundance) => patch({ physicalAbundance })} />
        <QuantityEditor quantity={draft.totalReserves} evidence={draft.evidence} label="Общие запасы (Total reserves)" onChange={(totalReserves) => patch({ totalReserves })} />
        <QuantityEditor quantity={draft.recoverableReserves} evidence={draft.evidence} label="Извлекаемые запасы (Recoverable reserves)" onChange={(recoverableReserves) => patch({ recoverableReserves })} />
        <QuantityEditor quantity={draft.supplyDeficit} evidence={draft.evidence} label="Дефицит предложения (Supply deficit)" onChange={(supplyDeficit) => patch({ supplyDeficit })} />
        {draft.regional.map((region, index) => (
          <div key={region.id} className={styles.entry}>
            <QuantityEditor quantity={region.availability} evidence={draft.evidence} label="Сохранённая величина" onChange={(availability) => updateRegion(draft, index, { availability }, onChange)} />
            <QuantityEditor quantity={region.supplyDeficit} evidence={draft.evidence} label="Сохранённый дефицит" onChange={(supplyDeficit) => updateRegion(draft, index, { supplyDeficit }, onChange)} />
          </div>
        ))}
        <button className={controls.ghost} type="button" onClick={() => patch({ quantities: [...draft.quantities, { ...blankMeasurement(), aspect: 'metric' }] })}>Добавить показатель</button>
      </section>

      <section className={styles.section}>
        <h2>Технологические связи</h2>
        <p className={controls.muted}>Связи produces и uses остаются раздельными. Одна технологическая сущность позже может и производить ресурс, и потреблять другой. Тип карточки это не запрещает на будущее.</p>
        <MeasurementRows draft={draft} aspects={['operation']} onChange={onChange} />
        <button className={controls.ghost} type="button" onClick={() => patch({ quantities: [...draft.quantities, { ...blankMeasurement(), aspect: 'operation' }] })}>Добавить технологическую характеристику</button>
        {draft.kind === 'source' ? (
          <>
            <ResourceChoices resources={resources} selected={resourceIds} onChange={setResourceIds} label="Производимые ресурсы" />
            <QuantityEditor quantity={draft.productionVolume} evidence={draft.evidence} label="Объём производства (Production volume)" onChange={(productionVolume) => patch({ productionVolume })} />
            <QuantityEditor quantity={draft.outputPerTime} evidence={draft.evidence} label="Выпуск за время (Output per time)" onChange={(outputPerTime) => patch({ outputPerTime })} />
            <QuantityEditor quantity={draft.maxCapacity} evidence={draft.evidence} label="Ёмкость (Capacity)" onChange={(maxCapacity) => patch({ maxCapacity })} />
            <QuantityEditor quantity={draft.energyCost} evidence={draft.evidence} label="Энергопотребление (Energy consumption)" onChange={(energyCost) => patch({ energyCost })} />
            <QuantityEditor quantity={draft.efficiency} evidence={draft.evidence} label="КПД (Efficiency)" onChange={(efficiency) => patch({ efficiency })} />
            <QuantityEditor quantity={draft.footprint} evidence={draft.evidence} label="Площадь воздействия (Footprint)" onChange={(footprint) => patch({ footprint })} />
            <label className={controls.stack}>Условия работы<textarea className={controls.area} value={draft.sourceOperations} onChange={(event) => patch({ sourceOperations: event.target.value })} /></label>
            <label className={controls.stack}>
              Непрерывная работа
              <select className={controls.select} value={draft.continuous} onChange={(event) => patch({ continuous: event.target.value as CardDraft['continuous'] })}>
                <option value="">Неизвестно</option>
                <option value="yes">Да</option>
                <option value="no">Нет</option>
              </select>
            </label>
            <label className={controls.stack}>Природные условия<textarea className={controls.area} value={draft.naturalConditions} onChange={(event) => patch({ naturalConditions: event.target.value })} /></label>
          </>
        ) : null}
        {draft.kind === 'consumer' ? (
          <>
            <ResourceChoices resources={resources} selected={resourceIds} onChange={setResourceIds} label="Используемые ресурсы" />
            <QuantityEditor quantity={draft.quantityUsed} evidence={draft.evidence} label="Используемое количество (Quantity used)" onChange={(quantityUsed) => patch({ quantityUsed })} />
            <label className={controls.stack}>Единица времени<input className={controls.field} value={draft.timeUnit} onChange={(event) => patch({ timeUnit: event.target.value })} /></label>
            <QuantityEditor quantity={draft.peakLoad} evidence={draft.evidence} label="Пиковая нагрузка (Peak load)" onChange={(peakLoad) => patch({ peakLoad })} />
            <QuantityEditor quantity={draft.averageLoad} evidence={draft.evidence} label="Средняя нагрузка (Average load)" onChange={(averageLoad) => patch({ averageLoad })} />
            <label className={controls.stack}>Число обслуживаемых<input className={controls.field} value={draft.servedText} onChange={(event) => patch({ servedText: event.target.value })} placeholder="Пусто, если неизвестно" /></label>
            <label className={controls.stack}>Условия работы<textarea className={controls.area} value={draft.consumerOperations} onChange={(event) => patch({ consumerOperations: event.target.value })} /></label>
            <label className={controls.stack}>Обработка отходов<textarea className={controls.area} value={draft.wasteProcessing} onChange={(event) => patch({ wasteProcessing: event.target.value })} /></label>
            <label className={controls.stack}>Побочные продукты<textarea className={controls.area} value={draft.byproducts} onChange={(event) => patch({ byproducts: event.target.value })} /></label>
          </>
        ) : null}
      </section>
    </>
  )
}

function MeasurementGroup({ title, note, draft, aspects, addAspect, onChange }: {
  title: string
  note: string
  draft: CardDraft
  aspects: Array<QuantityDraft['aspect']>
  addAspect: CharacteristicAspect
  onChange: (draft: CardDraft) => void
}) {
  return (
    <section className={styles.section}>
      <h2>{title}</h2>
      <p className={controls.muted}>{note}</p>
      <MeasurementRows draft={draft} aspects={aspects} onChange={onChange} />
      <button className={controls.ghost} type="button" onClick={() => onChange({ ...draft, quantities: [...draft.quantities, { ...blankMeasurement(), aspect: addAspect }] })}>Добавить характеристику</button>
    </section>
  )
}

function MeasurementRows({ draft, aspects, onChange }: {
  draft: CardDraft
  aspects: Array<QuantityDraft['aspect']>
  onChange: (draft: CardDraft) => void
}) {
  return draft.quantities.map((quantity, index) => aspects.includes(quantity.aspect) ? (
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
  const recorded = quantityHasContent(quantity)
  const [open, setOpen] = useState(Boolean(onRemove) && !recorded)
  const patch = (next: Partial<QuantityDraft>) => onChange({ ...quantity, ...next })
  const study = quantity.evidenceId ? evidence.find((item) => item.id === quantity.evidenceId) : undefined
  const sourceName = quantity.evidenceId ? (study?.title.trim() || 'Исследование без названия') : 'Источник не указан'
  const value = quantity.valueText.trim() === '' ? 'неизвестно' : quantity.valueText.trim()
  const title = label || quantity.name.trim() || 'Характеристика'

  if (!recorded && !open) {
    return (
      <div className={styles.measure}>
        <div>
          <strong>{title}</strong>
          <p className={controls.muted}>Значение не записано.</p>
        </div>
        <button className={controls.ghost} type="button" onClick={() => setOpen(true)}>Добавить</button>
      </div>
    )
  }

  return (
    <div className={styles.measure}>
      <div className={styles.measureHead}>
        <div>
          <strong>{title}</strong>
          <p>{quantity.name.trim() || 'Без названия'} · {value}{quantity.unit.trim() ? ` ${quantity.unit.trim()}` : ''} · {quantityKindLabels[quantity.quantityKind]}{quantity.aspect ? ` · ${characteristicAspectLabels[quantity.aspect]}` : ''}</p>
          <p className={controls.muted}>{sourceName}</p>
        </div>
        <div className={styles.actions}>
          <button className={controls.ghost} type="button" aria-expanded={open} onClick={() => setOpen((current) => !current)}>{open ? 'Закрыть' : 'Изменить'}</button>
          {onRemove ? <button className={controls.ghost} type="button" onClick={onRemove}>Удалить</button> : null}
          {!onRemove && recorded ? <button className={controls.ghost} type="button" onClick={() => { onChange(clearedQuantity(quantity)); setOpen(false) }}>Удалить</button> : null}
        </div>
      </div>
      {open ? (
        <>
          <div className={styles.grid}>
            <label className={controls.stack}>Название<input className={controls.field} value={quantity.name} onChange={(event) => patch({ name: event.target.value })} /></label>
            <label className={controls.stack}>Значение<input className={controls.field} value={quantity.valueText} onChange={(event) => patch({ valueText: event.target.value })} placeholder="Пусто, если неизвестно" /></label>
            <label className={controls.stack}>Единица измерения<input className={controls.field} value={quantity.unit} onChange={(event) => patch({ unit: event.target.value })} /></label>
            <label className={controls.stack}>
              Вид величины
              <select className={controls.select} value={quantity.quantityKind} onChange={(event) => patch({ quantityKind: event.target.value as QuantityKind })}>
                {quantityKinds.map((kind) => <option key={kind} value={kind}>{quantityKindLabels[kind]}</option>)}
              </select>
            </label>
            <label className={controls.stack}>
              Группа
              <select className={controls.select} value={quantity.aspect} onChange={(event) => patch({ aspect: event.target.value as CharacteristicAspect })}>
                <option value="">Количественный показатель</option>
                {Object.entries(characteristicAspectLabels).map(([value, aspectLabel]) => <option key={value} value={value}>{aspectLabel}</option>)}
              </select>
            </label>
            <label className={`${controls.stack} ${styles.wide}`}>
              Источник данных
              <select className={controls.select} value={quantity.evidenceId} onChange={(event) => patch({ evidenceId: event.target.value })}>
                <option value="">Источник не указан</option>
                {evidence.map((item) => <option key={item.id} value={item.id}>{item.title.trim() || 'Исследование без названия'}</option>)}
              </select>
            </label>
          </div>
          <details className={styles.extra}>
            <summary>Дополнительные параметры</summary>
            <div className={styles.grid}>
              <label className={controls.stack}>Дата измерения<input className={controls.field} value={quantity.measuredAt} onChange={(event) => patch({ measuredAt: event.target.value })} /></label>
              <label className={controls.stack}>Начало периода<input className={controls.field} value={quantity.periodStart} onChange={(event) => patch({ periodStart: event.target.value })} /></label>
              <label className={controls.stack}>Конец периода<input className={controls.field} value={quantity.periodEnd} onChange={(event) => patch({ periodEnd: event.target.value })} /></label>
              <label className={`${controls.stack} ${styles.wide}`}>Условия<textarea className={controls.area} value={quantity.conditions} onChange={(event) => patch({ conditions: event.target.value })} /></label>
            </div>
          </details>
        </>
      ) : null}
    </div>
  )
}

function EvidenceEditor({ evidence, onChange, onRemove }: { evidence: EvidenceDraft; onChange: (evidence: EvidenceDraft) => void; onRemove: () => void }) {
  const [open, setOpen] = useState(evidence.title.trim() === '')
  const patch = (next: Partial<EvidenceDraft>) => onChange({ ...evidence, ...next })
  const heading = evidence.title.trim() || 'Исследование без названия'
  return (
    <div className={styles.measure}>
      <div className={styles.measureHead}>
        <div>
          <strong>{heading}</strong>
          <p className={controls.muted}>{[evidence.author.trim(), evidence.yearText.trim(), evidenceStudyLabels[evidence.studyType], evidenceVerificationLabels[evidence.verification]].filter(Boolean).join(' · ') || 'Сведений о ссылке пока нет'}</p>
        </div>
        <div className={styles.actions}>
          <button className={controls.ghost} type="button" aria-expanded={open} onClick={() => setOpen((current) => !current)}>{open ? 'Закрыть' : 'Изменить'}</button>
          <button className={controls.ghost} type="button" onClick={onRemove}>Удалить</button>
        </div>
      </div>
      {open ? (
        <div className={styles.grid}>
          <label className={controls.stack}>Название исследования<input className={controls.field} value={evidence.title} onChange={(event) => patch({ title: event.target.value })} /></label>
          <label className={controls.stack}>Автор или организация<input className={controls.field} value={evidence.author} onChange={(event) => patch({ author: event.target.value })} /></label>
          <label className={controls.stack}>Год публикации<input className={controls.field} value={evidence.yearText} onChange={(event) => patch({ yearText: event.target.value })} placeholder="Пусто, если неизвестен" /></label>
          <label className={controls.stack}>Адрес страницы<input className={controls.field} value={evidence.url} onChange={(event) => patch({ url: event.target.value })} /></label>
          <label className={controls.stack}>
            Тип исследования
            <select className={controls.select} value={evidence.studyType} onChange={(event) => patch({ studyType: event.target.value as EvidenceStudyType })}>
              {Object.entries(evidenceStudyLabels).map(([value, label]) => <option key={value} value={value}>{label}</option>)}
            </select>
          </label>
          <label className={controls.stack}>
            Статус проверки
            <select className={controls.select} value={evidence.verification} onChange={(event) => patch({ verification: event.target.value as EvidenceVerification })}>
              {Object.entries(evidenceVerificationLabels).map(([value, label]) => <option key={value} value={value}>{label}</option>)}
            </select>
          </label>
          <label className={`${controls.stack} ${styles.wide}`}>Что подтверждает источник<textarea className={controls.area} value={evidence.supports} onChange={(event) => patch({ supports: event.target.value })} /></label>
        </div>
      ) : null}
    </div>
  )
}

function ResourceChoices({ resources, selected, onChange, label }: { resources: CatalogCard[]; selected: string[]; onChange: (ids: string[]) => void; label: string }) {
  return (
    <div className={styles.links}>
      <h3>{label}</h3>
      {resources.length === 0 ? <p className={controls.muted}>Карточек ресурсов пока нет.</p> : null}
      {resources.map((resource) => (
        <label key={resource.id}>
          <input
            type="checkbox"
            checked={selected.includes(resource.id)}
            onChange={(event) => onChange(event.target.checked ? [...selected, resource.id] : selected.filter((id) => id !== resource.id))}
          />
          {' '}{resource.name.trim() || 'Без названия'}
        </label>
      ))}
    </div>
  )
}

function CardView({ card, links, cards }: { card: CatalogCard; links: CatalogLink[]; cards: CatalogCard[] }) {
  const produced = links.filter((link) => link.role === 'produces' && link.sourceId === card.id)
  const used = links.filter((link) => link.role === 'uses' && link.consumerId === card.id)
  const nameOf = (id: string) => cards.find((item) => item.id === id)?.name.trim() || 'Без названия'
  const grouped = (aspects: Array<MeasuredQuantity['aspect'] | undefined>) => card.quantities.filter((quantity) => aspects.includes(quantity.aspect))
  return (
    <>
      <section className={styles.section}>
        <h2>Основные сведения</h2>
        <div className={styles.detail}>
          <p>{catalogKindLabels[card.kind]} · {card.category || 'Без категории'}{card.subcategory ? ` · ${card.subcategory}` : ''}</p>
          <p>{card.summary || 'Описания нет'}</p>
          <p>{scarcityLabels[card.scarcity]} · {priorityLabels[card.priority]} · {cardStatusLabels[card.status]}</p>
          {card.image ? <p>{card.image.kind}: {card.image.url}</p> : null}
          <p className={controls.muted}>Создано {card.createdAt} · Изменено {card.updatedAt}</p>
        </div>
      </section>
      <section className={styles.section}>
        <h2>Научные источники (Scientific references)</h2>
        {card.evidence.length === 0 ? <p className={controls.muted}>Исследований нет.</p> : card.evidence.map((item) => (
          <div key={item.id} className={styles.detail}>
            <p><strong>{item.title || 'Исследование без названия'}</strong>{item.year === null ? '' : ` · ${item.year}`}{item.author ? ` · ${item.author}` : ''}</p>
            <p>{evidenceStudyLabels[item.studyType]} · {evidenceVerificationLabels[item.verification]}</p>
            {item.url ? <p><a href={item.url}>{item.url}</a></p> : null}
            {item.supports ? <p>{item.supports}</p> : null}
          </div>
        ))}
      </section>
      <QuantityGroup title="Свойства и характеристики" quantities={grouped(['property'])} evidence={card.evidence} empty="Свойства не записаны." />
      <QuantityGroup title="Качество и пригодность" quantities={grouped(['quality', 'requirement'])} evidence={card.evidence} empty="Качественные характеристики и требования не записаны." />
      <section className={styles.section}>
        <h2>Количественные показатели</h2>
        {grouped(['metric', undefined]).map((quantity) => <QuantityText key={quantity.id} quantity={quantity} evidence={card.evidence} />)}
        <QuantityText label="Физическое наличие (Physical abundance)" quantity={card.accounts?.physicalAbundance} evidence={card.evidence} />
        <QuantityText label="Общие запасы (Total reserves)" quantity={card.accounts?.totalReserves} evidence={card.evidence} />
        <QuantityText label="Извлекаемые запасы (Recoverable reserves)" quantity={card.accounts?.recoverableReserves} evidence={card.evidence} />
        <QuantityText label="Дефицит предложения (Supply deficit)" quantity={card.accounts?.supplyDeficit} evidence={card.evidence} />
        {card.accounts?.regional.map((region) => (
          <div key={region.id}>
            <QuantityText label="Сохранённая величина" quantity={region.availability} evidence={card.evidence} />
            <QuantityText label="Сохранённый дефицит" quantity={region.supplyDeficit} evidence={card.evidence} />
          </div>
        ))}
      </section>
      <section className={styles.section}>
        <h2>Технологические связи</h2>
        {grouped(['operation']).map((quantity) => <QuantityText key={quantity.id} quantity={quantity} evidence={card.evidence} />)}
        {card.kind === 'source' ? (
          <>
            <p>{produced.length === 0 ? 'Производимых ресурсов нет.' : `Производит: ${produced.map((link) => nameOf(link.resourceId)).join(', ')}`}</p>
            <QuantityText label="Объём производства (Production volume)" quantity={card.sourceProfile?.productionVolume} evidence={card.evidence} />
            <QuantityText label="Выпуск за время (Output per time)" quantity={card.sourceProfile?.outputPerTime} evidence={card.evidence} />
            <QuantityText label="Ёмкость (Capacity)" quantity={card.sourceProfile?.maxCapacity} evidence={card.evidence} />
            <QuantityText label="Энергопотребление (Energy consumption)" quantity={card.sourceProfile?.energyCost} evidence={card.evidence} />
            <QuantityText label="КПД (Efficiency)" quantity={card.sourceProfile?.efficiency} evidence={card.evidence} />
            <QuantityText label="Площадь воздействия (Footprint)" quantity={card.sourceProfile?.footprint} evidence={card.evidence} />
            {card.sourceProfile?.operations ? <p>Условия работы: {card.sourceProfile.operations}</p> : null}
            {card.sourceProfile?.continuous === undefined ? null : <p>Непрерывная работа: {card.sourceProfile.continuous ? 'Да' : 'Нет'}</p>}
            {card.sourceProfile?.naturalConditions ? <p>Природные условия: {card.sourceProfile.naturalConditions}</p> : null}
          </>
        ) : null}
        {card.kind === 'consumer' ? (
          <>
            <p>{used.length === 0 ? 'Используемых ресурсов нет.' : `Использует: ${used.map((link) => nameOf(link.resourceId)).join(', ')}`}</p>
            <QuantityText label="Используемое количество (Quantity used)" quantity={card.consumerProfile?.quantityUsed} evidence={card.evidence} />
            {card.consumerProfile?.timeUnit ? <p>Единица времени: {card.consumerProfile.timeUnit}</p> : null}
            <QuantityText label="Пиковая нагрузка (Peak load)" quantity={card.consumerProfile?.peakLoad} evidence={card.evidence} />
            <QuantityText label="Средняя нагрузка (Average load)" quantity={card.consumerProfile?.averageLoad} evidence={card.evidence} />
            {card.consumerProfile ? <p>Число обслуживаемых: {card.consumerProfile.served === undefined || card.consumerProfile.served === null ? 'Неизвестно' : card.consumerProfile.served}</p> : null}
            {card.consumerProfile?.operations ? <p>Условия работы: {card.consumerProfile.operations}</p> : null}
            {card.consumerProfile?.wasteProcessing ? <p>Обработка отходов: {card.consumerProfile.wasteProcessing}</p> : null}
            {card.consumerProfile?.byproducts ? <p>Побочные продукты: {card.consumerProfile.byproducts}</p> : null}
          </>
        ) : null}
        {card.kind === 'resource' ? <p className={controls.muted}>Связи produces и uses задаются на карточках источника и потребителя.</p> : null}
      </section>
    </>
  )
}

function QuantityGroup({ title, quantities, evidence, empty }: { title: string; quantities: MeasuredQuantity[]; evidence: CatalogCard['evidence']; empty: string }) {
  return (
    <section className={styles.section}>
      <h2>{title}</h2>
      {quantities.length === 0 ? <p className={controls.muted}>{empty}</p> : quantities.map((quantity) => <QuantityText key={quantity.id} quantity={quantity} evidence={evidence} />)}
    </section>
  )
}

function QuantityText({ quantity, evidence, label }: { quantity?: MeasuredQuantity; evidence: CatalogCard['evidence']; label?: string }) {
  if (!quantity) {
    return null
  }
  const study = quantity.evidenceId ? evidence.find((item) => item.id === quantity.evidenceId) : undefined
  const value = quantity.value === null ? 'нет значения' : String(quantity.value)
  return (
    <p>
      {label ? `${label}: ` : ''}{quantity.name || 'Характеристика'} · {value} {quantity.unit} · {quantityKindLabels[quantity.quantityKind]}
      {quantity.aspect ? ` · ${characteristicAspectLabels[quantity.aspect]}` : ''}
      {quantity.measuredAt ? ` · измерено ${quantity.measuredAt}` : ''}
      {quantity.periodStart || quantity.periodEnd ? ` · период ${quantity.periodStart || '…'} — ${quantity.periodEnd || '…'}` : ''}
      {quantity.conditions ? ` · ${quantity.conditions}` : ''}
      {study ? ` · ${study.title || 'Исследование без названия'}` : ' · Источник не указан'}
    </p>
  )
}

function quantityHasContent(quantity: QuantityDraft): boolean {
  return [quantity.name, quantity.valueText, quantity.unit, quantity.measuredAt, quantity.periodStart, quantity.periodEnd, quantity.conditions, quantity.evidenceId].some((value) => value.trim() !== '')
}

function clearedQuantity(quantity: QuantityDraft): QuantityDraft {
  return { ...blankMeasurement(), id: quantity.id }
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
    aspect: '',
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

function updateRegion(draft: CardDraft, index: number, patch: Partial<RegionDraft>, onChange: (draft: CardDraft) => void) {
  onChange({
    ...draft,
    regional: draft.regional.map((region, regionIndex) => regionIndex === index ? { ...region, ...patch } : region),
  })
}
