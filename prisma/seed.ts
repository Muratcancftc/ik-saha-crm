import { PrismaClient, IsciDurum, GiderKategori, OdemeTip, PuantajDurum } from '@prisma/client'
import { PrismaPg } from '@prisma/adapter-pg'
import bcrypt from 'bcryptjs'
import { encrypt } from '../src/lib/crypto'
import { ISG_BELGE_TIPI } from '../src/lib/belge'

const adapter = new PrismaPg({ connectionString: process.env.DATABASE_URL })
const prisma = new PrismaClient({ adapter })

// Deterministik sözde-rastgele (seed aynıysa aynı veri)
function mulberry32(a: number) {
  return function () {
    a |= 0
    a = (a + 0x6d2b79f5) | 0
    let t = Math.imul(a ^ (a >>> 15), 1 | a)
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296
  }
}
const rnd = mulberry32(20260802)

function atMidnight(daysFromToday: number): Date {
  const d = new Date()
  d.setHours(0, 0, 0, 0)
  d.setDate(d.getDate() + daysFromToday)
  return d
}

function genTC(): string {
  const d = [Math.floor(rnd() * 9) + 1]
  for (let i = 1; i < 9; i++) d.push(Math.floor(rnd() * 10))
  const d10 =
    ((d[0] + d[2] + d[4] + d[6] + d[8]) * 7 - (d[1] + d[3] + d[5] + d[7])) % 10
  const sum = d.reduce((a, b) => a + b, 0) + Math.abs(d10)
  const d11 = sum % 10
  return `${d.join('')}${Math.abs(d10)}${d11}`
}

function genIBAN(): string {
  let s = ''
  for (let i = 0; i < 22; i++) s += Math.floor(rnd() * 10)
  return `TR00${s}`
}


const MESLEK_ADLARI = ['forklift', 'kaynak', 'depo', 'temizlik', 'insaat', 'hamaliye', 'paketleme', 'hijyen']

// [isim, ilce, tercihBolgeler, meslekler, beklenti, bolge]
const WORKERS: Array<[string, string, string[], string[], number, 'kocaeli' | 'balikesir']> = [
  ['Mehmet Yılmaz', 'Gebze', ['Gebze', 'İzmit'], ['forklift', 'depo'], 1600, 'kocaeli'],
  ['Ahmet Demir', 'İzmit', ['İzmit', 'Derince'], ['forklift', 'hamaliye'], 1550, 'kocaeli'],
  ['Hasan Kaya', 'Derince', ['Derince', 'Körfez'], ['depo', 'paketleme'], 1450, 'kocaeli'],
  ['İbrahim Şahin', 'Karesi', ['Karesi', 'Altıeylül'], ['temizlik', 'hijyen'], 1350, 'balikesir'],
  ['Mustafa Aydın', 'Kartepe', ['Kartepe', 'Başiskele'], ['kaynak', 'insaat'], 1750, 'kocaeli'],
  ['Emre Arslan', 'Gölcük', ['Gölcük', 'Derince'], ['insaat', 'hamaliye'], 1500, 'kocaeli'],
  ['Osman Çelik', 'Bandırma', ['Bandırma', 'Edremit'], ['temizlik', 'paketleme'], 1400, 'balikesir'],
  ['Ramazan Kılıç', 'Altıeylül', ['Altıeylül', 'Karesi'], ['depo', 'forklift'], 1500, 'balikesir'],
  ['Hüseyin Öztürk', 'Edremit', ['Edremit', 'Burhaniye'], ['hijyen', 'temizlik'], 1300, 'balikesir'],
  ['Ali Koç', 'Gebze', ['Gebze', 'Çayırova'], ['kaynak', 'forklift'], 1800, 'kocaeli'],
  ['Fatih Aksoy', 'İzmit', ['İzmit', 'Başiskele'], ['insaat', 'depo'], 1500, 'kocaeli'],
  ['Murat Doğan', 'Körfez', ['Körfez', 'İzmit'], ['hamaliye', 'paketleme'], 1300, 'kocaeli'],
  ['Serkan Yalçın', 'Gebze', ['Gebze', 'Çayırova'], ['kaynak'], 1850, 'kocaeli'],
  ['Ömer Güneş', 'Karesi', ['Karesi', 'Susurluk'], ['insaat', 'hamaliye'], 1450, 'balikesir'],
  ['Volkan Er', 'Darıca', ['Darıca', 'Çayırova'], ['paketleme', 'depo'], 1400, 'kocaeli'],
  ['Burak Şen', 'İzmit', ['İzmit', 'Kartepe'], ['forklift', 'depo'], 1600, 'kocaeli'],
  ['Cengiz Aydoğan', 'Derince', ['Derince', 'Körfez'], ['insaat', 'kaynak'], 1700, 'kocaeli'],
  ['Salih Öz', 'Gönen', ['Gönen', 'Manyas'], ['hijyen', 'temizlik'], 1350, 'balikesir'],
  ['Yılmaz Toprak', 'Bandırma', ['Bandırma'], ['depo', 'paketleme'], 1420, 'balikesir'],
  ['Kadir Yıldız', 'Karesi', ['Karesi', 'Altıeylül'], ['temizlik'], 1380, 'balikesir'],
  ['Necati Bulut', 'Susurluk', ['Susurluk', 'Bandırma'], ['hamaliye', 'insaat'], 1400, 'balikesir'],
  ['Sinan Özdemir', 'Edremit', ['Edremit', 'Burhaniye'], ['kaynak', 'insaat'], 1750, 'balikesir'],
]

async function main() {
  console.log('🌱 Seed başlıyor...')

  // Temizleme (FK sırası)
  await prisma.arama.deleteMany()
  await prisma.vergiDekont.deleteMany()
  await prisma.vergiSablon.deleteMany()
  await prisma.vergiOdemesi.deleteMany()
  await prisma.ucretLog.deleteMany()
  await prisma.odemeKayit.deleteMany()
  await prisma.odemeDonemi.deleteMany()
  await prisma.kesinti.deleteMany()
  await prisma.puantajKayit.deleteMany()
  await prisma.personelUcret.deleteMany()
  await prisma.firmaUcret.deleteMany()
  await prisma.bildirim.deleteMany()
  await prisma.kullanici.deleteMany()
  await prisma.odeme.deleteMany()
  await prisma.evrak.deleteMany()
  await prisma.aday.deleteMany()
  await prisma.ayar.deleteMany()
  await prisma.resmiOdeme.deleteMany()
  await prisma.gider.deleteMany()
  await prisma.tahsilat.deleteMany()
  await prisma.fatura.deleteMany()
  await prisma.hakedis.deleteMany()
  await prisma.puantaj.deleteMany()
  await prisma.atama.deleteMany()
  await prisma.talepKalemi.deleteMany()
  await prisma.talep.deleteMany()
  await prisma.firmaFiyat.deleteMany()
  await prisma.lokasyon.deleteMany()
  await prisma.yetkili.deleteMany()
  await prisma.musteriFirma.deleteMany()
  await prisma.avans.deleteMany()
  await prisma.musaitlik.deleteMany()
  await prisma.belge.deleteMany()
  await prisma.isciMeslek.deleteMany()
  await prisma.isci.deleteMany()
  await prisma.meslek.deleteMany()
  await prisma.personel.deleteMany()

  // ---- Meslekler ----
  const meslekler: Record<string, { id: number }> = {}
  for (const ad of MESLEK_ADLARI) {
    const m = await prisma.meslek.create({ data: { ad } })
    meslekler[ad] = m
  }

  // ---- Müşteri Firmalar ----
  const firma1 = await prisma.musteriFirma.create({
    data: {
      ad: 'Artaş Lojistik A.Ş.',
      vergiNo: '1234567890',
      telefon: '+90 262 555 10 20',
      email: 'finans@artaslojistik.com',
      adres: 'Gebze Organize Sanayi, Kocaeli',
      bolge: 'kocaeli',
    },
  })
  const firma2 = await prisma.musteriFirma.create({
    data: {
      ad: 'Yıldız Gıda San. Tic.',
      vergiNo: '9876543210',
      telefon: '+90 266 555 30 40',
      email: 'muhasebe@yildizgida.com',
      adres: 'Bandırma Gıda OSB, Balıkesir',
      bolge: 'balikesir',
    },
  })
  const firma3 = await prisma.musteriFirma.create({
    data: {
      ad: 'Nova İnşaat Ltd. Şti.',
      vergiNo: '5551234567',
      telefon: '+90 262 555 70 80',
      email: 'insaat@nova.com.tr',
      adres: 'Kartepe Yolu, Kocaeli',
      bolge: 'kocaeli',
    },
  })
  const firma4 = await prisma.musteriFirma.create({
    data: {
      ad: 'TemizLine Hizmet A.Ş.',
      vergiNo: '1112223334',
      telefon: '+90 266 555 90 00',
      email: 'operasyon@temizline.com',
      adres: 'Altıeylül, Balıkesir',
      bolge: 'balikesir',
    },
  })

  const f1lok1 = await prisma.lokasyon.create({ data: { firmaId: firma1.id, ad: 'Gebze Merkez Depo', adres: 'Gebze' } })
  await prisma.lokasyon.create({ data: { firmaId: firma1.id, ad: 'İzmit Şube', adres: 'İzmit' } })
  const f2lok1 = await prisma.lokasyon.create({ data: { firmaId: firma2.id, ad: 'Bandırma Gıda Tesisi', adres: 'Bandırma' } })
  await prisma.lokasyon.create({ data: { firmaId: firma2.id, ad: 'Edremit Lojistik', adres: 'Edremit' } })
  const f3lok1 = await prisma.lokasyon.create({ data: { firmaId: firma3.id, ad: 'Kartepe Şantiye', adres: 'Kartepe' } })
  const f4lok1 = await prisma.lokasyon.create({ data: { firmaId: firma4.id, ad: 'Altıeylül Hizmet', adres: 'Altıeylül' } })

  await prisma.yetkili.createMany({
    data: [
      { firmaId: firma1.id, ad: 'Ayşe Korkmaz', unvan: 'İK Müdürü', telefon: '+90 532 111 22 33' },
      { firmaId: firma2.id, ad: 'Deniz Altın', unvan: 'Finans Yöneticisi', telefon: '+90 533 444 55 66' },
      { firmaId: firma3.id, ad: 'Kerem Usta', unvan: 'Saha Şefi', telefon: '+90 535 777 88 99' },
      { firmaId: firma4.id, ad: 'Gülşah Erdem', unvan: 'Operasyon Müdürü', telefon: '+90 542 000 11 22' },
    ],
  })

  // ---- Firma Fiyatları (meslek bazlı) ----
  const fiyatPlan: Array<[number, string, number]> = [
    [firma1.id, 'forklift', 2400], [firma1.id, 'depo', 2100], [firma1.id, 'hamaliye', 2000],
    [firma2.id, 'paketleme', 2050], [firma2.id, 'depo', 2100], [firma2.id, 'hijyen', 1950],
    [firma3.id, 'insaat', 2300], [firma3.id, 'kaynak', 2600], [firma3.id, 'hamaliye', 2050],
    [firma4.id, 'temizlik', 1950], [firma4.id, 'hijyen', 1900],
  ]
  for (const [firmaId, meslek, fiyat] of fiyatPlan) {
    await prisma.firmaFiyat.create({ data: { firmaId, meslekId: meslekler[meslek].id, kisiGunFiyat: fiyat } })
  }

  // ---- İşçiler ----
  const isciler: { id: number; ad: string; gunlukUcretBeklentisi: number; ilce: string; bolge: string }[] = []
  for (const [ad, ilce, tercih, meslekleri, beklenti, bolge] of WORKERS) {
    const durum: IsciDurum = ad === 'Sinan Özdemir' ? 'kara_liste' : ad === 'Necati Bulut' ? 'pasif' : 'aktif'
    const isci = await prisma.isci.create({
      data: {
        ad,
        telefon: `+90 5${Math.floor(rnd() * 10)}${Math.floor(10000000 + rnd() * 89999999)}`,
        tcKimlik: encrypt(genTC()),
        ilce,
        iban: encrypt(genIBAN()),
        dogumTarihi: new Date(1965 + Math.floor(rnd() * 32), Math.floor(rnd() * 12), 1 + Math.floor(rnd() * 27)),
        puan: 40 + Math.floor(rnd() * 60),
        gunlukUcretBeklentisi: beklenti,
        durum,
        bolge: bolge as 'kocaeli' | 'balikesir',
        tercihBolgeler: tercih,
        meslekler: { create: meslekleri.map((m) => ({ meslekId: meslekler[m].id })) },
      },
    })
    isciler.push({ id: isci.id, ad, gunlukUcretBeklentisi: beklenti, ilce, bolge })
  }

  // ---- Belgeler (bazıları süresi dolmuş / yaklaşan) ----
  const belgeTip = ['Kimlik Kartı', 'SGK İşe Giriş', 'Adli Sicil Kaydı', 'Vardiya Belgesi']
  for (const isci of isciler.slice(0, 18)) {
    await prisma.belge.create({
      data: {
        isciId: isci.id,
        tip: belgeTip[Math.floor(rnd() * belgeTip.length)],
        verilisTarihi: atMidnight(-300 - Math.floor(rnd() * 400)),
        bitisTarihi: atMidnight(-20 + Math.floor(rnd() * 380)),
      },
    })
    if (rnd() > 0.6) {
      await prisma.belge.create({
        data: {
          isciId: isci.id,
          tip: belgeTip[Math.floor(rnd() * belgeTip.length)],
          verilisTarihi: atMidnight(-100 - Math.floor(rnd() * 200)),
          bitisTarihi: atMidnight(5 + Math.floor(rnd() * 20)),
        },
      })
    }
  }

  // ---- Müsaitlik ----
  for (const isci of isciler.slice(0, 12)) {
    await prisma.musaitlik.create({
      data: {
        isciId: isci.id,
        tarih: atMidnight(20 + Math.floor(rnd() * 60)),
        eVadesiGun: 30,
        sozlesmeBaslangic: atMidnight(-90),
        sozlesmeBitis: atMidnight(30),
        durum: rnd() > 0.85 ? 'yenilenecek' : 'aktif',
      },
    })
  }

  // ---- Avans ----
  const avanslar: Record<number, number> = {}
  for (const isci of isciler.slice(0, 6)) {
    const t = 1500 + Math.floor(rnd() * 2000)
    await prisma.avans.create({ data: { isciId: isci.id, tutar: t, tarih: atMidnight(-5 - Math.floor(rnd() * 10)), durum: 'verildi' } })
    avanslar[isci.id] = t
  }

  // ---- İK modülü: personel-firma ataması, ücretler, puantaj, dönem ----
  const ikFirmaMap = [firma1, firma3, firma1, firma2, firma3]
  for (let k = 0; k < 5; k++) {
    await prisma.isci.update({
      where: { id: isciler[k].id },
      data: {
        firmaId: ikFirmaMap[k].id,
        calismaTipi: k === 4 ? 'SAATLIK' : 'GUNLUK',
        varsayilanOdemeYontemi: k % 2 === 0 ? 'ELDEN' : 'IBAN',
      },
    })
  }
  const firmaUcretPlan: Array<[number, number, number]> = [
    [firma1.id, 1900, 240], [firma2.id, 1850, 230], [firma3.id, 2000, 260], [firma4.id, 1800, 225],
  ]
  for (const [firmaId, gunluk, saatlik] of firmaUcretPlan) {
    await prisma.firmaUcret.create({ data: { firmaId, gunlukUcret: gunluk, saatlikUcret: saatlik, gecerlilikBaslangic: atMidnight(-90) } })
  }
  await prisma.personelUcret.create({ data: { isciId: isciler[0].id, gunlukUcret: 2100, saatlikUcret: 280, gecerlilikBaslangic: atMidnight(-60) } })
  await prisma.personelUcret.create({ data: { isciId: isciler[2].id, gunlukUcret: 1750, saatlikUcret: 220, gecerlilikBaslangic: atMidnight(-40) } })

  const pUcretMap = new Map<number, { g: number; s: number }>([
    [isciler[0].id, { g: 2100, s: 280 }],
    [isciler[2].id, { g: 1750, s: 220 }],
  ])
  const fUcretMap = new Map(firmaUcretPlan.map(([firmaId, g, s]) => [firmaId, { g, s }]))
  const cozUcret = (isciId: number, firmaId: number) => pUcretMap.get(isciId) ?? fUcretMap.get(firmaId) ?? { g: 1800, s: 225 }

  const ikAyBas = new Date(); ikAyBas.setDate(1); ikAyBas.setHours(0, 0, 0, 0)
  const ikBugun = atMidnight(0)
  const ikGunSayisi = Math.min(ikBugun.getDate(), 20)
  for (let k = 0; k < 5; k++) {
    const isci = isciler[k]
    const firmaId = ikFirmaMap[k].id
    const saatlikTip = k === 4
    for (let g = 0; g < ikGunSayisi; g++) {
      const t = new Date(ikAyBas); t.setDate(t.getDate() + g)
      if (t > ikBugun) break
      const fsi = rnd() > 0.88 ? 0.5 : 1
      const { g: gunluk, s: saatlik } = cozUcret(isci.id, firmaId)
      const mesai = saatlikTip && rnd() > 0.75 ? 2 : 0
      const calisilan = saatlikTip ? 8 * fsi : 0
      const tutar = saatlikTip
        ? Math.round(((calisilan - mesai) * saatlik + mesai * saatlik * 1.5) * 100) / 100
        : Math.round((fsi * gunluk + (mesai ? saatlik * mesai * 1.5 : 0)) * 100) / 100
      await prisma.puantajKayit.create({
        data: {
          isciId: isci.id,
          firmaId,
          tarih: t,
          fsi,
          calismaTipi: saatlikTip ? 'SAATLIK' : 'GUNLUK',
          calisilanSaat: calisilan,
          mesaiSaat: mesai,
          uygulananGunlukUcret: gunluk,
          uygulananSaatlikUcret: saatlik,
          hesaplananTutar: tutar,
        },
      })
    }
  }

  // Dönem örnekleri: biri bekliyor, biri ödendi+kilitli
  const k1 = await prisma.puantajKayit.findMany({ where: { isciId: isciler[0].id } })
  const k2 = await prisma.puantajKayit.findMany({ where: { isciId: isciler[1].id } })
  const brut1 = Math.round(k1.reduce((a, p) => a + Number(p.hesaplananTutar), 0) * 100) / 100
  const brut2 = Math.round(k2.reduce((a, p) => a + Number(p.hesaplananTutar), 0) * 100) / 100
  const avans1 = avanslar[isciler[0].id] ?? 0
  const net1 = Math.round((brut1 - avans1) * 100) / 100
  const net2 = brut2
  const donemBitis = new Date(ikAyBas.getFullYear(), ikAyBas.getMonth() + 1, 0)
  await prisma.odemeDonemi.create({
    data: { isciId: isciler[0].id, firmaId: ikFirmaMap[0].id, baslangic: ikAyBas, bitis: donemBitis, brutHakedis: brut1, toplamAvans: avans1, toplamKesinti: 0, netOdenecek: net1, durum: 'BEKLIYOR' },
  })
  const donem2 = await prisma.odemeDonemi.create({
    data: { isciId: isciler[1].id, firmaId: ikFirmaMap[1].id, baslangic: ikAyBas, bitis: donemBitis, brutHakedis: brut2, toplamAvans: 0, toplamKesinti: 0, netOdenecek: net2, durum: 'ODENDI', kilitli: true },
  })
  await prisma.odemeKayit.create({
    data: { donemId: donem2.id, tarih: atMidnight(-1), tutar: net2, yontem: 'IBAN', ibanSnapshot: 'TR000000000000000000000000', hesapSahibi: isciler[1].ad, teslimEdenKullaniciId: 1 },
  })
  await prisma.kesinti.create({ data: { isciId: isciler[2].id, tarih: atMidnight(-2), tutar: 150, tur: 'ceza', aciklama: 'Geç kalma cezası' } })

  // ---- Talepler ----
  const talepler: { id: number; lokasyonId: number; firmaId: number; tarih: Date }[] = []

  // Bugün açık talepler
  const bugunTalep1 = await prisma.talep.create({
    data: {
      firmaId: firma1.id,
      lokasyonId: f1lok1.id,
      tarih: atMidnight(0),
      vardiya: 'gunduz',
      aciliyet: 'acil',
      durum: 'kismi',
      not: 'Vardiya yoğunluğu, 2 depo + 1 forklift eksiği var',
      kalemler: {
        create: [
          { meslekId: meslekler['depo'].id, adet: 3 },
          { meslekId: meslekler['forklift'].id, adet: 1 },
        ],
      },
    },
  })
  talepler.push({ id: bugunTalep1.id, lokasyonId: f1lok1.id, firmaId: firma1.id, tarih: atMidnight(0) })

  const bugunTalep2 = await prisma.talep.create({
    data: {
      firmaId: firma2.id,
      lokasyonId: f2lok1.id,
      tarih: atMidnight(0),
      vardiya: 'gece',
      aciliyet: 'normal',
      durum: 'dolu',
      kalemler: { create: [{ meslekId: meslekler['paketleme'].id, adet: 2 }] },
    },
  })
  talepler.push({ id: bugunTalep2.id, lokasyonId: f2lok1.id, firmaId: firma2.id, tarih: atMidnight(0) })

  const yarınTalep = await prisma.talep.create({
    data: {
      firmaId: firma4.id,
      lokasyonId: f4lok1.id,
      tarih: atMidnight(1),
      vardiya: 'gunduz',
      aciliyet: 'normal',
      durum: 'acik',
      not: 'Okul dönemi temizlik takviyesi',
      kalemler: {
        create: [
          { meslekId: meslekler['temizlik'].id, adet: 4 },
          { meslekId: meslekler['hijyen'].id, adet: 1 },
        ],
      },
    },
  })
  talepler.push({ id: yarınTalep.id, lokasyonId: f4lok1.id, firmaId: firma4.id, tarih: atMidnight(1) })

  const ileriTalep = await prisma.talep.create({
    data: {
      firmaId: firma3.id,
      lokasyonId: f3lok1.id,
      tarih: atMidnight(3),
      vardiya: 'gunduz',
      aciliyet: 'acil',
      durum: 'acik',
      kalemler: {
        create: [
          { meslekId: meslekler['insaat'].id, adet: 5 },
          { meslekId: meslekler['kaynak'].id, adet: 2 },
        ],
      },
    },
  })
  talepler.push({ id: ileriTalep.id, lokasyonId: f3lok1.id, firmaId: firma3.id, tarih: atMidnight(3) })

  // ---- Geçmiş (kapandı) talepler + atamalar + puantaj + hakediş ----
  const gecmisTalepler: Array<{ talep: typeof bugunTalep1; isciler: typeof isciler; meslekAd: string }> = []

  // 3 aylık geçmiş talepler (firma1: depo)
  for (let gun = 85; gun >= 1; gun -= 2) {
    const t = await prisma.talep.create({
      data: {
        firmaId: firma1.id,
        lokasyonId: f1lok1.id,
        tarih: atMidnight(-gun),
        vardiya: 'gunduz',
        aciliyet: 'normal',
        durum: 'kapandi',
        kalemler: { create: [{ meslekId: meslekler['depo'].id, adet: 3 }] },
      },
    })
    talepler.push({ id: t.id, lokasyonId: f1lok1.id, firmaId: firma1.id, tarih: atMidnight(-gun) })
    const secilen = isciler.filter((w) => w.ad !== 'Sinan Özdemir' && w.ad !== 'Necati Bulut').slice(0, 3)
    gecmisTalepler.push({ talep: t, isciler: secilen, meslekAd: 'depo' })
  }

  // 3 aylık geçmiş talepler (firma2: paketleme)
  for (let gun = 86; gun >= 2; gun -= 3) {
    const t = await prisma.talep.create({
      data: {
        firmaId: firma2.id,
        lokasyonId: f2lok1.id,
        tarih: atMidnight(-gun),
        vardiya: 'gunduz',
        aciliyet: 'normal',
        durum: 'kapandi',
        kalemler: { create: [{ meslekId: meslekler['paketleme'].id, adet: 2 }] },
      },
    })
    talepler.push({ id: t.id, lokasyonId: f2lok1.id, firmaId: firma2.id, tarih: atMidnight(-gun) })
    const secilen = isciler.filter((w) => w.ad !== 'Sinan Özdemir').slice(4, 6)
    gecmisTalepler.push({ talep: t, isciler: secilen, meslekAd: 'paketleme' })
  }

  // 3 aylık geçmiş talepler (firma3: inşaat/kaynak)
  for (let gun = 84; gun >= 3; gun -= 4) {
    const t = await prisma.talep.create({
      data: {
        firmaId: firma3.id,
        lokasyonId: f3lok1.id,
        tarih: atMidnight(-gun),
        vardiya: 'gunduz',
        aciliyet: 'normal',
        durum: 'kapandi',
        kalemler: {
          create: [
            { meslekId: meslekler['insaat'].id, adet: 2 },
            { meslekId: meslekler['kaynak'].id, adet: 1 },
          ],
        },
      },
    })
    talepler.push({ id: t.id, lokasyonId: f3lok1.id, firmaId: firma3.id, tarih: atMidnight(-gun) })
    const secilen = isciler.filter((w) => w.ad !== 'Sinan Özdemir').slice(8, 11)
    gecmisTalepler.push({ talep: t, isciler: secilen, meslekAd: 'insaat' })
  }

  // Bugünkü atamalar (atandi/onaylandi)
  const bugunAtama1 = await prisma.atama.create({
    data: { talepId: bugunTalep1.id, isciId: isciler[0].id, meslekId: meslekler['depo'].id, tarih: atMidnight(0), durum: 'onaylandi', sgkBildirildi: true },
  })
  const bugunAtama2 = await prisma.atama.create({
    data: { talepId: bugunTalep1.id, isciId: isciler[1].id, meslekId: meslekler['depo'].id, tarih: atMidnight(0), durum: 'atandi', sgkBildirildi: false },
  })
  await prisma.atama.create({
    data: { talepId: bugunTalep2.id, isciId: isciler[15].id, meslekId: meslekler['paketleme'].id, tarih: atMidnight(0), durum: 'onaylandi', sgkBildirildi: true },
  })
  await prisma.atama.create({
    data: { talepId: bugunTalep2.id, isciId: isciler[6].id, meslekId: meslekler['paketleme'].id, tarih: atMidnight(0), durum: 'onaylandi', sgkBildirildi: true },
  })
  await prisma.atama.create({
    data: { talepId: yarınTalep.id, isciId: isciler[3].id, meslekId: meslekler['temizlik'].id, tarih: atMidnight(1), durum: 'atandi', sgkBildirildi: false },
  })

  // Geçmiş atamalar + puantaj
  for (const gt of gecmisTalepler) {
    for (const w of gt.isciler) {
      const durumlar: PuantajDurum[] = ['geldi', 'geldi', 'geldi', 'gec', 'gelmedi', 'yarim']
      const durum = durumlar[Math.floor(rnd() * 4)]
      const atama = await prisma.atama.create({
        data: {
          talepId: gt.talep.id,
          isciId: w.id,
          meslekId: meslekler[gt.meslekAd].id,
          tarih: gt.talep.tarih,
          durum: 'tamamlandi',
          sgkBildirildi: true,
        },
      })
      const calisilan = durum === 'gelmedi' ? 0 : durum === 'yarim' ? 4 : durum === 'gec' ? 7 : 8
      await prisma.puantaj.create({
        data: {
          atamaId: atama.id,
          girisSaat: durum === 'gelmedi' ? null : new Date(gt.talep.tarih.getTime() + 8 * 3600000),
          cikisSaat: durum === 'gelmedi' ? null : new Date(gt.talep.tarih.getTime() + (8 + calisilan) * 3600000),
          calisilanSaat: calisilan,
          mesaiSaat: calisilan > 8 ? calisilan - 8 : 0,
          durum,
        },
      })
    }
  }

  // Bugünkü atamalar için puantaj (canlı)
  await prisma.puantaj.create({
    data: { atamaId: bugunAtama1.id, girisSaat: new Date(atMidnight(0).getTime() + 8 * 3600000), durum: 'geldi', calisilanSaat: 4 },
  })
  await prisma.puantaj.create({
    data: { atamaId: bugunAtama2.id, durum: 'gelmedi', calisilanSaat: 0 },
  })

  // ---- Hakediş (geçmiş dönem; işçi+firma+ay bazında toplanır, avans dönemde bir kez) ----
  for (const gt of gecmisTalepler) {
    for (const w of gt.isciler) {
      const atama = await prisma.atama.findFirst({ where: { talepId: gt.talep.id, isciId: w.id } })
      if (!atama) continue
      const puantaj = await prisma.puantaj.findUnique({ where: { atamaId: atama.id } })
      if (!puantaj || puantaj.durum === 'gelmedi') continue
      const firmaFiyat = await prisma.firmaFiyat.findFirst({
        where: { firmaId: gt.talep.firmaId, meslekId: meslekler[gt.meslekAd].id },
      })
      const yevmiye = w.gunlukUcretBeklentisi
      const musteriGun = firmaFiyat ? Number(firmaFiyat.kisiGunFiyat) : yevmiye + 500
      const avans = avanslar[w.id] ?? 0
      const tarih = gt.talep.tarih
      const donemKey = `${tarih.getFullYear()}-${tarih.getMonth() + 1}`

      const mevcut = await prisma.hakedis.findFirst({
        where: { isciId: w.id, firmaId: gt.talep.firmaId, donemKey },
      })
      if (mevcut) {
        const gun = mevcut.gun + 1
        const musteri = Number(mevcut.musteriTutar) + musteriGun
        await prisma.hakedis.update({
          where: { id: mevcut.id },
          data: {
            atamaId: atama.id,
            donemBitis: tarih,
            gun,
            yevmiye,
            avansToplam: avans,
            isciNet: gun * yevmiye - avans,
            musteriTutar: musteri,
            marj: musteri - gun * yevmiye,
          },
        })
      } else {
        await prisma.hakedis.create({
          data: {
            atamaId: atama.id,
            isciId: w.id,
            firmaId: gt.talep.firmaId,
            donemKey,
            donemBas: new Date(tarih.getFullYear(), tarih.getMonth(), 1),
            donemBitis: tarih,
            gun: 1,
            yevmiye,
            avansToplam: avans,
            kesinti: 0,
            isciNet: yevmiye - avans,
            musteriTutar: musteriGun,
            marj: musteriGun - yevmiye,
          },
        })
      }
    }
  }

  // ---- Faturalar + Tahsilat (3 aylık geçmiş) ----
  const faturaData: Array<{ firmaId: number; no: string; donem: string; araToplam: number; vade: number; odendi?: boolean }> = [
    { firmaId: firma1.id, no: 'IKR-2026-001', donem: '2026-08', araToplam: 45000, vade: -3, odendi: true },
    { firmaId: firma1.id, no: 'IKR-2026-002', donem: '2026-08', araToplam: 38000, vade: 12 },
    { firmaId: firma2.id, no: 'IKR-2026-003', donem: '2026-08', araToplam: 27500, vade: 8 },
    { firmaId: firma3.id, no: 'IKR-2026-004', donem: '2026-08', araToplam: 61000, vade: -1 },
    { firmaId: firma4.id, no: 'IKR-2026-005', donem: '2026-07', araToplam: 15200, vade: -20 },
    // geçmiş aylar (yaşlandırma + trend için)
    { firmaId: firma1.id, no: 'IKR-2026-006', donem: '2026-07', araToplam: 42000, vade: -35 },
    { firmaId: firma1.id, no: 'IKR-2026-007', donem: '2026-07', araToplam: 41000, vade: -45 },
    { firmaId: firma2.id, no: 'IKR-2026-008', donem: '2026-07', araToplam: 26000, vade: -55 },
    { firmaId: firma3.id, no: 'IKR-2026-009', donem: '2026-07', araToplam: 58000, vade: -70 },
    { firmaId: firma1.id, no: 'IKR-2026-010', donem: '2026-06', araToplam: 40000, vade: -80, odendi: true },
    { firmaId: firma2.id, no: 'IKR-2026-011', donem: '2026-06', araToplam: 24000, vade: -95, odendi: true },
    { firmaId: firma4.id, no: 'IKR-2026-012', donem: '2026-06', araToplam: 14000, vade: -105 },
    { firmaId: firma1.id, no: 'IKR-2026-013', donem: '2026-05', araToplam: 39000, vade: -120, odendi: true },
    { firmaId: firma3.id, no: 'IKR-2026-014', donem: '2026-05', araToplam: 55000, vade: -130 },
    { firmaId: firma2.id, no: 'IKR-2026-015', donem: '2026-05', araToplam: 23000, vade: -140, odendi: true },
  ]
  for (const f of faturaData) {
    const kdv = Math.round(f.araToplam * 0.2 * 100) / 100
    const genel = f.araToplam + kdv
    const fatura = await prisma.fatura.create({
      data: {
        firmaId: f.firmaId,
        no: f.no,
        donem: f.donem,
        araToplam: f.araToplam,
        kdvOran: 0.2,
        kdvTutar: kdv,
        genelToplam: genel,
        vadeTarihi: atMidnight(f.vade),
        durum: f.odendi ? 'odendi' : f.vade < 0 ? 'gecikti' : 'vadede',
      },
    })
    if (f.odendi) {
      await prisma.tahsilat.create({ data: { faturaId: fatura.id, tutar: genel, tarih: atMidnight(f.vade + 5) } })
    } else if (f.no === 'IKR-2026-005') {
      await prisma.tahsilat.create({ data: { faturaId: fatura.id, tutar: 6000, tarih: atMidnight(-10) } })
    }
  }

  // ---- Giderler (3 aylık) ----
  const giderPlan: Array<[GiderKategori, number, string]> = [
    ['isci_yevmiye', 124500, 'Saha işçi yevmiyeleri'],
    ['personel_bordro', 42000, 'İç kadro maaşları'],
    ['kira', 18000, 'Merkez ofis kirası'],
    ['ulasim', 6500, 'Servis ve yol giderleri'],
    ['yakit', 8400, 'Araç yakıtı'],
    ['sarf_malzeme', 3200, 'Eldiven, maske, KKD'],
    ['diger', 2100, 'Genel giderler'],
  ]
  for (let ay = 0; ay < 3; ay++) {
    for (const [kategori, tutar, aciklama] of giderPlan) {
      const ayinBas = new Date()
      ayinBas.setDate(1)
      ayinBas.setMonth(ayinBas.getMonth() - ay)
      ayinBas.setDate(3 + Math.floor(rnd() * 20))
      await prisma.gider.create({ data: { kategori, tutar, aciklama, tarih: ayinBas } })
    }
  }

  // ---- Resmi Ödemeler ----
  const odemePlan: Array<[OdemeTip, number, number]> = [
    ['kdv', 128000, 26],
    ['muhtasar_sgk', 86500, 28],
    ['maas', 42000, 1],
    ['gecici_vergi', 34000, 14],
  ]
  for (const [tip, tutar, gun] of odemePlan) {
    await prisma.resmiOdeme.create({
      data: { tip, tutar, sonOdemeTarihi: atMidnight(gun), durum: gun < 0 ? 'odendi' : 'beklemede' },
    })
  }
  // Geçikmiş bir ödeme
  await prisma.resmiOdeme.create({
    data: { tip: 'muhtasar_sgk', tutar: 9650, sonOdemeTarihi: atMidnight(-9), durum: 'gecikti' },
  })

  // ---- Vergi & Resmi Ödemeler (firma bazlı) ----
  const vergiPlan: Array<[number, string, string, number, number, number | null, string | null]> = [
    // [firmaId, tur, donem, tahakkuk, sonOdemeGun(offset), odenenTutar, yontem]
    [firma1.id, 'KDV', '2026-09', 24800, 26, null, null],
    [firma1.id, 'MUHTASAR', '2026-09', 18300, 28, null, null],
    [firma2.id, 'KDV', '2026-09', 19400, 26, 19400, 'BANKA'],
    [firma2.id, 'SGK', '2026-09', 12650, 28, null, null],
    [firma3.id, 'GECICI_VERGI', '2026 Q3', 34200, 17, null, null],
    [firma3.id, 'STOPAJ', '2026-09', 9800, 26, null, null],
    [firma4.id, 'KDV', '2026-09', 7200, 26, 5000, 'NAKIT'], // kısmi ödeme
    [firma1.id, 'KDV', '2026-08', 23500, -4, null, null], // gecikmiş
  ]
  for (const [firmaId, tur, donem, tutar, gun, odenen, yontem] of vergiPlan) {
    const kayit = await prisma.vergiOdemesi.create({
      data: {
        firmaId,
        vergiTuru: tur as never,
        donem,
        tahakkukTutari: tutar,
        sonOdemeTarihi: atMidnight(gun),
        odenenTutar: odenen ?? undefined,
        odemeTarihi: odenen ? atMidnight(Math.max(gun - 5, -15)) : undefined,
        odemeYontemi: (yontem as never) ?? undefined,
        olusturanKullaniciId: 1,
      },
    })
    if (firmaId === firma2.id && odenen) {
      await prisma.vergiDekont.create({
        data: {
          vergiOdemeId: kayit.id,
          dosyaUrl: 'uploads/dekont/ornek-kdv-dekont.pdf',
          dosyaAdi: 'ornek-kdv-dekont.pdf',
          dosyaTipi: 'pdf',
          dosyaBoyutu: 10240,
          yukleyenKullaniciId: 1,
        },
      })
    }
  }
  await prisma.vergiSablon.createMany({
    data: [
      { firmaId: firma1.id, vergiTuru: 'KDV', tahakkukTutari: 24000, sonOdemeGun: 26, donemEtiketi: null },
      { firmaId: firma2.id, vergiTuru: 'KDV', tahakkukTutari: 19000, sonOdemeGun: 26, donemEtiketi: null },
      { firmaId: firma3.id, vergiTuru: 'GECICI_VERGI', tahakkukTutari: 33000, sonOdemeGun: 17, donemEtiketi: 'Q3' },
    ],
  })

  // ---- Personel (iç kadro) ----
  const personelPlan: Array<[string, string, string, number, string, number, 'kocaeli' | 'balikesir']> = [
    ['Zeynep Ak', 'Yönetim', 'Patron', 85000, 'Aktif SGK', 14, 'kocaeli'],
    ['Mert Can', 'Operasyon', 'Operasyon Sorumlusu', 42000, 'Aktif SGK', 10, 'kocaeli'],
    ['Elif Su', 'Muhasebe', 'Muhasebe Uzmanı', 38000, 'Aktif SGK', 8, 'kocaeli'],
    ['Onur Tekin', 'Saha', 'Saha Sorumlusu', 32000, 'Aktif SGK', 12, 'balikesir'],
    ['Aylin Duru', 'İK', 'İK Asistanı', 28000, 'Aktif SGK', 6, 'balikesir'],
  ]
  for (const [ad, departman, rol, maas, sgkDurum, izin, bolge] of personelPlan) {
    const p = await prisma.personel.create({
      data: {
        ad,
        departman,
        rol,
        iseGiris: atMidnight(-Math.floor(rnd() * 900)),
        maas,
        iban: encrypt(genIBAN()),
        sgkDurum,
        izinBakiyesi: izin,
        bolge,
        durum: 'aktif',
      },
    })
    // izin geçmişi
    const izinSayisi = Math.floor(rnd() * 3)
    for (let i = 0; i < izinSayisi; i++) {
      await prisma.izin.create({
        data: {
          personelId: p.id,
          tarih: atMidnight(-Math.floor(rnd() * 90)),
          gun: 1 + Math.floor(rnd() * 2),
          tip: rnd() > 0.8 ? 'rapor' : 'izin',
          not: rnd() > 0.5 ? 'Planlı izin' : null,
        },
      })
    }
    // departman/rol/maaş geçmişi
    await prisma.personelGecmisi.createMany({
      data: [
        { personelId: p.id, tarih: atMidnight(-400 - Math.floor(rnd() * 200)), alan: 'departman', eskiDeger: 'Giriş', yeniDeger: departman },
        { personelId: p.id, tarih: atMidnight(-250 - Math.floor(rnd() * 150)), alan: 'rol', eskiDeger: 'Stajyer', yeniDeger: rol },
        { personelId: p.id, tarih: atMidnight(-120 - Math.floor(rnd() * 100)), alan: 'maas', eskiDeger: `${Math.round(maas * 0.85)}`, yeniDeger: `${maas}` },
      ],
    })
  }

  // ---- Personel İSG belgeleri (bazı personelde var → Personel menüsünde İSG √) ----
  const personelKayitlari = await prisma.personel.findMany({ orderBy: { id: 'asc' } })
  for (const p of personelKayitlari.slice(0, 3)) {
    await prisma.belge.create({
      data: {
        personelId: p.id,
        tip: ISG_BELGE_TIPI,
        verilisTarihi: atMidnight(-200),
        bitisTarihi: atMidnight(160),
      },
    })
  }

  // ---- Servisçiler (kavli, KDV'siz) ----
  const servisciPlan: Array<[string, string, 'kocaeli' | 'balikesir']> = [
    ['Kemal Şahin', '+90 532 777 00 11', 'kocaeli'],
    ['Hakan Aydın', '+90 535 888 00 22', 'kocaeli'],
    ['Tuncay Özkan', '+90 542 999 00 33', 'balikesir'],
  ]
  const servisciKayitlari: number[] = []
  for (const [ad, telefon, bolge] of servisciPlan) {
    const s = await prisma.servisci.create({ data: { ad, telefon, bolge } })
    servisciKayitlari.push(s.id)
    // geçmiş servisler
    const servisSayisi = 4 + Math.floor(rnd() * 6)
    for (let i = 0; i < servisSayisi; i++) {
      await prisma.servis.create({
        data: {
          servisciId: s.id,
          tarih: atMidnight(-i - Math.floor(rnd() * 3)),
          guzergah: rnd() > 0.5 ? 'Şantiyeye işçi servisi' : 'Depodan üretim tesisine transfer',
          tutar: 800 + Math.floor(rnd() * 40) * 10,
        },
      })
    }
  }

  // ---- İşçi notları ----
  const isciNotlari: Array<[number, string]> = [
    [0, 'Forklift ehliyeti güçlü, son 2 ayda 2 no-show. Uyarıldı.'],
    [5, 'Sürekli ilk tercih — vardiya değişikliklerine uyumlu.'],
    [20, 'Devamsızlık riski yüksek, kara listeye alınabilir.'],
  ]
  for (const [idx, not] of isciNotlari) {
    await prisma.isci.update({ where: { id: isciler[idx].id }, data: { not } })
  }

  // ---- Kullanıcılar (şimdilik tek admin) ----
  const sifre = await bcrypt.hash('123123', 10)
  const admin = await prisma.kullanici.create({
    data: { ad: 'Admin', email: 'admin@ikcrm.com', sifreHash: sifre, rol: 'patron' },
  })

  // ---- Telefon aramaları (örnek) ----
  for (let k = 0; k < 6; k++) {
    const adet = 1 + Math.floor(rnd() * 3)
    for (let i = 0; i < adet; i++) {
      await prisma.arama.create({
        data: { isciId: isciler[k].id, kullaniciId: admin.id, tarih: atMidnight(-Math.floor(rnd() * 6)).toISOString() },
      })
    }
  }

  // ---- Ayar (sabitler DB'ye taşındı) ----
  await prisma.ayar.createMany({
    data: [
      { anahtar: 'KDV_ORANI', deger: '0.20', aciklama: 'Fatura KDV oranı' },
      { anahtar: 'SGK_ISVEREN_ORANI', deger: '0.205', aciklama: 'SGK işveren payı' },
      { anahtar: 'GUNLUK_UCRET_VARSAYILAN', deger: '1800', aciklama: 'Sistem varsayılan günlük ücret (TL)' },
      { anahtar: 'SAATLIK_UCRET_VARSAYILAN', deger: '225', aciklama: 'Sistem varsayılan saatlik ücret (TL)' },
      { anahtar: 'MESAI_CARPAN', deger: '1.5', aciklama: 'Fazla mesai çarpanı' },
      { anahtar: 'FIRMA_AD', deger: 'İK Saha A.Ş.', aciklama: 'Firma adı' },
      { anahtar: 'FIRMA_VERGINO', deger: '1234567890', aciklama: 'Vergi no' },
      { anahtar: 'FIRMA_TELEFON', deger: '+90 216 000 00 00', aciklama: 'Telefon' },
      { anahtar: 'FIRMA_EMAIL', deger: 'info@iksaha.com', aciklama: 'E-posta' },
      { anahtar: 'FIRMA_ADRES', deger: 'İstanbul', aciklama: 'Adres' },
    ],
  })

  // ---- Aday havuzu ----
  const adayPlan: Array<[string, string, string, number, 'kocaeli' | 'balikesir' | null]> = [
    ['Serkan Ateş', '+90 532 111 22 33', 'forklift', 65, 'kocaeli'],
    ['Burak Tuna', '+90 533 222 33 44', 'kaynak', 70, 'balikesir'],
    ['Emrecan Sözen', '+90 535 333 44 55', 'depo', 60, 'kocaeli'],
    ['Deniz Aras', '+90 542 444 55 66', 'temizlik', 55, null],
    ['Kaan Yüksel', '+90 536 555 66 77', 'insaat', 62, 'balikesir'],
  ]
  for (const [ad, telefon, meslekAd, puan, bolge] of adayPlan) {
    await prisma.aday.create({
      data: {
        ad,
        telefon,
        email: `${ad.split(' ')[0].toLowerCase()}@mail.com`,
        meslekId: meslekler[meslekAd].id,
        durum: rnd() > 0.6 ? 'basvurdu' : 'gorusuldu',
        puan,
        bolge,
        kaynak: bolge === null ? 'website_test' : null,
      },
    })
  }

  // ---- Toplu ödemeler (mevcut dönem: hakediş net + personel maaş) ----
  const donem = new Date().toISOString().slice(0, 7)
  const donemBas = atMidnight(-(new Date().getDate() - 1))
  const donemBit = atMidnight(1)
  const haks = await prisma.hakedis.findMany({
    where: { donemBitis: { gte: donemBas, lt: donemBit } },
    select: { isciId: true, isciNet: true },
  })
  const netMap = new Map<number, number>()
  for (const h of haks) netMap.set(h.isciId, (netMap.get(h.isciId) ?? 0) + Number(h.isciNet))
  for (const [isciId, tutar] of netMap) {
    await prisma.odeme.create({ data: { tip: 'isci', isciId, donem, tutar, durum: 'bekliyor' } })
  }
  const aktifPersonel = await prisma.personel.findMany({ where: { durum: 'aktif' } })
  for (const p of aktifPersonel) {
    await prisma.odeme.create({ data: { tip: 'personel', personelId: p.id, donem, tutar: p.maas, durum: 'bekliyor' } })
  }

  // ---- Evrak örnekleri (placeholder dosyalar) ----
  await prisma.evrak.createMany({
    data: [
      { tip: 'firma_sozlesme', baslik: 'Artaş 2026 Hizmet Sözleşmesi', dosyaAdi: 'artas-sozlesme.pdf', dosyaYol: '/uploads/evrak/artas-sozlesme.pdf', ilgiliFirmaId: firma1.id },
      { tip: 'kvkk_acik_riza', baslik: 'KVKK Açık Rıza — Mehmet Yılmaz', dosyaAdi: 'kvkk-mehmet.pdf', dosyaYol: '/uploads/evrak/kvkk-mehmet.pdf', ilgiliIsciId: isciler[0].id },
      { tip: 'isci_is_sozlesme', baslik: 'İş Sözleşmesi — Ahmet Demir', dosyaAdi: 'isci-sozlesme-ahmet.pdf', dosyaYol: '/uploads/evrak/isci-sozlesme-ahmet.pdf', ilgiliIsciId: isciler[1].id },
    ],
  })

  // ---- Bildirimler ----
  const bildirimMesajlari: Array<[string, string]> = [
    ['belge', 'Süresi dolan belge: Kimlik Kartı yenilenmesi gerekiyor.'],
    ['belge', '3 belge 30 gün içinde süresi doluyor.'],
    ['fatura', 'IKR-2026-004 faturası vadesi geçti.'],
    ['talep', 'Acil talep: Nova İnşaat 5 inşaat işçisi istiyor.'],
    ['vergi', 'Geçici vergi ödeme tarihi yaklaşıyor.'],
  ]
  for (const [tur, mesaj] of bildirimMesajlari) {
    await prisma.bildirim.create({ data: { tur: tur as never, mesaj } })
  }

  console.log('✅ Seed tamamlandı.')
  console.log('🔑 Giriş: admin@ikcrm.com / 123123 (tek admin hesabı)')
}

main()
  .catch((e) => {
    console.error(e)
    process.exit(1)
  })
  .finally(async () => {
    await prisma.$disconnect()
  })