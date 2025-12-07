import { format } from 'date-fns'

export type DateRangeLike = {
  start?: Date | string | null
  end?: Date | string | null
}

function toDate(value?: Date | string | null): Date | undefined {
  if (!value) return undefined
  if (value instanceof Date) return value
  const d = new Date(value)
  return isNaN(d.getTime()) ? undefined : d
}

/**
 * Formats a start/end date:
 * - same year, month, day -> MMM d
 * - same year and month -> MMM d — d
 * - same year -> MMM d — MMM d
 * - else -> MMM d, yyyy — MMM d, yyyy
 * If one side is missing, returns the formatted existing side.
 */
export function formatDateRange(startInput?: Date | string | null, endInput?: Date | string | null): string {
  const start = toDate(startInput)
  const end = toDate(endInput)

  if (!start && !end) return ''
  if (start && !end) return format(start, 'MMM d, yyyy')
  if (!start && end) return format(end, 'MMM d, yyyy')

  const s = start!
  const e = end!

  const sameYear = s.getFullYear() === e.getFullYear()
  const sameMonth = s.getMonth() === e.getMonth()
  const sameDay = s.getDate() === e.getDate()

  if (sameYear && sameMonth && sameDay) {
    return format(s, 'MMM d')
  } else if (sameYear && sameMonth) {
    return `${format(s, 'MMM d')} — ${format(e, 'd')}`
  } else if (sameYear) {
    return `${format(s, 'MMM d')} — ${format(e, 'MMM d')}`
  }
  return `${format(s, 'MMM d, yyyy')} — ${format(e, 'MMM d, yyyy')}`
}

export function calculateDaysBetween(startDate: Date, endDate: Date): number {
  const start = new Date(startDate.getFullYear(), startDate.getMonth(), startDate.getDate())
  const end = new Date(endDate.getFullYear(), endDate.getMonth(), endDate.getDate())
  const diffMs = end.getTime() - start.getTime()
  return Math.max(1, Math.floor(diffMs / (1000 * 60 * 60 * 24)) + 1)
}

export function formatDateToISO(date: Date): string {
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`
}

export function formatDateDisplay(date?: Date) {
  if (!date) return 'Not set'
  return format(date, 'MMM d, yyyy')
}

export function formatDayDisplay(day?: number) {
  if (day === undefined) return 'Not set'
  return `Day ${day}`
}

export default formatDateRange
