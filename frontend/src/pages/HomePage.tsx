import { useNavigate } from 'react-router-dom'
import { useQueryClient } from '@tanstack/react-query'
import { LogOut } from 'lucide-react'
import { useCurrentUser, clearToken } from '../hooks/useAuth'

export default function HomePage() {
  const { data: user } = useCurrentUser()
  const navigate = useNavigate()
  const qc = useQueryClient()

  function logout() {
    clearToken()
    qc.clear()
    navigate('/login')
  }

  return (
    <div className="min-h-screen bg-stone-50">
      <header className="bg-white border-b border-stone-200">
        <div className="max-w-5xl mx-auto px-4 py-3 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <span className="text-2xl">🍱</span>
            <h1 className="text-lg font-bold text-stone-900">Chika</h1>
          </div>
          <div className="flex items-center gap-3 text-sm">
            <span className="text-stone-600">Bonjour <strong>{user?.name}</strong></span>
            <button onClick={logout}
                    className="flex items-center gap-1 text-stone-500 hover:text-red-600 text-xs font-medium px-2 py-1 rounded">
              <LogOut size={14} /> Déconnexion
            </button>
          </div>
        </div>
      </header>

      <main className="max-w-5xl mx-auto px-4 py-8">
        <div className="bg-white rounded-2xl shadow-sm border border-stone-200 p-6">
          <h2 className="text-xl font-bold mb-2">Bienvenue dans Chika 👋</h2>
          <p className="text-stone-600 text-sm">
            Phase 1 terminée — authentification opérationnelle.
            Les prochaines phases ajouteront le catalogue produits, les lots, l'inventaire, les ventes, les dépenses et le tableau de bord.
          </p>
        </div>
      </main>
    </div>
  )
}
