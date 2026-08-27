import { useQuery } from '@tanstack/react-query'
import { AlertTriangle } from 'lucide-react'
import { listInventory } from '../api/inventory'
import { PageHeader } from '../components/shared/AppLayout'
import { useT } from '../lib/i18n'

const fmtCAD = (v: number | null) => {
  if (v === null) return '—'
  return new Intl.NumberFormat('fr-CA', { style: 'currency', currency: 'CAD' }).format(v)
}

export default function InventoryPage() {
  const t = useT()
  const { data: rows = [], isLoading } = useQuery({ queryKey: ['inventory'], queryFn: listInventory })

  const totalBoxes = rows.reduce((s, r) => s + r.stock_boxes, 0)
  const totalValue = rows.reduce((s, r) => s + (r.stock_value ?? 0), 0)
  const lowStockCount = rows.filter(r => r.low_stock).length

  return (
    <div className="px-4 sm:px-6 lg:px-10 py-6 sm:py-8 max-w-6xl">
      <PageHeader title={t('inventory.title')} description={t('inventory.description')} />

      {/* KPI strip */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-6">
        <div className="bg-white border border-stone-200 rounded-2xl p-5">
          <div className="text-[11px] uppercase tracking-wider text-stone-500 font-semibold mb-1">{t('inventory.kpi.boxes_in_stock')}</div>
          <div className="text-3xl font-bold text-stone-900 tabular-nums">{totalBoxes}</div>
        </div>
        <div className="bg-white border border-stone-200 rounded-2xl p-5">
          <div className="text-[11px] uppercase tracking-wider text-stone-500 font-semibold mb-1">{t('inventory.kpi.stock_value')}</div>
          <div className="text-3xl font-bold text-chika-paprika tabular-nums">{fmtCAD(totalValue)}</div>
        </div>
        <div className={`border rounded-2xl p-5 ${lowStockCount > 0 ? 'bg-amber-50 border-amber-200' : 'bg-white border-stone-200'}`}>
          <div className={`text-[11px] uppercase tracking-wider font-semibold mb-1 ${lowStockCount > 0 ? 'text-amber-700' : 'text-stone-500'}`}>
            {t('inventory.kpi.low_stock_alerts')}
          </div>
          <div className={`text-3xl font-bold tabular-nums ${lowStockCount > 0 ? 'text-amber-700' : 'text-stone-900'}`}>
            {lowStockCount}
          </div>
        </div>
      </div>

      {isLoading && <div className="text-stone-400 text-sm">{t('label.loading')}</div>}

      <div className="bg-white rounded-2xl border border-stone-200 overflow-x-auto">
        <table className="w-full text-sm">
          <thead className="bg-stone-50 text-[11px] uppercase tracking-wider text-stone-500">
            <tr>
              <th className="text-left px-4 py-3">{t('inventory.table.product')}</th>
              <th className="text-left px-4 py-3 hidden sm:table-cell">SKU</th>
              <th className="text-right px-4 py-3">{t('inventory.table.boxes')}</th>
              <th className="text-right px-4 py-3 hidden md:table-cell">{t('inventory.table.units')}</th>
              <th className="text-right px-4 py-3 hidden md:table-cell">{t('inventory.table.cost_per_unit')}</th>
              <th className="text-right px-4 py-3">{t('inventory.table.stock_value')}</th>
              <th className="text-center px-4 py-3">{t('inventory.table.state')}</th>
            </tr>
          </thead>
          <tbody>
            {rows.map(r => (
              <tr key={r.product_id} className={`border-t border-stone-200 ${r.low_stock ? 'bg-amber-50/50' : ''}`}>
                <td className="px-4 py-3 flex items-center gap-3">
                  {r.image_url && (
                    <img src={r.image_url} alt={r.product_name}
                         className="w-10 h-10 object-contain rounded bg-stone-50 border border-stone-200 shrink-0" />
                  )}
                  <span className="font-semibold text-stone-900">{r.product_name}</span>
                </td>
                <td className="px-4 py-3 font-mono text-xs text-stone-500 hidden sm:table-cell">{r.product_sku}</td>
                <td className="px-4 py-3 text-right tabular-nums font-bold text-lg">{r.stock_boxes}</td>
                <td className="px-4 py-3 text-right tabular-nums text-stone-600 hidden md:table-cell">{r.stock_units}</td>
                <td className="px-4 py-3 text-right tabular-nums text-stone-600 hidden md:table-cell">{fmtCAD(r.unit_cost)}</td>
                <td className="px-4 py-3 text-right tabular-nums text-chika-paprika font-semibold">{fmtCAD(r.stock_value)}</td>
                <td className="px-4 py-3 text-center">
                  {r.low_stock
                    ? <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider bg-amber-100 text-amber-800">
                        <AlertTriangle size={10} /> {t('inventory.state.low')}
                      </span>
                    : <span className="inline-block px-2 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider bg-emerald-50 text-emerald-700">{t('inventory.state.ok')}</span>
                  }
                </td>
              </tr>
            ))}
            {!isLoading && rows.length === 0 && (
              <tr><td colSpan={7} className="px-4 py-8 text-center text-stone-400">{t('inventory.empty')}</td></tr>
            )}
          </tbody>
        </table>
        <div className="bg-stone-50 px-4 py-2 text-[11px] text-stone-500 border-t border-stone-200">
          {t('inventory.footer_hint')}
        </div>
      </div>
    </div>
  )
}
