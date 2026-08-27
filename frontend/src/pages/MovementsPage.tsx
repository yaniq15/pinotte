import { useState } from 'react'
import { todayISO } from '../lib/dates'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { Plus, X, Factory, ShoppingCart, AlertTriangle, Settings2, RotateCcw } from 'lucide-react'
import { listMovements, createMovement, type Movement, type MovementType, type MovementPayload } from '../api/movements'
import { listProducts } from '../api/products'
import { PageHeader } from '../components/shared/AppLayout'
import { useT, useLang } from '../lib/i18n'

type FormData = {
  product_id: number
  movement_type: 'LOSS' | 'ADJUSTMENT'
  quantity_boxes: number
  movement_date: string
  notes: string
}

function useTypeMeta(): Record<MovementType, { label: string; icon: React.ComponentType<{ size?: number; className?: string }>; cls: string }> {
  const t = useT()
  return {
    PRODUCTION: { label: t('movements.type.production'), icon: Factory,       cls: 'bg-emerald-100 text-emerald-700' },
    SALE:       { label: t('movements.type.sale'),        icon: ShoppingCart, cls: 'bg-blue-100 text-blue-700' },
    LOSS:       { label: t('movements.type.loss'),        icon: AlertTriangle, cls: 'bg-red-100 text-red-700' },
    ADJUSTMENT: { label: t('movements.type.adjustment'),  icon: Settings2,    cls: 'bg-stone-200 text-stone-700' },
    RETURN:     { label: t('movements.type.return'),      icon: RotateCcw,    cls: 'bg-purple-100 text-purple-700' },
  }
}

const fmtDate = (iso: string, lang: 'fr' | 'en') =>
  new Date(iso).toLocaleDateString(lang === 'en' ? 'en-CA' : 'fr-CA', { day: '2-digit', month: 'short', year: 'numeric' })

export default function MovementsPage() {
  const qc = useQueryClient()
  const t = useT()
  const [lang] = useLang()
  const TYPE_META = useTypeMeta()
  const [filterProduct, setFilterProduct] = useState('')
  const [filterType, setFilterType] = useState('')
  const [showForm, setShowForm] = useState(false)

  const products = useQuery({ queryKey: ['products'], queryFn: listProducts })
  const movements = useQuery({
    queryKey: ['movements', filterProduct, filterType],
    queryFn: () => listMovements({
      product_id: filterProduct ? Number(filterProduct) : undefined,
      movement_type: filterType ? (filterType as MovementType) : undefined,
    }),
  })

  return (
    <div className="px-4 sm:px-6 lg:px-10 py-6 sm:py-8 max-w-6xl">
      <PageHeader
        title={t('movements.title')}
        description={t('movements.description')}
        action={
          <button onClick={() => setShowForm(true)}
            className="inline-flex items-center gap-1.5 bg-chika-paprika hover:bg-chika-paprikaDeep text-white text-sm font-semibold px-4 py-2 rounded-lg shadow-sm">
            <Plus size={16} /> {t('movements.new')}
          </button>
        }
      />

      {/* Filters */}
      <div className="bg-white rounded-2xl border border-stone-200 p-4 mb-4 flex items-center gap-3 flex-wrap">
        <div className="flex items-center gap-2">
          <label className="text-sm font-semibold text-stone-700">{t('movements.filter.product')}</label>
          <select value={filterProduct} onChange={e => setFilterProduct(e.target.value)}
            className="px-3 py-1.5 border border-stone-300 rounded-lg text-sm">
            <option value="">{t('clients.filter.all')}</option>
            {products.data?.map(p => <option key={p.id} value={p.id}>{p.name}</option>)}
          </select>
        </div>
        <div className="flex items-center gap-2">
          <label className="text-sm font-semibold text-stone-700">{t('movements.filter.type')}</label>
          <select value={filterType} onChange={e => setFilterType(e.target.value)}
            className="px-3 py-1.5 border border-stone-300 rounded-lg text-sm">
            <option value="">{t('clients.filter.all')}</option>
            {Object.entries(TYPE_META).map(([k, m]) => <option key={k} value={k}>{m.label}</option>)}
          </select>
        </div>
      </div>

      <div className="bg-white rounded-2xl border border-stone-200 overflow-x-auto">
        <table className="w-full text-sm">
          <thead className="bg-stone-50 text-[11px] uppercase tracking-wider text-stone-500">
            <tr>
              <th className="text-left px-4 py-3">{t('label.date')}</th>
              <th className="text-left px-4 py-3">Type</th>
              <th className="text-left px-4 py-3">{t('movements.form.product')}</th>
              <th className="text-right px-4 py-3">{t('movements.table.quantity')}</th>
              <th className="text-left px-4 py-3 hidden md:table-cell">{t('movements.table.note')}</th>
            </tr>
          </thead>
          <tbody>
            {(movements.data ?? []).map((m: Movement) => {
              const meta = TYPE_META[m.movement_type]
              const Icon = meta.icon
              return (
                <tr key={m.id} className="border-t border-stone-200 hover:bg-stone-50">
                  <td className="px-4 py-3 text-stone-700">{fmtDate(m.movement_date, lang)}</td>
                  <td className="px-4 py-3">
                    <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider ${meta.cls}`}>
                      <Icon size={10} /> {meta.label}
                    </span>
                  </td>
                  <td className="px-4 py-3 font-semibold text-stone-900">{m.product_name ?? `#${m.product_id}`}</td>
                  <td className={`px-4 py-3 text-right tabular-nums font-bold ${m.quantity_boxes > 0 ? 'text-emerald-700' : 'text-red-700'}`}>
                    {m.quantity_boxes > 0 ? `+${m.quantity_boxes}` : m.quantity_boxes}
                  </td>
                  <td className="px-4 py-3 text-xs text-stone-500 hidden md:table-cell">{m.notes || '—'}</td>
                </tr>
              )
            })}
            {movements.data && movements.data.length === 0 && (
              <tr><td colSpan={5} className="px-4 py-8 text-center text-stone-400">{t('movements.empty')}</td></tr>
            )}
          </tbody>
        </table>
      </div>

      {showForm && (
        <MovementForm onClose={() => setShowForm(false)} onSaved={() => {
          qc.invalidateQueries({ queryKey: ['movements'] })
          qc.invalidateQueries({ queryKey: ['inventory'] })
          setShowForm(false)
        }} />
      )}
    </div>
  )
}

function MovementForm({ onClose, onSaved }: { onClose: () => void; onSaved: () => void }) {
  const t = useT()
  const products = useQuery({ queryKey: ['products'], queryFn: listProducts })
  const [serverError, setServerError] = useState<string | null>(null)
  const today = todayISO()

  const schema = z.object({
    product_id: z.coerce.number().int().positive(t('validation.required')),
    movement_type: z.enum(['LOSS', 'ADJUSTMENT']),
    quantity_boxes: z.coerce.number().int().refine(n => n !== 0, t('validation.non_zero')),
    movement_date: z.string().min(1, t('validation.required_short')),
    notes: z.string().min(1, t('validation.explanatory_note_required')),
  })

  const { register, handleSubmit, watch, formState: { errors, isSubmitting } } = useForm<FormData>({
    resolver: zodResolver(schema) as never,
    defaultValues: { movement_type: 'LOSS', movement_date: today, quantity_boxes: -1 },
  })

  const movementType = watch('movement_type')

  const mut = useMutation({
    mutationFn: async (v: FormData) => {
      const payload: MovementPayload = {
        product_id: Number(v.product_id),
        movement_type: v.movement_type,
        quantity_boxes: Number(v.quantity_boxes),
        movement_date: v.movement_date,
        notes: v.notes,
      }
      return createMovement(payload)
    },
    onSuccess: onSaved,
    onError: (err: unknown) => {
      const msg = (err as { response?: { data?: { detail?: string } } })?.response?.data?.detail
      setServerError(msg || t('error.generic'))
    },
  })

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4" onClick={onClose}>
      <form onClick={e => e.stopPropagation()}
        onSubmit={handleSubmit(v => mut.mutate(v))}
        className="bg-white rounded-2xl shadow-xl w-full max-w-md p-5 sm:p-6 space-y-4 max-h-[90vh] overflow-y-auto">
        <div className="flex items-center justify-between">
          <h3 className="text-lg font-bold text-stone-900">{t('movements.form.new_title')}</h3>
          <button type="button" onClick={onClose} className="text-stone-400 hover:text-stone-700"><X size={18} /></button>
        </div>
        {serverError && (
          <div className="px-3 py-2 rounded-lg bg-red-50 border border-red-200 text-red-700 text-sm">⚠ {serverError}</div>
        )}

        <Field label="Type" error={errors.movement_type?.message}>
          <select {...register('movement_type')} className={inputCls}>
            <option value="LOSS">{t('movements.form.type_loss_option')}</option>
            <option value="ADJUSTMENT">{t('movements.form.type_adjustment_option')}</option>
          </select>
        </Field>
        <Field label={t('movements.form.product')} error={errors.product_id?.message}>
          <select {...register('product_id')} className={inputCls}>
            <option value="">{t('movements.form.choose_product')}</option>
            {products.data?.map(p => <option key={p.id} value={p.id}>{p.name}</option>)}
          </select>
        </Field>
        <Field label={`${t('movements.form.qty_label_prefix')} ${movementType === 'LOSS' ? t('movements.form.qty_hint_loss') : t('movements.form.qty_hint_adjustment')}`} error={errors.quantity_boxes?.message}>
          <input type="number" {...register('quantity_boxes')} className={`${inputCls} tabular-nums`} />
        </Field>
        <Field label={t('label.date')} error={errors.movement_date?.message}>
          <input type="date" {...register('movement_date')} className={inputCls} />
        </Field>
        <Field label={t('movements.form.note_required')} error={errors.notes?.message}>
          <textarea {...register('notes')} rows={2} className={inputCls}
            placeholder={movementType === 'LOSS' ? t('movements.form.note_placeholder_loss') : t('movements.form.note_placeholder_adjustment')} />
        </Field>

        <div className="flex gap-2 justify-end pt-2">
          <button type="button" onClick={onClose}
            className="px-3 py-2 rounded-lg text-sm text-stone-600 hover:bg-stone-100">{t('action.cancel')}</button>
          <button type="submit" disabled={isSubmitting}
            className="bg-chika-paprika hover:bg-chika-paprikaDeep disabled:opacity-50 text-white text-sm font-semibold px-4 py-2 rounded-lg">
            {isSubmitting ? '…' : t('action.save')}
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
