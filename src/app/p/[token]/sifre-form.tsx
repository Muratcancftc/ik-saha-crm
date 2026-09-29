export function SifreForm({ token, hata }: { token: string; hata?: string }) {
  const mesaj =
    hata === 'kilitli' || hata === 'kilitlendi'
      ? 'Çok fazla hatalı deneme. Lütfen 15 dakika sonra tekrar deneyin.'
      : hata === 'yanlis'
        ? 'Şifre hatalı. Tekrar deneyin.'
        : hata === 'suresiz'
          ? 'Bu bağlantının geçerlilik süresi dolmuş.'
          : hata === 'yok'
            ? 'Bu bağlantı için şifre doğrulaması yapılamadı.'
            : null

  return (
    <div className="mx-auto max-w-md rounded-2xl border border-[#12104A]/10 bg-white p-8">
      <div className="mb-1 text-center text-xs font-semibold uppercase tracking-widest text-[#12104A]/50">Güvenli Erişim</div>
      <h1 className="text-center text-lg font-semibold text-[#12104A]">Bu sayfa size özeldir</h1>
      <p className="mt-1 text-center text-sm text-[#12104A]/70">
        Paylaşılan içeriği görüntülemek için size iletilen erişim şifresini girin.
      </p>

      {mesaj && (
        <div className="mt-4 rounded-lg border border-[#12104A]/15 bg-[#FCEB8E]/40 px-3 py-2 text-center text-sm text-[#12104A]">
          {mesaj}
        </div>
      )}

      <form method="post" action={`/api/public/paylasim/${token}/dogrula`} className="mt-5 space-y-3">
        <input
          name="sifre"
          inputMode="numeric"
          autoComplete="one-time-code"
          maxLength={6}
          required
          placeholder="4–6 haneli şifre"
          className="w-full rounded-xl border border-[#12104A]/20 bg-white px-4 py-3 text-center text-lg tracking-[0.5em] text-[#12104A] outline-none focus:border-[#12104A]"
        />
        <button
          type="submit"
          className="w-full rounded-xl bg-[#12104A] px-4 py-3 text-sm font-semibold text-white transition hover:bg-[#12104A]/90"
        >
          Görüntüle
        </button>
      </form>
    </div>
  )
}
