import { api } from '../lib/axios'

export interface Batch {
  id: number
  product_id: number
  batch_number: string
  production_date: string
  expiry_date: string | null
  quantity_boxes: number
  total_cost: number | string
  notes: string | null
  created_by: number
  created_at: string
  updated_at: string
  // Server-computed
  unit_cost: number | string | null
  product_name: string | null
  product_sku: string | null
}

export interface BatchPayload {
  product_id: number
  batch_number: string
  production_date: string  // YYYY-MM-DD
  expiry_date?: string | null
  quantity_boxes: number
  total_cost: number
  notes?: string | null
}

export async function listBatches(productId?: number): Promise<Batch[]> {
  const params = productId ? { product_id: productId } : {}
  const { data } = await api.get<Batch[]>('/api/batches', { params })
  return data
}

export async function createBatch(payload: BatchPayload): Promise<Batch> {
  const { data } = await api.post<Batch>('/api/batches', payload)
  return data
}

export async function deleteBatch(id: number): Promise<void> {
  await api.delete(`/api/batches/${id}`)
}
