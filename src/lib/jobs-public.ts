import type { Job } from '@prisma/client'

// Public API'ye yalnızca gerekli alanlar döner; private CRM alanları ASLA çıkmaz.
export function jobPublic(j: Job) {
  return {
    id: j.id,
    slug: j.slug,
    title: j.baslik,
    location: j.lokasyon,
    employmentType: j.calismaTipi,
    description: j.aciklama,
    requirements: j.gereksinimler,
    publishedAt: j.yayinTarihi,
    validThrough: j.gecerlilikTarihi,
  }
}

// Website'te yayınlanmış + süresi geçmemiş ilanlar
export function jobPublicFiltre() {
  return {
    yayinlandi: true,
    OR: [{ gecerlilikTarihi: null }, { gecerlilikTarihi: { gte: new Date() } }],
  }
}