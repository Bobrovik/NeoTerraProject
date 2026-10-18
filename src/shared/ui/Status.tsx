import type { ReactNode } from 'react'
import styles from './Status.module.css'

export function LoadingState({ label = 'Loading catalog…' }: { label?: string }) {
  return (
    <section className={styles.box} role="status">
      <h1 className={styles.title}>{label}</h1>
    </section>
  )
}

export function ErrorState({ title, detail }: { title: string; detail?: string }) {
  return (
    <section className={styles.box} role="alert">
      <h1 className={styles.title}>{title}</h1>
      {detail ? <p>{detail}</p> : null}
    </section>
  )
}

export function EmptyState({ title, detail, action }: { title: string; detail?: string; action?: ReactNode }) {
  return (
    <section className={styles.box}>
      <h2 className={styles.title}>{title}</h2>
      {detail ? <p>{detail}</p> : null}
      {action}
    </section>
  )
}
