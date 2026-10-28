import { useState } from 'react'
import { useLocation } from 'react-router'
import { useReadyCatalog } from '../../data/useCatalog'
import type { EnergyBalance, LinkBalance, ObjectBalance, ObjectConstraint } from '../../domain/balance'
import { buildingTemplates } from '../../domain/buildings'
import { energyFacilityRole, reportDraftElectricity, sampleEnergyAssumptions } from '../../domain/energy-view'
import { applySampleEnergyRates, loadEnergyExample, revertEnergyExample } from '../../domain/layout'
import { getObject, objectsForCity } from '../../domain/queries'
import type { ResourceFlow } from '../../domain/types'
import controls from '../../shared/ui/controls.module.css'
import { isCityEditorPath } from '../city/city-view'
import styles from '../objects/Inspector.module.css'
import schematic from './EnergyBalancePanel.module.css'

const electricityId = 'resource:electricity'

export function EnergyBalancePanel({ cityId }: { cityId: string }) {
  const editing = isCityEditorPath(useLocation().pathname)
  const { snapshot, drafts, userCityIds, editCity } = useReadyCatalog()
  const [exampleMessage, setExampleMessage] = useState<string | undefined>()
  const [confirmSample, setConfirmSample] = useState(false)
  const objects = objectsForCity(snapshot, cityId)
  const objectIds = new Set(objects.map((object) => object.id))
  const draft = drafts.find((item) => item.cityId === cityId)
  const flows = snapshot.flows.filter((flow) => flow.resourceTypeId === electricityId && objectIds.has(flow.sourceObjectId) && objectIds.has(flow.targetObjectId))
  const report = reportDraftElectricity(objects, snapshot.flows, draft)
  const balance = report.status === 'ready' ? report.balance : undefined
  const nameOf = (objectId: string) => getObject(snapshot, objectId)?.name ?? objectId

  return (
    <section className={styles.block}>
      <h3>Energy balance</h3>
      {editing && userCityIds.includes(cityId) ? (
        <div className={controls.stack}>
          <button
            type="button"
            className={controls.button}
            onClick={() => {
              if (flows.length === 0) {
                setConfirmSample(false)
                setExampleMessage('This city has no electrical connections. Sample values were not applied, and no supply network was created. Add an electricity link from a source to the buildings that should receive power, then apply the sample again.')
                return
              }
              setConfirmSample(true)
            }}
          >
            Apply sample energy supply values to the city
          </button>
          {confirmSample ? (
            <div className={controls.stack}>
              <p className={controls.muted}>
                Training assumptions will replace the electricity rates and line limits in this city. Sources {sampleEnergyAssumptions.sourceProducesKwh} kWh/day, homes {sampleEnergyAssumptions.habitatConsumesKwh}, workshops {sampleEnergyAssumptions.workplaceConsumesKwh}, hubs 0 and 0, lines {sampleEnergyAssumptions.lineCapacityKwh} kWh/day with no loss and enabled. These are not measured standards. Buildings and connections stay as they are. Objects with no energy role are left blank.
              </p>
              <div className={controls.row}>
                <button
                  type="button"
                  className={controls.button}
                  onClick={() => {
                    setConfirmSample(false)
                    const skipped = objects.filter((object) => energyFacilityRole(object.facilityType) === 'unassigned').map((object) => object.name)
                    const note = skipped.length > 0 ? ` Left blank because the building type has no energy role: ${skipped.join(', ')}.` : ''
                    setExampleMessage(editCity(cityId, (current) => applySampleEnergyRates(current)) ?? `Training values applied. They are assumptions, not a real power system.${note}`)
                  }}
                >
                  Apply training values
                </button>
                <button type="button" className={controls.ghost} onClick={() => setConfirmSample(false)}>Cancel</button>
              </div>
            </div>
          ) : null}
          <div className={controls.row}>
            <button
              type="button"
              className={controls.ghost}
              onClick={() => setExampleMessage(editCity(cityId, (current) => loadEnergyExample(current, buildingTemplates, snapshot.resourceTypes)) ?? 'Tutorial example loaded. These numbers are not a real power system.')}
            >
              Load energy supply example
            </button>
            {draft?.energyExampleBackup ? (
              <button type="button" className={controls.ghost} onClick={() => setExampleMessage(editCity(cityId, (current) => revertEnergyExample(current)) ?? 'Restored the city from before the example.')}>
                Restore city before the example
              </button>
            ) : null}
          </div>
        </div>
      ) : null}
      {draft?.energyExampleBackup ? <p className={controls.muted}>These values are a tutorial. They are not measurements and they are not a proposal for a real city.</p> : null}
      {exampleMessage ? <p className={exampleMessage.startsWith('Tutorial') || exampleMessage.startsWith('Restored') || exampleMessage.startsWith('Training') ? controls.muted : controls.error}>{exampleMessage}</p> : null}
      <h3>Schematic</h3>
      <p className={controls.muted}>Saved electrical connections only. Roads are not power lines. Figures come from the balance result.</p>
      <EnergySchematic flows={flows} balance={balance} nameOf={nameOf} />
      {report.status === 'not-set' ? <p>{report.message}</p> : null}
      {report.status === 'unavailable' ? (
        <>
          <p>Calculation impossible.</p>
          <p className={controls.muted}>{report.message}</p>
        </>
      ) : null}
      {balance ? (
        <>
          <p>Production {balance.generated} kWh. Demand {balance.requested} kWh. Delivered {balance.delivered} kWh. Deficit {balance.shortfall} kWh.</p>
          {balance.notes.map((note) => <p key={note} className={controls.muted}>{note}</p>)}
          <h3>Buildings and lines</h3>
          <ReadyBalance report={balance} />
        </>
      ) : null}
    </section>
  )
}

function EnergySchematic({ flows, balance, nameOf }: { flows: ResourceFlow[]; balance: EnergyBalance | undefined; nameOf: (objectId: string) => string }) {
  const nodeIds = [...new Set(flows.flatMap((flow) => [flow.sourceObjectId, flow.targetObjectId]))]
  if (nodeIds.length === 0) {
    return <p className={controls.muted}>No electrical connections to draw.</p>
  }
  return (
    <div className={schematic.board}>
      {nodeIds.map((objectId) => {
        const item = balance?.objects.find((object) => object.objectId === objectId)
        return (
          <p key={objectId} className={item ? nodeClass(item) : schematic.node}>
            <strong>{nameOf(objectId)}</strong>
            {item ? <span> Production {item.produced}. Demand {item.requested}. Delivered {item.supplied}. Deficit {item.shortfall}.</span> : <span> No balance value yet.</span>}
          </p>
        )
      })}
      {flows.map((flow) => {
        const link = balance?.links.find((item) => item.flowId === flow.id)
        return (
          <p key={flow.id} className={link ? lineClass(link) : schematic.line}>
            {nameOf(flow.sourceObjectId)} → {nameOf(flow.targetObjectId)}
            {link ? <span> Sent {link.sent}. Delivered {link.arrived}. Capacity {link.capacity}. Losses {formatPercent(link.loss)}. {link.inService ? 'Enabled' : 'Disabled'}.</span> : <span> Line values are not available until the balance can be calculated.</span>}
          </p>
        )
      })}
    </div>
  )
}

function nodeClass(item: ObjectBalance): string {
  if (item.shortfall > 0) {
    return `${schematic.node} ${schematic.deficit}`
  }
  if (item.requested > 0) {
    return `${schematic.node} ${schematic.supplied}`
  }
  return schematic.node
}

function lineClass(link: LinkBalance): string {
  if (link.limited) {
    return `${schematic.line} ${schematic.limited}`
  }
  return schematic.line
}

function ReadyBalance({ report }: { report: EnergyBalance }) {
  const { snapshot } = useReadyCatalog()
  return (
    <>
      <h3>Buildings</h3>
      <ul className={styles.list}>
        {report.objects.map((item) => (
          <li key={item.objectId} className={styles.item}>
            <strong>{getObject(snapshot, item.objectId)?.name ?? item.objectId}</strong>
            <span className={controls.muted}>
              Production {item.produced} kWh. Demand {item.requested} kWh. Received {item.supplied} kWh. Deficit {item.shortfall} kWh. {constraintText(item)}
            </span>
          </li>
        ))}
      </ul>
      <h3>Lines</h3>
      {report.links.length === 0 ? <p className={controls.muted}>No electrical connections.</p> : null}
      <ul className={styles.list}>
        {report.links.map((link) => {
          const source = getObject(snapshot, link.sourceObjectId)?.name ?? link.sourceObjectId
          const target = getObject(snapshot, link.targetObjectId)?.name ?? link.targetObjectId
          return (
            <li key={link.flowId} className={styles.item}>
              <strong>{source} → {target}</strong>
              <span className={controls.muted}>
                Sent {link.sent} kWh. Delivered {link.arrived} kWh. Capacity {link.capacity} kWh/day. Losses {formatPercent(link.loss)}. {link.inService ? 'Enabled' : 'Disabled'}. {link.limited ? 'This line is limiting delivery.' : 'This line is not the limit.'}
              </span>
            </li>
          )
        })}
      </ul>
    </>
  )
}

function constraintText(item: ObjectBalance): string {
  const text: Record<ObjectConstraint, string> = {
    none: 'No shortage.',
    generation: 'Short because generation is short.',
    'line-capacity': 'Short because a line is at capacity.',
    'line-loss': 'Short because loss reduced what arrived.',
    disconnected: 'Short because a line is out of service or missing.',
  }
  return text[item.constraint]
}

function formatPercent(loss: number): string {
  return `${Math.round(loss * 100 * 1e6) / 1e6}%`
}
