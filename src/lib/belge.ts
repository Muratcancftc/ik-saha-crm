export const ISG_BELGE_TIPI = 'İSG Belgesi'

// Personelin ISG belgesi var mı (personel listesi için hızlı kontrol)
export function isgVarMi(belgeler: Array<{ tip: string; personelId: number | null }>): boolean {
  return belgeler.some((b) => b.tip === ISG_BELGE_TIPI && b.personelId !== null)
}