import { useState, useEffect } from 'react'
import { useSearchParams, Link } from 'react-router-dom'
import { todayISO } from '../lib/dates'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { Plus, X, Truck, DollarSign, Ban, Trash2, FileText, Tag, AlertTriangle } from 'lucide-react'
import { downloadInvoice } from '../components/Invoice'
import {
  listSales, createSale, updateSaleStatus, reviseLotPrice, reviseLoss,
  type SaleStatus, type SalePayload, type SaleItemPayload, type Sale, type SaleItem,
} from '../api/sales'
import { listClients, type Client } from '../api/clients'
import { listProducts, type Product } from '../api/products'
import { PageHeader } from '../components/shared/AppLayout'
import { Card } from '../components/ui/Card'
import { Button } from '../components/ui/Button'
import { Badge } from '../components/ui/Badge'
import { EmptyState } from '../components/ui/EmptyState'

const STATUS_META: Record<SaleStatus, { label: string; tone: 'neutral' | 'info' | 'success' | 'danger' }> = {
  PENDING:   { label: 'En attente', tone: 'neutral' },
  DELIVERED: { label: 'Livrée',     tone: 'info' },
  PAID:      { label: 'Payée',      tone: 'success' },
  CANCELLED: { label: 'Annulée',    tone: 'danger' },
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
  const [revisingLotPrice, setRevisingLotPrice] = useState<Sale | null>(null)
  const [revisingLoss, setRevisingLoss] = useState<Sale | null>(null)
  const [searchParams, setSearchParams] = useSearchParams()

  // Open the create form automatically if landed via FAB (?new=1)
  useEffect(() => {
    if (searchParams.get('new') === '1') {
      setShowForm(true)
      setSearchParams({}, { replace: true })
    }
  }, [searchParams, setSearchParams])

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
    <div className="px-4 sm:px-6 lg:px-10 py-6 sm:py-8 max-w-7xl">
      <PageHeader
        title="Ventes"
        description="Bons de vente courtier et magasin direct."
        action={
          <Button icon={<Plus size={16} />} onClick={() => setShowForm(true)}>
            Nouvelle vente
          </Button>
        }
      />

      <Card className="mb-4">
        <div className="p-4 flex items-center gap-3 flex-wrap">
          <div className="flex items-center gap-2">
            <label className="text-xs font-medium text-stone-600">Client</label>
            <select value={filterClient} onChange={e => setFilterClient(e.target.value)}
              className="px-3 py-1.5 ring-1 ring-stone-300 bg-white rounded-lg text-sm">
              <option value="">Tous</option>
              {clients.data?.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
            </select>
          </div>
          <div className="flex items-center gap-2">
            <label className="text-xs font-medium text-stone-600">Statut</label>
            <select value={filterStatus} onChange={e => setFilterStatus(e.target.value)}
              className="px-3 py-1.5 ring-1 ring-stone-300 bg-white rounded-lg text-sm">
              <option value="">Tous</option>
              {Object.entries(STATUS_META).map(([k, m]) => <option key={k} value={k}>{m.label}</option>)}
            </select>
          </div>
        </div>
      </Card>

      <Card>
        {sales.isLoading
          ? <div className="p-8 text-center text-stone-400 text-sm">Chargement…</div>
          : sales.data && sales.data.length === 0
          ? <EmptyState icon="🧾" title="Aucune vente" description="Enregistre ta première vente pour commencer."
              action={<Button icon={<Plus size={16} />} onClick={() => setShowForm(true)}>Nouvelle vente</Button>} />
          : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead className="bg-stone-50 text-[11px] uppercase tracking-wider text-stone-500">
                  <tr>
                    <th className="text-left px-5 py-3">#</th>
                    <th className="text-left px-5 py-3">Date</th>
                    <th className="text-left px-5 py-3">Client</th>
                    <th className="text-left px-5 py-3 hidden sm:table-cell">Articles</th>
                    <th className="text-right px-5 py-3">Total</th>
                    <th className="text-left px-5 py-3">Statut</th>
                    <th className="px-5 py-3"></th>
                  </tr>
                </thead>
                <tbody>
                  {(sales.data ?? []).map(s => {
                    const meta = STATUS_META[s.status]
                    return (
                      <tr key={s.id} className="border-t border-stone-200 hover:bg-stone-50 transition">
                        <td className="px-5 py-3 font-mono text-xs text-stone-500">#{s.id}</td>
                        <td className="px-5 py-3 text-stone-700">{fmtDate(s.sale_date)}</td>
                        <td className="px-5 py-3 font-medium text-stone-900">{s.client_name}</td>
                        <td className="px-5 py-3 text-stone-600 hidden sm:table-cell text-xs">
                          {s.items.map(it => describeLine(it)).join(', ')}
                        </td>
                        <td className="px-5 py-3 text-right tabular-nums text-stone-900">
                          <div className="font-semibold">{fmtCAD(s.total_amount)}<span className="text-[10px] text-stone-400 font-normal ml-0.5">HT</span></div>
                          <div className="text-[10px] text-stone-500">{fmtCAD(Number(s.total_amount) * 1.14975)} TTC</div>
                        </td>
                        <td className="px-5 py-3">
                          <Badge tone={meta.tone}>{meta.label}</Badge>
                          {s.payment_date && (
                            <div className="text-[10px] text-stone-400 mt-0.5">Payée le {fmtDate(s.payment_date)}</div>
                          )}
                        </td>
                        <td className="px-5 py-3 text-right">
                          <div className="flex gap-1 justify-end flex-wrap">
                            {s.status !== 'CANCELLED' && (
                              <Button size="sm" variant="ghost" icon={<FileText size={12} />}
                                onClick={() => downloadInvoice(s)}>
                                Facture
                              </Button>
                            )}
                            {s.status === 'PENDING' && (
                              <Button size="sm" variant="secondary" icon={<Truck size={12} />}
                                onClick={() => transitionMut.mutate({ id: s.id, status: 'DELIVERED' })}>
                                Livrée
                              </Button>
                            )}
                            {s.status === 'DELIVERED' && (
                              <Button size="sm" variant="primary" icon={<DollarSign size={12} />}
                                onClick={() => transitionMut.mutate({ id: s.id, status: 'PAID' })}>
                                Payée
                              </Button>
                            )}
                            {(s.status === 'PENDING' || s.status === 'DELIVERED') && (
                              <Button size="sm" variant="danger" icon={<Ban size={12} />}
                                onClick={() => {
                                  if (window.confirm('Annuler cette vente ? Le stock sera restauré.')) {
                                    transitionMut.mutate({ id: s.id, status: 'CANCELLED' })
                                  }
                                }}>
                                Annuler
                              </Button>
                            )}
                            {s.status !== 'CANCELLED' && (
                              <>
                                <Button size="sm" variant="ghost" icon={<Tag size={12} />}
                                  onClick={() => setRevisingLotPrice(s)}>
                                  Prix/lot
                                </Button>
                                <Button size="sm" variant="ghost" icon={<AlertTriangle size={12} />}
                                  onClick={() => setRevisingLoss(s)}>
                                  Perte
                                </Button>
                              </>
                            )}
                          </div>
                        </td>
                      </tr>
                    )
                  })}
                </tbody>
              </table>
            </div>
          )}
      </Card>

      {showForm && (
        <SaleForm onClose={() => setShowForm(false)} onSaved={() => {
          qc.invalidateQueries({ queryKey: ['sales'] })
          qc.invalidateQueries({ queryKey: ['inventory'] })
          qc.invalidateQueries({ queryKey: ['movements'] })
          setShowForm(false)
        }} />
      )}

      {revisingLotPrice && (
        <LotPriceRevisionModal
          sale={revisingLotPrice}
          onClose={() => setRevisingLotPrice(null)}
          onSaved={() => { qc.invalidateQueries({ queryKey: ['sales'] }); setRevisingLotPrice(null) }}
        />
      )}

      {revisingLoss && (
        <LossRevisionModal
          sale={revisingLoss}
          onClose={() => setRevisingLoss(null)}
          onSaved={() => { qc.invalidateQueries({ queryKey: ['sales'] }); setRevisingLoss(null) }}
        />
      )}
    </div>
  )
}

/** Résumé lisible d'une ligne de vente pour la colonne "Articles". */
function describeLine(it: SaleItem): string {
  if (it.line_type === 'LOT_ADJUSTMENT') {
    return `+${it.quantity_boxes} lot${it.quantity_boxes > 1 ? 's' : ''} révisés — ${it.product_name}`
  }
  if (it.line_type === 'LOSS_ADJUSTMENT') {
    return `−${it.quantity_boxes} unité${it.quantity_boxes > 1 ? 's' : ''} perte — ${it.product_name}`
  }
  return `${it.quantity_boxes}× ${it.product_name}`
}

interface Line {
  product_id: number | ''
  quantity_boxes: number
  unit_price: number
}

function SaleForm({ onClose, onSaved }: { onClose: () => void; onSaved: () => void }) {
  const clients = useQuery({ queryKey: ['clients', ''], queryFn: () => listClients() })
  const products = useQuery({ queryKey: ['products'], queryFn: listProducts })

  const today = todayISO()
  const [clientId, setClientId] = useState('')
  const [saleDate, setSaleDate] = useState(today)
  const [notes, setNotes] = useState('')
  const [lines, setLines] = useState<Line[]>([{ product_id: '', quantity_boxes: 1, unit_price: 0 }])
  const [serverError, setServerError] = useState<string | null>(null)

  const selectedClient: Client | undefined = clients.data?.find(c => c.id === Number(clientId))

  function updateLine(i: number, patch: Partial<Line>) {
    setLines(ls => ls.map((l, idx) => idx === i ? { ...l, ...patch } : l))
  }

  /** Calcule le prix par caisse pour un (produit, client) donné.
   *  Retourne 0 si le produit ou le client est manquant. */
  function calcPriceForProduct(product: Product | undefined, client: Client | undefined): number {
    if (!product || !client) return 0
    const upb = product.units_per_box || 1
    const direct = typeof product.price_direct === 'string' ? parseFloat(product.price_direct) : (product.price_direct || 0)
    if (client.type === 'STORE') {
      return +(direct * upb).toFixed(2)
    }
    // BROKER : utilise le taux du client, fallback price_broker
    const distribRate = typeof client.distribution_rate_pct === 'string'
      ? parseFloat(client.distribution_rate_pct)
      : (client.distribution_rate_pct ?? null)
    if (distribRate !== null && !isNaN(distribRate) && direct > 0) {
      return +(direct * (1 - distribRate) * upb).toFixed(2)
    }
    const fallback = typeof product.price_broker === 'string' ? parseFloat(product.price_broker) : (product.price_broker || 0)
    return +(fallback * upb).toFixed(2)
  }

  function pickProduct(i: number, productId: string) {
    const pid = Number(productId)
    const product = products.data?.find(p => p.id === pid)
    const price = calcPriceForProduct(product, selectedClient)
    updateLine(i, { product_id: pid, unit_price: price })
  }

  // Re-applique les prix quand le client change (utile si l'user a choisi
  // le produit AVANT de choisir le client : sans ce useEffect, le prix
  // resterait à 0 jusqu'à ré-ouvrir le dropdown produit).
  useEffect(() => {
    if (!selectedClient || !products.data) return
    setLines(ls => ls.map(l => {
      if (l.product_id === '') return l
      const product = products.data!.find(p => p.id === Number(l.product_id))
      const newPrice = calcPriceForProduct(product, selectedClient)
      // N'écrase pas un prix custom (user a tapé un montant différent)
      // que si le prix actuel = 0 OU correspond à l'ancien prix auto (déjà appliqué une fois)
      return { ...l, unit_price: newPrice }
    }))
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [clientId])

  function addLine() { setLines(ls => [...ls, { product_id: '', quantity_boxes: 1, unit_price: 0 }]) }
  function removeLine(i: number) { setLines(ls => ls.filter((_, idx) => idx !== i)) }

  const totalHT = lines.reduce((s, l) => s + l.quantity_boxes * l.unit_price, 0)
  // Taxes ligne par ligne : un produit non taxable (épicerie de base QC) n'a pas de TPS/TVQ.
  const taxableHT = lines.reduce((s, l) => {
    if (l.product_id === '') return s
    const product = products.data?.find(p => p.id === Number(l.product_id))
    return product?.taxable ? s + l.quantity_boxes * l.unit_price : s
  }, 0)
  const tps = +(taxableHT * 0.05).toFixed(2)
  const tvq = +(taxableHT * 0.09975).toFixed(2)
  const totalTTC = +(totalHT + tps + tvq).toFixed(2)

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
        className="bg-white rounded-xl shadow-xl ring-1 ring-stone-900/5 w-full max-w-2xl p-6 space-y-4 max-h-[90vh] overflow-y-auto">
        <div className="flex items-center justify-between">
          <h3 className="text-lg font-bold text-stone-900">Nouvelle vente</h3>
          <button type="button" onClick={onClose} className="text-stone-400 hover:text-stone-700"><X size={18} /></button>
        </div>
        {serverError && <div className="px-3 py-2 rounded-lg bg-red-50 ring-1 ring-red-200 text-red-700 text-sm">⚠ {serverError}</div>}

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
          <div className="text-xs text-chika-paprikaDeep bg-chika-creamSoft ring-1 ring-chika-cream px-3 py-2 rounded-lg">
            Prix unitaire pré-rempli selon le type <strong>{selectedClient.type === 'BROKER' ? 'courtier' : 'direct'}</strong>. Tu peux modifier.
          </div>
        )}

        <div>
          <div className="flex items-center justify-between mb-2">
            <label className="text-xs font-medium text-stone-700">Articles</label>
            <button onClick={addLine} type="button" className="text-xs text-chika-paprika hover:underline font-semibold">+ Ajouter une ligne</button>
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

        {/* Breakdown HT / Taxes / TTC */}
        <div className="border-t border-stone-200 pt-4 space-y-1">
          <div className="flex justify-between text-sm">
            <span className="text-stone-600">Total HT</span>
            <span className="tabular-nums font-semibold">{fmtCAD(totalHT)}</span>
          </div>
          {taxableHT > 0 ? (
            <>
              <div className="flex justify-between text-[10px] text-stone-400 italic">
                <span>Dont taxable HT</span>
                <span className="tabular-nums">{fmtCAD(taxableHT)}</span>
              </div>
              <div className="flex justify-between text-xs text-stone-500">
                <span>+ TPS (5 %)</span>
                <span className="tabular-nums">{fmtCAD(tps)}</span>
              </div>
              <div className="flex justify-between text-xs text-stone-500">
                <span>+ TVQ (9,975 %)</span>
                <span className="tabular-nums">{fmtCAD(tvq)}</span>
              </div>
            </>
          ) : (
            <div className="flex justify-between text-xs text-emerald-700 italic">
              <span>Tous produits détaxés (épicerie QC)</span>
              <span>0,00 $</span>
            </div>
          )}
          <div className="flex justify-between border-t border-stone-200 pt-2 mt-1">
            <span className="text-xs uppercase tracking-wider font-bold text-chika-paprika">Total TTC (à facturer)</span>
            <span className="text-xl font-bold tabular-nums text-chika-paprika">{fmtCAD(totalTTC)}</span>
          </div>
          <p className="text-[10px] text-stone-400 italic mt-1">
            Tu factures le TTC. Tu gardes le HT ; la TPS+TVQ collectée ({fmtCAD(tps + tvq)}) sera remise à Revenu Québec trimestriellement.
          </p>
        </div>

        <div className="flex gap-2 justify-end pt-2 border-t border-stone-200">
          <Button type="button" variant="ghost" onClick={onClose}>Annuler</Button>
          <Button type="button" disabled={mut.isPending} onClick={() => mut.mutate()}>
            {mut.isPending ? '…' : 'Créer la vente'}
          </Button>
        </div>
      </div>
    </div>
  )
}

function LotPriceRevisionModal({ sale, onClose, onSaved }: { sale: Sale; onClose: () => void; onSaved: () => void }) {
  const products = useQuery({ queryKey: ['products'], queryFn: listProducts })
  const originalItems = sale.items.filter(it => it.line_type === 'PRODUCT')

  const [amountPerLot, setAmountPerLot] = useState('5')
  const [reason, setReason] = useState('')
  const [lots, setLots] = useState<Record<number, number>>({})
  const [serverError, setServerError] = useState<string | null>(null)

  // Pré-calcule le nb de lots dès que les produits sont chargés (arrondi au
  // lot plein inférieur) — l'user peut ensuite ajuster manuellement.
  useEffect(() => {
    if (!products.data) return
    setLots(prev => {
      const next = { ...prev }
      for (const it of originalItems) {
        if (next[it.id] !== undefined) continue
        const product = products.data!.find(p => p.id === it.product_id)
        if (product?.boxes_per_lot) {
          next[it.id] = Math.floor(it.quantity_boxes / product.boxes_per_lot)
        }
      }
      return next
    })
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [products.data])

  const amount = parseFloat(amountPerLot) || 0
  const eligibleLines = originalItems
    .map(it => {
      const product = products.data?.find(p => p.id === it.product_id)
      return { item: it, product, lotCount: lots[it.id] ?? 0 }
    })
    .filter(l => l.product?.boxes_per_lot)

  const activeLines = eligibleLines.filter(l => l.lotCount > 0)
  const totalImpact = activeLines.reduce((s, l) => s + l.lotCount * amount, 0)

  const mut = useMutation({
    mutationFn: () => reviseLotPrice(sale.id, {
      amount_per_lot: amount,
      reason: reason.trim(),
      lines: activeLines.map(l => ({ item_id: l.item.id, lots: l.lotCount })),
    }),
    onSuccess: onSaved,
    onError: (err: unknown) => {
      const msg = (err as { response?: { data?: { detail?: string } } })?.response?.data?.detail
      setServerError(msg || 'Erreur')
    },
  })

  const noneEligible = products.data && eligibleLines.length === 0
  const canSubmit = amount > 0 && reason.trim().length > 0 && activeLines.length > 0

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4" onClick={onClose}>
      <div onClick={e => e.stopPropagation()}
        className="bg-white rounded-xl shadow-xl ring-1 ring-stone-900/5 w-full max-w-xl p-6 space-y-4 max-h-[90vh] overflow-y-auto">
        <div className="flex items-center justify-between">
          <h3 className="text-lg font-bold text-stone-900">Réviser le prix — vente #{sale.id}</h3>
          <button type="button" onClick={onClose} className="text-stone-400 hover:text-stone-700"><X size={18} /></button>
        </div>
        <p className="text-xs text-stone-500">
          Applique un montant additionnel par lot déjà fourni. La facture originale n'est pas modifiée —
          une ligne de révision s'ajoute, et le nouveau total remplace tout de suite l'ancien partout.
        </p>
        {serverError && <div className="px-3 py-2 rounded-lg bg-red-50 ring-1 ring-red-200 text-red-700 text-sm">⚠ {serverError}</div>}

        {noneEligible && (
          <div className="px-3 py-2 rounded-lg bg-amber-50 ring-1 ring-amber-200 text-amber-800 text-sm">
            Aucun produit de cette vente n'a de "caisses par lot" configuré. Va dans <strong>Produits</strong> pour le régler d'abord.
          </div>
        )}

        <Field label="Montant par lot ($)">
          <input type="number" step="0.01" min="0" value={amountPerLot}
            onChange={e => setAmountPerLot(e.target.value)} className={inputCls} />
        </Field>

        {eligibleLines.length > 0 && (
          <div className="space-y-2">
            <label className="text-xs font-medium text-stone-700">Lots à facturer par ligne</label>
            {eligibleLines.map(l => (
              <div key={l.item.id} className="grid grid-cols-[1fr,90px,90px,90px] gap-2 items-center text-sm">
                <div className="text-stone-800">
                  {l.item.product_name}
                  <div className="text-[10px] text-stone-400">{l.item.quantity_boxes} caisses facturées · {l.product!.boxes_per_lot} caisses/lot</div>
                </div>
                <input type="number" min="0" value={l.lotCount}
                  onChange={e => setLots(s => ({ ...s, [l.item.id]: Math.max(0, Number(e.target.value)) }))}
                  className={`${inputCls} text-right`} />
                <span className="text-stone-500 text-xs">lots</span>
                <span className="text-right font-semibold tabular-nums text-chika-paprika">
                  {fmtCAD(l.lotCount * amount)}
                </span>
              </div>
            ))}
          </div>
        )}

        <Field label="Raison de la révision">
          <textarea value={reason} onChange={e => setReason(e.target.value)} rows={2} className={inputCls}
            placeholder="Ex. Le client demande 5$ de plus par lot déjà fourni." />
        </Field>

        <div className="flex justify-between border-t border-stone-200 pt-3">
          <span className="text-xs uppercase tracking-wider font-bold text-stone-600">Impact total</span>
          <span className="text-xl font-bold tabular-nums text-chika-paprika">+{fmtCAD(totalImpact)}</span>
        </div>

        <div className="flex gap-2 justify-end pt-2 border-t border-stone-200">
          <Button type="button" variant="ghost" onClick={onClose}>Annuler</Button>
          <Button type="button" disabled={!canSubmit || mut.isPending} onClick={() => mut.mutate()}>
            {mut.isPending ? '…' : 'Appliquer la révision'}
          </Button>
        </div>
      </div>
    </div>
  )
}

function LossRevisionModal({ sale, onClose, onSaved }: { sale: Sale; onClose: () => void; onSaved: () => void }) {
  const originalItems = sale.items.filter(it => it.line_type === 'PRODUCT')
  const [unitsLost, setUnitsLost] = useState<Record<number, number>>({})
  const [reason, setReason] = useState('')
  const [serverError, setServerError] = useState<string | null>(null)

  const upbOf = (it: SaleItem) => it.product_units_per_box || 1
  const perUnitPrice = (it: SaleItem) => Number(it.unit_price) / upbOf(it)

  const activeLines = originalItems
    .map(it => ({ item: it, lost: unitsLost[it.id] ?? 0 }))
    .filter(l => l.lost > 0)
  const totalCredit = activeLines.reduce((s, l) => s + l.lost * perUnitPrice(l.item), 0)

  const mut = useMutation({
    mutationFn: () => reviseLoss(sale.id, {
      lines: activeLines.map(l => ({ item_id: l.item.id, units_lost: l.lost, reason: reason.trim() })),
    }),
    onSuccess: onSaved,
    onError: (err: unknown) => {
      const msg = (err as { response?: { data?: { detail?: string } } })?.response?.data?.detail
      setServerError(msg || 'Erreur')
    },
  })

  const canSubmit = activeLines.length > 0 && reason.trim().length > 0

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4" onClick={onClose}>
      <div onClick={e => e.stopPropagation()}
        className="bg-white rounded-xl shadow-xl ring-1 ring-stone-900/5 w-full max-w-xl p-6 space-y-4 max-h-[90vh] overflow-y-auto">
        <div className="flex items-center justify-between">
          <h3 className="text-lg font-bold text-stone-900">Déclarer une perte — vente #{sale.id}</h3>
          <button type="button" onClick={onClose} className="text-stone-400 hover:text-stone-700"><X size={18} /></button>
        </div>
        <p className="text-xs text-stone-500">
          Crédite le client pour des unités (sacs) perdues/endommagées sur une facture déjà émise —
          pas besoin qu'une caisse entière soit perdue. Le nouveau total remplace tout de suite l'ancien partout.
        </p>
        {serverError && <div className="px-3 py-2 rounded-lg bg-red-50 ring-1 ring-red-200 text-red-700 text-sm">⚠ {serverError}</div>}

        <div className="space-y-2">
          {originalItems.map(it => {
            const upb = upbOf(it)
            const totalUnits = it.quantity_boxes * upb
            return (
              <div key={it.id} className="grid grid-cols-[1fr,90px,90px,90px] gap-2 items-center text-sm">
                <div className="text-stone-800">
                  {it.product_name}
                  <div className="text-[10px] text-stone-400">
                    {it.quantity_boxes} caisses facturées ({totalUnits} unités) · {fmtCAD(perUnitPrice(it))}/unité
                  </div>
                </div>
                <input type="number" min="0" max={totalUnits} value={unitsLost[it.id] ?? 0}
                  onChange={e => setUnitsLost(s => ({ ...s, [it.id]: Math.max(0, Number(e.target.value)) }))}
                  className={`${inputCls} text-right`} />
                <span className="text-stone-500 text-xs">unités</span>
                <span className="text-right font-semibold tabular-nums text-red-600">
                  {(unitsLost[it.id] ?? 0) > 0 ? `−${fmtCAD((unitsLost[it.id] ?? 0) * perUnitPrice(it))}` : '—'}
                </span>
              </div>
            )
          })}
        </div>

        <Field label="Raison de la perte">
          <textarea value={reason} onChange={e => setReason(e.target.value)} rows={2} className={inputCls}
            placeholder="Ex. Carton endommagé pendant le transport." />
        </Field>

        <div className="px-3 py-2 rounded-lg bg-stone-50 ring-1 ring-stone-200 text-[11px] text-stone-500">
          Ceci corrige seulement la facture. Si la perte n'est pas déjà déclarée côté stock, pense aussi à
          l'ajouter dans <Link to="/mouvements" className="text-chika-paprika underline" onClick={onClose}>Mouvements</Link>.
        </div>

        <div className="flex justify-between border-t border-stone-200 pt-3">
          <span className="text-xs uppercase tracking-wider font-bold text-stone-600">Crédit total</span>
          <span className="text-xl font-bold tabular-nums text-red-600">−{fmtCAD(totalCredit)}</span>
        </div>

        <div className="flex gap-2 justify-end pt-2 border-t border-stone-200">
          <Button type="button" variant="ghost" onClick={onClose}>Annuler</Button>
          <Button type="button" variant="danger" disabled={!canSubmit || mut.isPending} onClick={() => mut.mutate()}>
            {mut.isPending ? '…' : 'Appliquer le crédit'}
          </Button>
        </div>
      </div>
    </div>
  )
}

const inputCls = "w-full px-3 py-2 ring-1 ring-stone-300 rounded-lg focus:ring-2 focus:ring-chika-paprika focus:outline-none text-sm bg-white"

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div>
      <label className="block text-xs font-medium text-stone-700 mb-1">{label}</label>
      {children}
    </div>
  )
}
