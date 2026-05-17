import { useState } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { Plus, X, Truck, DollarSign, Ban, Trash2 } from 'lucide-react'
import {
  listSales, createSale, updateSaleStatus,
  type Sale, type SaleStatus, type SalePayload, type SaleItemPayload,
} from '../api/sales'
import { listClients, type Client } from '../api/clients'
import { listProducts, type Product } from '../api/products'
import { PageHeader } from '../components/shared/AppLayout'

const STATUS_META: Record<SaleStatus, { label: string; cls: string }> = {
  PENDING:   { label: 'En attente', cls: 'bg-stone-200 text-stone-700' },
  DELIVERED: { label: 'Livrée',     cls: 'bg-blue-100 text-blue-700' },
  PAID:      { label: 'Payée',      cls: 'bg-emerald-100 text-emerald-700' },
  CANCELLED: { label: 'Annulée',    cls: 'bg-red-100 text-red-700' },
}

const fmtCAD = (v: number | string) =>
  new Intl.NumberFormat('fr-CA', { style: 'currency', currency: 'CAD' })
    .format(typeof v === 'string' ? parseFloat(v) : v)

const fmtDate = (iso: string) =>
  new Date(iso).toLocaleDateString('fr-CA', { day: '2-digit', month: 'short', year: 'numeric' })

export default function SalesPage() {
  const qc = useQueryClient()
  const [filterClient, setFilterClient] = useState('')
  const [filterStatus, setFilterStatus] = useState('')
  const [showForm, setShowForm] = useState(false)

  const clients = useQuery({ queryKey: ['clients', ''], queryFn: () => listClients() })
  const sales = useQuery({
    queryKey: ['sales', filterClient, filterStatus],
    queryFn: () => listSales({
      client_id: filterClient ? Number(filterClient) : undefined,
      status: (filterStatus as SaleStatus) || undefined,
    }),
  })

  const transitionMut = useMutation({
    mutationFn: ({ id, status }: { id: number; status: SaleStatus }) => updateSaleStatus(id, status),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['sales'] })
      qc.invalidateQueries({ queryKey: ['inventory'] })
      qc.invalidateQueries({ queryKey: ['movements'] })
    },
    onError: (err: unknown) => {
      const msg = (err as { response?: { data?: { detail?: string } } })?.response?.data?.detail
      alert(msg || 'Erreur')
    },
  })

  return (
    <div className="px-6 lg:px-10 py-8 max-w-6xl">
      <PageHeader
        title="Ventes"
        description="Bons de vente courtier et magasin direct."
        action={
          <button onClick={() => setShowForm(true)}
            className="inline-flex items-center gap-1.5 bg-chika-paprika hover:bg-chika-paprikaDeep text-white text-sm font-semibold px-4 py-2 rounded-lg shadow-sm">
            <Plus size={16} /> Nouvelle vente
          </button>
        }
      />

      <div className="bg-white rounded-2xl border border-stone-200 p-4 mb-4 flex items-center gap-3 flex-wrap">
        <div className="flex items-center gap-2">
          <label className="text-sm font-semibold text-stone-700">Client :</label>
          <select value={filterClient} onChange={e => setFilterClient(e.target.value)}
            className="px-3 py-1.5 border border-stone-300 rounded-lg text-sm">
            <option value="">Tous</option>
            {clients.data?.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
          </select>
        </div>
        <div className="flex items-center gap-2">
          <label className="text-sm font-semibold text-stone-700">Statut :</label>
          <select value={filterStatus} onChange={e => setFilterStatus(e.target.value)}
            className="px-3 py-1.5 border border-stone-300 rounded-lg text-sm">
            <option value="">Tous</option>
            {Object.entries(STATUS_META).map(([k, m]) => <option key={k} value={k}>{m.label}</option>)}
          </select>
        </div>
      </div>

      <div className="bg-white rounded-2xl border border-stone-200 overflow-hidden">
        <table className="w-full text-sm">
          <thead className="bg-stone-50 text-[11px] uppercase tracking-wider text-stone-500">
            <tr>
              <th className="text-left px-4 py-3">#</th>
              <th className="text-left px-4 py-3">Date</th>
              <th className="text-left px-4 py-3">Client</th>
              <th className="text-left px-4 py-3 hidden sm:table-cell">Articles</th>
              <th className="text-right px-4 py-3">Total</th>
              <th className="text-left px-4 py-3">Statut</th>
              <th className="px-4 py-3"></th>
            </tr>
          </thead>
          <tbody>
            {(sales.data ?? []).map(s => {
              const meta = STATUS_META[s.status]
              return (
                <tr key={s.id} className="border-t border-stone-100 hover:bg-stone-50">
                  <td className="px-4 py-3 font-mono text-xs text-stone-500">#{s.id}</td>
                  <td className="px-4 py-3 text-stone-700">{fmtDate(s.sale_date)}</td>
                  <td className="px-4 py-3 font-semibold text-stone-900">{s.client_name}</td>
                  <td className="px-4 py-3 text-stone-600 hidden sm:table-cell text-xs">
                    {s.items.map(it => `${it.quantity_boxes}× ${it.product_name}`).join(', ')}
                  </td>
                  <td className="px-4 py-3 text-right tabular-nums font-bold text-chika-paprika">{fmtCAD(s.total_amount)}</td>
                  <td className="px-4 py-3">
                    <span className={`inline-block px-2 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider ${meta.cls}`}>
                      {meta.label}
                    </span>
                    {s.payment_date && (
                      <div className="text-[10px] text-stone-400 mt-0.5">Payée le {fmtDate(s.payment_date)}</div>
                    )}
                  </td>
                  <td className="px-4 py-3 text-right">
                    <div className="flex gap-1 justify-end">
                      {s.status === 'PENDING' && (
                        <button onClick={() => transitionMut.mutate({ id: s.id, status: 'DELIVERED' })}
                          title="Marquer livré"
                          className="text-xs text-blue-700 hover:bg-blue-50 px-2 py-1 rounded flex items-center gap-1">
                          <Truck size={12} /> Livré
                        </button>
                      )}
                      {s.status === 'DELIVERED' && (
                        <button onClick={() => transitionMut.mutate({ id: s.id, status: 'PAID' })}
                          title="Marquer payé"
                          className="text-xs text-emerald-700 hover:bg-emerald-50 px-2 py-1 rounded flex items-center gap-1">
                          <DollarSign size={12} /> Payé
                        </button>
                      )}
                      {(s.status === 'PENDING' || s.status === 'DELIVERED') && (
                        <button onClick={() => {
                          if (window.confirm('Annuler cette vente ? Le stock sera restauré.')) {
                            transitionMut.mutate({ id: s.id, status: 'CANCELLED' })
                          }
                        }}
                          title="Annuler"
                          className="text-xs text-red-600 hover:bg-red-50 px-2 py-1 rounded flex items-center gap-1">
                          <Ban size={12} />
                        </button>
                      )}
                    </div>
                  </td>
                </tr>
              )
            })}
            {sales.data && sales.data.length === 0 && (
              <tr><td colSpan={7} className="px-4 py-8 text-center text-stone-400">Aucune vente.</td></tr>
            )}
          </tbody>
        </table>
      </div>

      {showForm && (
        <SaleForm onClose={() => setShowForm(false)} onSaved={() => {
          qc.invalidateQueries({ queryKey: ['sales'] })
          qc.invalidateQueries({ queryKey: ['inventory'] })
          qc.invalidateQueries({ queryKey: ['movements'] })
          setShowForm(false)
        }} />
      )}
    </div>
  )
}

interface Line {
  product_id: number | ''
  quantity_boxes: number
  unit_price: number
}

function SaleForm({ onClose, onSaved }: { onClose: () => void; onSaved: () => void }) {
  const clients = useQuery({ queryKey: ['clients', ''], queryFn: () => listClients() })
  const products = useQuery({ queryKey: ['products'], queryFn: listProducts })

  const today = new Date().toISOString().slice(0, 10)
  const [clientId, setClientId] = useState('')
  const [saleDate, setSaleDate] = useState(today)
  const [notes, setNotes] = useState('')
  const [lines, setLines] = useState<Line[]>([{ product_id: '', quantity_boxes: 1, unit_price: 0 }])
  const [serverError, setServerError] = useState<string | null>(null)

  const selectedClient: Client | undefined = clients.data?.find(c => c.id === Number(clientId))

  function updateLine(i: number, patch: Partial<Line>) {
    setLines(ls => ls.map((l, idx) => idx === i ? { ...l, ...patch } : l))
  }

  function pickProduct(i: number, productId: string) {
    const pid = Number(productId)
    const product: Product | undefined = products.data?.find(p => p.id === pid)
    // Auto-fill unit_price based on client type
    let price = 0
    if (product && selectedClient) {
      const raw = selectedClient.type === 'BROKER' ? product.price_broker : product.price_direct
      price = typeof raw === 'string' ? parseFloat(raw) : (raw || 0)
    }
    updateLine(i, { product_id: pid, unit_price: price })
  }

  function addLine() { setLines(ls => [...ls, { product_id: '', quantity_boxes: 1, unit_price: 0 }]) }
  function removeLine(i: number) { setLines(ls => ls.filter((_, idx) => idx !== i)) }

  const total = lines.reduce((s, l) => s + l.quantity_boxes * l.unit_price, 0)

  const mut = useMutation({
    mutationFn: async () => {
      if (!clientId) throw new Error('Client requis')
      const items: SaleItemPayload[] = lines
        .filter(l => l.product_id !== '' && l.quantity_boxes > 0)
        .map(l => ({
          product_id: Number(l.product_id),
          quantity_boxes: Number(l.quantity_boxes),
          unit_price: Number(l.unit_price),
        }))
      if (items.length === 0) throw new Error('Au moins une ligne requise')
      const payload: SalePayload = {
        client_id: Number(clientId),
        sale_date: saleDate,
        items,
        notes: notes || null,
        currency: 'CAD',
      }
      return createSale(payload)
    },
    onSuccess: onSaved,
    onError: (err: unknown) => {
      const msg = (err as { response?: { data?: { detail?: string } } })?.response?.data?.detail
                  || (err as Error)?.message
      setServerError(msg || 'Erreur')
    },
  })

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4" onClick={onClose}>
      <div onClick={e => e.stopPropagation()}
        className="bg-white rounded-2xl shadow-xl w-full max-w-2xl p-6 space-y-4 max-h-[90vh] overflow-y-auto">
        <div className="flex items-center justify-between">
          <h3 className="text-lg font-bold text-stone-900">Nouvelle vente</h3>
          <button type="button" onClick={onClose} className="text-stone-400 hover:text-stone-700"><X size={18} /></button>
        </div>
        {serverError && <div className="px-3 py-2 rounded-lg bg-red-50 border border-red-200 text-red-700 text-sm">⚠ {serverError}</div>}

        <div className="grid grid-cols-2 gap-3">
          <Field label="Client">
            <select value={clientId} onChange={e => setClientId(e.target.value)} className={inputCls}>
              <option value="">Choisir…</option>
              {clients.data?.map(c => (
                <option key={c.id} value={c.id}>
                  {c.name} ({c.type === 'BROKER' ? 'Courtier' : 'Magasin'})
                </option>
              ))}
            </select>
          </Field>
          <Field label="Date de vente">
            <input type="date" value={saleDate} onChange={e => setSaleDate(e.target.value)} className={inputCls} />
          </Field>
        </div>

        {selectedClient && (
          <div className="text-xs text-chika-paprikaDeep bg-chika-creamSoft border border-chika-cream px-3 py-2 rounded-lg">
            Prix unitaire pré-rempli selon le type <strong>{selectedClient.type === 'BROKER' ? 'courtier' : 'direct'}</strong>. Tu peux modifier.
          </div>
        )}

        <div>
          <div className="flex items-center justify-between mb-2">
            <label className="text-xs font-semibold text-stone-600">Articles</label>
            <button onClick={addLine} type="button" className="text-xs text-chika-paprika hover:underline">+ Ajouter une ligne</button>
          </div>
          <div className="space-y-2">
            {lines.map((l, i) => (
              <div key={i} className="grid grid-cols-[1fr,80px,100px,40px] gap-2 items-center">
                <select value={l.product_id} onChange={e => pickProduct(i, e.target.value)} className={inputCls}>
                  <option value="">Produit…</option>
                  {products.data?.map(p => <option key={p.id} value={p.id}>{p.name}</option>)}
                </select>
                <input type="number" min="1" value={l.quantity_boxes}
                  onChange={e => updateLine(i, { quantity_boxes: Number(e.target.value) })}
                  className={`${inputCls} text-right`} placeholder="Bts" />
                <input type="number" step="0.01" min="0" value={l.unit_price}
                  onChange={e => updateLine(i, { unit_price: Number(e.target.value) })}
                  className={`${inputCls} text-right`} placeholder="$/u" />
                {lines.length > 1 && (
                  <button onClick={() => removeLine(i)} type="button" className="text-stone-400 hover:text-red-600 p-1">
                    <Trash2 size={14} />
                  </button>
                )}
              </div>
            ))}
          </div>
        </div>

        <Field label="Notes (optionnel)">
          <textarea value={notes} onChange={e => setNotes(e.target.value)} rows={2} className={inputCls} />
        </Field>

        <div className="flex items-center justify-between border-t border-stone-200 pt-3">
          <div>
            <div className="text-xs text-stone-500 uppercase tracking-wider">Total</div>
            <div className="text-2xl font-bold text-chika-paprika tabular-nums">{fmtCAD(total)}</div>
          </div>
          <div className="flex gap-2">
            <button type="button" onClick={onClose} className="px-3 py-2 rounded-lg text-sm text-stone-600 hover:bg-stone-100">Annuler</button>
            <button type="button" onClick={() => mut.mutate()} disabled={mut.isPending}
              className="bg-chika-paprika hover:bg-chika-paprikaDeep disabled:opacity-50 text-white text-sm font-semibold px-4 py-2 rounded-lg">
              {mut.isPending ? '…' : 'Créer la vente'}
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}

const inputCls = "w-full px-3 py-2 border border-stone-300 rounded-lg focus:ring-2 focus:ring-chika-paprika focus:border-chika-paprika focus:outline-none text-sm"

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div>
      <label className="block text-xs font-semibold text-stone-600 mb-1">{label}</label>
      {children}
    </div>
  )
}
