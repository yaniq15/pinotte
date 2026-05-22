import { api } from '../lib/axios'
import type { User } from '../types'

export interface UserInvitePayload {
  name: string
  email: string
  role: 'OWNER' | 'USER'
}

export interface UserInviteResult {
  user: User
  temp_password: string
}

export async function inviteUser(payload: UserInvitePayload): Promise<UserInviteResult> {
  const { data } = await api.post<UserInviteResult>('/api/users', payload)
  return data
}

export async function listUsers(): Promise<User[]> {
  const { data } = await api.get<User[]>('/api/users')
  return data
}
