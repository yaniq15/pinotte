import { useQuery } from '@tanstack/react-query'
import { AlertCircle, CheckCircle2 } from 'lucide-react'
import { getRecurringExpenses } from '../api/pme'
import { PageHeader } from '../components/shared/AppLayout'
import { Card, CardBody, CardHeader } from '../components/ui/Card'
import { EmptyState } from '../components/ui/EmptyState'
import { useT, useLang } from '../lib/i18n'

const fmtCAD = (v: number) =>
  new Intl.NumberFormat('fr-CA', { style: 'currency', currency: 'CAD' }).format(v)

export default function SubscriptionsPage() {
  const t = useT()
  const [lang] = useLang()
  const FREQ_LABEL: Record<string, string> = {
    monthly: t('subscriptions.freq.monthly'),
    quarterly: t('subscriptions.freq.quarterly'),
    yearly: t('subscriptions.freq.yearly'),
  }
  const { data, isLoading } = useQuery({
    queryKey: ['recurring-expenses'],
    queryFn: getRecurringExpenses,
  })

  return (
    <div className="px-4 sm:px-6 lg:px-10 py-6 sm:py-8 max-w-5xl">
      <PageHeader
        title={t('subscriptions.title')}
        description={t('subscriptions.description')}
      />

      {isLoading && <div className="text-stone-400 text-sm">{t('label.loading')}</div>}

      {data && (
        <>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 mb-6">
            <Card>
              <CardBody>
                <div className="text-[10px] uppercase tracking-wider text-stone-400 font-semibold mb-1">{t('subscriptions.kpi.active')}</div>
                <div className="text-2xl font-bold tabular-nums">{data.items.length}</div>
              </CardBody>
            </Card>
            <Card>
              <CardBody>
                <div className="text-[10px] uppercase tracking-wider text-stone-400 font-semibold mb-1">{t('subscriptions.kpi.total_annualized')}</div>
                <div className="text-2xl font-bold tabular-nums text-chika-paprika">{fmtCAD(data.total_annualized)}</div>
              </CardBody>
            </Card>
            <Card className={data.dormant_count > 0 ? 'ring-amber-300 bg-amber-50/30' : ''}>
              <CardBody>
                <div className="text-[10px] uppercase tracking-wider text-stone-400 font-semibold mb-1">{t('subscriptions.kpi.dormant')}</div>
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
                    title={t('subscriptions.empty.title')}
                    description={t('subscriptions.empty.desc')}
                  />
                </CardBody>
              </Card>
            )
            : (
              <Card>
                <CardHeader title={t('subscriptions.list_title')} subtitle={t('subscriptions.list_subtitle')} />
                <CardBody className="p-0 overflow-x-auto">
                  <table className="w-full text-sm">
                    <thead className="bg-stone-50 text-[10px] uppercase tracking-wider text-stone-500">
                      <tr>
                        <th className="text-left px-5 py-2.5">{t('subscriptions.table.vendor')}</th>
                        <th className="text-left px-5 py-2.5">{t('subscriptions.table.description')}</th>
                        <th className="text-left px-3 py-2.5">{t('subscriptions.table.frequency')}</th>
                        <th className="text-right px-3 py-2.5">{t('subscriptions.table.amount')}</th>
                        <th className="text-right px-3 py-2.5">{t('subscriptions.table.annualized')}</th>
                        <th className="text-left px-3 py-2.5">{t('subscriptions.table.last_payment')}</th>
                        <th className="text-center px-3 py-2.5">{t('label.status')}</th>
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
                          <td className="px-3 py-2.5 text-xs text-stone-600">{new Date(s.last_seen).toLocaleDateString(lang === 'en' ? 'en-CA' : 'fr-CA')}</td>
                          <td className="px-3 py-2.5 text-center">
                            {s.is_dormant ? (
                              <span className="inline-flex items-center gap-1 text-amber-700 text-xs font-semibold">
                                <AlertCircle size={12} /> {t('subscriptions.status.dormant')}
                              </span>
                            ) : (
                              <span className="inline-flex items-center gap-1 text-emerald-700 text-xs font-semibold">
                                <CheckCircle2 size={12} /> {t('subscriptions.status.active')}
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
            {t('subscriptions.footer_hint')}
          </p>
        </>
      )}
    </div>
  )
}
