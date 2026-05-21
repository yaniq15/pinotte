import { useQuery } from '@tanstack/react-query'
import { AlertTriangle, Clock } from 'lucide-react'
import { getARAging } from '../api/pme'
import { PageHeader } from '../components/shared/AppLayout'
import { Card, CardBody, CardHeader } from '../components/ui/Card'
import { Badge } from '../components/ui/Badge'
import { EmptyState } from '../components/ui/EmptyState'

const fmtCAD = (v: number) =>
  new Intl.NumberFormat('fr-CA', { style: 'currency', currency: 'CAD' }).format(v)

export default function ARAgingPage() {
  const { data: aging, isLoading } = useQuery({
    queryKey: ['ar-aging'],
    queryFn: () => getARAging(),
  })

  return (
    <div className="px-4 sm:px-6 lg:px-10 py-6 sm:py-8 max-w-6xl">
      <PageHeader
        title="Comptes à recevoir"
        description="Vue des factures impayées par âge — la cause #1 de mort des PME, à surveiller chaque semaine."
      />

      {isLoading && <div className="text-stone-400 text-sm">Chargement…</div>}

      {aging && (
        <>
          {/* KPIs globaux */}
          <div className="grid grid-cols-2 lg:grid-cols-5 gap-3 sm:gap-4 mb-6">
            <Bucket label="Total dû" value={aging.totals.total} tone="paprika" big />
            <Bucket label="0-30 jours" value={aging.totals.days_0_30} tone="success" />
            <Bucket label="31-60 jours" value={aging.totals.days_31_60} tone="info" />
            <Bucket label="61-90 jours" value={aging.totals.days_61_90} tone="warning" />
            <Bucket label="90+ jours ⚠" value={aging.totals.days_90_plus} tone="danger" />
          </div>

          {/* DSO */}
          {aging.dso_days !== null && (
            <Card className="mb-6 ring-blue-200 bg-blue-50/30">
              <CardBody>
                <div className="flex items-center gap-3">
                  <Clock size={20} className="text-blue-700" />
                  <div>
                    <div className="text-xs font-bold uppercase tracking-wider text-blue-900">
                      DSO — Days Sales Outstanding
                    </div>
                    <div className="text-2xl font-bold tabular-nums text-blue-900">
                      {aging.dso_days} jours en moyenne
                    </div>
                    <div className="text-xs text-blue-700 mt-1">
                      Délai moyen entre la vente et le paiement.
                      Cible PME alim : &lt; 35 jours. {aging.dso_days > 45 && '⚠ Au-dessus du seuil de risque.'}
                    </div>
                  </div>
                </div>
              </CardBody>
            </Card>
          )}

          {/* Table détaillée par client */}
          <Card>
            <CardHeader
              title="Détail par client"
              subtitle="Trié du plus grand débiteur au plus petit"
            />
            <CardBody className="p-0 overflow-x-auto">
              {aging.by_client.length === 0
                ? <EmptyState icon="💰" title="Aucune facture impayée" description="Tous tes clients sont à jour !" />
                : (
                  <table className="w-full text-sm min-w-[720px]">
                    <thead className="bg-stone-50 text-[10px] uppercase tracking-wider text-stone-500">
                      <tr>
                        <th className="text-left px-5 py-2.5">Client</th>
                        <th className="text-center px-3 py-2.5">Factures</th>
                        <th className="text-right px-3 py-2.5">0-30 j</th>
                        <th className="text-right px-3 py-2.5">31-60 j</th>
                        <th className="text-right px-3 py-2.5">61-90 j</th>
                        <th className="text-right px-3 py-2.5 bg-red-50 text-red-700">90+ j ⚠</th>
                        <th className="text-right px-5 py-2.5 font-bold">Total dû</th>
                      </tr>
                    </thead>
                    <tbody>
                      {aging.by_client.map(c => (
                        <tr key={c.client_id} className="border-t border-stone-200">
                          <td className="px-5 py-2.5">
                            <div className="font-medium text-stone-900">{c.client_name}</div>
                            <Badge tone={c.client_type === 'BROKER' ? 'info' : 'paprika'}>
                              {c.client_type === 'BROKER' ? 'Courtier' : 'Magasin'}
                            </Badge>
                          </td>
                          <td className="px-3 py-2.5 text-center tabular-nums text-stone-600">{c.invoice_count}</td>
                          <td className="px-3 py-2.5 text-right tabular-nums">{c.days_0_30 > 0 ? fmtCAD(c.days_0_30) : <span className="text-stone-300">—</span>}</td>
                          <td className="px-3 py-2.5 text-right tabular-nums text-amber-700">{c.days_31_60 > 0 ? fmtCAD(c.days_31_60) : <span className="text-stone-300">—</span>}</td>
                          <td className="px-3 py-2.5 text-right tabular-nums text-orange-700">{c.days_61_90 > 0 ? fmtCAD(c.days_61_90) : <span className="text-stone-300">—</span>}</td>
                          <td className={`px-3 py-2.5 text-right tabular-nums font-semibold ${c.days_90_plus > 0 ? 'text-red-700 bg-red-50' : ''}`}>
                            {c.days_90_plus > 0
                              ? <span className="inline-flex items-center gap-1">{fmtCAD(c.days_90_plus)} <AlertTriangle size={12} /></span>
                              : <span className="text-stone-300">—</span>}
                          </td>
                          <td className="px-5 py-2.5 text-right tabular-nums font-bold text-stone-900">{fmtCAD(c.total)}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                )}
            </CardBody>
          </Card>

          <p className="mt-4 text-xs text-stone-500 italic">
            💡 Tip : pour les factures &gt; 60 jours, appelle le client. Pour 90+ jours, envisage l'envoi à
            une agence de recouvrement ou la radiation en créance douteuse (impact fiscal +).
          </p>
        </>
      )}
    </div>
  )
}

function Bucket({ label, value, tone, big = false }: {
  label: string
  value: number
  tone: 'success' | 'info' | 'warning' | 'danger' | 'paprika'
  big?: boolean
}) {
  const colors = {
    success: 'text-emerald-700',
    info: 'text-blue-700',
    warning: 'text-amber-700',
    danger: 'text-red-700',
    paprika: 'text-chika-paprika',
  }[tone]
  return (
    <Card>
      <CardBody>
        <div className="text-[10px] uppercase tracking-wider text-stone-400 font-semibold mb-1">{label}</div>
        <div className={`${big ? 'text-2xl' : 'text-xl'} font-bold tabular-nums ${colors}`}>
          {fmtCAD(value)}
        </div>
      </CardBody>
    </Card>
  )
}
