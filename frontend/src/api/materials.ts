import { api } from '../lib/axios'

export interface Material {
  id: number
  name: string
  unit: string
  current_stock: number | string
  weighted_avg_price: number | string
  low_stock_threshold: number | string | null
  notes: string | null
  archived: boolean
  created_at: string
  updated_at: string
}

export interface MaterialPayload {
  name: string
  unit: string
  low_stock_threshold?: number | null
  notes?: string | null
  archived?: boolean
}

export interface MaterialPurchase {
  id: number
  material_id: number
  material_name: string | null
  material_unit: string | null
  created_by: number
  quantity: number | string
  total_cost: number | string
  unit_price: number | string
  vendor: string | null
  paid_by: string | null
  purchase_date: string
  receipt_url: string | null
  notes: string | null
  created_at: string
}

export interface PurchasePayload {
  material_id: number
  quantity: number
  total_cost: number
  vendor?: string | null
  paid_by?: string | null
  purchase_date: string
  receipt_url?: string | null
  notes?: string | null
}

export interface MaterialMovement {
  id: number
  material_id: number
  material_name: string | null
  movement_type: string
  quantity: number | string
  batch_id: number | null
  purchase_id: number | null
  movement_date: string
  notes: string | null
  created_at: string
}

export async function listMaterials(includeArchived = false): Promise<Material[]> {
  const { data } = await api.get<Material[]>('/api/materials', { params: { include_archived: includeArchived } })
  return data
}

export async function createMaterial(payload: MaterialPayload): Promise<Material> {
  const { data } = await api.post<Material>('/api/materials', payload)
  return data
}

export async function updateMaterial(id: number, payload: Partial<MaterialPayload>): Promise<Material> {
  const { data } = await api.patch<Material>(`/api/materials/${id}`, payload)
  return data
}

export async function deleteMaterial(id: number): Promise<void> {
  await api.delete(`/api/materials/${id}`)
}

export async function listPurchases(materialId?: number): Promise<MaterialPurchase[]> {
  const { data } = await api.get<MaterialPurchase[]>('/api/materials/purchases', {
    params: materialId ? { material_id: materialId } : {},
  })
  return data
}

export async function createPurchase(payload: PurchasePayload): Promise<MaterialPurchase> {
  const { data } = await api.post<MaterialPurchase>('/api/materials/purchases', payload)
  return data
}

export async function deletePurchase(id: number): Promise<void> {
  await api.delete(`/api/materials/purchases/${id}`)
}

export async function listMovements(materialId?: number): Promise<MaterialMovement[]> {
  const { data } = await api.get<MaterialMovement[]>('/api/materials/movements', {
    params: materialId ? { material_id: materialId } : {},
  })
  return data
}
