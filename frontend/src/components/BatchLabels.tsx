import { useState, useMemo } from 'react'
import { X, Printer } from 'lucide-react'
import type { Batch } from '../api/batches'

type LabelSize = 'small' | 'large'

const fmtDate = (iso: string) =>
  new Date(iso).toLocaleDateString('fr-CA', { day: '2-digit', month: 'short', year: 'numeric' })

const daysUntil = (iso: string) => {
  const d = new Date(iso).getTime() - Date.now()
  return Math.floor(d / (1000 * 60 * 60 * 24))
}

export default function BatchLabels({ batch, onClose }: { batch: Batch; onClose: () => void }) {
  const [size, setSize] = useState<LabelSize>('small')
  const [count, setCount] = useState<number>(batch.quantity_boxes || 1)

  const labels = useMemo(() => Array.from({ length: Math.max(0, Math.min(count, 240)) }), [count])

  const expiringSoon =
    batch.expiry_date != null && daysUntil(batch.expiry_date) >= 0 && daysUntil(batch.expiry_date) <= 30
  const expired = batch.expiry_date != null && daysUntil(batch.expiry_date) < 0

  const handlePrint = () => window.print()

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4 print:hidden no-print" onClick={onClose}>
      <div onClick={e => e.stopPropagation()}
        className="bg-white rounded-2xl shadow-xl w-full max-w-3xl p-6 space-y-4 max-h-[90vh] overflow-y-auto">
        <div className="flex items-center justify-between">
          <div>
            <h3 className="text-lg font-bold text-stone-900">Étiquettes du lot {batch.batch_number}</h3>
            <p className="text-xs text-stone-500">{batch.product_name ?? 'Produit'}</p>
          </div>
          <button type="button" onClick={onClose} className="text-stone-400 hover:text-stone-700"><X size={18} /></button>
        </div>

        <div className="flex flex-wrap gap-4 items-end">
          <div>
            <label className="block text-xs font-semibold text-stone-600 mb-1">Format</label>
            <div className="inline-flex rounded-lg border border-stone-300 overflow-hidden">
              <button type="button" onClick={() => setSize('small')}
                className={`px-3 py-1.5 text-sm ${size === 'small' ? 'bg-chika-paprika text-white' : 'bg-white text-stone-700'}`}>
                Petite · 24/page (sacs)
              </button>
              <button type="button" onClick={() => setSize('large')}
                className={`px-3 py-1.5 text-sm border-l border-stone-300 ${size === 'large' ? 'bg-chika-paprika text-white' : 'bg-white text-stone-700'}`}>
                Grande · 2/page (cartons)
              </button>
            </div>
          </div>
          <div>
            <label className="block text-xs font-semibold text-stone-600 mb-1">Quantité d'étiquettes</label>
            <input type="number" min={1} max={240} value={count}
              onChange={e => setCount(Math.max(1, Math.min(240, Number(e.target.value) || 1)))}
              className="w-28 px-3 py-1.5 border border-stone-300 rounded-lg text-sm" />
          </div>
          <button type="button" onClick={handlePrint}
            className="ml-auto inline-flex items-center gap-1.5 bg-chika-paprika hover:bg-chika-paprikaDeep text-white text-sm font-semibold px-4 py-2 rounded-lg shadow-sm">
            <Printer size={16} /> Imprimer
          </button>
        </div>

        <div className="text-xs text-stone-500">
          Astuce : dans la fenêtre d'impression, choisis « Marges : aucune » et désactive en-tête/pied de page pour un alignement optimal sur ta feuille A4.
        </div>

        <div className="border-t border-stone-200 pt-3">
          <div className="text-[11px] uppercase tracking-wider text-stone-500 mb-2">Aperçu</div>
          <div className="bg-stone-100 p-4 rounded-lg max-h-[55vh] overflow-y-auto">
            <div className={size === 'small' ? 'labels-grid-small' : 'labels-grid-large'}>
              {labels.map((_, i) => (
                <LabelCard key={i} batch={batch} size={size} expiringSoon={expiringSoon} expired={expired} />
              ))}
            </div>
          </div>
        </div>
      </div>

      {/* Print-only DOM: full grid, no modal chrome */}
      <div className="hidden print:block print-area" aria-hidden="true">
        <div className={size === 'small' ? 'labels-grid-small' : 'labels-grid-large'}>
          {labels.map((_, i) => (
            <LabelCard key={i} batch={batch} size={size} expiringSoon={expiringSoon} expired={expired} />
          ))}
        </div>
      </div>
    </div>
  )
}

function LabelCard({
  batch, size, expiringSoon, expired,
}: { batch: Batch; size: LabelSize; expiringSoon: boolean; expired: boolean }) {
  const isLarge = size === 'large'
  return (
    <div className={`label-card ${isLarge ? 'label-large' : 'label-small'}`}>
      <div className="label-brand">CHIKA</div>
      <div className="label-product">{batch.product_name ?? '—'}</div>
      <div className="label-lot">
        <span className="label-key">Lot</span>
        <span className="label-lotnum">{batch.batch_number}</span>
      </div>
      <div className="label-dates">
        <div>
          <div className="label-key">Production</div>
          <div className="label-date">{fmtDate(batch.production_date)}</div>
        </div>
        {batch.expiry_date && (
          <div>
            <div className="label-key">Expiration</div>
            <div className={`label-date ${expired ? 'label-expired' : expiringSoon ? 'label-expiring' : ''}`}>
              {fmtDate(batch.expiry_date)}
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
