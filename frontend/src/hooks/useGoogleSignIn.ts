/**
 * Charge le SDK Google Identity Services (gsi/client) une seule fois et expose
 * un trigger pour ouvrir le popup Google "Sign in with Google".
 *
 * Flow :
 *   1. Frontend appelle window.google.accounts.id.prompt() ou renderButton
 *   2. Google retourne un `credential` (= JWT id_token signé par Google)
 *   3. On envoie ce credential au backend via loginWithGoogle()
 *   4. Backend vérifie la signature avec google-auth et nous renvoie notre JWT
 */
import { useEffect, useState } from 'react'

declare global {
  interface Window {
    google?: {
      accounts: {
        id: {
          initialize: (config: {
            client_id: string
            callback: (resp: { credential: string }) => void
            auto_select?: boolean
            cancel_on_tap_outside?: boolean
          }) => void
          prompt: () => void
          renderButton: (el: HTMLElement, opts: Record<string, unknown>) => void
        }
      }
    }
  }
}

const SCRIPT_URL = 'https://accounts.google.com/gsi/client'

export function useGoogleSignIn(clientId: string | null) {
  const [ready, setReady] = useState(false)

  useEffect(() => {
    if (!clientId) return
    // Évite de charger le script deux fois (React StrictMode dev)
    const existing = document.querySelector<HTMLScriptElement>(`script[src="${SCRIPT_URL}"]`)
    if (existing) {
      if (window.google?.accounts?.id) setReady(true)
      else existing.addEventListener('load', () => setReady(true), { once: true })
      return
    }
    const s = document.createElement('script')
    s.src = SCRIPT_URL
    s.async = true
    s.defer = true
    s.onload = () => setReady(true)
    document.head.appendChild(s)
  }, [clientId])

  return ready
}
