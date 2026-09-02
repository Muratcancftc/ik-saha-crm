import { prisma } from './db'
import { maskTC, maskIBAN, decrypt } from './crypto'
import { startOfDay, daysUntil } from './dates'
import type { SessionUser } from './dal'

export type DonemRapor = { bas: Date; bit: Date }

// ================= İŞÇİ PROFİLİ =================
export async function getIsciProfil(isciId: number, bas: Date, bit: Date) {
  const isci = await prisma.isci.findUnique({
    where: { id: isciId },
    include: {
      meslekler: { include: { meslek: true } },
      belgeler: { orderBy: { bitisTarihi: 'asc' } },
      avanslar: { orderBy: { tarih: 'desc' } },
      musaitlikler: { orderBy: { tarih: 'asc' } },
      atamalar: {
        where: { tarih: { gte: bas, lt: bit }, durum: { not: 'iptal' } },
        include: {
          puantaj: true,
          talep: { include: { firma: true, lokasyon: true, kalemler: { include: { meslek: true } } } },
        },
        orderBy: { tarih: 'desc' },
      },
    },
  })
  if (!isci) return null

  const bugun = startOfDay()
  const aktifAtamalar = isci.atamalar.filter((a) => a.durum !== 'iptal')
  const calisti = aktifAtamalar.filter((a) => a.puantaj && a.puantaj.durum !== 'gelmedi')
  const noShow = aktifAtamalar.filter((a) => a.puantaj?.durum === 'gelmedi').length
  const toplam = aktifAtamalar.length

  const calismaGecmisi = calisti.map((a) => {
    const meslekAd =
      a.talep.kalemler.find((k) => k.meslekId === (a.meslekId ?? 0))?.meslek.ad ??
      a.talep.kalemler[0]?.meslek.ad ??
      '—'
    return {
      id: a.id,
      tarih: a.tarih,
      firma: a.talep.firma.ad,
      lokasyon: a.talep.lokasyon.ad,
      meslek: meslekAd,
      puantaj: a.puantaj?.durum ?? null,
      yevmiye: Number(isci.gunlukUcretBeklentisi),
      calisilanSaat: Number(a.puantaj?.calisilanSaat ?? 0),
    }
  })

  // firma bazında özet
  const firmaOzet = new Map<string, number>()
  for (const c of calismaGecmisi) {
    firmaOzet.set(c.firma, (firmaOzet.get(c.firma) ?? 0) + 1)
  }

  const toplamKazanc = calismaGecmisi.reduce((a, c) => a + c.yevmiye, 0)
  const devamOrani = toplam === 0 ? 0 : Math.round((calisti.length / toplam) * 100)
  const guvenilirlik = Math.max(0, Math.min(100, isci.puan - noShow * 5))

  const devamsizlik = aktifAtamalar
    .filter((a) => a.puantaj?.durum === 'gelmedi')
    .map((a) => ({
      id: a.id,
      tarih: a.tarih,
      firma: a.talep.firma.ad,
      lokasyon: a.talep.lokasyon.ad,
    }))

  return {
    id: isci.id,
    ad: isci.ad,
    telefon: isci.telefon,
    tcMasked: maskTC(decrypt(isci.tcKimlik)),
    ibanMasked: maskIBAN(decrypt(isci.iban)),
    tcKimlik: decrypt(isci.tcKimlik),
    iban: decrypt(isci.iban),
    ilce: isci.ilce,
    dogumTarihi: isci.dogumTarihi,
    puan: isci.puan,
    beklenti: Number(isci.gunlukUcretBeklentisi),
    durum: isci.durum,
    not: isci.not,
    tercihBolgeler: isci.tercihBolgeler,
    meslekler: isci.meslekler.map((m) => m.meslek.ad),
    // dönem özeti
    calisilanGun: calismaGecmisi.length,
    toplamKazanc,
    devamOrani,
    noShow,
    guvenilirlik,
    atananGun: toplam,
    // bölümler
    belgeler: isci.belgeler.map((b) => ({
      id: b.id,
      tip: b.tip,
      verilisTarihi: b.verilisTarihi,
      bitisTarihi: b.bitisTarihi,
      kalanGun: daysUntil(b.bitisTarihi),
      durum: b.bitisTarihi < bugun ? 'doldu' : daysUntil(b.bitisTarihi) <= 30 ? 'yaklasiyor' : 'gecerli',
    })),
    calismaGecmisi,
    firmaOzet: Array.from(firmaOzet.entries()).map(([firma, gun]) => ({ firma, gun })).sort((a, b) => b.gun - a.gun),
    devamsizlik,
    avanslar: isci.avanslar.map((a) => ({ id: a.id, tarih: a.tarih, tutar: Number(a.tutar), durum: a.durum })),
    avansToplam: isci.avanslar.filter((a) => a.durum === 'verildi').reduce((s, a) => s + Number(a.tutar), 0),
    musaitlik: isci.musaitlikler.map((m) => ({ id: m.id, tarih: m.tarih, eVadesiGun: m.eVadesiGun, durum: m.durum })),
  }
}

// ================= FİRMA PROFİLİ =================
export async function getFirmaProfil(firmaId: number, bas: Date, bit: Date) {
  const firma = await prisma.musteriFirma.findUnique({
    where: { id: firmaId },
    include: {
      yetkililer: true,
      lokasyonlar: true,
      fiyatlar: { include: { meslek: true } },
      talepler: {
        where: { tarih: { gte: bas, lt: bit } },
        include: {
          kalemler: { include: { meslek: true } },
          atamalar: { where: { durum: { not: 'iptal' } }, include: { isci: true, puantaj: true } },
          lokasyon: true,
        },
        orderBy: { tarih: 'desc' },
      },
      faturalar: { include: { tahsilatlar: true }, orderBy: { vadeTarihi: 'desc' } },
    },
  })
  if (!firma) return null

  // dönem ciro (vadeTarihi dönemde olan faturalar)
  const donemFaturalar = firma.faturalar.filter((f) => f.vadeTarihi >= bas && f.vadeTarihi < bit)
  const ciro = donemFaturalar.reduce((a, f) => a + Number(f.genelToplam), 0)
  const tahsilat = donemFaturalar.reduce((a, f) => a + f.tahsilatlar.reduce((x, t) => x + Number(t.tutar), 0), 0)

  // alacak yaşlandırma (vadesi geçen, ödenmemiş faturalar)
  const kategoriler = { vadesiGelmemis: 0, g0_30: 0, g30_60: 0, g60_90: 0, g90: 0 }
  const acikFaturalar: Array<{ id: number; no: string; genelToplam: number; odenen: number; kalan: number; vadeTarihi: Date; gun: number }> = []
  for (const f of firma.faturalar) {
    const odenen = f.tahsilatlar.reduce((a, t) => a + Number(t.tutar), 0)
    const kalan = Number(f.genelToplam) - odenen
    if (kalan <= 0) continue
    const gun = daysUntil(f.vadeTarihi)
    if (gun >= 0) kategoriler.vadesiGelmemis += kalan
    else if (gun >= -30) kategoriler.g0_30 += kalan
    else if (gun >= -60) kategoriler.g30_60 += kalan
    else if (gun >= -90) kategoriler.g60_90 += kalan
    else kategoriler.g90 += kalan
    acikFaturalar.push({ id: f.id, no: f.no, genelToplam: Number(f.genelToplam), odenen, kalan, vadeTarihi: f.vadeTarihi, gun })
  }
  const toplamAlacak = Object.values(kategoriler).reduce((a, b) => a + b, 0)

  // talep geçmişi + gönderilen işçiler
  const talepGecmisi = firma.talepler.map((t) => {
    const ihtiyac = t.kalemler.reduce((a, k) => a + k.adet, 0)
    return {
      id: t.id,
      tarih: t.tarih,
      lokasyon: t.lokasyon.ad,
      ihtiyac,
      atanan: t.atamalar.length,
      durum: t.durum,
      vardiya: t.vardiya,
    }
  })

  const isciSayac = new Map<number, { ad: string; gun: number }>()
  for (const t of firma.talepler) {
    for (const a of t.atamalar) {
      const e = isciSayac.get(a.isciId)
      if (e) e.gun++
      else isciSayac.set(a.isciId, { ad: a.isci.ad, gun: 1 })
    }
  }
  const enCokGonderilen = Array.from(isciSayac.entries())
    .map(([id, v]) => ({ id, ...v }))
    .sort((a, b) => b.gun - a.gun)
    .slice(0, 8)

  // ortalama doluluk
  const doluluklar = talepGecmisi.map((t) => (t.ihtiyac === 0 ? 1 : t.atanan / t.ihtiyac))
  const ortalamaDoluluk = doluluklar.length ? Math.round((doluluklar.reduce((a, b) => a + b, 0) / doluluklar.length) * 100) : 0

  return {
    id: firma.id,
    ad: firma.ad,
    vergiNo: firma.vergiNo,
    telefon: firma.telefon,
    email: firma.email,
    adres: firma.adres,
    yetkililer: firma.yetkililer,
    lokasyonlar: firma.lokasyonlar,
    fiyatlar: firma.fiyatlar.map((p) => ({ meslekId: p.meslekId, meslekAd: p.meslek.ad, kisiGunFiyat: Number(p.kisiGunFiyat) })),
    // dönem özeti
    ciro,
    tahsilat,
    alacak: toplamAlacak,
    ortalamaDoluluk,
    talepSayisi: firma.talepler.length,
    gonderilenIsci: Array.from(isciSayac.values()).reduce((a, v) => a + v.gun, 0),
    talepGecmisi,
    enCokGonderilen,
    // faturalar + yaşlandırma
    faturalar: firma.faturalar.map((f) => ({
      id: f.id,
      no: f.no,
      donem: f.donem,
      vadeTarihi: f.vadeTarihi,
      genelToplam: Number(f.genelToplam),
      odenen: f.tahsilatlar.reduce((a, t) => a + Number(t.tutar), 0),
      durum: f.durum,
    })),
    yaslandirma: kategoriler,
    acikFaturalar,
  }
}

// ================= PERSONEL PROFİLİ =================
export async function getPersonelProfil(personelId: number) {
  const personel = await prisma.personel.findUnique({
    where: { id: personelId },
    include: {
      izinler: { orderBy: { tarih: 'desc' } },
      gecmis: { orderBy: { tarih: 'desc' } },
    },
  })
  if (!personel) return null

  const maas = Number(personel.maas)
  const sgkIsveren = Math.round(maas * 0.205)
  const izinKullanilan = personel.izinler.filter((i) => i.tip === 'izin').reduce((a, i) => a + i.gun, 0)
  const raporGun = personel.izinler.filter((i) => i.tip === 'rapor').reduce((a, i) => a + i.gun, 0)

  return {
    id: personel.id,
    ad: personel.ad,
    departman: personel.departman,
    rol: personel.rol,
    iseGiris: personel.iseGiris,
    maas,
    sgkIsveren,
    toplamMaliyet: maas + sgkIsveren,
    ibanMasked: maskIBAN(decrypt(personel.iban)),
    iban: decrypt(personel.iban),
    sgkDurum: personel.sgkDurum,
    izinBakiyesi: personel.izinBakiyesi,
    izinKullanilan,
    raporGun,
    durum: personel.durum,
    izinler: personel.izinler.map((i) => ({ id: i.id, tarih: i.tarih, gun: i.gun, tip: i.tip, not: i.not })),
    gecmis: personel.gecmis.map((g) => ({ id: g.id, tarih: g.tarih, alan: g.alan, eskiDeger: g.eskiDeger, yeniDeger: g.yeniDeger })),
  }
}

// ================= DASHBOARD RAPOR =================
export async function getDashboardRapor(user: SessionUser, bas: Date, bit: Date) {
  const lokFilter = user.rol === 'saha_sorumlusu' ? { talep: { lokasyonId: user.lokasyonId ?? -1 } } : {}

  const [atamalar, faturalar, giderler, hakedisler, talepler] = await Promise.all([
    prisma.atama.findMany({
      where: { tarih: { gte: bas, lt: bit }, durum: { not: 'iptal' }, ...lokFilter },
      include: { puantaj: true, isci: true, talep: { include: { firma: true } } },
    }),
    prisma.fatura.findMany({ where: { vadeTarihi: { gte: bas, lt: bit } }, include: { tahsilatlar: true, firma: true } }),
    prisma.gider.findMany({ where: { tarih: { gte: bas, lt: bit } } }),
    prisma.hakedis.findMany({ where: { donemBitis: { gte: bas, lt: bit } } }),
    prisma.talep.findMany({
      where: { tarih: { gte: bas, lt: bit }, ...(user.rol === 'saha_sorumlusu' ? { lokasyonId: user.lokasyonId ?? -1 } : {}) },
      include: { kalemler: true, atamalar: { where: { durum: { not: 'iptal' } } } },
    }),
  ])

  const ciro = faturalar.reduce((a, f) => a + Number(f.genelToplam), 0)
  const tahsilat = faturalar.reduce((a, f) => a + f.tahsilatlar.reduce((x, t) => x + Number(t.tutar), 0), 0)
  const gider = giderler.reduce((a, g) => a + Number(g.tutar), 0)
  const netKar = ciro - gider

  // işçi istatistikleri (çalışılan gün)
  const isciGun = new Map<number, { ad: string; gun: number; noshow: number }>()
  let toplamAtama = 0
  let noshowToplam = 0
  for (const a of atamalar) {
    toplamAtama++
    const e = isciGun.get(a.isciId)
    if (a.puantaj?.durum === 'gelmedi') {
      noshowToplam++
      if (e) e.noshow++
      else isciGun.set(a.isciId, { ad: a.isci.ad, gun: 0, noshow: 1 })
    } else if (a.puantaj) {
      if (e) e.gun++
      else isciGun.set(a.isciId, { ad: a.isci.ad, gun: 1, noshow: 0 })
    }
  }
  const isciListesi = Array.from(isciGun.entries()).map(([id, v]) => ({ id, ...v }))
  const enCokCalisan = [...isciListesi].sort((a, b) => b.gun - a.gun).slice(0, 5)
  const enAzCalisan = [...isciListesi].filter((i) => i.gun > 0).sort((a, b) => a.gun - b.gun).slice(0, 5)

  // firma kârlılığı (hakediş marjı)
  const firmaIds = [...new Set(hakedisler.map((h) => h.firmaId))]
  const firmalar = await prisma.musteriFirma.findMany({
    where: { id: { in: firmaIds } },
    select: { id: true, ad: true },
  })
  const firmaAd = new Map(firmalar.map((f) => [f.id, f.ad]))
  const firmaMarj = new Map<number, { ad: string; marj: number }>()
  for (const h of hakedisler) {
    const e = firmaMarj.get(h.firmaId)
    if (e) e.marj += Number(h.marj)
    else firmaMarj.set(h.firmaId, { ad: firmaAd.get(h.firmaId) ?? '—', marj: Number(h.marj) })
  }
  const enKarliFirmalar = Array.from(firmaMarj.entries()).map(([id, v]) => ({ id, ...v })).sort((a, b) => b.marj - a.marj).slice(0, 5)

  // doluluk oranı
  const ihtiyacToplam = talepler.reduce((a, t) => a + t.kalemler.reduce((x, k) => x + k.adet, 0), 0)
  const atananToplam = talepler.reduce((a, t) => a + t.atamalar.length, 0)
  const dolulukOrani = ihtiyacToplam === 0 ? 0 : Math.round((atananToplam / ihtiyacToplam) * 100)
  const devamsizlikOrani = toplamAtama === 0 ? 0 : Math.round((noshowToplam / toplamAtama) * 100)

  return {
    ciro,
    tahsilat,
    gider,
    netKar,
    toplamAtama,
    noshowToplam,
    devamsizlikOrani,
    dolulukOrani,
    enCokCalisan,
    enAzCalisan,
    enKarliFirmalar,
  }
}

// Aylık trend (son 6 ay) — ciro/gider/net kâr
export async function getAylikTrend() {
  const bugun = startOfDay()
  const ay = new Date(bugun.getFullYear(), bugun.getMonth() - 5, 1)
  const faturalar = await prisma.fatura.findMany({ where: { vadeTarihi: { gte: ay } }, include: { tahsilatlar: true } })
  const giderler = await prisma.gider.findMany({ where: { tarih: { gte: ay } } })

  const aylar: Array<{ etiket: string; ciro: number; gider: number; netKar: number }> = []
  for (let i = 5; i >= 0; i--) {
    const mBas = new Date(bugun.getFullYear(), bugun.getMonth() - i, 1)
    const mBit = new Date(bugun.getFullYear(), bugun.getMonth() - i + 1, 1)
    const fCiro = faturalar.filter((f) => f.vadeTarihi >= mBas && f.vadeTarihi < mBit).reduce((a, f) => a + Number(f.genelToplam), 0)
    const gGider = giderler.filter((g) => g.tarih >= mBas && g.tarih < mBit).reduce((a, g) => a + Number(g.tutar), 0)
    aylar.push({ etiket: mBas.toLocaleDateString('tr-TR', { month: 'short' }), ciro: fCiro, gider: gGider, netKar: fCiro - gGider })
  }
  return aylar
}