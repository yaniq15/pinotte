import { useState } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { Plus, X, Pencil } from 'lucide-react'
import {
  listClients, createClient, updateClient, deleteClient,
  type Client, type ClientType, type ClientPayload,
} from '../api/clients'
import { PageHeader } from '../components/shared/AppLayout'
import { Card } from '../components/ui/Card'
import { Button } from '../components/ui/Button'
import { Badge } from '../components/ui/Badge'
import { EmptyState } from '../components/ui/EmptyState'
import { useT } from '../lib/i18n'

type FormData = {
  name: string
  type: 'BROKER' | 'STORE'
  email?: string
  phone?: string
  address?: string
  payment_terms_days: number
  distribution_rate_pct?: number | ''
  active: boolean
}

const fmtPct = (v: number | string | null | undefined) => {
  if (v === null || v === undefined || v === '') return '—'
  const n = typeof v === 'string' ? parseFloat(v) : v
  return isFinite(n) ? `${(n * 100).toFixed(0)} %` : '—'
}

export default function ClientsPage() {
  const qc = useQueryClient()
  const t = useT()
  const [filterType, setFilterType] = useState<string>('')
  const [editing, setEditing] = useState<Client | null>(null)
  const [showForm, setShowForm] = useState(false)

  const { data: clients = [], isLoading } = useQuery({
    queryKey: ['clients', filterType],
    queryFn: () => listClients(filterType ? (filterType as ClientType) : undefined),
  })

  return (
    <div className="px-4 sm:px-6 lg:px-10 py-6 sm:py-8 max-w-7xl">
      <PageHeader
        title={t('clients.title')}
        description={t('clients.description')}
        action={
          <Button icon={<Plus size={16} />} onClick={() => { setEditing(null); setShowForm(true) }}>
            {t('clients.new')}
          </Button>
        }
      />

      <Card className="mb-4">
        <div className="p-4 flex items-center gap-3 flex-wrap">
          <label className="text-xs font-medium text-stone-600">Type</label>
          <select value={filterType} onChange={e => setFilterType(e.target.value)}
            className="px-3 py-1.5 ring-1 ring-stone-300 bg-white rounded-lg text-sm">
            <option value="">{t('clients.filter.all')}</option>
            <option value="BROKER">{t('clients.filter.brokers')}</option>
            <option value="STORE">{t('clients.filter.stores')}</option>
          </select>
        </div>
      </Card>

      <Card>
        {isLoading
          ? <div className="p-8 text-center text-stone-400 text-sm">{t('label.loading')}</div>
          : clients.length === 0
          ? <EmptyState icon="👥" title={t('clients.empty.title')} description={t('clients.empty.desc')}
              action={<Button icon={<Plus size={16} />} onClick={() => { setEditing(null); setShowForm(true) }}>{t('clients.new')}</Button>} />
          : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead className="bg-stone-50 text-[11px] uppercase tracking-wider text-stone-500">
                  <tr>
                    <th className="text-left px-5 py-3">{t('label.name')}</th>
                    <th className="text-left px-5 py-3">Type</th>
                    <th className="text-right px-5 py-3 hidden md:table-cell">{t('clients.table.distrib_rate')}</th>
                    <th className="text-left px-5 py-3 hidden sm:table-cell">{t('clients.table.contact')}</th>
                    <th className="text-right px-5 py-3 hidden md:table-cell">{t('clients.table.payment_delay')}</th>
                    <th className="text-center px-5 py-3">{t('clients.table.active')}</th>
                    <th className="px-5 py-3 w-12"></th>
                  </tr>
                </thead>
                <tbody>
                  {clients.map(c => (
                    <tr key={c.id} className={`border-t border-stone-200 hover:bg-stone-50 transition ${!c.active && 'opacity-50'}`}>
                      <td className="px-5 py-3 font-medium text-stone-900">{c.name}</td>
                      <td className="px-5 py-3">
                        <Badge tone={c.type === 'BROKER' ? 'info' : 'paprika'}>
                          {c.type === 'BROKER' ? t('dashboard.client_type.broker') : t('dashboard.client_type.store')}
                        </Badge>
                      </td>
                      <td className="px-5 py-3 text-right tabular-nums hidden md:table-cell text-stone-700 font-semibold">
                        {c.type === 'BROKER' ? fmtPct(c.distribution_rate_pct) : '—'}
                      </td>
                      <td className="px-5 py-3 text-xs text-stone-600 hidden sm:table-cell">
                        {c.email && <div>{c.email}</div>}
                        {c.phone && <div className="text-stone-400">{c.phone}</div>}
                      </td>
                      <td className="px-5 py-3 text-right text-stone-600 tabular-nums hidden md:table-cell">{c.payment_terms_days} {t('clients.days_suffix')}</td>
                      <td className="px-5 py-3 text-center">
                        {c.active ? <Badge tone="success">{t('clients.active.yes')}</Badge> : <Badge tone="neutral">{t('clients.active.no')}</Badge>}
                      </td>
                      <td className="px-5 py-3 text-right">
                        <button onClick={() => { setEditing(c); setShowForm(true) }}
                          className="text-stone-400 hover:text-chika-paprika p-1"><Pencil size={14} /></button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
      </Card>

      {showForm && (
        <ClientForm initial={editing} onClose={() => setShowForm(false)}
          onSaved={() => { qc.invalidateQueries({ queryKey: ['clients'] }); setShowForm(false) }} />
      )}
    </div>
  )
}

function ClientForm({ initial, onClose, onSaved }: {
  initial: Client | null; onClose: () => void; onSaved: () => void
}) {
  const qc = useQueryClient()
  const t = useT()
  const isEdit = !!initial
  const [serverError, setServerError] = useState<string | null>(null)

  const schema = z.object({
    name: z.string().min(1, t('validation.required')),
    type: z.enum(['BROKER', 'STORE']),
    email: z.string().email(t('validation.invalid')).optional().or(z.literal('')),
    phone: z.string().optional().or(z.literal('')),
    address: z.string().optional().or(z.literal('')),
    payment_terms_days: z.coerce.number().int().min(0).max(365).default(30),
    distribution_rate_pct: z.coerce.number().min(0).max(1).optional().or(z.literal('')),
    active: z.boolean().default(true),
  })

  const { register, handleSubmit, watch, formState: { errors, isSubmitting } } = useForm<FormData>({
    resolver: zodResolver(schema) as never,
    defaultValues: initial
      ? {
          name: initial.name, type: initial.type,
          email: initial.email || '', phone: initial.phone || '',
          address: initial.address || '', payment_terms_days: initial.payment_terms_days,
          distribution_rate_pct: initial.distribution_rate_pct as number ?? '',
          active: initial.active,
        }
      : { type: 'BROKER', payment_terms_days: 30, distribution_rate_pct: 0.18, active: true },
  })

  const currentType = watch('type')

  const mut = useMutation({
    mutationFn: async (v: FormData) => {
      const payload: ClientPayload = {
        name: v.name, type: v.type,
        email: v.email || null, phone: v.phone || null, address: v.address || null,
        payment_terms_days: Number(v.payment_terms_days),
        distribution_rate_pct: v.type === 'BROKER' && v.distribution_rate_pct !== ''
          ? Number(v.distribution_rate_pct)
          : null,
        active: v.active,
      }
      return isEdit ? updateClient(initial!.id, payload) : createClient(payload)
    },
    onSuccess: onSaved,
    onError: (err: unknown) => {
      const msg = (err as { response?: { data?: { detail?: string } } })?.response?.data?.detail
      setServerError(msg || t('error.generic'))
    },
  })

  const onDelete = async () => {
    if (!initial) return
    if (!window.confirm(t('clients.confirm_delete').replace('{name}', initial.name))) return
    try {
      await deleteClient(initial.id)
      qc.invalidateQueries({ queryKey: ['clients'] })
      onSaved()
    } catch (err: unknown) {
      const msg = (err as { response?: { data?: { detail?: string } } })?.response?.data?.detail
      setServerError(msg || t('clients.delete_error'))
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4" onClick={onClose}>
      <form onClick={e => e.stopPropagation()}
        onSubmit={handleSubmit(v => mut.mutate(v))}
        className="bg-white rounded-xl shadow-xl ring-1 ring-stone-900/5 w-full max-w-md p-6 space-y-4 max-h-[90vh] overflow-y-auto">
        <div className="flex items-center justify-between">
          <h3 className="text-lg font-bold text-stone-900">{isEdit ? t('clients.form.edit_title') : t('clients.new')}</h3>
          <button type="button" onClick={onClose} className="text-stone-400 hover:text-stone-700"><X size={18} /></button>
        </div>
        {serverError && <div className="px-3 py-2 rounded-lg bg-red-50 ring-1 ring-red-200 text-red-700 text-sm">⚠ {serverError}</div>}

        <Field label={t('label.name')} error={errors.name?.message}>
          <input {...register('name')} className={inputCls} />
        </Field>
        <Field label="Type" error={errors.type?.message}>
          <select {...register('type')} className={inputCls}>
            <option value="BROKER">{t('clients.form.type_broker')}</option>
            <option value="STORE">{t('clients.form.type_store')}</option>
          </select>
        </Field>

        {currentType === 'BROKER' && (
          <Field label={t('clients.form.distribution_rate_label')} error={errors.distribution_rate_pct?.message}>
            <input type="number" step="0.01" min="0" max="1" {...register('distribution_rate_pct')}
              className={inputCls} placeholder="0.18" />
            <p className="mt-1 text-[11px] text-stone-500">
              {t('clients.form.distribution_rate_hint')}
            </p>
          </Field>
        )}

        <div className="grid grid-cols-2 gap-3">
          <Field label="Email"><input type="email" {...register('email')} className={inputCls} /></Field>
          <Field label={t('clients.form.phone')}><input {...register('phone')} className={inputCls} /></Field>
        </div>
        <Field label={t('clients.form.address')}><textarea {...register('address')} rows={2} className={inputCls} /></Field>
        <Field label={t('clients.form.payment_days')} error={errors.payment_terms_days?.message}>
          <input type="number" {...register('payment_terms_days')} className={inputCls} />
        </Field>
        <label className="flex items-center gap-2 text-sm cursor-pointer">
          <input type="checkbox" {...register('active')} className="accent-chika-paprika" /> {t('clients.form.active_checkbox')}
        </label>

        <div className="flex items-center justify-between gap-2 pt-2 border-t border-stone-200">
          {isEdit && <Button type="button" variant="danger" size="sm" onClick={onDelete}>{t('action.delete')}</Button>}
          <div className="flex gap-2 ml-auto">
            <Button type="button" variant="ghost" onClick={onClose}>{t('action.cancel')}</Button>
            <Button type="submit" disabled={isSubmitting}>
              {isSubmitting ? '…' : isEdit ? t('action.save') : t('action.create')}
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
