import {
  gorunenSatirlar,
  satirEtiket,
  satirDegeri,
  kurusToTl,
  oranYuzde,
  type MaliyetGirdi,
  type MaliyetHesap,
  type MaliyetOranlar,
} from '@/lib/maliyet'

export type MaliyetPozisyonGorunum = {
  ad: string
  girdi: MaliyetGirdi
  hesap: MaliyetHesap
}

type Tema = 'admin' | 'musteri'

// Maliyet tablosu — admin önizleme, müşteri sayfası ve print görünümü ortak kullanır.
// Satır sırası ve kalın satırlar `MALIYET_SATIRLARI` üzerinden BİREBİR korunur.
export function MaliyetTablo({
  oranlar,
  pozisyonlar,
  karGizli,
  tema = 'admin',
}: {
  oranlar: MaliyetOranlar
  pozisyonlar: MaliyetPozisyonGorunum[]
  karGizli: boolean
  tema?: Tema
}) {
  const satirlar = gorunenSatirlar(karGizli)
  const karOranlari = pozisyonlar.map((p) => p.hesap.karOran)
  const tekOran = karOranlari.length > 0 && karOranlari.every((o) => o === karOranlari[0])

  const renk =
    tema === 'musteri'
      ? {
          cerceve: 'border-[#12104A]/15',
          baslik: 'bg-[#12104A] text-white',
          altBaslik: 'bg-[#12104A]/5 text-[#12104A]',
          kalin: 'bg-[#FCEB8E]/40 font-semibold text-[#12104A]',
          satir: 'text-[#12104A]/80',
          cizgi: 'border-[#12104A]/10',
          oran: 'text-[#12104A]/60',
        }
      : {
          cerceve: 'border-slate-200',
          baslik: 'bg-slate-800 text-white',
          altBaslik: 'bg-slate-100 text-slate-600',
          kalin: 'bg-slate-100 font-semibold text-slate-900',
          satir: 'text-slate-700',
          cizgi: 'border-slate-100',
          oran: 'text-slate-400',
        }

  return (
    <div className={`overflow-x-auto rounded-xl border ${renk.cerceve}`}>
      <table className="w-full border-collapse text-sm">
        <thead>
          <tr className={renk.baslik}>
            <th className="px-3 py-2.5 text-left text-xs font-semibold">Kalem</th>
            <th className="px-3 py-2.5 text-right text-xs font-semibold">Oran</th>
            {pozisyonlar.map((p) => (
              <th key={p.ad} className="px-3 py-2.5 text-right text-xs font-semibold">
                {p.ad}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {satirlar.map((s) => {
            const karSatiri = s.oranSutunu
            return (
              <tr key={String(s.anahtar)} className={`border-t ${renk.cizgi} ${s.kalin ? renk.kalin : renk.satir}`}>
                <td className="px-3 py-2">{satirEtiket(s, oranlar)}</td>
                <td className={`px-3 py-2 text-right ${renk.oran}`}>
                  {karSatiri ? (tekOran ? oranYuzde(karOranlari[0]) : '') : ''}
                </td>
                {pozisyonlar.map((p) => (
                  <td key={p.ad} className="px-3 py-2 text-right tabular-nums">
                    {kurusToTl(satirDegeri(s, p.girdi, p.hesap))}
                    {karSatiri && !tekOran && (
                      <div className={`text-[11px] ${renk.oran}`}>{oranYuzde(p.hesap.karOran)}</div>
                    )}
                  </td>
                ))}
              </tr>
            )
          })}
        </tbody>
      </table>
    </div>
  )
}
