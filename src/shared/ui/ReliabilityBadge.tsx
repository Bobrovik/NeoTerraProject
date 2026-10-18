import type { Reliability, ReliabilityStatus } from '../../domain/types'
import { reliabilityLabel } from '../labels'
import styles from './ReliabilityBadge.module.css'

const statusClass: Record<ReliabilityStatus, string | undefined> = {
  verified: styles.verified,
  'engineering-fact': styles.engineeringFact,
  'fresco-principle': styles.frescoPrinciple,
  hypothesis: styles.hypothesis,
  demo: styles.demo,
}

export function ReliabilityBadge({ reliability }: { reliability: Reliability }) {
  const className = [styles.badge, statusClass[reliability.status]].filter(Boolean).join(' ')
  const detail = [reliability.note, reliability.source].filter(Boolean).join(' ')
  return (
    <span className={className} title={detail || undefined}>
      {reliabilityLabel[reliability.status]}
    </span>
  )
}
