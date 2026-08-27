import { useState, useEffect } from 'react'
import { todayISO } from '../lib/dates'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { Plus, X, Trash2, Tag } from 'lucide-react'
import {
  listBatches, createBatch, deleteBatch,
  type Batch, type BatchPayload,
} from '../api/batches'
import { listProducts } from '../api/products'
import { PageHeader } from '../components/shared/AppLayout'
import BatchLabels from '../components/BatchLabels'
import { useT, useLang } from '../lib/i18n'

type FormData = {
  product_id: number
  batch_number: string
  production_date: string
  expiry_date?: string
  quantity_boxes: number
  total_cost: number
  notes?: string
}

const fmtCAD = (v: number | string | null) => {
  if (v === null || v === '') return '—'
  const n = typeof v === 'string' ? parseFloat(v) : v
  if (!isFinite(n)) return '—'
  return new Intl.NumberFormat('fr-CA', { style: 'currency', currency: 'CAD' }).format(n)
}

const fmtDate = (iso: string, lang: 'fr' | 'en') =>
  new Date(iso).toLocaleDateString(lang === 'en' ? 'en-CA' : 'fr-CA', { day: '2-digit', month: 'short', year: 'numeric' })

export default function BatchesPage() {
  const qc = useQueryClient()
  const t = useT()
  const [lang] = useLang()
  const [filterProduct, setFilterProduct] = useState<string>('')
  const [showForm, setShowForm] = useState(false)
  const [labelBatch, setLabelBatch] = useState<Batch | null>(null)

  const products = useQuery({ queryKey: ['products'], queryFn: listProducts })
  const batches = useQuery({
    queryKey: ['batches', filterProduct],
    queryFn: () => listBatches(filterProduct ? Number(filterProduct) : undefined),
  })

  return (
    <div className="px-4 sm:px-6 lg:px-10 py-6 sm:py-8 max-w-6xl">
      <PageHeader
        title={t('batches.title')}
        description={t('batches.description')}
        action={
          <button onClick={() => setShowForm(true)}
            className="inline-flex items-center gap-1.5 bg-chika-paprika hover:bg-chika-paprikaDeep text-white text-sm font-semibold px-4 py-2 rounded-lg shadow-sm">
            <Plus size={16} /> {t('batches.new')}
          </button>
        }
      />

      {/* Filter */}
      <div className="bg-white rounded-2xl border border-stone-200 p-4 mb-4 flex items-center gap-3 flex-wrap">
        <label className="text-sm font-semibold text-stone-700">{t('batches.filter.product')}</label>
        <select value={filterProduct} onChange={e => setFilterProduct(e.target.value)}
          className="px-3 py-1.5 border border-stone-300 rounded-lg text-sm">
          <option value="">{t('batches.filter.all_products')}</option>
          {products.data?.map(p => (
            <option key={p.id} value={p.id}>{p.name} · {p.sku}</option>
          ))}
        </select>
      </div>

      <div className="bg-white rounded-2xl border border-stone-200 overflow-x-auto">
        <table className="w-full text-sm">
          <thead className="bg-stone-50 text-[11px] uppercase tracking-wider text-stone-500">
            <tr>
              <th className="text-left px-4 py-3">{t('batches.table.lot_number')}</th>
              <th className="text-left px-4 py-3">{t('products.table.product')}</th>
              <th className="text-left px-4 py-3 hidden sm:table-cell">{t('batches.table.production')}</th>
              <th className="text-left px-4 py-3 hidden md:table-cell">{t('batches.table.expiry')}</th>
              <th className="text-right px-4 py-3">{t('batches.table.boxes')}</th>
              <th className="text-right px-4 py-3 hidden md:table-cell">{t('batches.table.total_cost')}</th>
              <th className="text-right px-4 py-3">{t('batches.table.cost_per_unit')}</th>
              <th className="px-4 py-3 w-24"></th>
            </tr>
          </thead>
          <tbody>
            {(batches.data ?? []).map(b => (
              <tr key={b.id} className="border-t border-stone-200 hover:bg-stone-50">
                <td className="px-4 py-3 font-mono text-xs text-stone-700">{b.batch_number}</td>
                <td className="px-4 py-3 font-semibold text-stone-900">{b.product_name ?? '—'}</td>
                <td className="px-4 py-3 text-stone-600 hidden sm:table-cell">{fmtDate(b.production_date, lang)}</td>
                <td className="px-4 py-3 text-stone-600 hidden md:table-cell">{b.expiry_date ? fmtDate(b.expiry_date, lang) : '—'}</td>
                <td className="px-4 py-3 text-right tabular-nums font-semibold">{b.quantity_boxes}</td>
                <td className="px-4 py-3 text-right tabular-nums text-stone-700 hidden md:table-cell">{fmtCAD(b.total_cost)}</td>
                <td className="px-4 py-3 text-right tabular-nums text-chika-paprika font-semibold">{fmtCAD(b.unit_cost)}</td>
                <td className="px-4 py-3 text-right">
                  <div className="inline-flex items-center gap-1">
                    <button onClick={() => setLabelBatch(b)}
                      title={t('batches.print_labels_title')}
                      className="text-stone-400 hover:text-chika-paprika p-1"><Tag size={14} /></button>
                    <button onClick={() => {
                      if (window.confirm(`${t('batches.confirm_delete_prefix')} ${b.batch_number} ?`)) {
                        deleteBatch(b.id).then(() => qc.invalidateQueries({ queryKey: ['batches'] }))
                      }
                    }} className="text-stone-400 hover:text-red-600 p-1"><Trash2 size={14} /></button>
                  </div>
                </td>
              </tr>
            ))}
            {batches.data && batches.data.length === 0 && (
              <tr><td colSpan={8} className="px-4 py-8 text-center text-stone-400">
                {t('batches.empty')}
              </td></tr>
            )}
          </tbody>
        </table>
      </div>

      {showForm && (
        <BatchForm onClose={() => setShowForm(false)} onSaved={() => {
          qc.invalidateQueries({ queryKey: ['batches'] })
          setShowForm(false)
        }} />
      )}

      {labelBatch && (
        <BatchLabels batch={labelBatch} onClose={() => setLabelBatch(null)} />
      )}
    </div>
  )
}

function BatchForm({ onClose, onSaved }: { onClose: () => void; onSaved: () => void }) {
  const t = useT()
  const products = useQuery({ queryKey: ['products'], queryFn: listProducts })
  const [serverError, setServerError] = useState<string | null>(null)

  const schema = z.object({
    product_id: z.coerce.number().int().positive(t('validation.product_required')),
    batch_number: z.string().min(1, t('validation.required')),
    production_date: z.string().min(1, t('validation.required_short')),
    expiry_date: z.string().optional().or(z.literal('')),
    quantity_boxes: z.coerce.number().int().positive(t('validation.positive_required')),
    total_cost: z.coerce.number().min(0, t('validation.gte_zero')),
    notes: z.string().optional().or(z.literal('')),
  })

  const today = todayISO()
  const { register, handleSubmit, watch, setValue, formState: { errors, isSubmitting } } = useForm<FormData>({
    resolver: zodResolver(schema) as never,
    defaultValues: { production_date: today, quantity_boxes: 2, total_cost: 0 },
  })

  const productId = Number(watch('product_id') || 0)
  const quantityBoxes = Number(watch('quantity_boxes') || 0)
  const totalCost = Number(watch('total_cost') || 0)
  const selectedProduct = products.data?.find(p => p.id === productId)
  const unitCost = selectedProduct && quantityBoxes > 0 && selectedProduct.units_per_box > 0
    ? totalCost / (quantityBoxes * selectedProduct.units_per_box)
    : 0

  // Auto-remplit le coût total à partir du unit_cost du produit (issu de
  // la recette/Calculator). L'user peut toujours overrider manuellement.
  // Pour éviter d'écraser les changements de l'user, on garde une trace
  // de la dernière auto-valeur calculée.
  const [lastAutoCost, setLastAutoCost] = useState<number | null>(null)
  useEffect(() => {
    if (!selectedProduct || !selectedProduct.unit_cost || quantityBoxes <= 0) return
    const upb = selectedProduct.units_per_box || 0
    const productUnitCost = typeof selectedProduct.unit_cost === 'string'
      ? parseFloat(selectedProduct.unit_cost)
      : Number(selectedProduct.unit_cost)
    if (!isFinite(productUnitCost) || productUnitCost <= 0) return
    const autoTotal = +(productUnitCost * quantityBoxes * upb).toFixed(2)
    // Override seulement si l'user n'a pas modifié manuellement
    // (= la valeur actuelle correspond à la dernière auto-valeur OU est 0/défaut initial)
    if (totalCost === 0 || totalCost === lastAutoCost) {
      setValue('total_cost', autoTotal)
      setLastAutoCost(autoTotal)
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [productId, quantityBoxes, selectedProduct?.unit_cost])

  function resetToAuto() {
    if (!selectedProduct || !selectedProduct.unit_cost) return
    const upb = selectedProduct.units_per_box || 0
    const productUnitCost = typeof selectedProduct.unit_cost === 'string'
      ? parseFloat(selectedProduct.unit_cost)
      : Number(selectedProduct.unit_cost)
    const autoTotal = +(productUnitCost * quantityBoxes * upb).toFixed(2)
    setValue('total_cost', autoTotal)
    setLastAutoCost(autoTotal)
  }

  const mut = useMutation({
    mutationFn: async (v: FormData) => {
      const payload: BatchPayload = {
        product_id: Number(v.product_id),
        batch_number: v.batch_number,
        production_date: v.production_date,
        expiry_date: v.expiry_date || null,
        quantity_boxes: Number(v.quantity_boxes),
        total_cost: Number(v.total_cost),
        notes: v.notes || null,
      }
      return createBatch(payload)
    },
    onSuccess: onSaved,
    onError: (err: unknown) => {
      const msg = (err as { response?: { data?: { detail?: string } } })?.response?.data?.detail
      setServerError(msg || t('batches.form.error_creating'))
    },
  })

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4" onClick={onClose}>
      <form onClick={e => e.stopPropagation()}
        onSubmit={handleSubmit(v => mut.mutate(v))}
        className="bg-white rounded-2xl shadow-xl w-full max-w-lg p-6 space-y-4 max-h-[90vh] overflow-y-auto">
        <div className="flex items-center justify-between">
          <h3 className="text-lg font-bold text-stone-900">{t('batches.form.title')}</h3>
          <button type="button" onClick={onClose} className="text-stone-400 hover:text-stone-700"><X size={18} /></button>
        </div>

        {serverError && (
          <div className="px-3 py-2 rounded-lg bg-red-50 border border-red-200 text-red-700 text-sm">⚠ {serverError}</div>
        )}

        <Field label={t('batches.form.product')} error={errors.product_id?.message}>
          <select {...register('product_id')} className={inputCls}>
            <option value="">{t('batches.form.choose_product')}</option>
            {products.data?.map(p => (
              <option key={p.id} value={p.id}>{p.name} · {p.sku}</option>
            ))}
          </select>
        </Field>
        <Field label={t('batches.form.lot_number')} error={errors.batch_number?.message}>
          <input {...register('batch_number')} className={`${inputCls} font-mono uppercase`} placeholder="L-2026-001" />
        </Field>
        <div className="grid grid-cols-2 gap-3">
          <Field label={t('batches.form.production_date')} error={errors.production_date?.message}>
            <input type="date" {...register('production_date')} className={inputCls} />
          </Field>
          <Field label={t('batches.form.expiry_date_optional')}>
            <input type="date" {...register('expiry_date')} className={inputCls} />
          </Field>
        </div>
        <div className="grid grid-cols-2 gap-3">
          <Field label={t('batches.form.boxes_count')} error={errors.quantity_boxes?.message}>
            <input type="number" min="1" {...register('quantity_boxes')} className={inputCls} />
          </Field>
          <Field label={t('batches.form.total_cost')} error={errors.total_cost?.message}>
            <div className="flex items-center gap-1">
              <input type="number" step="0.01" min="0" {...register('total_cost')} className={inputCls} />
              {selectedProduct?.unit_cost && lastAutoCost !== null && Number(totalCost) !== lastAutoCost && (
                <button type="button" onClick={resetToAuto} title={t('batches.form.restore_auto_title')}
                  className="px-2 py-1 text-[10px] rounded-md bg-stone-100 hover:bg-stone-200 text-stone-600 whitespace-nowrap">
                  ↻ auto
                </button>
              )}
            </div>
          </Field>
        </div>

        {/* Auto-fill hint */}
        {selectedProduct?.unit_cost && (
          <div className="text-[11px] text-stone-500 italic -mt-2">
            {t('batches.form.auto_hint_prefix')}{fmtCAD(Number(selectedProduct.unit_cost))}{t('batches.form.auto_hint_mid')} {selectedProduct.units_per_box} × {quantityBoxes} {t('batches.form.auto_hint_suffix')}
          </div>
        )}

        {/* Computed unit cost preview */}
        <div className="bg-chika-creamSoft border border-chika-cream rounded-lg p-3 text-sm">
          <span className="text-stone-600">{t('batches.form.unit_cost_label')}</span>{' '}
          <span className="font-bold text-chika-paprika tabular-nums">
            {selectedProduct
              ? fmtCAD(unitCost)
              : t('batches.form.unit_cost_placeholder')}
          </span>
          {selectedProduct && (
            <span className="text-xs text-stone-500 ml-2">
              ({quantityBoxes} {t('batches.form.unit_cost_detail_prefix')} {selectedProduct.units_per_box} {t('batches.form.unit_cost_detail_suffix')}
            </span>
          )}
          {selectedProduct?.unit_cost && Math.abs(unitCost - Number(selectedProduct.unit_cost)) > 0.01 && (
            <div className="text-[11px] text-amber-700 mt-1">
              {t('batches.form.recipe_gap_prefix')} {fmtCAD(unitCost - Number(selectedProduct.unit_cost))} {t('batches.form.recipe_gap_suffix')}
            </div>
          )}
        </div>

        <Field label={t('batches.form.notes_optional')}>
          <textarea {...register('notes')} rows={2} className={inputCls} placeholder={t('batches.form.notes_placeholder')} />
        </Field>

        <div className="flex gap-2 justify-end pt-2">
          <button type="button" onClick={onClose}
            className="px-3 py-2 rounded-lg text-sm text-stone-600 hover:bg-stone-100">{t('action.cancel')}</button>
          <button type="submit" disabled={isSubmitting}
            className="bg-chika-paprika hover:bg-chika-paprikaDeep disabled:opacity-50 text-white text-sm font-semibold px-4 py-2 rounded-lg">
            {isSubmitting ? '…' : t('batches.form.submit')}
          </button>
        </div>
      </form>
    </div>
  )
}

const inputCls = "w-full px-3 py-2 border border-stone-300 rounded-lg focus:ring-2 focus:ring-chika-paprika focus:border-chika-paprika focus:outline-none text-sm"

function Field({ label, error, children }: { label: string; error?: string; children: React.ReactNode }) {
  return (
    <div>
      <label className="block text-xs font-semibold text-stone-600 mb-1">{label}</label>
      {children}
      {error && <p className="mt-1 text-xs text-red-600">{error}</p>}
    </div>
  )
}

// Suppress unused-import warning (Batch type imported but only used via API client typing)
export type { Batch }
