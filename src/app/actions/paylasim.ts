'use server'

import { revalidatePath } from 'next/cache'
import { prisma } from '@/lib/db'
import { requireRoles } from '@/lib/dal'
import {
  maliyetHesapla,
  kurusToDecimal,
  type MaliyetGirdi,
  type MaliyetOranlar,
} from '@/lib/maliyet'
import { maliyetOranlariOku, paylasimLinkGunOku } from '@/lib/maliyet-ayar'
import { encrypt } from '@/lib/crypto'
import {
  tokenUret,
  tokenHash,
  sifreHashle,
  sifreRastgele,
  paylasimBaseUrlIstek,
} from '@/lib/paylasim'
import { sifreGecerliMi, type MaliyetSnapshot, type MaliyetGorunumTip } from '@/lib/paylasim-tipleri'
import { dosyaKaydet, pdfGecerliMi, pptxGecerliMi } from '@/lib/paylasim-dosya'
import { del } from '@vercel/blob'
import type { KarModu, PaylasimTur, MaliyetGorunum } from '@prisma/client'

export type PaylasimState =
  | { error?: string; ok?: boolean; link?: string; token?: string; sifre?: string }
  | undefined

const ADMIN_YOLLAR = ['/paylasim/sunumlar', '/paylasim/maliyet', '/paylasim/linkler']

function yenile() {
  for (const y of ADMIN_YOLLAR) revalidatePath(y)
}

function blobSil(url: string | null | undefined) {
  if (!url || !url.startsWith('https://')) return
  del(url).catch(() => {})
}

// ============================================================
// SUNUM
// ============================================================

export async function sunumEkle(_prev: PaylasimState, formData: FormData): Promise<PaylasimState> {
  const user = await requireRoles(['patron'])
  const baslik = String(formData.get('baslik') ?? '').trim()
  const aciklama = String(formData.get('aciklama') ?? '').trim() || null
  const versiyonNotu = String(formData.get('versiyonNotu') ?? '').trim() || null
  const pdf = formData.get('pdf')
  const pptx = formData.get('pptx')

  if (!baslik) return { error: 'Başlık zorunludur.' }
  if (!pdf || typeof pdf === 'string') return { error: 'PDF dosyası zorunludur.' }
  const pdfHata = pdfGecerliMi(pdf)
  if (pdfHata) return { error: pdfHata }

  let pptxMeta: { url: string; ad: string; boyut: number } | null = null
  if (pptx && typeof pptx !== 'string' && pptx.size > 0) {
    const h = pptxGecerliMi(pptx)
    if (h) return { error: h }
    pptxMeta = await dosyaKaydet(pptx, 'sunum')
  }

  const pdfMeta = await dosyaKaydet(pdf, 'sunum')

  try {
    await prisma.sunum.create({
      data: {
        baslik,
        aciklama,
        olusturanKullaniciId: user.id,
        versiyonlar: {
          create: {
            versiyonNo: 1,
            versiyonNotu,
            pdfUrl: pdfMeta.url,
            pdfAdi: pdfMeta.ad,
            pdfBoyut: pdfMeta.boyut,
            pptxUrl: pptxMeta?.url ?? null,
            pptxAdi: pptxMeta?.ad ?? null,
            pptxBoyut: pptxMeta?.boyut ?? null,
          },
        },
      },
    })
  } catch (e) {
    blobSil(pdfMeta.url)
    blobSil(pptxMeta?.url)
    throw e
  }

  yenile()
  return { ok: true }
}

export async function sunumVersiyonEkle(_prev: PaylasimState, formData: FormData): Promise<PaylasimState> {
  await requireRoles(['patron'])
  const sunumId = Number(formData.get('sunumId'))
  const versiyonNotu = String(formData.get('versiyonNotu') ?? '').trim() || null
  const pdf = formData.get('pdf')
  const pptx = formData.get('pptx')

  if (!sunumId) return { error: 'Sunum bulunamadı.' }
  const sunum = await prisma.sunum.findUnique({ where: { id: sunumId } })
  if (!sunum) return { error: 'Sunum bulunamadı.' }
  if (!pdf || typeof pdf === 'string') return { error: 'PDF dosyası zorunludur.' }
  const pdfHata = pdfGecerliMi(pdf)
  if (pdfHata) return { error: pdfHata }

  let pptxMeta: { url: string; ad: string; boyut: number } | null = null
  if (pptx && typeof pptx !== 'string' && pptx.size > 0) {
    const h = pptxGecerliMi(pptx)
    if (h) return { error: h }
    pptxMeta = await dosyaKaydet(pptx, 'sunum')
  }
  const pdfMeta = await dosyaKaydet(pdf, 'sunum')

  const son = await prisma.sunumVersiyon.aggregate({
    where: { sunumId },
    _max: { versiyonNo: true },
  })
  const versiyonNo = (son._max.versiyonNo ?? 0) + 1

  try {
    await prisma.$transaction([
      prisma.sunumVersiyon.updateMany({ where: { sunumId }, data: { aktif: false } }),
      prisma.sunumVersiyon.create({
        data: {
          sunumId,
          versiyonNo,
          versiyonNotu,
          pdfUrl: pdfMeta.url,
          pdfAdi: pdfMeta.ad,
          pdfBoyut: pdfMeta.boyut,
          pptxUrl: pptxMeta?.url ?? null,
          pptxAdi: pptxMeta?.ad ?? null,
          pptxBoyut: pptxMeta?.boyut ?? null,
        },
      }),
    ])
  } catch (e) {
    blobSil(pdfMeta.url)
    blobSil(pptxMeta?.url)
    throw e
  }

  yenile()
  return { ok: true }
}

export async function sunumSil(formData: FormData) {
  await requireRoles(['patron'])
  const id = Number(formData.get('id'))
  if (!id) return
  const versiyonlar = await prisma.sunumVersiyon.findMany({ where: { sunumId: id } })
  // Bu sunuma bağlı aktif linkleri iptal et (kırık link bırakma)
  await prisma.paylasimLink.updateMany({
    where: { sunumVersiyonId: { in: versiyonlar.map((v) => v.id) }, durum: 'AKTIF' },
    data: { durum: 'IPTAL', iptalTarihi: new Date() },
  })
  await prisma.sunum.delete({ where: { id } })
  for (const v of versiyonlar) {
    blobSil(v.pdfUrl)
    blobSil(v.pptxUrl)
  }
  yenile()
}

// ============================================================
// MALİYET TABLOSU
// ============================================================

type PozlamaGirdi = MaliyetGirdi & { ad: string }

function girdiCoz(p: Record<string, unknown>): PozlamaGirdi {
  return {
    ad: String(p.ad ?? '').trim() || 'Pozisyon',
    brutUcret: (p.brutUcret as string | number) ?? 0,
    gvMatrahIstisnasi: (p.gvMatrahIstisnasi as string | number) ?? 0,
    dvIstisnasi: (p.dvIstisnasi as string | number) ?? 0,
    kidem: (p.kidem as string | number) ?? 0,
    ihbar: (p.ihbar as string | number) ?? 0,
    yillikIzin: (p.yillikIzin as string | number) ?? 0,
    yemek: (p.yemek as string | number) ?? 0,
    yol: (p.yol as string | number) ?? 0,
    saglikOsgb: (p.saglikOsgb as string | number) ?? 0,
    kiyafet: (p.kiyafet as string | number) ?? 0,
    maliMesuliyet: (p.maliMesuliyet as string | number) ?? 0,
    karModu: (p.karModu === 'HEDEF' ? 'HEDEF' : 'YUZDE') as KarModu,
    karOran: (p.karOran as string | number) ?? 0,
    hedefTeklif: (p.hedefTeklif as string | number) ?? 0,
  }
}

function pozisyonData(girdi: PozlamaGirdi, oranlar: MaliyetOranlar, sira: number) {
  const h = maliyetHesapla(girdi, oranlar)
  return {
    ad: girdi.ad,
    sira,
    brutUcret: girdi.brutUcret as string,
    gvMatrahIstisnasi: girdi.gvMatrahIstisnasi as string,
    dvIstisnasi: girdi.dvIstisnasi as string,
    kidem: girdi.kidem as string,
    ihbar: girdi.ihbar as string,
    yillikIzin: girdi.yillikIzin as string,
    yemek: girdi.yemek as string,
    yol: girdi.yol as string,
    saglikOsgb: girdi.saglikOsgb as string,
    kiyafet: girdi.kiyafet as string,
    maliMesuliyet: girdi.maliMesuliyet as string,
    karModu: girdi.karModu,
    karOran: h.karOran,
    hedefTeklif: girdi.karModu === 'HEDEF' ? (girdi.hedefTeklif as string) : null,
    sgkIsci: kurusToDecimal(h.sgkIsci),
    issizlikIsci: kurusToDecimal(h.issizlikIsci),
    gvMatrahi: kurusToDecimal(h.gvMatrahi),
    gvMatrahiIndirimli: kurusToDecimal(h.gvMatrahiIndirimli),
    gelirVergisi: kurusToDecimal(h.gelirVergisi),
    dvMatrahi: kurusToDecimal(h.dvMatrahi),
    dvMatrahiIndirimli: kurusToDecimal(h.dvMatrahiIndirimli),
    damgaVergisi: kurusToDecimal(h.damgaVergisi),
    kesintilerToplami: kurusToDecimal(h.kesintilerToplami),
    netUcret: kurusToDecimal(h.netUcret),
    sgkIsveren: kurusToDecimal(h.sgkIsveren),
    issizlikIsveren: kurusToDecimal(h.issizlikIsveren),
    yasalMaliyet: kurusToDecimal(h.yasalMaliyet),
    toplamYasalMaliyet: kurusToDecimal(h.toplamYasalMaliyet),
    personelMaliyeti: kurusToDecimal(h.personelMaliyeti),
    karPayi: kurusToDecimal(h.karPayi),
    teklifBedeli: kurusToDecimal(h.teklifBedeli),
  }
}

function pozisyonlariCoz(ham: string): PozlamaGirdi[] {
  let arr: unknown
  try {
    arr = JSON.parse(ham)
  } catch {
    return []
  }
  if (!Array.isArray(arr)) return []
  return arr.map((p) => girdiCoz(p as Record<string, unknown>))
}

export async function maliyetTablosuKaydet(_prev: PaylasimState, formData: FormData): Promise<PaylasimState> {
  await requireRoles(['patron', 'operasyon'])
  const id = Number(formData.get('id')) || null
  const firmaId = Number(formData.get('firmaId')) || null
  const ad = String(formData.get('ad') ?? '').trim() || null
  const tarihStr = String(formData.get('tarih') ?? '').trim()
  const gecerlilikStr = String(formData.get('gecerlilikTarihi') ?? '').trim()

  const pozisyonlar = pozisyonlariCoz(String(formData.get('pozisyonlar') ?? '[]'))
  if (pozisyonlar.length === 0) return { error: 'En az bir pozisyon girin.' }
  const adlar = new Set(pozisyonlar.map((p) => p.ad))
  if (adlar.size !== pozisyonlar.length) return { error: 'Pozisyon adları benzersiz olmalı.' }

  const tarih = tarihStr ? new Date(tarihStr) : new Date()
  const gecerlilikTarihi = gecerlilikStr ? new Date(gecerlilikStr) : null

  // Var olan tablo: oranlar korunur. Yeni tablo: güncel ayarlar snapshot'lanır.
  let oranlar: MaliyetOranlar
  if (id) {
    const mevcut = await prisma.maliyetTablosu.findUnique({ where: { id } })
    if (!mevcut) return { error: 'Tablo bulunamadı.' }
    oranlar = {
      sgkIsci: mevcut.sgkIsci.toString(),
      issizlikIsci: mevcut.issizlikIsci.toString(),
      sgkIsveren: mevcut.sgkIsveren.toString(),
      issizlikIsveren: mevcut.issizlikIsveren.toString(),
      gelirVergisi: mevcut.gelirVergisi.toString(),
      damgaVergisi: mevcut.damgaVergisi.toString(),
    }
  } else {
    oranlar = await maliyetOranlariOku()
  }

  const oranData = {
    sgkIsci: String(oranlar.sgkIsci),
    issizlikIsci: String(oranlar.issizlikIsci),
    sgkIsveren: String(oranlar.sgkIsveren),
    issizlikIsveren: String(oranlar.issizlikIsveren),
    gelirVergisi: String(oranlar.gelirVergisi),
    damgaVergisi: String(oranlar.damgaVergisi),
  }

  const pozData = pozisyonlar.map((p, i) => pozisyonData(p, oranlar, i))

  if (id) {
    await prisma.$transaction([
      prisma.maliyetPozisyon.deleteMany({ where: { tabloId: id } }),
      prisma.maliyetTablosu.update({
        where: { id },
        data: {
          ad,
          firmaId,
          tarih,
          gecerlilikTarihi,
          ...oranData,
          pozisyonlar: { create: pozData },
        },
      }),
    ])
  } else {
    await prisma.maliyetTablosu.create({
      data: {
        ad,
        firmaId,
        tarih,
        gecerlilikTarihi,
        ...oranData,
        pozisyonlar: { create: pozData },
      },
    })
  }

  yenile()
  return { ok: true }
}

export async function maliyetTablosuKopyala(formData: FormData) {
  await requireRoles(['patron', 'operasyon'])
  const id = Number(formData.get('id'))
  const hedefFirmaId = Number(formData.get('firmaId')) || null
  if (!id) return
  const tablo = await prisma.maliyetTablosu.findUnique({
    where: { id },
    include: { pozisyonlar: { orderBy: { sira: 'asc' } } },
  })
  if (!tablo) return

  await prisma.maliyetTablosu.create({
    data: {
      ad: `${tablo.ad ?? 'Maliyet Tablosu'} (kopya)`,
      firmaId: hedefFirmaId ?? tablo.firmaId,
      tarih: new Date(),
      gecerlilikTarihi: tablo.gecerlilikTarihi,
      sgkIsci: tablo.sgkIsci,
      issizlikIsci: tablo.issizlikIsci,
      sgkIsveren: tablo.sgkIsveren,
      issizlikIsveren: tablo.issizlikIsveren,
      gelirVergisi: tablo.gelirVergisi,
      damgaVergisi: tablo.damgaVergisi,
      pozisyonlar: {
        create: tablo.pozisyonlar.map((p) => ({
          ad: p.ad,
          sira: p.sira,
          brutUcret: p.brutUcret,
          gvMatrahIstisnasi: p.gvMatrahIstisnasi,
          dvIstisnasi: p.dvIstisnasi,
          kidem: p.kidem,
          ihbar: p.ihbar,
          yillikIzin: p.yillikIzin,
          yemek: p.yemek,
          yol: p.yol,
          saglikOsgb: p.saglikOsgb,
          kiyafet: p.kiyafet,
          maliMesuliyet: p.maliMesuliyet,
          karModu: p.karModu,
          karOran: p.karOran,
          hedefTeklif: p.hedefTeklif,
          sgkIsci: p.sgkIsci,
          issizlikIsci: p.issizlikIsci,
          gvMatrahi: p.gvMatrahi,
          gvMatrahiIndirimli: p.gvMatrahiIndirimli,
          gelirVergisi: p.gelirVergisi,
          dvMatrahi: p.dvMatrahi,
          dvMatrahiIndirimli: p.dvMatrahiIndirimli,
          damgaVergisi: p.damgaVergisi,
          kesintilerToplami: p.kesintilerToplami,
          netUcret: p.netUcret,
          sgkIsveren: p.sgkIsveren,
          issizlikIsveren: p.issizlikIsveren,
          yasalMaliyet: p.yasalMaliyet,
          toplamYasalMaliyet: p.toplamYasalMaliyet,
          personelMaliyeti: p.personelMaliyeti,
          karPayi: p.karPayi,
          teklifBedeli: p.teklifBedeli,
        })),
      },
    },
  })
  yenile()
}

export async function maliyetTablosuSil(formData: FormData) {
  await requireRoles(['patron', 'operasyon'])
  const id = Number(formData.get('id'))
  if (!id) return
  await prisma.maliyetTablosu.delete({ where: { id } })
  yenile()
}

// ============================================================
// PAYLAŞIM LİNKİ
// ============================================================

export async function linkOlustur(_prev: PaylasimState, formData: FormData): Promise<PaylasimState> {
  const user = await requireRoles(['patron', 'operasyon'])
  const tur = String(formData.get('tur') ?? '') as PaylasimTur
  const firmaAd = String(formData.get('firmaAd') ?? '').trim()
  const aliciAd = String(formData.get('aliciAd') ?? '').trim()
  const aliciEmail = String(formData.get('aliciEmail') ?? '').trim().toLowerCase()
  const gecerlilikGunHam = Number(formData.get('gecerlilikGun'))
  const sifreHam = String(formData.get('sifre') ?? '').trim()
  const gorunumHam = String(formData.get('gorunum') ?? 'TAM') as MaliyetGorunumTip

  if (tur !== 'SUNUM' && tur !== 'MALIYET') return { error: 'Geçersiz içerik türü.' }
  if (!firmaAd || !aliciAd || !aliciEmail) return { error: 'Firma, alıcı ve e-posta zorunludur.' }
  const gecerlilikGun = Number.isFinite(gecerlilikGunHam) && gecerlilikGunHam > 0 ? gecerlilikGunHam : await paylasimLinkGunOku()
  if (sifreHam && !sifreGecerliMi(sifreHam)) return { error: 'Şifre 4–6 haneli rakam olmalıdır.' }

  let sunumVersiyonId: number | null = null
  let maliyetTablosuId: number | null = null
  let snapshot: MaliyetSnapshot | null = null
  let gorunum: MaliyetGorunum | null = null

  if (tur === 'SUNUM') {
    const sunumId = Number(formData.get('sunumId'))
    if (!sunumId) return { error: 'Sunum seçilmelidir.' }
    const versiyon =
      (await prisma.sunumVersiyon.findFirst({ where: { sunumId, aktif: true } })) ??
      (await prisma.sunumVersiyon.findFirst({ where: { sunumId }, orderBy: { versiyonNo: 'desc' } }))
    if (!versiyon) return { error: 'Sunumun yüklü bir sürümü yok.' }
    sunumVersiyonId = versiyon.id
  } else {
    const tabloId = Number(formData.get('maliyetTablosuId'))
    if (!tabloId) return { error: 'Maliyet tablosu seçilmelidir.' }
    const tablo = await prisma.maliyetTablosu.findUnique({
      where: { id: tabloId },
      include: { firma: true, pozisyonlar: { orderBy: { sira: 'asc' } } },
    })
    if (!tablo) return { error: 'Maliyet tablosu bulunamadı.' }
    maliyetTablosuId = tablo.id
    gorunum = gorunumHam === 'KAR_GIZLI' ? 'KAR_GIZLI' : 'TAM'
    const oranlar: MaliyetOranlar = {
      sgkIsci: tablo.sgkIsci.toString(),
      issizlikIsci: tablo.issizlikIsci.toString(),
      sgkIsveren: tablo.sgkIsveren.toString(),
      issizlikIsveren: tablo.issizlikIsveren.toString(),
      gelirVergisi: tablo.gelirVergisi.toString(),
      damgaVergisi: tablo.damgaVergisi.toString(),
    }
    snapshot = {
      firmaAd,
      tabloAd: tablo.ad,
      tarih: tablo.tarih.toISOString(),
      gecerlilikTarihi: tablo.gecerlilikTarihi?.toISOString() ?? null,
      oranlar,
      gorunum,
      pozisyonlar: tablo.pozisyonlar.map((p) => ({
        ad: p.ad,
        girdi: {
          brutUcret: p.brutUcret.toString(),
          gvMatrahIstisnasi: p.gvMatrahIstisnasi.toString(),
          dvIstisnasi: p.dvIstisnasi.toString(),
          kidem: p.kidem.toString(),
          ihbar: p.ihbar.toString(),
          yillikIzin: p.yillikIzin.toString(),
          yemek: p.yemek.toString(),
          yol: p.yol.toString(),
          saglikOsgb: p.saglikOsgb.toString(),
          kiyafet: p.kiyafet.toString(),
          maliMesuliyet: p.maliMesuliyet.toString(),
          karModu: p.karModu,
          karOran: p.karOran.toString(),
          hedefTeklif: p.hedefTeklif?.toString() ?? null,
        },
      })),
    }
  }

  const token = tokenUret()
  const sifreVar = sifreHam.length > 0
  const gecerlilikBitis = new Date(Date.now() + gecerlilikGun * 24 * 60 * 60 * 1000)

  await prisma.paylasimLink.create({
    data: {
      tokenHash: tokenHash(token),
      tokenSifreli: encrypt(token),
      tur,
      firmaAd,
      aliciAd,
      aliciEmail,
      olusturanKullaniciId: user.id,
      gecerlilikBitis,
      gorunum,
      sunumVersiyonId,
      maliyetTablosuId,
      snapshot: snapshot ?? undefined,
      sifreHash: sifreVar ? await sifreHashle(sifreHam) : null,
    },
  })

  yenile()
  const base = await paylasimBaseUrlIstek()
  return { ok: true, link: `${base}/p/${token}`, token, sifre: sifreVar ? sifreHam : undefined }
}

export async function linkIptal(formData: FormData) {
  await requireRoles(['patron'])
  const id = Number(formData.get('id'))
  if (!id) return
  await prisma.paylasimLink.update({
    where: { id },
    data: { durum: 'IPTAL', iptalTarihi: new Date() },
  })
  yenile()
}

export async function linkUzat(formData: FormData) {
  await requireRoles(['patron', 'operasyon'])
  const id = Number(formData.get('id'))
  const gun = Number(formData.get('gun')) || 30
  if (!id) return
  const link = await prisma.paylasimLink.findUnique({ where: { id } })
  if (!link) return
  const temel = link.gecerlilikBitis > new Date() ? link.gecerlilikBitis : new Date()
  await prisma.paylasimLink.update({
    where: { id },
    data: {
      gecerlilikBitis: new Date(temel.getTime() + gun * 24 * 60 * 60 * 1000),
      ...(link.durum === 'SURESI_DOLDU' ? { durum: 'AKTIF' } : {}),
    },
  })
  yenile()
}

// Link kaydını ve erişim geçmişini sil (yalnızca patron).
export async function linkSil(formData: FormData) {
  await requireRoles(['patron'])
  const id = Number(formData.get('id'))
  if (!id) return
  await prisma.paylasimLink.delete({ where: { id } })
  yenile()
}

// Rastgele şifre üret (UI "rastgele üret" butonu için)
export async function rastgeleSifre(): Promise<string> {
  await requireRoles(['patron', 'operasyon'])
  return sifreRastgele(5)
}
