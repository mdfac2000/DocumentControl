import type { IssueStatus } from '@/types/issue'

export type IssueStatusGroup = 'draft' | 'open' | 'closed' | 'void' | 'unknown'
export type AccDefaultStatus =
  | 'draft'
  | 'open'
  | 'pending'
  | 'in_progress'
  | 'completed'
  | 'in_review'
  | 'not_approved'
  | 'closed'
  | 'void'

export const ACC_DEFAULT_STATUS_ORDER: Array<AccDefaultStatus | 'unknown'> = [
  'draft',
  'open',
  'pending',
  'in_progress',
  'completed',
  'in_review',
  'not_approved',
  'closed',
  'void',
  'unknown',
]

const GROUP_LABELS: Record<IssueStatusGroup, string> = {
  draft: 'Borrador',
  open: 'Abiertos',
  closed: 'Cerrados',
  void: 'Anulados',
  unknown: 'No definido',
}

const GROUP_COLORS: Record<IssueStatusGroup, string> = {
  draft: '#94a3b8',
  open: '#f59e0b',
  closed: '#22c55e',
  void: '#6b7280',
  unknown: '#1e1e1e',
}

const STATUS_LABELS: Record<string, string> = {
  draft: 'Borrador',
  borrador: 'Borrador',
  open: 'Abierta',
  opened: 'Abierta',
  abierto: 'Abierta',
  abierta: 'Abierta',
  pending: 'Pendiente',
  pendiente: 'Pendiente',
  in_progress: 'En curso',
  inprogress: 'En curso',
  en_curso: 'En curso',
  in_review: 'En revisión',
  inreview: 'En revisión',
  en_revision: 'En revisión',
  closed: 'Cerrada',
  cerrado: 'Cerrada',
  cerrada: 'Cerrada',
  completed: 'Completada',
  completado: 'Completada',
  completada: 'Completada',
  not_approved: 'No aprobada',
  notapproved: 'No aprobada',
  no_aprobada: 'No aprobada',
  no_aprobado: 'No aprobada',
  void: 'Anulado',
  anulado: 'Anulado',
  anulada: 'Anulado',
}

function normalizeStatusKey(status: IssueStatus | null | undefined): string {
  return String(status ?? '')
    .trim()
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[\s-]+/g, '_')
}

export function getIssueStatusGroup(status: IssueStatus | null | undefined): IssueStatusGroup {
  const key = normalizeStatusKey(status)

  if (['draft', 'borrador'].includes(key)) return 'draft'
  if (
    [
      'open',
      'opened',
      'abierto',
      'abierta',
      'pending',
      'pendiente',
      'in_progress',
      'inprogress',
      'en_curso',
      'in_review',
      'inreview',
      'en_revision',
    ].includes(key)
  ) {
    return 'open'
  }
  if (
    [
      'closed',
      'cerrado',
      'cerrada',
      'completed',
      'completado',
      'completada',
      'not_approved',
      'notapproved',
      'no_aprobada',
      'no_aprobado',
    ].includes(key)
  ) {
    return 'closed'
  }
  if (['void', 'anulado', 'anulada'].includes(key)) return 'void'

  return 'unknown'
}

export function isClosedIssueStatus(status: IssueStatus | null | undefined): boolean {
  return getIssueStatusGroup(status) === 'closed'
}

export function isReviewIssueStatus(status: IssueStatus | null | undefined): boolean {
  const key = normalizeStatusKey(status)
  return ['in_review', 'inreview', 'en_revision'].includes(key)
}

export function getIssueStatusGroupLabel(group: IssueStatusGroup): string {
  return GROUP_LABELS[group]
}

export function getIssueStatusGroupColor(group: IssueStatusGroup): string {
  return GROUP_COLORS[group]
}

export function getIssueStatusLabel(status: IssueStatus | null | undefined): string {
  const key = normalizeStatusKey(status)
  return STATUS_LABELS[key] ?? (status ? String(status) : 'No definido')
}

export function getAccDefaultStatus(status: IssueStatus | null | undefined): AccDefaultStatus | 'unknown' {
  const key = normalizeStatusKey(status)

  if (['draft', 'borrador'].includes(key)) return 'draft'
  if (['open', 'opened', 'abierto', 'abierta'].includes(key)) return 'open'
  if (['pending', 'pendiente'].includes(key)) return 'pending'
  if (['in_progress', 'inprogress', 'en_curso'].includes(key)) return 'in_progress'
  if (['completed', 'completado', 'completada'].includes(key)) return 'completed'
  if (['in_review', 'inreview', 'en_revision'].includes(key)) return 'in_review'
  if (['not_approved', 'notapproved', 'no_aprobada', 'no_aprobado'].includes(key)) return 'not_approved'
  if (['closed', 'cerrado', 'cerrada'].includes(key)) return 'closed'
  if (['void', 'anulado', 'anulada'].includes(key)) return 'void'

  return 'unknown'
}

export function getAccDefaultStatusLabel(status: AccDefaultStatus | 'unknown'): string {
  const labels: Record<AccDefaultStatus | 'unknown', string> = {
    draft: 'Borrador',
    open: 'Abierta',
    pending: 'Pendiente',
    in_progress: 'En curso',
    completed: 'Completada',
    in_review: 'En revisión',
    not_approved: 'No aprobada',
    closed: 'Cerrada',
    void: 'Anulada',
    unknown: 'No definido',
  }

  return labels[status]
}

export function getAccDefaultStatusColor(status: AccDefaultStatus | 'unknown'): string {
  const colors: Record<AccDefaultStatus | 'unknown', string> = {
    draft: '#4b5563',
    open: '#f59e0b',
    pending: '#1d4ed8',
    in_progress: '#93c5fd',
    completed: '#a3d977',
    in_review: '#8b5cf6',
    not_approved: '#ef4444',
    closed: '#d1d5db',
    void: '#6b7280',
    unknown: '#1e1e1e',
  }

  return colors[status]
}
