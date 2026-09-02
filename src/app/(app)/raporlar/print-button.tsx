'use client'

import { Icon } from '@/components/icons'

export function PrintButton() {
  return (
    <button
      onClick={() => window.print()}
      className="inline-flex items-center gap-1.5 rounded-lg bg-white px-3 py-2 text-sm font-medium text-red-600 ring-1 ring-red-200 transition hover:bg-red-50"
    >
      <Icon name="pdf" size={15} /> PDF
    </button>
  )
}