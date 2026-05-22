import { api } from '../lib/axios'

export interface MonthlyReport {
  year: number
  month: number
  revenue_paid: number
  accounts_receivable: number
  expenses_total: number
  expenses_by_category: { category: string; total: number }[]
  net_profit: number
  sales_by_product: { product_id: number; product_name: string; product_sku: string; boxes_sold: number; revenue: number }[]
  margin_by_product: {
    product_id: number
    product_name: string
    revenue: number
    cost: number
    margin: number
    margin_pct: number
    revenue_paid: number
    margin_paid: number
    margin_paid_pct: number
  }[]
  top_clients: { client_id: number; client_name: string; client_type: string; total: number }[]
  inventory_value: number
  low_stock_alerts: { product_id: number; product_name: string; product_sku: string; stock_boxes: number }[]
  events_revenue: number
  events_cost: number
  events_count: number
  income_statement: {
    revenue: number
    cogs: number
    gross_margin: number
    gross_margin_pct: number | null
    operating_expenses: number
    net_profit: number
    net_profit_pct: number | null
    cogs_typed_expenses_excluded: number
    capex_excluded: number
  }
}

export async function getMonthlyReport(year: number, month: number): Promise<MonthlyReport> {
  const { data } = await api.get<MonthlyReport>('/api/reports/monthly', { params: { year, month } })
  return data
}

/**
 * Download authentifié : on ne peut pas utiliser <a href> car le navigateur
 * n'inclut pas le header Authorization. On fait un fetch avec le token,
 * on récupère un blob, et on déclenche le download programmatiquement.
 */
async function downloadAuthenticated(
  path: string,
  filename: string,
  year?: number,
  month?: number,
  extraParams?: Record<string, string | number>,
): Promise<void> {
  const params: Record<string, string | number> = {
    ...(year && month ? { year, month } : {}),
    ...(extraParams || {}),
  }
  try {
    const response = await api.get(`/api/reports/exports/${path}`, {
      params,
      responseType: 'blob',
    })
    // Si la réponse est un blob d'erreur (JSON), on le lit et on throw
    if (response.data.type === 'application/json') {
      const text = await response.data.text()
      throw new Error(text)
    }
    const cd = response.headers['content-disposition'] as string | undefined
    const match = cd?.match(/filename="?([^"]+)"?/)
    const finalName = match?.[1] || filename

    const blob = new Blob([response.data])
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = finalName
    document.body.appendChild(a)
    a.click()
    document.body.removeChild(a)
    setTimeout(() => URL.revokeObjectURL(url), 1000)
  } catch (err: unknown) {
    // Si axios a une réponse blob d'erreur, on essaie de la lire
    const e = err as { response?: { data?: Blob; status?: number } }
    let detail = 'Téléchargement échoué'
    if (e.response?.data && e.response.data instanceof Blob) {
      try {
        const text = await e.response.data.text()
        const json = JSON.parse(text)
        detail = json.detail || text
      } catch {
        detail = `Erreur ${e.response.status || '?'}`
      }
    } else if (err instanceof Error) {
      detail = err.message
    }
    console.error('[download]', filename, detail)
    alert(`Échec du téléchargement : ${detail}`)
    throw err
  }
}

export const downloadSalesCsv = (year?: number, month?: number) =>
  downloadAuthenticated('sales.csv', 'pinotte_sales.csv', year, month)
export const downloadExpensesCsv = (year?: number, month?: number) =>
  downloadAuthenticated('expenses.csv', 'pinotte_expenses.csv', year, month)
export const downloadEventsCsv = (year?: number, month?: number) =>
  downloadAuthenticated('events.csv', 'pinotte_events.csv', year, month)
export const downloadMaterialPurchasesCsv = (year?: number, month?: number) =>
  downloadAuthenticated('material_purchases.csv', 'pinotte_material_purchases.csv', year, month)
export const downloadAllXlsx = (year?: number, month?: number, lang: 'fr' | 'en' = 'fr') =>
  downloadAuthenticated(
    'all.xlsx',
    `pinotte_export_${year}-${String(month).padStart(2, '0')}_${lang}.xlsx`,
    year, month,
    { lang },
  )

// Anciens noms gardés en alias pour les pages qui ne sont pas encore migrées —
// renverront une URL non auth qui marchera seulement si tu re-vises la même
// origine avec cookies. À remplacer progressivement par les `download*` ci-dessus.
function exportUrl(path: string, year?: number, month?: number): string {
  const params = year && month ? `?year=${year}&month=${month}` : ''
  return `/api/reports/exports/${path}${params}`
}
export const exportSalesCsvUrl = (year?: number, month?: number) => exportUrl('sales.csv', year, month)
export const exportExpensesCsvUrl = (year?: number, month?: number) => exportUrl('expenses.csv', year, month)
export const exportEventsCsvUrl = (year?: number, month?: number) => exportUrl('events.csv', year, month)
export const exportMaterialPurchasesCsvUrl = (year?: number, month?: number) => exportUrl('material_purchases.csv', year, month)
export const exportAllXlsxUrl = (year?: number, month?: number) => exportUrl('all.xlsx', year, month)
