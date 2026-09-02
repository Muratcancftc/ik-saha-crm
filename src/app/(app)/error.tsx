'use client'

import { useEffect } from 'react'

export default function AppError({
  error,
  reset,
}: {
  error: Error & { digest?: string }
  reset: () => void
}) {
  useEffect(() => {
    console.error('Uygulama hatası:', error)
  }, [error])

  return (
    <div className="flex min-h-[50vh] flex-col items-center justify-center text-center">
      <div className="rounded-2xl bg-white p-8 shadow-sm ring-1 ring-slate-200">
        <h2 className="text-lg font-semibold text-slate-900">Bir şeyler ters gitti</h2>
        <p className="mt-1 text-sm text-slate-500">Hata kodu: {error.digest ?? 'bilinmiyor'}</p>
        <button
          onClick={reset}
          className="mt-4 rounded-lg bg-indigo-600 px-4 py-2 text-sm font-medium text-white transition hover:bg-indigo-500"
        >
          Tekrar Dene
        </button>
      </div>
    </div>
  )
}