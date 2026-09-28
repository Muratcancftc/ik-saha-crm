// Admin şifresini sıfırlar / yoksa oluşturur.
// Kullanım:  npm run db:seed  yerine sunucuda:
//   npx tsx --env-file=.env scripts/admin-sifre-sifirla.ts
// Varsayılan: admin@ikcrm.com / 123123
import 'dotenv/config'
import bcrypt from 'bcryptjs'
import { PrismaPg } from '@prisma/adapter-pg'
import { PrismaClient } from '@prisma/client'

const email = process.env.ADMIN_EMAIL ?? 'admin@ikcrm.com'
const sifre = process.env.ADMIN_SIFRE ?? '123123'

const adapter = new PrismaPg({
  connectionString: process.env.DATABASE_URL,
  max: 1,
})
const prisma = new PrismaClient({ adapter })

async function main() {
  const hash = await bcrypt.hash(sifre, 10)
  const mevcut = await prisma.kullanici.findUnique({ where: { email } })
  if (mevcut) {
    await prisma.kullanici.update({ where: { email }, data: { sifreHash: hash, rol: 'patron', menuler: [] } })
    console.log(`✅ ${email} şifresi sıfırlandı → ${sifre} (patron, tam erişim)`)
  } else {
    await prisma.kullanici.create({ data: { ad: 'Admin', email, sifreHash: hash, rol: 'patron', menuler: [] } })
    console.log(`✅ ${email} oluşturuldu → ${sifre} (patron, tam erişim)`)
  }
}

main()
  .catch((e) => { console.error('HATA:', e.message); process.exit(1) })
  .finally(() => prisma.$disconnect())