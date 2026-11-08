import type { ReactNode } from 'react'
import controls from './controls.module.css'
import styles from './ConfirmDialog.module.css'

export function ConfirmDialog({
  title,
  children,
  confirmLabel,
  cancelLabel,
  onConfirm,
  onCancel,
}: {
  title: string
  children: ReactNode
  confirmLabel: string
  cancelLabel: string
  onConfirm: () => void
  onCancel: () => void
}) {
  return (
    <div className={styles.backdrop} onClick={onCancel}>
      <div className={styles.dialog} role="dialog" aria-modal="true" aria-labelledby="confirm-title" onClick={(event) => event.stopPropagation()}>
        <h2 id="confirm-title">{title}</h2>
        <div className={controls.muted}>{children}</div>
        <div className={styles.actions}>
          <button className={controls.ghost} type="button" onClick={onCancel}>{cancelLabel}</button>
          <button className={styles.confirm} type="button" onClick={onConfirm}>{confirmLabel}</button>
        </div>
      </div>
    </div>
  )
}
