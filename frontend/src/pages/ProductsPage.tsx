import { Fragment, useState } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { Plus, Pencil, X, ChevronRight } from 'lucide-react'
import {
  listProducts, createProduct, updateProduct, deleteProduct, uploadProductImage,
  type Product, type ProductPayload,
} from '../api/products'
import { resolveImageUrl } from '../lib/axios'
import { PageHeader } from '../components/shared/AppLayout'
import { Card } from '../components/ui/Card'
import { Button } from '../components/ui/Button'
import { Badge } from '../components/ui/Badge'
import { EmptyState } from '../components/ui/EmptyState'

// Preprocess: convert empty strings (from <input>) to undefined so .optional() works cleanly.
const optNum = (max?: number) => {
  let n = z.coerce.number().min(0)
  if (max !== undefined) n = n.max(max)
  return z.preprocess((v) => (v === '' || v === null ? undefined : v), n.optional())
}

const schema = z.object({
  name: z.string().min(1, 'Requis'),
  sku: z.string().min(1, 'Requis'),
  units_per_box: z.coerce.number().int().positive('> 0 requis'),
  unit_cost: optNum(),
  consumer_price: optNum(),
  store_margin_pct: optNum(1),
  price_broker: optNum(),
  price_direct: optNum(),
  currency: z.string().length(3).default('CAD'),
  active: z.boolean().default(true),
  image_url: z.string().optional(),
  taxable: z.boolean().default(false),
})

type FormData = z.infer<typeof schema>

const num = (v: number | string | null | undefined): number | null => {
  if (v === null || v === undefined || v === '') return null
  const n = typeof v === 'string' ? parseFloat(v) : v
  return isFinite(n) ? n : null
}
const fmtCAD = (v: number | string | null | undefined) => {
  const n = num(v)
  return n === null ? '—' : new Intl.NumberFormat('fr-CA', { style: 'currency', currency: 'CAD' }).format(n)
}
const fmtPct = (v: number | string | null | undefined) => {
  const n = num(v)
  return n === null ? '—' : `${(n * 100).toFixed(0)} %`
}

export default function ProductsPage() {
  const qc = useQueryClient()
  const { data: products = [], isLoading } = useQuery({ queryKey: ['products'], queryFn: listProducts })
  const [editing, setEditing] = useState<Product | null>(null)
  const [showForm, setShowForm] = useState(false)
  const [expanded, setExpanded] = useState<number | null>(null)

  return (
    <div className="px-4 sm:px-6 lg:px-10 py-6 sm:py-8 max-w-7xl">
      <PageHeader
        title="Produits"
        description="Catalogue — structure de prix complète (PDS → marge magasin → distribution)."
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
                    <th className="text-left px-5 py-3 w-12"></th>
                    <th className="text-left px-5 py-3">Produit</th>
                    <th className="text-left px-5 py-3 hidden sm:table-cell">SKU</th>
                    <th className="text-right px-5 py-3 hidden md:table-cell">U/cs</th>
                    <th className="text-right px-5 py-3">PDS</th>
                    <th className="text-right px-5 py-3 hidden md:table-cell">Prix magasin</th>
                    <th className="text-right px-5 py-3 hidden md:table-cell">Net distrib.</th>
                    <th className="text-center px-5 py-3">Statut</th>
                    <th className="px-5 py-3 w-12"></th>
                  </tr>
                </thead>
                <tbody>
                  {products.map(p => {
                    const isOpen = expanded === p.id
                    const upb = p.units_per_box
                    const costNet = num(p.price_broker)
                    const caisseValue = costNet !== null ? costNet * upb : null
                    return (
                      <Fragment key={p.id}>
                        <tr className={`border-t border-stone-200 hover:bg-stone-50 transition ${!p.active && 'opacity-50'}`}>
                          <td className="px-5 py-3">
                            <button onClick={() => setExpanded(isOpen ? null : p.id)}
                              className="text-stone-400 hover:text-stone-700">
                              <ChevronRight size={14} className={`transition ${isOpen ? 'rotate-90' : ''}`} />
                            </button>
                          </td>
                          <td className="px-5 py-3">
                            <div className="flex items-center gap-3">
                              {p.image_url && (
                                <img src={resolveImageUrl(p.image_url) ?? ''} alt={p.name}
                                     className="w-10 h-10 object-contain rounded-md bg-stone-50 ring-1 ring-stone-100 shrink-0" />
                              )}
                              <span className="font-medium text-stone-900">{p.name}</span>
                            </div>
                          </td>
                          <td className="px-5 py-3 font-mono text-xs text-stone-500 hidden sm:table-cell">{p.sku}</td>
                          <td className="px-5 py-3 text-right tabular-nums hidden md:table-cell text-stone-600">{upb}</td>
                          <td className="px-5 py-3 text-right tabular-nums font-semibold text-chika-paprika">{fmtCAD(p.consumer_price)}</td>
                          <td className="px-5 py-3 text-right tabular-nums hidden md:table-cell text-stone-700">
                            <div>{fmtCAD(p.price_direct)}<span className="text-stone-400 text-[10px] ml-0.5">/u</span></div>
                            <div className="text-[10px] text-stone-500">{fmtCAD(num(p.price_direct) !== null ? Number(p.price_direct) * upb : null)}/caisse</div>
                          </td>
                          <td className="px-5 py-3 text-right tabular-nums hidden md:table-cell text-stone-900">
                            <div className="font-semibold">{fmtCAD(p.price_broker)}<span className="text-stone-400 text-[10px] ml-0.5 font-normal">/u</span></div>
                            <div className="text-[10px] text-stone-500 font-normal">{fmtCAD(caisseValue)}/caisse</div>
                          </td>
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
                        {isOpen && (
                          <tr className="bg-chika-creamSoft/40 border-t border-stone-200">
                            <td></td>
                            <td colSpan={8} className="px-5 py-4">
                              <PricingBreakdown product={p} costNetCaisse={caisseValue} />
                            </td>
                          </tr>
                        )}
                      </Fragment>
                    )
                  })}
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

function PricingBreakdown({ product: p, costNetCaisse }: { product: Product; costNetCaisse: number | null }) {
  // Calcule la vraie commission courtier appliquée à partir des prix stockés
  const brokerPctReal = (p.price_direct && p.price_broker && p.price_direct > 0)
    ? Math.round((1 - Number(p.price_broker) / Number(p.price_direct)) * 100)
    : null
  return (
    <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-3 text-xs">
      <Step
        label="Prix de vente consommateur (PDS)"
        value={fmtCAD(p.consumer_price)}
        sub="Affiché en magasin"
      />
      <Step
        label={`Moins marge magasin ${fmtPct(p.store_margin_pct)}`}
        value={fmtCAD(p.price_direct)}
        sub="= Prix coûtant magasin (ce que paie un STORE)"
      />
      <Step
        label={`Moins distribution${brokerPctReal !== null ? ` ${brokerPctReal}%` : ''}`}
        value={fmtCAD(p.price_broker)}
        sub="= Cost net distributeur (ce que tu reçois via BROKER)"
        highlight
      />
      <Step
        label={`Par caisse (× ${p.units_per_box} unités)`}
        value={fmtCAD(costNetCaisse)}
        sub="Prix d'une caisse en circuit courtier"
      />
    </div>
  )
}

function Step({ label, value, sub, highlight }: { label: string; value: string; sub: string; highlight?: boolean }) {
  return (
    <div className={`bg-white rounded-lg p-3 ring-1 ${highlight ? 'ring-chika-paprika/40' : 'ring-stone-300'}`}>
      <div className="text-[10px] uppercase tracking-wider text-stone-500 font-semibold">{label}</div>
      <div className={`text-xl font-bold tabular-nums mt-1 ${highlight ? 'text-chika-paprika' : 'text-stone-900'}`}>{value}</div>
      <div className="text-[10px] text-stone-500 mt-1">{sub}</div>
    </div>
  )
}

function ProductForm({ initial, onClose, onSaved }: {
  initial: Product | null; onClose: () => void; onSaved: () => void
}) {
  const qc = useQueryClient()
  const isEdit = !!initial
  const [serverError, setServerError] = useState<string | null>(null)

  const { register, handleSubmit, watch, setValue, formState: { errors, isSubmitting } } = useForm<FormData>({
    // z.coerce.number infers input as `unknown`; cast keeps RHF happy.
    resolver: zodResolver(schema) as never,
    defaultValues: initial
      ? {
          name: initial.name, sku: initial.sku, units_per_box: initial.units_per_box,
          unit_cost: initial.unit_cost == null ? undefined : Number(initial.unit_cost),
          consumer_price: initial.consumer_price == null ? undefined : Number(initial.consumer_price),
          store_margin_pct: initial.store_margin_pct == null ? undefined : Number(initial.store_margin_pct),
          price_broker: initial.price_broker == null ? undefined : Number(initial.price_broker),
          price_direct: initial.price_direct == null ? undefined : Number(initial.price_direct),
          currency: initial.currency, active: initial.active, image_url: initial.image_url ?? '',
          taxable: initial.taxable ?? false,
        }
      : { currency: 'CAD', active: true, units_per_box: 10, store_margin_pct: 0.35, taxable: false },
  })

  // Auto-derive direct + broker prices from consumer_price + store_margin_pct
  // Commission courtier ajustable (par défaut 18%, mais varie selon le contrat)
  const [brokerCommission, setBrokerCommission] = useState<number>(0.18)

  // Image : choix entre URL externe ou upload fichier local
  const [imageMode, setImageMode] = useState<'url' | 'upload'>(
    initial?.image_url?.startsWith('/uploads/') ? 'upload' : 'url'
  )
  const [pendingFile, setPendingFile] = useState<File | null>(null)
  const [previewUrl, setPreviewUrl] = useState<string | null>(initial?.image_url ?? null)

  function onFileSelected(e: React.ChangeEvent<HTMLInputElement>) {
    const f = e.target.files?.[0]
    if (!f) return
    if (!['image/jpeg','image/png','image/webp','image/gif'].includes(f.type)) {
      setServerError('Type de fichier non supporté (jpeg/png/webp/gif uniquement)')
      return
    }
    if (f.size > 5 * 1024 * 1024) {
      setServerError('Image trop volumineuse (max 5 MB)')
      return
    }
    setPendingFile(f)
    setPreviewUrl(URL.createObjectURL(f))
    setServerError(null)
  }
  const consumer = num(watch('consumer_price'))
  const margin = num(watch('store_margin_pct'))
  const direct = consumer !== null && margin !== null ? +(consumer * (1 - margin)).toFixed(2) : null
  const broker = direct !== null ? +(direct * (1 - brokerCommission)).toFixed(2) : null
  const brokerPct = Math.round(brokerCommission * 100)

  function applyDerived() {
    if (direct !== null) setValue('price_direct', direct)
    if (broker !== null) setValue('price_broker', broker)
  }

  const mut = useMutation({
    mutationFn: async (v: FormData) => {
      const payload: ProductPayload = {
        name: v.name, sku: v.sku, units_per_box: Number(v.units_per_box),
        unit_cost:        v.unit_cost ?? null,
        consumer_price:   v.consumer_price ?? null,
        store_margin_pct: v.store_margin_pct ?? null,
        price_broker:     v.price_broker ?? null,
        price_direct:     v.price_direct ?? null,
        currency: v.currency, active: v.active, taxable: v.taxable,
        // En mode upload, l'URL sera set par l'endpoint upload après création
        image_url: imageMode === 'url' ? (v.image_url || null) : (initial?.image_url ?? null),
      }
      const product = isEdit
        ? await updateProduct(initial!.id, payload)
        : await createProduct(payload)
      // Si un fichier est en attente, l'uploader maintenant (set image_url)
      if (imageMode === 'upload' && pendingFile) {
        return await uploadProductImage(product.id, pendingFile)
      }
      return product
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
        className="bg-white rounded-xl shadow-xl ring-1 ring-stone-900/5 w-full max-w-xl p-6 space-y-4 max-h-[90vh] overflow-y-auto">
        <div className="flex items-center justify-between">
          <h3 className="text-lg font-bold text-stone-900">{isEdit ? 'Modifier le produit' : 'Nouveau produit'}</h3>
          <button type="button" onClick={onClose} className="text-stone-400 hover:text-stone-700"><X size={18} /></button>
        </div>

        {serverError && (
          <div className="px-3 py-2 rounded-lg bg-red-50 ring-1 ring-red-200 text-red-700 text-sm">⚠ {serverError}</div>
        )}

        <div className="grid grid-cols-2 gap-3">
          <Field label="Nom" error={errors.name?.message}>
            <input {...register('name')} className={inputCls} />
          </Field>
          <Field label="SKU" error={errors.sku?.message}>
            <input {...register('sku')} className={`${inputCls} font-mono uppercase`} />
          </Field>
        </div>
        <div className="grid grid-cols-3 gap-3">
          <Field label="Unités par caisse" error={errors.units_per_box?.message}>
            <input type="number" min="1" {...register('units_per_box')} className={inputCls} />
          </Field>
          <Field label="Coût unitaire (production)">
            <input type="number" step="0.01" {...register('unit_cost')} className={inputCls} placeholder="0.00" />
          </Field>
          <Field label="Devise">
            <select {...register('currency')} className={inputCls}>
              <option value="CAD">CAD</option>
              <option value="USD">USD</option>
            </select>
          </Field>
        </div>

        <div className="bg-chika-creamSoft/50 ring-1 ring-chika-cream rounded-lg p-4 space-y-3">
          <div className="text-xs font-semibold text-chika-brown uppercase tracking-wider">Structure de prix</div>
          <div className="grid grid-cols-3 gap-3">
            <Field label="PDS — Prix consommateur" error={errors.consumer_price?.message}>
              <input type="number" step="0.01" {...register('consumer_price')} className={inputCls} placeholder="9.99" />
            </Field>
            <Field label="Marge magasin (fraction)" error={errors.store_margin_pct?.message}>
              <input type="number" step="0.01" min="0" max="1" {...register('store_margin_pct')} className={inputCls} placeholder="0.35" />
            </Field>
            <Field label="Commission courtier (fraction)">
              <input type="number" step="0.01" min="0" max="1"
                value={brokerCommission}
                onChange={e => setBrokerCommission(Math.max(0, Math.min(1, parseFloat(e.target.value) || 0)))}
                className={inputCls} placeholder="0.18" />
            </Field>
          </div>
          <div className="text-xs text-chika-brown flex items-center justify-between gap-2">
            <span>
              Auto-calculé : prix magasin <strong className="tabular-nums text-stone-900">{direct !== null ? fmtCAD(direct) : '—'}</strong>
              {' · '}cost net ({brokerPct}%) <strong className="tabular-nums text-chika-paprika">{broker !== null ? fmtCAD(broker) : '—'}</strong>
            </span>
            <Button type="button" variant="secondary" size="sm" onClick={applyDerived}>
              Appliquer
            </Button>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <Field label="Prix direct magasin (CAD)">
              <input type="number" step="0.01" {...register('price_direct')} className={inputCls} placeholder="6.49" />
            </Field>
            <Field label="Prix courtier net (CAD)">
              <input type="number" step="0.01" {...register('price_broker')} className={inputCls} placeholder="5.32" />
            </Field>
          </div>
        </div>

        <div className="space-y-2">
          <div className="text-xs font-semibold text-stone-600 uppercase tracking-wider">Image du produit</div>
          <div className="flex gap-1.5">
            <button type="button" onClick={() => setImageMode('url')}
              className={`flex-1 py-1.5 rounded-lg text-xs font-semibold ${imageMode === 'url' ? 'bg-chika-paprika text-white' : 'bg-stone-100 text-stone-600'}`}>
              🔗 URL externe
            </button>
            <button type="button" onClick={() => setImageMode('upload')}
              className={`flex-1 py-1.5 rounded-lg text-xs font-semibold ${imageMode === 'upload' ? 'bg-chika-paprika text-white' : 'bg-stone-100 text-stone-600'}`}>
              📁 Upload depuis PC
            </button>
          </div>

          {imageMode === 'url' ? (
            <Field label="URL de l'image">
              <input {...register('image_url')} className={inputCls}
                placeholder="https://... ou /brand/..."
                onChange={(e) => setPreviewUrl(e.target.value || null)} />
            </Field>
          ) : (
            <div className="space-y-2">
              <Field label="Choisir un fichier (jpeg/png/webp/gif, max 5 MB)">
                <input type="file" accept="image/jpeg,image/png,image/webp,image/gif"
                  onChange={onFileSelected}
                  className={`${inputCls} file:mr-3 file:px-3 file:py-1 file:rounded file:border-0 file:bg-stone-100 file:text-stone-700 file:text-xs file:font-semibold`} />
              </Field>
              {pendingFile && (
                <div className="text-[11px] text-stone-500">
                  📎 {pendingFile.name} · {(pendingFile.size / 1024).toFixed(0)} KB · sera uploadé à la sauvegarde
                </div>
              )}
            </div>
          )}

          {previewUrl && (
            <div className="mt-2 p-2 bg-stone-50 rounded-lg ring-1 ring-stone-300 flex items-center gap-3">
              <img src={previewUrl.startsWith('blob:') ? previewUrl : (resolveImageUrl(previewUrl) ?? previewUrl)}
                alt="Aperçu" className="w-16 h-16 object-cover rounded"
                onError={(e) => { (e.target as HTMLImageElement).style.display = 'none' }} />
              <div className="text-[11px] text-stone-500 truncate flex-1">
                {previewUrl.startsWith('blob:') ? 'Aperçu local (avant upload)' : previewUrl}
              </div>
            </div>
          )}
        </div>

        <div className="space-y-2 border-t border-stone-200 pt-3">
          <label className="flex items-center gap-2 text-sm cursor-pointer">
            <input type="checkbox" {...register('active')} className="accent-chika-paprika" />
            <span>Produit actif</span>
          </label>
          <label className="flex items-start gap-2 text-sm cursor-pointer">
            <input type="checkbox" {...register('taxable')} className="accent-chika-paprika mt-0.5" />
            <span>
              Soumis aux taxes (TPS + TVQ)
              <span className="block text-[10px] text-stone-500 mt-0.5">
                ⚠️ Au Québec, l'épicerie de base est <strong>détaxée</strong> (légumes, viande, sauces alimentaires). Coche seulement si ce produit est taxable (ex: cadeaux, marketing, produits non alimentaires).
              </span>
            </span>
          </label>
        </div>

        <div className="flex items-center justify-between gap-2 pt-2 border-t border-stone-200">
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
