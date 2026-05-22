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

// ── Google OAuth ────────────────────────────────────────────────
export interface AuthConfig {
  public_signup_enabled: boolean
  google_oauth_enabled: boolean
  google_oauth_client_id: string
  password_min_length: number
}

export async function getAuthConfig(): Promise<AuthConfig> {
  const { data } = await api.get<AuthConfig>('/api/auth/config')
  return data
}

export async function loginWithGoogle(idToken: string): Promise<AuthResponse> {
  const { data } = await api.post<AuthResponse>('/api/auth/google', { id_token: idToken })
  return data
}

export async function changePassword(currentPassword: string, newPassword: string): Promise<void> {
  await api.patch('/api/auth/me/password', {
    current_password: currentPassword,
    new_password: newPassword,
  })
}
