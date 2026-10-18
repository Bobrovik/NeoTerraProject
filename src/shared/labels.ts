import type { DevelopmentStatus, DocumentKind, ReliabilityStatus, TaskPriority, TaskStatus } from '../domain/types'

export const reliabilityLabel: Record<ReliabilityStatus, string> = {
  verified: 'Verified',
  'engineering-fact': 'Engineering fact',
  'fresco-principle': 'Fresco principle',
  hypothesis: 'Hypothesis',
  demo: 'Demo',
}

export const documentKindLabel: Record<DocumentKind, string> = {
  principle: 'Principle',
  hypothesis: 'Hypothesis',
  source: 'Source',
  question: 'Question',
  note: 'Note',
}

export const taskStatusLabel: Record<TaskStatus, string> = {
  open: 'Open',
  'in-progress': 'In progress',
  done: 'Done',
}

export const taskPriorityLabel: Record<TaskPriority, string> = {
  low: 'Low',
  medium: 'Medium',
  high: 'High',
}

export const developmentStatusLabel: Record<DevelopmentStatus, string> = {
  concept: 'Concept',
  schematic: 'Schematic',
}

export const taskStatusOrder: TaskStatus[] = ['open', 'in-progress', 'done']
