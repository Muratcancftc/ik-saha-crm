import { notFound } from 'next/navigation'
import Link from 'next/link'
import { requireRoles } from '@/lib/dal'
import { getPersonelProfil } from '@/lib/profil-queries'
import { donemAralik, donemEtiket } from '@/lib/donem'
import { tl, num, date, dateLong } from '@/lib/format'
import { Card, CardHeader, Badge, Button, Th, Td, EmptyState } from '@/components/ui'
import { Icon } from '@/components/icons'
import { DonemSecici } from '@/components/donem-secici'
import { izinEkle } from '@/app/actions/personel'

export const dynamic = 'force-dynamic'

export default async function PersonelProfilPage({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>
  searchParams: Promise<{ donem?: string; bas?: string; bit?: string }>
}) {
  await requireRoles(['patron', 'muhasebe'])
  const { id } = await params
  const personelId = Number(id)
  const sp = await searchParams
  const donem = donemAralik(sp)

  const personel = await getPersonelProfil(personelId)
  if (!personel) notFound()

  const donemIzinler = personel.izinler.filter((i) => i.tarih >= donem.bas && i.tarih < donem.bit)

  return (
    <div className="space-y-5">
      {/* Başlık */}
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-3">
          <Link href="/personel" className="rounded-lg p-2 text-slate-400 hover:bg-slate-100 hover:text-slate-700">
            <Icon name="x" size={18} />
          </Link>
          <div>
            <div className="flex items-center gap-2">
              <h2 className="text-lg font-semibold text-slate-900">{personel.ad}</h2>
              <Badge tone={personel.durum === 'aktif' ? 'green' : 'slate'}>{personel.durum}</Badge>
            </div>
            <p className="text-xs text-slate-500">{personel.departman} · {personel.rol}</p>
          </div>
        </div>
        <div className="flex flex-col items-end gap-2">
          <DonemSecici />
          <span className="text-xs text-slate-400">{donemEtiket(donem)}</span>
        </div>
      </div>

      {/* Özet */}
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-5">
        <Ozet label="Aylık Maaş" value={tl(personel.maas)} tone="text-indigo-600" />
        <Ozet label="SGK İşveren (~%20,5)" value={tl(personel.sgkIsveren)} tone="text-amber-600" />
        <Ozet label="Aylık Maliyet" value={tl(personel.toplamMaliyet)} tone="text-violet-600" />
        <Ozet label="İzin Bakiye" value={`${num(personel.izinBakiyesi)} gün`} tone="text-emerald-600" />
        <Ozet label="Kullanılan İzin" value={`${num(personel.izinKullanilan)} gün`} tone="text-blue-600" />
      </div>

      <div className="grid grid-cols-1 gap-5 xl:grid-cols-2">
        {/* Bilgiler */}
        <Card>
          <CardHeader title="Personel Bilgileri" desc="Bordro ve kimlik bilgileri" />
          <div className="px-5 py-4">
            <dl className="grid grid-cols-2 gap-x-6 gap-y-2.5 text-sm">
              <Satir label="İşe Giriş" value={date(personel.iseGiris)} />
              <Satir label="IBAN" value={personel.ibanMasked} />
              <Satir label="SGK Durum" value={personel.sgkDurum} />
              <Satir label="Rapor Günü" value={`${num(personel.raporGun)} gün`} />
            </dl>
          </div>
        </Card>

        {/* Departman / rol / maaş geçmişi */}
        <Card>
          <CardHeader title="Departman / Rol Geçmişi" desc="Değişiklik kayıtları" />
          <div className="px-5 py-4">
            {personel.gecmis.length === 0 ? (
              <p className="text-sm text-slate-400">Değişiklik kaydı yok</p>
            ) : (
              <ul className="divide-y divide-slate-50">
                {personel.gecmis.map((g) => (
                  <li key={g.id} className="flex items-center justify-between py-2 text-sm">
                    <div>
                      <div className="font-medium text-slate-800">{g.alan}</div>
                      <div className="text-xs text-slate-400">{date(g.tarih)}</div>
                    </div>
                    <div className="flex items-center gap-1.5 text-xs">
                      <span className="text-slate-400 line-through">{g.eskiDeger}</span>
                      <Icon name="chevron" size={12} className="text-slate-400" />
                      <span className="font-semibold text-slate-800">{g.yeniDeger}</span>
                    </div>
                  </li>
                ))}
              </ul>
            )}
          </div>
        </Card>
      </div>

      {/* İzin geçmişi */}
      <Card>
        <CardHeader
          title={`İzin Geçmişi (${donem.etiket})`}
          desc={`Bu dönem ${num(donemIzinler.filter((i) => i.tip === 'izin').reduce((a, i) => a + i.gun, 0))} gün izin, ${num(donemIzinler.filter((i) => i.tip === 'rapor').reduce((a, i) => a + i.gun, 0))} gün rapor`}
          action={<IzinForm personelId={personel.id} />}
        />
        <div className="overflow-x-auto">
          {donemIzinler.length === 0 ? (
            <EmptyState icon="personel" title="Bu dönemde izin kaydı yok" />
          ) : (
            <table className="w-full">
              <thead>
                <tr className="border-b border-slate-100">
                  <Th>Tarih</Th>
                  <Th>Tip</Th>
                  <Th className="text-right">Gün</Th>
                  <Th>Not</Th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-50">
                {donemIzinler.map((i) => (
                  <tr key={i.id} className="hover:bg-slate-50/60">
                    <Td>{dateLong(i.tarih)}</Td>
                    <Td>
                      <Badge tone={i.tip === 'izin' ? 'blue' : 'amber'}>{i.tip}</Badge>
                    </Td>
                    <Td className="text-right tabular-nums">{num(i.gun)}</Td>
                    <Td className="text-slate-500">{i.not ?? '—'}</Td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
      </Card>
    </div>
  )
}

function Ozet({ label, value, tone }: { label: string; value: string; tone: string }) {
  return (
    <Card className="px-3 py-3 text-center">
      <div className={`text-xl font-semibold tabular-nums ${tone}`}>{value}</div>
      <div className="mt-0.5 text-[10px] font-medium uppercase tracking-wide text-slate-400">{label}</div>
    </Card>
  )
}

function Satir({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex justify-between gap-3">
      <dt className="text-slate-400">{label}</dt>
      <dd className="text-right font-medium tabular-nums text-slate-800">{value}</dd>
    </div>
  )
}

function IzinForm({ personelId }: { personelId: number }) {
  return (
    <form action={izinEkle} className="flex flex-wrap items-center gap-1.5">
      <input type="hidden" name="personelId" value={personelId} />
      <select name="tip" className="rounded-lg border border-slate-300 px-2 py-1.5 text-xs outline-none focus:border-indigo-500">
        <option value="izin">İzin</option>
        <option value="rapor">Rapor</option>
      </select>
      <input name="tarih" type="date" required className="rounded-lg border border-slate-300 px-2 py-1.5 text-xs outline-none focus:border-indigo-500" />
      <input name="gun" type="number" min={1} required placeholder="Gün" className="w-16 rounded-lg border border-slate-300 px-2 py-1.5 text-xs outline-none focus:border-indigo-500" />
      <Button type="submit" size="sm">Ekle</Button>
    </form>
  )
}