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
    'nav.inventory_count': 'Inventaire physique',
    'nav.ar_aging': 'Comptes à recevoir',
    'nav.subscriptions': 'Abonnements',
    'nav.fixed_assets': 'Immobilisations',
    'nav.simulator': 'Simulateur prix',
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
    'dashboard.subtitle': 'Tableau de bord —',
    'dashboard.export_sales': 'Ventes CSV',
    'dashboard.export_expenses': 'Dépenses CSV',
    'dashboard.revenue_paid': 'Revenus payés (HT)',
    'dashboard.accounts_receivable': 'Comptes à recevoir (HT)',
    'dashboard.expenses': 'Dépenses',
    'dashboard.net_profit': 'Bénéfice net',
    'dashboard.sales_by_product': 'Ventes par produit',
    'dashboard.sales_by_product_sub': 'Revenus du mois, ventes non annulées',
    'dashboard.expenses_by_category': 'Dépenses par catégorie',
    'dashboard.expenses_by_category_sub': 'Répartition du mois',
    'dashboard.margin_by_product': 'Marge par produit',
    'dashboard.margin_subtitle': 'Facturé = toutes ventes du mois (non annulées) · Encaissé = ventes PAID seulement',
    'dashboard.margin.empty_title': 'Aucune marge à afficher',
    'dashboard.margin.empty_desc': 'Crée une vente pour voir la marge apparaître ici.',
    'dashboard.margin.product': 'Produit',
    'dashboard.margin.revenue': 'Revenus',
    'dashboard.margin.cost': 'Coût',
    'dashboard.margin.margin': 'Marge',
    'dashboard.margin.paid_revenue': 'Encaissé',
    'dashboard.margin.paid_margin': 'Marge enc.',
    'dashboard.top_clients': 'Top 5 clients',
    'dashboard.top_clients.empty_title': 'Pas encore de clients',
    'dashboard.top_clients.empty_desc': 'Les meilleurs clients du mois s\'afficheront ici.',
    'dashboard.client_type.broker': 'Courtier',
    'dashboard.client_type.store': 'Magasin',
    'dashboard.stock_value': 'Valeur du stock',
    'dashboard.stock_value_sub': 'Valeur au coût de production',
    'dashboard.low_stock_alerts': 'Alertes stock bas',
    'dashboard.low_stock_sub': 'Produits sous le seuil de 10 boîtes',
    'dashboard.low_stock_ok': 'Tout est en stock 👍',
    'dashboard.low_stock_boxes': 'boîtes',
    'dashboard.tax_section': 'Taxes Québec — à remettre trimestriellement',
    'dashboard.tax_sub': 'TPS 5% + TVQ 9,975% sur CA HT facturé',
    'dashboard.tax.ca_ht': 'CA HT',
    'dashboard.tax.tps': 'TPS collectée (5%)',
    'dashboard.tax.tvq': 'TVQ collectée (9,975%)',
    'dashboard.tax.ca_ttc': 'CA TTC facturé',
    'dashboard.tax.hint_prefix': '💡',
    'dashboard.tax.hint_suffix': 'sont à remettre à Revenu Québec lors de ta prochaine déclaration TPS/TVQ trimestrielle. Mets-les de côté dans un compte séparé.',
    'dashboard.empty_sales': 'Aucune vente ce mois.',
    'dashboard.empty_expenses': 'Aucune dépense ce mois.',
    'dashboard.month': 'Mois',
    'dashboard.year': 'Année',
    'dashboard.events_breakdown': 'Inclus événements ce mois',
    'dashboard.events_breakdown_sub': 'Festivals/marchés du mois (revenus cash + coûts) déjà inclus dans Revenus payés et Dépenses ci-dessus',
    'dashboard.events_revenue': 'Revenus événements',
    'dashboard.events_cost': 'Coûts événements',
    'dashboard.events_net': 'Net événements',
    'dashboard.events_count': 'Événements',

    // Events
    'events.title': 'Événements',
    'events.description': 'Suivi des festivals et marchés avec calcul ROI automatique (coûts vs revenus encaissés sur place).',
    'events.new': 'Nouvel événement',
    'events.edit': 'Modifier l\'événement',
    'events.kpi.count': 'Événements',
    'events.kpi.revenue': 'Revenus',
    'events.kpi.cost': 'Coûts',
    'events.kpi.profit': 'Profit net',
    'events.filter.status': 'Statut :',
    'events.filter.all': 'Tous',
    'events.status.planned': 'Planifié',
    'events.status.ongoing': 'En cours',
    'events.status.done': 'Terminé',
    'events.status.cancelled': 'Annulé',
    'events.empty.title': 'Aucun événement',
    'events.empty.desc': 'Ajoute ton premier festival ou marché pour suivre ton ROI.',
    'events.field.name': 'Nom',
    'events.field.location': 'Lieu (optionnel)',
    'events.field.start_date': 'Date de début',
    'events.field.end_date': 'Date de fin (optionnel)',
    'events.field.status': 'Statut',
    'events.section.costs': 'Coûts (CAD)',
    'events.field.registration_fee': 'Frais de kiosque',
    'events.field.transport_cost': 'Transport',
    'events.field.materials_cost': 'Matières utilisées',
    'events.field.other_costs': 'Autres coûts',
    'events.section.revenue': 'Revenus',
    'events.field.total_revenue': 'Revenus totaux (CAD)',
    'events.field.units_sold': 'Unités vendues',
    'events.field.notes': 'Notes (optionnel)',
    'events.label.units_sold': 'Unités vendues :',
    'events.label.roi': 'ROI :',
    'events.confirm_delete': 'Supprimer "{name}" ?',

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
    'nav.inventory_count': 'Physical count',
    'nav.ar_aging': 'Accounts receivable',
    'nav.subscriptions': 'Subscriptions',
    'nav.fixed_assets': 'Fixed assets',
    'nav.simulator': 'Price simulator',
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
    'dashboard.subtitle': 'Dashboard —',
    'dashboard.export_sales': 'Sales CSV',
    'dashboard.export_expenses': 'Expenses CSV',
    'dashboard.revenue_paid': 'Revenue paid (excl. tax)',
    'dashboard.accounts_receivable': 'Accounts receivable (excl. tax)',
    'dashboard.expenses': 'Expenses',
    'dashboard.net_profit': 'Net profit',
    'dashboard.sales_by_product': 'Sales by product',
    'dashboard.sales_by_product_sub': 'Monthly revenue, non-cancelled sales',
    'dashboard.expenses_by_category': 'Expenses by category',
    'dashboard.expenses_by_category_sub': 'Monthly breakdown',
    'dashboard.margin_by_product': 'Margin by product',
    'dashboard.margin_subtitle': 'Invoiced = all sales this month (non-cancelled) · Cashed = PAID sales only',
    'dashboard.margin.empty_title': 'No margin to show',
    'dashboard.margin.empty_desc': 'Create a sale to see the margin appear here.',
    'dashboard.margin.product': 'Product',
    'dashboard.margin.revenue': 'Revenue',
    'dashboard.margin.cost': 'Cost',
    'dashboard.margin.margin': 'Margin',
    'dashboard.margin.paid_revenue': 'Cashed',
    'dashboard.margin.paid_margin': 'Cashed margin',
    'dashboard.top_clients': 'Top 5 clients',
    'dashboard.top_clients.empty_title': 'No clients yet',
    'dashboard.top_clients.empty_desc': 'This month\'s best clients will appear here.',
    'dashboard.client_type.broker': 'Broker',
    'dashboard.client_type.store': 'Store',
    'dashboard.stock_value': 'Stock value',
    'dashboard.stock_value_sub': 'Production cost value',
    'dashboard.low_stock_alerts': 'Low stock alerts',
    'dashboard.low_stock_sub': 'Products below 10-box threshold',
    'dashboard.low_stock_ok': 'Everything in stock 👍',
    'dashboard.low_stock_boxes': 'boxes',
    'dashboard.tax_section': 'Quebec taxes — quarterly remittance',
    'dashboard.tax_sub': 'GST 5% + QST 9.975% on invoiced revenue (excl. tax)',
    'dashboard.tax.ca_ht': 'Revenue (excl. tax)',
    'dashboard.tax.tps': 'GST collected (5%)',
    'dashboard.tax.tvq': 'QST collected (9.975%)',
    'dashboard.tax.ca_ttc': 'Revenue (incl. tax)',
    'dashboard.tax.hint_prefix': '💡',
    'dashboard.tax.hint_suffix': 'must be remitted to Revenu Québec during your next quarterly GST/QST declaration. Set them aside in a separate account.',
    'dashboard.empty_sales': 'No sales this month.',
    'dashboard.empty_expenses': 'No expenses this month.',
    'dashboard.month': 'Month',
    'dashboard.year': 'Year',
    'dashboard.events_breakdown': 'Events included this month',
    'dashboard.events_breakdown_sub': 'Festivals/markets this month (cash revenue + costs) already included in Revenue paid and Expenses above',
    'dashboard.events_revenue': 'Events revenue',
    'dashboard.events_cost': 'Events cost',
    'dashboard.events_net': 'Events net',
    'dashboard.events_count': 'Events',

    // Events
    'events.title': 'Events',
    'events.description': 'Track festivals and markets with automatic ROI calculation (costs vs on-site revenue).',
    'events.new': 'New event',
    'events.edit': 'Edit event',
    'events.kpi.count': 'Events',
    'events.kpi.revenue': 'Revenue',
    'events.kpi.cost': 'Costs',
    'events.kpi.profit': 'Net profit',
    'events.filter.status': 'Status:',
    'events.filter.all': 'All',
    'events.status.planned': 'Planned',
    'events.status.ongoing': 'Ongoing',
    'events.status.done': 'Done',
    'events.status.cancelled': 'Cancelled',
    'events.empty.title': 'No events yet',
    'events.empty.desc': 'Add your first festival or market to track ROI.',
    'events.field.name': 'Name',
    'events.field.location': 'Location (optional)',
    'events.field.start_date': 'Start date',
    'events.field.end_date': 'End date (optional)',
    'events.field.status': 'Status',
    'events.section.costs': 'Costs (CAD)',
    'events.field.registration_fee': 'Booth fee',
    'events.field.transport_cost': 'Transport',
    'events.field.materials_cost': 'Materials used',
    'events.field.other_costs': 'Other costs',
    'events.section.revenue': 'Revenue',
    'events.field.total_revenue': 'Total revenue (CAD)',
    'events.field.units_sold': 'Units sold',
    'events.field.notes': 'Notes (optional)',
    'events.label.units_sold': 'Units sold:',
    'events.label.roi': 'ROI:',
    'events.confirm_delete': 'Delete "{name}"?',

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
