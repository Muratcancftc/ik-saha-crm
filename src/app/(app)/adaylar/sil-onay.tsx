'use client'

import { Icon } from '@/components/icons'

// Sil gibi geri döndürülemez işlemler için onaylı form
export function SilOnayForm({ action, id, baslik }: { action: (formData: FormData) => void; id: number; baslik: string }) {
  return (
    <form
      action={action}
      onSubmit={(e) => {
        if (!window.confirm(`${baslik} — kalıcı olarak silinsin mi?`)) e.preventDefault()
      }}
    >
      <input type="hidden" name="id" value={id} />
      <button
        type="submit"
        className="rounded-lg p-1.5 text-slate-400 transition hover:bg-red-50 hover:text-red-600"
        title="Kalıcı olarak sil"
      >
        <Icon name="trash" size={15} />
      </button>
    </form>
  )
}