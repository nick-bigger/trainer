import { format } from 'date-fns'

/** Canonical day key, always in the user's local timezone: YYYY-MM-DD. */
export function dayKey(d: Date = new Date()): string {
  return format(d, 'yyyy-MM-dd')
}

export function parseDayKey(key: string): Date {
  const [y, m, d] = key.split('-').map(Number)
  return new Date(y, m - 1, d)
}

export function addDays(key: string, delta: number): string {
  const d = parseDayKey(key)
  d.setDate(d.getDate() + delta)
  return dayKey(d)
}
