import { PrismaClient, IsciDurum, GiderKategori, OdemeTip, PuantajDurum } from '@prisma/client'
import { PrismaPg } from '@prisma/adapter-pg'
import bcrypt from 'bcryptjs'
import { encrypt } from '../src/lib/crypto'

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

// isim, ilce, tercihBolgeler, meslekler, beklenti
const WORKERS: Array<[string, string, string[], string[], number]> = [
  ['Mehmet Yılmaz', 'Ümraniye', ['Ümraniye', 'Pendik'], ['forklift', 'depo'], 1600],
  ['Ahmet Demir', 'Pendik', ['Pendik', 'Tuzla'], ['forklift', 'hamaliye'], 1550],
  ['Hasan Kaya', 'Kartal', ['Kartal', 'Maltepe'], ['depo', 'paketleme'], 1450],
  ['İbrahim Şahin', 'Esenyurt', ['Beylikdüzü', 'Esenyurt'], ['temizlik', 'hijyen'], 1350],
  ['Mustafa Aydın', 'Tuzla', ['Tuzla', 'Pendik'], ['kaynak', 'insaat'], 1750],
  ['Emre Arslan', 'Başakşehir', ['Başakşehir', 'Esenyurt'], ['insaat', 'hamaliye'], 1500],
  ['Osman Çelik', 'Kadıköy', ['Kadıköy', 'Üsküdar'], ['temizlik', 'paketleme'], 1400],
  ['Ramazan Kılıç', 'Üsküdar', ['Üsküdar', 'Kadıköy'], ['depo', 'forklift'], 1500],
  ['Hüseyin Öztürk', 'Beylikdüzü', ['Beylikdüzü'], ['hijyen', 'temizlik'], 1300],
  ['Ali Koç', 'Maltepe', ['Maltepe', 'Kartal'], ['kaynak', 'forklift'], 1800],
  ['Fatih Aksoy', 'Ataşehir', ['Ümraniye', 'Ataşehir'], ['insaat', 'depo'], 1500],
  ['Murat Doğan', 'Sancaktepe', ['Ümraniye', 'Pendik'], ['hamaliye', 'paketleme'], 1300],
  ['Serkan Yalçın', 'Pendik', ['Pendik', 'Tuzla'], ['kaynak'], 1850],
  ['Ömer Güneş', 'Esenyurt', ['Esenyurt', 'Başakşehir'], ['insaat', 'hamaliye'], 1450],
  ['Volkan Er', 'Tuzla', ['Tuzla', 'Pendik'], ['paketleme', 'depo'], 1400],
  ['Burak Şen', 'Ümraniye', ['Ümraniye', 'Kadıköy'], ['forklift', 'depo'], 1600],
  ['Cengiz Aydoğan', 'Kartal', ['Kartal', 'Maltepe'], ['insaat', 'kaynak'], 1700],
  ['Salih Öz', 'Beylikdüzü', ['Beylikdüzü', 'Esenyurt'], ['hijyen', 'temizlik'], 1350],
  ['Yılmaz Toprak', 'Başakşehir', ['Başakşehir'], ['depo', 'paketleme'], 1420],
  ['Kadir Yıldız', 'Kadıköy', ['Kadıköy', 'Üsküdar'], ['temizlik'], 1380],
  ['Necati Bulut', 'Tuzla', ['Tuzla', 'Pendik'], ['hamaliye', 'insaat'], 1400],
  ['Sinan Özdemir', 'Maltepe', ['Maltepe', 'Kartal'], ['kaynak', 'insaat'], 1750],
]

// lokasyon adları
const LOKASYON_ADLARI = ['Pendik Merkez Depo', 'Ümraniye Şube', 'Tuzla Gıda Tesisi', 'Beylikdüzü Lojistik', 'Başakşehir Şantiye', 'Kadıköy Hizmet']

async function main() {
  console.log('🌱 Seed başlıyor...')

  // Temizleme (FK sırası)
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
      telefon: '+90 216 555 10 20',
      email: 'finans@artaslojistik.com',
      adres: 'Pendik Sanayi, İstanbul',
    },
  })
  const firma2 = await prisma.musteriFirma.create({
    data: {
      ad: 'Yıldız Gıda San. Tic.',
      vergiNo: '9876543210',
      telefon: '+90 216 555 30 40',
      email: 'muhasebe@yildizgida.com',
      adres: 'Tuzla Kimya Sanayi, İstanbul',
    },
  })
  const firma3 = await prisma.musteriFirma.create({
    data: {
      ad: 'Nova İnşaat Ltd. Şti.',
      vergiNo: '5551234567',
      telefon: '+90 212 555 70 80',
      email: 'insaat@nova.com.tr',
      adres: 'Başakşehir Bulvarı, İstanbul',
    },
  })
  const firma4 = await prisma.musteriFirma.create({
    data: {
      ad: 'TemizLine Hizmet A.Ş.',
      vergiNo: '1112223334',
      telefon: '+90 216 555 90 00',
      email: 'operasyon@temizline.com',
      adres: 'Kadıköy, İstanbul',
    },
  })

  const f1lok1 = await prisma.lokasyon.create({ data: { firmaId: firma1.id, ad: LOKASYON_ADLARI[0], adres: 'Pendik' } })
  await prisma.lokasyon.create({ data: { firmaId: firma1.id, ad: LOKASYON_ADLARI[1], adres: 'Ümraniye' } })
  const f2lok1 = await prisma.lokasyon.create({ data: { firmaId: firma2.id, ad: LOKASYON_ADLARI[2], adres: 'Tuzla' } })
  await prisma.lokasyon.create({ data: { firmaId: firma2.id, ad: LOKASYON_ADLARI[3], adres: 'Beylikdüzü' } })
  const f3lok1 = await prisma.lokasyon.create({ data: { firmaId: firma3.id, ad: LOKASYON_ADLARI[4], adres: 'Başakşehir' } })
  const f4lok1 = await prisma.lokasyon.create({ data: { firmaId: firma4.id, ad: LOKASYON_ADLARI[5], adres: 'Kadıköy' } })

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
  const isciler: { id: number; ad: string; gunlukUcretBeklentisi: number; ilce: string }[] = []
  for (const [ad, ilce, tercih, meslekleri, beklenti] of WORKERS) {
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
        tercihBolgeler: tercih,
        meslekler: { create: meslekleri.map((m) => ({ meslekId: meslekler[m].id })) },
      },
    })
    isciler.push({ id: isci.id, ad, gunlukUcretBeklentisi: beklenti, ilce })
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

  // ---- Hakediş (geçmiş dönem, puantaj kapanınca otomatik) ----
  for (const gt of gecmisTalepler.slice(0, 4)) {
    for (const w of gt.isciler) {
      const firmaFiyat = await prisma.firmaFiyat.findFirst({
        where: { firmaId: gt.talep.firmaId, meslekId: meslekler[gt.meslekAd].id },
      })
      const gun = 1
      const yevmiye = w.gunlukUcretBeklentisi
      const musteriGun = firmaFiyat ? Number(firmaFiyat.kisiGunFiyat) : yevmiye + 500
      const avansToplam = avanslar[w.id] ?? 0
      const kesinti = 0
      const isciNet = gun * yevmiye - avansToplam - kesinti
      await prisma.hakedis.create({
        data: {
          isciId: w.id,
          firmaId: gt.talep.firmaId,
          donemBas: atMidnight(-30),
          donemBitis: atMidnight(-1),
          gun,
          yevmiye,
          avansToplam,
          kesinti,
          isciNet,
          musteriTutar: gun * musteriGun,
          marj: gun * musteriGun - gun * yevmiye,
        },
      })
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

  // ---- Personel (iç kadro) ----
  const personelPlan: Array<[string, string, string, number, string, number]> = [
    ['Zeynep Ak', 'Yönetim', 'Patron', 85000, 'Aktif SGK', 14],
    ['Mert Can', 'Operasyon', 'Operasyon Sorumlusu', 42000, 'Aktif SGK', 10],
    ['Elif Su', 'Muhasebe', 'Muhasebe Uzmanı', 38000, 'Aktif SGK', 8],
    ['Onur Tekin', 'Saha', 'Saha Sorumlusu', 32000, 'Aktif SGK', 12],
    ['Aylin Duru', 'İK', 'İK Asistanı', 28000, 'Aktif SGK', 6],
  ]
  for (const [ad, departman, rol, maas, sgkDurum, izin] of personelPlan) {
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
  await prisma.kullanici.createMany({
    data: [
      { ad: 'Admin', email: 'admin@ikcrm.com', sifreHash: sifre, rol: 'patron' },
    ],
  })

  // ---- Ayar (sabitler DB'ye taşındı) ----
  await prisma.ayar.createMany({
    data: [
      { anahtar: 'KDV_ORANI', deger: '0.20', aciklama: 'Fatura KDV oranı' },
      { anahtar: 'SGK_ISVEREN_ORANI', deger: '0.205', aciklama: 'SGK işveren payı' },
      { anahtar: 'FIRMA_AD', deger: 'İK Saha A.Ş.', aciklama: 'Firma adı' },
      { anahtar: 'FIRMA_VERGINO', deger: '1234567890', aciklama: 'Vergi no' },
      { anahtar: 'FIRMA_TELEFON', deger: '+90 216 000 00 00', aciklama: 'Telefon' },
      { anahtar: 'FIRMA_EMAIL', deger: 'info@iksaha.com', aciklama: 'E-posta' },
      { anahtar: 'FIRMA_ADRES', deger: 'İstanbul', aciklama: 'Adres' },
    ],
  })

  // ---- Aday havuzu ----
  const adayPlan: Array<[string, string, string, number]> = [
    ['Serkan Ateş', '+90 532 111 22 33', 'forklift', 65],
    ['Burak Tuna', '+90 533 222 33 44', 'kaynak', 70],
    ['Emrecan Sözen', '+90 535 333 44 55', 'depo', 60],
    ['Deniz Aras', '+90 542 444 55 66', 'temizlik', 55],
    ['Kaan Yüksel', '+90 536 555 66 77', 'insaat', 62],
  ]
  for (const [ad, telefon, meslekAd, puan] of adayPlan) {
    await prisma.aday.create({
      data: {
        ad,
        telefon,
        email: `${ad.split(' ')[0].toLowerCase()}@mail.com`,
        meslekId: meslekler[meslekAd].id,
        durum: rnd() > 0.6 ? 'basvurdu' : 'gorusuldu',
        puan,
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
  const bildirimMesajlari = [
    'Süresi dolan belge: Kimlik Kartı yenilenmesi gerekiyor.',
    '3 belge 30 gün içinde süresi doluyor.',
    'IKR-2026-004 faturası vadesi geçti.',
    'Acil talep: Nova İnşaat 5 inşaat işçisi istiyor.',
    'Geçici vergi ödeme tarihi yaklaşıyor.',
  ]
  for (const mesaj of bildirimMesajlari) {
    await prisma.bildirim.create({ data: { tur: 'belge', mesaj } })
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