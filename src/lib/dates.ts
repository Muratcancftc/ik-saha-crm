// Tarih yardımcıları.
// Sunucu UTC'de çalışır ve tarihler UTC olarak saklanır (ör. talep tarihi
// "2026-09-30T08:00:00Z"). "Bugün/yarın" ve ay sınırı hesapları ise KULLANICI
// saat dilimine (Europe/Istanbul) göre yapılır — global TZ değiştirilmez,
// saklanan değerlere dokunulmaz.

// İstanbul'daki şu anki tarih, UTC gece yarısı olarak (saklanan UTC günle
// karşılaştırılabilir olsun diye).
export function istanbulBugun(): Date {
  const parts = new Intl.DateTimeFormat('en-US', {
    timeZone: 'Europe/Istanbul',
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  }).formatToParts(new Date())
  const y = Number(parts.find((p) => p.type === 'year')?.value)
  const m = Number(parts.find((p) => p.type === 'month')?.value)
  const d = Number(parts.find((p) => p.type === 'day')?.value)
  return new Date(Date.UTC(y, m - 1, d))
}

// 'YYYY-MM-DD' tarihini İstanbul'daki O GÜNÜN SONU (23:59) olarak sakla.
// Böylece validThrough/gün-sonu değerleri İstanbul saatiyle bir sonraki güne
// kaymaz; UTC'de saklanır, global TZ değişmez.
export function gunSonuIstanbul(isoDate: string): Date {
  const [y, m, d] = isoDate.split('-').map(Number)
  const yaklasik = Date.UTC(y, m - 1, d, 12)
  const parts = new Intl.DateTimeFormat('en-US', {
    timeZone: 'Europe/Istanbul',
    hourCycle: 'h23',
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
  }).formatToParts(new Date(yaklasik))
  const get = (t: string) => Number(parts.find((p) => p.type === t)?.value)
  const istanbulOgle = Date.UTC(get('year'), get('month') - 1, get('day'), get('hour'), get('minute'))
  const offsetMs = istanbulOgle - yaklasik
  return new Date(Date.UTC(y, m - 1, d, 23, 59) - offsetMs)
}

// Argümansız çağrı: İstanbul'daki bugün (UTC gece yarısı). Argümanlı çağrı:
// verilen tarihi kendi gününün gece yarısına hizalar (saklanan UTC değerler için).
export function startOfDay(d?: Date): Date {
  if (d === undefined) return istanbulBugun()
  const x = new Date(d)
  x.setHours(0, 0, 0, 0)
  return x
}

export function endOfDay(d = new Date()): Date {
  const x = new Date(d)
  x.setHours(23, 59, 59, 999)
  return x
}

export function addDays(d: Date, days: number): Date {
  const x = new Date(d)
  x.setDate(x.getDate() + days)
  return x
}

// Hedef tarihe kaç gün kaldı (takvim günü farkı, İstanbul'a göre bugün bazında).
// "Bugün" = 0, "yarın" = 1. Tarihler UTC saklandığı için UTC gece yarısına
// hizalanarak hesaplanır; saat bileşeni farkı bozmaz.
export function daysUntil(d: Date | string): number {
  const target = startOfDay(new Date(d))
  const now = startOfDay()
  return Math.round((target.getTime() - now.getTime()) / 86400000)
}

export function sameDay(a: Date | string, b: Date | string): boolean {
  const x = new Date(a)
  const y = new Date(b)
  return (
    x.getFullYear() === y.getFullYear() &&
    x.getMonth() === y.getMonth() &&
    x.getDate() === y.getDate()
  )
}