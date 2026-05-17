import { api } from '../lib/axios'

export type ClientType = 'BROKER' | 'STORE'

export interface Client {
  id: number
  name: string
  type: ClientType
  email: string | null
  phone: string | null
  address: string | null
  payment_terms_days: number
  active: boolean
  created_at: string
  updated_at: string
}

export interface ClientPayload {
  name: string
  type: ClientType
  email?: string | null
  phone?: string | null
  address?: string | null
  payment_terms_days?: number
  active?: boolean
}

export async function listClients(type?: ClientType): Promise<Client[]> {
  const { data } = await api.get<Client[]>('/api/clients', { params: type ? { type } : {} })
  return data
}

export async function createClient(payload: ClientPayload): Promise<Client> {
  const { data } = await api.post<Client>('/api/clients', payload)
  return data
}

export async function updateClient(id: number, payload: Partial<ClientPayload>): Promise<Client> {
  const { data } = await api.patch<Client>(`/api/clients/${id}`, payload)
  return data
}

export async function deleteClient(id: number): Promise<void> {
  await api.delete(`/api/clients/${id}`)
}
