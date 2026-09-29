export function cn(...classes: Array<string | false | null | undefined>): string {
  return classes.filter(Boolean).join(' ')
}

// Telefon karşılaştırması için tek biçim: rakam dışını sil, baştaki ülke kodu
// (+90 / 90) ya da 0'ı at, son 10 hane kalsın.
// "0555 000 00 11", "+90 555 000 00 11", "905550000011" hepsi "5550000011" olur.
export function normalizeTelefon(telefon: string): string {
  const rakami = telefon.replace(/\D/g, '')
  return rakami.slice(-10)
}

// Görüntüleme için tek biçim: 10 hane ise "0555 000 00 11" olarak yaz.
export function formatTelefon(telefon: string | null | undefined): string {
  if (!telefon) return ''
  const on = normalizeTelefon(telefon)
  if (on.length !== 10) return telefon
  return `0${on.slice(0, 3)} ${on.slice(3, 6)} ${on.slice(6, 8)} ${on.slice(8, 10)}`
}