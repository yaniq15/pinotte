import { useState } from 'react'
import { useQuery } from '@tanstack/react-query'
import { Download, AlertTriangle, TrendingUp, TrendingDown, Wallet, Package as PackageIcon } from 'lucide-react'
import {
  BarChart, Bar, PieChart, Pie, Cell, XAxis, YAxis, Tooltip, ResponsiveContainer, Legend,
} from 'recharts'
import { useCurrentUser } from '../hooks/useAuth'
import { getMonthlyReport, exportSalesCsvUrl, exportExpensesCsvUrl } from '../api/reports'
import { PageHeader } from '../components/shared/AppLayout'
import { Card, CardBody, CardHeader } from '../components/ui/Card'
import { Button } from '../components/ui/Button'
import { Badge } from '../components/ui/Badge'
import { EmptyState } from '../components/ui/EmptyState'

const MONTHS_FR = [
  'janvier', 'février', 'mars', 'avril', 'mai', 'juin',
  'juillet', 'août', 'septembre', 'octobre', 'novembre', 'décembre',
]
const PALETTE = ['#C5532E', '#E89B27', '#6B7F3A', '#5E7B8B', '#9B3A1A', '#B47A1B', '#4A2218', '#A8927A']

const fmtCAD = (v: number) =>
  new Intl.NumberFormat('fr-CA', { style: 'currency', currency: 'CAD', maximumFractionDigits: 0 }).format(v)
const fmtCADfull = (v: number) =>
  new Intl.NumberFormat('fr-CA', { style: 'currency', currency: 'CAD' }).format(v)

export default function HomePage() {
  const { data: user } = useCurrentUser()
  const now = new Date()
  const [year, setYear] = useState(now.getFullYear())
  const [month, setMonth] = useState(now.getMonth() + 1)

  const { data: report, isLoading } = useQuery({
    queryKey: ['monthly-report', year, month],
    queryFn: () => getMonthlyReport(year, month),
  })

  return (
    <div className="px-6 lg:px-10 py-8 max-w-7xl">
      <PageHeader
        title={`Bonjour ${user?.name?.split(' ')[0] || ''}`}
        description={`Tableau de bord — ${MONTHS_FR[month - 1]} ${year}.`}
        action={
          <>
            <select value={month} onChange={e => setMonth(Number(e.target.value))}
              className="px-3 py-2 ring-1 ring-stone-200 bg-white rounded-lg text-sm shadow-sm focus:ring-chika-paprika focus:outline-none">
              {MONTHS_FR.map((m, i) => <option key={m} value={i + 1}>{m}</option>)}
            </select>
            <select value={year} onChange={e => setYear(Number(e.target.value))}
              className="px-3 py-2 ring-1 ring-stone-200 bg-white rounded-lg text-sm shadow-sm focus:ring-chika-paprika focus:outline-none">
              {[year - 1, year, year + 1].map(y => <option key={y} value={y}>{y}</option>)}
            </select>
            <a href={exportSalesCsvUrl(year, month)}>
              <Button variant="secondary" size="sm" icon={<Download size={14} />}>Ventes CSV</Button>
            </a>
            <a href={exportExpensesCsvUrl(year, month)}>
              <Button variant="secondary" size="sm" icon={<Download size={14} />}>Dépenses CSV</Button>
            </a>
          </>
        }
      />

      {isLoading && <div className="text-stone-400 text-sm">Chargement…</div>}

      {report && (
        <>
          {/* KPI cards */}
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
            <Kpi icon={TrendingUp} label="Revenus payés" value={fmtCAD(report.revenue_paid)} tone="success" />
            <Kpi icon={Wallet} label="Comptes à recevoir" value={fmtCAD(report.accounts_receivable)} tone="info" />
            <Kpi icon={TrendingDown} label="Dépenses" value={fmtCAD(report.expenses_total)} tone="danger" />
            <Kpi
              icon={TrendingUp}
              label="Bénéfice net"
              value={fmtCAD(report.net_profit)}
              tone={report.net_profit >= 0 ? 'paprika' : 'danger'}
            />
          </div>

          {/* Charts */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 mb-6">
            <Card>
              <CardHeader title="Ventes par produit" subtitle="Revenus du mois, ventes non annulées" />
              <CardBody>
                {report.sales_by_product.length === 0
                  ? <EmptyChart message="Aucune vente ce mois." />
                  : (
                    <ResponsiveContainer width="100%" height={240}>
                      <BarChart data={report.sales_by_product}>
                        <XAxis dataKey="product_sku" tick={{ fontSize: 11 }} />
                        <YAxis tick={{ fontSize: 11 }} tickFormatter={v => fmtCAD(v)} width={70} />
                        <Tooltip formatter={(v: number) => fmtCADfull(v)} />
                        <Bar dataKey="revenue" fill="#C5532E" radius={[8, 8, 0, 0]} />
                      </BarChart>
                    </ResponsiveContainer>
                  )}
              </CardBody>
            </Card>

            <Card>
              <CardHeader title="Dépenses par catégorie" subtitle="Répartition du mois" />
              <CardBody>
                {report.expenses_by_category.length === 0
                  ? <EmptyChart message="Aucune dépense ce mois." />
                  : (
                    <ResponsiveContainer width="100%" height={240}>
                      <PieChart>
                        <Pie data={report.expenses_by_category} dataKey="total" nameKey="category"
                          innerRadius={50} outerRadius={90} paddingAngle={2}>
                          {report.expenses_by_category.map((_, i) => (
                            <Cell key={i} fill={PALETTE[i % PALETTE.length]} />
                          ))}
                        </Pie>
                        <Tooltip formatter={(v: number) => fmtCADfull(v)} />
                        <Legend wrapperStyle={{ fontSize: 11 }} />
                      </PieChart>
                    </ResponsiveContainer>
                  )}
              </CardBody>
            </Card>
          </div>

          {/* Margins + Top clients */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 mb-6">
            <Card>
              <CardHeader title="Marge par produit" />
              <CardBody className="p-0">
                {report.margin_by_product.length === 0
                  ? <EmptyState icon="📊" title="Aucune marge à afficher" description="Crée une vente pour voir la marge apparaître ici." />
                  : (
                    <table className="w-full text-sm">
                      <thead className="bg-stone-50 text-[10px] uppercase tracking-wider text-stone-500">
                        <tr>
                          <th className="text-left px-5 py-2.5">Produit</th>
                          <th className="text-right px-5 py-2.5">Revenus</th>
                          <th className="text-right px-5 py-2.5">Coût</th>
                          <th className="text-right px-5 py-2.5">Marge</th>
                          <th className="text-right px-5 py-2.5">%</th>
                        </tr>
                      </thead>
                      <tbody>
                        {report.margin_by_product.map(m => (
                          <tr key={m.product_id} className="border-t border-stone-100">
                            <td className="px-5 py-2.5 font-medium text-stone-900">{m.product_name}</td>
                            <td className="px-5 py-2.5 text-right tabular-nums">{fmtCADfull(m.revenue)}</td>
                            <td className="px-5 py-2.5 text-right tabular-nums text-stone-500">{fmtCADfull(m.cost)}</td>
                            <td className={`px-5 py-2.5 text-right tabular-nums font-semibold ${m.margin >= 0 ? 'text-emerald-700' : 'text-red-700'}`}>
                              {fmtCADfull(m.margin)}
                            </td>
                            <td className={`px-5 py-2.5 text-right tabular-nums ${m.margin >= 0 ? 'text-emerald-700' : 'text-red-700'}`}>
                              {m.margin_pct}%
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  )}
              </CardBody>
            </Card>

            <Card>
              <CardHeader title="Top 5 clients" />
              <CardBody>
                {report.top_clients.length === 0
                  ? <EmptyState icon="👥" title="Pas encore de clients" description="Les meilleurs clients du mois s'afficheront ici." />
                  : (
                    <ol className="space-y-3">
                      {report.top_clients.map((c, i) => (
                        <li key={c.client_id} className="flex items-center gap-3">
                          <span className="w-7 h-7 rounded-full bg-chika-paprika/10 text-chika-paprika text-xs font-bold flex items-center justify-center">
                            {i + 1}
                          </span>
                          <div className="flex-1 min-w-0">
                            <div className="text-sm font-semibold text-stone-900 truncate">{c.client_name}</div>
                            <Badge tone={c.client_type === 'BROKER' ? 'info' : 'paprika'}>
                              {c.client_type === 'BROKER' ? 'Courtier' : 'Magasin'}
                            </Badge>
                          </div>
                          <span className="font-bold text-stone-900 tabular-nums">{fmtCADfull(c.total)}</span>
                        </li>
                      ))}
                    </ol>
                  )}
              </CardBody>
            </Card>
          </div>

          {/* Inventory + low stock */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
            <Card>
              <CardHeader title="Valeur du stock" subtitle="Valeur au coût de production" />
              <CardBody>
                <div className="flex items-end gap-3">
                  <div className="text-4xl font-bold text-chika-paprika tabular-nums">{fmtCADfull(report.inventory_value)}</div>
                  <PackageIcon size={28} className="text-stone-300 mb-1" />
                </div>
              </CardBody>
            </Card>

            <Card className={report.low_stock_alerts.length ? 'ring-amber-300/40 bg-amber-50/30' : ''}>
              <CardHeader
                title="Alertes stock bas"
                subtitle="Produits sous le seuil de 10 boîtes"
                action={report.low_stock_alerts.length > 0
                  ? <Badge tone="warning" icon={<AlertTriangle size={10} />}>{report.low_stock_alerts.length}</Badge>
                  : <Badge tone="success">OK</Badge>}
              />
              <CardBody>
                {report.low_stock_alerts.length === 0
                  ? <p className="text-sm text-stone-500">Tout est en stock 👍</p>
                  : (
                    <ul className="space-y-1.5 text-sm">
                      {report.low_stock_alerts.map(a => (
                        <li key={a.product_id} className="flex items-center justify-between">
                          <span className="font-medium text-amber-900">{a.product_name}</span>
                          <Badge tone="warning">{a.stock_boxes} boîtes</Badge>
                        </li>
                      ))}
                    </ul>
                  )}
              </CardBody>
            </Card>
          </div>
        </>
      )}
    </div>
  )
}

function Kpi({ icon: Icon, label, value, tone }: {
  icon: React.ComponentType<{ size?: number; className?: string }>
  label: string; value: string
  tone: 'success' | 'info' | 'danger' | 'paprika'
}) {
  const iconCls = {
    success: 'bg-emerald-100 text-emerald-700',
    info:    'bg-blue-100 text-blue-700',
    danger:  'bg-red-100 text-red-700',
    paprika: 'bg-chika-paprika/10 text-chika-paprika',
  }[tone]
  return (
    <Card>
      <CardBody>
        <div className="flex items-center justify-between mb-3">
          <span className={`w-9 h-9 rounded-lg flex items-center justify-center ${iconCls}`}>
            <Icon size={18} />
          </span>
          <span className="text-[10px] uppercase tracking-wider text-stone-400 font-semibold">{label}</span>
        </div>
        <div className="text-2xl font-bold text-stone-900 tabular-nums">{value}</div>
      </CardBody>
    </Card>
  )
}

function EmptyChart({ message }: { message: string }) {
  return <div className="h-[240px] flex items-center justify-center text-sm text-stone-400">{message}</div>
}
