import { useEffect, useRef, useState } from 'react'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { useNavigate, Link } from 'react-router-dom'
import { useQuery, useQueryClient } from '@tanstack/react-query'
import { Boxes, TrendingUp, FileSpreadsheet, ArrowRight, TrendingDown, Sparkles } from 'lucide-react'
import { login, loginWithGoogle, getAuthConfig } from '../api/auth'
import { setToken } from '../hooks/useAuth'
import { useGoogleSignIn } from '../hooks/useGoogleSignIn'
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
  const googleBtnRef = useRef<HTMLDivElement>(null)

  // Récupère la config publique du backend (signup ouvert ? Google activé ?)
  const authConfig = useQuery({ queryKey: ['auth-config'], queryFn: getAuthConfig })
  const googleClientId = authConfig.data?.google_oauth_enabled
    ? authConfig.data.google_oauth_client_id
    : null
  const googleReady = useGoogleSignIn(googleClientId)

  const { register, handleSubmit, formState: { errors, isSubmitting } } = useForm<FormData>({
    resolver: zodResolver(schema),
  })

  async function handleGoogleCredential(idToken: string) {
    setServerError(null)
    try {
      const res = await loginWithGoogle(idToken)
      setToken(res.access_token)
      qc.setQueryData(['me'], res.user)
      navigate('/')
    } catch (err: unknown) {
      const msg = (err as { response?: { data?: { detail?: string } } })?.response?.data?.detail
      setServerError(msg || 'Connexion Google impossible')
    }
  }

  // Initialise Google Sign-In dès que le SDK est chargé + le bouton est rendu
  useEffect(() => {
    if (!googleReady || !googleClientId || !googleBtnRef.current || !window.google) return
    window.google.accounts.id.initialize({
      client_id: googleClientId,
      callback: (resp) => handleGoogleCredential(resp.credential),
    })
    window.google.accounts.id.renderButton(googleBtnRef.current, {
      type: 'standard',
      theme: 'outline',
      size: 'large',
      text: 'continue_with',
      shape: 'rectangular',
      logo_alignment: 'left',
      width: 320,
    })
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [googleReady, googleClientId])

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
    <div className="relative min-h-screen overflow-hidden bg-gradient-to-br from-white via-[#FFFAF1] to-[#FDF1DD] text-chika-brown">
      {/* ── Mesh light très doux : grandes orbes pastel, opacity basse ── */}
      <div aria-hidden className="pointer-events-none absolute inset-0 overflow-hidden">
        <div
          className="absolute -top-48 -left-48 h-[48rem] w-[48rem] rounded-full opacity-25 blur-3xl will-change-transform"
          style={{
            background: 'radial-gradient(closest-side, #FFD0B2 0%, #FFB68A 30%, transparent 75%)',
            animation: 'mesh-drift-a 22s ease-in-out infinite',
          }}
        />
        <div
          className="absolute top-1/4 -right-48 h-[42rem] w-[42rem] rounded-full opacity-25 blur-3xl will-change-transform"
          style={{
            background: 'radial-gradient(closest-side, #FFE8C2 0%, #FFD89A 35%, transparent 75%)',
            animation: 'mesh-drift-b 26s ease-in-out infinite',
          }}
        />
        <div
          className="absolute -bottom-48 left-1/3 h-[42rem] w-[42rem] rounded-full opacity-12 blur-3xl will-change-transform"
          style={{
            background: 'radial-gradient(closest-side, #DCE5C5 0%, #B8C994 35%, transparent 75%)',
            animation: 'mesh-drift-c 30s ease-in-out infinite',
          }}
        />
        {/* Voile blanc pour vraiment adoucir */}
        <div className="absolute inset-0 bg-gradient-to-b from-white/60 via-white/20 to-white/40" />
      </div>

      {/* ── Topbar ── */}
      <header className="relative z-10 flex items-center justify-between px-6 lg:px-12 py-5">
        <PinotteWordmark size="md" />
        <div className="hidden sm:inline-flex items-center gap-2 text-[11px] uppercase tracking-[0.18em] text-chika-brown/55">
          <Sparkles size={12} className="text-chika-paprika" />
          PME alimentaire OS
        </div>
      </header>

      {/* ── Layout 2 colonnes ── */}
      <div className="relative z-10 grid lg:grid-cols-[1.1fr,0.9fr] gap-12 px-6 lg:px-12 pb-16 pt-4 lg:pt-12 max-w-7xl mx-auto items-center">
        {/* LEFT — copy + mockup */}
        <div>
          {/* Eyebrow */}
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-white/70 ring-1 ring-chika-paprika/30 backdrop-blur-md text-[11px] font-medium text-chika-paprikaDeep tracking-wide shadow-sm">
            <span className="inline-block h-1.5 w-1.5 rounded-full bg-chika-paprika animate-pulse" />
            Nouveau — Export comptable XLSX
          </div>

          {/* Headline (gradient subtil paprikaDeep -> paprika) */}
          <h1 className="mt-6 text-5xl sm:text-6xl lg:text-7xl font-black tracking-tight leading-[1.02]">
            <span
              className="bg-clip-text text-transparent"
              style={{
                backgroundImage:
                  'linear-gradient(135deg, #4A2218 0%, #6B3320 60%, #9B3A1A 100%)',
              }}
            >
              L'OS de votre
              <br />
              entreprise alimentaire.
            </span>
          </h1>

          <p className="mt-6 text-lg text-chika-brown/65 max-w-xl leading-relaxed">
            Catalogue, ventes, marges et comptabilité — dans une seule app pensée pour les PME du Québec.
          </p>

          {/* Mockup flottant (carte glass blanche avec faux KPIs) */}
          <div className="mt-12 hidden md:block relative">
            <div className="relative max-w-md animate-float-slow">
              <div className="glass-card-light rounded-2xl p-5">
                <div className="flex items-center justify-between mb-4">
                  <div className="text-[10px] uppercase tracking-widest text-chika-brown/55">Mai 2026</div>
                  <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md bg-emerald-50 ring-1 ring-emerald-300/50 text-[10px] font-bold text-emerald-700">
                    LIVE
                  </span>
                </div>
                <div className="grid grid-cols-3 gap-3">
                  <MockKpi icon={TrendingUp} label="Revenus" value="14 280 $" tone="emerald" />
                  <MockKpi icon={TrendingDown} label="Dépenses" value="6 410 $" tone="rose" />
                  <MockKpi icon={Sparkles} label="Marge nette" value="55%" tone="ocre" />
                </div>
                {/* Mini chart synthétique */}
                <div className="mt-5 flex items-end gap-1.5 h-14">
                  {[40, 65, 50, 75, 60, 85, 70, 95, 80, 100, 90, 110].map((h, i) => (
                    <div
                      key={i}
                      className="flex-1 rounded-t-md"
                      style={{
                        height: `${h}%`,
                        background: `linear-gradient(to top, rgba(197,83,46,0.15), rgba(197,83,46,${0.55 + i / 24}))`,
                      }}
                    />
                  ))}
                </div>
              </div>
              <div className="absolute -right-10 -bottom-8 w-56 glass-card-light rounded-xl p-3 animate-float-slow-delay">
                <div className="text-[10px] uppercase tracking-widest text-chika-brown/55 mb-1.5">
                  Taxes QC — net à remettre
                </div>
                <div className="text-2xl font-bold bg-clip-text text-transparent" style={{
                  backgroundImage: 'linear-gradient(135deg, #C5532E 0%, #E89B27 100%)',
                }}>
                  2 138,42 $
                </div>
                <div className="mt-1 text-[10px] text-chika-brown/50">TPS + TVQ · trimestre courant</div>
              </div>
            </div>
          </div>
        </div>

        {/* RIGHT — login form */}
        <div className="lg:pl-6">
          <div className="glass-card-light rounded-3xl p-7 sm:p-9 max-w-md ml-auto">
            <div className="mb-7">
              <h2 className="font-display text-3xl font-bold text-chika-brown">Bienvenue</h2>
              <p className="text-sm text-chika-brown/60 mt-1.5">
                Connecte-toi à ton espace de gestion.
              </p>
            </div>

            {serverError && (
              <div className="mb-4 px-3 py-2 rounded-lg bg-red-50 ring-1 ring-red-200 text-red-700 text-sm">
                ⚠ {serverError}
              </div>
            )}

            <form onSubmit={handleSubmit(onSubmit)} className="space-y-5">
              <InputField
                label="Email"
                error={errors.email?.message}
                inputProps={{
                  ...register('email'),
                  type: 'email',
                  autoComplete: 'email',
                  autoFocus: true,
                  placeholder: 'toi@entreprise.com',
                }}
              />
              <InputField
                label="Mot de passe"
                error={errors.password?.message}
                inputProps={{
                  ...register('password'),
                  type: 'password',
                  autoComplete: 'current-password',
                  placeholder: '••••••••',
                }}
              />

              <button
                type="submit"
                disabled={isSubmitting}
                className="group relative w-full inline-flex items-center justify-center gap-2 py-3 px-4 rounded-xl font-semibold text-white overflow-hidden transition disabled:opacity-50"
                style={{
                  background: 'linear-gradient(135deg, #E89B27 0%, #C5532E 50%, #9B3A1A 100%)',
                  boxShadow:
                    '0 10px 30px -8px rgba(197,83,46,0.45), 0 1px 0 rgba(255,255,255,0.25) inset',
                }}
              >
                <span
                  aria-hidden
                  className="absolute inset-0 opacity-0 group-hover:opacity-100 transition-opacity duration-500"
                  style={{
                    background:
                      'linear-gradient(110deg, transparent 30%, rgba(255,255,255,0.4) 50%, transparent 70%)',
                    transform: 'translateX(-100%)',
                    animation: 'shine-sweep 1.4s ease-in-out',
                  }}
                />
                <span className="relative">{isSubmitting ? 'Connexion…' : 'Se connecter'}</span>
                {!isSubmitting && (
                  <ArrowRight size={16} className="relative transition group-hover:translate-x-0.5" />
                )}
              </button>

              <div className="text-center -mt-1">
                <Link
                  to="/forgot-password"
                  className="text-xs text-chika-brown/60 hover:text-chika-paprika transition"
                >
                  Mot de passe oublié ?
                </Link>
              </div>
            </form>

            {/* Séparateur + Google (si activé) */}
            {googleClientId && (
              <>
                <div className="my-6 flex items-center gap-3">
                  <div className="h-px flex-1 bg-chika-brown/18" />
                  <span className="text-[10px] uppercase tracking-widest text-chika-brown/45">ou</span>
                  <div className="h-px flex-1 bg-chika-brown/18" />
                </div>
                <div className="flex justify-center">
                  {/* Google rend son propre bouton ici une fois le SDK chargé */}
                  <div ref={googleBtnRef} />
                  {!googleReady && (
                    <div className="h-10 w-[320px] rounded-lg bg-stone-100 animate-pulse" />
                  )}
                </div>
              </>
            )}

            {/* Lien création compte (masqué si signup public désactivé en prod) */}
            {authConfig.data?.public_signup_enabled && (
              <>
                <div className="my-6 flex items-center gap-3">
                  <div className="h-px flex-1 bg-chika-brown/18" />
                  <span className="text-[10px] uppercase tracking-widest text-chika-brown/45">ou</span>
                  <div className="h-px flex-1 bg-chika-brown/18" />
                </div>
                <p className="text-center text-sm text-chika-brown/70">
                  Pas encore de compte ?{' '}
                  <Link
                    to="/register"
                    className="text-chika-paprika font-semibold hover:text-chika-paprikaDeep transition"
                  >
                    Créer un compte →
                  </Link>
                </p>
              </>
            )}
            {authConfig.data && !authConfig.data.public_signup_enabled && (
              <p className="text-center text-[11px] text-chika-brown/50 mt-6">
                L'inscription est sur invitation. Demande à un administrateur.
              </p>
            )}
          </div>

          {/* 3 micro-features sous le form */}
          <ul className="mt-8 grid grid-cols-1 sm:grid-cols-3 gap-3 max-w-md ml-auto">
            <MicroFeature icon={Boxes} label="Catalogue & inventaire" />
            <MicroFeature icon={TrendingUp} label="Ventes & marges" />
            <MicroFeature icon={FileSpreadsheet} label="Export comptable" />
          </ul>
        </div>
      </div>

      {/* ── Footer ── */}
      <footer className="relative z-10 px-6 lg:px-12 pb-6 text-[11px] text-chika-brown/50 flex flex-wrap items-center justify-between gap-2">
        <div>© {new Date().getFullYear()} {BRAND.name} · Tous droits réservés</div>
        <div className="inline-flex items-center gap-2">
          <span className="inline-block h-1.5 w-1.5 rounded-full bg-emerald-500" />
          Fait au Québec 🍁 · Données chiffrées et hébergées au Canada
        </div>
      </footer>
    </div>
  )
}

// ── Sub-components ──────────────────────────────────────────────

/** Wordmark texte (Fraunces) pour la plateforme. Remplace l'ancien logo PNG.
 *  Avantage : 100% editable depuis BRAND.name, pas besoin de re-générer un PNG. */
export function PinotteWordmark({ size = 'md', tone = 'dark' }: {
  size?: 'sm' | 'md' | 'lg'
  tone?: 'dark' | 'light'
}) {
  const sizeCls = { sm: 'text-xl', md: 'text-2xl', lg: 'text-4xl' }[size]
  return (
    <span
      className={`font-display font-black tracking-tight ${sizeCls} bg-clip-text text-transparent`}
      style={{
        backgroundImage:
          tone === 'dark'
            ? 'linear-gradient(135deg, #4A2218 0%, #9B3A1A 50%, #C5532E 100%)'
            : 'linear-gradient(135deg, #FFFFFF 0%, #F7E9C5 100%)',
      }}
    >
      {BRAND.name}
    </span>
  )
}

function InputField({
  label, error, inputProps,
}: {
  label: string
  error?: string
  inputProps: React.InputHTMLAttributes<HTMLInputElement>
}) {
  return (
    <div>
      <label className="block text-[10px] font-bold uppercase tracking-[0.15em] text-chika-brown/55 mb-2">
        {label}
      </label>
      <input
        {...inputProps}
        className="w-full px-4 py-3 rounded-xl bg-white/80 ring-1 ring-chika-brown/20 focus:ring-2 focus:ring-chika-paprika/50 focus:bg-white focus:outline-none text-chika-brown placeholder:text-chika-brown/30 transition"
      />
      {error && <p className="mt-1.5 text-xs text-red-600">{error}</p>}
    </div>
  )
}

function MockKpi({
  icon: Icon, label, value, tone,
}: {
  icon: React.ComponentType<{ size?: number; className?: string }>
  label: string
  value: string
  tone: 'emerald' | 'rose' | 'ocre'
}) {
  const colors = {
    emerald: 'text-emerald-700 bg-emerald-50 ring-emerald-200',
    rose:    'text-rose-700 bg-rose-50 ring-rose-200',
    ocre:    'text-chika-paprikaDeep bg-chika-ocre/10 ring-chika-ocre/40',
  }[tone]
  return (
    <div className="bg-white/60 rounded-xl p-3 ring-1 ring-chika-brown/15">
      <div className="flex items-center justify-between mb-2">
        <span className={`w-6 h-6 rounded-md flex items-center justify-center ring-1 ${colors}`}>
          <Icon size={12} />
        </span>
        <span className="text-[9px] uppercase tracking-widest text-chika-brown/45">{label}</span>
      </div>
      <div className="text-base font-bold text-chika-brown tabular-nums">{value}</div>
    </div>
  )
}

function MicroFeature({
  icon: Icon, label,
}: {
  icon: React.ComponentType<{ size?: number; className?: string }>
  label: string
}) {
  return (
    <li className="flex items-center gap-2 px-3 py-2.5 rounded-xl bg-white/60 ring-1 ring-chika-brown/15 backdrop-blur-md text-[11px] text-chika-brown/75 shadow-sm">
      <Icon size={14} className="text-chika-paprika shrink-0" />
      {label}
    </li>
  )
}
