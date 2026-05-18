import { api } from '../lib/axios'

export interface Product {
  id: number
  name: string
  sku: string
  units_per_box: number
  unit_cost: number | string | null
  consumer_price: number | string | null
  store_margin_pct: number | string | null
  price_broker: number | string | null
  price_direct: number | string | null
  currency: string
  active: boolean
  image_url: string | null
  taxable: boolean
  created_at: string
  updated_at: string
}

export interface ProductPayload {
  name: string
  sku: string
  units_per_box: number
  unit_cost?: number | null
  consumer_price?: number | null
  store_margin_pct?: number | null
  price_broker?: number | null
  price_direct?: number | null
  currency?: string
  active?: boolean
  image_url?: string | null
  taxable?: boolean
}

export async function listProducts(): Promise<Product[]> {
  const { data } = await api.get<Product[]>('/api/products')
  return data
}

export async function createProduct(payload: ProductPayload): Promise<Product> {
  const { data } = await api.post<Product>('/api/products', payload)
  return data
}

export async function updateProduct(id: number, payload: Partial<ProductPayload>): Promise<Product> {
  const { data } = await api.patch<Product>(`/api/products/${id}`, payload)
  return data
}

export async function deleteProduct(id: number): Promise<void> {
  await api.delete(`/api/products/${id}`)
}

export async function uploadProductImage(id: number, file: File): Promise<Product> {
  const form = new FormData()
  form.append('file', file)
  const { data } = await api.post<Product>(
    `/api/products/${id}/upload-image`,
    form,
    { headers: { 'Content-Type': 'multipart/form-data' } },
  )
  return data
}
