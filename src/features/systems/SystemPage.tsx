import { Link, useNavigate, useParams } from 'react-router'
import { useReadyCatalog } from '../../data/useCatalog'
import { documentsForEntity, getCity, getSystem, tasksForSystem } from '../../domain/queries'
import { buildSystemGraph, systemGraphNodeSize } from '../../domain/system-graph'
import { ReliabilityBadge } from '../../shared/ui/ReliabilityBadge'
import { EmptyState } from '../../shared/ui/Status'
import controls from '../../shared/ui/controls.module.css'
import styles from './SystemPage.module.css'

export function SystemPage() {
  const { snapshot, tasks } = useReadyCatalog()
  const navigate = useNavigate()
  const { cityId, systemId } = useParams()
  const city = cityId ? getCity(snapshot, cityId) : undefined
  const system = systemId ? getSystem(snapshot, systemId) : undefined

  if (!city || !system || system.cityId !== city.id) {
    return <EmptyState title="System not found" detail="That system is not part of this city." action={<Link to="/planet">Back to the planet</Link>} />
  }

  const graph = buildSystemGraph(snapshot, system.id)
  const documents = documentsForEntity(snapshot, { kind: 'system', id: system.id })
  const relatedTasks = tasksForSystem(tasks, system.id)

  return (
    <div className={styles.page}>
      <div className={controls.row}>
        <Link className={controls.ghost} to={`/cities/${city.id}`}>Back to {city.name}</Link>
      </div>
      <header className={styles.lead}>
        <div className={controls.row}>
          <h1>{system.name}</h1>
          <ReliabilityBadge reliability={system.reliability} />
        </div>
        <p>Kind: {system.kind}. This is a diagram of catalog links, not a calculated balance.</p>
        <p>{system.description}</p>
      </header>
      {graph && graph.nodes.length > 0 ? (
        <div className={styles.canvasWrap}>
          <svg width={graph.width} height={graph.height} role="img" aria-label={`${system.name} diagram`}>
            {graph.edges.map((edge) => (
              <g key={edge.flowId}>
                <line className={styles.link} x1={edge.x1} y1={edge.y1} x2={edge.x2} y2={edge.y2} stroke={edge.color} />
                <text className={styles.edgeLabel} x={(edge.x1 + edge.x2) / 2} y={(edge.y1 + edge.y2) / 2 - 6}>
                  {edge.resourceName}
                </text>
              </g>
            ))}
            {graph.nodes.map((node) => (
              <g
                key={node.objectId}
                role="link"
                tabIndex={0}
                style={{ cursor: 'pointer' }}
                onClick={() => navigate(`/cities/${city.id}/objects/${node.objectId}?view=flows`)}
                onKeyDown={(event) => {
                  if (event.key === 'Enter') {
                    navigate(`/cities/${city.id}/objects/${node.objectId}?view=flows`)
                  }
                }}
              >
                <rect className={styles.node} x={node.x} y={node.y} width={systemGraphNodeSize.width} height={systemGraphNodeSize.height} rx={8} />
                <text className={styles.label} x={node.x + 12} y={node.y + 27}>
                  {node.name}
                </text>
              </g>
            ))}
          </svg>
        </div>
      ) : (
        <EmptyState title="This system has no members" detail="Add member objects in the catalog to draw the diagram." />
      )}
      <section>
        <h2>Documents</h2>
        {documents.length === 0 ? <p className={controls.muted}>No linked documents.</p> : null}
        <ul>
          {documents.map((document) => (
            <li key={document.id}>
              <Link to={`/documents/${document.id}`}>{document.title}</Link>
            </li>
          ))}
        </ul>
      </section>
      <section>
        <h2>Tasks</h2>
        {relatedTasks.length === 0 ? <p className={controls.muted}>No tasks point at this system.</p> : null}
        <ul>
          {relatedTasks.map((task) => (
            <li key={task.id}>{task.title}</li>
          ))}
        </ul>
      </section>
    </div>
  )
}
