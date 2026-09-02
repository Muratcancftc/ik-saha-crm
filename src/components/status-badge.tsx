import { Badge } from './ui'
import {
  ISCI_DURUM,
  ATAMA_DURUM,
  PUANTAJ_DURUM,
  TALEP_DURUM,
  FATURA_DURUM,
  ACILEYET,
  ODEME_DURUM,
  MUSIATLIK_DURUM,
  AVANS_DURUM,
} from '@/lib/labels'

export function IsciBadge({ durum }: { durum: string }) {
  const c = ISCI_DURUM[durum] ?? { label: durum, tone: 'slate' as const }
  return <Badge tone={c.tone}>{c.label}</Badge>
}

export function AtamaBadge({ durum }: { durum: string }) {
  const c = ATAMA_DURUM[durum] ?? { label: durum, tone: 'slate' as const }
  return <Badge tone={c.tone}>{c.label}</Badge>
}

export function PuantajBadge({ durum }: { durum: string }) {
  const c = PUANTAJ_DURUM[durum] ?? { label: durum, tone: 'slate' as const }
  return <Badge tone={c.tone}>{c.label}</Badge>
}

export function TalepBadge({ durum }: { durum: string }) {
  const c = TALEP_DURUM[durum] ?? { label: durum, tone: 'slate' as const }
  return <Badge tone={c.tone}>{c.label}</Badge>
}

export function FaturaBadge({ durum }: { durum: string }) {
  const c = FATURA_DURUM[durum] ?? { label: durum, tone: 'slate' as const }
  return <Badge tone={c.tone}>{c.label}</Badge>
}

export function AciliyetBadge({ aciliyet }: { aciliyet: string }) {
  const c = ACILEYET[aciliyet] ?? { label: aciliyet, tone: 'slate' as const }
  return <Badge tone={c.tone}>{c.label}</Badge>
}

export function OdemeBadge({ durum }: { durum: string }) {
  const c = ODEME_DURUM[durum] ?? { label: durum, tone: 'slate' as const }
  return <Badge tone={c.tone}>{c.label}</Badge>
}

export function MusaitlikBadge({ durum }: { durum: string }) {
  const c = MUSIATLIK_DURUM[durum] ?? { label: durum, tone: 'slate' as const }
  return <Badge tone={c.tone}>{c.label}</Badge>
}

export function AvansBadge({ durum }: { durum: string }) {
  const c = AVANS_DURUM[durum] ?? { label: durum, tone: 'slate' as const }
  return <Badge tone={c.tone}>{c.label}</Badge>
}