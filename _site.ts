import puppeteer from 'puppeteer-core'
const PAGES = ['/', '/isci-havuzu', '/talepler', '/takvim', '/puantaj', '/hakedis', '/gelir-gider', '/faturalar', '/vergi-odemeler', '/musteri-firmalar', '/personel', '/belge-sgk', '/adaylar', '/odeme', '/raporlar', '/evrak', '/ayarlar', '/bildirimler']
async function main() {
  const browser = await puppeteer.launch({ executablePath: '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome', headless: true, args: ['--no-sandbox'] })
  const page = await browser.newPage()
  page.setDefaultTimeout(15000)
  const sorun: string[] = []
  await page.goto('http://localhost:3000/giris', { waitUntil: 'networkidle0' })
  await page.type('input[name="email"]', 'admin@ikcrm.com')
  await page.type('input[name="password"]', '123123')
  await page.click('button[type="submit"]')
  await new Promise((r) => setTimeout(r, 1800))
  for (const p of PAGES) {
    const errs: string[] = []
    page.on('pageerror', (e) => errs.push(e.message.slice(0, 100)))
    await page.goto('http://localhost:3000' + p, { waitUntil: 'networkidle0', timeout: 15000 }).catch(() => {})
    await new Promise((r) => setTimeout(r, 800))
    const bos = await page.evaluate(() => document.body.innerText.trim().length < 40)
    const hataE = await page.evaluate(() => document.body.innerText.includes('Bir şeyler ters gitti'))
    if (bos || hataE || errs.length) sorun.push(`${p} bos:${bos} hata:${hataE} err:${errs[0] ?? ''}`)
  }
  console.log('SORUN:', sorun.length ? sorun.join(' | ') : 'YOK 🎉')
  await browser.close()
}
main()
