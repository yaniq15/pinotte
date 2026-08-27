import {
  Document, Page, Text, View, StyleSheet, pdf,
} from '@react-pdf/renderer'
import type { Sale } from '../api/sales'
import { loadCompanyInfo } from '../lib/companyInfo'
import { getLang, tFor } from '../lib/i18n'

const TPS_RATE = 0.05
const TVQ_RATE = 0.09975

const styles = StyleSheet.create({
  page: { padding: 40, fontSize: 10, fontFamily: 'Helvetica', color: '#1c1917' },
  header: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 30, borderBottomWidth: 2, borderBottomColor: '#C5532E', paddingBottom: 12 },
  companyName: { fontSize: 18, fontWeight: 'bold', color: '#C5532E', marginBottom: 2 },
  companyTagline: { fontSize: 9, color: '#78716c', fontStyle: 'italic', marginBottom: 8 },
  companyLine: { fontSize: 9, color: '#44403c', lineHeight: 1.4 },
  invoiceTitle: { fontSize: 22, fontWeight: 'bold', textAlign: 'right' },
  invoiceMeta: { fontSize: 9, color: '#78716c', textAlign: 'right', marginTop: 4 },
  section: { marginBottom: 16 },
  sectionLabel: { fontSize: 8, fontWeight: 'bold', color: '#78716c', textTransform: 'uppercase', letterSpacing: 1, marginBottom: 4 },
  clientName: { fontSize: 13, fontWeight: 'bold', marginBottom: 2 },
  table: { marginTop: 20, marginBottom: 16 },
  tableHeader: { flexDirection: 'row', backgroundColor: '#fef3c7', padding: 8, fontWeight: 'bold', fontSize: 9, textTransform: 'uppercase' },
  tableRow: { flexDirection: 'row', padding: 8, borderBottomWidth: 0.5, borderBottomColor: '#e7e5e4' },
  colDesc: { flex: 4 },
  colQty: { flex: 1, textAlign: 'right' },
  colPrice: { flex: 1.5, textAlign: 'right' },
  colTotal: { flex: 1.5, textAlign: 'right', fontWeight: 'bold' },
  totals: { marginLeft: 'auto', width: 220, marginTop: 12 },
  totalRow: { flexDirection: 'row', justifyContent: 'space-between', padding: 4, fontSize: 10 },
  totalRowFinal: { flexDirection: 'row', justifyContent: 'space-between', padding: 8, backgroundColor: '#C5532E', color: '#fff', fontWeight: 'bold', fontSize: 13, marginTop: 4, borderRadius: 4 },
  taxNumbers: { marginTop: 30, fontSize: 8, color: '#78716c', textAlign: 'center', borderTopWidth: 0.5, borderTopColor: '#e7e5e4', paddingTop: 8 },
  footer: { position: 'absolute', bottom: 30, left: 40, right: 40, textAlign: 'center', fontSize: 8, color: '#a8a29e', borderTopWidth: 0.5, borderTopColor: '#e7e5e4', paddingTop: 6 },
  paymentTerms: { marginTop: 18, padding: 10, backgroundColor: '#f5f5f4', borderRadius: 4, fontSize: 9 },
  paymentTermsLabel: { fontWeight: 'bold', marginBottom: 2 },
})

function fmtMoney(n: number, lang: 'fr' | 'en'): string {
  return `${n.toLocaleString(lang === 'en' ? 'en-CA' : 'fr-CA', { minimumFractionDigits: 2, maximumFractionDigits: 2 })} $`
}

function fmtDate(s: string, lang: 'fr' | 'en'): string {
  const d = new Date(s)
  return d.toLocaleDateString(lang === 'en' ? 'en-CA' : 'fr-CA', { day: '2-digit', month: 'long', year: 'numeric' })
}

interface InvoiceProps {
  sale: Sale
  clientAddress?: string  // si dispo dans Clients
  clientTPSNumber?: string
}

export function InvoiceDocument({ sale, clientAddress, clientTPSNumber }: InvoiceProps) {
  const lang = getLang()
  const t = (key: string, fallback?: string) => tFor(lang, key, fallback)
  const COMPANY = loadCompanyInfo()
  const totalHT = Number(sale.total_amount)
  // Taxes calculées uniquement sur la portion taxable (non-épicerie)
  const taxableHT = sale.items.reduce(
    (s, it) => it.product_taxable ? s + Number(it.subtotal) : s, 0
  )
  const tps = +(taxableHT * TPS_RATE).toFixed(2)
  const tvq = +(taxableHT * TVQ_RATE).toFixed(2)
  const totalTTC = +(totalHT + tps + tvq).toFixed(2)
  const hasTaxableItems = taxableHT > 0
  const hasNonTaxableItems = sale.items.some(it => !it.product_taxable)
  const invoiceNum = `INV-${new Date(sale.sale_date).getFullYear()}-${String(sale.id).padStart(4, '0')}`

  return (
    <Document>
      <Page size="A4" style={styles.page}>
        {/* En-tête */}
        <View style={styles.header}>
          <View>
            <Text style={styles.companyName}>{COMPANY.name || '—'}</Text>
            {COMPANY.tagline && <Text style={styles.companyTagline}>{COMPANY.tagline}</Text>}
            {COMPANY.address1 && <Text style={styles.companyLine}>{COMPANY.address1}</Text>}
            {COMPANY.address2 && <Text style={styles.companyLine}>{COMPANY.address2}</Text>}
            {(COMPANY.phone || COMPANY.email) && (
              <Text style={styles.companyLine}>
                {COMPANY.phone}{COMPANY.phone && COMPANY.email ? ' · ' : ''}{COMPANY.email}
              </Text>
            )}
          </View>
          <View>
            <Text style={styles.invoiceTitle}>{t('invoice.title')}</Text>
            <Text style={styles.invoiceMeta}>{t('invoice.number_prefix')} {invoiceNum}</Text>
            <Text style={styles.invoiceMeta}>{t('invoice.date_label')} {fmtDate(sale.sale_date, lang)}</Text>
            {sale.payment_date && (
              <Text style={styles.invoiceMeta}>{t('invoice.paid_on_label')} {fmtDate(sale.payment_date, lang)}</Text>
            )}
            <Text style={styles.invoiceMeta}>{t('invoice.status_label')} {t(`sales.status.${sale.status.toLowerCase()}`, sale.status)}</Text>
          </View>
        </View>

        {/* Client */}
        <View style={styles.section}>
          <Text style={styles.sectionLabel}>{t('invoice.billed_to')}</Text>
          <Text style={styles.clientName}>{sale.client_name || t('invoice.default_client')}</Text>
          {sale.client_type === 'BROKER' && <Text style={styles.companyLine}>{t('invoice.client_type_broker')}</Text>}
          {sale.client_type === 'STORE' && <Text style={styles.companyLine}>{t('invoice.client_type_store')}</Text>}
          {clientAddress && <Text style={styles.companyLine}>{clientAddress}</Text>}
          {clientTPSNumber && <Text style={styles.companyLine}>{t('invoice.tps_number_label')} {clientTPSNumber}</Text>}
        </View>

        {/* Items */}
        <View style={styles.table}>
          <View style={styles.tableHeader}>
            <Text style={styles.colDesc}>{t('invoice.col_description')}</Text>
            <Text style={styles.colQty}>{t('invoice.col_qty')}</Text>
            <Text style={styles.colPrice}>{t('invoice.col_price')}</Text>
            <Text style={styles.colTotal}>{t('invoice.col_total')}</Text>
          </View>
          {sale.items.map(it => {
            const isAdjustment = it.line_type !== 'PRODUCT'
            const negative = Number(it.subtotal) < 0
            return (
              <View key={it.id} style={styles.tableRow}>
                <View style={styles.colDesc}>
                  <Text style={{ fontWeight: 'bold' }}>
                    {it.line_type === 'LOT_ADJUSTMENT' && t('invoice.lot_adjustment_prefix')}
                    {it.line_type === 'LOSS_ADJUSTMENT' && t('invoice.loss_adjustment_prefix')}
                    {it.product_name || `Produit ${it.product_id}`}
                  </Text>
                  {!isAdjustment && it.product_sku && <Text style={{ fontSize: 8, color: '#78716c' }}>{t('invoice.sku_label')} {it.product_sku}</Text>}
                  {!isAdjustment && !it.product_taxable && (
                    <Text style={{ fontSize: 7, color: '#10b981', fontStyle: 'italic' }}>{t('invoice.tax_exempt')}</Text>
                  )}
                  {isAdjustment && it.notes && (
                    <Text style={{ fontSize: 8, color: '#78716c', fontStyle: 'italic' }}>{it.notes}</Text>
                  )}
                </View>
                <Text style={styles.colQty}>
                  {it.quantity_boxes}{it.line_type === 'LOT_ADJUSTMENT' ? ` ${t('invoice.lot_unit')}` : it.line_type === 'LOSS_ADJUSTMENT' ? ` ${t('invoice.unit_unit')}` : ''}
                </Text>
                <Text style={styles.colPrice}>{fmtMoney(Number(it.unit_price), lang)}</Text>
                <Text style={[styles.colTotal, negative ? { color: '#dc2626' } : {}]}>{fmtMoney(Number(it.subtotal), lang)}</Text>
              </View>
            )
          })}
        </View>

        {/* Totaux */}
        <View style={styles.totals}>
          <View style={styles.totalRow}>
            <Text>{t('invoice.subtotal')}</Text>
            <Text>{fmtMoney(totalHT, lang)}</Text>
          </View>
          {hasTaxableItems && hasNonTaxableItems && (
            <View style={[styles.totalRow, { fontSize: 8, color: '#78716c', fontStyle: 'italic' }]}>
              <Text>{t('invoice.of_which_taxable')}</Text>
              <Text>{fmtMoney(taxableHT, lang)}</Text>
            </View>
          )}
          {hasTaxableItems ? (
            <>
              <View style={styles.totalRow}>
                <Text>{t('invoice.tps_label')}</Text>
                <Text>{fmtMoney(tps, lang)}</Text>
              </View>
              <View style={styles.totalRow}>
                <Text>{t('invoice.tvq_label')}</Text>
                <Text>{fmtMoney(tvq, lang)}</Text>
              </View>
            </>
          ) : (
            <View style={[styles.totalRow, { fontSize: 9, color: '#10b981', fontStyle: 'italic' }]}>
              <Text>{t('invoice.tax_exempt_products')}</Text>
              <Text>{fmtMoney(0, lang)}</Text>
            </View>
          )}
          <View style={styles.totalRowFinal}>
            <Text>{t('invoice.total_due')}</Text>
            <Text>{fmtMoney(totalTTC, lang)}</Text>
          </View>
        </View>

        {/* Conditions de paiement */}
        <View style={styles.paymentTerms}>
          <Text style={styles.paymentTermsLabel}>{t('invoice.payment_terms_label')}</Text>
          <Text>{COMPANY.paymentTerms}</Text>
          {sale.notes && (
            <>
              <Text style={[styles.paymentTermsLabel, { marginTop: 6 }]}>{t('invoice.notes_label')}</Text>
              <Text>{sale.notes}</Text>
            </>
          )}
        </View>

        {/* Numéros de taxes — affichés seulement si renseignés */}
        {(COMPANY.tpsNumber || COMPANY.tvqNumber) && (
          <View style={styles.taxNumbers}>
            <Text>
              {COMPANY.tpsNumber && `${t('invoice.tps_number_label')} ${COMPANY.tpsNumber}`}
              {COMPANY.tpsNumber && COMPANY.tvqNumber && '    ·    '}
              {COMPANY.tvqNumber && `${t('invoice.tvq_number_label')} ${COMPANY.tvqNumber}`}
            </Text>
          </View>
        )}

        {/* Footer */}
        <Text style={styles.footer}>
          {t('invoice.thanks_prefix')} {COMPANY.name} · {COMPANY.email}
        </Text>
      </Page>
    </Document>
  )
}

/** Génère et télécharge le PDF de la facture. */
export async function downloadInvoice(sale: Sale, opts?: { clientAddress?: string; clientTPSNumber?: string }) {
  const doc = <InvoiceDocument sale={sale} clientAddress={opts?.clientAddress} clientTPSNumber={opts?.clientTPSNumber} />
  const blob = await pdf(doc).toBlob()
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = `Facture_INV-${new Date(sale.sale_date).getFullYear()}-${String(sale.id).padStart(4, '0')}.pdf`
  document.body.appendChild(a)
  a.click()
  document.body.removeChild(a)
  setTimeout(() => URL.revokeObjectURL(url), 1000)
}

/** Ouvre le PDF dans un nouvel onglet (pour preview/print). */
export async function openInvoice(sale: Sale, opts?: { clientAddress?: string; clientTPSNumber?: string }) {
  const doc = <InvoiceDocument sale={sale} clientAddress={opts?.clientAddress} clientTPSNumber={opts?.clientTPSNumber} />
  const blob = await pdf(doc).toBlob()
  const url = URL.createObjectURL(blob)
  window.open(url, '_blank')
  setTimeout(() => URL.revokeObjectURL(url), 60000)
}
