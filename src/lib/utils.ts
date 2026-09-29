export function cn(...classes: Array<string | false | null | undefined>): string {
  return classes.filter(Boolean).join(' ')
}

// Telefon karşılaştırması için: rakam dışındaki tüm karakterler temizlenir.
// "0555 000 00 11" ile "+90 555 000 00 11" veya "05550000011" aynı kabul edilir.
export function normalizeTelefon(telefon: string): string {
  return telefon.replace(/\D/g, '')
}