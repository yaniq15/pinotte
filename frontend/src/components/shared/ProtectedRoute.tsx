import { Navigate, Outlet } from 'react-router-dom'
import { getToken, useCurrentUser } from '../../hooks/useAuth'

export default function ProtectedRoute() {
  const token = getToken()
  const { data, isLoading, isError } = useCurrentUser()

  if (!token) return <Navigate to="/login" replace />
  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-screen text-sm text-stone-500">
        Chargement…
      </div>
    )
  }
  if (isError || !data) return <Navigate to="/login" replace />

  return <Outlet />
}
