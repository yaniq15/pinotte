import { useMemo, useState } from 'react'
import { todayISO, fmtDateLocal } from '../lib/dates'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { Plus, X, Trash2, Pencil, RefreshCcw, CheckCircle2 } from 'lucide-react'
import {
  listExpenses, listCategories, createExpense, updateExpense, deleteExpense,
  listRecurringTemplates, applyRecurringExpenses,
  type Expense, type ExpensePayload,
} from '../api/expenses'
import { listProducts } from '../api/products'
import { PageHeader } from '../components/shared/AppLayout'
import { useT, useLang } from '../lib/i18n'

type FormData = {
  category_id: number
  product_id?: string
  amount: number
  expense_date: string
  vendor?: string
  description: string
  receipt_url?: string
  tps_paid?: string
  tvq_paid?: string
  vendor_tps_number?: string
  vendor_tvq_number?: string
  expense_type?: 'COGS' | 'OPEX' | 'CAPEX' | ''
  is_recurring?: boolean
  recurrence_frequency?: 'monthly' | 'quarterly' | 'yearly' | ''
  cca_class?: string
  deductibility_pct?: number
}

const fmtCAD = (v: number | string) =>
  new Intl.NumberFormat('fr-CA', { style: 'currency', currency: 'CAD' })
    .format(typeof v === 'string' ? parseFloat(v) : v)

// Affichage sans décalage de fuseau (parse "YYYY-MM-DD" en local)
const fmtDate = (iso: string, lang: 'fr' | 'en') => fmtDateLocal(iso, lang === 'en' ? 'en-CA' : 'fr-CA')

export default function ExpensesPage() {
  const qc = useQueryClient()
  const t = useT()
  const [lang] = useLang()
  const [filterCat, setFilterCat] = useState('')
  const [filterProduct, setFilterProduct] = useState('')
  const today = new Date()
  const [filterPeriod, setFilterPeriod] = useState<'month' | 'year' | 'all'>('month')
  const [filterMonth, setFilterMonth] = useState<string>(
    `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, '0')}`
  )
  const [filterYear, setFilterYear] = useState<string>(String(today.getFullYear()))
  const [showForm, setShowForm] = useState(false)
  const [editing, setEditing] = useState<Expense | null>(null)

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
        title={t('expenses.title')}
        description={t('expenses.description')}
        action={
          <button onClick={() => { setEditing(null); setShowForm(true) }}
            className="inline-flex items-center gap-1.5 bg-chika-paprika hover:bg-chika-paprikaDeep text-white text-sm font-semibold px-4 py-2 rounded-lg shadow-sm">
            <Plus size={16} /> {t('expenses.new')}
          </button>
        }
      />

      {/* Total + breakdown */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
        <div className="bg-white border border-stone-200 rounded-2xl p-5">
          <div className="text-[11px] uppercase tracking-wider text-stone-500 font-semibold mb-1">{t('expenses.total_filtered')}</div>
          <div className="text-3xl font-bold text-chika-paprika tabular-nums">{fmtCAD(totals.total)}</div>
        </div>
        <div className="bg-white border border-stone-200 rounded-2xl p-5">
          <div className="text-[11px] uppercase tracking-wider text-stone-500 font-semibold mb-2">{t('expenses.by_category')}</div>
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
          <label className="text-sm font-semibold text-stone-700">{t('expenses.filter.period')}</label>
          <select value={filterPeriod} onChange={e => setFilterPeriod(e.target.value as 'month' | 'year' | 'all')}
            className="px-3 py-1.5 border border-stone-300 rounded-lg text-sm">
            <option value="month">{t('expenses.filter.month')}</option>
            <option value="year">{t('expenses.filter.year')}</option>
            <option value="all">{t('expenses.filter.all_history')}</option>
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
          <label className="text-sm font-semibold text-stone-700">{t('expenses.filter.category')}</label>
          <select value={filterCat} onChange={e => setFilterCat(e.target.value)}
            className="px-3 py-1.5 border border-stone-300 rounded-lg text-sm">
            <option value="">{t('expenses.filter.all_fem')}</option>
            {categories.data?.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
          </select>
        </div>
        <div className="flex items-center gap-2">
          <label className="text-sm font-semibold text-stone-700">{t('expenses.filter.product')}</label>
          <select value={filterProduct} onChange={e => setFilterProduct(e.target.value)}
            className="px-3 py-1.5 border border-stone-300 rounded-lg text-sm">
            <option value="">{t('clients.filter.all')}</option>
            {products.data?.map(p => <option key={p.id} value={p.id}>{p.name}</option>)}
          </select>
        </div>
      </div>

      {/* Dépenses récurrentes — bouton "appliquer au mois courant" */}
      <RecurringExpensesPanel />

      <div className="bg-white rounded-2xl border border-stone-200 overflow-x-auto">
        <table className="w-full text-sm">
          <thead className="bg-stone-50 text-[11px] uppercase tracking-wider text-stone-500">
            <tr>
              <th className="text-left px-4 py-3">{t('expenses.table.date')}</th>
              <th className="text-left px-4 py-3">{t('expenses.table.category')}</th>
              <th className="text-left px-4 py-3">{t('expenses.table.description')}</th>
              <th className="text-left px-4 py-3 hidden sm:table-cell">{t('expenses.table.vendor')}</th>
              <th className="text-left px-4 py-3 hidden md:table-cell">{t('expenses.table.product')}</th>
              <th className="text-right px-4 py-3">{t('expenses.table.amount')}</th>
              <th className="px-4 py-3 w-12"></th>
            </tr>
          </thead>
          <tbody>
            {(expenses.data ?? []).map((e: Expense) => (
              <tr key={e.id} className="border-t border-stone-200 hover:bg-stone-50">
                <td className="px-4 py-3 text-stone-700">{fmtDate(e.expense_date, lang)}</td>
                <td className="px-4 py-3">
                  <span className="inline-block px-2 py-0.5 rounded-full text-[10px] font-bold uppercase bg-chika-cream text-chika-brown">
                    {e.category_name}
                  </span>
                </td>
                <td className="px-4 py-3 text-stone-900 font-medium">{e.description}</td>
                <td className="px-4 py-3 text-stone-600 hidden sm:table-cell">{e.vendor || '—'}</td>
                <td className="px-4 py-3 text-stone-600 hidden md:table-cell">{e.product_name || '—'}</td>
                <td className="px-4 py-3 text-right tabular-nums font-bold text-red-600">−{fmtCAD(e.amount)}</td>
                <td className="px-4 py-3 text-right whitespace-nowrap">
                  <button onClick={() => { setEditing(e); setShowForm(true) }}
                    className="text-stone-400 hover:text-chika-paprika p-1" title={t('action.edit')}>
                    <Pencil size={14} />
                  </button>
                  <button onClick={() => {
                    if (window.confirm(t('expenses.confirm_delete'))) {
                      deleteExpense(e.id).then(() => qc.invalidateQueries({ queryKey: ['expenses'] }))
                    }
                  }} className="text-stone-400 hover:text-red-600 p-1" title={t('action.delete')}><Trash2 size={14} /></button>
                </td>
              </tr>
            ))}
            {expenses.data && expenses.data.length === 0 && (
              <tr><td colSpan={7} className="px-4 py-8 text-center text-stone-400">{t('expenses.empty')}</td></tr>
            )}
          </tbody>
        </table>
      </div>

      {showForm && (
        <ExpenseForm
          initial={editing}
          onClose={() => { setShowForm(false); setEditing(null) }}
          onSaved={() => {
            qc.invalidateQueries({ queryKey: ['expenses'] })
            setShowForm(false)
            setEditing(null)
          }}
        />
      )}
    </div>
  )
}

function ExpenseForm({ initial, onClose, onSaved }: {
  initial: Expense | null
  onClose: () => void
  onSaved: () => void
}) {
  const t = useT()
  const categories = useQuery({ queryKey: ['categories'], queryFn: listCategories })
  const products = useQuery({ queryKey: ['products'], queryFn: listProducts })
  const [serverError, setServerError] = useState<string | null>(null)
  const isEdit = !!initial
  // Ouvre la section comptable d'emblée si la dépense éditée a déjà des taxes/type
  const [accountingOpen, setAccountingOpen] = useState(
    !!(initial && (initial.tps_paid || initial.tvq_paid || initial.expense_type || initial.is_recurring)),
  )
  const today = todayISO()

  const schema = z.object({
    category_id: z.coerce.number().int().positive(t('validation.required_short')),
    product_id: z.string().optional(),
    amount: z.coerce.number().min(0, t('validation.gte_zero')),
    expense_date: z.string().min(1, t('validation.required_short')),
    vendor: z.string().optional().or(z.literal('')),
    description: z.string().min(1, t('validation.required_short')),
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

  const { register, handleSubmit, formState: { errors, isSubmitting } } = useForm<FormData>({
    resolver: zodResolver(schema) as never,
    defaultValues: initial
      ? {
          category_id: initial.category_id,
          product_id: initial.product_id ? String(initial.product_id) : '',
          amount: Number(initial.amount),
          expense_date: initial.expense_date.slice(0, 10),
          vendor: initial.vendor || '',
          description: initial.description,
          receipt_url: initial.receipt_url || '',
          tps_paid: initial.tps_paid != null ? String(initial.tps_paid) : '',
          tvq_paid: initial.tvq_paid != null ? String(initial.tvq_paid) : '',
          vendor_tps_number: initial.vendor_tps_number || '',
          vendor_tvq_number: initial.vendor_tvq_number || '',
          expense_type: (initial.expense_type as FormData['expense_type']) || '',
          is_recurring: initial.is_recurring ?? false,
          recurrence_frequency: (initial.recurrence_frequency as FormData['recurrence_frequency']) || '',
          cca_class: initial.cca_class || '',
          deductibility_pct: initial.deductibility_pct ?? 100,
        }
      : { expense_date: today, amount: 0 },
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
      return isEdit ? updateExpense(initial!.id, payload) : createExpense(payload)
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
          <h3 className="text-lg font-bold text-stone-900">{isEdit ? t('expenses.form.edit_title') : t('expenses.new')}</h3>
          <button type="button" onClick={onClose} className="text-stone-400 hover:text-stone-700"><X size={18} /></button>
        </div>
        {serverError && <div className="px-3 py-2 rounded-lg bg-red-50 border border-red-200 text-red-700 text-sm">⚠ {serverError}</div>}

        <Field label={t('expenses.form.category')} error={errors.category_id?.message}>
          <select {...register('category_id')} className={inputCls}>
            <option value="">{t('expenses.form.choose')}</option>
            {categories.data?.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
          </select>
        </Field>
        <Field label={t('expenses.form.description')} error={errors.description?.message}>
          <input {...register('description')} className={inputCls} placeholder={t('expenses.form.description_placeholder')} />
        </Field>
        <div className="grid grid-cols-2 gap-3">
          <Field label={t('expenses.form.amount')} error={errors.amount?.message}>
            <input type="number" step="0.01" {...register('amount')} className={inputCls} />
          </Field>
          <Field label={t('label.date')} error={errors.expense_date?.message}>
            <input type="date" {...register('expense_date')} className={inputCls} />
          </Field>
        </div>
        <div className="grid grid-cols-2 gap-3">
          <Field label={t('expenses.form.vendor_optional')}>
            <input {...register('vendor')} className={inputCls} />
          </Field>
          <Field label={t('expenses.form.linked_product_optional')}>
            <select {...register('product_id')} className={inputCls}>
              <option value="">{t('expenses.form.none')}</option>
              {products.data?.map(p => <option key={p.id} value={p.id}>{p.name}</option>)}
            </select>
          </Field>
        </div>
        <Field label={t('expenses.form.receipt_link_optional')}>
          <input {...register('receipt_url')} className={inputCls} placeholder="https://…" />
        </Field>

        {/* Section comptable pliable — TPS/TVQ payées + n° fournisseur pour CTI/RTI */}
        <div className="border-t border-stone-200 pt-3">
          <button
            type="button"
            onClick={() => setAccountingOpen(o => !o)}
            className="w-full flex items-center justify-between text-xs font-bold uppercase tracking-wider text-stone-600 hover:text-chika-paprika"
          >
            <span>{t('expenses.form.accounting_toggle')}</span>
            <span className="text-stone-400">{accountingOpen ? '−' : '+'}</span>
          </button>
          {accountingOpen && (
            <div className="mt-3 space-y-4">
              <p className="text-[11px] text-stone-500 italic">
                {t('expenses.form.accounting_hint')}
              </p>
              {/* Taxes payées */}
              <div className="grid grid-cols-2 gap-3">
                <Field label={t('expenses.form.tps_paid')}>
                  <input type="number" step="0.01" {...register('tps_paid')} className={inputCls} placeholder="0.00" />
                </Field>
                <Field label={t('expenses.form.tvq_paid')}>
                  <input type="number" step="0.01" {...register('tvq_paid')} className={inputCls} placeholder="0.00" />
                </Field>
                <Field label={t('expenses.form.vendor_tps_number')}>
                  <input {...register('vendor_tps_number')} className={inputCls} placeholder="123456789 RT0001" />
                </Field>
                <Field label={t('expenses.form.vendor_tvq_number')}>
                  <input {...register('vendor_tvq_number')} className={inputCls} placeholder="1234567890 TQ0001" />
                </Field>
              </div>

              {/* Classement comptable */}
              <div className="border-t border-stone-200 pt-3">
                <div className="text-[10px] uppercase tracking-wider text-stone-500 font-bold mb-2">
                  {t('expenses.form.accounting_classification')}
                </div>
                <Field label={t('expenses.form.type_override')}>
                  <select {...register('expense_type')} className={inputCls}>
                    <option value="">{t('expenses.form.type_inherit')}</option>
                    <option value="COGS">{t('expenses.form.type_cogs')}</option>
                    <option value="OPEX">{t('expenses.form.type_opex')}</option>
                    <option value="CAPEX">{t('expenses.form.type_capex')}</option>
                  </select>
                </Field>
                <div className="grid grid-cols-2 gap-3 mt-3">
                  <Field label={t('expenses.form.deductibility')}>
                    <select {...register('deductibility_pct')} className={inputCls}>
                      <option value="100">{t('expenses.form.deductibility_100')}</option>
                      <option value="50">{t('expenses.form.deductibility_50')}</option>
                      <option value="0">{t('expenses.form.deductibility_0')}</option>
                    </select>
                  </Field>
                  <Field label={t('expenses.form.cca_class')}>
                    <input {...register('cca_class')} className={inputCls} placeholder="Ex: 8, 10, 50" />
                  </Field>
                </div>
              </div>

              {/* Récurrence */}
              <div className="border-t border-stone-200 pt-3">
                <label className="inline-flex items-center gap-2 text-sm cursor-pointer">
                  <input type="checkbox" {...register('is_recurring')} className="accent-chika-paprika" />
                  <span className="font-medium">{t('expenses.form.recurring_checkbox')}</span>
                </label>
                <div className="mt-2">
                  <Field label={t('expenses.form.frequency')}>
                    <select {...register('recurrence_frequency')} className={inputCls}>
                      <option value="">{t('expenses.form.frequency_none')}</option>
                      <option value="monthly">{t('expenses.form.frequency_monthly')}</option>
                      <option value="quarterly">{t('expenses.form.frequency_quarterly')}</option>
                      <option value="yearly">{t('expenses.form.frequency_yearly')}</option>
                    </select>
                  </Field>
                </div>
              </div>
            </div>
          )}
        </div>

        <div className="flex gap-2 justify-end pt-2">
          <button type="button" onClick={onClose} className="px-3 py-2 rounded-lg text-sm text-stone-600 hover:bg-stone-100">{t('action.cancel')}</button>
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

const MONTHS_FR = [
  'janvier', 'février', 'mars', 'avril', 'mai', 'juin',
  'juillet', 'août', 'septembre', 'octobre', 'novembre', 'décembre',
]
const MONTHS_EN = [
  'January', 'February', 'March', 'April', 'May', 'June',
  'July', 'August', 'September', 'October', 'November', 'December',
]

/**
 * Panneau "Dépenses récurrentes" — liste les abonnements mensuels et permet
 * de les appliquer en un clic au mois courant (loyer, abonnements logiciels…).
 */
function RecurringExpensesPanel() {
  const t = useT()
  const [lang] = useLang()
  const MONTHS = lang === 'en' ? MONTHS_EN : MONTHS_FR
  const qc = useQueryClient()
  const now = new Date()
  const [open, setOpen] = useState(false)
  const [result, setResult] = useState<string | null>(null)

  const templates = useQuery({
    queryKey: ['recurring-templates'],
    queryFn: listRecurringTemplates,
  })

  const apply = useMutation({
    mutationFn: () => applyRecurringExpenses(now.getFullYear(), now.getMonth() + 1),
    onSuccess: (r) => {
      qc.invalidateQueries({ queryKey: ['expenses'] })
      if (r.created === 0 && r.skipped > 0) {
        setResult(`${t('expenses.recurring.all_up_to_date')} ${r.skipped} ${t('expenses.recurring.already_present_suffix')}`)
      } else {
        setResult(`${t('expenses.recurring.added_prefix')} ${r.created} ${t('expenses.recurring.added_suffix')} ${MONTHS[now.getMonth()]} ${now.getFullYear()}` +
          (r.skipped > 0 ? ` · ${r.skipped} ${t('expenses.recurring.already_present_short')}` : '.'))
      }
      setTimeout(() => setResult(null), 6000)
    },
  })

  const items = templates.data ?? []
  const totalMonthly = items.reduce((s, e) => s + (typeof e.amount === 'string' ? parseFloat(e.amount) : e.amount), 0)

  return (
    <div className="bg-white rounded-2xl border border-stone-200 mb-4">
      <button
        type="button"
        onClick={() => setOpen(o => !o)}
        className="w-full flex items-center justify-between px-5 py-3.5 text-left"
      >
        <div className="flex items-center gap-2.5">
          <RefreshCcw size={16} className="text-chika-paprika" />
          <span className="text-sm font-semibold text-stone-900">
            {t('expenses.recurring.title')}
          </span>
          {items.length > 0 && (
            <span className="text-xs bg-chika-paprika/10 text-chika-paprika font-bold px-2 py-0.5 rounded-full">
              {items.length}
            </span>
          )}
        </div>
        <span className="text-stone-400 text-sm">{open ? '−' : '+'}</span>
      </button>

      {open && (
        <div className="px-5 pb-4 border-t border-stone-200 pt-3 space-y-3">
          {items.length === 0 ? (
            <p className="text-sm text-stone-500 italic">
              {t('expenses.recurring.empty')}
            </p>
          ) : (
            <>
              <p className="text-xs text-stone-500">
                {t('expenses.recurring.hint')}
              </p>
              <ul className="space-y-1.5">
                {items.map(e => (
                  <li key={e.id} className="flex items-center justify-between text-sm py-1 border-b border-stone-100 last:border-0">
                    <span className="text-stone-700">
                      <span className="font-medium">{e.description}</span>
                      {e.vendor && <span className="text-stone-400"> · {e.vendor}</span>}
                    </span>
                    <span className="tabular-nums font-semibold text-stone-900">{fmtCAD(e.amount)}</span>
                  </li>
                ))}
              </ul>
              <div className="flex items-center justify-between pt-1">
                <span className="text-xs text-stone-500">
                  {t('expenses.recurring.monthly_total')} <strong className="text-stone-900">{fmtCAD(totalMonthly)}</strong>
                </span>
                <button
                  type="button"
                  onClick={() => apply.mutate()}
                  disabled={apply.isPending}
                  className="inline-flex items-center gap-1.5 bg-chika-paprika hover:bg-chika-paprikaDeep disabled:opacity-50 text-white text-sm font-semibold px-4 py-2 rounded-lg shadow-sm"
                >
                  <RefreshCcw size={14} />
                  {apply.isPending
                    ? '…'
                    : `${t('expenses.recurring.apply_button_prefix')} ${MONTHS[now.getMonth()]} ${now.getFullYear()}`}
                </button>
              </div>
            </>
          )}
          {result && (
            <div className="flex items-center gap-2 text-sm text-emerald-700 bg-emerald-50 ring-1 ring-emerald-200 rounded-lg px-3 py-2">
              <CheckCircle2 size={14} className="shrink-0" />
              {result}
            </div>
          )}
        </div>
      )}
    </div>
  )
}
