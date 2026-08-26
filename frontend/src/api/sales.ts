import { api } from '../lib/axios'

export type SaleStatus = 'PENDING' | 'DELIVERED' | 'PAID' | 'CANCELLED'
export type SaleItemLineType = 'PRODUCT' | 'LOT_ADJUSTMENT' | 'LOSS_ADJUSTMENT'

export interface SaleItem {
  id: number
  product_id: number
  batch_id: number | null
  quantity_boxes: number
  unit_price: number | string
  subtotal: number | string
  line_type: SaleItemLineType
  notes: string | null
  product_name: string | null
  product_sku: string | null
  product_taxable: boolean
}

export interface Sale {
  id: number
  client_id: number
  sale_date: string
  status: SaleStatus
  total_amount: number | string
  currency: string
  payment_date: string | null
  notes: string | null
  created_at: string
  updated_at: string
  items: SaleItem[]
  client_name: string | null
  client_type: string | null
}

export interface SaleItemPayload {
  product_id: number
  quantity_boxes: number
  unit_price: number
  batch_id?: number | null
}

export interface SalePayload {
  client_id: number
  sale_date: string
  items: SaleItemPayload[]
  notes?: string | null
  currency?: string
}

export interface SaleFilter {
  client_id?: number
  status?: SaleStatus
  date_from?: string
  date_to?: string
}

export async function listSales(filter: SaleFilter = {}): Promise<Sale[]> {
  const { data } = await api.get<Sale[]>('/api/sales', { params: filter })
  return data
}

export async function createSale(payload: SalePayload): Promise<Sale> {
  const { data } = await api.post<Sale>('/api/sales', payload)
  return data
}

export async function updateSaleStatus(id: number, status: SaleStatus, payment_date?: string): Promise<Sale> {
  const { data } = await api.patch<Sale>(`/api/sales/${id}/status`, { status, payment_date })
  return data
}

// ── Révisions de facture ──────────────────────────────────────────────
export interface LotPriceRevisionPayload {
  amount_per_lot: number
  reason: string
  lines: { item_id: number; lots: number }[]
}

export interface LossRevisionPayload {
  lines: { item_id: number; boxes_lost: number; reason: string }[]
}

export async function reviseLotPrice(saleId: number, payload: LotPriceRevisionPayload): Promise<Sale> {
  const { data } = await api.post<Sale>(`/api/sales/${saleId}/revise/lot-price`, payload)
  return data
}

export async function reviseLoss(saleId: number, payload: LossRevisionPayload): Promise<Sale> {
  const { data } = await api.post<Sale>(`/api/sales/${saleId}/revise/loss`, payload)
  return data
}
