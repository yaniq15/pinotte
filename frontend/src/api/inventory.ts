import { api } from '../lib/axios'

export interface InventoryRow {
  product_id: number
  product_name: string
  product_sku: string
  units_per_box: number
  image_url: string | null
  stock_boxes: number
  stock_units: number
  unit_cost: number | null
  stock_value: number | null
  low_stock: boolean
}

export async function listInventory(): Promise<InventoryRow[]> {
  const { data } = await api.get<InventoryRow[]>('/api/inventory/current')
  return data
}
