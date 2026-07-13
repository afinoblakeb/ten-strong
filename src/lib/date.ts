export function parseLocalDate(value: string): Date {
  const [year, month, day] = value.split('-').map(Number)
  return new Date(year, (month || 1) - 1, day || 1)
}

export function formatISODate(date: Date): string {
  const year = date.getFullYear()
  const month = String(date.getMonth() + 1).padStart(2, '0')
  const day = String(date.getDate()).padStart(2, '0')
  return `${year}-${month}-${day}`
}

export function differenceInCalendarDays(later: Date, earlier: Date): number {
  const a = Date.UTC(later.getFullYear(), later.getMonth(), later.getDate())
  const b = Date.UTC(earlier.getFullYear(), earlier.getMonth(), earlier.getDate())
  return Math.floor((a - b) / 86400000)
}

export function challengeDateForDay(startDate: string, day: number): Date {
  const date = parseLocalDate(startDate)
  date.setDate(date.getDate() + Math.max(0, day - 1))
  return date
}
