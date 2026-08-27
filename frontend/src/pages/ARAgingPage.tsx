import { useQuery } from '@tanstack/react-query'
import { AlertTriangle, Clock } from 'lucide-react'
import { getARAging } from '../api/pme'
import { PageHeader } from '../components/shared/AppLayout'
import { Card, CardBody, CardHeader } from '../components/ui/Card'
import { Badge } from '../components/ui/Badge'
import { EmptyState } from '../components/ui/EmptyState'
import { useT } from '../lib/i18n'

const fmtCAD = (v: number) =>
  new Intl.NumberFormat('fr-CA', { style: 'currency', currency: 'CAD' }).format(v)

export default function ARAgingPage() {
  const t = useT()
  const { data: aging, isLoading } = useQuery({
    queryKey: ['ar-aging'],
    queryFn: () => getARAging(),
  })

  return (
    <div className="px-4 sm:px-6 lg:px-10 py-6 sm:py-8 max-w-6xl">
      <PageHeader
        title={t('araging.title')}
        description={t('araging.description')}
      />

      {isLoading && <div className="text-stone-400 text-sm">{t('label.loading')}</div>}

      {aging && (
        <>
          {/* KPIs globaux */}
          <div className="grid grid-cols-2 lg:grid-cols-5 gap-3 sm:gap-4 mb-6">
            <Bucket label={t('araging.bucket.total_due')} value={aging.totals.total} tone="paprika" big />
            <Bucket label={t('araging.bucket.d0_30')} value={aging.totals.days_0_30} tone="success" />
            <Bucket label={t('araging.bucket.d31_60')} value={aging.totals.days_31_60} tone="info" />
            <Bucket label={t('araging.bucket.d61_90')} value={aging.totals.days_61_90} tone="warning" />
            <Bucket label={t('araging.bucket.d90_plus')} value={aging.totals.days_90_plus} tone="danger" />
          </div>

          {/* DSO */}
          {aging.dso_days !== null && (
            <Card className="mb-6 ring-blue-200 bg-blue-50/30">
              <CardBody>
                <div className="flex items-center gap-3">
                  <Clock size={20} className="text-blue-700" />
                  <div>
                    <div className="text-xs font-bold uppercase tracking-wider text-blue-900">
                      {t('araging.dso_title')}
                    </div>
                    <div className="text-2xl font-bold tabular-nums text-blue-900">
                      {aging.dso_days} {t('araging.dso_value_suffix')}
                    </div>
                    <div className="text-xs text-blue-700 mt-1">
                      {t('araging.dso_hint')} {aging.dso_days > 45 && t('araging.dso_risk_hint')}
                    </div>
                  </div>
                </div>
              </CardBody>
            </Card>
          )}

          {/* Table détaillée par client */}
          <Card>
            <CardHeader
              title={t('araging.detail_title')}
              subtitle={t('araging.detail_subtitle')}
            />
            <CardBody className="p-0 overflow-x-auto">
              {aging.by_client.length === 0
                ? <EmptyState icon="💰" title={t('araging.empty.title')} description={t('araging.empty.desc')} />
                : (
                  <table className="w-full text-sm min-w-[720px]">
                    <thead className="bg-stone-50 text-[10px] uppercase tracking-wider text-stone-500">
                      <tr>
                        <th className="text-left px-5 py-2.5">{t('araging.table.client')}</th>
                        <th className="text-center px-3 py-2.5">{t('araging.table.invoices')}</th>
                        <th className="text-right px-3 py-2.5">{t('araging.table.d0_30')}</th>
                        <th className="text-right px-3 py-2.5">{t('araging.table.d31_60')}</th>
                        <th className="text-right px-3 py-2.5">{t('araging.table.d61_90')}</th>
                        <th className="text-right px-3 py-2.5 bg-red-50 text-red-700">{t('araging.table.d90_plus')}</th>
                        <th className="text-right px-5 py-2.5 font-bold">{t('araging.table.total_due')}</th>
                      </tr>
                    </thead>
                    <tbody>
                      {aging.by_client.map(c => (
                        <tr key={c.client_id} className="border-t border-stone-200">
                          <td className="px-5 py-2.5">
                            <div className="font-medium text-stone-900">{c.client_name}</div>
                            <Badge tone={c.client_type === 'BROKER' ? 'info' : 'paprika'}>
                              {c.client_type === 'BROKER' ? t('dashboard.client_type.broker') : t('dashboard.client_type.store')}
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
            {t('araging.footer_hint')}
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
