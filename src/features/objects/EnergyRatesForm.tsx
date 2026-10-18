import { useEffect, useState } from 'react'
import { useReadyCatalog } from '../../data/useCatalog'
import type { LinkLimit, ObjectResourceRole } from '../../domain/balance'
import { clearLinkLimit, clearResourceRole, setLinkLimit, setResourceRole } from '../../domain/layout'
import { getObject } from '../../domain/queries'
import type { ResourceFlow } from '../../domain/types'
import controls from '../../shared/ui/controls.module.css'
import styles from './Inspector.module.css'

const electricityId = 'resource:electricity'

export function EnergyRatesForm({
  cityId,
  objectId,
  facilityType,
  flows,
  role,
  limits,
  editCity,
}: {
  cityId: string
  objectId: string
  facilityType?: string
  flows: ResourceFlow[]
  role: ObjectResourceRole | undefined
  limits: readonly LinkLimit[] | undefined
  editCity: ReturnType<typeof useReadyCatalog>['editCity']
}) {
  const networkRole = energyNetworkRole(facilityType)
  return (
    <section className={styles.block}>
      <h3>Energy balance</h3>
      <p>Role in the electricity network: {networkRole.label}.</p>
      <p className={controls.muted}>{networkRole.guidance}</p>
      <p className={controls.muted}>An empty field means the value is not set. Type 0 only when you mean zero. Storage is saved with the city and is not used in the calculation yet.</p>
      <RoleForm cityId={cityId} objectId={objectId} role={role} editCity={editCity} />
      {flows.length === 0 ? <p className={controls.muted}>No electrical connections on this object.</p> : null}
      {flows.map((flow) => (
        <LineForm key={flow.id} cityId={cityId} flow={flow} limit={limits?.find((item) => item.flowId === flow.id)} editCity={editCity} />
      ))}
    </section>
  )
}

function RoleForm({
  cityId,
  objectId,
  role,
  editCity,
}: {
  cityId: string
  objectId: string
  role: ObjectResourceRole | undefined
  editCity: ReturnType<typeof useReadyCatalog>['editCity']
}) {
  const [produces, setProduces] = useState('')
  const [consumes, setConsumes] = useState('')
  const [priority, setPriority] = useState('')
  const [stores, setStores] = useState('')
  const [stock, setStock] = useState('')
  const [message, setMessage] = useState<string | undefined>()

  useEffect(() => {
    setProduces(role ? String(role.produces) : '')
    setConsumes(role ? String(role.consumes) : '')
    setPriority(role ? String(role.priority) : '')
    setStores(role ? String(role.stores) : '')
    setStock(role ? String(role.stock) : '')
    setMessage(undefined)
  }, [objectId, role])

  return (
    <form
      className={controls.stack}
      onSubmit={(event) => {
        event.preventDefault()
        const parsed = {
          produces: readNumber('Production', produces),
          consumes: readNumber('Demand', consumes),
          priority: readNumber('Priority', priority),
          stores: readNumber('Storage capacity', stores),
          stock: readNumber('Stored energy', stock),
        }
        const problem = Object.values(parsed).find((value) => typeof value === 'string')
        if (typeof problem === 'string') {
          setMessage(problem)
          return
        }
        if (typeof parsed.produces !== 'number' || typeof parsed.consumes !== 'number' || typeof parsed.priority !== 'number' || typeof parsed.stores !== 'number' || typeof parsed.stock !== 'number') {
          return
        }
        setMessage(editCity(cityId, (draft) => setResourceRole(draft, {
          objectId,
          resourceTypeId: electricityId,
          produces: parsed.produces as number,
          consumes: parsed.consumes as number,
          priority: parsed.priority as number,
          stores: parsed.stores as number,
          stock: parsed.stock as number,
        })) ?? 'Saved in this browser.')
      }}
    >
      <p className={controls.muted}>{role ? 'Rates are set for this object.' : 'Power supply parameters not set for this object.'}</p>
      <NumberField label="Electricity production (kWh/day)" hint="How much this object makes in one day. A home is usually 0. A plant might be 100." value={produces} onChange={setProduces} />
      <NumberField label="Electricity demand (kWh/day)" hint="How much this object asks for in one day. A plant is usually 0. A home might be 40." value={consumes} onChange={setConsumes} />
      <NumberField label="Supply priority (a lower number is served first)" hint="1 is served before 2. Example: 1." value={priority} onChange={setPriority} />
      <NumberField label="Storage capacity (kWh)" hint="How much could be stored. Not used by the balance yet. Example: 0 if you mean none." value={stores} onChange={setStores} />
      <NumberField label="Stored now (kWh)" hint="How much is stored today. Not used by the balance yet. Example: 0 if you mean none." value={stock} onChange={setStock} />
      <div className={controls.row}>
        <button className={controls.button} type="submit">Save energy rates</button>
        <button
          className={controls.ghost}
          type="button"
          onClick={() => setMessage(editCity(cityId, (draft) => clearResourceRole(draft, objectId, electricityId)) ?? 'Cleared. Parameters are not set.')}
        >
          Clear energy rates
        </button>
      </div>
      {message ? <span className={message.startsWith('Saved') || message.startsWith('Cleared') ? controls.muted : controls.error}>{message}</span> : null}
    </form>
  )
}

function LineForm({
  cityId,
  flow,
  limit,
  editCity,
}: {
  cityId: string
  flow: ResourceFlow
  limit: LinkLimit | undefined
  editCity: ReturnType<typeof useReadyCatalog>['editCity']
}) {
  const { snapshot } = useReadyCatalog()
  const [capacity, setCapacity] = useState('')
  const [lossPercent, setLossPercent] = useState('')
  const [service, setService] = useState('')
  const [message, setMessage] = useState<string | undefined>()
  const source = getObject(snapshot, flow.sourceObjectId)?.name ?? flow.sourceObjectId
  const target = getObject(snapshot, flow.targetObjectId)?.name ?? flow.targetObjectId

  useEffect(() => {
    setCapacity(limit ? String(limit.capacity) : '')
    setLossPercent(limit ? String(Math.round(limit.loss * 100 * 1e6) / 1e6) : '')
    setService(limit ? (limit.inService ? 'enabled' : 'disabled') : '')
    setMessage(undefined)
  }, [flow.id, limit])

  return (
    <form
      className={controls.stack}
      onSubmit={(event) => {
        event.preventDefault()
        const parsedCapacity = readNumber('Capacity', capacity)
        const parsedLoss = readNumber('Losses', lossPercent)
        if (typeof parsedCapacity === 'string') {
          setMessage(parsedCapacity)
          return
        }
        if (typeof parsedLoss === 'string') {
          setMessage(parsedLoss)
          return
        }
        if (service !== 'enabled' && service !== 'disabled') {
          setMessage('Choose enabled or disabled. An empty choice is not a default.')
          return
        }
        if (parsedLoss < 0 || parsedLoss > 100) {
          setMessage('Losses must be a percent from 0 to 100.')
          return
        }
        setMessage(editCity(cityId, (draft) => setLinkLimit(draft, {
          flowId: flow.id,
          capacity: parsedCapacity,
          loss: parsedLoss / 100,
          inService: service === 'enabled',
        })) ?? 'Saved in this browser.')
      }}
    >
      <strong>{source} → {target}</strong>
      <p className={controls.muted}>{limit ? 'Line parameters are set.' : 'Line parameters are not set.'}</p>
      <NumberField label="Capacity (kWh/day)" hint="The most this line can send in one day. Example: 80. This does not change the building." value={capacity} onChange={setCapacity} />
      <NumberField label="Losses (%)" hint="The share that does not arrive. 0 means no loss. 10 means one tenth is lost." value={lossPercent} onChange={setLossPercent} />
      <label className={controls.stack} title="Enabled lets the line carry electricity. Disabled keeps the line on the map of connections but it delivers nothing.">
        Connection state
        <span className={controls.muted}>Enabled carries electricity. Disabled delivers nothing. Not set means the line has no status yet.</span>
        <select className={controls.select} value={service} onChange={(event) => setService(event.target.value)}>
          <option value="">Not set</option>
          <option value="enabled">Enabled</option>
          <option value="disabled">Disabled</option>
        </select>
      </label>
      <div className={controls.row}>
        <button className={controls.button} type="submit">Save line</button>
        <button className={controls.ghost} type="button" onClick={() => setMessage(editCity(cityId, (draft) => clearLinkLimit(draft, flow.id)) ?? 'Cleared. Parameters are not set.')}>
          Clear line
        </button>
      </div>
      {message ? <span className={message.startsWith('Saved') || message.startsWith('Cleared') ? controls.muted : controls.error}>{message}</span> : null}
    </form>
  )
}

function NumberField({ label, hint, value, onChange }: { label: string; hint: string; value: string; onChange: (value: string) => void }) {
  return (
    <label className={controls.stack} title={hint}>
      {label}
      <span className={controls.muted}>{hint}</span>
      <input className={controls.field} value={value} placeholder="Not set" inputMode="decimal" onChange={(event) => onChange(event.target.value)} />
    </label>
  )
}

function energyNetworkRole(facilityType?: string): { label: string; guidance: string } {
  switch (facilityType) {
    case 'energy-source':
      return { label: 'Source', guidance: 'A power plant is entered as production. Demand is usually 0 unless the plant itself uses electricity.' }
    case 'distribution-center':
      return { label: 'Distribution node', guidance: 'A hub does not make or use electricity in this example. It passes on what arrives, up to the capacity of each outgoing line. Production and demand are usually 0.' }
    case 'habitat':
      return { label: 'Consumer', guidance: 'A home is entered as consumption. Production is usually 0.' }
    case 'workshop':
    case 'production-facility':
      return { label: 'Consumer', guidance: 'This building uses electricity in the current balance. Enter how much it asks for. Production is usually 0.' }
    default:
      return { label: 'Not assigned by the building type', guidance: 'The catalog does not give this object an energy role. You can still enter rates. Use production for a source and demand for a user of electricity.' }
  }
}

function readNumber(label: string, raw: string): number | string {
  const trimmed = raw.trim()
  if (!trimmed) {
    return `${label} is blank. Type a number. A blank is not zero.`
  }
  const value = Number(trimmed)
  if (!Number.isFinite(value)) {
    return `${label} must be a number.`
  }
  return value
}
