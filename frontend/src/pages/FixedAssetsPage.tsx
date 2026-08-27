import { useState } from 'react'
import { todayISO } from '../lib/dates'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { Plus, Trash2, X } from 'lucide-react'
import { listFixedAssets, createFixedAsset, deleteFixedAsset } from '../api/pme'
import { PageHeader } from '../components/shared/AppLayout'
import { Card, CardBody, CardHeader } from '../components/ui/Card'
import { Button } from '../components/ui/Button'
import { EmptyState } from '../components/ui/EmptyState'
import { useT, useLang } from '../lib/i18n'

const fmtCAD = (v: number) =>
  new Intl.NumberFormat('fr-CA', { style: 'currency', currency: 'CAD' }).format(v)

// Classes CCA canadiennes courantes pour PME alimentaire
function useCcaClasses() {
  const t = useT()
  return [
    { value: '8', rate: 20, label: t('fixedassets.cca.8') },
    { value: '10', rate: 30, label: t('fixedassets.cca.10') },
    { value: '10.1', rate: 30, label: t('fixedassets.cca.10_1') },
    { value: '12', rate: 100, label: t('fixedassets.cca.12') },
    { value: '13', rate: 0, label: t('fixedassets.cca.13') },
    { value: '14.1', rate: 5, label: t('fixedassets.cca.14_1') },
    { value: '50', rate: 55, label: t('fixedassets.cca.50') },
    { value: '53', rate: 50, label: t('fixedassets.cca.53') },
  ]
}

export default function FixedAssetsPage() {
  const qc = useQueryClient()
  const t = useT()
  const [lang] = useLang()
  const [showForm, setShowForm] = useState(false)

  const { data: assets = [], isLoading } = useQuery({
    queryKey: ['fixed-assets'],
    queryFn: listFixedAssets,
  })

  const totalCost = assets.reduce((s, a) => s + Number(a.cost), 0)
  const totalBookValue = assets.reduce((s, a) => s + Number(a.book_value), 0)
  const totalAnnualDep = assets.reduce((s, a) => s + Number(a.annual_depreciation_estimate), 0)

  return (
    <div className="px-4 sm:px-6 lg:px-10 py-6 sm:py-8 max-w-6xl">
      <PageHeader
        title={t('fixedassets.title')}
        description={t('fixedassets.description')}
        action={
          <Button icon={<Plus size={16} />} onClick={() => setShowForm(true)}>
            {t('fixedassets.new')}
          </Button>
        }
      />

      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 mb-6">
        <Kpi label={t('fixedassets.kpi.total_cost')} value={fmtCAD(totalCost)} />
        <Kpi label={t('fixedassets.kpi.net_book_value')} value={fmtCAD(totalBookValue)} tone="paprika" />
        <Kpi label={t('fixedassets.kpi.annual_dep')} value={fmtCAD(totalAnnualDep)} tone="info" />
      </div>

      {isLoading && <div className="text-stone-400 text-sm">{t('label.loading')}</div>}
      {assets.length === 0 && !isLoading && (
        <Card>
          <CardBody>
            <EmptyState
              icon="🏭"
              title={t('fixedassets.empty.title')}
              description={t('fixedassets.empty.desc')}
            />
          </CardBody>
        </Card>
      )}

      {assets.length > 0 && (
        <Card>
          <CardHeader title={t('fixedassets.table_title')} subtitle={t('fixedassets.table_subtitle')} />
          <CardBody className="p-0 overflow-x-auto">
            <table className="w-full text-sm min-w-[800px]">
              <thead className="bg-stone-50 text-[10px] uppercase tracking-wider text-stone-500">
                <tr>
                  <th className="text-left px-5 py-2.5">{t('label.name')}</th>
                  <th className="text-left px-3 py-2.5">{t('fixedassets.table.purchase_date')}</th>
                  <th className="text-right px-3 py-2.5">{t('fixedassets.table.cost')}</th>
                  <th className="text-center px-3 py-2.5">{t('fixedassets.table.class')}</th>
                  <th className="text-right px-3 py-2.5">{t('fixedassets.table.rate')}</th>
                  <th className="text-right px-3 py-2.5">{t('fixedassets.table.accum_dep')}</th>
                  <th className="text-right px-3 py-2.5">{t('fixedassets.table.net_value')}</th>
                  <th className="text-right px-3 py-2.5">{t('fixedassets.table.annual_dep')}</th>
                  <th className="w-12"></th>
                </tr>
              </thead>
              <tbody>
                {assets.map(a => (
                  <tr key={a.id} className="border-t border-stone-200">
                    <td className="px-5 py-2.5 font-medium text-stone-900">{a.name}</td>
                    <td className="px-3 py-2.5 text-stone-600">{new Date(a.purchase_date).toLocaleDateString(lang === 'en' ? 'en-CA' : 'fr-CA')}</td>
                    <td className="px-3 py-2.5 text-right tabular-nums">{fmtCAD(Number(a.cost))}</td>
                    <td className="px-3 py-2.5 text-center text-xs">{a.cca_class}</td>
                    <td className="px-3 py-2.5 text-right tabular-nums text-xs">{Number(a.cca_rate_pct)}%</td>
                    <td className="px-3 py-2.5 text-right tabular-nums text-stone-500">{fmtCAD(Number(a.accumulated_depreciation))}</td>
                    <td className="px-3 py-2.5 text-right tabular-nums font-semibold">{fmtCAD(Number(a.book_value))}</td>
                    <td className="px-3 py-2.5 text-right tabular-nums text-chika-paprika font-semibold">{fmtCAD(Number(a.annual_depreciation_estimate))}</td>
                    <td className="px-3 py-2.5">
                      <button onClick={() => {
                        if (window.confirm(t('clients.confirm_delete').replace('{name}', a.name))) {
                          deleteFixedAsset(a.id).then(() => qc.invalidateQueries({ queryKey: ['fixed-assets'] }))
                        }
                      }} className="text-stone-400 hover:text-red-600 p-1">
                        <Trash2 size={13} />
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </CardBody>
        </Card>
      )}

      <p className="mt-4 text-xs text-stone-500 italic">
        {t('fixedassets.footer_hint')}
      </p>

      {showForm && <FixedAssetForm onClose={() => setShowForm(false)} onSaved={() => {
        qc.invalidateQueries({ queryKey: ['fixed-assets'] })
        setShowForm(false)
      }} />}
    </div>
  )
}

function FixedAssetForm({ onClose, onSaved }: { onClose: () => void; onSaved: () => void }) {
  const t = useT()
  const CCA_CLASSES = useCcaClasses()
  const [name, setName] = useState('')
  const [date, setDate] = useState(todayISO())
  const [cost, setCost] = useState('')
  const [classIdx, setClassIdx] = useState(0)
  const [notes, setNotes] = useState('')
  const cls = CCA_CLASSES[classIdx]

  const mut = useMutation({
    mutationFn: () => createFixedAsset({
      name: name.trim(),
      purchase_date: date,
      cost: Number(cost),
      cca_class: cls.value,
      cca_rate_pct: cls.rate,
      notes: notes || undefined,
    }),
    onSuccess: onSaved,
  })

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4" onClick={onClose}>
      <div onClick={e => e.stopPropagation()} className="bg-white rounded-2xl shadow-xl w-full max-w-md p-6 space-y-4">
        <div className="flex items-center justify-between">
          <h3 className="text-lg font-bold text-stone-900">{t('fixedassets.new')}</h3>
          <button onClick={onClose} className="text-stone-400 hover:text-stone-700"><X size={18} /></button>
        </div>
        <Field label={t('fixedassets.form.name')}><input value={name} onChange={e => setName(e.target.value)} className={inputCls} placeholder={t('fixedassets.form.name_placeholder')} /></Field>
        <div className="grid grid-cols-2 gap-3">
          <Field label={t('fixedassets.form.purchase_date')}><input type="date" value={date} onChange={e => setDate(e.target.value)} className={inputCls} /></Field>
          <Field label={t('fixedassets.form.cost')}><input type="number" step="0.01" value={cost} onChange={e => setCost(e.target.value)} className={inputCls} /></Field>
        </div>
        <Field label={t('fixedassets.form.cca_class')}>
          <select value={classIdx} onChange={e => setClassIdx(Number(e.target.value))} className={inputCls}>
            {CCA_CLASSES.map((c, i) => <option key={c.value} value={i}>{c.label}</option>)}
          </select>
        </Field>
        <Field label={t('fixedassets.form.notes_optional')}><textarea value={notes} onChange={e => setNotes(e.target.value)} rows={2} className={inputCls} /></Field>
        <div className="flex gap-2 justify-end">
          <button onClick={onClose} className="px-3 py-2 rounded-lg text-sm text-stone-600 hover:bg-stone-100">{t('action.cancel')}</button>
          <button onClick={() => mut.mutate()} disabled={!name.trim() || !cost || mut.isPending}
            className="bg-chika-paprika hover:bg-chika-paprikaDeep disabled:opacity-50 text-white text-sm font-semibold px-4 py-2 rounded-lg">
            {mut.isPending ? '…' : t('action.create')}
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

function Kpi({ label, value, tone = 'neutral' }: { label: string; value: string; tone?: 'neutral' | 'paprika' | 'info' }) {
  const cls = tone === 'paprika' ? 'text-chika-paprika' : tone === 'info' ? 'text-blue-700' : 'text-stone-900'
  return (
    <Card>
      <CardBody>
        <div className="text-[10px] uppercase tracking-wider text-stone-400 font-semibold mb-1">{label}</div>
        <div className={`text-xl font-bold tabular-nums ${cls}`}>{value}</div>
      </CardBody>
    </Card>
  )
}
