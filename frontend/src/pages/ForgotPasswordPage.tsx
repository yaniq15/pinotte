import { useState } from 'react'
import { Link } from 'react-router-dom'
import { useMutation } from '@tanstack/react-query'
import { Mail, ArrowLeft, CheckCircle2 } from 'lucide-react'
import { requestPasswordReset } from '../api/auth'
import { PinotteWordmark } from './LoginPage'

export default function ForgotPasswordPage() {
  const [email, setEmail] = useState('')
  const [submitted, setSubmitted] = useState(false)

  const mut = useMutation({
    mutationFn: () => requestPasswordReset(email.trim()),
    onSuccess: () => setSubmitted(true),
  })

  function onSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (!email.trim()) return
    mut.mutate()
  }

  return (
    <div className="relative min-h-screen overflow-hidden bg-gradient-to-br from-white via-[#FFFAF1] to-[#FDF1DD] text-chika-brown flex items-center justify-center px-4 py-12">
      <div className="w-full max-w-md">
        <div className="flex justify-center mb-8">
          <PinotteWordmark />
        </div>

        <div className="rounded-2xl bg-white/90 backdrop-blur shadow-xl ring-1 ring-stone-200 p-8">
          <Link
            to="/login"
            className="inline-flex items-center gap-1.5 text-sm text-stone-600 hover:text-chika-paprika mb-6 transition"
          >
            <ArrowLeft size={14} /> Retour au login
          </Link>

          {submitted ? (
            <div className="space-y-4">
              <div className="flex items-center gap-2 text-emerald-700">
                <CheckCircle2 size={22} />
                <h1 className="text-xl font-bold font-serif">Email envoyé</h1>
              </div>
              <p className="text-sm text-stone-700">
                Si l'email <strong>{email}</strong> est enregistré, tu recevras un lien de réinitialisation dans quelques minutes.
              </p>
              <p className="text-sm text-stone-600">
                Vérifie aussi tes spams. Le lien est valide pendant <strong>24 heures</strong>.
              </p>
              <Link
                to="/login"
                className="inline-block mt-4 px-4 py-2 text-sm font-medium rounded-md bg-stone-800 text-white hover:bg-stone-700 transition"
              >
                Retourner au login
              </Link>
            </div>
          ) : (
            <>
              <h1 className="text-2xl font-bold font-serif mb-2">Mot de passe oublié ?</h1>
              <p className="text-sm text-stone-600 mb-6">
                Entre ton email et nous t'enverrons un lien pour choisir un nouveau mot de passe.
              </p>

              <form onSubmit={onSubmit} className="space-y-4">
                <div>
                  <label className="text-xs uppercase tracking-wider text-stone-500 mb-1.5 block">Email</label>
                  <div className="relative">
                    <Mail size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-stone-400" />
                    <input
                      type="email"
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      placeholder="toi@entreprise.com"
                      required
                      autoFocus
                      className="w-full pl-10 pr-3 py-2.5 text-sm rounded-md ring-1 ring-stone-300 focus:ring-2 focus:ring-chika-paprika focus:outline-none"
                    />
                  </div>
                </div>

                <button
                  type="submit"
                  disabled={mut.isPending || !email.trim()}
                  className="w-full py-2.5 rounded-md bg-gradient-to-r from-chika-ocre to-chika-paprika text-white font-semibold shadow-md hover:shadow-lg transition disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {mut.isPending ? 'Envoi...' : 'Envoyer le lien'}
                </button>
              </form>
            </>
          )}
        </div>
      </div>
    </div>
  )
}
