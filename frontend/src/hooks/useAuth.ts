import { useQuery } from '@tanstack/react-query'
import { me } from '../api/auth'

const TOKEN_KEY = 'chika_token'

export function getToken(): string | null {
  return localStorage.getItem(TOKEN_KEY)
}

export function setToken(token: string): void {
  localStorage.setItem(TOKEN_KEY, token)
}

export function clearToken(): void {
  localStorage.removeItem(TOKEN_KEY)
}

export function useCurrentUser() {
  return useQuery({
    queryKey: ['me'],
    queryFn: me,
    enabled: !!getToken(),
    retry: false,
    staleTime: 5 * 60 * 1000,
  })
}
