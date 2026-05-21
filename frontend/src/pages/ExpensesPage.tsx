import { useMemo, useState } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { Plus, X, Trash2 } from 'lucide-react'
import {
  listExpenses, listCategories, createExpense, deleteExpense,
  type Expense, type ExpensePayload,
} from '../api/expenses'
import { listProducts } from '../api/products'
import { PageHeader } from '../components/shared/AppLayout'

const schema = z.object({
  category_id: z.coerce.number().int().positive('Requise'),
  product_id: z.string().optional(),
  amount: z.coerce.number().min(0, '≥ 0'),
  expense_date: z.string().min(1, 'Requise'),
  vendor: z.string().optional().or(z.literal('')),
  description: z.string().min(1, 'Requise'),
  receipt_url: z.string().optional().or(z.literal('')),
  tps_paid: z.string().optional().or(z.literal('')),
  tvq_paid: z.string().optional().or(z.literal('')),
  vendor_tps_number: z.string().optional().or(z.literal('')),
  vendor_tvq_number: z.string().optional().or(z.literal('')),
  expense_type: z.enum(['COGS', 'OPEX', 'CAPEX', '']).optional(),
  is_recurring: z.boolean().optional(),
  recurrence_frequency: z.enum(['monthly', 'quarterly', 'yearly', '']).optional(),
  cca_class: z.string().optional().or(z.literal('')),
  deductibility_pct: z.coerce.number().int().min(0).max(100).optional(),
})
type FormData = z.infer<typeof schema>

const fmtCAD = (v: number | string) =>
  new Intl.NumberFormat('fr-CA', { style: 'currency', currency: 'CAD' })
    .format(typeof v === 'string' ? parseFloat(v) : v)

const fmtDate = (iso: string) =>
  new Date(iso).toLocaleDateString('fr-CA', { day: '2-digit', month: 'short', year: 'numeric' })

export default function ExpensesPage() {
  const qc = useQueryClient()
  const [filterCat, setFilterCat] = useState('')
  const [filterProduct, setFilterProduct] = useState('')
  const today = new Date()
  const [filterPeriod, setFilterPeriod] = useState<'month' | 'year' | 'all'>('month')
  const [filterMonth, setFilterMonth] = useState<string>(
    `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, '0')}`
  )
  const [filterYear, setFilterYear] = useState<string>(String(today.getFullYear()))
  const [showForm, setShowForm] = useState(false)

  const categories = useQuery({ queryKey: ['categories'], queryFn: listCategories })
  const products = useQuery({ queryKey: ['products'], queryFn: listProducts })

  // Calcul des bornes de date selon la période choisie
  const dateRange = (() => {
    if (filterPeriod === 'all') return { date_from: undefined, date_to: undefined }
    if (filterPeriod === 'year') {
      return {
        date_from: `${filterYear}-01-01`,
        date_to: `${filterYear}-12-31`,
      }
    }
    // month
    const [y, m] = filterMonth.split('-').map(Number)
    const firstDay = `${filterMonth}-01`
    const lastDayOfMonth = new Date(y, m, 0).getDate()
    const lastDay = `${filterMonth}-${String(lastDayOfMonth).padStart(2, '0')}`
    return { date_from: firstDay, date_to: lastDay }
  })()

  const expenses = useQuery({
    queryKey: ['expenses', filterCat, filterProduct, filterPeriod, filterMonth, filterYear],
    queryFn: () => listExpenses({
      category_id: filterCat ? Number(filterCat) : undefined,
      product_id: filterProduct ? Number(filterProduct) : undefined,
      date_from: dateRange.date_from,
      date_to: dateRange.date_to,
    }),
  })

  const totals = useMemo(() => {
    if (!expenses.data) return { total: 0, byCategory: new Map<string, number>() }
    let total = 0
    const byCategory = new Map<string, number>()
    for (const e of expenses.data) {
      const amt = typeof e.amount === 'string' ? parseFloat(e.amount) : e.amount
      total += amt
      const k = e.category_name || '—'
      byCategory.set(k, (byCategory.get(k) || 0) + amt)
    }
    return { total, byCategory }
  }, [expenses.data])

  return (
    <div className="px-4 sm:px-6 lg:px-10 py-6 sm:py-8 max-w-6xl">
      <PageHeader
        title="Dépenses"
        description="Suivi des dépenses catégorisées avec totaux et liens optionnels aux produits/lots."
        action={
          <button onClick={() => setShowForm(true)}
            className="inline-flex items-center gap-1.5 bg-chika-paprika hover:bg-chika-paprikaDeep text-white text-sm font-semibold px-4 py-2 rounded-lg shadow-sm">
            <Plus size={16} /> Nouvelle dépense
          </button>
        }
      />

      {/* Total + breakdown */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
        <div className="bg-white border border-stone-200 rounded-2xl p-5">
          <div className="text-[11px] uppercase tracking-wider text-stone-500 font-semibold mb-1">Total filtré</div>
          <div className="text-3xl font-bold text-chika-paprika tabular-nums">{fmtCAD(totals.total)}</div>
        </div>
        <div className="bg-white border border-stone-200 rounded-2xl p-5">
          <div className="text-[11px] uppercase tracking-wider text-stone-500 font-semibold mb-2">Par catégorie</div>
          <ul className="space-y-1 text-sm">
            {Array.from(totals.byCategory.entries())
              .sort((a, b) => b[1] - a[1])
              .map(([cat, amt]) => (
                <li key={cat} className="flex justify-between">
                  <span className="text-stone-700">{cat}</span>
                  <span className="tabular-nums font-semibold">{fmtCAD(amt)}</span>
                </li>
            ))}
            {totals.byCategory.size === 0 && <li className="text-stone-400 italic">—</li>}
          </ul>
        </div>
      </div>

      {/* Filters */}
      <div className="bg-white rounded-2xl border border-stone-200 p-4 mb-4 flex items-center gap-3 flex-wrap">
        {/* Période */}
        <div className="flex items-center gap-2">
          <label className="text-sm font-semibold text-stone-700">Période :</label>
          <select value={filterPeriod} onChange={e => setFilterPeriod(e.target.value as 'month' | 'year' | 'all')}
            className="px-3 py-1.5 border border-stone-300 rounded-lg text-sm">
            <option value="month">Mois</option>
            <option value="year">Année</option>
            <option value="all">Tout l'historique</option>
          </select>
          {filterPeriod === 'month' && (
            <input type="month" value={filterMonth} onChange={e => setFilterMonth(e.target.value)}
              className="px-3 py-1.5 border border-stone-300 rounded-lg text-sm" />
          )}
          {filterPeriod === 'year' && (
            <input type="number" min="2020" max="2100" value={filterYear} onChange={e => setFilterYear(e.target.value)}
              className="px-3 py-1.5 border border-stone-300 rounded-lg text-sm w-24" />
          )}
        </div>
        <div className="flex items-center gap-2">
          <label className="text-sm font-semibold text-stone-700">Catégorie :</label>
          <select value={filterCat} onChange={e => setFilterCat(e.target.value)}
            className="px-3 py-1.5 border border-stone-300 rounded-lg text-sm">
            <option value="">Toutes</option>
            {categories.data?.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
          </select>
        </div>
        <div className="flex items-center gap-2">
          <label className="text-sm font-semibold text-stone-700">Produit :</label>
          <select value={filterProduct} onChange={e => setFilterProduct(e.target.value)}
            className="px-3 py-1.5 border border-stone-300 rounded-lg text-sm">
            <option value="">Tous</option>
            {products.data?.map(p => <option key={p.id} value={p.id}>{p.name}</option>)}
          </select>
        </div>
      </div>

      <div className="bg-white rounded-2xl border border-stone-200 overflow-x-auto">
        <table className="w-full text-sm">
          <thead className="bg-stone-50 text-[11px] uppercase tracking-wider text-stone-500">
            <tr>
              <th className="text-left px-4 py-3">Date</th>
              <th className="text-left px-4 py-3">Catégorie</th>
              <th className="text-left px-4 py-3">Description</th>
              <th className="text-left px-4 py-3 hidden sm:table-cell">Fournisseur</th>
              <th className="text-left px-4 py-3 hidden md:table-cell">Produit</th>
              <th className="text-right px-4 py-3">Montant</th>
              <th className="px-4 py-3 w-12"></th>
            </tr>
          </thead>
          <tbody>
            {(expenses.data ?? []).map((e: Expense) => (
              <tr key={e.id} className="border-t border-stone-200 hover:bg-stone-50">
                <td className="px-4 py-3 text-stone-700">{fmtDate(e.expense_date)}</td>
                <td className="px-4 py-3">
                  <span className="inline-block px-2 py-0.5 rounded-full text-[10px] font-bold uppercase bg-chika-cream text-chika-brown">
                    {e.category_name}
                  </span>
                </td>
                <td className="px-4 py-3 text-stone-900 font-medium">{e.description}</td>
                <td className="px-4 py-3 text-stone-600 hidden sm:table-cell">{e.vendor || '—'}</td>
                <td className="px-4 py-3 text-stone-600 hidden md:table-cell">{e.product_name || '—'}</td>
                <td className="px-4 py-3 text-right tabular-nums font-bold text-red-600">−{fmtCAD(e.amount)}</td>
                <td className="px-4 py-3 text-right">
                  <button onClick={() => {
                    if (window.confirm('Supprimer cette dépense ?')) {
                      deleteExpense(e.id).then(() => qc.invalidateQueries({ queryKey: ['expenses'] }))
                    }
                  }} className="text-stone-400 hover:text-red-600 p-1"><Trash2 size={14} /></button>
                </td>
              </tr>
            ))}
            {expenses.data && expenses.data.length === 0 && (
              <tr><td colSpan={7} className="px-4 py-8 text-center text-stone-400">Aucune dépense.</td></tr>
            )}
          </tbody>
        </table>
      </div>

      {showForm && (
        <ExpenseForm onClose={() => setShowForm(false)} onSaved={() => {
          qc.invalidateQueries({ queryKey: ['expenses'] })
          setShowForm(false)
        }} />
      )}
    </div>
  )
}

function ExpenseForm({ onClose, onSaved }: { onClose: () => void; onSaved: () => void }) {
  const categories = useQuery({ queryKey: ['categories'], queryFn: listCategories })
  const products = useQuery({ queryKey: ['products'], queryFn: listProducts })
  const [serverError, setServerError] = useState<string | null>(null)
  const [accountingOpen, setAccountingOpen] = useState(false)
  const today = new Date().toISOString().slice(0, 10)

  const { register, handleSubmit, formState: { errors, isSubmitting } } = useForm<FormData>({
    resolver: zodResolver(schema) as never,
    defaultValues: { expense_date: today, amount: 0 },
  })

  const mut = useMutation({
    mutationFn: async (v: FormData) => {
      const payload: ExpensePayload = {
        category_id: Number(v.category_id),
        product_id: v.product_id ? Number(v.product_id) : null,
        amount: Number(v.amount),
        expense_date: v.expense_date,
        vendor: v.vendor || null,
        description: v.description,
        receipt_url: v.receipt_url || null,
        tps_paid: v.tps_paid ? Number(v.tps_paid) : null,
        tvq_paid: v.tvq_paid ? Number(v.tvq_paid) : null,
        vendor_tps_number: v.vendor_tps_number || null,
        vendor_tvq_number: v.vendor_tvq_number || null,
        expense_type: v.expense_type || undefined,
        is_recurring: !!v.is_recurring,
        recurrence_frequency: v.recurrence_frequency || undefined,
        cca_class: v.cca_class || undefined,
        deductibility_pct: v.deductibility_pct !== undefined ? Number(v.deductibility_pct) : 100,
      }
      return createExpense(payload)
    },
    onSuccess: onSaved,
    onError: (err: unknown) => {
      const msg = (err as { response?: { data?: { detail?: string } } })?.response?.data?.detail
      setServerError(msg || 'Erreur')
    },
  })

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4" onClick={onClose}>
      <form onClick={e => e.stopPropagation()}
        onSubmit={handleSubmit(v => mut.mutate(v))}
        className="bg-white rounded-2xl shadow-xl w-full max-w-md p-5 sm:p-6 space-y-4 max-h-[90vh] overflow-y-auto">
        <div className="flex items-center justify-between">
          <h3 className="text-lg font-bold text-stone-900">Nouvelle dépense</h3>
          <button type="button" onClick={onClose} className="text-stone-400 hover:text-stone-700"><X size={18} /></button>
        </div>
        {serverError && <div className="px-3 py-2 rounded-lg bg-red-50 border border-red-200 text-red-700 text-sm">⚠ {serverError}</div>}

        <Field label="Catégorie" error={errors.category_id?.message}>
          <select {...register('category_id')} className={inputCls}>
            <option value="">Choisir…</option>
            {categories.data?.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
          </select>
        </Field>
        <Field label="Description" error={errors.description?.message}>
          <input {...register('description')} className={inputCls} placeholder="Ex: Sacs d'arachides 50kg" />
        </Field>
        <div className="grid grid-cols-2 gap-3">
          <Field label="Montant" error={errors.amount?.message}>
            <input type="number" step="0.01" {...register('amount')} className={inputCls} />
          </Field>
          <Field label="Date" error={errors.expense_date?.message}>
            <input type="date" {...register('expense_date')} className={inputCls} />
          </Field>
        </div>
        <div className="grid grid-cols-2 gap-3">
          <Field label="Fournisseur (optionnel)">
            <input {...register('vendor')} className={inputCls} />
          </Field>
          <Field label="Produit lié (optionnel)">
            <select {...register('product_id')} className={inputCls}>
              <option value="">Aucun</option>
              {products.data?.map(p => <option key={p.id} value={p.id}>{p.name}</option>)}
            </select>
          </Field>
        </div>
        <Field label="Lien reçu (optionnel)">
          <input {...register('receipt_url')} className={inputCls} placeholder="https://…" />
        </Field>

        {/* Section comptable pliable — TPS/TVQ payées + n° fournisseur pour CTI/RTI */}
        <div className="border-t border-stone-200 pt-3">
          <button
            type="button"
            onClick={() => setAccountingOpen(o => !o)}
            className="w-full flex items-center justify-between text-xs font-bold uppercase tracking-wider text-stone-600 hover:text-chika-paprika"
          >
            <span>📊 Détails comptables (taxes payées)</span>
            <span className="text-stone-400">{accountingOpen ? '−' : '+'}</span>
          </button>
          {accountingOpen && (
            <div className="mt-3 space-y-4">
              <p className="text-[11px] text-stone-500 italic">
                Renseigne si tu veux réclamer le CTI/RTI sur cette dépense + classer correctement pour ton comptable.
              </p>
              {/* Taxes payées */}
              <div className="grid grid-cols-2 gap-3">
                <Field label="TPS payée ($)">
                  <input type="number" step="0.01" {...register('tps_paid')} className={inputCls} placeholder="0.00" />
                </Field>
                <Field label="TVQ payée ($)">
                  <input type="number" step="0.01" {...register('tvq_paid')} className={inputCls} placeholder="0.00" />
                </Field>
                <Field label="N° TPS fournisseur">
                  <input {...register('vendor_tps_number')} className={inputCls} placeholder="123456789 RT0001" />
                </Field>
                <Field label="N° TVQ fournisseur">
                  <input {...register('vendor_tvq_number')} className={inputCls} placeholder="1234567890 TQ0001" />
                </Field>
              </div>

              {/* Classement comptable */}
              <div className="border-t border-stone-200 pt-3">
                <div className="text-[10px] uppercase tracking-wider text-stone-500 font-bold mb-2">
                  Classement comptable
                </div>
                <Field label="Type (override catégorie)">
                  <select {...register('expense_type')} className={inputCls}>
                    <option value="">— Hérite de la catégorie —</option>
                    <option value="COGS">COGS — Coût des marchandises vendues</option>
                    <option value="OPEX">OPEX — Frais d'exploitation</option>
                    <option value="CAPEX">CAPEX — Immobilisation (à amortir)</option>
                  </select>
                </Field>
                <div className="grid grid-cols-2 gap-3 mt-3">
                  <Field label="Déductibilité fiscale">
                    <select {...register('deductibility_pct')} className={inputCls}>
                      <option value="100">100% (déductible)</option>
                      <option value="50">50% (ex: repas d'affaires)</option>
                      <option value="0">0% (non-déductible)</option>
                    </select>
                  </Field>
                  <Field label="Classe CCA (si CAPEX)">
                    <input {...register('cca_class')} className={inputCls} placeholder="Ex: 8, 10, 50" />
                  </Field>
                </div>
              </div>

              {/* Récurrence */}
              <div className="border-t border-stone-200 pt-3">
                <label className="inline-flex items-center gap-2 text-sm cursor-pointer">
                  <input type="checkbox" {...register('is_recurring')} className="accent-chika-paprika" />
                  <span className="font-medium">Dépense récurrente (abonnement)</span>
                </label>
                <div className="mt-2">
                  <Field label="Fréquence">
                    <select {...register('recurrence_frequency')} className={inputCls}>
                      <option value="">— Non récurrent —</option>
                      <option value="monthly">Mensuel</option>
                      <option value="quarterly">Trimestriel</option>
                      <option value="yearly">Annuel</option>
                    </select>
                  </Field>
                </div>
              </div>
            </div>
          )}
        </div>

        <div className="flex gap-2 justify-end pt-2">
          <button type="button" onClick={onClose} className="px-3 py-2 rounded-lg text-sm text-stone-600 hover:bg-stone-100">Annuler</button>
          <button type="submit" disabled={isSubmitting}
            className="bg-chika-paprika hover:bg-chika-paprikaDeep disabled:opacity-50 text-white text-sm font-semibold px-4 py-2 rounded-lg">
            {isSubmitting ? '…' : 'Enregistrer'}
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
