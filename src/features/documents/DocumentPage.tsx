import { Link, useParams } from 'react-router'
import { useReadyCatalog } from '../../data/useCatalog'
import { entityLabel, getDocument, getObject, getSystem } from '../../domain/queries'
import { documentKindLabel } from '../../shared/labels'
import { ReliabilityBadge } from '../../shared/ui/ReliabilityBadge'
import { EmptyState } from '../../shared/ui/Status'
import controls from '../../shared/ui/controls.module.css'
import styles from './Documents.module.css'

export function DocumentPage() {
  const { snapshot } = useReadyCatalog()
  const { documentId } = useParams()
  const document = documentId ? getDocument(snapshot, documentId) : undefined

  if (!document) {
    return <EmptyState title="Document not found" action={<Link to="/documents">All documents</Link>} />
  }

  return (
    <article className={styles.page}>
      <Link className={controls.ghost} to="/documents">All documents</Link>
      <header className={styles.links}>
        <h1>{document.title}</h1>
        <div className={controls.row}>
          <span className={controls.muted}>{documentKindLabel[document.kind]}</span>
          <ReliabilityBadge reliability={document.reliability} />
        </div>
        {document.reliability.note ? <p className={controls.muted}>{document.reliability.note}</p> : null}
        {document.reliability.source ? <p className={controls.muted}>Source: {document.reliability.source}</p> : null}
      </header>
      {document.body.split(/\n\n+/).map((paragraph) => (
        <p key={paragraph.slice(0, 48)} className={styles.body}>{paragraph}</p>
      ))}
      <section className={styles.links}>
        <h2>Linked records</h2>
        {document.links.length === 0 ? <p className={controls.muted}>This note is not tied to one record.</p> : null}
        {document.links.map((link) => (
          <Link key={`${link.kind}:${link.id}`} to={hrefFor(snapshot, link)}>
            {link.kind}: {entityLabel(snapshot, link)}
          </Link>
        ))}
      </section>
    </article>
  )
}

function hrefFor(snapshot: Parameters<typeof getObject>[0], link: { kind: 'city' | 'object' | 'system'; id: string }): string {
  if (link.kind === 'city') {
    return `/cities/${link.id}`
  }
  if (link.kind === 'object') {
    const object = getObject(snapshot, link.id)
    return object ? `/cities/${object.cityId}/objects/${object.id}` : '/documents'
  }
  const system = getSystem(snapshot, link.id)
  return system ? `/cities/${system.cityId}/systems/${system.id}` : '/documents'
}
