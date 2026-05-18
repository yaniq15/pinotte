/**
 * Informations entreprise pour la facture — stockées en localStorage.
 * Éditables via la page Profil.
 */

const KEY = 'chika_company_info_v1'

export interface CompanyInfo {
  name: string
  tagline: string
  address1: string
  address2: string
  phone: string
  email: string
  tpsNumber: string
  tvqNumber: string
  paymentTerms: string  // ex: "Net 30 jours. Virement ou chèque..."
}

export const DEFAULT_COMPANY: CompanyInfo = {
  name: 'ALIMENTS CHIKA',
  tagline: 'Mets traditionnels africains',
  address1: '',
  address2: '',
  phone: '',
  email: '',
  tpsNumber: '',
  tvqNumber: '',
  paymentTerms: 'Net 30 jours. Paiement par virement bancaire ou chèque libellé à l\'ordre de l\'entreprise.',
}

export function loadCompanyInfo(): CompanyInfo {
  try {
    const raw = localStorage.getItem(KEY)
    if (raw) {
      const parsed = JSON.parse(raw)
      return { ...DEFAULT_COMPANY, ...parsed }
    }
  } catch {}
  return DEFAULT_COMPANY
}

export function saveCompanyInfo(info: CompanyInfo): void {
  localStorage.setItem(KEY, JSON.stringify(info))
}
