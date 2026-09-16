'use server'

import { revalidatePath } from 'next/cache'
import { prisma } from '@/lib/db'
import { requireRoles } from '@/lib/dal'
import { startOfDay, addDays } from '@/lib/dates'
import { parseLocalDate } from '@/lib/donem'
import { encrypt } from '@/lib/crypto'
import { bolgeGecerli } from '@/lib/bolge'
import {
  ucretCozumle,
  puantajTutarHesapla,
  donemAvansKesinti,
  ucretLog,
  yuvarla,
  varsayilanUcret,
  varsayilanSaatlikUcret,
  mesaiCarpan,
  ibanGecerli,
  periyotUret,
  AYAR_VARSAYILAN_UCRET,
  AYAR_SAATLIK_UCRET,
  AYAR_MESAI_CARPAN,
} from '@/lib/ik'
import type { CalismaTipi, OdemeYontemi, OdemeDonemiDurum, OdemePeriyot } from '@prisma/client'

export type IkState = { error?: string; ok?: boolean; uyari?: string } | undefined

const YAZANLAR = ['patron', 'muhasebe', 'operasyon'] as const

function parseTarih(v: string): Date | null {
  if (!v) return null
  return startOfDay(parseLocalDate(v))
}

// İK personel oluşturmada TC/IBAN boşsa üretilir (sonradan işçi formundan düzenlenebilir)
function genTC(): string {
  const d = [1, ...Array.from({ length: 8 }, () => Math.floor(Math.random() * 10))]
  const d10 = ((d[0] + d[2] + d[4] + d[6] + d[8]) * 7 - (d[1] + d[3] + d[5] + d[7])) % 10
  const d11 = (d.reduce((a, b) => a + b, 0) + Math.abs(d10)) % 10
  return `${d.join('')}${Math.abs(d10)}${d11}`
}
function genIBAN(): string {
  return 'TR00' + Array.from({ length: 22 }, () => Math.floor(Math.random() * 10)).join('')
}

// ---- IBAN doğrulama lib/ik.ts'te ----

// ---- Personel (isci) İK kartı: firma, çalışma tipi, ödeme yöntemi ----
export async function ikPersonelGuncelle(_prev: IkState, formData: FormData): Promise<IkState> {
  const user = await requireRoles([...YAZANLAR])
  const id = Number(formData.get('id'))
  const isci = await prisma.isci.findUnique({ where: { id } })
  if (!isci) return { error: 'Personel bulunamadı.' }

  const firmaId = Number(formData.get('firmaId')) || null
  const calismaTipi = (String(formData.get('calismaTipi') ?? 'GUNLUK') as CalismaTipi) || 'GUNLUK'
  const odemeYontemi = (String(formData.get('odemeYontemi') ?? 'ELDEN') as OdemeYontemi) || 'ELDEN'

  if (calismaTipi !== isci.calismaTipi) await ucretLog('personel', id, 'calismaTipi', isci.calismaTipi, calismaTipi, user.id)
  if (odemeYontemi !== isci.varsayilanOdemeYontemi) await ucretLog('personel', id, 'odemeYontemi', isci.varsayilanOdemeYontemi, odemeYontemi, user.id)

  await prisma.isci.update({
    where: { id },
    data: { firmaId, calismaTipi, varsayilanOdemeYontemi: odemeYontemi },
  })
  revalidatePath('/ik/personel')
  revalidatePath(`/ik/personel/${id}`)
  return { ok: true }
}

// ---- İK personel ekleme/düzenleme (ücret alanları form içinde) ----
export async function ikPersonelKaydet(_prev: IkState, formData: FormData): Promise<IkState> {
  const user = await requireRoles([...YAZANLAR])
  const id = Number(formData.get('id')) || null
  const ad = String(formData.get('ad') ?? '').trim()
  if (!ad) return { error: 'Ad Soyad zorunludur.' }
  const firmaId = Number(formData.get('firmaId')) || null
  const bolge = bolgeGecerli(String(formData.get('bolge') ?? '')) ?? 'kocaeli'
  const calismaTipi = (String(formData.get('calismaTipi') ?? 'GUNLUK') as CalismaTipi) || 'GUNLUK'
  const odemeYontemi = (String(formData.get('odemeYontemi') ?? 'ELDEN') as OdemeYontemi) || 'ELDEN'
  const meslekId = Number(formData.get('meslekId')) || null
  const gunlukUcret = Number(formData.get('gunlukUcret'))
  const saatlikUcret = Number(formData.get('saatlikUcret') ?? 0) || 0
  if (Number.isNaN(gunlukUcret) || gunlukUcret <= 0) return { error: 'Günlük yevmiye zorunlu (0\'dan büyük).' }
  if (Number.isNaN(saatlikUcret) || saatlikUcret < 0) return { error: 'Saatlik ücret geçersiz.' }

  // Ödeme periyodu (boş = firma varsayılanı)
  const periyotRaw = String(formData.get('odemePeriyot') ?? '')
  const odemePeriyot = (periyotRaw === 'GUN_ARALIGI' || periyotRaw === 'HAFTALIK' || periyotRaw === 'AYLIK' || periyotRaw === 'SERBEST' ? periyotRaw : '') as OdemePeriyot | ''
  const gunAraligi = Number(formData.get('gunAraligi')) || null

  const gecerlilikBaslangic = parseTarih(String(formData.get('gecerlilikBaslangic') ?? '')) ?? startOfDay()

  if (id) {
    const mevcut = await prisma.isci.findUnique({ where: { id } })
    if (!mevcut) return { error: 'Personel bulunamadı.' }
    await prisma.isci.update({
      where: { id },
      data: {
        ad,
        firmaId,
        bolge,
        calismaTipi,
        varsayilanOdemeYontemi: odemeYontemi,
        odemePeriyot: odemePeriyot || null,
        gunAraligi: odemePeriyot === 'GUN_ARALIGI' ? gunAraligi : null,
      },
    })

    // Ücret değiştiyse eski kaydı kapat, yeni aç (tarihsel korunur, geçmiş puantaj/hakediş etkilenmez)
    const aktif = await prisma.personelUcret.findFirst({
      where: { isciId: id, gecerlilikBitis: null },
      orderBy: { gecerlilikBaslangic: 'desc' },
    })
    const ayni = aktif && Number(aktif.gunlukUcret) === yuvarla(gunlukUcret) && Number(aktif.saatlikUcret) === yuvarla(saatlikUcret)
    if (!ayni) {
      if (aktif) {
        await prisma.personelUcret.update({ where: { id: aktif.id }, data: { gecerlilikBitis: addDays(gecerlilikBaslangic, -1) } })
      }
      await prisma.personelUcret.create({
        data: { isciId: id, gunlukUcret: yuvarla(gunlukUcret), saatlikUcret: yuvarla(saatlikUcret), gecerlilikBaslangic, olusturanKullaniciId: user.id },
      })
      await ucretLog('personel', id, 'gunlukUcret', aktif ? String(aktif.gunlukUcret) : null, String(gunlukUcret), user.id)
    }
    revalidatePath('/ik/personel')
    revalidatePath(`/ik/personel/${id}`)
    return { ok: true }
  }

  // ---- Yeni personel ----
  const tc = String(formData.get('tc') ?? '').replace(/\s/g, '')
  const iban = String(formData.get('iban') ?? '').replace(/\s/g, '')
  const iseBaslama = parseTarih(String(formData.get('iseBaslama') ?? ''))
  const ilce = bolge === 'balikesir' ? 'Karesi' : 'İzmit'
  const yeni = await prisma.isci.create({
    data: {
      ad,
      telefon: String(formData.get('telefon') ?? '').trim(),
      tcKimlik: encrypt(tc || genTC()),
      iban: encrypt(iban || genIBAN()),
      ilce,
      dogumTarihi: iseBaslama ?? new Date(),
      puan: 50,
      gunlukUcretBeklentisi: yuvarla(gunlukUcret),
      durum: 'aktif',
      bolge,
      firmaId,
      calismaTipi,
      varsayilanOdemeYontemi: odemeYontemi,
      odemePeriyot: odemePeriyot || null,
      gunAraligi: odemePeriyot === 'GUN_ARALIGI' ? gunAraligi : null,
      tercihBolgeler: [],
      not: 'İK modülünden eklendi',
      meslekler: meslekId ? { create: [{ meslekId }] } : undefined,
    },
  })
  await prisma.personelUcret.create({
    data: {
      isciId: yeni.id,
      gunlukUcret: yuvarla(gunlukUcret),
      saatlikUcret: yuvarla(saatlikUcret),
      gecerlilikBaslangic: iseBaslama ?? startOfDay(),
      olusturanKullaniciId: user.id,
    },
  })
  await ucretLog('personel', yeni.id, 'gunlukUcret', null, String(gunlukUcret), user.id)
  revalidatePath('/ik/personel')
  return { ok: true }
}

// ---- Personel ücreti: yeni kayıt açılır, eski kapatılır (tarihsel korunur) ----
export async function personelUcretEkle(_prev: IkState, formData: FormData): Promise<IkState> {
  const user = await requireRoles([...YAZANLAR])
  const isciId = Number(formData.get('isciId'))
  const gunluk = Number(formData.get('gunlukUcret'))
  const saatlik = Number(formData.get('saatlikUcret'))
  const baslangic = parseTarih(String(formData.get('gecerlilikBaslangic') ?? ''))
  if (!isciId || !baslangic || Number.isNaN(gunluk) || gunluk < 0) return { error: 'Personel, başlangıç ve günlük ücret zorunludur.' }

  const onceki = await prisma.personelUcret.findFirst({
    where: { isciId, gecerlilikBitis: null },
    orderBy: { gecerlilikBaslangic: 'desc' },
  })
  if (onceki) {
    await prisma.personelUcret.update({
      where: { id: onceki.id },
      data: { gecerlilikBitis: addDays(baslangic, -1) },
    })
  }
  await prisma.personelUcret.create({
    data: { isciId, gunlukUcret: yuvarla(gunluk), saatlikUcret: yuvarla(saatlik), gecerlilikBaslangic: baslangic, olusturanKullaniciId: user.id },
  })
  await ucretLog('personel', isciId, 'gunlukUcret', onceki ? String(onceki.gunlukUcret) : null, String(gunluk), user.id)
  revalidatePath('/ik/personel')
  revalidatePath(`/ik/personel/${isciId}`)
  return { ok: true }
}

// ---- Firma ücreti: inline kaydet (yeni başlangıçla eski kapanır) ----
export async function firmaUcretKaydet(_prev: IkState, formData: FormData): Promise<IkState> {
  const user = await requireRoles([...YAZANLAR])
  const firmaId = Number(formData.get('firmaId'))
  const gunluk = Number(formData.get('gunlukUcret'))
  const saatlik = Number(formData.get('saatlikUcret'))
  const baslangic = parseTarih(String(formData.get('gecerlilikBaslangic') ?? ''))
  if (!firmaId || !baslangic || Number.isNaN(gunluk) || gunluk < 0) return { error: 'Firma, başlangıç ve günlük ücret zorunludur.' }

  const onceki = await prisma.firmaUcret.findFirst({
    where: { firmaId, gecerlilikBitis: null },
    orderBy: { gecerlilikBaslangic: 'desc' },
  })
  if (onceki) {
    await prisma.firmaUcret.update({ where: { id: onceki.id }, data: { gecerlilikBitis: addDays(baslangic, -1) } })
  }
  await prisma.firmaUcret.create({
    data: { firmaId, gunlukUcret: yuvarla(gunluk), saatlikUcret: yuvarla(saatlik), gecerlilikBaslangic: baslangic },
  })
  await ucretLog('firma', firmaId, 'gunlukUcret', onceki ? String(onceki.gunlukUcret) : null, String(gunluk), user.id)
  revalidatePath('/ik/ucret-ayarlari')
  return { ok: true }
}

// ---- Firma ücreti toplu uygula (seçili firmalara günlük X TL) ----
export async function firmaUcretToplu(_prev: IkState, formData: FormData): Promise<IkState> {
  const user = await requireRoles([...YAZANLAR])
  const firmaIds = formData.getAll('firmaIds').map(Number).filter(Boolean)
  const gunluk = Number(formData.get('gunlukUcret'))
  const saatlik = Number(formData.get('saatlikUcret') ?? 0) || 0
  const baslangic = parseTarih(String(formData.get('gecerlilikBaslangic') ?? ''))
  if (firmaIds.length === 0 || !baslangic || Number.isNaN(gunluk) || gunluk < 0) return { error: 'Firma seçin, başlangıç ve günlük ücret girin.' }

  for (const firmaId of firmaIds) {
    const onceki = await prisma.firmaUcret.findFirst({
      where: { firmaId, gecerlilikBitis: null },
      orderBy: { gecerlilikBaslangic: 'desc' },
    })
    if (onceki) await prisma.firmaUcret.update({ where: { id: onceki.id }, data: { gecerlilikBitis: addDays(baslangic, -1) } })
    await prisma.firmaUcret.create({ data: { firmaId, gunlukUcret: yuvarla(gunluk), saatlikUcret: yuvarla(saatlik), gecerlilikBaslangic: baslangic } })
    await ucretLog('firma', firmaId, 'gunlukUcret', onceki ? String(onceki.gunlukUcret) : null, String(gunluk), user.id)
  }
  revalidatePath('/ik/ucret-ayarlari')
  return { ok: true }
}

// ---- Sistem varsayılanı + mesai çarpanı ----
export async function sistemAyarlariGuncelle(_prev: IkState, formData: FormData): Promise<IkState> {
  const user = await requireRoles(['patron'])
  const varsayilan = Number(formData.get('varsayilanUcret'))
  const saatlik = Number(formData.get('saatlikUcret') ?? 0) || 0
  const carpan = Number(formData.get('mesaiCarpan'))
  if (Number.isNaN(varsayilan) || varsayilan < 0 || Number.isNaN(saatlik) || saatlik < 0 || Number.isNaN(carpan) || carpan < 1) return { error: 'Geçersiz değer.' }

  const eski = await varsayilanUcret()
  const eskiSaatlik = await varsayilanSaatlikUcret()
  const eskiCarpan = await mesaiCarpan()
  await prisma.$transaction([
    prisma.ayar.upsert({ where: { anahtar: AYAR_VARSAYILAN_UCRET }, update: { deger: String(varsayilan) }, create: { anahtar: AYAR_VARSAYILAN_UCRET, deger: String(varsayilan), aciklama: 'Sistem varsayılan günlük ücret' } }),
    prisma.ayar.upsert({ where: { anahtar: AYAR_SAATLIK_UCRET }, update: { deger: String(saatlik) }, create: { anahtar: AYAR_SAATLIK_UCRET, deger: String(saatlik), aciklama: 'Sistem varsayılan saatlik ücret' } }),
    prisma.ayar.upsert({ where: { anahtar: AYAR_MESAI_CARPAN }, update: { deger: String(carpan) }, create: { anahtar: AYAR_MESAI_CARPAN, deger: String(carpan), aciklama: 'Fazla mesai çarpanı' } }),
  ])
  if (eski !== varsayilan) await ucretLog('sistem', null, 'varsayilanUcret', String(eski), String(varsayilan), user.id)
  if (eskiSaatlik !== saatlik) await ucretLog('sistem', null, 'saatlikUcret', String(eskiSaatlik), String(saatlik), user.id)
  if (eskiCarpan !== carpan) await ucretLog('sistem', null, 'mesaiCarpan', String(eskiCarpan), String(carpan), user.id)
  revalidatePath('/ik/ucret-ayarlari')
  return { ok: true }
}

// ---- Puantaj girişi (üzerine yaz destekli) ----
export async function puantajGir(formData: FormData) {
  const user = await requireRoles([...YAZANLAR])
  void user
  const isciId = Number(formData.get('isciId'))
  const firmaId = Number(formData.get('firmaId'))
  const tarih = parseTarih(String(formData.get('tarih') ?? ''))
  const fsi = Number(formData.get('fsi') ?? 1)
  const calismaTipi = (String(formData.get('calismaTipi') ?? 'GUNLUK') as CalismaTipi) || 'GUNLUK'
  const calisilanSaat = Number(formData.get('calisilanSaat') ?? 0) || 0
  const mesaiSaat = Number(formData.get('mesaiSaat') ?? 0) || 0
  const uzerineYaz = formData.get('uzerineYaz') === '1'
  const aciklama = String(formData.get('aciklama') ?? '').trim() || null

  if (!isciId || !firmaId || !tarih) return

  const mevcut = await prisma.puantajKayit.findUnique({ where: { isciId_tarih: { isciId, tarih } } })
  if (mevcut && !uzerineYaz) return

  // Ücret: elle girilen değerler (override) yoksa otomatik çöz
  const overrideGunluk = formData.get('gunlukUcret') ? Number(formData.get('gunlukUcret')) : null
  const overrideSaatlik = formData.get('saatlikUcret') ? Number(formData.get('saatlikUcret')) : null
  const cozum = await ucretCozumle(isciId, firmaId, tarih)
  const gunlukUcret = overrideGunluk !== null && !Number.isNaN(overrideGunluk) ? overrideGunluk : cozum.gunlukUcret
  const saatlikUcret = overrideSaatlik !== null && !Number.isNaN(overrideSaatlik) ? overrideSaatlik : cozum.saatlikUcret
  const ucretManuelMi = (overrideGunluk !== null && overrideGunluk !== cozum.gunlukUcret) || (overrideSaatlik !== null && overrideSaatlik !== cozum.saatlikUcret)

  const { tutar } = await puantajTutarHesapla({ fsi, calismaTipi, calisilanSaat, mesaiSaat, gunlukUcret, saatlikUcret })

  const data = {
    firmaId,
    fsi,
    calismaTipi,
    calisilanSaat,
    mesaiSaat,
    uygulananGunlukUcret: yuvarla(gunlukUcret),
    uygulananSaatlikUcret: yuvarla(saatlikUcret),
    hesaplananTutar: tutar,
    ucretManuelMi,
    aciklama,
  }

  if (mevcut) {
    await prisma.puantajKayit.update({ where: { id: mevcut.id }, data })
  } else {
    await prisma.puantajKayit.create({ data: { isciId, tarih, ...data } })
  }

  revalidatePath('/ik/puantaj')
  revalidatePath(`/ik/personel/${isciId}`)
  return
}

export async function puantajSil(formData: FormData) {
  await requireRoles([...YAZANLAR])
  const id = Number(formData.get('id'))
  await prisma.puantajKayit.delete({ where: { id } })
  revalidatePath('/ik/puantaj')
  return
}

// Toplu puantaj: seçili personellere aynı gün/aynı fsi uygula (üzerine yazar)
export async function puantajToplu(formData: FormData) {
  await requireRoles([...YAZANLAR])
  const firmaId = Number(formData.get('firmaId'))
  const tarih = parseTarih(String(formData.get('tarih') ?? ''))
  const fsi = Number(formData.get('fsi') ?? 1)
  const isciIds = formData.getAll('isciIds').map(Number).filter(Boolean)
  if (!firmaId || !tarih || isciIds.length === 0) return

  for (const isciId of isciIds) {
    const cozum = await ucretCozumle(isciId, firmaId, tarih)
    const { tutar } = await puantajTutarHesapla({
      fsi,
      calismaTipi: cozum.calismaTipi,
      calisilanSaat: cozum.calismaTipi === 'SAATLIK' ? 8 * fsi : 0,
      mesaiSaat: 0,
      gunlukUcret: cozum.gunlukUcret,
      saatlikUcret: cozum.saatlikUcret,
    })
    await prisma.puantajKayit.upsert({
      where: { isciId_tarih: { isciId, tarih } },
      update: {
        firmaId,
        fsi,
        calismaTipi: cozum.calismaTipi,
        calisilanSaat: cozum.calismaTipi === 'SAATLIK' ? 8 * fsi : 0,
        uygulananGunlukUcret: yuvarla(cozum.gunlukUcret),
        uygulananSaatlikUcret: yuvarla(cozum.saatlikUcret),
        hesaplananTutar: tutar,
        ucretManuelMi: false,
      },
      create: {
        isciId,
        firmaId,
        tarih,
        fsi,
        calismaTipi: cozum.calismaTipi,
        calisilanSaat: cozum.calismaTipi === 'SAATLIK' ? 8 * fsi : 0,
        uygulananGunlukUcret: yuvarla(cozum.gunlukUcret),
        uygulananSaatlikUcret: yuvarla(cozum.saatlikUcret),
        hesaplananTutar: tutar,
      },
    })
  }
  revalidatePath('/ik/puantaj')
  return
}

// ---- Kesinti ----
export async function kesintiEkle(formData: FormData) {
  await requireRoles([...YAZANLAR])
  const isciId = Number(formData.get('isciId'))
  const tutar = Number(formData.get('tutar'))
  const tur = String(formData.get('tur') ?? 'diger')
  if (!isciId || Number.isNaN(tutar) || tutar <= 0) return
  await prisma.kesinti.create({
    data: {
      isciId,
      tutar: yuvarla(tutar),
      tur: tur as never,
      tarih: parseTarih(String(formData.get('tarih') ?? '')) ?? new Date(),
      aciklama: String(formData.get('aciklama') ?? '').trim() || null,
    },
  })
  revalidatePath(`/ik/personel/${isciId}`)
  revalidatePath('/ik/hakedis')
  return
}

export async function kesintiSil(formData: FormData) {
  await requireRoles([...YAZANLAR])
  const id = Number(formData.get('id'))
  await prisma.kesinti.delete({ where: { id } })
  revalidatePath('/ik/hakedis')
  return
}

// ---- Dönem hakediş hesapla (brut → avans → kesinti → net) ----
export async function donemHesapla(formData: FormData) {
  await requireRoles([...YAZANLAR])
  const isciId = Number(formData.get('isciId'))
  const firmaId = Number(formData.get('firmaId'))
  const bas = parseTarih(String(formData.get('baslangic') ?? ''))
  const bit = addDays(parseLocalDate(String(formData.get('bitis') ?? '')), 1)
  if (!isciId || !firmaId || !bas) return

  const puantajlar = await prisma.puantajKayit.findMany({
    where: { isciId, firmaId, tarih: { gte: bas, lt: bit } },
  })
  const brut = yuvarla(puantajlar.reduce((a, p) => a + Number(p.hesaplananTutar), 0))
  const { avans, kesinti } = await donemAvansKesinti(isciId, bas, bit)
  const net = yuvarla(brut - avans - kesinti)

  await prisma.odemeDonemi.upsert({
    where: { isciId_firmaId_baslangic_bitis: { isciId, firmaId, baslangic: bas, bitis: bit } },
    update: { brutHakedis: brut, toplamAvans: avans, toplamKesinti: kesinti, netOdenecek: net },
    create: { isciId, firmaId, baslangic: bas, bitis: bit, brutHakedis: brut, toplamAvans: avans, toplamKesinti: kesinti, netOdenecek: net },
  })
  revalidatePath('/ik/hakedis')
  return
}

// ---- Ödeme kaydet (ELDEN / IBAN) + dönem durum güncelle ----
export async function odemeKaydet(_prev: IkState, formData: FormData): Promise<IkState> {
  const user = await requireRoles([...YAZANLAR])
  const donemId = Number(formData.get('donemId'))
  const tutar = Number(formData.get('tutar'))
  const yontem = (String(formData.get('yontem') ?? 'ELDEN') as OdemeYontemi) || 'ELDEN'
  const tarih = parseTarih(String(formData.get('tarih') ?? '')) ?? new Date()
  if (!donemId || Number.isNaN(tutar) || tutar <= 0) return { error: 'Dönem ve tutar zorunludur.' }

  const donem = await prisma.odemeDonemi.findUnique({ where: { id: donemId } })
  if (!donem) return { error: 'Dönem bulunamadı.' }
  if (donem.kilitli) return { error: 'Bu dönem kilitli (ödendi). Kilidi açmadan değişiklik yapılamaz.' }

  let ibanSnapshot: string | null = null
  let hesapSahibi: string | null = null
  if (yontem === 'IBAN') {
    ibanSnapshot = String(formData.get('iban') ?? '').replace(/\s+/g, '').toUpperCase()
    if (!ibanGecerli(ibanSnapshot)) return { error: 'IBAN geçersiz (TR + 24 hane + checksum).' }
    hesapSahibi = String(formData.get('hesapSahibi') ?? '').trim() || null
  }

  await prisma.odemeKayit.create({
    data: {
      donemId,
      tarih,
      tutar: yuvarla(tutar),
      yontem,
      ibanSnapshot,
      hesapSahibi,
      yakininaOdeme: formData.get('yakininaOdeme') === '1',
      yakinlikNotu: String(formData.get('yakinlikNotu') ?? '').trim() || null,
      zarfNo: String(formData.get('zarfNo') ?? '').trim() || null,
      teslimAlan: String(formData.get('teslimAlan') ?? '').trim() || null,
      teslimEdenKullaniciId: user.id,
      not: String(formData.get('not') ?? '').trim() || null,
    },
  })

  const odenen = await prisma.odemeKayit.aggregate({ where: { donemId }, _sum: { tutar: true } })
  const toplamOdenen = yuvarla(Number(odenen._sum.tutar ?? 0))
  const durum: OdemeDonemiDurum = toplamOdenen >= Number(donem.netOdenecek) ? 'ODENDI' : toplamOdenen > 0 ? 'KISMI_ODENDI' : 'BEKLIYOR'
  await prisma.odemeDonemi.update({
    where: { id: donemId },
    data: { durum, kilitli: durum === 'ODENDI' },
  })
  revalidatePath('/ik/hakedis')
  revalidatePath(`/ik/personel/${donem.isciId}`)
  return { ok: true }
}

// ---- Kilidi aç (patron, audit log) ----
export async function donemKilidiAc(formData: FormData) {
  const user = await requireRoles(['patron'])
  const id = Number(formData.get('id'))
  const donem = await prisma.odemeDonemi.findUnique({ where: { id } })
  if (!donem) return
  await prisma.odemeDonemi.update({ where: { id }, data: { kilitli: false, durum: 'KISMI_ODENDI' as OdemeDonemiDurum } })
  await ucretLog('odemeDonemi', id, 'kilit', 'kilitli', 'acik', user.id)
  revalidatePath('/ik/hakedis')
  return
}

export async function odemeSil(formData: FormData) {
  const user = await requireRoles(['patron'])
  const id = Number(formData.get('id'))
  const odeme = await prisma.odemeKayit.findUnique({ where: { id } })
  if (!odeme) return
  await prisma.odemeKayit.delete({ where: { id } })
  const donem = await prisma.odemeDonemi.findUnique({ where: { id: odeme.donemId } })
  if (donem) {
    const odenen = await prisma.odemeKayit.aggregate({ where: { donemId: donem.id }, _sum: { tutar: true } })
    const toplamOdenen = yuvarla(Number(odenen._sum.tutar ?? 0))
    const durum: OdemeDonemiDurum = toplamOdenen >= Number(donem.netOdenecek) ? 'ODENDI' : toplamOdenen > 0 ? 'KISMI_ODENDI' : 'BEKLIYOR'
    await prisma.odemeDonemi.update({ where: { id: donem.id }, data: { durum, kilitli: durum === 'ODENDI' } })
  }
  await ucretLog('odeme', id, 'sil', null, String(odeme.tutar), user.id)
  revalidatePath('/ik/hakedis')
  return
}
// ---- Ödeme periyodu: firma varsayılanı ----
export async function setFirmaPeriyot(formData: FormData) {
  await requireRoles([...YAZANLAR])
  const firmaId = Number(formData.get('firmaId'))
  const periyot = String(formData.get('odemePeriyot') ?? 'AYLIK') as OdemePeriyot
  const gunAraligi = Number(formData.get('gunAraligi')) || 30
  if (!firmaId) return
  await prisma.musteriFirma.update({
    where: { id: firmaId },
    data: { odemePeriyot: periyot, gunAraligi: periyot === 'GUN_ARALIGI' ? gunAraligi : 30 },
  })
  revalidatePath('/musteri-firmalar')
  revalidatePath('/vergi-odemeler')
  return
}

// ---- Ödeme periyodu: personel bazında ezme (boş = firma varsayılanı) ----
export async function setPersonelPeriyot(formData: FormData) {
  await requireRoles([...YAZANLAR])
  const isciId = Number(formData.get('isciId'))
  const periyotRaw = String(formData.get('odemePeriyot') ?? '')
  const odemePeriyot = (periyotRaw === 'GUN_ARALIGI' || periyotRaw === 'HAFTALIK' || periyotRaw === 'AYLIK' || periyotRaw === 'SERBEST' ? periyotRaw : '') as OdemePeriyot | ''
  const gunAraligi = Number(formData.get('gunAraligi')) || null
  if (!isciId) return
  await prisma.isci.update({
    where: { id: isciId },
    data: { odemePeriyot: odemePeriyot || null, gunAraligi: odemePeriyot === 'GUN_ARALIGI' ? gunAraligi : null },
  })
  revalidatePath('/musteri-firmalar')
  revalidatePath('/ik/personel')
  revalidatePath(`/ik/personel/${isciId}`)
  return
}

// ---- Periyoda göre ödeme dönemlerini otomatik üret (firmadaki aktif personel için) ----
export async function donemUret(formData: FormData) {
  await requireRoles([...YAZANLAR])
  const firmaId = Number(formData.get('firmaId'))
  const baslangic = parseTarih(String(formData.get('baslangic') ?? '')) ?? startOfDay()
  const adet = Math.min(Number(formData.get('adet')) || 1, 24)
  if (!firmaId) return

  const [firma, personeller] = await Promise.all([
    prisma.musteriFirma.findUnique({ where: { id: firmaId } }),
    prisma.isci.findMany({ where: { firmaId, durum: 'aktif' } }),
  ])
  if (!firma) return

  for (const p of personeller) {
    const periyot: OdemePeriyot = p.odemePeriyot ?? firma.odemePeriyot
    const gunAraligi = p.gunAraligi ?? firma.gunAraligi ?? 30
    const araliklar = periyotUret(periyot, gunAraligi, baslangic, adet)
    for (const a of araliklar) {
      const varMi = await prisma.odemeDonemi.findUnique({
        where: { isciId_firmaId_baslangic_bitis: { isciId: p.id, firmaId, baslangic: a.baslangic, bitis: a.bitis } },
      })
      if (varMi) continue
      await prisma.odemeDonemi.create({
        data: { isciId: p.id, firmaId, baslangic: a.baslangic, bitis: a.bitis, brutHakedis: 0, toplamAvans: 0, toplamKesinti: 0, netOdenecek: 0, durum: 'BEKLIYOR' },
      })
    }
  }
  revalidatePath('/musteri-firmalar')
  revalidatePath('/ik/hakedis')
  return
}

// ---- Dönem tarihlerini elle düzenle (kilitli değilse) ----
export async function donemDuzenle(formData: FormData) {
  await requireRoles([...YAZANLAR])
  const id = Number(formData.get('id'))
  const bas = parseTarih(String(formData.get('baslangic') ?? ''))
  const bit = parseTarih(String(formData.get('bitis') ?? ''))
  if (!id || !bas || !bit) return
  const donem = await prisma.odemeDonemi.findUnique({ where: { id } })
  if (!donem || donem.kilitli) return
  await prisma.odemeDonemi.update({
    where: { id },
    data: { baslangic: bas, bitis: bit, brutHakedis: 0, toplamAvans: 0, toplamKesinti: 0, netOdenecek: 0, durum: 'BEKLIYOR' },
  })
  revalidatePath('/musteri-firmalar')
  revalidatePath('/ik/hakedis')
  return
}
