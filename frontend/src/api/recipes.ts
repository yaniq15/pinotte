import { api } from '../lib/axios'

export interface RecipeIngredient {
  id?: number
  name: string
  unit: string
  quantity: number
  unit_price: number | null
  notes?: string | null
  sort_order?: number
  line_cost?: number | null
  // Lien dur au catalogue matières (par ID, robuste aux accents/typos)
  material_id?: number | null
  // Snapshot du catalogue pour l'affichage (rempli par le backend en GET)
  material_name?: string | null
  material_unit?: string | null
  material_current_stock?: number | string | null
  material_pmp?: number | string | null
}

export interface Recipe {
  product_id: number
  product_name: string
  units_per_box: number
  batch_yield_units: number | null
  ingredients: RecipeIngredient[]
  total_batch_cost: number
  cost_per_unit: number | null
  cost_per_box: number | null
  current_unit_cost: number | null
}

export async function getRecipe(productId: number): Promise<Recipe> {
  const { data } = await api.get<Recipe>(`/api/products/${productId}/recipe`)
  return data
}

export async function putRecipe(productId: number, payload: {
  batch_yield_units: number | null
  ingredients: Omit<RecipeIngredient, 'id' | 'line_cost'>[]
}): Promise<Recipe> {
  const { data } = await api.put<Recipe>(`/api/products/${productId}/recipe`, payload)
  return data
}

export async function applyCost(productId: number): Promise<Recipe> {
  const { data } = await api.post<Recipe>(`/api/products/${productId}/recipe/apply-cost`)
  return data
}
