"""Traductions FR/EN pour l'export XLSX comptable.

Le comptable peut choisir sa langue via le query param `lang=fr|en` sur
/api/reports/exports/all.xlsx. Par défaut : français.
"""
from typing import Literal

Lang = Literal["fr", "en"]


def get_labels(lang: Lang = "fr") -> dict:
    """Retourne le dict de chaînes pour la langue demandée."""
    if lang == "en":
        return EN
    return FR


# ─── Français (défaut) ─────────────────────────────────────────────────
FR = {
    # Sheet names
    "sheet.tax_summary": "Résumé taxes",
    "sheet.income_statement": "État des résultats",
    "sheet.ar_aging": "Comptes à recevoir",
    "sheet.sales": "Ventes",
    "sheet.expenses": "Dépenses",
    "sheet.events": "Événements",
    "sheet.material_purchases": "Achats matières",
    "sheet.fixed_assets": "Immobilisations",
    "sheet.subscriptions": "Abonnements",

    # Sales headers
    "sales.id": "id_vente", "sales.date": "date", "sales.client": "client",
    "sales.client_type": "type_client", "sales.status": "statut", "sales.currency": "devise",
    "sales.total_ht": "total_HT", "sales.taxable_subtotal": "sous_total_taxable",
    "sales.tps_collected": "TPS_collectee", "sales.tvq_collected": "TVQ_collectee",
    "sales.total_ttc": "total_TTC", "sales.payment_date": "date_paiement",
    "sales.product_sku": "sku_produit", "sales.product_name": "nom_produit",
    "sales.product_taxable": "produit_taxable",
    "sales.qty_boxes": "qte_boites", "sales.unit_price": "prix_unitaire",
    "sales.subtotal": "sous_total",

    # Expenses headers
    "exp.id": "id_depense", "exp.date": "date", "exp.account_code": "code_compte",
    "exp.category": "categorie", "exp.expense_type": "type",
    "exp.amount_total": "montant_total", "exp.amount_ht": "montant_HT",
    "exp.tps_paid": "TPS_payee", "exp.tvq_paid": "TVQ_payee", "exp.taxes_total": "taxes_total",
    "exp.currency": "devise", "exp.vendor": "fournisseur",
    "exp.vendor_tps_num": "num_TPS_fournisseur", "exp.vendor_tvq_num": "num_TVQ_fournisseur",
    "exp.product": "produit", "exp.description": "description",
    "exp.paid_by": "paye_par", "exp.receipt_url": "url_recu",
    "exp.is_recurring": "recurrent", "exp.recurrence_freq": "frequence",
    "exp.cca_class": "classe_CCA", "exp.deductibility_pct": "deductibilite_pct",
    "exp.deductible_amount": "montant_deductible",

    # Events headers
    "ev.id": "id_evenement", "ev.name": "nom", "ev.location": "lieu",
    "ev.start_date": "date_debut", "ev.end_date": "date_fin", "ev.status": "statut",
    "ev.total_revenue": "revenus_totaux", "ev.registration_fee": "frais_kiosque",
    "ev.transport": "transport", "ev.other_costs": "autres_couts",
    "ev.materials_cost": "cout_matieres", "ev.total_cost": "cout_total",
    "ev.profit": "profit", "ev.units_sold": "unites_vendues",
    "ev.material_label": "libelle_matiere", "ev.material_amount": "montant_matiere",
    "ev.material_quantity": "quantite_matiere", "ev.material_unit": "unite_matiere",
    "ev.material_id_catalog": "id_matiere_catalogue",
    "ev.material_purchase_id": "id_achat_catalogue",
    "ev.notes": "notes",

    # Material purchases headers
    "mp.id": "id_achat", "mp.date": "date", "mp.material": "matiere", "mp.unit": "unite",
    "mp.qty": "quantite", "mp.total_cost": "cout_total",
    "mp.unit_price": "prix_unitaire", "mp.vendor": "fournisseur",
    "mp.paid_by": "paye_par", "mp.notes": "notes",

    # Fixed assets headers
    "fa.name": "Nom", "fa.purchase_date": "Date d'achat", "fa.cost": "Coût initial",
    "fa.cca_class": "Classe CCA", "fa.cca_rate": "Taux %",
    "fa.accumulated_dep": "Amort. cumulé", "fa.book_value": "Valeur comptable",
    "fa.annual_dep": "Amort. annuel estimé", "fa.disposal_date": "Date disposition",

    # AR aging headers
    "ar.client": "Client", "ar.type": "Type", "ar.invoice_count": "Factures",
    "ar.bucket_0_30": "0-30 j", "ar.bucket_31_60": "31-60 j",
    "ar.bucket_61_90": "61-90 j", "ar.bucket_90_plus": "90+ jours ⚠",
    "ar.total": "Total dû", "ar.dso_label": "DSO (Days Sales Outstanding)",
    "ar.dso_unit": "jours",

    # Subscriptions
    "sub.vendor": "Fournisseur", "sub.description": "Description",
    "sub.frequency": "Fréquence", "sub.unit_amount": "Montant unitaire",
    "sub.annualized": "Total annualisé", "sub.total_annualized": "TOTAL ANNUALISÉ",

    # Tax summary section
    "tax.title": "RÉSUMÉ TAXES",
    "tax.period": "Période :",
    "tax.section_collected": "TPS/TVQ COLLECTÉES (sur ventes facturées)",
    "tax.revenue_ht": "CA HT (excl. taxes)",
    "tax.tps_collected": "TPS collectée (5%)",
    "tax.tvq_collected": "TVQ collectée (9,975%)",
    "tax.total_collected": "TOTAL taxes collectées",
    "tax.section_paid": "TPS/TVQ PAYÉES (récupérables — CTI/RTI)",
    "tax.expenses_ht": "Dépenses HT (excl. taxes)",
    "tax.tps_paid": "TPS payée",
    "tax.tvq_paid": "TVQ payée",
    "tax.total_recoverable": "TOTAL taxes récupérables",
    "tax.section_net": "NET À REMETTRE À REVENU QUÉBEC",
    "tax.net_tps": "TPS nette (collectée − payée)",
    "tax.net_tvq": "TVQ nette (collectée − payée)",
    "tax.net_total": "TOTAL net à remettre",

    # Income statement (P&L)
    "pl.title": "ÉTAT DES RÉSULTATS",
    "pl.subtitle": "Format : PCGR PME québécoise (revenus → COGS → marge brute → OPEX → bénéfice opérationnel)",
    "pl.section_revenue": "REVENUS",
    "pl.net_sales": "Ventes nettes (HT)",
    "pl.events_revenue": "Revenus événements",
    "pl.total_revenue": "Total revenus",
    "pl.section_cogs": "COÛT DES MARCHANDISES VENDUES (COGS)",
    "pl.cogs_empty": "(aucune dépense classée COGS — pense à classer tes matières premières)",
    "pl.total_cogs": "Total COGS",
    "pl.gross_margin": "MARGE BRUTE",
    "pl.no_revenue_note": "(pas de revenus ce mois)",
    "pl.pct_of_revenue": "% des revenus",
    "pl.section_opex": "FRAIS D'EXPLOITATION (OPEX)",
    "pl.total_opex": "Total OPEX",
    "pl.operating_profit": "BÉNÉFICE NET D'EXPLOITATION",
    "pl.capex_note": "Note : immobilisations (CAPEX) hors résultat",
    "pl.capex_explain": "Ces achats sont amortis sur plusieurs années (voir onglet Immobilisations).",

    # Misc
    "all_history": "Tout l'historique",
    "yes": "OUI", "no": "NON",
    "total": "TOTAL",
}

# ─── English ────────────────────────────────────────────────────────────
EN = {
    # Sheet names
    "sheet.tax_summary": "Tax Summary",
    "sheet.income_statement": "Income Statement",
    "sheet.ar_aging": "Accounts Receivable",
    "sheet.sales": "Sales",
    "sheet.expenses": "Expenses",
    "sheet.events": "Events",
    "sheet.material_purchases": "Material Purchases",
    "sheet.fixed_assets": "Fixed Assets",
    "sheet.subscriptions": "Subscriptions",

    # Sales headers
    "sales.id": "sale_id", "sales.date": "date", "sales.client": "client",
    "sales.client_type": "client_type", "sales.status": "status", "sales.currency": "currency",
    "sales.total_ht": "total_excl_tax", "sales.taxable_subtotal": "taxable_subtotal",
    "sales.tps_collected": "GST_collected", "sales.tvq_collected": "QST_collected",
    "sales.total_ttc": "total_incl_tax", "sales.payment_date": "payment_date",
    "sales.product_sku": "product_sku", "sales.product_name": "product_name",
    "sales.product_taxable": "product_taxable",
    "sales.qty_boxes": "qty_boxes", "sales.unit_price": "unit_price",
    "sales.subtotal": "subtotal",

    # Expenses headers
    "exp.id": "expense_id", "exp.date": "date", "exp.account_code": "account_code",
    "exp.category": "category", "exp.expense_type": "type",
    "exp.amount_total": "amount_total", "exp.amount_ht": "amount_excl_tax",
    "exp.tps_paid": "GST_paid", "exp.tvq_paid": "QST_paid", "exp.taxes_total": "taxes_total",
    "exp.currency": "currency", "exp.vendor": "vendor",
    "exp.vendor_tps_num": "vendor_GST_number", "exp.vendor_tvq_num": "vendor_QST_number",
    "exp.product": "product", "exp.description": "description",
    "exp.paid_by": "paid_by", "exp.receipt_url": "receipt_url",
    "exp.is_recurring": "recurring", "exp.recurrence_freq": "frequency",
    "exp.cca_class": "CCA_class", "exp.deductibility_pct": "deductibility_pct",
    "exp.deductible_amount": "deductible_amount",

    # Events headers
    "ev.id": "event_id", "ev.name": "name", "ev.location": "location",
    "ev.start_date": "start_date", "ev.end_date": "end_date", "ev.status": "status",
    "ev.total_revenue": "total_revenue", "ev.registration_fee": "booth_fee",
    "ev.transport": "transport", "ev.other_costs": "other_costs",
    "ev.materials_cost": "materials_cost", "ev.total_cost": "total_cost",
    "ev.profit": "profit", "ev.units_sold": "units_sold",
    "ev.material_label": "material_label", "ev.material_amount": "material_amount",
    "ev.material_quantity": "material_quantity", "ev.material_unit": "material_unit",
    "ev.material_id_catalog": "material_id_catalog",
    "ev.material_purchase_id": "material_purchase_id",
    "ev.notes": "notes",

    # Material purchases headers
    "mp.id": "purchase_id", "mp.date": "date", "mp.material": "material", "mp.unit": "unit",
    "mp.qty": "quantity", "mp.total_cost": "total_cost",
    "mp.unit_price": "unit_price", "mp.vendor": "vendor",
    "mp.paid_by": "paid_by", "mp.notes": "notes",

    # Fixed assets headers
    "fa.name": "Name", "fa.purchase_date": "Purchase Date", "fa.cost": "Original Cost",
    "fa.cca_class": "CCA Class", "fa.cca_rate": "Rate %",
    "fa.accumulated_dep": "Accumulated Depr.", "fa.book_value": "Book Value",
    "fa.annual_dep": "Annual Depr. Estimate", "fa.disposal_date": "Disposal Date",

    # AR aging headers
    "ar.client": "Client", "ar.type": "Type", "ar.invoice_count": "Invoices",
    "ar.bucket_0_30": "0-30 d", "ar.bucket_31_60": "31-60 d",
    "ar.bucket_61_90": "61-90 d", "ar.bucket_90_plus": "90+ days ⚠",
    "ar.total": "Total Due", "ar.dso_label": "DSO (Days Sales Outstanding)",
    "ar.dso_unit": "days",

    # Subscriptions
    "sub.vendor": "Vendor", "sub.description": "Description",
    "sub.frequency": "Frequency", "sub.unit_amount": "Unit Amount",
    "sub.annualized": "Annualized Total", "sub.total_annualized": "ANNUALIZED TOTAL",

    # Tax summary section
    "tax.title": "TAX SUMMARY",
    "tax.period": "Period:",
    "tax.section_collected": "GST/QST COLLECTED (on invoiced sales)",
    "tax.revenue_ht": "Revenue (excl. tax)",
    "tax.tps_collected": "GST collected (5%)",
    "tax.tvq_collected": "QST collected (9.975%)",
    "tax.total_collected": "TOTAL collected",
    "tax.section_paid": "GST/QST PAID (recoverable — ITC)",
    "tax.expenses_ht": "Expenses (excl. tax)",
    "tax.tps_paid": "GST paid",
    "tax.tvq_paid": "QST paid",
    "tax.total_recoverable": "TOTAL recoverable",
    "tax.section_net": "NET TO REMIT TO REVENU QUÉBEC",
    "tax.net_tps": "Net GST (collected − paid)",
    "tax.net_tvq": "Net QST (collected − paid)",
    "tax.net_total": "TOTAL net to remit",

    # Income statement (P&L)
    "pl.title": "INCOME STATEMENT",
    "pl.subtitle": "Format: Quebec SME GAAP (revenue → COGS → gross margin → OPEX → operating profit)",
    "pl.section_revenue": "REVENUE",
    "pl.net_sales": "Net sales (excl. tax)",
    "pl.events_revenue": "Events revenue",
    "pl.total_revenue": "Total revenue",
    "pl.section_cogs": "COST OF GOODS SOLD (COGS)",
    "pl.cogs_empty": "(no expenses classified as COGS — remember to classify your raw materials)",
    "pl.total_cogs": "Total COGS",
    "pl.gross_margin": "GROSS MARGIN",
    "pl.no_revenue_note": "(no revenue this month)",
    "pl.pct_of_revenue": "% of revenue",
    "pl.section_opex": "OPERATING EXPENSES (OPEX)",
    "pl.total_opex": "Total OPEX",
    "pl.operating_profit": "OPERATING NET PROFIT",
    "pl.capex_note": "Note: fixed assets (CAPEX) excluded from income statement",
    "pl.capex_explain": "These purchases are depreciated over several years (see Fixed Assets tab).",

    # Misc
    "all_history": "All time",
    "yes": "YES", "no": "NO",
    "total": "TOTAL",
}


def headers(key_list: list[str], lang: Lang = "fr") -> list[str]:
    """Convertit une liste de clés i18n en une liste de headers traduits."""
    L = get_labels(lang)
    return [L.get(k, k) for k in key_list]


# Listes de clés (mêmes pour FR et EN, juste les valeurs changent)
SALES_HEADER_KEYS = [
    "sales.id", "sales.date", "sales.client", "sales.client_type",
    "sales.status", "sales.currency",
    "sales.total_ht", "sales.taxable_subtotal",
    "sales.tps_collected", "sales.tvq_collected", "sales.total_ttc",
    "sales.payment_date", "sales.product_sku", "sales.product_name",
    "sales.product_taxable",
    "sales.qty_boxes", "sales.unit_price", "sales.subtotal",
]

EXPENSES_HEADER_KEYS = [
    "exp.id", "exp.date", "exp.account_code", "exp.category", "exp.expense_type",
    "exp.amount_total", "exp.amount_ht",
    "exp.tps_paid", "exp.tvq_paid", "exp.taxes_total", "exp.currency",
    "exp.vendor", "exp.vendor_tps_num", "exp.vendor_tvq_num",
    "exp.product", "exp.description", "exp.paid_by", "exp.receipt_url",
    "exp.is_recurring", "exp.recurrence_freq", "exp.cca_class",
    "exp.deductibility_pct", "exp.deductible_amount",
]

EVENTS_HEADER_KEYS = [
    "ev.id", "ev.name", "ev.location",
    "ev.start_date", "ev.end_date", "ev.status",
    "ev.total_revenue", "ev.registration_fee", "ev.transport",
    "ev.other_costs", "ev.materials_cost", "ev.total_cost", "ev.profit",
    "ev.units_sold",
    "ev.material_label", "ev.material_amount", "ev.material_quantity",
    "ev.material_unit", "ev.material_id_catalog", "ev.material_purchase_id",
    "ev.notes",
]

MATERIAL_PURCHASES_HEADER_KEYS = [
    "mp.id", "mp.date", "mp.material", "mp.unit", "mp.qty",
    "mp.total_cost", "mp.unit_price", "mp.vendor", "mp.paid_by", "mp.notes",
]

FIXED_ASSETS_HEADER_KEYS = [
    "fa.name", "fa.purchase_date", "fa.cost", "fa.cca_class", "fa.cca_rate",
    "fa.accumulated_dep", "fa.book_value", "fa.annual_dep", "fa.disposal_date",
]

AR_AGING_HEADER_KEYS = [
    "ar.client", "ar.type", "ar.invoice_count",
    "ar.bucket_0_30", "ar.bucket_31_60", "ar.bucket_61_90", "ar.bucket_90_plus",
    "ar.total",
]

SUBSCRIPTIONS_HEADER_KEYS = [
    "sub.vendor", "sub.description", "sub.frequency",
    "sub.unit_amount", "sub.annualized",
]
