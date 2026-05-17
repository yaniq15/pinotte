import { api } from '../lib/axios'

export type MovementType = 'PRODUCTION' | 'SALE' | 'LOSS' | 'ADJUSTMENT' | 'RETURN'

export interface Movement {
  id: number
  product_id: number
  batch_id: number | null
  created_by: number
  movement_type: MovementType
  quantity_boxes: number
  reference_type: string | null
  reference_id: number | null
  movement_date: string
  notes: string | null
  created_at: string
  product_name: string | null
  product_sku: string | null
}

export interface MovementFilter {
  product_id?: number
  movement_type?: MovementType
  date_from?: string
  date_to?: string
}

export interface MovementPayload {
  product_id: number
  batch_id?: number | null
  movement_type: 'LOSS' | 'ADJUSTMENT'
  quantity_boxes: number
  movement_date: string
  notes: string
}

export async function listMovements(filter: MovementFilter = {}): Promise<Movement[]> {
  const { data } = await api.get<Movement[]>('/api/movements', { params: filter })
  return data
}

export async function createMovement(payload: MovementPayload): Promise<Movement> {
  const { data } = await api.post<Movement>('/api/movements', payload)
  return data
}
