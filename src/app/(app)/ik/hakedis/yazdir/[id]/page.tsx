import { notFound } from 'next/navigation'
import Image from 'next/image'
import { requireRoles } from '@/lib/dal'
import { prisma } from '@/lib/db'
import { decrypt, maskIBAN } from '@/lib/crypto'
import { tl, yuvarla, tarihTr } from '@/lib/ik'
import { PrintButton } from '../print-button'

export const dynamic = 'force-dynamic'

export default async function BordroYazdirPage({ params }: { params: Promise<{ id: string }> }) {
  await requireRoles(['patron', 'muhasebe', 'operasyon', 'ik'])
  const { id } = await params
  const donemId = Number(id)
  if (!donemId) notFound()

  const donem = await prisma.odemeDonemi.findUnique({
    where: { id: donemId },
    include: {
      isci: true,
      firma: true,
      odemeler: true,
    },
  })
  if (!donem) notFound()

  const puantajlar = await prisma.puantajKayit.findMany({
    where: { isciId: donem.isciId, firmaId: donem.firmaId, tarih: { gte: donem.baslangic, lt: donem.bitis } },
    orderBy: { tarih: 'asc' },
  })
  const odenen = yuvarla(donem.odemeler.reduce((a, o) => a + Number(o.tutar), 0))

  return (
    <div className="mx-auto max-w-3xl bg-white p-8 print:p-0">
      <div className="mb-6 flex items-center justify-between border-b-2 border-slate-800 pb-4">
        <div className="flex items-center gap-3">
          <div className="h-12 w-12 overflow-hidden rounded-xl bg-[#151515]">
            <Image src="/atalay-logo.png" alt="Atalay" width={48} height={48} className="h-full w-full object-contain" />
          </div>
          <div>
            <div className="text-lg font-bold text-slate-900">ATALAY İnsan Kaynakları</div>
            <div className="text-xs text-slate-500">Personel Hakediş / Ödeme Bordrosu</div>
          </div>
        </div>
        <PrintButton />
      </div>

      <div className="mb-5 grid grid-cols-2 gap-4 text-sm">
        <div>
          <div className="text-xs font-semibold uppercase text-slate-400">Personel</div>
          <div className="mt-0.5 font-semibold text-slate-900">{donem.isci.ad}</div>
          <div className="text-slate-500">{donem.isci.telefon}</div>
          <div className="text-slate-500">IBAN: {maskIBAN(decrypt(donem.isci.iban))}</div>
        </div>
        <div className="text-right">
          <div className="text-xs font-semibold uppercase text-slate-400">Dönem</div>
          <div className="mt-0.5 font-semibold text-slate-900">{tarihTr(donem.baslangic)} – {tarihTr(new Date(donem.bitis.getTime() - 86400000))}</div>
          <div className="text-slate-500">Firma: {donem.firma.ad}</div>
          <div className="text-slate-500">Bordro No: BDR-{String(donem.id).padStart(5, '0')}</div>
        </div>
      </div>

      <table className="mb-4 w-full border-collapse text-sm">
        <thead>
          <tr className="bg-slate-100 text-left">
            <th className="border border-slate-200 px-3 py-2 text-xs font-semibold uppercase text-slate-600">Tarih</th>
            <th className="border border-slate-200 px-3 py-2 text-xs font-semibold uppercase text-slate-600">Gün/Saat</th>
            <th className="border border-slate-200 px-3 py-2 text-xs font-semibold uppercase text-slate-600">Mesai</th>
            <th className="border border-slate-200 px-3 py-2 text-right text-xs font-semibold uppercase text-slate-600">Uyg. Ücret</th>
            <th className="border border-slate-200 px-3 py-2 text-right text-xs font-semibold uppercase text-slate-600">Tutar</th>
          </tr>
        </thead>
        <tbody>
          {puantajlar.map((p) => (
            <tr key={p.id}>
              <td className="border border-slate-200 px-3 py-1.5">{tarihTr(p.tarih)}</td>
              <td className="border border-slate-200 px-3 py-1.5">
                {p.calismaTipi === 'SAATLIK' ? `${Number(p.calisilanSaat)} sa` : Number(p.fsi) === 0 ? 'Gelmedi' : Number(p.fsi) === 0.5 ? 'Yarım' : 'Tam'}
              </td>
              <td className="border border-slate-200 px-3 py-1.5">{Number(p.mesaiSaat) > 0 ? `${Number(p.mesaiSaat)} sa` : '—'}</td>
              <td className="border border-slate-200 px-3 py-1.5 text-right tabular-nums">
                {p.calismaTipi === 'SAATLIK' ? tl(Number(p.uygulananSaatlikUcret)) : tl(Number(p.uygulananGunlukUcret))}
              </td>
              <td className="border border-slate-200 px-3 py-1.5 text-right tabular-nums">{tl(Number(p.hesaplananTutar))}</td>
            </tr>
          ))}
          {puantajlar.length === 0 && (
            <tr><td colSpan={5} className="border border-slate-200 px-3 py-3 text-center text-slate-400">Puantaj kaydı yok</td></tr>
          )}
        </tbody>
      </table>

      <div className="ml-auto w-full max-w-xs space-y-1.5 text-sm">
        <Satir label="Brüt Hakediş" value={tl(Number(donem.brutHakedis))} />
        <Satir label="Toplam Avans" value={`- ${tl(Number(donem.toplamAvans))}`} />
        <Satir label="Toplam Kesinti" value={`- ${tl(Number(donem.toplamKesinti))}`} />
        <div className="flex justify-between border-t-2 border-slate-800 pt-1.5 text-base font-bold">
          <span>Net Ödenen</span>
          <span className="tabular-nums">{tl(Number(donem.netOdenecek))}</span>
        </div>
        <Satir label="Fiilen Ödenen" value={tl(odenen)} />
      </div>

      {donem.odemeler.length > 0 && (
        <div className="mt-6">
          <div className="mb-2 text-xs font-semibold uppercase text-slate-400">Ödeme Kayıtları</div>
          <ul className="space-y-1 text-xs text-slate-600">
            {donem.odemeler.map((o) => (
              <li key={o.id}>
                {tarihTr(o.tarih)} — <b>{tl(Number(o.tutar))}</b> · {o.yontem === 'IBAN' ? 'IBAN/Havale' : 'Elden (Zarf)'}
                {o.yontem === 'ELDEN' && o.zarfNo ? ` · Zarf: ${o.zarfNo}` : ''}
                {o.yontem === 'ELDEN' && o.teslimAlan ? ` · Teslim alan: ${o.teslimAlan}` : ''}
                {o.yontem === 'IBAN' && o.hesapSahibi ? ` · Hesap: ${o.hesapSahibi}` : ''}
              </li>
            ))}
          </ul>
        </div>
      )}

      <div className="mt-10 grid grid-cols-2 gap-8 text-xs text-slate-500">
        <div className="border-t border-slate-300 pt-2">Personel İmza</div>
        <div className="border-t border-slate-300 pt-2">Yetkili İmza / Kaşe</div>
      </div>
    </div>
  )
}

function Satir({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex justify-between">
      <span className="text-slate-500">{label}</span>
      <span className="tabular-nums font-medium text-slate-800">{value}</span>
    </div>
  )
}