'use server'

import { revalidatePath } from 'next/cache'
import { prisma } from '@/lib/db'
import { requireRoles } from '@/lib/dal'

const YAZANLAR = ['patron', 'operasyon', 'muhasebe', 'ik'] as const

// Personel için arama kaydı oluştur (arayan: oturumdaki kullanıcı)
export async function aramaKaydet(isciId: number) {
  const user = await requireRoles([...YAZANLAR])
  if (!isciId) return
  await prisma.arama.create({
    data: { isciId, kullaniciId: user.id },
  })
  revalidatePath('/aramalar')
  revalidatePath(`/isci-havuzu/${isciId}`)
  return
}