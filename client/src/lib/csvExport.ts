import type { Issue } from '@/types/issue'
import { formatDate } from './dateHelpers'

function escapeCsv(value: unknown): string {
  if (value === null || value === undefined) return ''
  const str = String(value)
  if (str.includes(',') || str.includes('"') || str.includes('\n')) {
    return `"${str.replace(/"/g, '""')}"`
  }
  return str
}

const HEADERS = [
  'ID',
  'Titulo',
  'Estado',
  'Asignado a',
  'Fecha vencimiento',
  'Fecha creacion',
  'Prioridad',
  'Tipo ID',
  'Subtipo ID',
  'Causa raiz ID',
  'Ubicacion',
]

export function exportIssuesToCsv(issues: Issue[], filename = 'issues.csv') {
  const rows = issues.map((issue) => [
    issue.displayId,
    issue.title,
    issue.status,
    issue.assignedTo ?? '',
    formatDate(issue.dueDate),
    formatDate(issue.createdAt),
    issue.priority ?? '',
    issue.issueTypeId ?? '',
    issue.issueSubtypeId ?? '',
    issue.rootCauseId ?? '',
    issue.locationDescription ?? '',
  ])

  const csvContent = [HEADERS, ...rows]
    .map((row) => row.map(escapeCsv).join(','))
    .join('\n')

  const blob = new Blob(['\uFEFF' + csvContent], { type: 'text/csv;charset=utf-8;' })
  const url = URL.createObjectURL(blob)
  const link = document.createElement('a')
  link.href = url
  link.setAttribute('download', filename)
  document.body.appendChild(link)
  link.click()
  document.body.removeChild(link)
  URL.revokeObjectURL(url)
}
