import { Link } from 'react-router'
import { EmptyState } from '../../shared/ui/Status'

export function NotFoundPage() {
  return <EmptyState title="Page not found" action={<Link to="/">Go to the home page</Link>} />
}
