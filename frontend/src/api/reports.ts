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
  margin_by_product: { product_id: number; product_name: string; revenue: number; cost: number; margin: number; margin_pct: number }[]
  top_clients: { client_id: number; client_name: string; client_type: string; total: number }[]
  inventory_value: number
  low_stock_alerts: { product_id: number; product_name: string; product_sku: string; stock_boxes: number }[]
}

export async function getMonthlyReport(year: number, month: number): Promise<MonthlyReport> {
  const { data } = await api.get<MonthlyReport>('/api/reports/monthly', { params: { year, month } })
  return data
}

export function exportSalesCsvUrl(year?: number, month?: number): string {
  const params = year && month ? `?year=${year}&month=${month}` : ''
  return `/api/reports/exports/sales.csv${params}`
}

export function exportExpensesCsvUrl(year?: number, month?: number): string {
  const params = year && month ? `?year=${year}&month=${month}` : ''
  return `/api/reports/exports/expenses.csv${params}`
}
