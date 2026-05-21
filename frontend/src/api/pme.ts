/**
 * API client pour les endpoints PME finance avancés.
 */
import { api } from '../lib/axios'

// ── AR Aging ────────────────────────────────────────────────────
export interface ARAgingBucket {
  days_0_30: number
  days_31_60: number
  days_61_90: number
  days_90_plus: number
  total: number
}
export interface ARAgingByClient extends ARAgingBucket {
  client_id: number
  client_name: string
  client_type: string
  invoice_count: number
}
export interface ARAgingReport {
  as_of_date: string
  totals: ARAgingBucket
  by_client: ARAgingByClient[]
  dso_days: number | null
}

export async function getARAging(asOf?: string): Promise<ARAgingReport> {
  const { data } = await api.get<ARAgingReport>('/api/pme/ar-aging', {
    params: asOf ? { as_of: asOf } : {},
  })
  return data
}

// ── Gross Margin Trend ──────────────────────────────────────────
export interface GrossMarginPoint {
  year: number
  month: number
  revenue_paid: number
  cogs: number
  gross_margin: number
  gross_margin_pct: number | null
}

export async function getGrossMarginTrend(months = 6): Promise<GrossMarginPoint[]> {
  const { data } = await api.get<GrossMarginPoint[]>('/api/pme/gross-margin-trend', {
    params: { months },
  })
  return data
}

// ── Cash Runway ─────────────────────────────────────────────────
export interface CashRunwayReport {
  cash_balance: number | null
  cash_balance_date: string | null
  avg_monthly_burn: number | null
  runway_months: number | null
  status: 'healthy' | 'warning' | 'critical' | 'no_data'
}

export async function getCashRunway(): Promise<CashRunwayReport> {
  const { data } = await api.get<CashRunwayReport>('/api/pme/cash-runway')
  return data
}

export interface CashSnapshot {
  id: number
  snapshot_date: string
  balance: number
  notes: string | null
  created_at: string
}

export async function listCashSnapshots(): Promise<CashSnapshot[]> {
  const { data } = await api.get<CashSnapshot[]>('/api/pme/cash-snapshots')
  return data
}

export async function createCashSnapshot(payload: { snapshot_date: string; balance: number; notes?: string }): Promise<CashSnapshot> {
  const { data } = await api.post<CashSnapshot>('/api/pme/cash-snapshots', payload)
  return data
}

// ── Concentration ───────────────────────────────────────────────
export interface ConcentrationRisk {
  entity_id: number
  entity_name: string
  entity_type: 'client' | 'vendor'
  total_amount: number
  pct_of_total: number
  is_risky: boolean
}
export interface ConcentrationReport {
  period_months: number
  top_clients: ConcentrationRisk[]
  top_vendors: ConcentrationRisk[]
}

export async function getConcentration(months = 6): Promise<ConcentrationReport> {
  const { data } = await api.get<ConcentrationReport>('/api/pme/concentration', {
    params: { months },
  })
  return data
}

// ── Recurring expenses ──────────────────────────────────────────
export interface RecurringItem {
  vendor: string | null
  description: string
  amount: number
  frequency: string
  annualized: number
  last_seen: string
  is_dormant: boolean
}
export interface RecurringReport {
  items: RecurringItem[]
  total_annualized: number
  dormant_count: number
}

export async function getRecurringExpenses(): Promise<RecurringReport> {
  const { data } = await api.get<RecurringReport>('/api/pme/recurring-expenses')
  return data
}

// ── Fixed Assets (immobilisations) ──────────────────────────────
export interface FixedAsset {
  id: number
  name: string
  purchase_date: string
  cost: number
  cca_class: string
  cca_rate_pct: number
  accumulated_depreciation: number
  disposal_date: string | null
  notes: string | null
  book_value: number
  annual_depreciation_estimate: number
}

export async function listFixedAssets(): Promise<FixedAsset[]> {
  const { data } = await api.get<FixedAsset[]>('/api/pme/fixed-assets')
  return data
}

export async function createFixedAsset(payload: {
  name: string
  purchase_date: string
  cost: number
  cca_class: string
  cca_rate_pct: number
  notes?: string
}): Promise<FixedAsset> {
  const { data } = await api.post<FixedAsset>('/api/pme/fixed-assets', payload)
  return data
}

export async function deleteFixedAsset(id: number): Promise<void> {
  await api.delete(`/api/pme/fixed-assets/${id}`)
}

// ── Inventory Counts (inventaire physique) ──────────────────────
export interface InventoryCount {
  id: number
  product_id: number
  product_name: string | null
  count_date: string
  physical_qty_boxes: number
  theoretical_qty_boxes: number
  delta_boxes: number
  notes: string | null
  created_at: string
}

export async function listInventoryCounts(): Promise<InventoryCount[]> {
  const { data } = await api.get<InventoryCount[]>('/api/pme/inventory-counts')
  return data
}

export async function createInventoryCount(payload: {
  product_id: number
  count_date: string
  physical_qty_boxes: number
  notes?: string
}): Promise<InventoryCount> {
  const { data } = await api.post<InventoryCount>('/api/pme/inventory-counts', payload)
  return data
}

// ── Alerts ──────────────────────────────────────────────────────
export interface AlertItem {
  severity: 'info' | 'warning' | 'critical'
  category: string
  title: string
  description: string
  action_label: string | null
  action_url: string | null
}
export interface AlertsReport {
  generated_at: string
  alerts: AlertItem[]
}

export async function getAlerts(): Promise<AlertsReport> {
  const { data } = await api.get<AlertsReport>('/api/pme/alerts')
  return data
}
