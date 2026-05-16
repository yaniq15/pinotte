import { api } from '../lib/axios'
import type { AuthResponse, User } from '../types'

export async function login(email: string, password: string): Promise<AuthResponse> {
  const { data } = await api.post<AuthResponse>('/api/auth/login', { email, password })
  return data
}

export async function register(name: string, email: string, password: string): Promise<AuthResponse> {
  const { data } = await api.post<AuthResponse>('/api/auth/register', { name, email, password })
  return data
}

export async function me(): Promise<User> {
  const { data } = await api.get<User>('/api/auth/me')
  return data
}
