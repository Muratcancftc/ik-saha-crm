import { prisma } from '@/lib/db'
import {
  corsHeaders,
  integrationSecretOk,
  kaynakBelirle,
  rateLimitOk,
  json,
  temizle,
  geçerliEposta,
  geçerliTelefon,
} from '@/lib/integration'
import { startOfDay, addDays } from '@/lib/dates'
import { pushBildirimGonder } from '@/lib/push'
import { bolgeGecerli } from '@/lib/bolge'

export const dynamic = 'force-dynamic'

export async function OPTIONS(req: Request) {
  return new Response(null, { status: 204, headers: corsHeaders(req) })
}

function validate(body: Record<string, unknown>): string | null {
  if (!temizle(body.companyName, 200)) return 'companyName zorunludur.'
  if (!temizle(body.contactName, 150)) return 'contactName zorunludur.'
  const phone = temizle(body.phone, 40)
  if (!phone || !geçerliTelefon(phone)) return 'Geçerli bir phone girin.'
  if (!temizle(body.position, 150)) return 'position zorunludur.'
  const email = temizle(body.email, 200)
  if (!geçerliEposta(email)) return 'Geçerli bir email girin.'
  const sayi = Number(body.personnelCount)
  if (body.personnelCount !== undefined && body.personnelCount !== '' && (!Number.isFinite(sayi) || sayi < 1 || sayi > 9999)) {
    return 'personnelCount 1-9999 arasında olmalı.'
  }
  return null
}

export async function POST(req: Request) {
  const cors = corsHeaders(req)

  if (!integrationSecretOk(req.headers.get('authorization'))) {
    return json({ success: false, error: 'unauthorized' }, 401, cors)
  }

  const ip = req.headers.get('x-forwarded-for')?.split(',')[0]?.trim() ?? 'unknown'
  if (!rateLimitOk('employer-' + ip)) {
    return json({ success: false, error: 'rate_limited' }, 429, cors)
  }

  // İdempotency: aynı X-Idempotency-Key retry → duplicate oluşturma
  const idemKey = req.headers.get('x-idempotency-key')?.trim() || null
  if (idemKey) {
    const mevcut = await prisma.talep.findUnique({ where: { webRequestId: idemKey } })
    if (mevcut) {
      return json({ success: true, duplicate: true, requestId: mevcut.id, companyId: mevcut.firmaId }, 200, cors)
    }
  }

  let body: Record<string, unknown>
  try {
    body = (await req.json()) as Record<string, unknown>
  } catch {
    return json({ success: false, error: 'invalid_json' }, 400, cors)
  }

  const hata = validate(body)
  if (hata) return json({ success: false, error: 'validation', message: hata }, 422, cors)

  const companyName = temizle(body.companyName, 200)
  const contactName = temizle(body.contactName, 150)
  const phone = temizle(body.phone, 40)
  const email = temizle(body.email, 200) || null
  const position = temizle(body.position, 150)
  const personnelCount = Math.max(1, Math.min(9999, Math.round(Number(body.personnelCount) || 1)))
  const description = temizle(body.description, 2000) || null
  const kaynak = kaynakBelirle(body.source ? temizle(body.source, 40) : undefined)
  const bolge = bolgeGecerli(temizle(body.bolge ?? body.region, 40).toLowerCase()) ?? 'kocaeli'

  // --- Firma bul veya oluştur (dedupe: ad / email / telefon) ---
  const firmaKosul: Array<Record<string, unknown>> = []
  if (companyName) firmaKosul.push({ ad: { equals: companyName, mode: 'insensitive' } })
  if (email) firmaKosul.push({ email: { equals: email, mode: 'insensitive' } })
  if (phone) firmaKosul.push({ telefon: phone })

  let firma = firmaKosul.length ? await prisma.musteriFirma.findFirst({ where: { OR: firmaKosul } }) : null
  if (!firma) {
    firma = await prisma.musteriFirma.create({ data: { ad: companyName, email, telefon: phone, bolge } })
  }

  // --- Yetkili / contact bul veya oluştur ---
  let yetkili = await prisma.yetkili.findFirst({
    where: { firmaId: firma.id, OR: phone ? [{ telefon: phone }, { ad: contactName }] : [{ ad: contactName }] },
  })
  if (!yetkili) {
    yetkili = await prisma.yetkili.create({ data: { firmaId: firma.id, ad: contactName, telefon: phone || null, unvan: 'Web Talebi' } })
  }

  // --- Lokasyon (firmada yoksa 'Genel' varsayılan) ---
  let lokasyon = await prisma.lokasyon.findFirst({ where: { firmaId: firma.id } })
  if (!lokasyon) lokasyon = await prisma.lokasyon.create({ data: { firmaId: firma.id, ad: 'Genel' } })

  // --- Pozisyon → Meslek (bul veya oluştur) ---
  let meslek = await prisma.meslek.findFirst({ where: { ad: { equals: position, mode: 'insensitive' } } })
  if (!meslek) meslek = await prisma.meslek.create({ data: { ad: position } })

  // --- Talep (personel talebi) oluştur ---
  const talep = await prisma.talep.create({
    data: {
      firmaId: firma.id,
      lokasyonId: lokasyon.id,
      tarih: addDays(startOfDay(), 1),
      vardiya: 'gunduz',
      aciliyet: 'normal',
      not: description,
      kaynak,
      landingPage: temizle(body.landingPage, 500) || null,
      referrer: temizle(body.referrer, 500) || null,
      utmSource: temizle(body.utmSource, 255) || null,
      utmMedium: temizle(body.utmMedium, 255) || null,
      utmCampaign: temizle(body.utmCampaign, 255) || null,
      utmContent: temizle(body.utmContent, 255) || null,
      utmTerm: temizle(body.utmTerm, 255) || null,
      webRequestId: idemKey,
      kalemler: { create: [{ meslekId: meslek.id, adet: personnelCount }] },
    },
  })

  // --- Bildirim (mevcut bildirim altyapısı + push) ---
  const mesaj = `Yeni web sitesi personel talebi: ${firma.ad} — ${personnelCount} ${meslek.ad}`
  await prisma.bildirim.create({ data: { tur: 'website', mesaj } })
  await pushBildirimGonder('ATALAY İK — Yeni Personel Talebi', `${firma.ad} — ${personnelCount} ${meslek.ad}`, '/talepler')

  return json(
    { success: true, duplicate: false, requestId: talep.id, companyId: firma.id },
    201,
    cors
  )
}