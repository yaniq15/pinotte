import { useState } from 'react'
import { todayISO } from '../lib/dates'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { Plus, X } from 'lucide-react'
import { listInventoryCounts, createInventoryCount } from '../api/pme'
import { listProducts } from '../api/products'
import { PageHeader } from '../components/shared/AppLayout'
import { Card, CardBody, CardHeader } from '../components/ui/Card'
import { Button } from '../components/ui/Button'
import { EmptyState } from '../components/ui/EmptyState'
import { useT, useLang } from '../lib/i18n'

export default function InventoryCountPage() {
  const qc = useQueryClient()
  const t = useT()
  const [lang] = useLang()
  const [showForm, setShowForm] = useState(false)

  const { data: counts = [], isLoading } = useQuery({
    queryKey: ['inventory-counts'],
    queryFn: listInventoryCounts,
  })

  return (
    <div className="px-4 sm:px-6 lg:px-10 py-6 sm:py-8 max-w-5xl">
      <PageHeader
        title={t('invcount.title')}
        description={t('invcount.description')}
        action={
          <Button icon={<Plus size={16} />} onClick={() => setShowForm(true)}>
            {t('invcount.new')}
          </Button>
        }
      />

      {isLoading && <div className="text-stone-400 text-sm">{t('label.loading')}</div>}
      {counts.length === 0 && !isLoading && (
        <Card>
          <CardBody>
            <EmptyState
              icon="📦"
              title={t('invcount.empty.title')}
              description={t('invcount.empty.desc')}
            />
          </CardBody>
        </Card>
      )}
      {counts.length > 0 && (
        <Card>
          <CardHeader title={t('invcount.history_title')} />
          <CardBody className="p-0 overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="bg-stone-50 text-[10px] uppercase tracking-wider text-stone-500">
                <tr>
                  <th className="text-left px-5 py-2.5">{t('label.date')}</th>
                  <th className="text-left px-5 py-2.5">{t('invcount.form.product')}</th>
                  <th className="text-right px-3 py-2.5">{t('invcount.table.theoretical')}</th>
                  <th className="text-right px-3 py-2.5">{t('invcount.table.physical')}</th>
                  <th className="text-right px-3 py-2.5">{t('invcount.table.delta')}</th>
                  <th className="text-left px-5 py-2.5">{t('label.notes')}</th>
                </tr>
              </thead>
              <tbody>
                {counts.map(c => (
                  <tr key={c.id} className="border-t border-stone-200">
                    <td className="px-5 py-2.5 text-stone-600">{new Date(c.count_date).toLocaleDateString(lang === 'en' ? 'en-CA' : 'fr-CA')}</td>
                    <td className="px-5 py-2.5 font-medium text-stone-900">{c.product_name}</td>
                    <td className="px-3 py-2.5 text-right tabular-nums text-stone-500">{c.theoretical_qty_boxes}</td>
                    <td className="px-3 py-2.5 text-right tabular-nums font-semibold">{c.physical_qty_boxes}</td>
                    <td className={`px-3 py-2.5 text-right tabular-nums font-bold ${
                      c.delta_boxes > 0 ? 'text-emerald-700' :
                      c.delta_boxes < 0 ? 'text-red-700' : 'text-stone-400'
                    }`}>
                      {c.delta_boxes > 0 ? '+' : ''}{c.delta_boxes}
                    </td>
                    <td className="px-5 py-2.5 text-stone-600 text-xs italic">{c.notes || '—'}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </CardBody>
        </Card>
      )}

      <p className="mt-4 text-xs text-stone-500 italic">
        {t('invcount.footer_hint')}
      </p>

      {showForm && <CountForm onClose={() => setShowForm(false)} onSaved={() => {
        qc.invalidateQueries({ queryKey: ['inventory-counts'] })
        qc.invalidateQueries({ queryKey: ['monthly-report'] })
        setShowForm(false)
      }} />}
    </div>
  )
}

function CountForm({ onClose, onSaved }: { onClose: () => void; onSaved: () => void }) {
  const t = useT()
  const products = useQuery({ queryKey: ['products'], queryFn: listProducts })
  const [productId, setProductId] = useState('')
  const [date, setDate] = useState(todayISO())
  const [physical, setPhysical] = useState('')
  const [notes, setNotes] = useState('')

  const mut = useMutation({
    mutationFn: () => createInventoryCount({
      product_id: Number(productId),
      count_date: date,
      physical_qty_boxes: Number(physical),
      notes: notes || undefined,
    }),
    onSuccess: onSaved,
  })

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4" onClick={onClose}>
      <div onClick={e => e.stopPropagation()} className="bg-white rounded-2xl shadow-xl w-full max-w-md p-6 space-y-4">
        <div className="flex items-center justify-between">
          <h3 className="text-lg font-bold text-stone-900">{t('invcount.form.title')}</h3>
          <button onClick={onClose} className="text-stone-400 hover:text-stone-700"><X size={18} /></button>
        </div>
        <Field label={t('invcount.form.product')}>
          <select value={productId} onChange={e => setProductId(e.target.value)} className={inputCls}>
            <option value="">{t('invcount.form.choose')}</option>
            {products.data?.map(p => <option key={p.id} value={p.id}>{p.name}</option>)}
          </select>
        </Field>
        <div className="grid grid-cols-2 gap-3">
          <Field label={t('invcount.form.count_date')}><input type="date" value={date} onChange={e => setDate(e.target.value)} className={inputCls} /></Field>
          <Field label={t('invcount.form.boxes_counted')}><input type="number" min="0" step="1" value={physical} onChange={e => setPhysical(e.target.value)} className={inputCls} /></Field>
        </div>
        <Field label={t('invcount.form.notes_label')}>
          <textarea value={notes} onChange={e => setNotes(e.target.value)} rows={2} className={inputCls} placeholder={t('invcount.form.notes_placeholder')} />
        </Field>
        <div className="flex gap-2 justify-end">
          <button onClick={onClose} className="px-3 py-2 rounded-lg text-sm text-stone-600 hover:bg-stone-100">{t('action.cancel')}</button>
          <button onClick={() => mut.mutate()} disabled={!productId || !physical || mut.isPending}
            className="bg-chika-paprika hover:bg-chika-paprikaDeep disabled:opacity-50 text-white text-sm font-semibold px-4 py-2 rounded-lg">
            {mut.isPending ? '…' : t('invcount.form.submit')}
          </button>
        </div>
      </div>
    </div>
  )
}

const inputCls = "w-full px-3 py-2 ring-1 ring-stone-300 rounded-lg focus:ring-2 focus:ring-chika-paprika focus:outline-none text-sm bg-white"
function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div>
      <label className="block text-xs font-semibold text-stone-600 mb-1">{label}</label>
      {children}
    </div>
  )
}
