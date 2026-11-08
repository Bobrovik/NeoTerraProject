import { useState } from 'react'
import { writeQuantityLibrary } from '../../data/quantity-library-storage'
import { baseDimensionKeys, dimension, formatDimension, type Dimension } from '../../domain/quantity/dimension'
import {
  findProperty,
  findQuantity,
  findUnit,
  suggestedPropertyCategories,
  unitsAreCompatible,
  unitsForProperty,
  type PropertyDataType,
  type PropertyDefinition,
  type QuantityLibrary,
  type TemperatureRole,
} from '../../domain/quantity/definitions'
import { changeMeasurementUnit, observationConditionsMatter, propertyLabel, selectPropertyForMeasurement } from '../../domain/quantity/entry'
import { searchProperties } from '../../domain/quantity/library'
import { createPropertyDefinition, createQuantityDefinition, createUnitDefinition } from '../../domain/quantity/validate'
import type { EvidenceDraft, QuantityDraft } from '../../domain/resource-catalog-form'
import { valueOrigins, type ValueOrigin } from '../../domain/resource-catalog'
import { quantityLabel } from '../../shared/i18n/catalog-labels'
import type { MessageKey } from '../../shared/i18n/messages'
import { useI18n } from '../../shared/i18n/useI18n'
import { FormDialog } from '../../shared/ui/FormDialog'
import controls from '../../shared/ui/controls.module.css'
import styles from './CatalogCardPage.module.css'

export function CharacteristicFields({
  quantity,
  evidence,
  library,
  userLibrary,
  libraryMessage,
  onChange,
  onUserLibrary,
}: {
  quantity: QuantityDraft
  evidence: readonly EvidenceDraft[]
  library: QuantityLibrary
  userLibrary: QuantityLibrary
  libraryMessage?: string
  onChange: (next: Partial<QuantityDraft>) => void
  onUserLibrary: (library: QuantityLibrary) => void
}) {
  const { language, t } = useI18n()
  const [query, setQuery] = useState('')
  const [category, setCategory] = useState('')
  const [quantityId, setQuantityId] = useState('')
  const [creating, setCreating] = useState(false)
  const [choosing, setChoosing] = useState(false)
  const [notice, setNotice] = useState<string | undefined>()
  const selected = quantity.propertyId ? findProperty(library, quantity.propertyId) : undefined
  const physical = selected ? findQuantity(library, selected.quantityId) : undefined
  const units = selected ? unitsForProperty(library, selected) : []
  const searching = query.trim() !== '' || category !== '' || quantityId !== ''
  const matches = searching ? searchProperties(library, query, { category: category || undefined, quantityId: quantityId || undefined }).slice(0, 8) : []
  const legacy = !selected && [quantity.valueText, quantity.unit, quantity.quantityKind, quantity.name].some((value) => value.trim() !== '')

  function chooseProperty(propertyId: string) {
    const property = findProperty(library, propertyId)
    if (!property) {
      return
    }
    const selectedDraft = selectPropertyForMeasurement(quantity, property, library)
    if (!selectedDraft.ok) {
      setNotice(t('library.incompatible'))
      return
    }
    onChange(selectedDraft.draft)
    setQuery('')
    setChoosing(false)
    setNotice(undefined)
  }

  function chooseUnit(unitId: string) {
    const changed = changeMeasurementUnit(quantity, unitId, library)
    if (!changed.ok) {
      setNotice(t('library.incompatible'))
      return
    }
    onChange(changed.draft)
    setNotice(undefined)
  }

  return (
    <>
      {libraryMessage ? <p className={controls.error}>{libraryMessage}</p> : null}
      {notice ? <p className={controls.error} role="alert">{notice}</p> : null}
      {selected && physical && !choosing ? (
        <>
          <div className={styles.wide}>
            <h3>{t('card.stageValue')}</h3>
            <div className={styles.summary}>
              <strong>{propertyLabel(selected, language)}</strong>
              <span className={controls.muted}>{categoryText(t, selected.category)} · {propertyLabelQuantity(physical, language)}</span>
              <span className={controls.muted}>{t('card.dimension')}: {formatDimension(physical.dimension)}</span>
              <span className={controls.muted}>{t('card.recommendedUnit')}: {findUnit(library, selected.recommendedUnitId)?.symbol}</span>
              <span className={controls.muted}>{t('card.allowedUnits')}: {units.map((unit) => unit.symbol).join(', ')}</span>
            </div>
          </div>
          <div className={styles.grid}>
            <label className={controls.stack}>{t('card.value')}<input className={controls.field} value={quantity.valueText} onChange={(event) => onChange({ valueText: event.target.value })} placeholder={t('card.servedEmpty')} /></label>
            <label className={controls.stack}>
              {t('card.unit')}
              <select className={controls.select} value={quantity.unitId} onChange={(event) => chooseUnit(event.target.value)}>
                {units.map((unit) => <option key={unit.id} value={unit.id}>{unit.symbol}</option>)}
              </select>
            </label>
            <label className={controls.stack}>
              {t('card.valueOrigin')}
              <select className={controls.select} value={quantity.valueOrigin} onChange={(event) => onChange({ valueOrigin: event.target.value as ValueOrigin | '' })}>
                <option value="">{t('card.unknown')}</option>
                {valueOrigins.map((origin) => <option key={origin} value={origin}>{t(`origin.${origin}`)}</option>)}
              </select>
            </label>
            <label className={controls.stack}>{t('card.measuredAt')}<input className={controls.field} value={quantity.measuredAt} onChange={(event) => onChange({ measuredAt: event.target.value })} /></label>
            <label className={`${controls.stack} ${styles.wide}`}>
              {t('card.dataSource')}
              <select className={controls.select} value={quantity.evidenceId} onChange={(event) => onChange({ evidenceId: event.target.value })}>
                <option value="">{t('card.sourceMissing')}</option>
                {evidence.map((item) => <option key={item.id} value={item.id}>{item.title.trim() || t('card.untitledStudy')}</option>)}
              </select>
            </label>
          </div>
          <p className={controls.muted}>{t('card.originNote')}</p>
          <details className={styles.extra}>
            <summary>{t('card.extra')}</summary>
            {observationConditionsMatter(selected.quantityId) ? <p className={controls.muted}>{t('card.relevantConditions')}</p> : null}
            <div className={styles.grid}>
              <label className={controls.stack}>{t('card.lower')}<input className={controls.field} value={quantity.lowerText} onChange={(event) => onChange({ lowerText: event.target.value })} placeholder={t('card.servedEmpty')} /></label>
              <label className={controls.stack}>{t('card.upper')}<input className={controls.field} value={quantity.upperText} onChange={(event) => onChange({ upperText: event.target.value })} placeholder={t('card.servedEmpty')} /></label>
              <label className={controls.stack}>{t('card.uncertainty')}<input className={controls.field} value={quantity.uncertaintyText} onChange={(event) => onChange({ uncertaintyText: event.target.value })} placeholder={t('card.servedEmpty')} /></label>
              <label className={controls.stack}>{t('card.method')}<input className={controls.field} value={quantity.method} onChange={(event) => onChange({ method: event.target.value })} /></label>
              <label className={`${controls.stack} ${observationConditionsMatter(selected.quantityId) ? styles.relevant : ''}`}>{t('card.conditionTemperature')}<input className={controls.field} value={quantity.conditionTemperatureText} onChange={(event) => onChange({ conditionTemperatureText: event.target.value, conditionTemperatureUnitId: quantity.conditionTemperatureUnitId || 'unit:C' })} placeholder={t('card.servedEmpty')} /></label>
              <label className={`${controls.stack} ${observationConditionsMatter(selected.quantityId) ? styles.relevant : ''}`}>{t('card.conditionPressure')}<input className={controls.field} value={quantity.conditionPressureText} onChange={(event) => onChange({ conditionPressureText: event.target.value, conditionPressureUnitId: quantity.conditionPressureUnitId || 'unit:Pa' })} placeholder={t('card.servedEmpty')} /></label>
              <label className={controls.stack}>{t('card.periodStart')}<input className={controls.field} value={quantity.periodStart} onChange={(event) => onChange({ periodStart: event.target.value })} /></label>
              <label className={controls.stack}>{t('card.periodEnd')}<input className={controls.field} value={quantity.periodEnd} onChange={(event) => onChange({ periodEnd: event.target.value })} /></label>
              <label className={`${controls.stack} ${styles.wide}`}>{t('card.conditions')}<textarea className={controls.area} value={quantity.conditions} onChange={(event) => onChange({ conditions: event.target.value })} /></label>
            </div>
          </details>
          <div className={styles.wide}>
            <button className={controls.ghost} type="button" onClick={() => setChoosing(true)}>{t('card.changeProperty')}</button>
          </div>
        </>
      ) : (
        <>
          <div className={styles.wide}>
            <h3>{t('card.stageProperty')}</h3>
            <p className={controls.muted}>{t('card.searchHint')}</p>
          </div>
          {legacy ? (
            <p className={controls.error} role="alert">
              {t('card.reviewQuantity')}
              {quantity.valueText.trim() ? ` · ${t('card.legacyValue')}: ${quantity.valueText.trim()}` : ''}
              {quantity.unit.trim() ? ` · ${t('card.legacyUnit')}: ${quantity.unit.trim()}` : ''}
              {quantity.quantityKind ? ` · ${t('card.legacyKind')}: ${quantityLabel(t, quantity.quantityKind)}` : ''}
            </p>
          ) : null}
          <label className={`${controls.stack} ${styles.wide}`}>
            {t('card.librarySearch')}
            <input className={controls.field} value={query} onChange={(event) => setQuery(event.target.value)} />
          </label>
          <label className={controls.stack}>
            {t('card.propertyCategory')}
            <select className={controls.select} value={category} onChange={(event) => setCategory(event.target.value)}>
              <option value="">{t('card.anyCategory')}</option>
              {suggestedPropertyCategories.map((item) => <option key={item} value={item}>{categoryText(t, item)}</option>)}
            </select>
          </label>
          <label className={controls.stack}>
            {t('card.quantity')}
            <select className={controls.select} value={quantityId} onChange={(event) => setQuantityId(event.target.value)}>
              <option value="">{t('card.anyQuantity')}</option>
              {library.quantities.map((item) => <option key={item.id} value={item.id}>{propertyLabelQuantity(item, language)}</option>)}
            </select>
          </label>
          {searching && matches.length === 0 ? <p className={controls.muted}>{t('card.libraryEmpty')}</p> : null}
          <div className={`${styles.results} ${styles.wide}`}>
            {matches.map((property) => {
              const itemQuantity = findQuantity(library, property.quantityId)
              const unit = findUnit(library, property.recommendedUnitId)
              return (
                <button key={property.id} className={`${controls.ghost} ${styles.result}`} type="button" onClick={() => chooseProperty(property.id)}>
                  <strong>{propertyLabel(property, language)}</strong>
                  <span className={controls.muted}> · {categoryText(t, property.category)} · {itemQuantity ? propertyLabelQuantity(itemQuantity, language) : ''} · {unit?.symbol}</span>
                </button>
              )
            })}
          </div>
          <div className={styles.wide}>
            <button className={controls.ghost} type="button" onClick={() => setCreating(true)} disabled={Boolean(libraryMessage)}>{t('card.createProperty')}</button>
          </div>
        </>
      )}
      {creating && !libraryMessage ? (
        <FormDialog title={t('card.createTitle')} onCancel={() => setCreating(false)}>
          <PropertyCreator
            library={library}
            userLibrary={userLibrary}
            onCreated={(property) => {
              const selectedDraft = selectPropertyForMeasurement(quantity, property, { ...library, properties: [...library.properties, property] })
              if (selectedDraft.ok) {
                onChange(selectedDraft.draft)
              }
              setCreating(false)
              setNotice(selectedDraft.ok ? undefined : t('library.incompatible'))
            }}
            onLibrary={onUserLibrary}
            onCancel={() => setCreating(false)}
            onError={setNotice}
          />
        </FormDialog>
      ) : null}
    </>
  )
}

function categoryText(t: (key: MessageKey) => string, category: string): string {
  if ((suggestedPropertyCategories as readonly string[]).includes(category) || category === 'user') {
    return t(`category.${category}` as MessageKey)
  }
  return category
}

function propertyLabelQuantity(quantity: { name: { en: string; ru: string } }, language: 'en' | 'ru'): string {
  return propertyLabel({ name: quantity.name } as PropertyDefinition, language)
}

function PropertyCreator({
  library,
  userLibrary,
  onCreated,
  onLibrary,
  onCancel,
  onError,
}: {
  library: QuantityLibrary
  userLibrary: QuantityLibrary
  onCreated: (property: PropertyDefinition) => void
  onLibrary: (library: QuantityLibrary) => void
  onCancel: () => void
  onError: (message: string | undefined) => void
}) {
  const { t } = useI18n()
  const [nameEn, setNameEn] = useState('')
  const [nameRu, setNameRu] = useState('')
  const [descriptionEn, setDescriptionEn] = useState('')
  const [descriptionRu, setDescriptionRu] = useState('')
  const [category, setCategory] = useState<string>(suggestedPropertyCategories[0])
  const [customCategory, setCustomCategory] = useState('')
  const [dataType, setDataType] = useState<PropertyDataType>('number')
  const [quantityId, setQuantityId] = useState(library.quantities[0]?.id ?? '')
  const [conditions, setConditions] = useState('')
  const [minimum, setMinimum] = useState('')
  const [maximum, setMaximum] = useState('')
  const [showQuantity, setShowQuantity] = useState(false)
  const selected = findQuantity(library, quantityId)
  const recommended = selected ? findUnit(library, selected.recommendedUnitId) : undefined
  const unitChoices = recommended ? library.units.filter((unit) => unitsAreCompatible(recommended, unit)) : []
  const [unitId, setUnitId] = useState(selected?.recommendedUnitId ?? '')
  const [permitted, setPermitted] = useState<string[]>(selected?.recommendedUnitId ? [selected.recommendedUnitId] : [])

  function saveProperty() {
    const names = pairedText(nameEn, nameRu)
    if (!names) {
      onError(t('library.missing-name'))
      return
    }
    const bounds = readBound(minimum, maximum)
    if (!bounds.ok) {
      onError(t('card.badNumber'))
      return
    }
    const permittedUnitIds = Array.from(new Set([unitId, ...permitted]))
    const created = createPropertyDefinition({
      id: `property:user:${crypto.randomUUID()}`,
      name: names,
      description: pairedText(descriptionEn, descriptionRu) ?? names,
      category: customCategory.trim() || category,
      dataType,
      quantityId,
      recommendedUnitId: unitId,
      permittedUnitIds,
      conditions: conditions.trim(),
      minimum: bounds.minimum,
      maximum: bounds.maximum,
      status: 'user',
    }, library)
    if (!created.ok) {
      onError(t(created.code))
      return
    }
    const next = { ...userLibrary, properties: [...userLibrary.properties, created.property] }
    const written = writeQuantityLibrary(localStorage, next)
    if (!written.ok) {
      onError(t(written.code))
      return
    }
    onLibrary(written.library)
    onError(undefined)
    onCreated(created.property)
  }

  return (
    <div className={styles.grid}>
      <label className={controls.stack}>{t('card.nameEn')}<input className={controls.field} value={nameEn} onChange={(event) => setNameEn(event.target.value)} /></label>
      <label className={controls.stack}>{t('card.nameRu')}<input className={controls.field} value={nameRu} onChange={(event) => setNameRu(event.target.value)} /></label>
      <label className={controls.stack}>{t('card.descriptionEn')}<input className={controls.field} value={descriptionEn} onChange={(event) => setDescriptionEn(event.target.value)} /></label>
      <label className={controls.stack}>{t('card.descriptionRu')}<input className={controls.field} value={descriptionRu} onChange={(event) => setDescriptionRu(event.target.value)} /></label>
      <label className={controls.stack}>
        {t('card.propertyCategory')}
        <select className={controls.select} value={category} onChange={(event) => setCategory(event.target.value)}>
          {suggestedPropertyCategories.map((item) => <option key={item} value={item}>{categoryText(t, item)}</option>)}
          <option value="user">{categoryText(t, 'user')}</option>
        </select>
      </label>
      <label className={controls.stack}>{t('category.user')}<input className={controls.field} value={customCategory} onChange={(event) => setCustomCategory(event.target.value)} /></label>
      <label className={controls.stack}>
        {t('card.dataType')}
        <select className={controls.select} value={dataType} onChange={(event) => setDataType(event.target.value as PropertyDataType)}>
          <option value="number">{t('dataType.number')}</option>
          <option value="text">{t('dataType.text')}</option>
          <option value="range">{t('dataType.range')}</option>
        </select>
      </label>
      <label className={controls.stack}>
        {t('card.quantity')}
        <select className={controls.select} value={quantityId} onChange={(event) => {
          const next = findQuantity(library, event.target.value)
          setQuantityId(event.target.value)
          if (next) {
            setUnitId(next.recommendedUnitId)
            setPermitted([next.recommendedUnitId])
          }
        }}>
          {library.quantities.map((item) => <option key={item.id} value={item.id}>{propertyLabelQuantity(item, 'en')} / {propertyLabelQuantity(item, 'ru')}</option>)}
        </select>
      </label>
      {selected ? <p className={`${controls.muted} ${styles.wide}`}>{t('card.dimension')}: {formatDimension(selected.dimension)}. {t('card.dimensionNote')}</p> : null}
      <label className={controls.stack}>
        {t('card.recommendedUnit')}
        <select className={controls.select} value={unitId} onChange={(event) => {
          setUnitId(event.target.value)
          setPermitted((current) => current.includes(event.target.value) ? current : [...current, event.target.value])
        }}>
          {unitChoices.map((unit) => <option key={unit.id} value={unit.id}>{unit.symbol}</option>)}
        </select>
      </label>
      <div className={controls.stack}>
        <span>{t('card.permittedUnits')}</span>
        {unitChoices.map((unit) => (
          <label key={unit.id}>
            <input
              type="checkbox"
              checked={permitted.includes(unit.id) || unit.id === unitId}
              disabled={unit.id === unitId}
              onChange={(event) => setPermitted((current) => event.target.checked ? [...current, unit.id] : current.filter((id) => id !== unit.id))}
            />
            {' '}{unit.symbol}
          </label>
        ))}
      </div>
      <label className={controls.stack}>{t('card.minimum')}<input className={controls.field} value={minimum} onChange={(event) => setMinimum(event.target.value)} placeholder={t('card.servedEmpty')} /></label>
      <label className={controls.stack}>{t('card.maximum')}<input className={controls.field} value={maximum} onChange={(event) => setMaximum(event.target.value)} placeholder={t('card.servedEmpty')} /></label>
      <label className={`${controls.stack} ${styles.wide}`}>{t('card.conditionsHint')}<textarea className={controls.area} value={conditions} onChange={(event) => setConditions(event.target.value)} /></label>
      <div className={`${styles.wide} ${styles.actions}`}>
        <button className={controls.ghost} type="button" onClick={onCancel}>{t('catalog.deleteCancel')}</button>
        <button className={controls.button} type="button" onClick={saveProperty}>{t('card.saveProperty')}</button>
        <button className={controls.ghost} type="button" onClick={() => setShowQuantity((current) => !current)}>{t('card.customQuantity')}</button>
      </div>
      {showQuantity ? (
        <QuantityCreator
          library={library}
          userLibrary={userLibrary}
          onLibrary={onLibrary}
          onError={onError}
          onCreated={(nextQuantityId, nextUnitId) => {
            setQuantityId(nextQuantityId)
            setUnitId(nextUnitId)
            setPermitted([nextUnitId])
            setShowQuantity(false)
          }}
        />
      ) : null}
    </div>
  )
}

function QuantityCreator({
  library,
  userLibrary,
  onLibrary,
  onError,
  onCreated,
}: {
  library: QuantityLibrary
  userLibrary: QuantityLibrary
  onLibrary: (library: QuantityLibrary) => void
  onError: (message: string | undefined) => void
  onCreated: (quantityId: string, unitId: string) => void
}) {
  const { t } = useI18n()
  const [nameEn, setNameEn] = useState('')
  const [nameRu, setNameRu] = useState('')
  const [role, setRole] = useState<TemperatureRole>('none')
  const [exponents, setExponents] = useState<Dimension>(dimension())
  const [symbol, setSymbol] = useState('')
  const [factor, setFactor] = useState('1')
  const [offset, setOffset] = useState('0')
  const [defined, setDefined] = useState(false)

  function save() {
    const names = pairedText(nameEn, nameRu)
    if (!names || symbol.trim() === '') {
      onError(t('library.missing-name'))
      return
    }
    const parsedFactor = Number(factor)
    const parsedOffset = Number(offset)
    const unitId = `unit:user:${crypto.randomUUID()}`
    const createdUnit = createUnitDefinition({
      id: unitId,
      symbol: symbol.trim(),
      name: names,
      dimension: exponents,
      conversion: defined ? { kind: 'defined' } : { kind: 'affine', factor: parsedFactor, offset: parsedOffset },
      system: defined ? 'analytical' : 'other',
      temperatureRole: role,
      status: 'user',
    }, library)
    if (!createdUnit.ok) {
      onError(t(createdUnit.code))
      return
    }
    const nextQuantityId = `quantity:user:${crypto.randomUUID()}`
    const withUnit = { ...library, units: [...library.units, createdUnit.unit] }
    const createdQuantity = createQuantityDefinition({
      id: nextQuantityId,
      name: names,
      description: names,
      dimension: exponents,
      recommendedUnitId: unitId,
      temperatureRole: role,
      status: 'user',
    }, withUnit)
    if (!createdQuantity.ok) {
      onError(t(createdQuantity.code))
      return
    }
    const next = {
      properties: userLibrary.properties,
      quantities: [...userLibrary.quantities, createdQuantity.quantity],
      units: [...userLibrary.units, createdUnit.unit],
    }
    const written = writeQuantityLibrary(localStorage, next)
    if (!written.ok) {
      onError(t(written.code))
      return
    }
    onLibrary(written.library)
    onError(undefined)
    onCreated(nextQuantityId, unitId)
  }

  return (
    <div className={styles.grid}>
      <h3 className={styles.wide}>{t('card.customQuantity')}</h3>
      <p className={`${controls.muted} ${styles.wide}`}>{t('card.dimensionNote')}</p>
      <label className={controls.stack}>{t('card.nameEn')}<input className={controls.field} value={nameEn} onChange={(event) => setNameEn(event.target.value)} /></label>
      <label className={controls.stack}>{t('card.nameRu')}<input className={controls.field} value={nameRu} onChange={(event) => setNameRu(event.target.value)} /></label>
      <label className={controls.stack}>
        {t('card.temperatureRole')}
        <select className={controls.select} value={role} onChange={(event) => setRole(event.target.value as TemperatureRole)}>
          <option value="none">{t('card.roleNone')}</option>
          <option value="absolute">{t('card.roleAbsolute')}</option>
          <option value="interval">{t('card.roleInterval')}</option>
        </select>
      </label>
      {baseDimensionKeys.map((key) => (
        <label key={key} className={controls.stack}>
          {key === 'Th' ? 'Θ' : key}
          <input className={controls.field} value={String(exponents[key])} onChange={(event) => setExponents({ ...exponents, [key]: Number(event.target.value) })} />
        </label>
      ))}
      <p className={`${controls.muted} ${styles.wide}`}>{t('card.dimension')}: {formatDimension(exponents)}</p>
      <label className={controls.stack}>{t('card.unitSymbol')}<input className={controls.field} value={symbol} onChange={(event) => setSymbol(event.target.value)} /></label>
      <label className={controls.stack}>{t('card.factor')}<input className={controls.field} value={factor} onChange={(event) => setFactor(event.target.value)} /></label>
      <label className={controls.stack}>{t('card.offset')}<input className={controls.field} value={offset} onChange={(event) => setOffset(event.target.value)} /></label>
      <label className={controls.stack}>
        {t('card.definedUnit')}
        <input type="checkbox" checked={defined} onChange={(event) => setDefined(event.target.checked)} />
      </label>
      <div className={styles.wide}>
        <button className={controls.button} type="button" onClick={save}>{t('card.saveQuantity')}</button>
      </div>
    </div>
  )
}

function pairedText(englishText: string, russianText: string): { en: string; ru: string } | undefined {
  const english = englishText.trim() || russianText.trim()
  const russian = russianText.trim() || englishText.trim()
  if (!english || !russian) {
    return undefined
  }
  return { en: english, ru: russian }
}

function readBound(minimum: string, maximum: string): { ok: true; minimum: number | null; maximum: number | null } | { ok: false } {
  const lower = readOptional(minimum)
  const upper = readOptional(maximum)
  if (lower === undefined || upper === undefined) {
    return { ok: false }
  }
  if (lower !== null && upper !== null && upper < lower) {
    return { ok: false }
  }
  return { ok: true, minimum: lower, maximum: upper }
}

function readOptional(text: string): number | null | undefined {
  const trimmed = text.trim()
  if (!trimmed) {
    return null
  }
  const value = Number(trimmed)
  return Number.isFinite(value) ? value : undefined
}
