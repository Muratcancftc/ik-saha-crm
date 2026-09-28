'use client'

import { Icon, type IconName } from './icons'

// Geri döndürülemez silme / iptal işlemleri için onaylı form
export function SilOnayForm({
  action,
  id,
  baslik,
  buttonClass,
  onayMetni,
  ikon,
}: {
  action: (formData: FormData) => void
  id: number
  baslik: string
  buttonClass?: string
  onayMetni?: string
  ikon?: IconName
}) {
  return (
    <form
      action={action}
      onSubmit={(e) => {
        if (!window.confirm(onayMetni ? `${baslik} — ${onayMetni}?` : `${baslik} — kalıcı olarak silinsin mi?`)) e.preventDefault()
      }}
    >
      <input type="hidden" name="id" value={id} />
      <button
        type="submit"
        className={buttonClass ?? 'rounded-lg p-1.5 text-slate-400 transition hover:bg-red-50 hover:text-red-600'}
        title={onayMetni ?? 'Kalıcı olarak sil'}
      >
        <Icon name={ikon ?? 'trash'} size={15} />
      </button>
    </form>
  )
}