import { describe, expect, it } from 'vitest'
import { emptyResourceCatalog, parseResourceCatalog } from './resource-catalog'
import { applyCardDraft, cardToDraft, createCardDraft, removeEvidenceDraft, type QuantityDraft } from './resource-catalog-form'

const now = '2026-11-01T12:00:00.000Z'

function withValue(quantity: QuantityDraft, valueText: string, unit: string, name: string): QuantityDraft {
  return { ...quantity, name, valueText, unit }
}

describe('resource catalog card draft', () => {
  it('keeps an empty measurement empty and keeps a written zero', () => {
    const draft = createCardDraft({ id: 'card:water', kind: 'resource', createdAt: now })
    draft.name = 'Fresh water'
    draft.quantities = [
      withValue({ ...draft.physicalAbundance, id: 'qty:absent', quantityKind: 'volume' }, '', 'm3', 'Volume'),
      withValue({ ...draft.physicalAbundance, id: 'qty:zero', quantityKind: 'volume' }, '0', 'm3', 'Volume'),
    ]
    const applied = applyCardDraft(emptyResourceCatalog(), draft, now)
    expect(applied.ok).toBe(true)
    if (!applied.ok) {
      return
    }
    expect(applied.catalog.cards[0]?.quantities.map((item) => item.value)).toEqual([null, 0])
    expect(applied.catalog.cards[0]?.sourceProfile).toBeUndefined()
    expect(applied.catalog.cards[0]?.consumerProfile).toBeUndefined()
    expect(applied.catalog.cards[0]?.evidence).toEqual([])
  })

  it('rejects a non-numeric value instead of storing zero', () => {
    const draft = createCardDraft({ id: 'card:ore', kind: 'resource', createdAt: now })
    draft.quantities = [withValue({ ...draft.physicalAbundance, id: 'qty:mass', quantityKind: 'mass' }, 'many', 'kg', 'Mass')]
    const applied = applyCardDraft(emptyResourceCatalog(), draft, now)
    expect(applied.ok).toBe(false)
  })

  it('drops a deleted study from every measurement that cited it', () => {
    const draft = createCardDraft({ id: 'card:power', kind: 'source', createdAt: now })
    draft.evidence = [{
      id: 'evidence:meter',
      title: 'Meter log',
      author: 'Plant office',
      yearText: '',
      url: 'https://example.test/meter',
      studyType: 'technical-documentation',
      supports: 'Rated power',
      verification: 'unreviewed',
    }]
    draft.quantities = [{
      ...withValue({ ...draft.physicalAbundance, id: 'qty:power', quantityKind: 'power' }, '500', 'kW', 'Rated power'),
      evidenceId: 'evidence:meter',
    }]
    draft.energyCost = {
      ...withValue({ ...draft.energyCost, quantityKind: 'energy' }, '10', 'kWh', 'Energy cost'),
      evidenceId: 'evidence:meter',
    }
    const cleared = removeEvidenceDraft(draft, 'evidence:meter')
    expect(cleared.evidence).toEqual([])
    expect(cleared.quantities[0]?.evidenceId).toBe('')
    expect(cleared.energyCost.evidenceId).toBe('')
    const applied = applyCardDraft(emptyResourceCatalog(), cleared, now)
    expect(applied.ok).toBe(true)
    if (!applied.ok) {
      return
    }
    expect(applied.catalog.cards[0]?.quantities[0]?.evidenceId).toBeUndefined()
    expect(applied.catalog.cards[0]?.sourceProfile?.energyCost?.evidenceId).toBeUndefined()
    expect(applied.catalog.cards[0]?.evidence).toEqual([])
  })

  it('stores source and consumer links without removing another card’s link', () => {
    const electricity = createCardDraft({ id: 'card:electricity', kind: 'resource', createdAt: now })
    electricity.name = 'Electrical energy'
    const first = applyCardDraft(emptyResourceCatalog(), electricity, now)
    expect(first.ok).toBe(true)
    if (!first.ok) {
      return
    }
    const solar = createCardDraft({ id: 'card:solar', kind: 'source', createdAt: now })
    solar.name = 'Solar power plant'
    solar.producedResourceIds = ['card:electricity']
    solar.maxCapacity = withValue({ ...solar.maxCapacity, quantityKind: 'power' }, '', 'kW', 'Maximum capacity')
    solar.continuous = 'no'
    const withSolar = applyCardDraft(first.catalog, solar, now)
    expect(withSolar.ok).toBe(true)
    if (!withSolar.ok) {
      return
    }
    const hospital = createCardDraft({ id: 'card:hospital', kind: 'consumer', createdAt: now })
    hospital.name = 'Hospital'
    hospital.usedResourceIds = ['card:electricity']
    hospital.servedText = '0'
    hospital.peakLoad = withValue({ ...hospital.peakLoad, quantityKind: 'power' }, '', 'kW', 'Peak load')
    const withHospital = applyCardDraft(withSolar.catalog, hospital, now)
    expect(withHospital.ok).toBe(true)
    if (!withHospital.ok) {
      return
    }
    expect(withHospital.catalog.links.map((link) => link.role).sort()).toEqual(['produces', 'uses'])
    const storedHospital = withHospital.catalog.cards.find((card) => card.id === 'card:hospital')
    expect(storedHospital?.consumerProfile?.served).toBe(0)
    expect(storedHospital?.sourceProfile).toBeUndefined()
    const restored = cardToDraft(withHospital.catalog.cards.find((card) => card.id === 'card:solar')!, withHospital.catalog.links)
    restored.producedResourceIds = []
    const removed = applyCardDraft(withHospital.catalog, restored, now)
    expect(removed.ok).toBe(true)
    if (!removed.ok) {
      return
    }
    expect(removed.catalog.links.map((link) => link.role)).toEqual(['uses'])
  })

  it('leaves an unknown served count and continuous flag unset', () => {
    const draft = createCardDraft({ id: 'card:plant', kind: 'source', createdAt: now })
    draft.name = 'Plant'
    const applied = applyCardDraft(emptyResourceCatalog(), draft, now)
    expect(applied.ok).toBe(true)
    if (!applied.ok) {
      return
    }
    expect(applied.catalog.cards[0]?.sourceProfile).toBeUndefined()
    const consumer = createCardDraft({ id: 'card:ward', kind: 'consumer', createdAt: now })
    consumer.servedText = ''
    const saved = applyCardDraft(applied.catalog, consumer, now)
    expect(saved.ok).toBe(true)
    if (!saved.ok) {
      return
    }
    expect(saved.catalog.cards.find((card) => card.id === 'card:ward')?.consumerProfile).toBeUndefined()
  })

  it('does not save a link to a missing resource', () => {
    const draft = createCardDraft({ id: 'card:solar', kind: 'source', createdAt: now })
    draft.producedResourceIds = ['card:missing']
    const applied = applyCardDraft(emptyResourceCatalog(), draft, now)
    expect(applied.ok).toBe(false)
    if (!applied.ok) {
      expect(applied.message).toBe('form.resource')
    }
  })

  it('keeps several characteristics and drops a saved city or region', () => {
    const parsed = parseResourceCatalog({
      version: 1,
      cards: [{
        id: 'card:water',
        kind: 'resource',
        name: 'Fresh water',
        category: 'water',
        summary: 'A municipal definition',
        status: 'draft',
        scarcity: 'unknown',
        priority: 'P3',
        createdAt: now,
        updatedAt: now,
        cityId: 'city:aurora',
        regionId: 'region:basin',
        regionLabel: 'Example basin',
        quantities: [
          { id: 'qty:density', name: 'Density', value: null, unit: 'kg/m3', quantityKind: 'density', aspect: 'property', evidenceId: 'evidence:survey' },
          { id: 'qty:ph', name: 'pH', value: null, unit: '', quantityKind: 'count', aspect: 'quality' },
        ],
        evidence: [{
          id: 'evidence:survey',
          title: 'Basin survey',
          author: 'City water office',
          year: 2024,
          url: null,
          studyType: 'study',
          supports: 'Density',
          verification: 'unreviewed',
        }],
        accounts: { regional: [] },
      }],
      links: [],
    })
    expect(parsed.ok).toBe(true)
    if (!parsed.ok) {
      return
    }
    const stored = parsed.catalog.cards[0]
    expect(stored).not.toHaveProperty('cityId')
    expect(stored?.quantities).toHaveLength(2)
    expect(stored?.evidence[0]?.title).toBe('Basin survey')
    const draft = cardToDraft(stored!, parsed.catalog.links)
    draft.quantities.push({
      ...draft.quantities[0]!,
      id: 'qty:limit',
      name: 'pH limit',
      valueText: '',
      aspect: 'requirement',
      evidenceId: 'evidence:survey',
    })
    const applied = applyCardDraft(parsed.catalog, draft, now)
    expect(applied.ok).toBe(true)
    if (!applied.ok) {
      return
    }
    const saved = applied.catalog.cards[0]
    expect(saved).not.toHaveProperty('cityId')
    expect(saved).not.toHaveProperty('regionId')
    expect(saved?.quantities.map((item) => item.aspect)).toEqual(['property', 'quality', 'requirement'])
    expect(saved?.quantities.filter((item) => item.evidenceId === 'evidence:survey')).toHaveLength(2)
    expect(saved?.quantities[0]?.value).toBeNull()
    expect(saved?.evidence).toHaveLength(1)
  })
})
