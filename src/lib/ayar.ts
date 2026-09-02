import { cache } from 'react'
import { prisma } from './db'

// Sabit değerleri DB'den oku (seed'de Ayar tablosunda); yoksa varsayılan dön
export const getAyar = cache(async (anahtar: string, varsayilan: string): Promise<string> => {
  const a = await prisma.ayar.findUnique({ where: { anahtar } })
  return a?.deger ?? varsayilan
})

export async function getAyarSayi(anahtar: string, varsayilan: number): Promise<number> {
  const v = await getAyar(anahtar, String(varsayilan))
  return Number(v) || varsayilan
}