import { useState } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { Plus, Pencil, X } from 'lucide-react'
import {
  listProducts, createProduct, updateProduct, deleteProduct,
  type Product, type ProductPayload,
} from '../api/products'
import { PageHeader } from '../components/shared/AppLayout'
import { Card } from '../components/ui/Card'
import { Button } from '../components/ui/Button'
import { Badge } from '../components/ui/Badge'
import { EmptyState } from '../components/ui/EmptyState'

const schema = z.object({
  name: z.string().min(1, 'Requis'),
  sku: z.string().min(1, 'Requis'),
  units_per_box: z.coerce.number().int().positive('> 0 requis'),
  unit_cost: z.coerce.number().min(0).optional().or(z.literal('')),
  price_broker: z.coerce.number().min(0).optional().or(z.literal('')),
  price_direct: z.coerce.number().min(0).optional().or(z.literal('')),
  currency: z.string().length(3).default('CAD'),
  active: z.boolean().default(true),
  image_url: z.string().optional().or(z.literal('')),
})

type FormData = z.infer<typeof schema>

const fmtCAD = (v: number | string | null | undefined) => {
  if (v === null || v === undefined || v === '') return '—'
  const n = typeof v === 'string' ? parseFloat(v) : v
  if (!isFinite(n)) return '—'
  return new Intl.NumberFormat('fr-CA', { style: 'currency', currency: 'CAD' }).format(n)
}

export default function ProductsPage() {
  const qc = useQueryClient()
  const { data: products = [], isLoading } = useQuery({ queryKey: ['products'], queryFn: listProducts })
  const [editing, setEditing] = useState<Product | null>(null)
  const [showForm, setShowForm] = useState(false)

  return (
    <div className="px-6 lg:px-10 py-8 max-w-7xl">
      <PageHeader
        title="Produits"
        description="Catalogue Chika — prix courtier vs direct et coûts unitaires."
        action={
          <Button icon={<Plus size={16} />} onClick={() => { setEditing(null); setShowForm(true) }}>
            Nouveau produit
          </Button>
        }
      />

      <Card>
        {isLoading
          ? <div className="p-8 text-center text-stone-400 text-sm">Chargement…</div>
          : products.length === 0
          ? <EmptyState icon="📦" title="Aucun produit" description="Crée ton premier produit pour commencer."
              action={<Button icon={<Plus size={16} />} onClick={() => { setEditing(null); setShowForm(true) }}>Nouveau produit</Button>} />
          : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead className="bg-stone-50 text-[11px] uppercase tracking-wider text-stone-500">
                  <tr>
                    <th className="text-left px-5 py-3">Produit</th>
                    <th className="text-left px-5 py-3 hidden sm:table-cell">SKU</th>
                    <th className="text-right px-5 py-3 hidden md:table-cell">Unités/boîte</th>
                    <th className="text-right px-5 py-3">Coût unit.</th>
                    <th className="text-right px-5 py-3 hidden md:table-cell">Prix courtier</th>
                    <th className="text-right px-5 py-3 hidden md:table-cell">Prix direct</th>
                    <th className="text-center px-5 py-3">Statut</th>
                    <th className="px-5 py-3 w-12"></th>
                  </tr>
                </thead>
                <tbody>
                  {products.map(p => (
                    <tr key={p.id} className={`border-t border-stone-100 hover:bg-stone-50 transition ${!p.active && 'opacity-50'}`}>
                      <td className="px-5 py-3">
                        <div className="flex items-center gap-3">
                          {p.image_url && (
                            <img src={p.image_url} alt={p.name}
                                 className="w-10 h-10 object-contain rounded-md bg-stone-50 ring-1 ring-stone-100 shrink-0" />
                          )}
                          <span className="font-medium text-stone-900">{p.name}</span>
                        </div>
                      </td>
                      <td className="px-5 py-3 font-mono text-xs text-stone-500 hidden sm:table-cell">{p.sku}</td>
                      <td className="px-5 py-3 text-right tabular-nums hidden md:table-cell text-stone-600">{p.units_per_box}</td>
                      <td className="px-5 py-3 text-right tabular-nums text-stone-700">{fmtCAD(p.unit_cost)}</td>
                      <td className="px-5 py-3 text-right tabular-nums hidden md:table-cell text-stone-700">{fmtCAD(p.price_broker)}</td>
                      <td className="px-5 py-3 text-right tabular-nums hidden md:table-cell text-stone-900 font-semibold">{fmtCAD(p.price_direct)}</td>
                      <td className="px-5 py-3 text-center">
                        {p.active ? <Badge tone="success">Actif</Badge> : <Badge tone="neutral">Inactif</Badge>}
                      </td>
                      <td className="px-5 py-3 text-right">
                        <button onClick={() => { setEditing(p); setShowForm(true) }}
                          className="text-stone-400 hover:text-chika-paprika p-1" title="Modifier">
                          <Pencil size={14} />
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
      </Card>

      {showForm && (
        <ProductForm
          initial={editing}
          onClose={() => setShowForm(false)}
          onSaved={() => {
            qc.invalidateQueries({ queryKey: ['products'] })
            setShowForm(false)
          }}
        />
      )}
    </div>
  )
}

function ProductForm({ initial, onClose, onSaved }: {
  initial: Product | null; onClose: () => void; onSaved: () => void
}) {
  const qc = useQueryClient()
  const isEdit = !!initial
  const [serverError, setServerError] = useState<string | null>(null)

  const { register, handleSubmit, formState: { errors, isSubmitting } } = useForm<FormData>({
    resolver: zodResolver(schema),
    defaultValues: initial
      ? {
          name: initial.name, sku: initial.sku, units_per_box: initial.units_per_box,
          unit_cost: initial.unit_cost as number ?? '', price_broker: initial.price_broker as number ?? '',
          price_direct: initial.price_direct as number ?? '', currency: initial.currency,
          active: initial.active, image_url: initial.image_url ?? '',
        }
      : { currency: 'CAD', active: true, units_per_box: 12 },
  })

  const mut = useMutation({
    mutationFn: async (v: FormData) => {
      const payload: ProductPayload = {
        name: v.name, sku: v.sku, units_per_box: Number(v.units_per_box),
        unit_cost: v.unit_cost === '' ? null : Number(v.unit_cost),
        price_broker: v.price_broker === '' ? null : Number(v.price_broker),
        price_direct: v.price_direct === '' ? null : Number(v.price_direct),
        currency: v.currency, active: v.active,
        image_url: v.image_url || null,
      }
      return isEdit ? updateProduct(initial!.id, payload) : createProduct(payload)
    },
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['products'] }); onSaved() },
    onError: (err: unknown) => {
      const msg = (err as { response?: { data?: { detail?: string } } })?.response?.data?.detail
      setServerError(msg || 'Erreur')
    },
  })

  const onDelete = async () => {
    if (!initial) return
    if (!window.confirm(`Supprimer "${initial.name}" ?`)) return
    try {
      await deleteProduct(initial.id)
      qc.invalidateQueries({ queryKey: ['products'] })
      onSaved()
    } catch (err: unknown) {
      const msg = (err as { response?: { data?: { detail?: string } } })?.response?.data?.detail
      setServerError(msg || 'Suppression impossible')
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4" onClick={onClose}>
      <form onClick={e => e.stopPropagation()}
        onSubmit={handleSubmit(v => mut.mutate(v))}
        className="bg-white rounded-xl shadow-xl ring-1 ring-stone-900/5 w-full max-w-lg p-6 space-y-4 max-h-[90vh] overflow-y-auto">
        <div className="flex items-center justify-between">
          <h3 className="text-lg font-bold text-stone-900">{isEdit ? 'Modifier le produit' : 'Nouveau produit'}</h3>
          <button type="button" onClick={onClose} className="text-stone-400 hover:text-stone-700"><X size={18} /></button>
        </div>

        {serverError && (
          <div className="px-3 py-2 rounded-lg bg-red-50 ring-1 ring-red-200 text-red-700 text-sm">⚠ {serverError}</div>
        )}

        <Field label="Nom" error={errors.name?.message}>
          <input {...register('name')} className={inputCls} />
        </Field>
        <Field label="SKU" error={errors.sku?.message}>
          <input {...register('sku')} className={`${inputCls} font-mono uppercase`} />
        </Field>
        <Field label="Unités par boîte" error={errors.units_per_box?.message}>
          <input type="number" min="1" {...register('units_per_box')} className={inputCls} />
        </Field>
        <div className="grid grid-cols-3 gap-3">
          <Field label="Coût unitaire">
            <input type="number" step="0.01" {...register('unit_cost')} className={inputCls} placeholder="0.00" />
          </Field>
          <Field label="Prix courtier">
            <input type="number" step="0.01" {...register('price_broker')} className={inputCls} placeholder="0.00" />
          </Field>
          <Field label="Prix direct">
            <input type="number" step="0.01" {...register('price_direct')} className={inputCls} placeholder="0.00" />
          </Field>
        </div>
        <div className="grid grid-cols-2 gap-3">
          <Field label="Devise">
            <select {...register('currency')} className={inputCls}>
              <option value="CAD">CAD</option>
              <option value="USD">USD</option>
            </select>
          </Field>
          <Field label="Image (URL)">
            <input {...register('image_url')} className={inputCls} placeholder="/brand/..." />
          </Field>
        </div>
        <label className="flex items-center gap-2 text-sm cursor-pointer">
          <input type="checkbox" {...register('active')} className="accent-chika-paprika" />
          <span>Produit actif</span>
        </label>

        <div className="flex items-center justify-between gap-2 pt-2 border-t border-stone-100">
          {isEdit && (
            <Button type="button" variant="danger" size="sm" onClick={onDelete}>Supprimer</Button>
          )}
          <div className="flex gap-2 ml-auto">
            <Button type="button" variant="ghost" onClick={onClose}>Annuler</Button>
            <Button type="submit" disabled={isSubmitting}>
              {isSubmitting ? '…' : isEdit ? 'Enregistrer' : 'Créer'}
            </Button>
          </div>
        </div>
      </form>
    </div>
  )
}

const inputCls = "w-full px-3 py-2 ring-1 ring-stone-300 rounded-lg focus:ring-2 focus:ring-chika-paprika focus:outline-none text-sm bg-white"

function Field({ label, error, children }: { label: string; error?: string; children: React.ReactNode }) {
  return (
    <div>
      <label className="block text-xs font-medium text-stone-700 mb-1">{label}</label>
      {children}
      {error && <p className="mt-1 text-xs text-red-600">{error}</p>}
    </div>
  )
}
