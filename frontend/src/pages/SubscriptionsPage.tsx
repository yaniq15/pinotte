import { useQuery } from '@tanstack/react-query'
import { AlertCircle, CheckCircle2 } from 'lucide-react'
import { getRecurringExpenses } from '../api/pme'
import { PageHeader } from '../components/shared/AppLayout'
import { Card, CardBody, CardHeader } from '../components/ui/Card'
import { EmptyState } from '../components/ui/EmptyState'

const fmtCAD = (v: number) =>
  new Intl.NumberFormat('fr-CA', { style: 'currency', currency: 'CAD' }).format(v)

const FREQ_LABEL: Record<string, string> = {
  monthly: 'Mensuel',
  quarterly: 'Trimestriel',
  yearly: 'Annuel',
}

export default function SubscriptionsPage() {
  const { data, isLoading } = useQuery({
    queryKey: ['recurring-expenses'],
    queryFn: getRecurringExpenses,
  })

  return (
    <div className="px-4 sm:px-6 lg:px-10 py-6 sm:py-8 max-w-5xl">
      <PageHeader
        title="Abonnements & frais récurrents"
        description="Liste de tes engagements mensuels/annuels — pour repérer les abonnements dormants à annuler."
      />

      {isLoading && <div className="text-stone-400 text-sm">Chargement…</div>}

      {data && (
        <>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 mb-6">
            <Card>
              <CardBody>
                <div className="text-[10px] uppercase tracking-wider text-stone-400 font-semibold mb-1">Abonnements actifs</div>
                <div className="text-2xl font-bold tabular-nums">{data.items.length}</div>
              </CardBody>
            </Card>
            <Card>
              <CardBody>
                <div className="text-[10px] uppercase tracking-wider text-stone-400 font-semibold mb-1">Total annualisé</div>
                <div className="text-2xl font-bold tabular-nums text-chika-paprika">{fmtCAD(data.total_annualized)}</div>
              </CardBody>
            </Card>
            <Card className={data.dormant_count > 0 ? 'ring-amber-300 bg-amber-50/30' : ''}>
              <CardBody>
                <div className="text-[10px] uppercase tracking-wider text-stone-400 font-semibold mb-1">⚠ Potentiellement dormants</div>
                <div className={`text-2xl font-bold tabular-nums ${data.dormant_count > 0 ? 'text-amber-700' : 'text-emerald-700'}`}>
                  {data.dormant_count}
                </div>
              </CardBody>
            </Card>
          </div>

          {data.items.length === 0
            ? (
              <Card>
                <CardBody>
                  <EmptyState
                    icon="📋"
                    title="Aucun abonnement enregistré"
                    description="Quand tu saisis une dépense, coche 'Récurrent' + choisis la fréquence pour qu'elle apparaisse ici."
                  />
                </CardBody>
              </Card>
            )
            : (
              <Card>
                <CardHeader title="Liste des abonnements" subtitle="Trié du plus cher au moins cher (sur base annualisée)" />
                <CardBody className="p-0 overflow-x-auto">
                  <table className="w-full text-sm">
                    <thead className="bg-stone-50 text-[10px] uppercase tracking-wider text-stone-500">
                      <tr>
                        <th className="text-left px-5 py-2.5">Fournisseur</th>
                        <th className="text-left px-5 py-2.5">Description</th>
                        <th className="text-left px-3 py-2.5">Fréquence</th>
                        <th className="text-right px-3 py-2.5">Montant</th>
                        <th className="text-right px-3 py-2.5">Annualisé</th>
                        <th className="text-left px-3 py-2.5">Dernier paiement</th>
                        <th className="text-center px-3 py-2.5">Statut</th>
                      </tr>
                    </thead>
                    <tbody>
                      {data.items.map((s, i) => (
                        <tr key={i} className={`border-t border-stone-200 ${s.is_dormant ? 'bg-amber-50/40' : ''}`}>
                          <td className="px-5 py-2.5 font-medium text-stone-900">{s.vendor || '—'}</td>
                          <td className="px-5 py-2.5 text-stone-700">{s.description}</td>
                          <td className="px-3 py-2.5 text-xs text-stone-600">{FREQ_LABEL[s.frequency] || s.frequency}</td>
                          <td className="px-3 py-2.5 text-right tabular-nums">{fmtCAD(s.amount)}</td>
                          <td className="px-3 py-2.5 text-right tabular-nums font-semibold text-chika-paprika">{fmtCAD(s.annualized)}</td>
                          <td className="px-3 py-2.5 text-xs text-stone-600">{new Date(s.last_seen).toLocaleDateString('fr-CA')}</td>
                          <td className="px-3 py-2.5 text-center">
                            {s.is_dormant ? (
                              <span className="inline-flex items-center gap-1 text-amber-700 text-xs font-semibold">
                                <AlertCircle size={12} /> Dormant
                              </span>
                            ) : (
                              <span className="inline-flex items-center gap-1 text-emerald-700 text-xs font-semibold">
                                <CheckCircle2 size={12} /> Actif
                              </span>
                            )}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </CardBody>
              </Card>
            )}

          <p className="mt-4 text-xs text-stone-500 italic">
            💡 Les abonnements sans paiement depuis 60 jours peuvent être annulés. Économies typiques d'une PME : 1500-3000 $/an.
          </p>
        </>
      )}
    </div>
  )
}
