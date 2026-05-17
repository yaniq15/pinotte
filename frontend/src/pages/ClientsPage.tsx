import { useState } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { Plus, X, Pencil, Briefcase, Store } from 'lucide-react'
import {
  listClients, createClient, updateClient, deleteClient,
  type Client, type ClientType, type ClientPayload,
} from '../api/clients'
import { PageHeader } from '../components/shared/AppLayout'

const schema = z.object({
  name: z.string().min(1, 'Requis'),
  type: z.enum(['BROKER', 'STORE']),
  email: z.string().email('Invalide').optional().or(z.literal('')),
  phone: z.string().optional().or(z.literal('')),
  address: z.string().optional().or(z.literal('')),
  payment_terms_days: z.coerce.number().int().min(0).max(365).default(30),
  active: z.boolean().default(true),
})
type FormData = z.infer<typeof schema>

const TYPE_META = {
  BROKER: { label: 'Courtier', icon: Briefcase, cls: 'bg-blue-100 text-blue-700' },
  STORE:  { label: 'Magasin',  icon: Store,     cls: 'bg-purple-100 text-purple-700' },
}

export default function ClientsPage() {
  const qc = useQueryClient()
  const [filterType, setFilterType] = useState<string>('')
  const [editing, setEditing] = useState<Client | null>(null)
  const [showForm, setShowForm] = useState(false)

  const { data: clients = [], isLoading } = useQuery({
    queryKey: ['clients', filterType],
    queryFn: () => listClients(filterType ? (filterType as ClientType) : undefined),
  })

  return (
    <div className="px-6 lg:px-10 py-8 max-w-6xl">
      <PageHeader
        title="Clients"
        description="Courtiers et magasins — coordonnées et conditions de paiement."
        action={
          <button onClick={() => { setEditing(null); setShowForm(true) }}
            className="inline-flex items-center gap-1.5 bg-chika-paprika hover:bg-chika-paprikaDeep text-white text-sm font-semibold px-4 py-2 rounded-lg shadow-sm">
            <Plus size={16} /> Nouveau client
          </button>
        }
      />

      <div className="bg-white rounded-2xl border border-stone-200 p-4 mb-4 flex items-center gap-3 flex-wrap">
        <label className="text-sm font-semibold text-stone-700">Filtrer :</label>
        <select value={filterType} onChange={e => setFilterType(e.target.value)}
          className="px-3 py-1.5 border border-stone-300 rounded-lg text-sm">
          <option value="">Tous</option>
          <option value="BROKER">Courtiers</option>
          <option value="STORE">Magasins</option>
        </select>
      </div>

      {isLoading && <div className="text-stone-400 text-sm">Chargement…</div>}

      <div className="bg-white rounded-2xl border border-stone-200 overflow-hidden">
        <table className="w-full text-sm">
          <thead className="bg-stone-50 text-[11px] uppercase tracking-wider text-stone-500">
            <tr>
              <th className="text-left px-4 py-3">Nom</th>
              <th className="text-left px-4 py-3">Type</th>
              <th className="text-left px-4 py-3 hidden sm:table-cell">Contact</th>
              <th className="text-right px-4 py-3 hidden md:table-cell">Délai paiement</th>
              <th className="text-center px-4 py-3">Actif</th>
              <th className="px-4 py-3 w-12"></th>
            </tr>
          </thead>
          <tbody>
            {clients.map(c => {
              const meta = TYPE_META[c.type]
              const Icon = meta.icon
              return (
                <tr key={c.id} className={`border-t border-stone-100 hover:bg-stone-50 ${!c.active && 'opacity-50'}`}>
                  <td className="px-4 py-3 font-semibold text-stone-900">{c.name}</td>
                  <td className="px-4 py-3">
                    <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider ${meta.cls}`}>
                      <Icon size={10} /> {meta.label}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-xs text-stone-600 hidden sm:table-cell">
                    {c.email && <div>{c.email}</div>}
                    {c.phone && <div className="text-stone-400">{c.phone}</div>}
                  </td>
                  <td className="px-4 py-3 text-right text-stone-600 tabular-nums hidden md:table-cell">{c.payment_terms_days} j</td>
                  <td className="px-4 py-3 text-center">
                    {c.active
                      ? <span className="inline-block px-2 py-0.5 rounded-full text-[10px] font-bold uppercase bg-emerald-50 text-emerald-700">Oui</span>
                      : <span className="inline-block px-2 py-0.5 rounded-full text-[10px] font-bold uppercase bg-stone-100 text-stone-500">Non</span>}
                  </td>
                  <td className="px-4 py-3 text-right">
                    <button onClick={() => { setEditing(c); setShowForm(true) }}
                      className="text-stone-400 hover:text-chika-paprika p-1"><Pencil size={14} /></button>
                  </td>
                </tr>
              )
            })}
            {!isLoading && clients.length === 0 && (
              <tr><td colSpan={6} className="px-4 py-8 text-center text-stone-400">Aucun client.</td></tr>
            )}
          </tbody>
        </table>
      </div>

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
  const isEdit = !!initial
  const [serverError, setServerError] = useState<string | null>(null)
  const { register, handleSubmit, formState: { errors, isSubmitting } } = useForm<FormData>({
    resolver: zodResolver(schema),
    defaultValues: initial
      ? {
          name: initial.name, type: initial.type,
          email: initial.email || '', phone: initial.phone || '',
          address: initial.address || '', payment_terms_days: initial.payment_terms_days,
          active: initial.active,
        }
      : { type: 'BROKER', payment_terms_days: 30, active: true },
  })

  const mut = useMutation({
    mutationFn: async (v: FormData) => {
      const payload: ClientPayload = {
        name: v.name, type: v.type,
        email: v.email || null, phone: v.phone || null, address: v.address || null,
        payment_terms_days: Number(v.payment_terms_days), active: v.active,
      }
      return isEdit ? updateClient(initial!.id, payload) : createClient(payload)
    },
    onSuccess: onSaved,
    onError: (err: unknown) => {
      const msg = (err as { response?: { data?: { detail?: string } } })?.response?.data?.detail
      setServerError(msg || 'Erreur')
    },
  })

  const onDelete = async () => {
    if (!initial) return
    if (!window.confirm(`Supprimer "${initial.name}" ?`)) return
    try {
      await deleteClient(initial.id)
      qc.invalidateQueries({ queryKey: ['clients'] })
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
        className="bg-white rounded-2xl shadow-xl w-full max-w-md p-6 space-y-4 max-h-[90vh] overflow-y-auto">
        <div className="flex items-center justify-between">
          <h3 className="text-lg font-bold text-stone-900">{isEdit ? 'Modifier le client' : 'Nouveau client'}</h3>
          <button type="button" onClick={onClose} className="text-stone-400 hover:text-stone-700"><X size={18} /></button>
        </div>
        {serverError && <div className="px-3 py-2 rounded-lg bg-red-50 border border-red-200 text-red-700 text-sm">⚠ {serverError}</div>}

        <Field label="Nom" error={errors.name?.message}>
          <input {...register('name')} className={inputCls} />
        </Field>
        <Field label="Type" error={errors.type?.message}>
          <select {...register('type')} className={inputCls}>
            <option value="BROKER">Courtier</option>
            <option value="STORE">Magasin</option>
          </select>
        </Field>
        <div className="grid grid-cols-2 gap-3">
          <Field label="Email"><input type="email" {...register('email')} className={inputCls} /></Field>
          <Field label="Téléphone"><input {...register('phone')} className={inputCls} /></Field>
        </div>
        <Field label="Adresse"><textarea {...register('address')} rows={2} className={inputCls} /></Field>
        <Field label="Délai de paiement (jours)" error={errors.payment_terms_days?.message}>
          <input type="number" {...register('payment_terms_days')} className={inputCls} />
        </Field>
        <label className="flex items-center gap-2 text-sm cursor-pointer">
          <input type="checkbox" {...register('active')} className="accent-chika-paprika" /> Client actif
        </label>

        <div className="flex items-center justify-between gap-2 pt-2">
          {isEdit && <button type="button" onClick={onDelete} className="text-xs text-red-600 hover:underline">Supprimer</button>}
          <div className="flex gap-2 ml-auto">
            <button type="button" onClick={onClose} className="px-3 py-2 rounded-lg text-sm text-stone-600 hover:bg-stone-100">Annuler</button>
            <button type="submit" disabled={isSubmitting}
              className="bg-chika-paprika hover:bg-chika-paprikaDeep disabled:opacity-50 text-white text-sm font-semibold px-4 py-2 rounded-lg">
              {isSubmitting ? '…' : isEdit ? 'Enregistrer' : 'Créer'}
            </button>
          </div>
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
