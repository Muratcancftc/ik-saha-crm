'use server'

import { revalidatePath } from 'next/cache'
import { prisma } from '@/lib/db'
import { requireRoles } from '@/lib/dal'
import { encrypt } from '@/lib/crypto'
import { bolgeGecerli } from '@/lib/bolge'
import { normalizeTelefon } from '@/lib/utils'
import type { AdayDurum } from '@prisma/client'

export type AdayState = { error?: string; ok?: boolean } | undefined

export async function createAday(_prev: AdayState, formData: FormData): Promise<AdayState> {
  await requireRoles(['patron', 'operasyon'])
  const ad = String(formData.get('ad') ?? '').trim()
  const telefonRaw = String(formData.get('telefon') ?? '').trim()
  if (!ad || !telefonRaw) return { error: 'Ad ve telefon zorunludur.' }

  // Telefon normalize edilerek saklanır (rakam dışı temizlenir) — mükerrer kontrol
  // ve kıyas aynı formatta çalışsın.
  const telefon = normalizeTelefon(telefonRaw)
  if (!telefon) return { error: 'Geçerli bir telefon numarası girin.' }

  // Mükerrer telefon kontrolü: aynı numarayla aday veya işçi varsa engelle
  const [varAday, varIsci] = await Promise.all([
    prisma.aday.findMany({ select: { id: true, ad: true, telefon: true } }),
    prisma.isci.findMany({ select: { id: true, ad: true, telefon: true } }),
  ])
  const eslesenAday = varAday.find((a) => normalizeTelefon(a.telefon) === telefon)
  const eslesenIsci = varIsci.find((i) => normalizeTelefon(i.telefon) === telefon)
  if (eslesenAday) return { error: `${telefon} numarasıyla zaten bir aday kayıtlı (${eslesenAday.ad}).` }
  if (eslesenIsci) return { error: `${telefon} numarası zaten işçi havuzunda (${eslesenIsci.ad}).` }

  const meslekId = Number(formData.get('meslekId')) || null
  await prisma.aday.create({
    data: {
      ad,
      telefon,
      email: String(formData.get('email') ?? '').trim() || null,
      meslekId,
      durum: 'basvurdu',
      puan: Number(formData.get('puan') ?? 50) || 50,
      bolge: bolgeGecerli(String(formData.get('bolge') ?? '')) ?? null,
      not: String(formData.get('not') ?? '') || null,
    },
  })
  revalidatePath('/adaylar')
  return { ok: true }
}

export async function adayDurumDegistir(formData: FormData) {
  await requireRoles(['patron', 'operasyon'])
  const id = Number(formData.get('id'))
  const durum = String(formData.get('durum') ?? 'basvurdu') as AdayDurum
  await prisma.aday.update({ where: { id }, data: { durum } })
  revalidatePath('/adaylar')
  return
}

// Onaylanan adayı tek tıkla işçi havuzuna aktar
export async function adayAktar(formData: FormData) {
  await requireRoles(['patron', 'operasyon'])
  const id = Number(formData.get('id'))
  const aday = await prisma.aday.findUnique({ where: { id } })
  if (!aday) return
  // Reddedilen aday operasyonel havuza aktarılamaz (backend koruması)
  if (aday.durum === 'reddedildi') return

  // Bölge ve meslek atanmadan aktarılamaz (sessiz varsayılan yok)
  if (!aday.bolge) return
  if (!aday.meslekId) return

  // Mükerrer işçi koruması: aynı (normalize) telefonla zaten işçi varsa aktarma
  const telefonNorm = normalizeTelefon(aday.telefon)
  const isciler = await prisma.isci.findMany({ select: { id: true, ad: true, telefon: true } })
  if (isciler.some((i) => normalizeTelefon(i.telefon) === telefonNorm)) return

  // mock TC/IBAN (adayda yoksa üretilir; IBAN bilgisi olmayan kayıt CSV'den çıkarılır)
  const genTC = () => {
    const d = [1, ...Array.from({ length: 8 }, () => Math.floor(Math.random() * 10))]
    const d10 = ((d[0] + d[2] + d[4] + d[6] + d[8]) * 7 - (d[1] + d[3] + d[5] + d[7])) % 10
    const d11 = (d.reduce((a, b) => a + b, 0) + Math.abs(d10)) % 10
    return `${d.join('')}${Math.abs(d10)}${d11}`
  }
  const genIBAN = () => 'TR00' + Array.from({ length: 22 }, () => Math.floor(Math.random() * 10)).join('')

  // Aktarılan işçi adayın bölgesine atanır
  const bolge = aday.bolge
  const ilce = bolge === 'balikesir' ? 'Karesi' : 'İzmit'

  await prisma.isci.create({
    data: {
      ad: aday.ad,
      telefon: normalizeTelefon(aday.telefon),
      tcKimlik: encrypt(genTC()),
      ilce,
      iban: encrypt(genIBAN()),
      dogumTarihi: new Date(1990, 0, 1),
      puan: aday.puan,
      gunlukUcretBeklentisi: 1500,
      durum: 'aktif',
      bolge,
      tercihBolgeler: [],
      not: 'Aday havuzundan aktarıldı',
      meslekler: aday.meslekId ? { create: [{ meslekId: aday.meslekId }] } : undefined,
    },
  })

  await prisma.aday.update({ where: { id }, data: { durum: 'onaylandi' } })

  revalidatePath('/adaylar')
  revalidatePath('/isci-havuzu')
  return
}

// Adayın bölgesini ata / değiştir (website'ten gelen atanmamış adaylar için)
export async function adayBolgeDegistir(formData: FormData) {
  await requireRoles(['patron', 'operasyon'])
  const id = Number(formData.get('id'))
  const bolge = bolgeGecerli(String(formData.get('bolge') ?? '')) ?? null
  if (!id) return
  await prisma.aday.update({ where: { id }, data: { bolge } })
  revalidatePath('/adaylar')
  return
}

export async function adaySil(formData: FormData) {
  await requireRoles(['patron', 'operasyon'])
  const id = Number(formData.get('id'))
  await prisma.aday.delete({ where: { id } })
  revalidatePath('/adaylar')
  return
}