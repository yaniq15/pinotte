import { useState, useMemo } from 'react'
import { useQuery } from '@tanstack/react-query'
import { X, Printer } from 'lucide-react'
import type { Batch } from '../api/batches'
import { listProducts } from '../api/products'
import { resolveImageUrl } from '../lib/axios'
import { loadLabelSettings, type LabelFormat, type LabelSettings } from '../lib/labelSettings'
import { Barcode } from './ui/Barcode'
import { useT } from '../lib/i18n'

const fmtDate = (iso: string) =>
  new Date(iso).toLocaleDateString('fr-CA', { day: '2-digit', month: 'short', year: 'numeric' })

const daysUntil = (iso: string) => {
  const d = new Date(iso).getTime() - Date.now()
  return Math.floor(d / (1000 * 60 * 60 * 24))
}

export default function BatchLabels({ batch, onClose }: { batch: Batch; onClose: () => void }) {
  const t = useT()
  // Préférences d'étiquettes — configurées dans Profil
  const settings = useMemo(() => loadLabelSettings(), [])
  const [size, setSize] = useState<LabelFormat>(settings.defaultFormat)
  const [count, setCount] = useState<number>(batch.quantity_boxes || 1)

  // On a besoin du produit pour le code-barres (gtin / image)
  const { data: products } = useQuery({ queryKey: ['products'], queryFn: listProducts })
  const product = products?.find(p => p.id === batch.product_id)

  const labels = useMemo(() => Array.from({ length: Math.max(0, Math.min(count, 240)) }), [count])

  const expiringSoon =
    batch.expiry_date != null && daysUntil(batch.expiry_date) >= 0 && daysUntil(batch.expiry_date) <= 30
  const expired = batch.expiry_date != null && daysUntil(batch.expiry_date) < 0

  const handlePrint = () => window.print()

  const cardProps = {
    batch, size, expiringSoon, expired, settings,
    gtin: product?.gtin ?? null,
    barcodeImageUrl: product?.barcode_image_url ?? null,
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4 print:hidden no-print" onClick={onClose}>
      <div onClick={e => e.stopPropagation()}
        className="bg-white rounded-2xl shadow-xl w-full max-w-3xl p-6 space-y-4 max-h-[90vh] overflow-y-auto">
        <div className="flex items-center justify-between">
          <div>
            <h3 className="text-lg font-bold text-stone-900">{t('batchlabels.title_prefix')} {batch.batch_number}</h3>
            <p className="text-xs text-stone-500">{batch.product_name ?? t('batchlabels.default_product')}</p>
          </div>
          <button type="button" onClick={onClose} className="text-stone-400 hover:text-stone-700"><X size={18} /></button>
        </div>

        <div className="flex flex-wrap gap-4 items-end">
          <div>
            <label className="block text-xs font-semibold text-stone-600 mb-1">{t('batchlabels.format_label')}</label>
            <div className="inline-flex rounded-lg border border-stone-300 overflow-hidden">
              <button type="button" onClick={() => setSize('small')}
                className={`px-3 py-1.5 text-sm ${size === 'small' ? 'bg-chika-paprika text-white' : 'bg-white text-stone-700'}`}>
                {t('batchlabels.format_small')}
              </button>
              <button type="button" onClick={() => setSize('large')}
                className={`px-3 py-1.5 text-sm border-l border-stone-300 ${size === 'large' ? 'bg-chika-paprika text-white' : 'bg-white text-stone-700'}`}>
                {t('batchlabels.format_large')}
              </button>
            </div>
          </div>
          <div>
            <label className="block text-xs font-semibold text-stone-600 mb-1">{t('batchlabels.quantity_label')}</label>
            <input type="number" min={1} max={240} value={count}
              onChange={e => setCount(Math.max(1, Math.min(240, Number(e.target.value) || 1)))}
              className="w-28 px-3 py-1.5 border border-stone-300 rounded-lg text-sm" />
          </div>
          <button type="button" onClick={handlePrint}
            className="ml-auto inline-flex items-center gap-1.5 bg-chika-paprika hover:bg-chika-paprikaDeep text-white text-sm font-semibold px-4 py-2 rounded-lg shadow-sm">
            <Printer size={16} /> {t('batchlabels.print_button')}
          </button>
        </div>

        <div className="text-xs text-stone-500">
          {t('batchlabels.hint_prefix')}
          <strong> {t('batchlabels.hint_link')}</strong>{t('batchlabels.hint_suffix')}
        </div>

        <div className="border-t border-stone-200 pt-3">
          <div className="text-[11px] uppercase tracking-wider text-stone-500 mb-2">{t('batchlabels.preview_label')}</div>
          <div className="bg-stone-100 p-4 rounded-lg max-h-[55vh] overflow-y-auto">
            <div className={size === 'small' ? 'labels-grid-small' : 'labels-grid-large'}>
              {labels.map((_, i) => <LabelCard key={i} {...cardProps} />)}
            </div>
          </div>
        </div>
      </div>

      {/* Print-only DOM: full grid, no modal chrome */}
      <div className="hidden print:block print-area" aria-hidden="true">
        <div className={size === 'small' ? 'labels-grid-small' : 'labels-grid-large'}>
          {labels.map((_, i) => <LabelCard key={i} {...cardProps} />)}
        </div>
      </div>
    </div>
  )
}

function LabelCard({
  batch, size, expiringSoon, expired, settings, gtin, barcodeImageUrl,
}: {
  batch: Batch
  size: LabelFormat
  expiringSoon: boolean
  expired: boolean
  settings: LabelSettings
  gtin: string | null
  barcodeImageUrl: string | null
}) {
  const isLarge = size === 'large'
  const showDates = settings.showProductionDate || settings.showExpiryDate
  const hasBarcode = settings.showBarcode && (gtin || barcodeImageUrl)

  return (
    <div className={`label-card ${isLarge ? 'label-large' : 'label-small'}`}>
      {settings.showBrand && (
        <div className="label-brand" style={{ color: settings.accentColor }}>
          {settings.brandText || 'CHIKA'}
        </div>
      )}
      {settings.showProductName && (
        <div className="label-product">{batch.product_name ?? '—'}</div>
      )}
      {settings.showLotNumber && (
        <div className="label-lot">
          <span className="label-key">Lot</span>
          <span className="label-lotnum">{batch.batch_number}</span>
        </div>
      )}
      {showDates && (
        <div className="label-dates">
          {settings.showProductionDate && (
            <div>
              <div className="label-key">Production</div>
              <div className="label-date">{fmtDate(batch.production_date)}</div>
            </div>
          )}
          {settings.showExpiryDate && batch.expiry_date && (
            <div>
              <div className="label-key">Expiration</div>
              <div className={`label-date ${expired ? 'label-expired' : expiringSoon ? 'label-expiring' : ''}`}>
                {fmtDate(batch.expiry_date)}
              </div>
            </div>
          )}
        </div>
      )}
      {hasBarcode && (
        <div style={{ marginTop: '1mm', display: 'flex', justifyContent: 'center' }}>
          {gtin ? (
            <Barcode value={gtin} height={isLarge ? 48 : 26} width={isLarge ? 1.6 : 1}
              fontSize={isLarge ? 12 : 8} />
          ) : barcodeImageUrl ? (
            <img
              src={resolveImageUrl(barcodeImageUrl) ?? barcodeImageUrl}
              alt="Code-barres"
              style={{ height: isLarge ? '16mm' : '9mm', objectFit: 'contain' }}
            />
          ) : null}
        </div>
      )}
    </div>
  )
}
