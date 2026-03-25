import {
  format,
  parseISO,
  startOfWeek,
  isAfter,
  isBefore,
  isValid,
} from 'date-fns'
import { es } from 'date-fns/locale'

const LOCALE = { locale: es }

export function formatDate(dateStr: string | null | undefined): string {
  if (!dateStr) return '-'
  try {
    const date = parseISO(dateStr)
    if (!isValid(date)) return '-'
    return format(date, 'dd MMM yyyy', LOCALE)
  } catch {
    return '-'
  }
}

export function formatDateTime(dateStr: string | null | undefined): string {
  if (!dateStr) return '-'
  try {
    const date = parseISO(dateStr)
    if (!isValid(date)) return '-'
    return format(date, 'dd MMM yyyy HH:mm', LOCALE)
  } catch {
    return '-'
  }
}

export function isOverdue(dueDate: string | null | undefined): boolean {
  if (!dueDate) return false
  try {
    return isBefore(parseISO(dueDate), new Date())
  } catch {
    return false
  }
}

export function isCreatedThisWeek(dateStr: string | null | undefined): boolean {
  if (!dateStr) return false
  try {
    const date = parseISO(dateStr)
    const weekStart = startOfWeek(new Date(), { locale: es })
    return isAfter(date, weekStart)
  } catch {
    return false
  }
}

export function groupByWeek(dateStr: string): string {
  try {
    const date = parseISO(dateStr)
    const weekStart = startOfWeek(date, { locale: es })
    return format(weekStart, 'yyyy-MM-dd')
  } catch {
    return dateStr.slice(0, 10)
  }
}

export function groupByMonth(dateStr: string): string {
  try {
    return format(parseISO(dateStr), 'MMM yyyy', LOCALE)
  } catch {
    return dateStr.slice(0, 7)
  }
}
