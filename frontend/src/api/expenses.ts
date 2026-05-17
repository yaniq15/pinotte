import { api } from '../lib/axios'

export interface Category {
  id: number
  name: string
  description: string | null
}

export interface Expense {
  id: number
  category_id: number
  product_id: number | null
  batch_id: number | null
  amount: number | string
  currency: string
  expense_date: string
  vendor: string | null
  description: string
  receipt_url: string | null
  created_at: string
  updated_at: string
  category_name: string | null
  product_name: string | null
}

export interface ExpensePayload {
  category_id: number
  product_id?: number | null
  amount: number
  currency?: string
  expense_date: string
  vendor?: string | null
  description: string
  receipt_url?: string | null
}

export interface ExpenseFilter {
  category_id?: number
  product_id?: number
  date_from?: string
  date_to?: string
}

export async function listCategories(): Promise<Category[]> {
  const { data } = await api.get<Category[]>('/api/categories')
  return data
}

export async function listExpenses(filter: ExpenseFilter = {}): Promise<Expense[]> {
  const { data } = await api.get<Expense[]>('/api/expenses', { params: filter })
  return data
}

export async function createExpense(payload: ExpensePayload): Promise<Expense> {
  const { data } = await api.post<Expense>('/api/expenses', payload)
  return data
}

export async function deleteExpense(id: number): Promise<void> {
  await api.delete(`/api/expenses/${id}`)
}
