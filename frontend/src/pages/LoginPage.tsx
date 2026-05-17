import { useState } from 'react'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { useNavigate, Link } from 'react-router-dom'
import { useQueryClient } from '@tanstack/react-query'
import { login } from '../api/auth'
import { setToken } from '../hooks/useAuth'
import { BRAND } from '../lib/brand'

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
    <div className="min-h-screen flex flex-col lg:flex-row">
      {/* HERO with paprika motif */}
      <div className="lg:w-1/2 bg-motif-paprika relative flex items-center justify-center py-12 lg:py-0 overflow-hidden">
        <div className="absolute inset-0 bg-gradient-to-br from-chika-paprika/85 via-chika-paprika/70 to-chika-paprikaDeep/85" />
        <div className="relative text-center px-6 z-10">
          <img src={BRAND.assets.logoCream} alt={BRAND.name}
               className="h-20 sm:h-28 mx-auto drop-shadow-lg" />
          <p className="mt-4 text-chika-cream font-display italic text-lg sm:text-xl tracking-wide">
            {BRAND.tagline}
          </p>
          <img src={BRAND.assets.sceauFr} alt="Sceau"
               className="h-24 sm:h-28 mx-auto mt-6 opacity-90 invert"
               style={{ filter: 'invert(1) sepia(0.3) brightness(1.4)' }} />
          <div className="mt-8 flex justify-center gap-3">
            {BRAND.products.slice(0, 3).map((p) => (
              <img key={p.sku} src={p.image} alt={p.name}
                   className="h-24 sm:h-32 object-contain drop-shadow-2xl"
                   style={{ filter: 'drop-shadow(0 6px 12px rgba(0,0,0,0.4))' }} />
            ))}
          </div>
        </div>
      </div>

      {/* FORM */}
      <div className="lg:w-1/2 bg-chika-creamSoft flex items-center justify-center px-4 py-12">
        <div className="w-full max-w-sm bg-white rounded-2xl shadow-xl border border-chika-cream p-6 sm:p-8">
          <div className="text-center mb-6">
            <img src={BRAND.assets.logoPaprika} alt={BRAND.name}
                 className="h-12 mx-auto lg:hidden mb-3" />
            <h2 className="text-2xl font-bold text-chika-brown font-display">Bienvenue</h2>
            <p className="text-sm text-chika-brown/60 mt-1">Connecte-toi à ton espace</p>
          </div>

          {serverError && (
            <div className="mb-4 px-3 py-2 rounded-lg bg-red-50 border border-red-200 text-red-700 text-sm">
              ⚠ {serverError}
            </div>
          )}

          <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
            <div>
              <label className="block text-xs font-bold uppercase tracking-wider text-chika-brown/70 mb-1.5">
                Email
              </label>
              <input
                {...register('email')}
                type="email"
                autoComplete="email"
                autoFocus
                className="w-full px-3 py-2.5 border border-chika-cream rounded-lg focus:ring-2 focus:ring-chika-paprika focus:border-chika-paprika focus:outline-none text-chika-brown"
              />
              {errors.email && <p className="mt-1 text-xs text-red-600">{errors.email.message}</p>}
            </div>

            <div>
              <label className="block text-xs font-bold uppercase tracking-wider text-chika-brown/70 mb-1.5">
                Mot de passe
              </label>
              <input
                {...register('password')}
                type="password"
                autoComplete="current-password"
                className="w-full px-3 py-2.5 border border-chika-cream rounded-lg focus:ring-2 focus:ring-chika-paprika focus:border-chika-paprika focus:outline-none text-chika-brown"
              />
              {errors.password && <p className="mt-1 text-xs text-red-600">{errors.password.message}</p>}
            </div>

            <button
              type="submit"
              disabled={isSubmitting}
              className="w-full bg-chika-paprika hover:bg-chika-paprikaDeep disabled:opacity-50 text-white font-bold py-3 rounded-lg transition shadow-lg shadow-chika-paprika/30"
            >
              {isSubmitting ? 'Connexion…' : 'Se connecter'}
            </button>
          </form>

          <p className="text-center text-xs text-chika-brown/60 mt-5">
            Pas encore de compte ?{' '}
            <Link to="/register" className="text-chika-paprika font-bold hover:underline">
              Créer un compte
            </Link>
          </p>
        </div>
      </div>
    </div>
  )
}
