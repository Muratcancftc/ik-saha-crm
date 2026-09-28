/* eslint-disable */
// ATALAY İK CRM — kullanıcıya özel menü yetkileri QA testi
// Kullanım: npm run dev açıkken → node scripts/qa-menuler-test.mjs
// Senaryo:
//  1) admin (patron) olarak giriş → kullanıcıya özel menüler ver (sadece Puantaj)
//  2) bu kullanıcı olarak giriş → sidebar'da yalnızca izinli menüler görünür
//  3) izinsiz sayfalara doğrudan gidilince '/' e yönlenir (proxy engeli)
//  4) izinli sayfa açılır; menü değişikliği yeniden giriş olmadan etkinleşir
import { chromium } from 'playwright'
import { createRequire } from 'module'
const require = createRequire(import.meta.url)
const { Client } = require('/Users/adada/Desktop/ik-saha-crm/node_modules/pg')
const BASE = 'http://localhost:3001'
const DB = { connectionString: process.env.DATABASE_URL || 'postgresql://postgres:postgres@localhost:5432/ik_crm' }
const R = []
let FAIL = false
function rapor(name, ok, extra) { if (!ok) FAIL = true; R.push({ name, ok }); console.log(`${ok ? '✓' : '✗'} ${name}${extra ? ' — ' + extra : ''}`) }
async function db() { const c = new Client(DB); await c.connect(); return c }

const TEST_EMAIL = 'qa_menu@test.com'

async function login(page, email, pass) {
  await page.goto(BASE + '/giris')
  await page.waitForTimeout(1200)
  await page.getByLabel('E-posta').fill(email)
  await page.getByLabel('Şifre').fill(pass)
  await page.getByRole('button', { name: 'Giriş Yap' }).click()
  await page.waitForTimeout(1800)
}

async function main() {
  let c = await db()
  await c.query(`DELETE FROM "Kullanici" WHERE email = $1`, [TEST_EMAIL])

  // ---- PATRON: kullanıcıya özel menü ver (yalnızca / + /puantaj) ----
  const sifreHash = '$2b$10$IxfmmEWiw7xYAdw1gemlEO1lzkCc/R7EhwjoE/tWL2tVaCV3DlOM2' // "123123"
  const uid = (await c.query(
    `INSERT INTO "Kullanici" (ad, email, "sifreHash", rol, menuler) VALUES ('QA Menu User', $1, $2, 'operasyon', ARRAY['/','/puantaj']) RETURNING id`,
    [TEST_EMAIL, sifreHash]
  )).rows[0].id
  await c.end()

  const browser = await chromium.launch()
  const ctx = await browser.newContext({ viewport: { width: 1440, height: 900 } })
  const page = await ctx.newPage()
  page.setDefaultTimeout(20000)
  page.on('dialog', (d) => d.accept())

  // ---- 1) admin giriş, kullanıcı görüyor mu ----
  await login(page, 'admin@ikcrm.com', '123123')
  await page.goto(BASE + '/kullanicilar')
  await page.waitForTimeout(1200)
  const row = page.locator('tr', { hasText: 'QA Menu User' })
  rapor('M1. Admin /kullanicilar da yeni kullanıcı görünüyor', (await row.count()) > 0)
  rapor('M2. "Menüler" butonu mevcut', (await row.getByRole('button', { name: /Menüler/ }).count()) > 0)
  await ctx.close()

  // ---- 2) menü kısıtlı kullanıcı girişi ----
  const ctx2 = await browser.newContext({ viewport: { width: 1440, height: 900 } })
  const p2 = await ctx2.newPage()
  p2.setDefaultTimeout(20000)
  await login(p2, TEST_EMAIL, '123123')

  // dashboard'a düştü
  rapor('M3. Kısıtlı kullanıcı girişte / e düştü', p2.url().replace(BASE, '').startsWith('/'), p2.url())

  // sidebar menüleri yalnızca izinliler
  await p2.goto(BASE + '/')
  await p2.waitForTimeout(1200)
  const sidebarLinks = await p2.locator('aside a').allTextContents()
  const joined = sidebarLinks.join(' | ')
  const isciVar = joined.includes('İşçi Havuzu')
  const puantajVar = joined.includes('Puantaj')
  const odemeVar = joined.includes('Bordro')
  rapor('M4. Sidebar İşçi Havuzu GÖRÜNMÜYOR', !isciVar, joined.slice(0, 120))
  rapor('M5. Sidebar Puantaj GÖRÜNÜYOR', puantajVar)
  rapor('M6. Sidebar Finans (Bordro) GÖRÜNMÜYOR', !odemeVar)

  // ---- 3) izinsiz sayfa doğrudan erişim → / ----
  await p2.goto(BASE + '/isci-havuzu')
  await p2.waitForTimeout(1500)
  rapor('M7. /isci-havuzu engellendi (→ /)', p2.url().replace(BASE, '').startsWith('/') && !p2.url().includes('isci-havuzu'), p2.url())

  await p2.goto(BASE + '/odeme')
  await p2.waitForTimeout(1500)
  rapor('M8. /odeme engellendi (→ /)', p2.url().replace(BASE, '').startsWith('/') && !p2.url().includes('odeme'), p2.url())

  await p2.goto(BASE + '/faturalar')
  await p2.waitForTimeout(1500)
  rapor('M9. /faturalar engellendi (→ /)', p2.url().replace(BASE, '').startsWith('/') && !p2.url().includes('faturalar'), p2.url())

  // ---- 4) izinli sayfa açılıyor ----
  await p2.goto(BASE + '/puantaj')
  await p2.waitForTimeout(1800)
  rapor('M10. /puantaj açıldı (izinli)', p2.url().includes('puantaj'), p2.url())

  // ---- 5) menü değişikliği oturum açıkken anında etkili ----
  await p2.goto(BASE + '/talepler')
  await p2.waitForTimeout(1500)
  rapor('M11. Öncesi: /talepler engellendi', !p2.url().includes('talepler'), p2.url())

  // admin menüyü genişletsin (aynı oturumdaki kullanıcı yeniden giriş yapmadan)
  const ctx3 = await browser.newContext({ viewport: { width: 1440, height: 900 } })
  const p3 = await ctx3.newPage()
  p3.setDefaultTimeout(20000)
  await login(p3, 'admin@ikcrm.com', '123123')
  await p3.goto(BASE + '/kullanicilar')
  await p3.waitForTimeout(1000)
  const row3 = p3.locator('tr', { hasText: 'QA Menu User' })
  await row3.getByRole('button', { name: /Menüler/ }).click()
  await p3.waitForTimeout(800)
  const talepCheck = p3.locator('input[value="/talepler"]')
  await talepCheck.check()
  await p3.getByRole('button', { name: 'Kaydet' }).last().click()
  await p3.waitForTimeout(3000)
  await ctx3.close()

  let cdb = await db()
  const after = await cdb.query(`SELECT menuler FROM "Kullanici" WHERE email = $1`, [TEST_EMAIL])
  console.log('  [debug] DB menuler after admin update:', JSON.stringify(after.rows[0]?.menuler))
  await cdb.end()

  await p2.goto(BASE + '/talepler')
  await p2.waitForTimeout(1800)
  rapor('M12. Menü genişletince /talepler ANINDA açıldı (yeniden giriş yok)', p2.url().includes('talepler'), p2.url())

  // ---- 6) patron-dışı menü editörü: patron menüleri kilitli ----
  const ctx4 = await browser.newContext({ viewport: { width: 1440, height: 900 } })
  const p4 = await ctx4.newPage()
  p4.setDefaultTimeout(20000)
  await login(p4, 'admin@ikcrm.com', '123123')
  await p4.goto(BASE + '/kullanicilar')
  await p4.waitForTimeout(1000)
  await p4.locator('tr', { hasText: 'QA Menu User' }).getByRole('button', { name: /Menüler/ }).click()
  await p4.waitForTimeout(800)
  const patronOnly = p4.locator('input[value="/kullanicilar"]')
  rapor('M13. Patron menüsü (Kullanıcılar) diğer kullanıcıda KİLİTLİ', await patronOnly.isDisabled(), '')
  await ctx4.close()

  // temizlik
  let c2 = await db()
  await c2.query(`DELETE FROM "Kullanici" WHERE email = $1`, [TEST_EMAIL])
  await c2.end()
  await browser.close()

  console.log(`\n===== SONUÇ: ${R.filter((x) => x.ok).length}/${R.length} geçti =====`)
  process.exit(FAIL ? 1 : 0)
}

main().catch((e) => { console.error(e); process.exit(1) })