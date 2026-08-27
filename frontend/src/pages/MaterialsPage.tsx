import { useState } from 'react'
import { todayISO } from '../lib/dates'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { useForm } from 'react-hook-form'
import { Plus, X, ShoppingCart, AlertTriangle, Trash2, Pencil } from 'lucide-react'
import {
  listMaterials, createMaterial, updateMaterial, deleteMaterial,
  listPurchases, createPurchase, deletePurchase,
  type Material, type MaterialPurchase,
} from '../api/materials'
import { PageHeader } from '../components/shared/AppLayout'
import { Card, CardBody, CardHeader } from '../components/ui/Card'
import { Button } from '../components/ui/Button'
import { Badge } from '../components/ui/Badge'
import { useT, useLang } from '../lib/i18n'

function fmtCAD(n: number | string | null | undefined): string {
  if (n == null || n === '') return '—'
  const num = typeof n === 'string' ? parseFloat(n) : n
  return `${num.toLocaleString('fr-CA', { minimumFractionDigits: 2, maximumFractionDigits: 2 })} $`
}

function fmtNum(n: number | string | null | undefined, decimals = 3): string {
  if (n == null || n === '') return '—'
  const num = typeof n === 'string' ? parseFloat(n) : n
  return num.toLocaleString('fr-CA', { minimumFractionDigits: 0, maximumFractionDigits: decimals })
}

function fmtDate(s: string, lang: 'fr' | 'en'): string {
  return new Date(s).toLocaleDateString(lang === 'en' ? 'en-CA' : 'fr-CA', { day: '2-digit', month: 'short', year: 'numeric' })
}

export default function MaterialsPage() {
  const qc = useQueryClient()
  const t = useT()
  const [lang] = useLang()
  const [showMaterialForm, setShowMaterialForm] = useState(false)
  const [showPurchaseForm, setShowPurchaseForm] = useState(false)
  const [selectedMaterial, setSelectedMaterial] = useState<Material | null>(null)
  const [editingMaterial, setEditingMaterial] = useState<Material | null>(null)

  const materials = useQuery({ queryKey: ['materials'], queryFn: () => listMaterials() })
  const purchases = useQuery({
    queryKey: ['material-purchases', selectedMaterial?.id],
    queryFn: () => listPurchases(selectedMaterial?.id),
  })

  const totalStockValue = materials.data?.reduce(
    (s, m) => s + Number(m.current_stock) * Number(m.weighted_avg_price), 0
  ) || 0

  const lowStockCount = materials.data?.filter(m => {
    if (!m.low_stock_threshold) return false
    return Number(m.current_stock) <= Number(m.low_stock_threshold)
  }).length || 0

  async function handleDeleteMaterial(m: Material) {
    if (!window.confirm(t('materials.confirm_delete').replace('{name}', m.name))) return
    try {
      await deleteMaterial(m.id)
      qc.invalidateQueries({ queryKey: ['materials'] })
      qc.invalidateQueries({ queryKey: ['material-purchases'] })
      if (selectedMaterial?.id === m.id) setSelectedMaterial(null)
    } catch (e: unknown) {
      const msg = (e as { response?: { data?: { detail?: string } } })?.response?.data?.detail
      alert(msg || t('error.generic'))
    }
  }

  return (
    <div className="px-4 sm:px-6 lg:px-10 py-6 sm:py-8">
      <PageHeader
        title={t('materials.title')}
        description={t('materials.description')}
        action={
          <>
            <Button variant="secondary" icon={<Plus size={14} />} onClick={() => setShowMaterialForm(true)}>
              {t('materials.new')}
            </Button>
            <Button icon={<ShoppingCart size={14} />} onClick={() => setShowPurchaseForm(true)}>
              {t('materials.supply')}
            </Button>
          </>
        }
      />

      {/* KPIs */}
      <div className="grid grid-cols-2 lg:grid-cols-3 gap-4 mb-6">
        <Card>
          <CardBody>
            <div className="text-[10px] uppercase tracking-wider text-stone-500 font-semibold">{t('materials.kpi.active')}</div>
            <div className="text-2xl font-bold text-stone-900 tabular-nums mt-1">
              {materials.data?.filter(m => !m.archived).length ?? '—'}
            </div>
          </CardBody>
        </Card>
        <Card>
          <CardBody>
            <div className="text-[10px] uppercase tracking-wider text-stone-500 font-semibold">{t('materials.kpi.stock_value')}</div>
            <div className="text-2xl font-bold text-chika-paprika tabular-nums mt-1">{fmtCAD(totalStockValue)}</div>
          </CardBody>
        </Card>
        <Card className={lowStockCount > 0 ? 'ring-amber-200 bg-amber-50/50' : ''}>
          <CardBody>
            <div className="text-[10px] uppercase tracking-wider text-stone-500 font-semibold flex items-center gap-1">
              <AlertTriangle size={10} /> {t('materials.kpi.low_stock_alerts')}
            </div>
            <div className={`text-2xl font-bold tabular-nums mt-1 ${lowStockCount > 0 ? 'text-amber-700' : 'text-stone-900'}`}>
              {lowStockCount}
            </div>
          </CardBody>
        </Card>
      </div>

      {/* Liste matières + détails */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        <Card className="lg:col-span-2">
          <CardHeader title={t('materials.catalog_title')} subtitle={t('materials.catalog_subtitle')} />
          <CardBody className="p-0">
            {materials.isLoading && <div className="p-6 text-stone-400 text-sm">{t('label.loading')}</div>}
            {materials.data && materials.data.length === 0 && (
              <div className="p-6 text-stone-500 text-sm italic">{t('materials.empty')}</div>
            )}
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead className="bg-stone-50 text-[11px] uppercase tracking-wider text-stone-500">
                  <tr>
                    <th className="text-left px-4 py-3">{t('label.name')}</th>
                    <th className="text-right px-4 py-3">{t('materials.table.stock')}</th>
                    <th className="text-right px-4 py-3">{t('materials.table.pmp')}</th>
                    <th className="text-right px-4 py-3">{t('materials.table.value')}</th>
                    <th className="w-20 px-2"></th>
                  </tr>
                </thead>
                <tbody>
                  {materials.data?.map(m => {
                    const stock = Number(m.current_stock)
                    const pmp = Number(m.weighted_avg_price)
                    const value = stock * pmp
                    const isLow = m.low_stock_threshold && stock <= Number(m.low_stock_threshold)
                    const isSelected = selectedMaterial?.id === m.id
                    return (
                      <tr key={m.id}
                        onClick={() => setSelectedMaterial(m)}
                        className={`border-t border-stone-200 cursor-pointer transition
                          ${isSelected ? 'bg-chika-creamSoft' : 'hover:bg-stone-50'}`}>
                        <td className="px-4 py-3">
                          <div className="font-medium text-stone-900">{m.name}</div>
                          {isLow && (
                            <Badge tone="warning">{t('materials.low_stock_badge')}</Badge>
                          )}
                        </td>
                        <td className="px-4 py-3 text-right tabular-nums">
                          {fmtNum(stock)} <span className="text-[10px] text-stone-400">{m.unit}</span>
                        </td>
                        <td className="px-4 py-3 text-right tabular-nums text-stone-600">
                          {fmtCAD(pmp)}<span className="text-[10px] text-stone-400">/{m.unit}</span>
                        </td>
                        <td className="px-4 py-3 text-right tabular-nums font-semibold">{fmtCAD(value)}</td>
                        <td className="px-2 py-3">
                          <div className="flex gap-1">
                            <button onClick={e => { e.stopPropagation(); setEditingMaterial(m) }}
                              className="inline-flex items-center gap-1 px-2 py-1 rounded-md bg-stone-100 hover:bg-chika-paprika hover:text-white text-stone-700 text-xs font-medium" title={t('action.edit')}>
                              <Pencil size={12} /> {t('action.edit')}
                            </button>
                            <button onClick={e => { e.stopPropagation(); handleDeleteMaterial(m) }}
                              className="inline-flex items-center px-2 py-1 rounded-md bg-stone-100 hover:bg-red-600 hover:text-white text-stone-700" title={t('action.delete')}>
                              <Trash2 size={12} />
                            </button>
                          </div>
                        </td>
                      </tr>
                    )
                  })}
                </tbody>
              </table>
            </div>
          </CardBody>
        </Card>

        {/* Détails matière sélectionnée */}
        <Card>
          <CardHeader
            title={selectedMaterial ? selectedMaterial.name : t('materials.details_title')}
            subtitle={selectedMaterial ? t('materials.purchase_history') : t('materials.select_prompt')} />
          <CardBody className="p-0">
            {!selectedMaterial && (
              <div className="p-6 text-stone-400 text-sm italic">{t('materials.select_hint')}</div>
            )}
            {selectedMaterial && (
              <>
                <div className="px-4 py-3 bg-chika-creamSoft/30 border-b border-stone-200 text-xs space-y-1">
                  <div className="flex justify-between"><span>{t('materials.table.stock')}</span><strong>{fmtNum(selectedMaterial.current_stock)} {selectedMaterial.unit}</strong></div>
                  <div className="flex justify-between"><span>{t('materials.table.pmp')}</span><strong>{fmtCAD(selectedMaterial.weighted_avg_price)}/{selectedMaterial.unit}</strong></div>
                  <div className="flex justify-between"><span>{t('materials.kpi.stock_value')}</span>
                    <strong className="text-chika-paprika">{fmtCAD(Number(selectedMaterial.current_stock) * Number(selectedMaterial.weighted_avg_price))}</strong>
                  </div>
                </div>
                <div className="max-h-96 overflow-y-auto">
                  {purchases.isLoading && <div className="p-4 text-stone-400 text-sm">{t('label.loading')}</div>}
                  {purchases.data && purchases.data.length === 0 && (
                    <div className="p-4 text-stone-500 text-xs italic">{t('materials.no_purchases')}</div>
                  )}
                  {purchases.data?.map(p => (
                    <PurchaseRow key={p.id} purchase={p} unit={selectedMaterial.unit} lang={lang}
                      onDeleted={() => {
                        qc.invalidateQueries({ queryKey: ['materials'] })
                        qc.invalidateQueries({ queryKey: ['material-purchases'] })
                      }} />
                  ))}
                </div>
              </>
            )}
          </CardBody>
        </Card>
      </div>

      {(showMaterialForm || editingMaterial) && (
        <MaterialForm
          editing={editingMaterial}
          onClose={() => { setShowMaterialForm(false); setEditingMaterial(null) }}
          onSaved={() => {
            qc.invalidateQueries({ queryKey: ['materials'] })
            setShowMaterialForm(false)
            setEditingMaterial(null)
          }}
        />
      )}

      {showPurchaseForm && (
        <PurchaseForm
          materials={materials.data ?? []}
          defaultMaterialId={selectedMaterial?.id}
          onClose={() => setShowPurchaseForm(false)}
          onSaved={() => {
            qc.invalidateQueries({ queryKey: ['materials'] })
            qc.invalidateQueries({ queryKey: ['material-purchases'] })
            setShowPurchaseForm(false)
          }}
        />
      )}
    </div>
  )
}


function PurchaseRow({ purchase: p, unit, lang, onDeleted }: {
  purchase: MaterialPurchase
  unit: string
  lang: 'fr' | 'en'
  onDeleted: () => void
}) {
  const t = useT()
  async function del() {
    if (!window.confirm(`${t('materials.confirm_delete_purchase_prefix')} (${fmtNum(p.quantity)} ${unit} — ${fmtCAD(p.total_cost)}) ?`)) return
    try {
      await deletePurchase(p.id)
      onDeleted()
    } catch (e: unknown) {
      const msg = (e as { response?: { data?: { detail?: string } } })?.response?.data?.detail
      alert(msg || t('error.generic'))
    }
  }
  return (
    <div className="px-4 py-3 border-b border-stone-200 text-xs hover:bg-stone-50 group">
      <div className="flex items-center justify-between">
        <div className="font-semibold text-stone-900">{fmtNum(p.quantity)} {unit}</div>
        <div className="font-bold text-chika-paprika tabular-nums">{fmtCAD(p.total_cost)}</div>
      </div>
      <div className="flex justify-between mt-1 text-stone-500">
        <span>{fmtDate(p.purchase_date, lang)} · {p.vendor || t('materials.vendor_unknown')}</span>
        <span>{fmtCAD(p.unit_price)}/{unit}</span>
      </div>
      {(p.paid_by || p.receipt_url || p.notes) && (
        <div className="mt-1 flex flex-wrap gap-2 text-[10px] text-stone-500">
          {p.paid_by && <span>👤 {p.paid_by}</span>}
          {p.receipt_url && (
            <a href={p.receipt_url} target="_blank" rel="noopener noreferrer"
              className="text-chika-paprika underline">{t('materials.receipt_link')}</a>
          )}
          {p.notes && <span className="italic">{p.notes}</span>}
        </div>
      )}
      <button onClick={del} className="opacity-0 group-hover:opacity-100 text-[10px] text-red-600 hover:underline mt-1">
        {t('materials.delete_link')}
      </button>
    </div>
  )
}


// ────────────────────────────────────────────────────────────────────────────
// Material form
// ────────────────────────────────────────────────────────────────────────────
type MaterialFormData = {
  name: string
  unit: string
  low_stock_threshold?: number | null
  notes?: string | null
}

function MaterialForm({ editing, onClose, onSaved }: {
  editing?: Material | null
  onClose: () => void
  onSaved: () => void
}) {
  const t = useT()
  const isEdit = !!editing
  const { register, handleSubmit, formState: { errors, isSubmitting } } = useForm<MaterialFormData>({
    defaultValues: editing
      ? {
          name: editing.name,
          unit: editing.unit,
          low_stock_threshold: editing.low_stock_threshold == null ? undefined : Number(editing.low_stock_threshold),
          notes: editing.notes ?? '',
        }
      : { unit: 'kg' },
  })
  const [serverError, setServerError] = useState<string | null>(null)

  const mut = useMutation({
    mutationFn: async (v: MaterialFormData) => {
      const payload = {
        name: v.name.trim(),
        unit: v.unit.trim(),
        low_stock_threshold: v.low_stock_threshold ? Number(v.low_stock_threshold) : null,
        notes: v.notes || null,
      }
      return isEdit
        ? updateMaterial(editing!.id, payload)
        : createMaterial(payload)
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
        className="bg-white rounded-xl shadow-xl w-full max-w-md p-6 space-y-3">
        <div className="flex items-center justify-between">
          <h3 className="text-lg font-bold text-stone-900">{isEdit ? t('materials.form.edit_title') : t('materials.new')}</h3>
          <button type="button" onClick={onClose} className="text-stone-400 hover:text-stone-700"><X size={18} /></button>
        </div>
        {serverError && (
          <div className="px-3 py-2 rounded-lg bg-red-50 ring-1 ring-red-200 text-red-700 text-sm">⚠ {serverError}</div>
        )}

        <Field label={t('materials.form.name')} error={errors.name?.message}>
          <input {...register('name', { required: t('validation.required') })} className={inputCls} placeholder={t('materials.form.name_placeholder')} />
        </Field>
        <Field label={t('materials.form.unit')} error={errors.unit?.message}>
          <input {...register('unit', { required: t('validation.required') })} className={inputCls} placeholder="kg" />
        </Field>
        <Field label={t('materials.form.low_stock_threshold')}>
          <input type="number" step="0.01" {...register('low_stock_threshold')} className={inputCls} placeholder="1.5" />
        </Field>
        <Field label={t('label.notes')}>
          <textarea {...register('notes')} rows={2} className={inputCls} placeholder={t('materials.form.notes_placeholder')} />
        </Field>

        <div className="flex gap-2 justify-end pt-2 border-t border-stone-200">
          <Button type="button" variant="ghost" onClick={onClose}>{t('action.cancel')}</Button>
          <Button type="submit" disabled={isSubmitting}>{isSubmitting ? '…' : t('action.create')}</Button>
        </div>
      </form>
    </div>
  )
}


// ────────────────────────────────────────────────────────────────────────────
// Purchase form (approvisionnement)
// ────────────────────────────────────────────────────────────────────────────
type PurchaseFormData = {
  material_id: number | string
  quantity: number
  total_cost: number
  vendor?: string
  paid_by?: string
  purchase_date: string
  receipt_url?: string
  notes?: string
}

function PurchaseForm({
  materials, defaultMaterialId, onClose, onSaved,
}: {
  materials: Material[]
  defaultMaterialId?: number
  onClose: () => void
  onSaved: () => void
}) {
  const t = useT()
  const today = todayISO()
  const { register, handleSubmit, watch, formState: { errors, isSubmitting } } = useForm<PurchaseFormData>({
    defaultValues: {
      material_id: defaultMaterialId ?? '',
      purchase_date: today,
      paid_by: 'Moi',
    },
  })
  const [serverError, setServerError] = useState<string | null>(null)
  const [uploadedReceipt, setUploadedReceipt] = useState<string | null>(null)

  const materialId = Number(watch('material_id') || 0)
  const qty = Number(watch('quantity') || 0)
  const total = Number(watch('total_cost') || 0)
  const selectedMat = materials.find(m => m.id === materialId)
  const unitPrice = qty > 0 ? total / qty : 0

  function handleReceiptFile(e: React.ChangeEvent<HTMLInputElement>) {
    const f = e.target.files?.[0]
    if (!f) return
    // Lecture en base64 pour stocker côté frontend (MVP — pas de backend storage des reçus)
    // On stocke juste un data URL ; pour un vrai stockage il faudrait un endpoint upload.
    const reader = new FileReader()
    reader.onload = ev => {
      const dataUrl = ev.target?.result as string
      setUploadedReceipt(dataUrl)
    }
    reader.readAsDataURL(f)
  }

  const mut = useMutation({
    mutationFn: async (v: PurchaseFormData) => {
      return createPurchase({
        material_id: Number(v.material_id),
        quantity: Number(v.quantity),
        total_cost: Number(v.total_cost),
        vendor: v.vendor || null,
        paid_by: v.paid_by || null,
        purchase_date: v.purchase_date,
        receipt_url: uploadedReceipt || v.receipt_url || null,
        notes: v.notes || null,
      })
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
        className="bg-white rounded-xl shadow-xl w-full max-w-lg p-6 space-y-3 max-h-[90vh] overflow-y-auto">
        <div className="flex items-center justify-between">
          <h3 className="text-lg font-bold text-stone-900">{t('materials.purchase_form.title')}</h3>
          <button type="button" onClick={onClose} className="text-stone-400 hover:text-stone-700"><X size={18} /></button>
        </div>
        {serverError && (
          <div className="px-3 py-2 rounded-lg bg-red-50 ring-1 ring-red-200 text-red-700 text-sm">⚠ {serverError}</div>
        )}

        <Field label={t('materials.purchase_form.material')} error={errors.material_id?.message}>
          <select {...register('material_id', { required: t('validation.required') })} className={inputCls}>
            <option value="">{t('materials.purchase_form.choose')}</option>
            {materials.map(m => (
              <option key={m.id} value={m.id}>{m.name} ({m.unit})</option>
            ))}
          </select>
        </Field>

        <div className="grid grid-cols-2 gap-3">
          <Field label={`${t('materials.purchase_form.quantity')} ${selectedMat ? `(${selectedMat.unit})` : ''}`} error={errors.quantity?.message}>
            <input type="number" step="0.001" min="0" {...register('quantity', { required: true, min: 0.001 })} className={inputCls} placeholder="5" />
          </Field>
          <Field label={t('materials.purchase_form.total_cost')} error={errors.total_cost?.message}>
            <input type="number" step="0.01" min="0" {...register('total_cost', { required: true })} className={inputCls} placeholder="300.00" />
          </Field>
        </div>

        {qty > 0 && total > 0 && (
          <div className="bg-chika-creamSoft/50 px-3 py-2 rounded-lg text-xs text-chika-brown">
            {t('materials.purchase_form.unit_price_label')} <strong className="text-chika-paprika">{fmtCAD(unitPrice)}/{selectedMat?.unit || t('materials.purchase_form.unit_fallback')}</strong>
          </div>
        )}

        <div className="grid grid-cols-2 gap-3">
          <Field label={t('materials.purchase_form.vendor')}>
            <input {...register('vendor')} className={inputCls} placeholder="Costco" />
          </Field>
          <Field label={t('materials.purchase_form.purchase_date')} error={errors.purchase_date?.message}>
            <input type="date" {...register('purchase_date', { required: true })} className={inputCls} />
          </Field>
        </div>

        <Field label={t('materials.purchase_form.paid_by')}>
          <input {...register('paid_by')} className={inputCls} placeholder={t('materials.purchase_form.paid_by_placeholder')} />
        </Field>

        {/* Reçu : 2 modes */}
        <div className="space-y-2">
          <label className="text-xs uppercase font-semibold text-stone-500 tracking-wider">{t('materials.purchase_form.receipt_section')}</label>
          <Field label={t('materials.purchase_form.receipt_url')}>
            <input {...register('receipt_url')} className={inputCls} placeholder="https://drive.google.com/..." />
          </Field>
          <div>
            <label className="text-[11px] text-stone-500">{t('materials.purchase_form.receipt_upload_hint')}</label>
            <input type="file" accept="image/*" capture="environment"
              onChange={handleReceiptFile}
              className="block w-full text-xs text-stone-600 file:mr-3 file:px-3 file:py-1.5 file:rounded file:border-0 file:bg-stone-100 file:text-stone-700 file:font-semibold" />
            {uploadedReceipt && (
              <div className="mt-2 inline-flex items-center gap-2 text-xs text-emerald-700">
                {t('materials.purchase_form.receipt_attached')}
              </div>
            )}
          </div>
        </div>

        <Field label={t('label.notes')}>
          <textarea {...register('notes')} rows={2} className={inputCls} placeholder={t('materials.purchase_form.notes_placeholder')} />
        </Field>

        <div className="flex gap-2 justify-end pt-2 border-t border-stone-200">
          <Button type="button" variant="ghost" onClick={onClose}>{t('action.cancel')}</Button>
          <Button type="submit" disabled={isSubmitting}>{isSubmitting ? '…' : t('action.save')}</Button>
        </div>
      </form>
    </div>
  )
}

const inputCls = "w-full px-3 py-2 ring-1 ring-stone-300 rounded-lg focus:ring-2 focus:ring-chika-paprika focus:outline-none text-sm bg-white"

function Field({ label, error, children }: { label: string; error?: string; children: React.ReactNode }) {
  return (
    <label className="block">
      <span className="text-xs uppercase tracking-wider font-bold text-stone-500 mb-1 block">{label}</span>
      {children}
      {error && <span className="text-xs text-red-600 mt-1 block">{error}</span>}
    </label>
  )
}
