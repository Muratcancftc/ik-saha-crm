// ATALAY İK CRM — veri bütünlüğü / puantaj / aday onay QA regression testi
// Kullanım: npm run dev açıkken → node scripts/qa-test.mjs
const { chromium } = require('playwright')
const { Client } = require('/Users/adada/Desktop/ik-saha-crm/node_modules/pg')
const BASE = 'http://localhost:3000'
const DB = { connectionString: process.env.DATABASE_URL || 'postgresql://postgres:postgres@localhost:5432/ik_crm' }
const R = []
function rapor(name, ok, extra) { R.push({ name, ok }); console.log(`${ok ? '✓' : '✗'} ${name}${extra ? ' — ' + extra : ''}`) }
async function db() { const c = new Client(DB); await c.connect(); return c }

async function main() {
  // ---------- SETUP ----------
  let c = await db()
  await c.query(`DELETE FROM "Aday" WHERE ad LIKE 'QA%'`)
  await c.query(`DELETE FROM "MusteriFirma" WHERE ad LIKE 'QA%'`)
  await c.query(`DELETE FROM "Isci" WHERE ad LIKE 'QA%'`)
  const adayA = (await c.query(`INSERT INTO "Aday" (ad, telefon, email, durum, "createdAt") VALUES ('QA Aday Pending','+90 500 000 01', 'qa_a@t.com','basvurdu', now()) RETURNING id`)).rows[0].id
  const adayB = (await c.query(`INSERT INTO "Aday" (ad, telefon, durum, "createdAt") VALUES ('QA Aday Approved','+90 500 000 02','onaylandi', now()) RETURNING id`)).rows[0].id
  const adayC = (await c.query(`INSERT INTO "Aday" (ad, telefon, durum, "createdAt") VALUES ('QA Aday Rejected','+90 500 000 03','reddedildi', now()) RETURNING id`)).rows[0].id
  const firma = (await c.query(`INSERT INTO "MusteriFirma" (ad, adres, email) VALUES ('QA TEST COMPANY A','Test Adres','qa@t.com') RETURNING id`)).rows[0].id
  const yetkili = (await c.query(`INSERT INTO "Yetkili" (\"firmaId\", ad, telefon) VALUES ($1,'QA Contact','+90 500 000 04') RETURNING id`, [firma])).rows[0].id
  await c.end()

  const browser = await chromium.launch()
  const ctx = await browser.newContext({ viewport: { width: 1440, height: 900 } })
  const page = await ctx.newPage()
  page.setDefaultTimeout(25000)
  page.on('dialog', (d) => d.accept())
  await page.goto(BASE + '/giris')
  await page.waitForTimeout(2500)
  await page.getByLabel('E-posta').fill('admin@ikcrm.com')
  await page.getByLabel('Şifre').fill('123123')
  await page.getByRole('button', { name: 'Giriş Yap' }).click()
  await page.waitForTimeout(3500)

  // ===== PUANTAJ 15 GÜN =====
  const gunSayisi = async () => (await page.locator('a[title]').filter({ has: page.locator('span') }).count())
  await page.goto(BASE + '/puantaj?bas=2026-02-01')
  await page.waitForTimeout(1500)
  const label1 = await page.getByText(/Şubat 2026/).first().innerText().catch(() => '')
  const btn15 = await page.locator('a[title*="2026"]').count()
  rapor('P1. 15 günlük pencere + etiket (01 Şubat 2026)', label1.includes('01 Şubat') && label1.includes('15 Şubat') && btn15 === 15, `etiket=${label1}`)

  await page.getByRole('link', { name: 'Önceki 15 Gün' }).click()
  await page.waitForTimeout(1200)
  rapor('P2. Önceki 15 gün → 17 Ocak 2026', page.url().includes('bas=2026-01-17'), page.url().split('bas=')[1])
  await page.getByRole('link', { name: 'Sonraki 15 Gün' }).click()
  await page.waitForTimeout(1200)
  rapor('P3. Sonraki 15 gün → 01 Şubat 2026', page.url().includes('bas=2026-02-01'), page.url().split('bas=')[1])

  // ay geçişi + yıl geçişi
  await page.goto(BASE + '/puantaj?bas=2026-12-20')
  await page.waitForTimeout(1200)
  const lAy = await page.locator('div.rounded-xl.bg-indigo-50').first().innerText().catch(() => '')
  const yilGecis = lAy.includes('03 Ocak 2027')
  rapor('P4. Ay değişimi (20 Aralık → 03 Ocak 2027)', yilGecis, lAy)
  await page.goto(BASE + '/puantaj?bas=2026-01-10')
  await page.waitForTimeout(1200)
  await page.getByRole('link', { name: 'Önceki 15 Gün' }).click()
  await page.waitForTimeout(1200)
  const lYil = await page.locator('div.rounded-xl.bg-indigo-50').first().innerText().catch(() => '')
  rapor('P5. Yıl geçişi geri (26 Aralık 2025)', lYil.includes('26 Aralık 2025'), lYil)

  // tarih seç (date input)
  await page.goto(BASE + '/puantaj')
  await page.waitForTimeout(1200)
  await page.locator('input[name="bas"]').fill('2026-03-10')
  await page.getByRole('button', { name: 'Git' }).click()
  await page.waitForTimeout(1200)
  const lTarih = await page.locator('div.rounded-xl.bg-indigo-50').first().innerText().catch(() => '')
  rapor('P6. Tarih seç → 10 Mart 2026 penceresi', lTarih.includes('10 Mart') && lTarih.includes('24 Mart'), lTarih)

  // puantaj kalıcılık: QA işçi + atama oluştur, Geldi işaretle, dönem ileri/geri → korunur
  c = await db()
  await c.query(`INSERT INTO "Meslek" (ad) VALUES ('QA Meslek') ON CONFLICT (ad) DO NOTHING`)
  const meslek = (await c.query(`SELECT id FROM "Meslek" WHERE ad='QA Meslek'`)).rows[0].id
  const isci = (await c.query(`INSERT INTO "Isci" (ad, telefon, "tcKimlik", ilce, iban, "dogumTarihi", "gunlukUcretBeklentisi", durum, "updatedAt") VALUES ('QA Isci','+90 500 000 10','10000000146','İstanbul','TR000000000000000000000000',now(),1500,'aktif', now()) RETURNING id`)).rows[0].id
  const lok = (await c.query(`SELECT id FROM "Lokasyon" LIMIT 1`)).rows[0].id
  const talep = (await c.query(`INSERT INTO "Talep" (\"firmaId\", \"lokasyonId\", tarih) VALUES ($1,$2,'2026-02-05T08:00:00Z') RETURNING id`, [firma, lok])).rows[0].id
  await c.query(`INSERT INTO "TalepKalemi" (\"talepId\", \"meslekId\", adet) VALUES ($1,$2,1)`, [talep, meslek])
  const atama = (await c.query(`INSERT INTO "Atama" (\"talepId\", \"isciId\", \"meslekId\", tarih, durum) VALUES ($1,$2,$3,'2026-02-05T08:00:00Z','atandi') RETURNING id`, [talep, isci, meslek])).rows[0].id
  await c.end()

  await page.goto(BASE + '/puantaj?bas=2026-02-01&tarih=2026-02-05')
  await page.waitForTimeout(1500)
  const row = page.locator('li', { hasText: 'QA Isci' }).first()
  if (await row.count()) {
    await row.getByRole('button', { name: 'Geldi' }).click()
    await page.waitForTimeout(1200)
  }
  // dönem ileri al
  await page.goto(BASE + '/puantaj?bas=2026-02-16')
  await page.waitForTimeout(1200)
  // geri gel
  await page.goto(BASE + '/puantaj?bas=2026-02-01&tarih=2026-02-05')
  await page.waitForTimeout(1500)
  const row2 = page.locator('li', { hasText: 'QA Isci' }).first()
  const geldiAktif = await row2.locator('button.bg-emerald-500').count()
  rapor('P7. Puantaj kalıcılık (ileri/geri sonrası Geldi korunur)', geldiAktif === 1, `aktifButon=${geldiAktif}`)

  // ===== ADAY ONAY =====
  await page.goto(BASE + '/adaylar')
  await page.waitForTimeout(1500)
  const body = await page.locator('body').innerText()
  rapor('C1. Pending aday "Onay Bekliyor" görünür', body.includes('QA Aday Pending') && body.includes('Onay Bekliyor'))
  rapor('C2. Approved aday "Onaylandı" görünür', body.includes('QA Aday Approved') && body.includes('Onaylandı'))
  rapor('C3. Rejected aday "Reddedildi" görünür', body.includes('QA Aday Rejected') && body.includes('Reddedildi'))

  // Pending adayda "Onayla & Havuza Aktar" var, Rejected'da yok
  const pendingRow = page.locator('tr', { hasText: 'QA Aday Pending' }).first()
  const rejectedRow = page.locator('tr', { hasText: 'QA Aday Rejected' }).first()
  rapor('C4. Pending adayda Onayla butonu var', await pendingRow.locator('button', { hasText: 'Onayla & Havuza Aktar' }).count() === 1)
  rapor('C5. Rejected adayda Onayla butonu YOK', await rejectedRow.locator('button', { hasText: 'Onayla & Havuza Aktar' }).count() === 0)

  // Pending adayı onayla → işçi havuzunda görünür
  await pendingRow.locator('button', { hasText: 'Onayla & Havuza Aktar' }).click()
  await page.waitForTimeout(1500)
  await page.goto(BASE + '/isci-havuzu?q=QA%20Aday%20Pending')
  await page.waitForTimeout(1500)
  const havuz = await page.locator('body').innerText()
  rapor('C6. Onaylanan aday işçi havuzunda', havuz.includes('QA Aday Pending'))

  // Pending/Rejected adaylar taleplerde atama listesinde görünmez (sadece işçiler)
  await page.goto(BASE + '/talepler')
  await page.waitForTimeout(1200)
  const taleplerBody = await page.locator('body').innerText()
  rapor('C7. Pending/Rejected adaylar taleplerde YOK', !taleplerBody.includes('QA Aday Pending') && !taleplerBody.includes('QA Aday Rejected') && !taleplerBody.includes('QA Aday Approved'))

  // ===== İZOLASYON: vergi ödemesi firma kartını değiştirmemeli =====
  c = await db()
  const firmaOnce = await c.query(`SELECT * FROM "MusteriFirma" WHERE id=$1`, [firma])
  const yetkiliSayisiOnce = (await c.query(`SELECT count(*) FROM "Yetkili" WHERE \"firmaId\"=$1`, [firma])).rows[0].count
  const talepSayisiOnce = (await c.query(`SELECT count(*) FROM "Talep" WHERE \"firmaId\"=$1`, [firma])).rows[0].count
  const evrakSayisiOnce = (await c.query(`SELECT count(*) FROM "Evrak"`)).rows[0].count
  const odemeSayisiOnce = (await c.query(`SELECT count(*) FROM "ResmiOdeme"`)).rows[0].count
  await c.end()

  // Vergi ödemesi ekle (UI)
  await page.goto(BASE + '/vergi-odemeler')
  await page.waitForTimeout(1200)
  await page.getByRole('button', { name: 'Ödeme Ekle' }).click()
  const vf = page.locator('form').filter({ hasText: 'Ödeme Tipi' })
  await vf.locator('input[name="tutar"]').fill('555')
  await vf.locator('input[name="sonOdemeTarihi"]').fill('2026-09-20')
  await vf.getByRole('button', { name: 'Ekle', exact: true }).click()
  await page.waitForTimeout(1500)

  c = await db()
  const firmaSonra = await c.query(`SELECT * FROM "MusteriFirma" WHERE id=$1`, [firma])
  const yetkiliSayisiSonra = (await c.query(`SELECT count(*) FROM "Yetkili" WHERE \"firmaId\"=$1`, [firma])).rows[0].count
  const talepSayisiSonra = (await c.query(`SELECT count(*) FROM "Talep" WHERE \"firmaId\"=$1`, [firma])).rows[0].count
  const evrakSayisiSonra = (await c.query(`SELECT count(*) FROM "Evrak"`)).rows[0].count
  const odemeSayisiSonra = (await c.query(`SELECT count(*) FROM "ResmiOdeme"`)).rows[0].count
  const firmaF = firmaOnce.rows[0], firmaS = firmaSonra.rows[0]
  const firmaAyni = firmaF.ad === firmaS.ad && firmaF.adres === firmaS.adres && firmaF.email === firmaS.email && String(firmaF.vergiNo) === String(firmaS.vergiNo)
  rapor('I1. Vergi ödemesi → Firma alanları UNCHANGED', firmaAyni)
  rapor('I2. Vergi ödemesi → Yetkili/Talep/Evrak sayıları UNCHANGED', String(yetkiliSayisiOnce) === String(yetkiliSayisiSonra) && String(talepSayisiOnce) === String(talepSayisiSonra) && String(evrakSayisiOnce) === String(evrakSayisiSonra))
  rapor('I3. Vergi ödemesi → ResmiOdeme +1', Number(odemeSayisiSonra) === Number(odemeSayisiOnce) + 1, `${odemeSayisiOnce}→${odemeSayisiSonra}`)

  // ID izolasyonu: firmaId ve talepId farklı entity'ler; update'ler isme göre değil id'ye göre
  rapor('I4. ID izolasyonu (firma id ve talep id farklı)', Number(firma) !== Number(talep) && Number(firma) !== Number(adayA), `firma=${firma} talep=${talep} aday=${adayA}`)
  await c.end()

  // ---------- CLEANUP ----------
  c = await db()
  await c.query(`DELETE FROM "Atama" WHERE "isciId"=$1`, [isci])
  await c.query(`DELETE FROM "Talep" WHERE id=$1`, [talep])
  await c.query(`DELETE FROM "Isci" WHERE id=$1`, [isci])
  await c.query(`DELETE FROM "MusteriFirma" WHERE ad LIKE 'QA%'`)
  await c.query(`DELETE FROM "Aday" WHERE ad LIKE 'QA%'`)
  await c.query(`DELETE FROM "ResmiOdeme" WHERE tutar=555`)
  await c.end()

  await browser.close()
  const pass = R.filter((r) => r.ok).length
  console.log(`\nSONUÇ: ${pass}/${R.length} geçti`)
  process.exit(pass === R.length ? 0 : 1)
}
main().catch((e) => { console.error("HATA:", e.stack || e.message); process.exit(1) })