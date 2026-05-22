import { useState, useRef, useEffect } from 'react'
import { useQuery } from '@tanstack/react-query'
import { Download, AlertTriangle, AlertOctagon, Info, TrendingUp, TrendingDown, Wallet, Package as PackageIcon, PartyPopper, ChevronDown, ChevronRight, Zap, FileSpreadsheet, FileText } from 'lucide-react'
import {
  BarChart, Bar, PieChart, Pie, Cell, XAxis, YAxis, Tooltip, ResponsiveContainer, Legend,
} from 'recharts'
import { useCurrentUser } from '../hooks/useAuth'
import {
  getMonthlyReport,
  downloadSalesCsv, downloadExpensesCsv, downloadEventsCsv,
  downloadMaterialPurchasesCsv, downloadAllXlsx,
} from '../api/reports'
import {
  getAlerts, getCashRunway, getGrossMarginTrend, getARAging, getConcentration,
} from '../api/pme'
import type { AlertItem } from '../api/pme'
import { useNavigate } from 'react-router-dom'
import { PageHeader } from '../components/shared/AppLayout'
import { Card, CardBody, CardHeader } from '../components/ui/Card'
import { Badge } from '../components/ui/Badge'
import { EmptyState } from '../components/ui/EmptyState'
import { useT, useLang } from '../lib/i18n'

const MONTHS_FR = [
  'janvier', 'février', 'mars', 'avril', 'mai', 'juin',
  'juillet', 'août', 'septembre', 'octobre', 'novembre', 'décembre',
]
const MONTHS_EN = [
  'January', 'February', 'March', 'April', 'May', 'June',
  'July', 'August', 'September', 'October', 'November', 'December',
]
const PALETTE = ['#C5532E', '#E89B27', '#6B7F3A', '#5E7B8B', '#9B3A1A', '#B47A1B', '#4A2218', '#A8927A']

export default function HomePage() {
  const { data: user } = useCurrentUser()
  const t = useT()
  const [lang] = useLang()
  const navigate = useNavigate()
  const now = new Date()
  const [year, setYear] = useState(now.getFullYear())
  const [month, setMonth] = useState(now.getMonth() + 1)

  // PME finance signals (live)
  const alerts = useQuery({ queryKey: ['alerts'], queryFn: getAlerts })
  const runway = useQuery({ queryKey: ['cash-runway'], queryFn: getCashRunway })
  const marginTrend = useQuery({ queryKey: ['gross-margin-trend'], queryFn: () => getGrossMarginTrend(6) })
  const arAging = useQuery({ queryKey: ['ar-aging'], queryFn: () => getARAging() })
  const concentration = useQuery({ queryKey: ['concentration'], queryFn: () => getConcentration(6) })

  const locale = lang === 'fr' ? 'fr-CA' : 'en-CA'
  const months = lang === 'fr' ? MONTHS_FR : MONTHS_EN
  const fmtCAD = (v: number) =>
    new Intl.NumberFormat(locale, { style: 'currency', currency: 'CAD', maximumFractionDigits: 0 }).format(v)
  const fmtCADfull = (v: number) =>
    new Intl.NumberFormat(locale, { style: 'currency', currency: 'CAD' }).format(v)

  const { data: report, isLoading } = useQuery({
    queryKey: ['monthly-report', year, month],
    queryFn: () => getMonthlyReport(year, month),
  })

  return (
    <div className="px-4 sm:px-6 lg:px-10 py-6 sm:py-8 max-w-7xl">
      <PageHeader
        title={`${t('dashboard.greeting')} ${user?.name?.split(' ')[0] || ''}`}
        description={`${t('dashboard.subtitle')} ${months[month - 1]} ${year}.`}
        action={
          <>
            <select value={month} onChange={e => setMonth(Number(e.target.value))}
              className="px-3 py-2 ring-1 ring-stone-300 bg-white rounded-lg text-sm shadow-sm focus:ring-chika-paprika focus:outline-none">
              {months.map((m, i) => <option key={m} value={i + 1}>{m}</option>)}
            </select>
            <select value={year} onChange={e => setYear(Number(e.target.value))}
              className="px-3 py-2 ring-1 ring-stone-300 bg-white rounded-lg text-sm shadow-sm focus:ring-chika-paprika focus:outline-none">
              {[year - 1, year, year + 1].map(y => <option key={y} value={y}>{y}</option>)}
            </select>
            <XlsxExportButton year={year} month={month} lang={lang} />
            <ExportMenu year={year} month={month} lang={lang} />
          </>
        }
      />

      {isLoading && <div className="text-stone-400 text-sm">{t('label.loading')}</div>}

      {/* Alertes proactives — toujours visibles en haut si présentes */}
      {alerts.data && alerts.data.alerts.length > 0 && (
        <Card className="mb-6 overflow-hidden">
          <div className="px-5 py-4 flex items-center gap-2.5 border-b border-stone-200">
            <span className="w-7 h-7 rounded-lg bg-chika-paprika/10 flex items-center justify-center">
              <Zap size={15} className="text-chika-paprika" />
            </span>
            <div>
              <h3 className="text-sm font-semibold text-stone-900">
                {alerts.data.alerts.length} action{alerts.data.alerts.length > 1 ? 's' : ''} à examiner
              </h3>
              <p className="text-xs text-stone-500">
                Signaux automatiques tirés de tes ventes, dépenses, stocks et trésorerie.
              </p>
            </div>
          </div>
          <div>
            {alerts.data.alerts.map((a, i) => (
              <AlertCard key={i} alert={a} onNavigate={(url) => navigate(url)} />
            ))}
          </div>
        </Card>
      )}

      {/* Cash runway + AR aging snapshot (priorité finance PME) */}
      {(runway.data || arAging.data) && (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 mb-6">
          {runway.data && <CashRunwayCard data={runway.data} onClick={() => navigate('/profil')} />}
          {arAging.data && <ARAgingSnapshot data={arAging.data} onClick={() => navigate('/comptes-a-recevoir')} />}
        </div>
      )}

      {report && (
        <>
          {/* KPI cards */}
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
            <Kpi icon={TrendingUp} label={t('dashboard.revenue_paid')} value={fmtCAD(report.revenue_paid)} tone="success" />
            <Kpi icon={Wallet} label={t('dashboard.accounts_receivable')} value={fmtCAD(report.accounts_receivable)} tone="info" />
            <Kpi icon={TrendingDown} label={t('dashboard.expenses')} value={fmtCAD(report.expenses_total)} tone="danger" />
            <Kpi
              icon={TrendingUp}
              label={t('dashboard.net_profit')}
              value={fmtCAD(report.net_profit)}
              tone={report.net_profit >= 0 ? 'paprika' : 'danger'}
            />
          </div>

          {/* État des résultats — le vrai bénéfice net, en cascade */}
          <IncomeStatementCard data={report.income_statement} fmtCAD={fmtCADfull} />

          {/* Bandeau Événements — montre la part incluse dans les KPI globaux */}
          {report.events_count > 0 && (
            <Card className="mb-6 ring-chika-paprika/30 bg-chika-paprika/5">
              <CardHeader
                subtitle={t('dashboard.events_breakdown_sub')}
                action={<Badge tone="paprika" icon={<PartyPopper size={11} />}>{report.events_count}</Badge>}
              >
                <h3 className="text-sm font-semibold text-stone-900 inline-flex items-center gap-2">
                  <PartyPopper size={15} className="text-chika-paprika" />
                  {t('dashboard.events_breakdown')}
                </h3>
              </CardHeader>
              <CardBody>
                <div className="grid grid-cols-3 gap-3 text-sm">
                  <div className="bg-white rounded-lg p-3 ring-1 ring-stone-300">
                    <div className="text-[10px] uppercase font-bold text-stone-500 tracking-wider">{t('dashboard.events_revenue')}</div>
                    <div className="text-lg font-bold tabular-nums mt-1 text-emerald-700">{fmtCAD(report.events_revenue)}</div>
                  </div>
                  <div className="bg-white rounded-lg p-3 ring-1 ring-stone-300">
                    <div className="text-[10px] uppercase font-bold text-stone-500 tracking-wider">{t('dashboard.events_cost')}</div>
                    <div className="text-lg font-bold tabular-nums mt-1 text-red-700">{fmtCAD(report.events_cost)}</div>
                  </div>
                  <div className="bg-white rounded-lg p-3 ring-1 ring-chika-paprika/40">
                    <div className="text-[10px] uppercase font-bold text-stone-500 tracking-wider">{t('dashboard.events_net')}</div>
                    <div className={`text-lg font-bold tabular-nums mt-1 ${(report.events_revenue - report.events_cost) >= 0 ? 'text-chika-paprika' : 'text-red-700'}`}>
                      {fmtCAD(report.events_revenue - report.events_cost)}
                    </div>
                  </div>
                </div>
              </CardBody>
            </Card>
          )}

          {/* Taxes QC à remettre — calcul TPS 5% + TVQ 9.975% sur le HT facturé (Payées + Livrées) */}
          {(() => {
            const TPS_RATE = 0.05
            const TVQ_RATE = 0.09975
            const totalHT = (report.revenue_paid || 0) + (report.accounts_receivable || 0)
            const tps = totalHT * TPS_RATE
            const tvq = totalHT * TVQ_RATE
            const ttc = totalHT + tps + tvq
            return (
              <Card className="mb-6 ring-amber-200 bg-amber-50/30">
                <CardHeader title={t('dashboard.tax_section')}
                  subtitle={`${t('dashboard.tax_sub')} (${fmtCAD(totalHT)})`} />
                <CardBody>
                  <div className="grid grid-cols-2 md:grid-cols-4 gap-3 text-sm">
                    <div className="bg-white rounded-lg p-3 ring-1 ring-stone-300">
                      <div className="text-[10px] uppercase font-bold text-stone-500 tracking-wider">{t('dashboard.tax.ca_ht')}</div>
                      <div className="text-xl font-bold tabular-nums mt-1">{fmtCAD(totalHT)}</div>
                    </div>
                    <div className="bg-white rounded-lg p-3 ring-1 ring-stone-300">
                      <div className="text-[10px] uppercase font-bold text-stone-500 tracking-wider">{t('dashboard.tax.tps')}</div>
                      <div className="text-xl font-bold tabular-nums mt-1 text-amber-700">{fmtCAD(tps)}</div>
                    </div>
                    <div className="bg-white rounded-lg p-3 ring-1 ring-stone-300">
                      <div className="text-[10px] uppercase font-bold text-stone-500 tracking-wider">{t('dashboard.tax.tvq')}</div>
                      <div className="text-xl font-bold tabular-nums mt-1 text-amber-700">{fmtCAD(tvq)}</div>
                    </div>
                    <div className="bg-white rounded-lg p-3 ring-1 ring-chika-paprika/40">
                      <div className="text-[10px] uppercase font-bold text-stone-500 tracking-wider">{t('dashboard.tax.ca_ttc')}</div>
                      <div className="text-xl font-bold tabular-nums mt-1 text-chika-paprika">{fmtCAD(ttc)}</div>
                    </div>
                  </div>
                  <div className="mt-3 text-[11px] text-amber-800 italic">
                    {t('dashboard.tax.hint_prefix')} <strong>{fmtCAD(tps + tvq)}</strong> {t('dashboard.tax.hint_suffix')}
                  </div>
                </CardBody>
              </Card>
            )
          })()}

          {/* Margins — remonté en premier (vue produit prioritaire) */}
          <Card className="mb-6">
            <CardHeader
              title={t('dashboard.margin_by_product')}
              subtitle={t('dashboard.margin_subtitle')}
            />
            <CardBody className="p-0 overflow-x-auto">
              {report.margin_by_product.length === 0
                ? <EmptyState icon="📊" title={t('dashboard.margin.empty_title')} description={t('dashboard.margin.empty_desc')} />
                : (
                  <table className="w-full text-sm min-w-[720px]">
                    <thead className="bg-stone-50 text-[10px] uppercase tracking-wider text-stone-500">
                      <tr>
                        <th className="text-left px-5 py-2.5">{t('dashboard.margin.product')}</th>
                        <th className="text-right px-5 py-2.5">{t('dashboard.margin.revenue')}</th>
                        <th className="text-right px-5 py-2.5">{t('dashboard.margin.cost')}</th>
                        <th className="text-right px-5 py-2.5">{t('dashboard.margin.margin')}</th>
                        <th className="text-right px-5 py-2.5">%</th>
                        <th className="text-right px-5 py-2.5 bg-emerald-50/60 text-emerald-700">{t('dashboard.margin.paid_revenue')}</th>
                        <th className="text-right px-5 py-2.5 bg-emerald-50/60 text-emerald-700">{t('dashboard.margin.paid_margin')}</th>
                      </tr>
                    </thead>
                    <tbody>
                      {report.margin_by_product.map(m => (
                        <tr key={m.product_id} className="border-t border-stone-200">
                          <td className="px-5 py-2.5 font-medium text-stone-900">{m.product_name}</td>
                          <td className="px-5 py-2.5 text-right tabular-nums">{fmtCADfull(m.revenue)}</td>
                          <td className="px-5 py-2.5 text-right tabular-nums text-stone-500">{fmtCADfull(m.cost)}</td>
                          <td className={`px-5 py-2.5 text-right tabular-nums font-semibold ${m.margin >= 0 ? 'text-emerald-700' : 'text-red-700'}`}>
                            {fmtCADfull(m.margin)}
                          </td>
                          <td className={`px-5 py-2.5 text-right tabular-nums ${m.margin >= 0 ? 'text-emerald-700' : 'text-red-700'}`}>
                            {m.margin_pct}%
                          </td>
                          <td className="px-5 py-2.5 text-right tabular-nums bg-emerald-50/40 text-stone-800">
                            {fmtCADfull(m.revenue_paid)}
                          </td>
                          <td className={`px-5 py-2.5 text-right tabular-nums bg-emerald-50/40 font-semibold ${m.margin_paid >= 0 ? 'text-emerald-700' : 'text-red-700'}`}>
                            {fmtCADfull(m.margin_paid)}
                            <span className="ml-1 text-[10px] font-normal text-stone-500">({m.margin_paid_pct}%)</span>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                )}
            </CardBody>
          </Card>

          {/* Charts */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 mb-6">
            <Card>
              <CardHeader title={t('dashboard.sales_by_product')} subtitle={t('dashboard.sales_by_product_sub')} />
              <CardBody>
                {report.sales_by_product.length === 0
                  ? <EmptyChart message={t('dashboard.empty_sales')} />
                  : (
                    <ResponsiveContainer width="100%" height={240}>
                      <BarChart data={report.sales_by_product}>
                        <XAxis dataKey="product_sku" tick={{ fontSize: 11 }} />
                        <YAxis tick={{ fontSize: 11 }} tickFormatter={v => fmtCAD(v)} width={70} />
                        <Tooltip formatter={(v) => fmtCADfull(Number(v))} />
                        <Bar dataKey="revenue" fill="#C5532E" radius={[8, 8, 0, 0]} />
                      </BarChart>
                    </ResponsiveContainer>
                  )}
              </CardBody>
            </Card>

            <Card>
              <CardHeader title={t('dashboard.expenses_by_category')} subtitle={t('dashboard.expenses_by_category_sub')} />
              <CardBody>
                {report.expenses_by_category.length === 0
                  ? <EmptyChart message={t('dashboard.empty_expenses')} />
                  : (
                    <ResponsiveContainer width="100%" height={240}>
                      <PieChart>
                        <Pie data={report.expenses_by_category} dataKey="total" nameKey="category"
                          innerRadius={50} outerRadius={90} paddingAngle={2}>
                          {report.expenses_by_category.map((_, i) => (
                            <Cell key={i} fill={PALETTE[i % PALETTE.length]} />
                          ))}
                        </Pie>
                        <Tooltip formatter={(v) => fmtCADfull(Number(v))} />
                        <Legend wrapperStyle={{ fontSize: 11 }} />
                      </PieChart>
                    </ResponsiveContainer>
                  )}
              </CardBody>
            </Card>
          </div>

          {/* Marge brute tendance + concentration */}
          {(marginTrend.data || concentration.data) && (
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 mb-6">
              {marginTrend.data && <GrossMarginTrendCard points={marginTrend.data} />}
              {concentration.data && <ConcentrationCard data={concentration.data} />}
            </div>
          )}

          {/* Top clients */}
          <div className="grid grid-cols-1 mb-6">
            <Card>
              <CardHeader title={t('dashboard.top_clients')} />
              <CardBody>
                {report.top_clients.length === 0
                  ? <EmptyState icon="👥" title={t('dashboard.top_clients.empty_title')} description={t('dashboard.top_clients.empty_desc')} />
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
                              {c.client_type === 'BROKER' ? t('dashboard.client_type.broker') : t('dashboard.client_type.store')}
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
              <CardHeader title={t('dashboard.stock_value')} subtitle={t('dashboard.stock_value_sub')} />
              <CardBody>
                <div className="flex items-end gap-3">
                  <div className="text-4xl font-bold text-chika-paprika tabular-nums">{fmtCADfull(report.inventory_value)}</div>
                  <PackageIcon size={28} className="text-stone-300 mb-1" />
                </div>
              </CardBody>
            </Card>

            <Card className={report.low_stock_alerts.length ? 'ring-amber-300/40 bg-amber-50/30' : ''}>
              <CardHeader
                title={t('dashboard.low_stock_alerts')}
                subtitle={t('dashboard.low_stock_sub')}
                action={report.low_stock_alerts.length > 0
                  ? <Badge tone="warning" icon={<AlertTriangle size={10} />}>{report.low_stock_alerts.length}</Badge>
                  : <Badge tone="success">OK</Badge>}
              />
              <CardBody>
                {report.low_stock_alerts.length === 0
                  ? <p className="text-sm text-stone-500">{t('dashboard.low_stock_ok')}</p>
                  : (
                    <ul className="space-y-1.5 text-sm">
                      {report.low_stock_alerts.map(a => (
                        <li key={a.product_id} className="flex items-center justify-between">
                          <span className="font-medium text-amber-900">{a.product_name}</span>
                          <Badge tone="warning">{a.stock_boxes} {t('dashboard.low_stock_boxes')}</Badge>
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

// État des résultats en cascade — montre comment on passe des revenus au
// vrai bénéfice net (revenus − COGS − frais d'exploitation).
function IncomeStatementCard({ data, fmtCAD }: {
  data: {
    revenue: number; cogs: number; gross_margin: number; gross_margin_pct: number | null
    operating_expenses: number; net_profit: number; net_profit_pct: number | null
    cogs_typed_expenses_excluded: number; capex_excluded: number
  }
  fmtCAD: (v: number) => string
}) {
  const profitPositive = data.net_profit >= 0
  return (
    <Card className="mb-6">
      <CardHeader
        title="État des résultats"
        subtitle="Le vrai bénéfice net : revenus − coût de production − frais d'exploitation"
      />
      <CardBody className="p-0">
        <table className="w-full text-sm">
          <tbody>
            <ISRow label="Revenus (ventes payées + événements)" value={fmtCAD(data.revenue)} />
            <ISRow label="− Coût de production des ventes (COGS)"
              value={`−${fmtCAD(data.cogs)}`} tone="muted" />
            <ISRow label="= Marge brute"
              value={fmtCAD(data.gross_margin)}
              hint={data.gross_margin_pct !== null ? `${data.gross_margin_pct}%` : undefined}
              bold separatorTop />
            <ISRow label="− Frais d'exploitation (loyer, transport, marketing…)"
              value={`−${fmtCAD(data.operating_expenses)}`} tone="muted" />
            <ISRow
              label="= BÉNÉFICE NET"
              value={fmtCAD(data.net_profit)}
              hint={data.net_profit_pct !== null ? `${data.net_profit_pct}%` : undefined}
              bold big separatorTop
              tone={profitPositive ? 'positive' : 'negative'}
            />
          </tbody>
        </table>
        {(data.cogs_typed_expenses_excluded > 0 || data.capex_excluded > 0) && (
          <div className="px-5 py-3 border-t border-stone-200 text-[11px] text-stone-500 space-y-0.5">
            {data.cogs_typed_expenses_excluded > 0 && (
              <div>ℹ️ {fmtCAD(data.cogs_typed_expenses_excluded)} de dépenses classées « COGS » exclues des frais d'exploitation (déjà comptées dans le coût de production via les recettes — pas de double comptage).</div>
            )}
            {data.capex_excluded > 0 && (
              <div>ℹ️ {fmtCAD(data.capex_excluded)} d'immobilisations (CAPEX) exclues du résultat — elles sont amorties sur plusieurs années (voir page Immobilisations).</div>
            )}
          </div>
        )}
        <div className="px-5 py-3 border-t border-stone-200 text-[11px] text-stone-500">
          💡 Le COGS vient du coût unitaire de tes recettes (Calculateur). Si un produit n'a pas de recette chiffrée, son coût compte 0 — pense à le renseigner pour un bénéfice exact.
        </div>
      </CardBody>
    </Card>
  )
}

function ISRow({ label, value, hint, bold, big, separatorTop, tone }: {
  label: string
  value: string
  hint?: string
  bold?: boolean
  big?: boolean
  separatorTop?: boolean
  tone?: 'muted' | 'positive' | 'negative'
}) {
  const valueColor = tone === 'positive' ? 'text-emerald-700'
    : tone === 'negative' ? 'text-red-700'
    : tone === 'muted' ? 'text-stone-500'
    : 'text-stone-900'
  return (
    <tr className={separatorTop ? 'border-t-2 border-stone-300' : 'border-t border-stone-100'}>
      <td className={`px-5 py-2.5 ${bold ? 'font-bold' : ''} ${big ? 'text-base' : ''} text-stone-700`}>
        {label}
      </td>
      <td className={`px-5 py-2.5 text-right tabular-nums ${bold ? 'font-bold' : 'font-medium'} ${big ? 'text-lg' : ''} ${valueColor}`}>
        {value}
        {hint && <span className="ml-2 text-[11px] font-normal text-stone-400">{hint}</span>}
      </td>
    </tr>
  )
}

// Split-button "Excel comptable" : clic principal → utilise la langue de l'app,
// clic sur le caret → menu pour forcer FR ou EN (utile pour envoyer à un
// comptable anglophone même si l'app est en FR).
function XlsxExportButton({ year, month, lang }: { year: number; month: number; lang: 'fr' | 'en' }) {
  const [open, setOpen] = useState(false)
  const ref = useRef<HTMLDivElement>(null)
  const [loading, setLoading] = useState(false)

  useEffect(() => {
    function onClick(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false)
    }
    document.addEventListener('mousedown', onClick)
    return () => document.removeEventListener('mousedown', onClick)
  }, [])

  async function run(targetLang: 'fr' | 'en') {
    setLoading(true)
    try {
      await downloadAllXlsx(year, month, targetLang)
    } finally {
      setLoading(false)
      setOpen(false)
    }
  }

  return (
    <div ref={ref} className="relative inline-flex items-stretch">
      {/* Bouton principal — langue actuelle */}
      <button
        type="button"
        onClick={() => run(lang)}
        disabled={loading}
        className="inline-flex items-center gap-1.5 px-3 py-2 bg-chika-paprika hover:bg-chika-paprikaDeep disabled:opacity-50 text-white text-sm font-semibold rounded-l-lg shadow-sm"
      >
        <FileSpreadsheet size={14} />
        {loading ? '…' : (lang === 'fr' ? 'Excel comptable' : 'Accountant Excel')}
      </button>
      {/* Caret — choix explicite langue */}
      <button
        type="button"
        onClick={() => setOpen(o => !o)}
        disabled={loading}
        className="px-2 py-2 bg-chika-paprikaDeep hover:bg-chika-paprika/90 text-white rounded-r-lg shadow-sm border-l border-white/20"
        title={lang === 'fr' ? 'Choisir la langue' : 'Choose language'}
      >
        <ChevronDown size={14} className={`transition ${open ? 'rotate-180' : ''}`} />
      </button>
      {open && (
        <div className="absolute z-30 right-0 top-full mt-1.5 bg-white rounded-lg ring-1 ring-stone-300 shadow-lg overflow-hidden min-w-[12rem]">
          <button type="button" onClick={() => run('fr')}
            className="w-full text-left flex items-center gap-2 px-3 py-2 text-sm text-stone-700 hover:bg-stone-50 hover:text-chika-paprika">
            🇫🇷 Français
          </button>
          <button type="button" onClick={() => run('en')}
            className="w-full text-left flex items-center gap-2 px-3 py-2 text-sm text-stone-700 hover:bg-stone-50 hover:text-chika-paprika border-t border-stone-200">
            🇬🇧 English
          </button>
        </div>
      )}
    </div>
  )
}

// ────────────── PME FINANCE — sub-components ──────────────

function AlertCard({ alert, onNavigate }: { alert: AlertItem; onNavigate: (url: string) => void }) {
  // Style épuré : fond blanc, fine barre d'accent à gauche, badge d'icône coloré.
  // La couleur ne déborde pas — elle reste sur l'accent + le badge.
  const cfg = {
    critical: {
      accent: 'border-l-red-500',
      badge: 'bg-red-50 text-red-600',
      Icon: AlertOctagon,
    },
    warning: {
      accent: 'border-l-amber-400',
      badge: 'bg-amber-50 text-amber-600',
      Icon: AlertTriangle,
    },
    info: {
      accent: 'border-l-blue-400',
      badge: 'bg-blue-50 text-blue-600',
      Icon: Info,
    },
  }[alert.severity]
  const { Icon } = cfg

  return (
    <div className={`flex items-start gap-3 px-5 py-3.5 border-l-[3px] ${cfg.accent} border-b border-stone-100 last:border-b-0 hover:bg-stone-50/60 transition`}>
      <span className={`shrink-0 w-8 h-8 rounded-lg flex items-center justify-center ${cfg.badge}`}>
        <Icon size={16} />
      </span>
      <div className="flex-1 min-w-0">
        <div className="font-semibold text-sm text-stone-900">{alert.title}</div>
        <div className="text-xs text-stone-500 mt-0.5 leading-relaxed">{alert.description}</div>
      </div>
      {alert.action_url && alert.action_label && (
        <button
          onClick={() => onNavigate(alert.action_url!)}
          className="shrink-0 inline-flex items-center gap-0.5 text-xs font-semibold text-chika-paprika hover:text-chika-paprikaDeep mt-0.5"
        >
          {alert.action_label}
          <ChevronRight size={13} />
        </button>
      )}
    </div>
  )
}

function CashRunwayCard({ data, onClick }: {
  data: { cash_balance: number | null; cash_balance_date: string | null; avg_monthly_burn: number | null; runway_months: number | null; status: string }
  onClick: () => void
}) {
  const fmtCAD = (v: number | null) => v != null ? new Intl.NumberFormat('fr-CA', { style: 'currency', currency: 'CAD' }).format(v) : '—'
  if (data.status === 'no_data') {
    return (
      <Card className="bg-stone-50/50">
        <CardHeader title="💰 Cash Runway" subtitle="Pas encore de solde bancaire saisi" />
        <CardBody>
          <button onClick={onClick} className="text-sm text-chika-paprika font-semibold hover:underline">
            Saisir le solde bancaire dans Profil →
          </button>
        </CardBody>
      </Card>
    )
  }
  const toneRing = {
    critical: 'ring-red-300/60 bg-red-50/30',
    warning: 'ring-amber-300/60 bg-amber-50/30',
    healthy: 'ring-emerald-300/40',
  }[data.status as 'critical' | 'warning' | 'healthy'] || ''
  const toneText = {
    critical: 'text-red-700',
    warning: 'text-amber-700',
    healthy: 'text-emerald-700',
  }[data.status as 'critical' | 'warning' | 'healthy'] || 'text-stone-700'
  return (
    <Card className={toneRing}>
      <CardHeader title="💰 Cash Runway"
        subtitle={data.cash_balance_date ? `Solde au ${new Date(data.cash_balance_date).toLocaleDateString('fr-CA')}` : ''} />
      <CardBody>
        <div className="grid grid-cols-2 gap-4">
          <div>
            <div className="text-[10px] uppercase tracking-wider text-stone-400 font-semibold">Solde actuel</div>
            <div className="text-2xl font-bold tabular-nums text-stone-900">{fmtCAD(data.cash_balance)}</div>
          </div>
          <div>
            <div className="text-[10px] uppercase tracking-wider text-stone-400 font-semibold">Runway</div>
            <div className={`text-2xl font-bold tabular-nums ${toneText}`}>
              {data.runway_months !== null && data.runway_months >= 999 ? '∞' : `${data.runway_months?.toFixed(1)} mois`}
            </div>
          </div>
        </div>
        {data.avg_monthly_burn !== null && Number(data.avg_monthly_burn) > 0 && (
          <div className="text-xs text-stone-500 mt-3">
            Burn mensuel moyen (3 mois) : <strong>{fmtCAD(Number(data.avg_monthly_burn))}</strong>
          </div>
        )}
      </CardBody>
    </Card>
  )
}

function ARAgingSnapshot({ data, onClick }: {
  data: { totals: { days_0_30: number; days_31_60: number; days_61_90: number; days_90_plus: number; total: number }; dso_days: number | null }
  onClick: () => void
}) {
  const fmtCAD = (v: number) => new Intl.NumberFormat('fr-CA', { style: 'currency', currency: 'CAD' }).format(v)
  return (
    <Card className={data.totals.days_90_plus > 0 ? 'ring-red-300/40 bg-red-50/20' : ''}>
      <CardHeader title="📋 Comptes à recevoir"
        subtitle="Cliquer pour le détail"
        action={<button onClick={onClick} className="text-xs text-chika-paprika font-semibold hover:underline">Voir →</button>}
      />
      <CardBody>
        <div className="text-2xl font-bold text-chika-paprika tabular-nums mb-3">{fmtCAD(data.totals.total)}</div>
        <div className="grid grid-cols-4 gap-2 text-center text-xs">
          <Bucket label="0-30 j" v={data.totals.days_0_30} tone="emerald" />
          <Bucket label="31-60 j" v={data.totals.days_31_60} tone="blue" />
          <Bucket label="61-90 j" v={data.totals.days_61_90} tone="amber" />
          <Bucket label="90+ j" v={data.totals.days_90_plus} tone="red" />
        </div>
        {data.dso_days !== null && (
          <div className="text-xs text-stone-500 mt-3">
            DSO : <strong>{data.dso_days} jours</strong> {data.dso_days > 45 && <span className="text-red-700">⚠</span>}
          </div>
        )}
      </CardBody>
    </Card>
  )
}

function Bucket({ label, v, tone }: { label: string; v: number; tone: 'emerald'|'blue'|'amber'|'red' }) {
  const fmt = (n: number) => n > 0 ? `${(n / 1000).toFixed(1)}k` : '—'
  const color = { emerald: 'text-emerald-700', blue: 'text-blue-700', amber: 'text-amber-700', red: 'text-red-700' }[tone]
  return (
    <div className="bg-white/60 rounded p-2">
      <div className="text-[9px] uppercase text-stone-400 font-semibold">{label}</div>
      <div className={`font-bold tabular-nums ${v > 0 ? color : 'text-stone-300'}`}>{fmt(v)}$</div>
    </div>
  )
}

function GrossMarginTrendCard({ points }: { points: { year: number; month: number; gross_margin_pct: number | null }[] }) {
  const valid = points.filter(p => p.gross_margin_pct !== null)
  const max = Math.max(...valid.map(p => p.gross_margin_pct as number), 1)
  const min = Math.min(...valid.map(p => p.gross_margin_pct as number), 0)
  const range = max - min || 1
  const last = valid[valid.length - 1]?.gross_margin_pct
  const prev = valid.slice(0, -1)
  const avgPrev = prev.length > 0 ? prev.reduce((s, p) => s + (p.gross_margin_pct as number), 0) / prev.length : null
  const diff = last !== null && avgPrev !== null ? last - avgPrev : null
  return (
    <Card>
      <CardHeader title="📈 Marge brute — 6 mois"
        subtitle={diff !== null && diff < -5 ? `⚠ En chute de ${Math.abs(diff).toFixed(1)} pts vs moyenne` : 'Tendance sur 6 derniers mois'} />
      <CardBody>
        <div className="flex items-end gap-1.5 h-20 mb-2">
          {points.map((p, i) => {
            const h = p.gross_margin_pct !== null
              ? Math.max(8, ((p.gross_margin_pct - min) / range) * 80)
              : 4
            return (
              <div key={i} className="flex-1 flex flex-col items-center justify-end gap-1">
                <div className="text-[9px] text-stone-500 tabular-nums">
                  {p.gross_margin_pct !== null ? `${p.gross_margin_pct.toFixed(0)}%` : '—'}
                </div>
                <div className={`w-full rounded-t-md ${
                  i === points.length - 1 ? 'bg-chika-paprika' : 'bg-chika-paprika/30'
                }`} style={{ height: `${h}%` }} />
              </div>
            )
          })}
        </div>
        <div className="flex justify-between text-[10px] text-stone-400 font-semibold">
          {points.map((p, i) => (
            <span key={i}>{String(p.month).padStart(2, '0')}/{String(p.year).slice(2)}</span>
          ))}
        </div>
      </CardBody>
    </Card>
  )
}

function ConcentrationCard({ data }: { data: { top_clients: { entity_name: string; pct_of_total: number; is_risky: boolean }[]; top_vendors: { entity_name: string; pct_of_total: number; is_risky: boolean }[] } }) {
  return (
    <Card>
      <CardHeader title="🎯 Concentration (6 mois)"
        subtitle="Si > 30% sur 1 client/fournisseur = risque" />
      <CardBody>
        <div>
          <div className="text-[10px] uppercase tracking-wider text-stone-400 font-bold mb-2">Top clients</div>
          {data.top_clients.slice(0, 3).map((c, i) => (
            <div key={i} className="flex items-center justify-between text-xs py-1">
              <span className="truncate flex-1 text-stone-700">{c.entity_name}</span>
              <span className={`font-bold tabular-nums ml-2 ${c.is_risky ? 'text-red-700' : 'text-stone-700'}`}>
                {c.pct_of_total}% {c.is_risky && '⚠'}
              </span>
            </div>
          ))}
        </div>
        <div className="mt-3 pt-3 border-t border-stone-200">
          <div className="text-[10px] uppercase tracking-wider text-stone-400 font-bold mb-2">Top fournisseurs</div>
          {data.top_vendors.slice(0, 3).map((v, i) => (
            <div key={i} className="flex items-center justify-between text-xs py-1">
              <span className="truncate flex-1 text-stone-700">{v.entity_name}</span>
              <span className={`font-bold tabular-nums ml-2 ${v.is_risky ? 'text-red-700' : 'text-stone-700'}`}>
                {v.pct_of_total}% {v.is_risky && '⚠'}
              </span>
            </div>
          ))}
        </div>
      </CardBody>
    </Card>
  )
}

function ExportMenu({ year, month, lang }: { year: number; month: number; lang: 'fr' | 'en' }) {
  const [open, setOpen] = useState(false)
  const ref = useRef<HTMLDivElement>(null)
  useEffect(() => {
    function onClick(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false)
    }
    document.addEventListener('mousedown', onClick)
    return () => document.removeEventListener('mousedown', onClick)
  }, [])
  const items: { run: () => void; label: string }[] = [
    { run: () => downloadSalesCsv(year, month), label: lang === 'fr' ? 'Ventes (avec taxes)' : 'Sales (with taxes)' },
    { run: () => downloadExpensesCsv(year, month), label: lang === 'fr' ? 'Dépenses (avec taxes)' : 'Expenses (with taxes)' },
    { run: () => downloadEventsCsv(year, month), label: lang === 'fr' ? 'Événements' : 'Events' },
    { run: () => downloadMaterialPurchasesCsv(year, month), label: lang === 'fr' ? 'Achats matières' : 'Material purchases' },
  ]
  return (
    <div className="relative" ref={ref}>
      <button
        type="button"
        onClick={() => setOpen(o => !o)}
        className="inline-flex items-center gap-1.5 px-3 py-2 ring-1 ring-stone-300 bg-white text-stone-700 hover:bg-stone-50 rounded-lg text-sm shadow-sm"
      >
        <FileText size={14} />
        {lang === 'fr' ? 'CSV séparés' : 'Separate CSV'}
        <ChevronDown size={14} className={`transition ${open ? 'rotate-180' : ''}`} />
      </button>
      {open && (
        <div className="absolute right-0 top-full mt-1 bg-white rounded-lg ring-1 ring-stone-300 shadow-lg overflow-hidden z-20 min-w-[14rem]">
          {items.map(it => (
            <button
              key={it.label}
              type="button"
              onClick={() => { it.run(); setOpen(false) }}
              className="w-full text-left flex items-center gap-2 px-3 py-2 text-sm text-stone-700 hover:bg-stone-50 hover:text-chika-paprika"
            >
              <Download size={13} />
              {it.label}
            </button>
          ))}
        </div>
      )}
    </div>
  )
}
