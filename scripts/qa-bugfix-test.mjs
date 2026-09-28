// ATALAY İK CRM — Canlı test bug fix QA (H1, H2, H9)
// Kullanım: npm run dev açıkken → node scripts/qa-bugfix-test.mjs
import { chromium } from 'playwright'
import { createRequire } from 'module'
const require = createRequire(import.meta.url)
const { Client } = require('/Users/adada/Desktop/ik-saha-crm/node_modules/pg')
const BASE = 'http://localhost:3001'
const DSN = 'postgresql://postgres:postgres@localhost:5432/ik_crm'
let FAIL = false
function rapor(name, ok, extra) { if (!ok) FAIL = true; console.log(`${ok ? '✓' : '✗'} ${name}${extra ? ' — ' + extra : ''}`) }
async function db() { const c = new Client({ connectionString: DSN }); await c.connect(); return c }

async function login(page, email, pass) {
  await page.goto(BASE + '/giris')
  await page.waitForTimeout(1200)
  await page.getByLabel('E-posta').fill(email)
  await page.getByLabel('Şifre').fill(pass)
  await page.getByRole('button', { name: 'Giriş Yap' }).click()
  await page.waitForTimeout(2200)
}

async function main() {
  let c = await db()
  // temizlik
  await c.query(`DELETE FROM "Puantaj" WHERE "atamaId" IN (SELECT id FROM "Atama" WHERE "isciId" IN (SELECT id FROM "Isci" WHERE ad LIKE 'QA Bug%'))`)
  await c.query(`DELETE FROM "Atama" WHERE "isciId" IN (SELECT id FROM "Isci" WHERE ad LIKE 'QA Bug%')`)
  await c.query(`DELETE FROM "Talep" WHERE "firmaId" IN (SELECT id FROM "MusteriFirma" WHERE ad LIKE 'QA Bug Firma%')`)
  await c.query(`DELETE FROM "Hakedis" WHERE "isciId" IN (SELECT id FROM "Isci" WHERE ad LIKE 'QA Bug%')`)
  await c.query(`DELETE FROM "FirmaFiyat" WHERE "firmaId" IN (SELECT id FROM "MusteriFirma" WHERE ad LIKE 'QA Bug Firma%')`)
  await c.query(`DELETE FROM "Tahsilat" WHERE "faturaId" IN (SELECT id FROM "Fatura" WHERE "firmaId" IN (SELECT id FROM "MusteriFirma" WHERE ad LIKE 'QA Bug Firma%'))`)
  await c.query(`DELETE FROM "Fatura" WHERE "firmaId" IN (SELECT id FROM "MusteriFirma" WHERE ad LIKE 'QA Bug Firma%')`)
  await c.query(`DELETE FROM "Lokasyon" WHERE "firmaId" IN (SELECT id FROM "MusteriFirma" WHERE ad LIKE 'QA Bug Firma%')`)
  await c.query(`DELETE FROM "Yetkili" WHERE "firmaId" IN (SELECT id FROM "MusteriFirma" WHERE ad LIKE 'QA Bug Firma%')`)
  await c.query(`DELETE FROM "MusteriFirma" WHERE ad LIKE 'QA Bug Firma%'`)
  await c.query(`DELETE FROM "Isci" WHERE ad LIKE 'QA Bug%'`)

  // senaryo: meslek + firma + fiyat + işçi + talep + atama(tamamlandi) + puantaj(geldi)
  const meslekId = (await c.query(`INSERT INTO "Meslek" (ad) VALUES ('QA Bug Kaynakçı') ON CONFLICT (ad) DO NOTHING RETURNING id`)).rows[0]?.id
  const meslek = meslekId ?? (await c.query(`SELECT id FROM "Meslek" WHERE ad='QA Bug Kaynakçı'`)).rows[0].id
  const firma = (await c.query(`INSERT INTO "MusteriFirma" (ad, bolge) VALUES ('QA Bug Firma', 'kocaeli') RETURNING id`)).rows[0].id
  const lokasyon = (await c.query(`INSERT INTO "Lokasyon" ("firmaId", ad) VALUES ($1, 'QA Lokasyon') RETURNING id`, [firma])).rows[0].id
  await c.query(`INSERT INTO "FirmaFiyat" ("firmaId", "meslekId", "kisiGunFiyat") VALUES ($1, $2, 3100)`, [firma, meslek])
  const isci = (await c.query(`INSERT INTO "Isci" (ad, telefon, "tcKimlik", ilce, iban, "dogumTarihi", "gunlukUcretBeklentisi", durum, bolge, "createdAt", "updatedAt") VALUES ('QA Bug İşçi', '+90 500 000 99', '12345678901', 'İzmit', 'TR330006100519786457841326', '1990-01-01', 2000, 'aktif', 'kocaeli', now(), now()) RETURNING id`)).rows[0].id
  await c.query(`INSERT INTO "IsciMeslek" ("isciId", "meslekId") VALUES ($1, $2)`, [isci, meslek])
  const bugun = new Date()
  const yil = bugun.getFullYear(), ay = bugun.getMonth()
  const ortasi = new Date(yil, ay, 15) // ay ortası — TZ dönüşümünde kaymasın
  const talep = (await c.query(`INSERT INTO "Talep" ("firmaId", "lokasyonId", tarih, vardiya, durum) VALUES ($1, $2, $3, 'gunduz', 'dolu') RETURNING id`, [firma, lokasyon, ortasi])).rows[0].id
  await c.query(`INSERT INTO "TalepKalemi" ("talepId", "meslekId", adet) VALUES ($1, $2, 1)`, [talep, meslek])
  const atama = (await c.query(`INSERT INTO "Atama" ("talepId", "isciId", "meslekId", tarih, durum) VALUES ($1, $2, $3, $4, 'tamamlandi') RETURNING id`, [talep, isci, meslek, ortasi])).rows[0].id
  await c.query(`INSERT INTO "Puantaj" ("atamaId", durum) VALUES ($1, 'geldi')`, [atama])
  await c.end()

  const browser = await chromium.launch()
  const ctx = await browser.newContext({ viewport: { width: 1440, height: 900 } })
  const page = await ctx.newPage()
  page.setDefaultTimeout(20000)
  page.on('dialog', (d) => d.accept())
  await login(page, 'admin@ikcrm.com', '123123')

  // ---- H1: Hakediş idempotency ----
  const hakedisGun = async () => {
    const c2 = await db()
    const r = await c2.query(`SELECT gun, "musteriTutar", "isciNet" FROM "Hakedis" WHERE "isciId"=$1`, [isci])
    await c2.end()
    return r.rows[0]
  }
  // debug: QA atama hakedisUret kriterlerine giriyor mu
  const dbg = await db()
  const uygunMu = (await dbg.query(`SELECT a.id, a.durum, a.tarih, p.id AS puantaj FROM "Atama" a LEFT JOIN "Puantaj" p ON p."atamaId"=a.id WHERE a.id=$1 AND a.durum='tamamlandi' AND p.id IS NOT NULL AND a.tarih >= '2026-09-01' AND a.tarih < '2026-10-01'`, [atama])).rows
  console.log('  [debug] QA atama üret kriterinde mi:', JSON.stringify(uygunMu))
  await dbg.end()
  await page.goto(BASE + '/hakedis')
  await page.waitForTimeout(1500)
  // dönemi ayarlayalım: atama 1'inde, üret formu varsayılanı içinde
  await page.getByRole('button', { name: 'Dönemi Üret' }).first().click()
  await page.waitForTimeout(4000)
  const ilk = await hakedisGun()
  const dbg2 = await db()
  console.log('  [debug] ilk üret sonrası hakedis:', JSON.stringify(ilk))
  const atamaDurum = (await dbg2.query(`SELECT durum FROM "Atama" WHERE id=$1`, [atama])).rows[0]
  const puantajDurum = (await dbg2.query(`SELECT p.durum FROM "Puantaj" p WHERE p."atamaId"=$1`, [atama])).rows[0]
  console.log('  [debug] atama:', JSON.stringify(atamaDurum), 'puantaj:', JSON.stringify(puantajDurum))
  await dbg2.end()
  await page.getByRole('button', { name: 'Dönemi Üret' }).first().click()
  await page.waitForTimeout(4000)
  const ikinci = await hakedisGun()
  const dbg3 = await db()
  console.log('  [debug] ikinci üret sonrası hakedis:', JSON.stringify(ikinci))
  const tumH = (await dbg3.query(`SELECT "isciId", gun, "musteriTutar" FROM "Hakedis" WHERE "donemKey"='2026-9' AND "firmaId"=$1`, [firma])).rows
  console.log('  [debug] firma bazlı hakedis:', JSON.stringify(tumH))
  await dbg3.end()
  rapor('H1a. Üret 2 kez basıldı, gun aynı kaldı (1)', ikinci && ilk && ikinci.gun === ilk.gun && ilk.gun === 1, `gun ${ilk?.gun} -> ${ikinci?.gun}`)
  rapor('H1b. müşteri tutar 3100 (katlanmadı)', ikinci && Number(ikinci.musteriTutar) === 3100, `müşteri=${ikinci?.musteriTutar}`)
  rapor('H1c. net 2000, marj 1100', ikinci && Number(ikinci.isciNet) === 2000, `net=${ikinci?.isciNet}`)

  // ---- H2 + H9: Fatura kes (boş no) + kısmi tahsilat ----
  await page.goto(BASE + '/faturalar')
  await page.waitForTimeout(1200)
  await page.getByRole('button', { name: 'Fatura Kes' }).click()
  await page.waitForTimeout(600)
  await page.locator('select[name="firmaId"]').selectOption(String(firma))
  await page.locator('input[name="kesimTarihi"]').fill('2026-09-20')
  await page.locator('input[name="donem"]').fill('2026-09')
  await page.locator('input[name="vadeTarihi"]').fill('2026-10-28')
  await page.locator('input[name="araToplam"]').fill('3100')
  await page.getByRole('button', { name: 'Faturayı Kes' }).click()
  await page.waitForTimeout(2500)

  let c3 = await db()
  const fat = (await c3.query(`SELECT id, no, "genelToplam" FROM "Fatura" WHERE "firmaId"=$1 AND "silindi"=false ORDER BY id DESC LIMIT 1`, [firma])).rows[0]
  await c3.end()
  rapor('H9. Fatura no otomatik IKR-YYYY-NNN', fat && /^IKR-\d{4}-\d{3}$/.test(fat.no), fat?.no)

  // form temizlendi mi (H5): tekrar açıp net alanı boş olmalı
  await page.getByRole('button', { name: 'Fatura Kes' }).click()
  await page.waitForTimeout(600)
  const netDegeri = await page.locator('input[name="araToplam"]').inputValue()
  rapor('H5. Form kayıt sonrası temizlendi', netDegeri === '', `net="${netDegeri}"`)
  await page.getByRole('button', { name: 'Vazgeç' }).click()

  // kısmi tahsilat (2000 < 3720 genel)
  await page.goto(BASE + '/faturalar')
  await page.waitForTimeout(1200)
  const satir = page.locator('tr', { hasText: fat.no })
  const tahsilatInput = satir.locator('input[name="tutar"]').first()
  await tahsilatInput.fill('2000')
  await satir.locator('button[title="Tahsilat kaydet"]').first().click()
  await page.waitForTimeout(2500)

  let c4 = await db()
  const durum = (await c4.query(`SELECT durum FROM "Fatura" WHERE id=$1`, [fat.id])).rows[0]?.durum
  const toplamTah = (await c4.query(`SELECT COALESCE(SUM(tutar),0) t FROM "Tahsilat" WHERE "faturaId"=$1`, [fat.id])).rows[0].t
  await c4.end()
  rapor('H2. Kısmi tahsilat durumu "kismi" oldu (odendi değil)', durum === 'kismi', `durum=${durum} tahsilat=${toplamTah}`)

  // durum rozeti UI'da "Kısmi Ödendi" görünüyor mu
  await page.goto(BASE + '/faturalar')
  await page.waitForTimeout(1200)
  const rozet = await page.locator('tr', { hasText: fat.no }).getByText('Kısmi Ödendi').count()
  rapor('H2b. UI rozet "Kısmi Ödendi" gösteriyor', rozet > 0)

  // ---- H4: fatura iptal (tahsilatsız) ----
  // yeni tahsilatsız fatura kesip iptal denemek için basitçe mevcut UI'ı kontrol etmeyelim;
  // tahsilatlı olan için iptal engeli: sil-buton yerine kilit ikonu olmalı
  const kilit = await page.locator('tr', { hasText: fat.no }).locator('span[title="Tahsilatı olan fatura iptal edilemez"]').count()
  rapor('H4. Tahsilatlı faturada iptal engeli görünüyor', kilit > 0)

  if (!process.env.KEEP) {
  let c5 = await db()
  await c5.query(`DELETE FROM "Puantaj" WHERE "atamaId"=$1`, [atama])
  await c5.query(`DELETE FROM "Atama" WHERE id=$1`, [atama])
  await c5.query(`DELETE FROM "TalepKalemi" WHERE "talepId"=$1`, [talep])
  await c5.query(`DELETE FROM "Talep" WHERE id=$1`, [talep])
  await c5.query(`DELETE FROM "Hakedis" WHERE "isciId"=$1`, [isci])
  await c5.query(`DELETE FROM "IsciMeslek" WHERE "isciId"=$1`, [isci])
  await c5.query(`DELETE FROM "Isci" WHERE id=$1`, [isci])
  await c5.query(`DELETE FROM "FirmaFiyat" WHERE "firmaId"=$1`, [firma])
  await c5.query(`DELETE FROM "Tahsilat" WHERE "faturaId"=$1`, [fat.id])
  await c5.query(`DELETE FROM "Fatura" WHERE id=$1`, [fat.id])
  await c5.query(`DELETE FROM "Lokasyon" WHERE "firmaId"=$1`, [firma])
  await c5.query(`DELETE FROM "Yetkili" WHERE "firmaId"=$1`, [firma])
  await c5.query(`DELETE FROM "MusteriFirma" WHERE id=$1`, [firma])
  await c5.query(`DELETE FROM "Meslek" WHERE id=$1`, [meslek])
  await c5.end()
} else {
  console.log('  [debug] KEEP=1 — QA verisi silinmedi')
}

  await browser.close()
  console.log(`\n===== SONUÇ: geçti/kaldı kontrol =====`)
  process.exit(FAIL ? 1 : 0)
}

main().catch((e) => { console.error('HATA:', e.stack || e.message); process.exit(1) })