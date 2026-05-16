import { useState } from 'react'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { useNavigate, Link } from 'react-router-dom'
import { useQueryClient } from '@tanstack/react-query'
import { register as registerApi } from '../api/auth'
import { setToken } from '../hooks/useAuth'

const schema = z.object({
  name: z.string().min(1, 'Nom requis').max(100),
  email: z.string().email('Email invalide'),
  password: z.string().min(8, 'Au moins 8 caractères').max(72, 'Maximum 72 caractères'),
})

type FormData = z.infer<typeof schema>

export default function RegisterPage() {
  const navigate = useNavigate()
  const qc = useQueryClient()
  const [serverError, setServerError] = useState<string | null>(null)
  const { register: rhfRegister, handleSubmit, formState: { errors, isSubmitting } } = useForm<FormData>({
    resolver: zodResolver(schema),
  })

  async function onSubmit(values: FormData) {
    setServerError(null)
    try {
      const res = await registerApi(values.name, values.email, values.password)
      setToken(res.access_token)
      qc.setQueryData(['me'], res.user)
      navigate('/')
    } catch (err: unknown) {
      const msg = (err as { response?: { data?: { detail?: string } } })?.response?.data?.detail
      setServerError(msg || 'Inscription impossible')
    }
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-chika-50 to-stone-100 px-4">
      <div className="w-full max-w-sm bg-white rounded-2xl shadow-xl border border-stone-200 p-6">
        <div className="text-center mb-6">
          <div className="text-3xl mb-1">🍱</div>
          <h1 className="text-2xl font-bold text-stone-900">Chika</h1>
          <p className="text-sm text-stone-500">Créer un compte</p>
        </div>

        {serverError && (
          <div className="mb-4 px-3 py-2 rounded-lg bg-red-50 border border-red-200 text-red-700 text-sm">
            {serverError}
          </div>
        )}

        <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
          <div>
            <label className="block text-xs font-semibold text-stone-700 mb-1">Nom</label>
            <input {...rhfRegister('name')} autoFocus
                   className="w-full px-3 py-2 border border-stone-300 rounded-lg focus:ring-2 focus:ring-chika-500 focus:border-chika-500 focus:outline-none" />
            {errors.name && <p className="mt-1 text-xs text-red-600">{errors.name.message}</p>}
          </div>
          <div>
            <label className="block text-xs font-semibold text-stone-700 mb-1">Email</label>
            <input {...rhfRegister('email')} type="email" autoComplete="email"
                   className="w-full px-3 py-2 border border-stone-300 rounded-lg focus:ring-2 focus:ring-chika-500 focus:border-chika-500 focus:outline-none" />
            {errors.email && <p className="mt-1 text-xs text-red-600">{errors.email.message}</p>}
          </div>
          <div>
            <label className="block text-xs font-semibold text-stone-700 mb-1">Mot de passe</label>
            <input {...rhfRegister('password')} type="password" autoComplete="new-password"
                   className="w-full px-3 py-2 border border-stone-300 rounded-lg focus:ring-2 focus:ring-chika-500 focus:border-chika-500 focus:outline-none" />
            {errors.password && <p className="mt-1 text-xs text-red-600">{errors.password.message}</p>}
          </div>

          <button type="submit" disabled={isSubmitting}
                  className="w-full bg-chika-600 hover:bg-chika-700 disabled:opacity-50 text-white font-semibold py-2.5 rounded-lg transition">
            {isSubmitting ? 'Création…' : 'Créer mon compte'}
          </button>
        </form>

        <p className="text-center text-xs text-stone-500 mt-4">
          Déjà un compte ? <Link to="/login" className="text-chika-700 font-semibold hover:underline">Se connecter</Link>
        </p>
      </div>
    </div>
  )
}
