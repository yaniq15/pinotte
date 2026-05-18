/**
 * i18n maison pour Chika — FR (défaut) + EN.
 *
 * Usage :
 *   const t = useT()
 *   t('nav.dashboard')  // "Tableau de bord" ou "Dashboard" selon langue
 *
 * Pour ajouter une clé : édite STRINGS ci-dessous (les 2 langues).
 */
import { useSyncExternalStore } from 'react'

export type Lang = 'fr' | 'en'

const STORAGE_KEY = 'chika_lang'

// Détection automatique : si pas de choix sauvegardé, regarde navigator.language
function detectLang(): Lang {
  const saved = (typeof localStorage !== 'undefined' && localStorage.getItem(STORAGE_KEY)) as Lang | null
  if (saved === 'fr' || saved === 'en') return saved
  const navLang = (typeof navigator !== 'undefined' && navigator.language?.toLowerCase()) || 'fr'
  return navLang.startsWith('en') ? 'en' : 'fr'
}

// ── Subscription pattern pour que React se re-rende au changement de langue ──
let currentLang: Lang = detectLang()
const listeners = new Set<() => void>()

export function getLang(): Lang { return currentLang }

export function setLang(lang: Lang) {
  currentLang = lang
  try { localStorage.setItem(STORAGE_KEY, lang) } catch {}
  listeners.forEach(l => l())
}

function subscribe(listener: () => void) {
  listeners.add(listener)
  return () => listeners.delete(listener)
}

// ── Dictionnaire des chaînes ───────────────────────────────────────────────
const STRINGS: Record<Lang, Record<string, string>> = {
  fr: {
    // Navigation
    'nav.dashboard': 'Tableau de bord',
    'nav.products': 'Produits',
    'nav.batches': 'Lots',
    'nav.calculator': 'Calculateur',
    'nav.materials': 'Matières prem.',
    'nav.inventory': 'Inventaire',
    'nav.movements': 'Mouvements',
    'nav.clients': 'Clients',
    'nav.sales': 'Ventes',
    'nav.expenses': 'Dépenses',
    'nav.events': 'Événements',
    'nav.profile': 'Profil',
    'nav.section.overview': 'Aperçu',
    'nav.section.catalog': 'Catalogue',
    'nav.section.sales': 'Ventes',
    'nav.section.finance': 'Finance',
    'nav.section.account': 'Compte',

    // Common actions
    'action.create': 'Créer',
    'action.save': 'Enregistrer',
    'action.cancel': 'Annuler',
    'action.delete': 'Supprimer',
    'action.edit': 'Modifier',
    'action.search': 'Rechercher',
    'action.export': 'Exporter',
    'action.add': 'Ajouter',
    'action.close': 'Fermer',
    'action.logout': 'Déconnexion',

    // Common labels
    'label.name': 'Nom',
    'label.date': 'Date',
    'label.amount': 'Montant',
    'label.total': 'Total',
    'label.notes': 'Notes',
    'label.status': 'Statut',
    'label.loading': 'Chargement…',
    'label.empty': 'Aucune donnée',

    // Dashboard
    'dashboard.greeting': 'Bonjour',
    'dashboard.revenue_paid': 'Revenus payés (HT)',
    'dashboard.accounts_receivable': 'Comptes à recevoir (HT)',
    'dashboard.expenses': 'Dépenses',
    'dashboard.net_profit': 'Bénéfice net',
    'dashboard.sales_by_product': 'Ventes par produit',
    'dashboard.expenses_by_category': 'Dépenses par catégorie',
    'dashboard.margin_by_product': 'Marge par produit',
    'dashboard.top_clients': 'Top 5 clients',
    'dashboard.stock_value': 'Valeur du stock',
    'dashboard.low_stock_alerts': 'Alertes stock bas',
    'dashboard.tax_section': 'Taxes Québec — à remettre trimestriellement',

    // Settings / Profile
    'settings.title': 'Mon profil',
    'settings.account': 'Compte',
    'settings.company_info': 'Informations entreprise (factures)',
    'settings.lang_label': 'Langue de l\'interface',
    'settings.lang_fr': 'Français',
    'settings.lang_en': 'English',
  },
  en: {
    // Navigation
    'nav.dashboard': 'Dashboard',
    'nav.products': 'Products',
    'nav.batches': 'Batches',
    'nav.calculator': 'Calculator',
    'nav.materials': 'Materials',
    'nav.inventory': 'Inventory',
    'nav.movements': 'Movements',
    'nav.clients': 'Clients',
    'nav.sales': 'Sales',
    'nav.expenses': 'Expenses',
    'nav.events': 'Events',
    'nav.profile': 'Profile',
    'nav.section.overview': 'Overview',
    'nav.section.catalog': 'Catalog',
    'nav.section.sales': 'Sales',
    'nav.section.finance': 'Finance',
    'nav.section.account': 'Account',

    // Common actions
    'action.create': 'Create',
    'action.save': 'Save',
    'action.cancel': 'Cancel',
    'action.delete': 'Delete',
    'action.edit': 'Edit',
    'action.search': 'Search',
    'action.export': 'Export',
    'action.add': 'Add',
    'action.close': 'Close',
    'action.logout': 'Logout',

    // Common labels
    'label.name': 'Name',
    'label.date': 'Date',
    'label.amount': 'Amount',
    'label.total': 'Total',
    'label.notes': 'Notes',
    'label.status': 'Status',
    'label.loading': 'Loading…',
    'label.empty': 'No data',

    // Dashboard
    'dashboard.greeting': 'Hello',
    'dashboard.revenue_paid': 'Revenue paid (excl. tax)',
    'dashboard.accounts_receivable': 'Accounts receivable (excl. tax)',
    'dashboard.expenses': 'Expenses',
    'dashboard.net_profit': 'Net profit',
    'dashboard.sales_by_product': 'Sales by product',
    'dashboard.expenses_by_category': 'Expenses by category',
    'dashboard.margin_by_product': 'Margin by product',
    'dashboard.top_clients': 'Top 5 clients',
    'dashboard.stock_value': 'Stock value',
    'dashboard.low_stock_alerts': 'Low stock alerts',
    'dashboard.tax_section': 'Quebec taxes — quarterly remittance',

    // Settings / Profile
    'settings.title': 'My profile',
    'settings.account': 'Account',
    'settings.company_info': 'Company info (invoices)',
    'settings.lang_label': 'Interface language',
    'settings.lang_fr': 'Français',
    'settings.lang_en': 'English',
  },
}

// Snapshot stable pour useSyncExternalStore
function getSnapshot(): Lang {
  return currentLang
}

export function useT() {
  const lang = useSyncExternalStore(subscribe, getSnapshot, getSnapshot)
  return (key: string, fallback?: string): string => {
    return STRINGS[lang]?.[key] || fallback || key
  }
}

export function useLang(): [Lang, (l: Lang) => void] {
  const lang = useSyncExternalStore(subscribe, getSnapshot, getSnapshot)
  return [lang, setLang]
}
