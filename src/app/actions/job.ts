'use server'

import { revalidatePath } from 'next/cache'
import { prisma } from '@/lib/db'
import { requireRoles } from '@/lib/dal'
import { slugify } from '@/lib/slugify'

export async function createJob(formData: FormData) {
  await requireRoles(['patron', 'operasyon'])
  const baslik = String(formData.get('baslik') ?? '').trim()
  if (!baslik) return
  let slug = String(formData.get('slug') ?? '').trim()
  if (!slug) slug = slugify(baslik)

  const gecerlilik = String(formData.get('gecerlilikTarihi') ?? '').trim()
  const gereksinimler = String(formData.get('gereksinimler') ?? '')
    .split('\n')
    .map((s) => s.trim())
    .filter(Boolean)

  const varMi = await prisma.job.findUnique({ where: { slug } })
  if (varMi) return

  await prisma.job.create({
    data: {
      slug,
      baslik,
      lokasyon: String(formData.get('lokasyon') ?? '').trim() || null,
      calismaTipi: String(formData.get('calismaTipi') ?? '').trim() || null,
      aciklama: String(formData.get('aciklama') ?? '').trim() || null,
      gereksinimler,
      gecerlilikTarihi: gecerlilik ? new Date(`${gecerlilik}T23:59:00`) : null,
    },
  })
  revalidatePath('/is-ilanlari')
  revalidatePath('/api/public/jobs')
}

export async function toggleJobYayin(formData: FormData) {
  await requireRoles(['patron', 'operasyon'])
  const id = Number(formData.get('id'))
  const job = await prisma.job.findUnique({ where: { id } })
  if (!job) return
  await prisma.job.update({
    where: { id },
    data: {
      yayinlandi: !job.yayinlandi,
      yayinTarihi: !job.yayinlandi && !job.yayinTarihi ? new Date() : job.yayinTarihi,
    },
  })
  revalidatePath('/is-ilanlari')
  revalidatePath('/api/public/jobs')
}

export async function silJob(formData: FormData) {
  await requireRoles(['patron', 'operasyon'])
  const id = Number(formData.get('id'))
  await prisma.job.delete({ where: { id } })
  revalidatePath('/is-ilanlari')
  revalidatePath('/api/public/jobs')
}