import { useState } from 'react'
import { todayISO } from '../lib/dates'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { Plus, Trash2, X } from 'lucide-react'
import { listFixedAssets, createFixedAsset, deleteFixedAsset } from '../api/pme'
import { PageHeader } from '../components/shared/AppLayout'
import { Card, CardBody, CardHeader } from '../components/ui/Card'
import { Button } from '../components/ui/Button'
import { EmptyState } from '../components/ui/EmptyState'

const fmtCAD = (v: number) =>
  new Intl.NumberFormat('fr-CA', { style: 'currency', currency: 'CAD' }).format(v)

// Classes CCA canadiennes courantes pour PME alimentaire
const CCA_CLASSES = [
  { value: '8', rate: 20, label: 'Classe 8 — Mobilier, équipement (20%)' },
  { value: '10', rate: 30, label: 'Classe 10 — Véhicule (30%)' },
  { value: '10.1', rate: 30, label: 'Classe 10.1 — Voiture > 36k$ (30%)' },
  { value: '12', rate: 100, label: 'Classe 12 — Outils < 500$, logiciel (100%)' },
  { value: '13', rate: 0, label: 'Classe 13 — Amélioration bail locatif (linéaire)' },
  { value: '14.1', rate: 5, label: 'Classe 14.1 — Goodwill, achalandage (5%)' },
  { value: '50', rate: 55, label: 'Classe 50 — Ordinateur, équipement info (55%)' },
  { value: '53', rate: 50, label: 'Classe 53 — Machinerie fabrication (50%)' },
]

export default function FixedAssetsPage() {
  const qc = useQueryClient()
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
        title="Immobilisations"
        description="Équipements > 500 $ amortis sur plusieurs années (CCA / DPA Canada). À déclarer pour optimiser ton impôt."
        action={
          <Button icon={<Plus size={16} />} onClick={() => setShowForm(true)}>
            Nouvelle immobilisation
          </Button>
        }
      />

      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 mb-6">
        <Kpi label="Coût d'origine total" value={fmtCAD(totalCost)} />
        <Kpi label="Valeur comptable nette" value={fmtCAD(totalBookValue)} tone="paprika" />
        <Kpi label="Amortissement annuel" value={fmtCAD(totalAnnualDep)} tone="info" />
      </div>

      {isLoading && <div className="text-stone-400 text-sm">Chargement…</div>}
      {assets.length === 0 && !isLoading && (
        <Card>
          <CardBody>
            <EmptyState
              icon="🏭"
              title="Aucune immobilisation enregistrée"
              description="Si tu achètes du matériel > 500 $ (four, frigo, vehicule…), enregistre-le ici pour calculer l'amortissement fiscal."
            />
          </CardBody>
        </Card>
      )}

      {assets.length > 0 && (
        <Card>
          <CardHeader title="Tableau d'amortissement" subtitle="Valeur comptable = coût − amortissement cumulé" />
          <CardBody className="p-0 overflow-x-auto">
            <table className="w-full text-sm min-w-[800px]">
              <thead className="bg-stone-50 text-[10px] uppercase tracking-wider text-stone-500">
                <tr>
                  <th className="text-left px-5 py-2.5">Nom</th>
                  <th className="text-left px-3 py-2.5">Date achat</th>
                  <th className="text-right px-3 py-2.5">Coût</th>
                  <th className="text-center px-3 py-2.5">Classe</th>
                  <th className="text-right px-3 py-2.5">Taux</th>
                  <th className="text-right px-3 py-2.5">Amort. cumulé</th>
                  <th className="text-right px-3 py-2.5">Valeur nette</th>
                  <th className="text-right px-3 py-2.5">Amort. annuel</th>
                  <th className="w-12"></th>
                </tr>
              </thead>
              <tbody>
                {assets.map(a => (
                  <tr key={a.id} className="border-t border-stone-200">
                    <td className="px-5 py-2.5 font-medium text-stone-900">{a.name}</td>
                    <td className="px-3 py-2.5 text-stone-600">{new Date(a.purchase_date).toLocaleDateString('fr-CA')}</td>
                    <td className="px-3 py-2.5 text-right tabular-nums">{fmtCAD(Number(a.cost))}</td>
                    <td className="px-3 py-2.5 text-center text-xs">{a.cca_class}</td>
                    <td className="px-3 py-2.5 text-right tabular-nums text-xs">{Number(a.cca_rate_pct)}%</td>
                    <td className="px-3 py-2.5 text-right tabular-nums text-stone-500">{fmtCAD(Number(a.accumulated_depreciation))}</td>
                    <td className="px-3 py-2.5 text-right tabular-nums font-semibold">{fmtCAD(Number(a.book_value))}</td>
                    <td className="px-3 py-2.5 text-right tabular-nums text-chika-paprika font-semibold">{fmtCAD(Number(a.annual_depreciation_estimate))}</td>
                    <td className="px-3 py-2.5">
                      <button onClick={() => {
                        if (window.confirm(`Supprimer "${a.name}" ?`)) {
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
        💡 La DPA (Déduction Pour Amortissement) est ce que tu déduis de tes revenus à chaque année. Le comptable la calcule depuis ce tableau.
      </p>

      {showForm && <FixedAssetForm onClose={() => setShowForm(false)} onSaved={() => {
        qc.invalidateQueries({ queryKey: ['fixed-assets'] })
        setShowForm(false)
      }} />}
    </div>
  )
}

function FixedAssetForm({ onClose, onSaved }: { onClose: () => void; onSaved: () => void }) {
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
          <h3 className="text-lg font-bold text-stone-900">Nouvelle immobilisation</h3>
          <button onClick={onClose} className="text-stone-400 hover:text-stone-700"><X size={18} /></button>
        </div>
        <Field label="Nom"><input value={name} onChange={e => setName(e.target.value)} className={inputCls} placeholder="Ex: Four convection 4500W" /></Field>
        <div className="grid grid-cols-2 gap-3">
          <Field label="Date d'achat"><input type="date" value={date} onChange={e => setDate(e.target.value)} className={inputCls} /></Field>
          <Field label="Coût ($CAD)"><input type="number" step="0.01" value={cost} onChange={e => setCost(e.target.value)} className={inputCls} /></Field>
        </div>
        <Field label="Classe CCA">
          <select value={classIdx} onChange={e => setClassIdx(Number(e.target.value))} className={inputCls}>
            {CCA_CLASSES.map((c, i) => <option key={c.value} value={i}>{c.label}</option>)}
          </select>
        </Field>
        <Field label="Notes (optionnel)"><textarea value={notes} onChange={e => setNotes(e.target.value)} rows={2} className={inputCls} /></Field>
        <div className="flex gap-2 justify-end">
          <button onClick={onClose} className="px-3 py-2 rounded-lg text-sm text-stone-600 hover:bg-stone-100">Annuler</button>
          <button onClick={() => mut.mutate()} disabled={!name.trim() || !cost || mut.isPending}
            className="bg-chika-paprika hover:bg-chika-paprikaDeep disabled:opacity-50 text-white text-sm font-semibold px-4 py-2 rounded-lg">
            {mut.isPending ? '…' : 'Créer'}
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
