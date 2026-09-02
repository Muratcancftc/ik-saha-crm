import { requireUser } from '@/lib/dal'
import { prisma } from '@/lib/db'
import { tl, num, dateLong } from '@/lib/format'
import { PrintButton } from './print-button'

export const dynamic = 'force-dynamic'

export default async function HakedisIcmalPage() {
  const user = await requireUser()
  if (!['patron', 'muhasebe'].includes(user.rol)) return null

  const hakedisler = await prisma.hakedis.findMany({
    include: { isci: true, firma: true },
    orderBy: { donemBitis: 'desc' },
  })

  const toplamIsciNet = hakedisler.reduce((a, h) => a + Number(h.isciNet), 0)
  const toplamMusteri = hakedisler.reduce((a, h) => a + Number(h.musteriTutar), 0)
  const toplamMarj = hakedisler.reduce((a, h) => a + Number(h.marj), 0)

  return (
    <div className="mx-auto max-w-4xl px-10 py-8">
      <style>{`
        .icmal table { width: 100%; border-collapse: collapse; font-size: 12px; }
        .icmal th { text-align: right; padding: 8px 6px; border-bottom: 1px solid #cbd5e1; font-size: 10px; text-transform: uppercase; color: #64748b; }
        .icmal th:nth-child(1), .icmal th:nth-child(2), .icmal th:nth-child(3), .icmal th:nth-child(4) { text-align: left; }
        .icmal td { padding: 7px 6px; border-bottom: 1px solid #e2e8f0; text-align: right; font-variant-numeric: tabular-nums; }
        .icmal td:nth-child(1), .icmal td:nth-child(2), .icmal td:nth-child(3), .icmal td:nth-child(4) { text-align: left; }
        .icmal tfoot td { border-top: 2px solid #0f172a; font-weight: 700; }
        @media print { .print-btn { display: none; } .icmal { margin: 0; padding: 0; } }
      `}</style>

      <div className="print-btn mb-5 flex items-center justify-between">
        <a href="/hakedis" className="text-sm text-slate-500 hover:underline">← Hakediş'e dön</a>
        <PrintButton />
      </div>

      <div className="icmal">
        <div className="flex items-end justify-between border-b-[3px] border-slate-900 pb-3">
          <div>
            <h1 className="text-xl font-bold">Hakediş &amp; Marj İcmali</h1>
            <div className="mt-1 text-xs text-slate-500">{user.ad} · {dateLong(new Date())} · İK Saha</div>
          </div>
        </div>

        <div className="mt-6 overflow-x-auto">
          <table>
            <thead>
              <tr>
                <th>İşçi</th>
                <th>Firma</th>
                <th>Dönem</th>
                <th>Gün</th>
                <th>Yevmiye</th>
                <th>İşçi Net</th>
                <th>Müşteri</th>
                <th>Marj</th>
              </tr>
            </thead>
            <tbody>
              {hakedisler.map((h) => (
                <tr key={h.id}>
                  <td>{h.isci.ad}</td>
                  <td>{h.firma.ad}</td>
                  <td>{dateLong(h.donemBas)}</td>
                  <td>{h.gun}</td>
                  <td>{tl(h.yevmiye)}</td>
                  <td>{tl(h.isciNet)}</td>
                  <td>{tl(h.musteriTutar)}</td>
                  <td>{tl(h.marj)}</td>
                </tr>
              ))}
            </tbody>
            <tfoot>
              <tr>
                <td colSpan={4}>TOPLAM</td>
                <td></td>
                <td>{tl(toplamIsciNet)}</td>
                <td>{tl(toplamMusteri)}</td>
                <td>{tl(toplamMarj)}</td>
              </tr>
            </tfoot>
          </table>
        </div>

        <div className="mt-6 flex gap-10 text-sm">
          <div>Toplam Hakediş<b className="block text-lg">{tl(toplamMusteri)}</b></div>
          <div>İşçiye Net<b className="block text-lg">{tl(toplamIsciNet)}</b></div>
          <div>Brüt Marj<b className="block text-lg">{tl(toplamMarj)}</b></div>
          <div>Kayıt<b className="block text-lg">{num(hakedisler.length)}</b></div>
        </div>
      </div>
    </div>
  )
}