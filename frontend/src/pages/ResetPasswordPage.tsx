import { useState } from 'react'
import { Link, useNavigate, useSearchParams } from 'react-router-dom'
import { useMutation } from '@tanstack/react-query'
import { KeyRound, Eye, EyeOff, CheckCircle2, AlertTriangle } from 'lucide-react'
import { confirmPasswordReset } from '../api/auth'
import { PinotteWordmark } from './LoginPage'

export default function ResetPasswordPage() {
  const [searchParams] = useSearchParams()
  const navigate = useNavigate()
  const token = searchParams.get('token') || ''

  const [newPw, setNewPw] = useState('')
  const [confirmPw, setConfirmPw] = useState('')
  const [show, setShow] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [done, setDone] = useState(false)

  const mut = useMutation({
    mutationFn: () => confirmPasswordReset(token, newPw),
    onSuccess: () => {
      setDone(true)
      setTimeout(() => navigate('/login'), 3000)
    },
    onError: (err: unknown) => {
      const msg = (err as { response?: { data?: { detail?: string } } })?.response?.data?.detail
      setError(msg || 'Erreur — réessaie ou demande un nouveau lien')
    },
  })

  function onSubmit(e: React.FormEvent) {
    e.preventDefault()
    setError(null)
    if (newPw.length < 8) {
      setError('Le mot de passe doit faire au moins 8 caractères')
      return
    }
    if (!/\d/.test(newPw)) {
      setError('Le mot de passe doit contenir au moins 1 chiffre')
      return
    }
    if (newPw !== confirmPw) {
      setError('La confirmation ne correspond pas')
      return
    }
    mut.mutate()
  }

  if (!token) {
    return (
      <div className="relative min-h-screen flex items-center justify-center bg-gradient-to-br from-white via-[#FFFAF1] to-[#FDF1DD] px-4">
        <div className="max-w-md w-full rounded-2xl bg-white shadow-xl ring-1 ring-stone-200 p-8 text-center">
          <AlertTriangle size={36} className="text-amber-500 mx-auto mb-3" />
          <h1 className="text-xl font-bold font-serif mb-2 text-chika-brown">Lien invalide</h1>
          <p className="text-sm text-stone-600 mb-6">
            Le lien ne contient pas de token. Demande un nouveau lien de réinitialisation.
          </p>
          <Link
            to="/forgot-password"
            className="inline-block px-4 py-2 text-sm font-medium rounded-md bg-stone-800 text-white hover:bg-stone-700 transition"
          >
            Demander un nouveau lien
          </Link>
        </div>
      </div>
    )
  }

  return (
    <div className="relative min-h-screen overflow-hidden bg-gradient-to-br from-white via-[#FFFAF1] to-[#FDF1DD] text-chika-brown flex items-center justify-center px-4 py-12">
      <div className="w-full max-w-md">
        <div className="flex justify-center mb-8">
          <PinotteWordmark />
        </div>

        <div className="rounded-2xl bg-white/90 backdrop-blur shadow-xl ring-1 ring-stone-200 p-8">
          {done ? (
            <div className="text-center space-y-4">
              <CheckCircle2 size={40} className="text-emerald-600 mx-auto" />
              <h1 className="text-xl font-bold font-serif">Mot de passe changé</h1>
              <p className="text-sm text-stone-600">
                Tu vas être redirigé vers la page de login dans 3 secondes...
              </p>
            </div>
          ) : (
            <>
              <h1 className="text-2xl font-bold font-serif mb-2">Nouveau mot de passe</h1>
              <p className="text-sm text-stone-600 mb-6">
                Choisis un nouveau mot de passe pour ton compte. Min 8 caractères + au moins 1 chiffre.
              </p>

              <form onSubmit={onSubmit} className="space-y-4">
                <PasswordField
                  label="Nouveau mot de passe"
                  value={newPw}
                  onChange={setNewPw}
                  show={show}
                  onToggle={() => setShow(s => !s)}
                />
                <PasswordField
                  label="Confirmer"
                  value={confirmPw}
                  onChange={setConfirmPw}
                  show={show}
                  onToggle={() => setShow(s => !s)}
                />
                {error && (
                  <p className="text-sm text-red-600 bg-red-50 border border-red-200 rounded px-3 py-2">⚠ {error}</p>
                )}
                <button
                  type="submit"
                  disabled={mut.isPending || !newPw || !confirmPw}
                  className="w-full py-2.5 rounded-md bg-gradient-to-r from-chika-ocre to-chika-paprika text-white font-semibold shadow-md hover:shadow-lg transition disabled:opacity-50 disabled:cursor-not-allowed inline-flex items-center justify-center gap-2"
                >
                  <KeyRound size={16} />
                  {mut.isPending ? 'Mise à jour...' : 'Changer le mot de passe'}
                </button>
              </form>
            </>
          )}
        </div>
      </div>
    </div>
  )
}

function PasswordField({ label, value, onChange, show, onToggle }: {
  label: string
  value: string
  onChange: (v: string) => void
  show: boolean
  onToggle: () => void
}) {
  return (
    <div>
      <label className="text-xs uppercase tracking-wider text-stone-500 mb-1.5 block">{label}</label>
      <div className="relative">
        <input
          type={show ? 'text' : 'password'}
          value={value}
          onChange={(e) => onChange(e.target.value)}
          className="w-full px-3 py-2.5 pr-10 text-sm rounded-md ring-1 ring-stone-300 focus:ring-2 focus:ring-chika-paprika focus:outline-none"
          autoComplete="new-password"
        />
        <button
          type="button"
          onClick={onToggle}
          tabIndex={-1}
          className="absolute right-2 top-1/2 -translate-y-1/2 p-1.5 text-stone-400 hover:text-stone-600 transition"
          aria-label={show ? 'Masquer' : 'Afficher'}
        >
          {show ? <EyeOff size={16} /> : <Eye size={16} />}
        </button>
      </div>
    </div>
  )
}
