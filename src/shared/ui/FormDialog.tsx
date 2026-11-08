import type { ReactNode } from 'react'
import styles from './ConfirmDialog.module.css'

export function FormDialog({ title, children, onCancel }: { title: string; children: ReactNode; onCancel: () => void }) {
  return (
    <div className={styles.backdrop} onClick={onCancel}>
      <div className={`${styles.dialog} ${styles.wide}`} role="dialog" aria-modal="true" aria-labelledby="form-dialog-title" onClick={(event) => event.stopPropagation()}>
        <h2 id="form-dialog-title">{title}</h2>
        {children}
      </div>
    </div>
  )
}
