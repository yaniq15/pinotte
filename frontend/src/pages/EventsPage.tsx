import { useMemo, useState } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { Plus, X, Trash2, Pencil, CalendarDays, MapPin, TrendingUp } from 'lucide-react'
import {
  listEvents, createEvent, updateEvent, deleteEvent,
  type ChikaEvent, type EventPayload, type EventStatus, type MaterialItem,
} from '../api/events'
import { listMaterials } from '../api/materials'
import { PageHeader } from '../components/shared/AppLayout'
import { Card, CardBody, CardHeader } from '../components/ui/Card'
import { Badge } from '../components/ui/Badge'
import { EmptyState } from '../components/ui/EmptyState'
import { useT, useLang } from '../lib/i18n'

const schema = z.object({
  name: z.string().min(1, 'Requis').max(200),
  location: z.string().optional().or(z.literal('')),
  start_date: z.string().min(1, 'Requise'),
  end_date: z.string().optional().or(z.literal('')),
  status: z.enum(['PLANNED', 'ONGOING', 'DONE', 'CANCELLED']),
  registration_fee: z.coerce.number().min(0, '≥ 0'),
  transport_cost: z.coerce.number().min(0, '≥ 0'),
  other_costs: z.coerce.number().min(0, '≥ 0'),
  total_revenue: z.coerce.number().min(0, '≥ 0'),
  units_sold: z.coerce.number().int().min(0, '≥ 0'),
  notes: z.string().optional().or(z.literal('')),
})
type FormData = z.infer<typeof schema>

interface BreakdownRow {
  label: string
  amount: string
  material_id: number | null
  quantity: string
  unit: string
  register_as_purchase: boolean
  purchase_id: number | null
}

const emptyRow = (): BreakdownRow => ({
  label: '', amount: '', material_id: null, quantity: '', unit: '',
  register_as_purchase: false, purchase_id: null,
})

function rowsFromBreakdown(b: MaterialItem[] | null | undefined): BreakdownRow[] {
  if (!b || b.length === 0) return [emptyRow()]
  return b.map(item => ({
    label: item.label,
    amount: String(item.amount),
    material_id: item.material_id ?? null,
    quantity: item.quantity != null ? String(item.quantity) : '',
    unit: item.unit ?? '',
    register_as_purchase: !!item.register_as_purchase,
    purchase_id: item.purchase_id ?? null,
  }))
}

function sumRows(rows: BreakdownRow[]): number {
  return rows.reduce((acc, r) => acc + (parseFloat(r.amount) || 0), 0)
}

const STATUS_TONE: Record<EventStatus, 'info' | 'warning' | 'success' | 'danger'> = {
  PLANNED: 'info',
  ONGOING: 'warning',
  DONE: 'success',
  CANCELLED: 'danger',
}

const STATUS_KEY: Record<EventStatus, string> = {
  PLANNED: 'events.status.planned',
  ONGOING: 'events.status.ongoing',
  DONE: 'events.status.done',
  CANCELLED: 'events.status.cancelled',
}

export default function EventsPage() {
  const qc = useQueryClient()
  const t = useT()
  const [lang] = useLang()
  const [filterStatus, setFilterStatus] = useState<'' | EventStatus>('')
  const [editing, setEditing] = useState<ChikaEvent | null>(null)
  const [showForm, setShowForm] = useState(false)

  const locale = lang === 'fr' ? 'fr-CA' : 'en-CA'
  const fmtCAD = (v: number | string) =>
    new Intl.NumberFormat(locale, { style: 'currency', currency: 'CAD' })
      .format(typeof v === 'string' ? parseFloat(v) : v)
  const fmtDate = (iso: string) =>
    new Date(iso).toLocaleDateString(locale, { day: '2-digit', month: 'short', year: 'numeric' })

  const events = useQuery({
    queryKey: ['events', filterStatus],
    queryFn: () => listEvents(filterStatus || undefined),
  })

  const totals = useMemo(() => {
    if (!events.data) return { revenue: 0, cost: 0, profit: 0, count: 0 }
    let revenue = 0, cost = 0
    for (const e of events.data) {
      if (e.status === 'CANCELLED') continue
      revenue += Number(e.total_revenue)
      cost += Number(e.total_cost)
    }
    return { revenue, cost, profit: revenue - cost, count: events.data.length }
  }, [events.data])

  return (
    <div className="px-4 sm:px-6 lg:px-10 py-6 sm:py-8 max-w-6xl">
      <PageHeader
        title={t('events.title')}
        description={t('events.description')}
        action={
          <button onClick={() => { setEditing(null); setShowForm(true) }}
            className="inline-flex items-center gap-1.5 bg-chika-paprika hover:bg-chika-paprikaDeep text-white text-sm font-semibold px-4 py-2 rounded-lg shadow-sm">
            <Plus size={16} /> {t('events.new')}
          </button>
        }
      />

      {/* KPIs globaux */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4 mb-6">
        <Kpi label={t('events.kpi.count')} value={String(totals.count)} tone="info" />
        <Kpi label={t('events.kpi.revenue')} value={fmtCAD(totals.revenue)} tone="success" />
        <Kpi label={t('events.kpi.cost')} value={fmtCAD(totals.cost)} tone="danger" />
        <Kpi label={t('events.kpi.profit')} value={fmtCAD(totals.profit)} tone={totals.profit >= 0 ? 'paprika' : 'danger'} />
      </div>

      {/* Filtre statut */}
      <div className="bg-white rounded-2xl border border-stone-200 p-3 sm:p-4 mb-4 flex items-center gap-3 flex-wrap">
        <label className="text-sm font-semibold text-stone-700">{t('events.filter.status')}</label>
        <select value={filterStatus} onChange={e => setFilterStatus(e.target.value as '' | EventStatus)}
          className="px-3 py-1.5 border border-stone-300 rounded-lg text-sm">
          <option value="">{t('events.filter.all')}</option>
          <option value="PLANNED">{t('events.status.planned')}</option>
          <option value="ONGOING">{t('events.status.ongoing')}</option>
          <option value="DONE">{t('events.status.done')}</option>
          <option value="CANCELLED">{t('events.status.cancelled')}</option>
        </select>
      </div>

      {/* Liste */}
      {events.isLoading && <div className="text-stone-400 text-sm">{t('label.loading')}</div>}
      {events.data && events.data.length === 0 && (
        <Card>
          <CardBody>
            <EmptyState
              icon="🎪"
              title={t('events.empty.title')}
              description={t('events.empty.desc')}
            />
          </CardBody>
        </Card>
      )}

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {events.data?.map(e => (
          <EventCard key={e.id} event={e} fmtCAD={fmtCAD} fmtDate={fmtDate} t={t}
            onEdit={() => { setEditing(e); setShowForm(true) }}
            onDelete={() => {
              if (window.confirm(t('events.confirm_delete').replace('{name}', e.name))) {
                deleteEvent(e.id).then(() => qc.invalidateQueries({ queryKey: ['events'] }))
              }
            }}
          />
        ))}
      </div>

      {showForm && (
        <EventForm
          initial={editing}
          onClose={() => { setShowForm(false); setEditing(null) }}
          onSaved={() => {
            qc.invalidateQueries({ queryKey: ['events'] })
            setShowForm(false); setEditing(null)
          }}
        />
      )}
    </div>
  )
}

function Kpi({ label, value, tone }: { label: string; value: string; tone: 'success' | 'info' | 'danger' | 'paprika' }) {
  const cls = {
    success: 'text-emerald-700',
    info: 'text-blue-700',
    danger: 'text-red-700',
    paprika: 'text-chika-paprika',
  }[tone]
  return (
    <Card>
      <CardBody>
        <div className="text-[10px] uppercase tracking-wider text-stone-400 font-semibold mb-1">{label}</div>
        <div className={`text-xl sm:text-2xl font-bold tabular-nums ${cls}`}>{value}</div>
      </CardBody>
    </Card>
  )
}

function EventCard({ event, onEdit, onDelete, fmtCAD, fmtDate, t }: {
  event: ChikaEvent
  onEdit: () => void
  onDelete: () => void
  fmtCAD: (v: number | string) => string
  fmtDate: (iso: string) => string
  t: (key: string, fb?: string) => string
}) {
  const profit = Number(event.profit)
  const tone = STATUS_TONE[event.status]
  return (
    <Card>
      <CardHeader
        title={event.name}
        subtitle={event.location || undefined}
        action={<Badge tone={tone}>{t(STATUS_KEY[event.status])}</Badge>}
      />
      <CardBody>
        <div className="text-xs text-stone-500 flex items-center gap-3 flex-wrap mb-3">
          <span className="inline-flex items-center gap-1"><CalendarDays size={12} />
            {fmtDate(event.start_date)}
            {event.end_date && ` → ${fmtDate(event.end_date)}`}
          </span>
          {event.location && (
            <span className="inline-flex items-center gap-1"><MapPin size={12} />{event.location}</span>
          )}
        </div>

        <div className="grid grid-cols-3 gap-2 text-center text-xs mb-3">
          <div className="bg-stone-50 rounded-lg py-2">
            <div className="text-[10px] uppercase tracking-wider text-stone-500 font-semibold">{t('events.kpi.revenue')}</div>
            <div className="text-sm font-bold tabular-nums text-emerald-700">{fmtCAD(event.total_revenue)}</div>
          </div>
          <div className="bg-stone-50 rounded-lg py-2">
            <div className="text-[10px] uppercase tracking-wider text-stone-500 font-semibold">{t('events.kpi.cost')}</div>
            <div className="text-sm font-bold tabular-nums text-red-700">{fmtCAD(event.total_cost)}</div>
          </div>
          <div className={`rounded-lg py-2 ${profit >= 0 ? 'bg-emerald-50' : 'bg-red-50'}`}>
            <div className="text-[10px] uppercase tracking-wider text-stone-500 font-semibold">{t('events.kpi.profit')}</div>
            <div className={`text-sm font-bold tabular-nums ${profit >= 0 ? 'text-emerald-700' : 'text-red-700'}`}>
              {fmtCAD(profit)}
            </div>
          </div>
        </div>

        <div className="flex items-center justify-between text-xs text-stone-600 mb-3 flex-wrap gap-2">
          <span className="inline-flex items-center gap-1">
            <TrendingUp size={12} />
            {t('events.label.roi')} {event.roi_pct !== null && event.roi_pct !== undefined
              ? <strong className={event.roi_pct >= 0 ? 'text-emerald-700' : 'text-red-700'}>{event.roi_pct}%</strong>
              : <span className="text-stone-400">—</span>}
          </span>
          <span>{t('events.label.units_sold')} <strong className="text-stone-900">{event.units_sold}</strong></span>
        </div>

        {event.notes && (
          <p className="text-xs text-stone-500 italic line-clamp-2 mb-3">{event.notes}</p>
        )}

        <div className="flex gap-2 justify-end pt-2 border-t border-stone-200">
          <button onClick={onEdit}
            className="inline-flex items-center gap-1 text-xs font-semibold text-stone-700 hover:text-chika-paprika px-2 py-1 rounded-lg hover:bg-stone-50">
            <Pencil size={13} /> {t('action.edit')}
          </button>
          <button onClick={onDelete}
            className="inline-flex items-center gap-1 text-xs font-semibold text-stone-500 hover:text-red-600 px-2 py-1 rounded-lg hover:bg-red-50">
            <Trash2 size={13} /> {t('action.delete')}
          </button>
        </div>
      </CardBody>
    </Card>
  )
}

function EventForm({ initial, onClose, onSaved }: { initial: ChikaEvent | null; onClose: () => void; onSaved: () => void }) {
  const t = useT()
  const [lang] = useLang()
  const [serverError, setServerError] = useState<string | null>(null)
  const [rows, setRows] = useState<BreakdownRow[]>(rowsFromBreakdown(initial?.materials_breakdown))
  const today = new Date().toISOString().slice(0, 10)

  // Catalogue matières premières (pour suggestions de libellé)
  const materials = useQuery({ queryKey: ['materials'], queryFn: () => listMaterials(false) })

  const locale = lang === 'fr' ? 'fr-CA' : 'en-CA'
  const fmtCAD = (v: number) => new Intl.NumberFormat(locale, { style: 'currency', currency: 'CAD' }).format(v)
  const breakdownTotal = sumRows(rows)

  const { register, handleSubmit, formState: { errors, isSubmitting } } = useForm<FormData>({
    resolver: zodResolver(schema) as never,
    defaultValues: initial
      ? {
          name: initial.name,
          location: initial.location || '',
          start_date: initial.start_date,
          end_date: initial.end_date || '',
          status: initial.status,
          registration_fee: Number(initial.registration_fee),
          transport_cost: Number(initial.transport_cost),
          other_costs: Number(initial.other_costs),
          total_revenue: Number(initial.total_revenue),
          units_sold: initial.units_sold,
          notes: initial.notes || '',
        }
      : {
          name: '', location: '', start_date: today, end_date: '', status: 'PLANNED',
          registration_fee: 0, transport_cost: 0, other_costs: 0,
          total_revenue: 0, units_sold: 0, notes: '',
        },
  })

  function addRow() {
    setRows(prev => [...prev, emptyRow()])
  }
  function removeRow(idx: number) {
    setRows(prev => prev.length === 1 ? [emptyRow()] : prev.filter((_, i) => i !== idx))
  }
  function updateField<K extends keyof BreakdownRow>(idx: number, field: K, value: BreakdownRow[K]) {
    setRows(prev => prev.map((r, i) => i === idx ? { ...r, [field]: value } : r))
  }
  // Choix d'une matière du catalogue : pré-remplit libellé + unité, stocke le lien.
  function pickMaterial(idx: number, materialId: number | null) {
    setRows(prev => prev.map((r, i) => {
      if (i !== idx) return r
      if (materialId === null) {
        return { ...r, material_id: null, unit: '', register_as_purchase: false }
      }
      const m = materials.data?.find(x => x.id === materialId)
      return {
        ...r,
        material_id: materialId,
        label: m?.name || r.label,
        unit: m?.unit || r.unit,
      }
    }))
  }

  const mut = useMutation({
    mutationFn: async (v: FormData) => {
      // Construit le breakdown à partir des lignes non vides
      const breakdown = rows
        .filter(r => r.label.trim() && parseFloat(r.amount) >= 0 && r.amount !== '')
        .map(r => {
          const qty = r.quantity ? parseFloat(r.quantity) : null
          return {
            label: r.label.trim(),
            amount: parseFloat(r.amount),
            material_id: r.material_id ?? null,
            quantity: qty && qty > 0 ? qty : null,
            unit: r.unit?.trim() || null,
            register_as_purchase: r.register_as_purchase
              && !!r.material_id
              && !!qty && qty > 0
              && !r.purchase_id,
            purchase_id: r.purchase_id ?? null,
          }
        })

      const payload: EventPayload = {
        name: v.name,
        location: v.location || null,
        start_date: v.start_date,
        end_date: v.end_date || null,
        status: v.status,
        registration_fee: Number(v.registration_fee),
        transport_cost: Number(v.transport_cost),
        other_costs: Number(v.other_costs),
        // materials_cost recalculé côté backend depuis le breakdown s'il est fourni
        materials_cost: breakdown.length > 0 ? breakdown.reduce((a, r) => a + r.amount, 0) : 0,
        materials_breakdown: breakdown.length > 0 ? breakdown : null,
        total_revenue: Number(v.total_revenue),
        units_sold: Number(v.units_sold),
        notes: v.notes || null,
      }
      return initial ? updateEvent(initial.id, payload) : createEvent(payload)
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
        className="bg-white rounded-2xl shadow-xl w-full max-w-lg p-5 sm:p-6 space-y-4 max-h-[90vh] overflow-y-auto">
        <div className="flex items-center justify-between">
          <h3 className="text-lg font-bold text-stone-900">
            {initial ? t('events.edit') : t('events.new')}
          </h3>
          <button type="button" onClick={onClose} className="text-stone-400 hover:text-stone-700"><X size={18} /></button>
        </div>
        {serverError && <div className="px-3 py-2 rounded-lg bg-red-50 border border-red-200 text-red-700 text-sm">⚠ {serverError}</div>}

        <Field label={t('events.field.name')} error={errors.name?.message}>
          <input {...register('name')} className={inputCls} placeholder="Ex: Festival Africain de Montréal" />
        </Field>
        <Field label={t('events.field.location')}>
          <input {...register('location')} className={inputCls} placeholder="Ex: Parc Jean-Drapeau, Montréal" />
        </Field>
        <div className="grid grid-cols-2 gap-3">
          <Field label={t('events.field.start_date')} error={errors.start_date?.message}>
            <input type="date" {...register('start_date')} className={inputCls} />
          </Field>
          <Field label={t('events.field.end_date')}>
            <input type="date" {...register('end_date')} className={inputCls} />
          </Field>
        </div>
        <Field label={t('events.field.status')} error={errors.status?.message}>
          <select {...register('status')} className={inputCls}>
            <option value="PLANNED">{t('events.status.planned')}</option>
            <option value="ONGOING">{t('events.status.ongoing')}</option>
            <option value="DONE">{t('events.status.done')}</option>
            <option value="CANCELLED">{t('events.status.cancelled')}</option>
          </select>
        </Field>

        <div className="pt-3 border-t border-stone-200">
          <div className="text-xs font-bold uppercase tracking-wider text-stone-500 mb-2">{t('events.section.costs')}</div>
          <div className="grid grid-cols-2 gap-3">
            <Field label={t('events.field.registration_fee')} error={errors.registration_fee?.message}>
              <input type="number" step="0.01" {...register('registration_fee')} className={inputCls} />
            </Field>
            <Field label={t('events.field.transport_cost')} error={errors.transport_cost?.message}>
              <input type="number" step="0.01" {...register('transport_cost')} className={inputCls} />
            </Field>
            <Field label={t('events.field.other_costs')} error={errors.other_costs?.message}>
              <input type="number" step="0.01" {...register('other_costs')} className={inputCls} />
            </Field>
          </div>
        </div>

        {/* Matières utilisées — liste dynamique d'achats au fur et à mesure */}
        <div className="pt-3 border-t border-stone-200">
          <div className="flex items-center justify-between mb-2">
            <div className="text-xs font-bold uppercase tracking-wider text-stone-500">
              {t('events.field.materials_cost')}
            </div>
            <div className="text-xs text-stone-500">
              {lang === 'fr' ? 'Total auto :' : 'Auto total:'}{' '}
              <strong className="text-chika-paprika tabular-nums">{fmtCAD(breakdownTotal)}</strong>
            </div>
          </div>
          <div className="space-y-3">
            {rows.map((row, idx) => {
              const linkedMaterial = row.material_id
                ? materials.data?.find(m => m.id === row.material_id)
                : null
              const canRegister = !!row.material_id && parseFloat(row.quantity) > 0
              const alreadyRegistered = row.purchase_id !== null
              return (
                <div key={idx} className="border border-stone-200 rounded-lg p-2.5 space-y-2 bg-stone-50/50">
                  {/* Ligne 1 : catalogue / libellé / montant / supprimer */}
                  <div className="grid grid-cols-1 sm:grid-cols-[11rem,1fr,7rem,auto] gap-2 items-start">
                    <select
                      value={row.material_id ?? ''}
                      onChange={e => pickMaterial(idx, e.target.value ? Number(e.target.value) : null)}
                      className={`${inputCls} text-xs`}
                      title={lang === 'fr' ? 'Lier à une matière du catalogue (optionnel)' : 'Link to catalog material (optional)'}
                    >
                      <option value="">
                        {lang === 'fr' ? '— Libre / hors catalogue —' : '— Free / off catalog —'}
                      </option>
                      {materials.data?.map(m => (
                        <option key={m.id} value={m.id}>{m.name} ({m.unit})</option>
                      ))}
                    </select>
                    <input
                      type="text"
                      value={row.label}
                      onChange={e => updateField(idx, 'label', e.target.value)}
                      placeholder={lang === 'fr' ? 'Ex: Arachides 50 kg' : 'Ex: Peanuts 50 kg'}
                      className={inputCls}
                    />
                    <input
                      type="number"
                      step="0.01"
                      value={row.amount}
                      onChange={e => updateField(idx, 'amount', e.target.value)}
                      placeholder="$ 0.00"
                      className={`${inputCls} text-right tabular-nums`}
                    />
                    <button
                      type="button"
                      onClick={() => removeRow(idx)}
                      className="px-2 py-2 text-stone-400 hover:text-red-600 hover:bg-red-50 rounded-lg self-end sm:self-auto"
                      aria-label={t('action.delete')}
                    >
                      <Trash2 size={15} />
                    </button>
                  </div>

                  {/* Ligne 2 : quantité + unité (optionnels, requis seulement pour register) */}
                  <div className="grid grid-cols-[1fr,5rem,auto] gap-2 items-center">
                    <input
                      type="number"
                      step="0.001"
                      value={row.quantity}
                      onChange={e => updateField(idx, 'quantity', e.target.value)}
                      placeholder={lang === 'fr' ? 'Quantité (optionnel)' : 'Quantity (optional)'}
                      className={`${inputCls} text-xs`}
                    />
                    <input
                      type="text"
                      value={row.unit}
                      onChange={e => updateField(idx, 'unit', e.target.value)}
                      placeholder={lang === 'fr' ? 'kg / unité' : 'kg / unit'}
                      className={`${inputCls} text-xs`}
                      disabled={!!linkedMaterial}
                      title={linkedMaterial ? (lang === 'fr' ? 'Unité reprise du catalogue' : 'Unit from catalog') : undefined}
                    />
                    {/* Bouton "Aussi enregistrer comme achat catalogue" */}
                    {alreadyRegistered ? (
                      <span className="inline-flex items-center gap-1 px-2 py-1 rounded-md bg-emerald-50 text-emerald-700 text-[11px] font-semibold ring-1 ring-emerald-200 whitespace-nowrap">
                        ✓ {lang === 'fr' ? 'Catalogue mis à jour' : 'Catalog updated'}
                      </span>
                    ) : (
                      <label
                        className={`inline-flex items-center gap-1.5 text-[11px] font-medium whitespace-nowrap px-2 py-1 rounded-md transition ${
                          canRegister
                            ? 'cursor-pointer text-chika-paprika hover:bg-chika-paprika/5'
                            : 'cursor-not-allowed text-stone-400'
                        }`}
                        title={
                          canRegister
                            ? (lang === 'fr' ? 'Met à jour stock + PMP du catalogue au save' : 'Updates catalog stock + WAC on save')
                            : (lang === 'fr' ? 'Nécessite matière + quantité' : 'Requires material + quantity')
                        }
                      >
                        <input
                          type="checkbox"
                          checked={row.register_as_purchase}
                          onChange={e => updateField(idx, 'register_as_purchase', e.target.checked)}
                          disabled={!canRegister}
                          className="accent-chika-paprika"
                        />
                        {lang === 'fr' ? 'Aussi achat catalogue' : 'Also catalog purchase'}
                      </label>
                    )}
                  </div>
                </div>
              )
            })}
          </div>
          <p className="text-[11px] text-stone-500 mt-2 italic">
            {lang === 'fr'
              ? 'Astuce : « Aussi achat catalogue » ajoute la quantité au stock catalogue et recalcule le PMP. Coche-la pour les vrais réappros de matière première (cajou, chanvre…). Laisse décoché pour les achats ponctuels (glace, location…).'
              : 'Tip: "Also catalog purchase" adds the quantity to catalog stock and recomputes the WAC. Check it for real raw-material restocks (cashews, hemp…). Leave unchecked for one-off purchases (ice, rental…).'}
          </p>
          <button
            type="button"
            onClick={addRow}
            className="mt-2 inline-flex items-center gap-1 text-xs font-semibold text-chika-paprika hover:text-chika-paprikaDeep px-2 py-1 rounded-lg hover:bg-chika-paprika/5"
          >
            <Plus size={13} /> {lang === 'fr' ? 'Ajouter une matière' : 'Add material'}
          </button>
        </div>

        <div className="pt-3 border-t border-stone-200">
          <div className="text-xs font-bold uppercase tracking-wider text-stone-500 mb-2">{t('events.section.revenue')}</div>
          <div className="grid grid-cols-2 gap-3">
            <Field label={t('events.field.total_revenue')} error={errors.total_revenue?.message}>
              <input type="number" step="0.01" {...register('total_revenue')} className={inputCls} />
            </Field>
            <Field label={t('events.field.units_sold')} error={errors.units_sold?.message}>
              <input type="number" step="1" {...register('units_sold')} className={inputCls} />
            </Field>
          </div>
        </div>

        <Field label={t('events.field.notes')}>
          <textarea {...register('notes')} rows={2} className={inputCls} placeholder="Météo, observations…" />
        </Field>

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
