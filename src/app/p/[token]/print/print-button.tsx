'use client'

export function PrintButton() {
  return (
    <button
      onClick={() => window.print()}
      className="rounded-xl bg-[#12104A] px-4 py-2 text-sm font-semibold text-white hover:bg-[#12104A]/90"
    >
      PDF olarak kaydet / Yazdır
    </button>
  )
}
