import { useEffect, useState } from 'react'
import { Link, useParams, useSearchParams } from 'react-router'
import { useReadyCatalog } from '../../data/useCatalog'
import { createConnection, deleteConnection, updateObjectDetails } from '../../domain/layout'
import {
  documentsForEntity,
  flowsForObject,
  getCategory,
  getCity,
  getDocument,
  getObject,
  getResourceType,
  getSystem,
  objectsForCity,
  tasksForObject,
} from '../../domain/queries'
import { ReliabilityBadge } from '../../shared/ui/ReliabilityBadge'
import { EmptyState } from '../../shared/ui/Status'
import controls from '../../shared/ui/controls.module.css'
import styles from './Inspector.module.css'

export function ObjectInspector() {
  const { snapshot, tasks, editCity } = useReadyCatalog()
  const { cityId, objectId } = useParams()
  const [searchParams] = useSearchParams()
  const [targetId, setTargetId] = useState('')
  const [resourceId, setResourceId] = useState(snapshot.resourceTypes[0]?.id ?? '')
  const [linkMessage, setLinkMessage] = useState<string | undefined>()
  const systemsMode = searchParams.get('view') === 'systems'
  const city = cityId ? getCity(snapshot, cityId) : undefined
  const object = objectId ? getObject(snapshot, objectId) : undefined

  if (!city || !object || object.cityId !== city.id) {
    return <EmptyState title="Object not found" detail="That object is not part of this city." />
  }

  const category = getCategory(snapshot, object.categoryId)
  const categoryFilter = searchParams.get('category')
  const hidden = Boolean(categoryFilter && categoryFilter !== object.categoryId)
  const flows = flowsForObject(snapshot, object.id)
  const documents = uniqueDocuments(snapshot, object.id, object.documentIds)
  const relatedTasks = tasksForObject(tasks, object.id)
  const search = searchParams.toString()

  return (
    <div className={styles.block}>
      <Link className={controls.ghost} to={{ pathname: `/cities/${city.id}`, search: search ? `?${search}` : '' }}>
        Back to city
      </Link>
      <div className={controls.row}>
        <h2>{object.name}</h2>
        <ReliabilityBadge reliability={object.reliability} />
      </div>
      <p className={controls.muted}>
        {category?.name ?? object.categoryId}
        {object.facilityType ? ` · ${object.facilityType}` : ''}
      </p>
      {hidden ? <p className={styles.hidden}>This object is hidden by the current category filter.</p> : null}
      <p>{object.description}</p>
      <p className={controls.muted}>{object.id}</p>
      <PropertyForm object={object} cityId={city.id} editCity={editCity} />
      {object.reliability.note ? <p className={controls.muted}>{object.reliability.note}</p> : null}
      {object.metrics.length > 0 ? (
        <section className={styles.block}>
          <h3>Characteristics</h3>
          {object.metrics.map((metric) => (
            <div key={metric.label} className={styles.metric}>
              <span>{metric.label}</span>
              <span>{metric.value}</span>
              <ReliabilityBadge reliability={metric.reliability} />
            </div>
          ))}
        </section>
      ) : null}
      <section className={styles.block}>
        <h3>Systems</h3>
        {object.systemIds.length === 0 ? <p className={controls.muted}>Not a member of a resource system.</p> : null}
        <ul className={styles.list}>
          {object.systemIds.map((systemId) => {
            const system = getSystem(snapshot, systemId)
            return (
              <li key={systemId}>
                <Link className={styles.item} to={`/cities/${city.id}/systems/${systemId}`}>
                  <strong>{system?.name ?? systemId}</strong>
                  <span className={controls.muted}>{system?.kind}</span>
                </Link>
              </li>
            )
          })}
        </ul>
      </section>
      <section className={styles.block}>
        <h3>Connections</h3>
        <p className={controls.muted}>A link records direction and resource type. It does not mean the resource has been distributed.</p>
        {flows.length === 0 ? <p className={controls.muted}>No incoming or outgoing links.</p> : null}
        <ul className={styles.list}>
          {flows.map((flow) => {
            const resource = getResourceType(snapshot, flow.resourceTypeId)
            const source = getObject(snapshot, flow.sourceObjectId)
            const target = getObject(snapshot, flow.targetObjectId)
            const otherId = flow.sourceObjectId === object.id ? flow.targetObjectId : flow.sourceObjectId
            return (
              <li key={flow.id} className={styles.item}>
                <Link to={{ pathname: `/cities/${city.id}/objects/${otherId}`, search: search ? `?${search}` : '' }}>
                  <strong>{source?.name ?? flow.sourceObjectId} → {target?.name ?? flow.targetObjectId}</strong>
                </Link>
                <span className={controls.muted}>{resource?.name ?? flow.resourceTypeId} · {resource?.flowKind}</span>
                {systemsMode ? (
                  <button type="button" className={controls.ghost} onClick={() => setLinkMessage(editCity(city.id, (draft) => deleteConnection(draft, flow.id)))}>
                    Delete link
                  </button>
                ) : null}
              </li>
            )
          })}
        </ul>
        {systemsMode ? (
          <form
            className={controls.stack}
            onSubmit={(event) => {
              event.preventDefault()
              setLinkMessage(editCity(city.id, (draft) => {
                const result = createConnection(
                  draft,
                  {
                    sourceObjectId: object.id,
                    targetObjectId: targetId,
                    resourceTypeId: resourceId,
                    flowId: `flow:${city.id.split(':')[1]}:${crypto.randomUUID()}`,
                  },
                  snapshot.resourceTypes,
                )
                return result.ok ? result.draft : { error: result.message }
              }))
            }}
          >
            <label className={controls.stack}>
              Recipient
              <select className={controls.select} value={targetId} onChange={(event) => setTargetId(event.target.value)}>
                <option value="">Choose an object</option>
                {objectsForCity(snapshot, city.id).filter((item) => item.id !== object.id).map((item) => (
                  <option key={item.id} value={item.id}>{item.name}</option>
                ))}
              </select>
            </label>
            <label className={controls.stack}>
              Resource
              <select className={controls.select} value={resourceId} onChange={(event) => setResourceId(event.target.value)}>
                {snapshot.resourceTypes.map((resource) => (
                  <option key={resource.id} value={resource.id}>{resource.name}</option>
                ))}
              </select>
            </label>
            <button className={controls.button} type="submit">Create link from this object</button>
            {linkMessage ? <span className={controls.error}>{linkMessage}</span> : null}
          </form>
        ) : null}
      </section>
      <section className={styles.block}>
        <h3>Documents</h3>
        {documents.length === 0 ? <p className={controls.muted}>No linked documents.</p> : null}
        <ul className={styles.list}>
          {documents.map((document) => (
            <li key={document.id}>
              <Link className={styles.item} to={`/documents/${document.id}`}>
                <strong>{document.title}</strong>
              </Link>
            </li>
          ))}
        </ul>
      </section>
      <section className={styles.block}>
        <h3>Tasks</h3>
        {relatedTasks.length === 0 ? <p className={controls.muted}>No tasks point at this object.</p> : null}
        <ul className={styles.list}>
          {relatedTasks.map((task) => (
            <li key={task.id} className={styles.item}>
              <strong>{task.title}</strong>
              <span className={controls.muted}>{task.status}</span>
            </li>
          ))}
        </ul>
      </section>
    </div>
  )
}

function PropertyForm({
  object,
  cityId,
  editCity,
}: {
  object: NonNullable<ReturnType<typeof getObject>>
  cityId: string
  editCity: ReturnType<typeof useReadyCatalog>['editCity']
}) {
  const [name, setName] = useState(object.name)
  const [description, setDescription] = useState(object.description)
  const [width, setWidth] = useState(String(object.placement.size.x))
  const [height, setHeight] = useState(String(object.placement.size.y))
  const [depth, setDepth] = useState(String(object.placement.size.z))
  const [message, setMessage] = useState<string | undefined>()

  useEffect(() => {
    setName(object.name)
    setDescription(object.description)
    setWidth(String(object.placement.size.x))
    setHeight(String(object.placement.size.y))
    setDepth(String(object.placement.size.z))
    setMessage(undefined)
  }, [object.id, object.name, object.description, object.placement.size.x, object.placement.size.y, object.placement.size.z])

  return (
    <form
      className={controls.stack}
      onSubmit={(event) => {
        event.preventDefault()
        const result = editCity(cityId, (draft) => updateObjectDetails(draft, object.id, {
          name,
          description,
          size: { x: Number(width), y: Number(height), z: Number(depth) },
        }))
        setMessage(result ?? 'Saved in this browser.')
      }}
    >
      <label className={controls.stack}>
        Name
        <input className={controls.field} value={name} onChange={(event) => setName(event.target.value)} />
      </label>
      <label className={controls.stack}>
        Description
        <textarea className={controls.area} value={description} onChange={(event) => setDescription(event.target.value)} />
      </label>
      <label className={controls.stack}>
        Width (m)
        <input className={controls.field} value={width} inputMode="decimal" onChange={(event) => setWidth(event.target.value)} />
      </label>
      <label className={controls.stack}>
        Height (m)
        <input className={controls.field} value={height} inputMode="decimal" onChange={(event) => setHeight(event.target.value)} />
      </label>
      <label className={controls.stack}>
        Depth (m)
        <input className={controls.field} value={depth} inputMode="decimal" onChange={(event) => setDepth(event.target.value)} />
      </label>
      <button className={controls.button} type="submit">Save properties</button>
      {message ? <span className={message.startsWith('Saved') ? controls.muted : controls.error}>{message}</span> : null}
    </form>
  )
}

function uniqueDocuments(snapshot: Parameters<typeof getDocument>[0], objectId: string, documentIds: string[]) {
  const fromLinks = documentsForEntity(snapshot, { kind: 'object', id: objectId })
  const fromIds = documentIds.flatMap((documentId) => {
    const document = getDocument(snapshot, documentId)
    return document ? [document] : []
  })
  const seen = new Set<string>()
  return [...fromLinks, ...fromIds].filter((document) => {
    if (seen.has(document.id)) {
      return false
    }
    seen.add(document.id)
    return true
  })
}
