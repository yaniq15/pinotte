import { useState } from 'react'
import { Link, useNavigate, useSearchParams } from 'react-router-dom'
import { useMutation } from '@tanstack/react-query'
import { KeyRound, Eye, EyeOff, CheckCircle2, AlertTriangle } from 'lucide-react'
import { confirmPasswordReset } from '../api/auth'
import { PinotteWordmark } from './LoginPage'
import { useT } from '../lib/i18n'

export default function ResetPasswordPage() {
  const t = useT()
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
      setError(msg || t('validation.reset_generic_error'))
    },
  })

  function onSubmit(e: React.FormEvent) {
    e.preventDefault()
    setError(null)
    if (newPw.length < 8) {
      setError(t('validation.password_min8_chars'))
      return
    }
    if (!/\d/.test(newPw)) {
      setError(t('validation.password_needs_digit'))
      return
    }
    if (newPw !== confirmPw) {
      setError(t('validation.password_mismatch'))
      return
    }
    mut.mutate()
  }

  if (!token) {
    return (
      <div className="relative min-h-screen flex items-center justify-center bg-gradient-to-br from-white via-[#FFFAF1] to-[#FDF1DD] px-4">
        <div className="max-w-md w-full rounded-2xl bg-white shadow-xl ring-1 ring-stone-200 p-8 text-center">
          <AlertTriangle size={36} className="text-amber-500 mx-auto mb-3" />
          <h1 className="text-xl font-bold font-serif mb-2 text-chika-brown">{t('auth.invalid_link')}</h1>
          <p className="text-sm text-stone-600 mb-6">
            {t('auth.invalid_link_body')}
          </p>
          <Link
            to="/forgot-password"
            className="inline-block px-4 py-2 text-sm font-medium rounded-md bg-stone-800 text-white hover:bg-stone-700 transition"
          >
            {t('auth.request_new_link')}
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
              <h1 className="text-xl font-bold font-serif">{t('auth.password_changed')}</h1>
              <p className="text-sm text-stone-600">
                {t('auth.redirect_notice')}
              </p>
            </div>
          ) : (
            <>
              <h1 className="text-2xl font-bold font-serif mb-2">{t('auth.new_password_title')}</h1>
              <p className="text-sm text-stone-600 mb-6">
                {t('auth.new_password_subtitle')}
              </p>

              <form onSubmit={onSubmit} className="space-y-4">
                <PasswordField
                  label={t('auth.new_password_label')}
                  value={newPw}
                  onChange={setNewPw}
                  show={show}
                  onToggle={() => setShow(s => !s)}
                  showLabel={t('auth.show_password')}
                  hideLabel={t('auth.hide_password')}
                />
                <PasswordField
                  label={t('auth.confirm_label')}
                  value={confirmPw}
                  onChange={setConfirmPw}
                  show={show}
                  onToggle={() => setShow(s => !s)}
                  showLabel={t('auth.show_password')}
                  hideLabel={t('auth.hide_password')}
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
                  {mut.isPending ? t('auth.updating') : t('auth.change_password_button')}
                </button>
              </form>
            </>
          )}
        </div>
      </div>
    </div>
  )
}

function PasswordField({ label, value, onChange, show, onToggle, showLabel, hideLabel }: {
  label: string
  value: string
  onChange: (v: string) => void
  show: boolean
  onToggle: () => void
  showLabel: string
  hideLabel: string
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
          aria-label={show ? hideLabel : showLabel}
        >
          {show ? <EyeOff size={16} /> : <Eye size={16} />}
        </button>
      </div>
    </div>
  )
}
