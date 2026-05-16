export interface User {
  id: number
  name: string
  email: string
  role: string
  active: boolean
  created_at: string
}

export interface AuthResponse {
  access_token: string
  token_type: string
  user: User
}
