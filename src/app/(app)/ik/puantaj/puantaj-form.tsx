'use client'

import { useActionState } from 'react'
import { puantajGir, puantajToplu, puantajSil } from '@/app/actions/ik'

type State = { ok?: boolean; error?: string; uyari?: string } | undefined

export function PuantajForm({
  tip,
  className,
  children,
}: {
  tip: 'gir' | 'toplu' | 'sil'
  className?: string
  children: React.ReactNode
}) {
  const fn = tip === 'gir' ? puantajGir : tip === 'toplu' ? puantajToplu : puantajSil
  const [state, formAction] = useActionState<State, FormData>(async (_prev, formData) => fn(formData), undefined)

  return (
    <form action={formAction} className={className}>
      {children}
      {state?.error && <p className="w-full px-1 pt-1 text-[11px] font-medium text-red-600">{state.error}</p>}
      {state?.uyari && <p className="w-full px-1 pt-1 text-[11px] font-medium text-amber-600">{state.uyari}</p>}
    </form>
  )
}
