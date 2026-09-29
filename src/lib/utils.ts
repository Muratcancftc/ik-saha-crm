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