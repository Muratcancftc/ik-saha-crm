import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Giriş | İK Saha",
};

export default function AuthLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="min-h-screen bg-slate-50 lg:grid lg:grid-cols-2">
      <div className="hidden lg:flex flex-col justify-between bg-gradient-to-br from-slate-900 via-indigo-950 to-indigo-900 p-12 text-white">
        <div className="flex items-center gap-3">
          <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-white/10 text-lg font-bold ring-1 ring-white/20">
            İ
          </div>
          <span className="text-lg font-semibold tracking-tight">İK Saha</span>
        </div>
        <div className="max-w-md">
          <h2 className="text-3xl font-semibold leading-tight">
            Sahadaki gücünüzü tek panelden yönetin.
          </h2>
          <p className="mt-4 text-sm leading-relaxed text-indigo-200">
            İşçi havuzu, talep-atama, puantaj, hakediş, fatura ve resmi ödeme takibi — tamamı rol
            bazlı yetkilendirme ile.
          </p>
          <div className="mt-8 grid grid-cols-3 gap-3 text-center">
            {[
              ['22+', 'Aktif İşçi'],
              ['4', 'Müşteri Firma'],
              ['4', 'Rol'],
            ].map(([v, l]) => (
              <div key={l} className="rounded-xl bg-white/5 p-3 ring-1 ring-white/10">
                <div className="text-xl font-bold">{v}</div>
                <div className="mt-0.5 text-[11px] text-indigo-200">{l}</div>
              </div>
            ))}
          </div>
        </div>
        <div className="text-xs text-indigo-300">© 2026 İK Saha — saha işgücü otomasyonu</div>
      </div>

      <div className="flex min-h-screen items-center justify-center p-6">
        <div className="w-full max-w-sm">
          <div className="mb-8 lg:hidden">
            <div className="flex items-center gap-3">
              <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-indigo-600 text-lg font-bold text-white">
                İ
              </div>
              <span className="text-lg font-semibold tracking-tight text-slate-900">İK Saha</span>
            </div>
          </div>
          <h1 className="text-2xl font-semibold tracking-tight text-slate-900">Hoş geldiniz</h1>
          <p className="mt-1 text-sm text-slate-500">Hesabınızla devam etmek için giriş yapın.</p>
          {children}
        </div>
      </div>
    </div>
  );
}