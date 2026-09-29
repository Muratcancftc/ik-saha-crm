// Kabul testi (madde 3.4) — `npm run test:maliyet` ile çalışır.
// Saf hesap motorunu (src/lib/maliyet.ts) UI/DB'den bağımsız doğrular.

import assert from 'node:assert/strict'
import {
  maliyetHesapla,
  kurusToTl,
  tlToKurus,
  satirEtiket,
  MALIYET_SATIRLARI,
  type MaliyetGirdi,
  type MaliyetOranlar,
} from '../src/lib/maliyet'

const oranlar: MaliyetOranlar = {
  sgkIsci: 0.14,
  issizlikIsci: 0.01,
  sgkIsveren: 0.155,
  issizlikIsveren: 0.02,
  gelirVergisi: 0.15,
  damgaVergisi: 0.00759,
}

const girdi: MaliyetGirdi = {
  brutUcret: 1300,
  gvMatrahIstisnasi: 1105,
  dvIstisnasi: 1300,
  kidem: 0,
  ihbar: 0,
  yillikIzin: 0,
  yemek: 0,
  yol: 260,
  saglikOsgb: 240,
  kiyafet: 235,
  maliMesuliyet: 101,
  karModu: 'YUZDE',
  karOran: 0.0822,
}

const h = maliyetHesapla(girdi, oranlar)

const beklenen: Record<string, string> = {
  sgkIsci: '182,00',
  issizlikIsci: '13,00',
  gvMatrahi: '1.105,00',
  gvMatrahiIndirimli: '0,00',
  gelirVergisi: '0,00',
  dvMatrahi: '1.300,00',
  dvMatrahiIndirimli: '0,00',
  damgaVergisi: '0,00',
  kesintilerToplami: '195,00',
  netUcret: '1.105,00',
  sgkIsveren: '201,50',
  issizlikIsveren: '26,00',
  yasalMaliyet: '1.527,50',
  toplamYasalMaliyet: '1.527,50',
  personelMaliyeti: '2.363,50',
  karPayi: '194,28',
  teklifBedeli: '2.557,78',
}

let hata = 0
console.log('— Kabul testi (3.4) ——————————————————————————————————————')
for (const [anahtar, bekle] of Object.entries(beklenen)) {
  const gercek = kurusToTl((h as unknown as Record<string, bigint>)[anahtar])
  const ok = gercek === bekle
  if (!ok) hata++
  console.log(`${ok ? '✓' : '✗'} ${anahtar.padEnd(22)} ${gercek.padStart(12)}  (beklenen ${bekle})`)
}
assert.equal(h.karOran, '0.0822', 'kâr oranı')

assert.deepEqual(
  Object.fromEntries(Object.keys(beklenen).map((k) => [k, kurusToTl((h as unknown as Record<string, bigint>)[k])])),
  beklenen,
)

console.log('\n— Tablo görünümü —————————————————————————————————————————')
const degerAl = (anahtar: string): bigint =>
  anahtar in h ? (h as unknown as Record<string, bigint>)[anahtar] : tlToKurus((girdi as unknown as Record<string, string | number>)[anahtar])
for (const s of MALIYET_SATIRLARI) {
  const deger = kurusToTl(degerAl(s.anahtar as string))
  const oran = s.oranSutunu ? '%8,22' : ''
  console.log(`${s.kalin ? '**' : '  '} ${satirEtiket(s, oranlar).padEnd(46)} ${oran.padEnd(8)} ${deger.padStart(12)}`)
}

if (hata > 0) {
  console.error(`\n✗ ${hata} değer beklenenden farklı.`)
  process.exit(1)
}
console.log('\n✓ TÜM KABUL TESTİ DEĞERLERİ DOĞRU')
