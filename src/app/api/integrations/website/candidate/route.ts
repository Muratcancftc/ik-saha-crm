import { writeFile, mkdir } from 'node:fs/promises'
import path from 'node:path'
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
  cvGeçerli,
} from '@/lib/integration'
import { pushBildirimGonder } from '@/lib/push'

export const dynamic = 'force-dynamic'

const CV_DIR = path.join(process.cwd(), 'public', 'uploads', 'cv')

export async function OPTIONS(req: Request) {
  return new Response(null, { status: 204, headers: corsHeaders(req) })
}

function islemAd(firstName?: string, lastName?: string, fullName?: string): string | null {
  if (fullName) return temizle(fullName, 150)
  const f = temizle(firstName, 75)
  const l = temizle(lastName, 75)
  if (f && l) return `${f} ${l}`
  if (f) return f
  if (l) return l
  return null
}

function validate({
  ad,
  phone,
  email,
  kvkk,
}: {
  ad: string | null
  phone: string
  email: string
  kvkk: boolean
}): string | null {
  if (!ad) return 'Ad Soyad zorunludur (fullName veya firstName+lastName).'
  if (!phone || !geçerliTelefon(phone)) return 'Geçerli bir phone girin.'
  if (!geçerliEposta(email)) return 'Geçerli bir email girin.'
  if (!kvkk) return 'KVKK onayı zorunludur (kvkkAccepted=true).'
  return null
}

export async function POST(req: Request) {
  const cors = corsHeaders(req)

  if (!integrationSecretOk(req.headers.get('authorization'))) {
    return json({ success: false, error: 'unauthorized' }, 401, cors)
  }

  const ip = req.headers.get('x-forwarded-for')?.split(',')[0]?.trim() ?? 'unknown'
  if (!rateLimitOk('candidate-' + ip)) {
    return json({ success: false, error: 'rate_limited' }, 429, cors)
  }

  const idemKey = req.headers.get('x-idempotency-key')?.trim() || null
  if (idemKey) {
    const mevcut = await prisma.aday.findUnique({ where: { webRequestId: idemKey } })
    if (mevcut) {
      return json({ success: true, duplicate: true, candidateId: mevcut.id, jobId: mevcut.ilanId }, 200, cors)
    }
  }

  const contentType = req.headers.get('content-type') || ''
  const isMultipart = contentType.toLowerCase().includes('multipart/form-data')

  let firstName = ''
  let lastName = ''
  let fullName = ''
  let phone = ''
  let email = ''
  let city = ''
  let district = ''
  let position = ''
  let experience = ''
  let message = ''
  let kvkk = false
  let kvkkAcceptedAt: string | null = null
  let jobId: number | null = null
  let jobSlug = ''
  let cv: { ad: string; bytes: Buffer } | null = null
  let source: string | undefined

  try {
    if (isMultipart) {
      const fd = await req.formData()
      firstName = temizle(fd.get('firstName'), 75)
      lastName = temizle(fd.get('lastName'), 75)
      fullName = temizle(fd.get('fullName'), 150)
      phone = temizle(fd.get('phone'), 40)
      email = temizle(fd.get('email'), 200)
      city = temizle(fd.get('city'), 100)
      district = temizle(fd.get('district'), 100)
      position = temizle(fd.get('position'), 150)
      experience = temizle(fd.get('experience'), 1000)
      message = temizle(fd.get('message'), 2000)
      kvkk = String(fd.get('kvkkAccepted') ?? '') === 'true'
      kvkkAcceptedAt = fd.get('kvkkAcceptedAt') ? String(fd.get('kvkkAcceptedAt')) : null
      const jid = Number(fd.get('jobId'))
      if (Number.isFinite(jid) && jid > 0) jobId = jid
      jobSlug = temizle(fd.get('jobSlug'), 200)
      source = temizle(fd.get('source'), 40) || undefined
      const dosya = fd.get('cv')
      if (dosya && typeof dosya !== 'string') {
        cv = { ad: dosya.name, bytes: Buffer.from(await dosya.arrayBuffer()) }
      }
    } else {
      const b = (await req.json()) as Record<string, unknown>
      firstName = temizle(b.firstName, 75)
      lastName = temizle(b.lastName, 75)
      fullName = temizle(b.fullName, 150)
      phone = temizle(b.phone, 40)
      email = temizle(b.email, 200)
      city = temizle(b.city, 100)
      district = temizle(b.district, 100)
      position = temizle(b.position, 150)
      experience = temizle(b.experience, 1000)
      message = temizle(b.message, 2000)
      kvkk = Boolean(b.kvkkAccepted)
      kvkkAcceptedAt = b.kvkkAcceptedAt ? String(b.kvkkAcceptedAt) : null
      jobId = Number(b.jobId) || null
      jobSlug = temizle(b.jobSlug, 200)
      source = temizle(b.source, 40) || undefined
    }
  } catch {
    return json({ success: false, error: 'invalid_body' }, 400, cors)
  }

  const ad = islemAd(firstName, lastName, fullName)
  const valHata = validate({ ad, phone, email, kvkk })
  if (valHata) return json({ success: false, error: 'validation', message: valHata }, 422, cors)

  // CV doğrulama
  if (cv) {
    const cvHata = cvGeçerli(cv.ad, cv.bytes.byteLength)
    if (cvHata) return json({ success: false, error: 'cv_invalid', message: cvHata }, 422, cors)
  }

  const kaynak = kaynakBelirle(source)

  // İlan (job) çözümle
  let ilan: { id: number } | null = null
  if (jobId) ilan = await prisma.job.findUnique({ where: { id: jobId }, select: { id: true } })
  else if (jobSlug) ilan = await prisma.job.findUnique({ where: { slug: jobSlug }, select: { id: true } })

  // Pozisyon → Meslek (bul veya oluştur) — aday meslekId'si için
  let meslekId: number | null = null
  if (position) {
    const m = await prisma.meslek.findFirst({ where: { ad: { equals: position, mode: 'insensitive' } } })
    meslekId = m ? m.id : (await prisma.meslek.create({ data: { ad: position } })).id
  }

  // CV diske kaydet
  let cvYolu: string | null = null
  let cvDosyaAdi: string | null = null
  if (cv) {
    await mkdir(CV_DIR, { recursive: true })
    const benzersiz = `${Date.now()}-${Math.round(Math.random() * 1e9)}`
    const dosyaAdi = `${benzersiz}-${cv.ad.replace(/[^\w.\-]+/g, '_')}`
    await writeFile(path.join(CV_DIR, dosyaAdi), cv.bytes)
    cvYolu = `/uploads/cv/${dosyaAdi}`
    cvDosyaAdi = cv.ad
  }

  // --- Aday bul veya oluştur (dedupe: telefon veya email) ---
  const adayKosul: Array<Record<string, unknown>> = [{ telefon: phone }]
  if (email) adayKosul.push({ email: { equals: email, mode: 'insensitive' } })

  const mevcut = await prisma.aday.findFirst({ where: { OR: adayKosul } })

  const notEki = [
    message,
    city || district ? `Lokasyon: ${[city, district].filter(Boolean).join(' / ')}` : null,
    experience ? `Tecrübe: ${experience}` : null,
    kvkkAcceptedAt ? `KVKK onayı: ${kvkkAcceptedAt}` : null,
    `Kaynak: ${kaynak}`,
  ]
    .filter(Boolean)
    .join('\n')

  let aday: { id: number; ad: string }
  if (mevcut) {
    // Mevcut aday → yeni başvuru bilgilerini ekle, yeni kayıt açma
    const guncel = await prisma.aday.update({
      where: { id: mevcut.id },
      data: {
        meslekId: mevcut.meslekId ?? meslekId,
        ilanId: ilan?.id ?? mevcut.ilanId,
        kaynak: mevcut.kaynak ?? kaynak,
        cvYolu: cvYolu ?? mevcut.cvYolu,
        cvDosyaAdi: cvDosyaAdi ?? mevcut.cvDosyaAdi,
        webRequestId: idemKey ?? mevcut.webRequestId,
        not: mevcut.not ? `${mevcut.not}\n---\n${notEki}` : notEki,
      },
    })
    aday = { id: guncel.id, ad: guncel.ad }
  } else {
    const yeni = await prisma.aday.create({
      data: {
        ad: ad!,
        telefon: phone,
        email: email || null,
        meslekId,
        ilanId: ilan?.id ?? null,
        kaynak,
        cvYolu,
        cvDosyaAdi,
        webRequestId: idemKey,
        not: notEki || null,
      },
    })
    aday = { id: yeni.id, ad: yeni.ad }
  }

  // --- Bildirim (mevcut bildirim altyapısı + push) ---
  const mesaj = `Yeni aday başvurusu: ${aday.ad}${position ? ` — ${position}` : ''}`
  await prisma.bildirim.create({ data: { tur: 'website', mesaj } })
  await pushBildirimGonder('ATALAY İK — Yeni Aday Başvurusu', `${aday.ad}${position ? ` — ${position}` : ''}`, '/adaylar')

  return json(
    { success: true, duplicate: false, candidateId: aday.id, jobId: ilan?.id ?? null, cvUploaded: !!cvYolu },
    201,
    cors
  )
}