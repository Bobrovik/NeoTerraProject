import { Link } from 'react-router'
import { useReadyCatalog } from '../../data/useCatalog'
import { documentKindLabel } from '../../shared/labels'
import { ReliabilityBadge } from '../../shared/ui/ReliabilityBadge'
import { EmptyState } from '../../shared/ui/Status'
import styles from './Documents.module.css'

export function DocumentListPage() {
  const { snapshot } = useReadyCatalog()

  if (snapshot.documents.length === 0) {
    return <EmptyState title="No documents" detail="The catalog does not include any notes yet." />
  }

  return (
    <div className={styles.page}>
      <header>
        <h1>Documents</h1>
        <p>Notes, principles, and open questions. Each one can point at a city, an object, or a system.</p>
      </header>
      <ul className={styles.list}>
        {snapshot.documents.map((document) => (
          <li key={document.id}>
            <Link className={styles.card} to={`/documents/${document.id}`}>
              <div>
                <strong>{document.title}</strong>
              </div>
              <span>
                {documentKindLabel[document.kind]} · <ReliabilityBadge reliability={document.reliability} />
              </span>
              <span>{document.summary}</span>
            </Link>
          </li>
        ))}
      </ul>
    </div>
  )
}
