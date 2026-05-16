import { useState } from 'react'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { useNavigate, Link } from 'react-router-dom'
import { useQueryClient } from '@tanstack/react-query'
import { login } from '../api/auth'
import { setToken } from '../hooks/useAuth'

const schema = z.object({
  email: z.string().email('Email invalide'),
  password: z.string().min(1, 'Mot de passe requis'),
})

type FormData = z.infer<typeof schema>

export default function LoginPage() {
  const navigate = useNavigate()
  const qc = useQueryClient()
  const [serverError, setServerError] = useState<string | null>(null)
  const { register, handleSubmit, formState: { errors, isSubmitting } } = useForm<FormData>({
    resolver: zodResolver(schema),
  })

  async function onSubmit(values: FormData) {
    setServerError(null)
    try {
      const res = await login(values.email, values.password)
      setToken(res.access_token)
      qc.setQueryData(['me'], res.user)
      navigate('/')
    } catch (err: unknown) {
      const msg = (err as { response?: { data?: { detail?: string } } })?.response?.data?.detail
      setServerError(msg || 'Connexion impossible')
    }
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-chika-50 to-stone-100 px-4">
      <div className="w-full max-w-sm bg-white rounded-2xl shadow-xl border border-stone-200 p-6">
        <div className="text-center mb-6">
          <div className="text-3xl mb-1">🍱</div>
          <h1 className="text-2xl font-bold text-stone-900">Chika</h1>
          <p className="text-sm text-stone-500">Connexion</p>
        </div>

        {serverError && (
          <div className="mb-4 px-3 py-2 rounded-lg bg-red-50 border border-red-200 text-red-700 text-sm">
            {serverError}
          </div>
        )}

        <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
          <div>
            <label className="block text-xs font-semibold text-stone-700 mb-1">Email</label>
            <input
              {...register('email')}
              type="email"
              autoComplete="email"
              autoFocus
              className="w-full px-3 py-2 border border-stone-300 rounded-lg focus:ring-2 focus:ring-chika-500 focus:border-chika-500 focus:outline-none"
            />
            {errors.email && <p className="mt-1 text-xs text-red-600">{errors.email.message}</p>}
          </div>

          <div>
            <label className="block text-xs font-semibold text-stone-700 mb-1">Mot de passe</label>
            <input
              {...register('password')}
              type="password"
              autoComplete="current-password"
              className="w-full px-3 py-2 border border-stone-300 rounded-lg focus:ring-2 focus:ring-chika-500 focus:border-chika-500 focus:outline-none"
            />
            {errors.password && <p className="mt-1 text-xs text-red-600">{errors.password.message}</p>}
          </div>

          <button
            type="submit"
            disabled={isSubmitting}
            className="w-full bg-chika-600 hover:bg-chika-700 disabled:opacity-50 text-white font-semibold py-2.5 rounded-lg transition"
          >
            {isSubmitting ? 'Connexion…' : 'Se connecter'}
          </button>
        </form>

        <p className="text-center text-xs text-stone-500 mt-4">
          Pas encore de compte ? <Link to="/register" className="text-chika-700 font-semibold hover:underline">Créer un compte</Link>
        </p>
      </div>
    </div>
  )
}
