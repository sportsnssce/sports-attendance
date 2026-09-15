/** Format a Date using its LOCAL calendar parts as YYYY-MM-DD (avoids UTC shift). */
export function toISOLocal(d: Date): string {
  const y = d.getFullYear()
  const m = String(d.getMonth() + 1).padStart(2, '0')
  const day = String(d.getDate()).padStart(2, '0')
  return `${y}-${m}-${day}`
}

/** Parse a YYYY-MM-DD string as a local-midnight Date. */
export function parseISOLocal(iso: string): Date {
  const [y, m, d] = iso.split('-').map(Number)
  return new Date(y, m - 1, d)
}

/** Today's date as YYYY-MM-DD in local time. */
export function todayISOLocal(): string {
  return toISOLocal(new Date())
}

/** First and last day of the month containing the given local Date, as YYYY-MM-DD. */
export function monthRange(date: Date): { from: string; to: string } {
  return {
    from: toISOLocal(new Date(date.getFullYear(), date.getMonth(), 1)),
    to: toISOLocal(new Date(date.getFullYear(), date.getMonth() + 1, 0)),
  }
}