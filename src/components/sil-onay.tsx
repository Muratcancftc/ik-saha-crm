'use client'

import { Icon } from './icons'

// Geri döndürülemez silme işlemleri için onaylı form
export function SilOnayForm({
  action,
  id,
  baslik,
  buttonClass,
}: {
  action: (formData: FormData) => void
  id: number
  baslik: string
  buttonClass?: string
}) {
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
        className={buttonClass ?? 'rounded-lg p-1.5 text-slate-400 transition hover:bg-red-50 hover:text-red-600'}
        title="Kalıcı olarak sil"
      >
        <Icon name="trash" size={15} />
      </button>
    </form>
  )
}