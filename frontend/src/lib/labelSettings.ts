/**
 * Préférences d'étiquettes de lot — stockées en localStorage.
 * Éditables via la page Profil → carte "Étiquettes".
 *
 * Ces réglages s'appliquent à TOUTES les étiquettes générées. Le code-barres
 * (GTIN ou image) est lui défini par produit dans la fiche produit.
 */

const KEY = 'pinotte_label_settings_v1'

export type LabelFormat = 'small' | 'large'

export interface LabelSettings {
  defaultFormat: LabelFormat
  showBrand: boolean
  brandText: string          // override du texte de marque (ex: "CHIKA")
  showProductName: boolean
  showLotNumber: boolean
  showProductionDate: boolean
  showExpiryDate: boolean
  showBarcode: boolean        // afficher le code-barres GS1 si le produit en a un
  accentColor: string         // couleur du texte de marque (hex)
}

export const DEFAULT_LABEL_SETTINGS: LabelSettings = {
  defaultFormat: 'small',
  showBrand: true,
  brandText: 'CHIKA',
  showProductName: true,
  showLotNumber: true,
  showProductionDate: true,
  showExpiryDate: true,
  showBarcode: true,
  accentColor: '#B85C3A',
}

export function loadLabelSettings(): LabelSettings {
  try {
    const raw = localStorage.getItem(KEY)
    if (raw) {
      const parsed = JSON.parse(raw)
      return { ...DEFAULT_LABEL_SETTINGS, ...parsed }
    }
  } catch {
    /* ignore — retombe sur les défauts */
  }
  return DEFAULT_LABEL_SETTINGS
}

export function saveLabelSettings(settings: LabelSettings): void {
  localStorage.setItem(KEY, JSON.stringify(settings))
}
