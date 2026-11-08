import { useState } from 'react'
import { writeQuantityLibrary } from '../../data/quantity-library-storage'
import { baseDimensionKeys, dimension, formatDimension, type Dimension } from '../../domain/quantity/dimension'
import {
  convertValue,
  findProperty,
  findQuantity,
  findUnit,
  formatQuantityValue,
  suggestedPropertyCategories,
  unitsAreCompatible,
  unitsForProperty,
  type QuantityLibrary,
  type TemperatureRole,
} from '../../domain/quantity/definitions'
import { createPropertyDefinition, createQuantityDefinition, createUnitDefinition } from '../../domain/quantity/validate'
import type { QuantityDraft } from '../../domain/resource-catalog-form'
import { valueOrigins, type ValueOrigin } from '../../domain/resource-catalog'
import { useI18n } from '../../shared/i18n/useI18n'
import controls from '../../shared/ui/controls.module.css'
import styles from './CatalogCardPage.module.css'

export function CharacteristicFields({
  quantity,
  library,
  userLibrary,
  libraryMessage,
  onChange,
  onUserLibrary,
}: {
  quantity: QuantityDraft
  library: QuantityLibrary
  userLibrary: QuantityLibrary
  libraryMessage?: string
  onChange: (next: Partial<QuantityDraft>) => void
  onUserLibrary: (library: QuantityLibrary) => void
}) {
  const { language, t } = useI18n()
  const [query, setQuery] = useState('')
  const [creating, setCreating] = useState(false)
  const [notice, setNotice] = useState<string | undefined>()
  const selected = quantity.propertyId ? findProperty(library, quantity.propertyId) : undefined
  const physical = selected ? findQuantity(library, selected.quantityId) : undefined
  const units = selected ? unitsForProperty(library, selected) : []
  const needle = query.trim().toLowerCase()
  const matches = library.properties.filter((property) => {
    if (!needle) {
      return false
    }
    return [property.name.en, property.name.ru, property.category].join('\n').toLowerCase().includes(needle)
  }).slice(0, 8)

  function chooseProperty(propertyId: string) {
    const property = findProperty(library, propertyId)
    const unit = property ? findUnit(library, property.recommendedUnitId) : undefined
    if (!property || !unit) {
      return
    }
    onChange({
      propertyId: property.id,
      quantityId: property.quantityId,
      unitId: unit.id,
      unit: unit.symbol,
      name: quantity.name.trim() || (language === 'ru' ? property.name.ru : property.name.en),
      conditions: quantity.conditions.trim() || property.conditions,
    })
    setQuery('')
    setNotice(undefined)
  }

  function chooseUnit(unitId: string) {
    const next = findUnit(library, unitId)
    const current = findUnit(library, quantity.unitId)
    if (!next) {
      return
    }
    const numeric = Number(quantity.valueText)
    if (current && quantity.valueText.trim() !== '' && Number.isFinite(numeric)) {
      const converted = convertValue(numeric, current, next)
      if (!converted.ok) {
        setNotice(t('library.incompatible'))
        return
      }
      onChange({ unitId: next.id, unit: next.symbol, valueText: formatQuantityValue(converted.value) })
      return
    }
    onChange({ unitId: next.id, unit: next.symbol })
  }

  return (
    <>
      <label className={`${controls.stack} ${styles.wide}`}>
        {t('card.librarySearch')}
        <input className={controls.field} value={query} onChange={(event) => setQuery(event.target.value)} />
      </label>
      {needle && matches.length === 0 ? <p className={controls.muted}>{t('card.libraryEmpty')}</p> : null}
      {matches.map((property) => (
        <button key={property.id} className={controls.ghost} type="button" onClick={() => chooseProperty(property.id)}>
          {language === 'ru' ? property.name.ru : property.name.en}
        </button>
      ))}
      {selected && physical ? <p className={controls.muted}>{t('card.dimension')}: {formatDimension(physical.dimension)}. {t('card.dimensionNote')}</p> : null}
      {selected ? (
        <label className={controls.stack}>
          {t('card.compatibleUnits')}
          <select className={controls.select} value={quantity.unitId} onChange={(event) => chooseUnit(event.target.value)}>
            {units.map((unit) => <option key={unit.id} value={unit.id}>{unit.symbol}</option>)}
          </select>
        </label>
      ) : null}
      <label className={controls.stack}>
        {t('card.valueOrigin')}
        <select className={controls.select} value={quantity.valueOrigin} onChange={(event) => onChange({ valueOrigin: event.target.value as ValueOrigin | '' })}>
          <option value="">{t('card.unknown')}</option>
          {valueOrigins.map((origin) => <option key={origin} value={origin}>{t(`origin.${origin}`)}</option>)}
        </select>
      </label>
      {libraryMessage ? <p className={controls.error}>{libraryMessage}</p> : null}
      {notice ? <p className={controls.error} role="alert">{notice}</p> : null}
      <div className={styles.wide}>
        <button className={controls.ghost} type="button" onClick={() => setCreating((current) => !current)}>{t('card.createProperty')}</button>
      </div>
      {creating && !libraryMessage ? (
          <PropertyCreator
          library={library}
          userLibrary={userLibrary}
          onCreated={(property, symbol) => {
            onChange({
              propertyId: property.id,
              quantityId: property.quantityId,
              unitId: property.recommendedUnitId,
              unit: symbol,
              name: quantity.name.trim() || (language === 'ru' ? property.name.ru : property.name.en),
              conditions: quantity.conditions.trim() || property.conditions,
            })
            setCreating(false)
          }}
          onLibrary={onUserLibrary}
          onError={setNotice}
        />
      ) : null}
    </>
  )
}

function PropertyCreator({
  library,
  userLibrary,
  onCreated,
  onLibrary,
  onError,
}: {
  library: QuantityLibrary
  userLibrary: QuantityLibrary
  onCreated: (property: { id: string; quantityId: string; recommendedUnitId: string; name: { en: string; ru: string }; conditions: string }, symbol: string) => void
  onLibrary: (library: QuantityLibrary) => void
  onError: (message: string | undefined) => void
}) {
  const { t } = useI18n()
  const [nameEn, setNameEn] = useState('')
  const [nameRu, setNameRu] = useState('')
  const [descriptionEn, setDescriptionEn] = useState('')
  const [descriptionRu, setDescriptionRu] = useState('')
  const [category, setCategory] = useState<string>(suggestedPropertyCategories[0])
  const [customCategory, setCustomCategory] = useState('')
  const [quantityId, setQuantityId] = useState(library.quantities[0]?.id ?? '')
  const [conditions, setConditions] = useState('')
  const [showQuantity, setShowQuantity] = useState(false)
  const selected = findQuantity(library, quantityId)
  const recommended = selected ? findUnit(library, selected.recommendedUnitId) : undefined
  const unitChoices = recommended ? library.units.filter((unit) => unitsAreCompatible(recommended, unit)) : []
  const [unitId, setUnitId] = useState(selected?.recommendedUnitId ?? '')

  function saveProperty() {
    const names = pairedText(nameEn, nameRu)
    if (!names) {
      onError(t('library.missing-name'))
      return
    }
    const created = createPropertyDefinition({
      id: `property:user:${crypto.randomUUID()}`,
      name: names,
      description: pairedText(descriptionEn, descriptionRu) ?? names,
      category: customCategory.trim() || category,
      dataType: 'number',
      quantityId,
      recommendedUnitId: unitId,
      permittedUnitIds: [],
      conditions: conditions.trim(),
      minimum: null,
      maximum: null,
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
    const unit = findUnit({ ...library, units: [...library.units, ...written.library.units], properties: [...library.properties, created.property], quantities: library.quantities }, created.property.recommendedUnitId)
    onCreated(created.property, unit?.symbol ?? '')
  }

  return (
    <div className={styles.grid}>
      <h3 className={styles.wide}>{t('card.customProperty')}</h3>
      <label className={controls.stack}>{t('card.nameEn')}<input className={controls.field} value={nameEn} onChange={(event) => setNameEn(event.target.value)} /></label>
      <label className={controls.stack}>{t('card.nameRu')}<input className={controls.field} value={nameRu} onChange={(event) => setNameRu(event.target.value)} /></label>
      <label className={controls.stack}>{t('card.descriptionEn')}<input className={controls.field} value={descriptionEn} onChange={(event) => setDescriptionEn(event.target.value)} /></label>
      <label className={controls.stack}>{t('card.descriptionRu')}<input className={controls.field} value={descriptionRu} onChange={(event) => setDescriptionRu(event.target.value)} /></label>
      <label className={controls.stack}>
        {t('card.propertyCategory')}
        <select className={controls.select} value={category} onChange={(event) => setCategory(event.target.value)}>
          {suggestedPropertyCategories.map((item) => <option key={item} value={item}>{t(`category.${item}`)}</option>)}
          <option value="user">{t('category.user')}</option>
        </select>
      </label>
      <label className={controls.stack}>{t('category.user')}<input className={controls.field} value={customCategory} onChange={(event) => setCustomCategory(event.target.value)} /></label>
      <label className={controls.stack}>
        {t('card.quantity')}
        <select className={controls.select} value={quantityId} onChange={(event) => {
          const next = findQuantity(library, event.target.value)
          setQuantityId(event.target.value)
          if (next) {
            setUnitId(next.recommendedUnitId)
          }
        }}>
          {library.quantities.map((item) => <option key={item.id} value={item.id}>{item.name.en} / {item.name.ru}</option>)}
        </select>
      </label>
      {selected ? <p className={`${controls.muted} ${styles.wide}`}>{t('card.dimension')}: {formatDimension(selected.dimension)}</p> : null}
      <label className={controls.stack}>
        {t('card.compatibleUnits')}
        <select className={controls.select} value={unitId} onChange={(event) => setUnitId(event.target.value)}>
          {unitChoices.map((unit) => <option key={unit.id} value={unit.id}>{unit.symbol}</option>)}
        </select>
      </label>
      <label className={`${controls.stack} ${styles.wide}`}>{t('card.conditionsHint')}<textarea className={controls.area} value={conditions} onChange={(event) => setConditions(event.target.value)} /></label>
      <div className={styles.wide}>
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
    const quantityId = `quantity:user:${crypto.randomUUID()}`
    const withUnit = { ...library, units: [...library.units, createdUnit.unit] }
    const createdQuantity = createQuantityDefinition({
      id: quantityId,
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
    onCreated(quantityId, unitId)
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
