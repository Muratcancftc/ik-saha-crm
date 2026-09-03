import { startOfDay, addDays } from './dates'

export type Donem = { bas: Date; bit: Date; etiket: string }

// 'YYYY-MM-DD' → yerel gece yarısı (UTC değil — 1 gün kaymasını önler)
export function parseLocalDate(str: string): Date {
  const [y, m, d] = str.split('-').map(Number)
  return new Date(y, (m || 1) - 1, d || 1)
}

export function donemAralik(sp: { donem?: string; bas?: string; bit?: string }): Donem {
  const bugun = startOfDay()
  const d = new Date(bugun)

  const ayBas = new Date(d.getFullYear(), d.getMonth(), 1)
  const ayBit = new Date(d.getFullYear(), d.getMonth() + 1, 0)
  const gecenAyBas = new Date(d.getFullYear(), d.getMonth() - 1, 1)
  const gecenAyBit = new Date(d.getFullYear(), d.getMonth(), 0)
  const haftaGun = (d.getDay() + 6) % 7 // Pazartesi=0
  const haftaBas = addDays(d, -haftaGun)
  const haftaBit = addDays(haftaBas, 6)

  const secim = sp.donem ?? 'ay'
  const etiketler: Record<string, string> = {
    hafta: 'Bu hafta',
    ay: 'Bu ay',
    gecenay: 'Geçen ay',
    ozel: 'Özel aralık',
  }

  if (secim === 'hafta') return { bas: haftaBas, bit: haftaBit, etiket: etiketler.hafta }
  if (secim === 'gecenay') return { bas: gecenAyBas, bit: gecenAyBit, etiket: etiketler.gecenay }
  if (secim === 'ozel' && sp.bas && sp.bit) {
    const bas = startOfDay(parseLocalDate(sp.bas))
    const bit = addDays(parseLocalDate(sp.bit), 1)
    return { bas, bit, etiket: `${sp.bas} — ${sp.bit}` }
  }
  return { bas: ayBas, bit: addDays(ayBit, 1), etiket: etiketler.ay }
}

export function donemEtiket(d: Donem): string {
  const f = new Intl.DateTimeFormat('tr-TR', { day: '2-digit', month: 'short' })
  return `${d.etiket} (${f.format(d.bas)} – ${f.format(new Date(d.bit.getTime() - 86400000))})`
}