type Numeric = number | string | { toNumber(): number }

function toNum(n: Numeric): number {
  if (typeof n === 'object' && n !== null && typeof n.toNumber === 'function') return n.toNumber()
  return Number(n)
}

const TRY = new Intl.NumberFormat('tr-TR', { style: 'currency', currency: 'TRY' })
const NUM = new Intl.NumberFormat('tr-TR')
const DATE = new Intl.DateTimeFormat('tr-TR', { day: '2-digit', month: '2-digit', year: 'numeric' })
const DATE_LONG = new Intl.DateTimeFormat('tr-TR', {
  day: 'numeric',
  month: 'long',
  year: 'numeric',
  weekday: 'long',
})
const DATETIME = new Intl.DateTimeFormat('tr-TR', {
  day: '2-digit',
  month: '2-digit',
  year: 'numeric',
  hour: '2-digit',
  minute: '2-digit',
})
const TIME = new Intl.DateTimeFormat('tr-TR', { hour: '2-digit', minute: '2-digit' })

export function tl(n: Numeric): string {
  return TRY.format(toNum(n))
}

export function num(n: Numeric): string {
  return NUM.format(toNum(n))
}

export function date(d: Date | string | null | undefined): string {
  if (!d) return '—'
  return DATE.format(new Date(d))
}

export function dateLong(d: Date | string | null | undefined): string {
  if (!d) return '—'
  return DATE_LONG.format(new Date(d))
}

export function dateTime(d: Date | string | null | undefined): string {
  if (!d) return '—'
  return DATETIME.format(new Date(d))
}

export function time(d: Date | string | null | undefined): string {
  if (!d) return '—'
  return TIME.format(new Date(d))
}

// tabular hizalama için sabit genişlikli yardımcı
export function tab(n: Numeric, width = 12): string {
  return tl(n).padStart(width)
}