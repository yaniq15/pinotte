import { api } from '../lib/axios'

export type EventStatus = 'PLANNED' | 'ONGOING' | 'DONE' | 'CANCELLED'

export interface MaterialItem {
  label: string
  amount: number | string
  material_id?: number | null
  quantity?: number | string | null
  unit?: string | null
  register_as_purchase?: boolean
  purchase_id?: number | null
}

export interface ChikaEvent {
  id: number
  name: string
  location: string | null
  start_date: string
  end_date: string | null
  status: EventStatus
  registration_fee: number | string
  transport_cost: number | string
  other_costs: number | string
  materials_cost: number | string
  materials_breakdown: MaterialItem[] | null
  total_revenue: number | string
  units_sold: number
  notes: string | null
  created_at: string
  updated_at: string
  total_cost: number | string
  profit: number | string
  roi_pct: number | null
}

export interface EventPayload {
  name: string
  location?: string | null
  start_date: string
  end_date?: string | null
  status?: EventStatus
  registration_fee?: number
  transport_cost?: number
  other_costs?: number
  materials_cost?: number
  materials_breakdown?: {
    label: string
    amount: number
    material_id?: number | null
    quantity?: number | null
    unit?: string | null
    register_as_purchase?: boolean
    purchase_id?: number | null
  }[] | null
  total_revenue?: number
  units_sold?: number
  notes?: string | null
}

export async function listEvents(statusFilter?: EventStatus): Promise<ChikaEvent[]> {
  const { data } = await api.get<ChikaEvent[]>('/api/events', {
    params: statusFilter ? { status_filter: statusFilter } : {},
  })
  return data
}

export async function createEvent(payload: EventPayload): Promise<ChikaEvent> {
  const { data } = await api.post<ChikaEvent>('/api/events', payload)
  return data
}

export async function updateEvent(id: number, payload: Partial<EventPayload>): Promise<ChikaEvent> {
  const { data } = await api.patch<ChikaEvent>(`/api/events/${id}`, payload)
  return data
}

export async function deleteEvent(id: number): Promise<void> {
  await api.delete(`/api/events/${id}`)
}
