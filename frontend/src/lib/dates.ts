/**
 * Helpers de date — robustes au fuseau horaire.
 *
 * ⚠️ Le piège classique : `new Date().toISOString().slice(0, 10)` renvoie la
 * date en UTC. Au Québec (UTC-4/-5), en soirée, ça bascule au lendemain — et
 * parfois au mois suivant. Une dépense saisie le 31 mai à 21h se retrouvait
 * datée du 1er juin → invisible dans le filtre "mai".
 *
 * `new Date("2026-05-31")` souffre du même problème : JS interprète une date
 * seule comme minuit UTC, puis l'affiche en heure locale → recule d'un jour.
 *
 * Ces helpers travaillent toujours en heure LOCALE.
 */

/** Date du jour au format "YYYY-MM-DD" en heure locale (pour les <input type=date>). */
export function todayISO(): string {
  const d = new Date()
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`
}

/** Parse une chaîne "YYYY-MM-DD" comme une date LOCALE (pas UTC). */
export function parseLocalDate(iso: string): Date {
  const [y, m, d] = iso.slice(0, 10).split('-').map(Number)
  return new Date(y, (m || 1) - 1, d || 1)
}

/** Formate une date "YYYY-MM-DD" pour affichage, sans décalage de fuseau. */
export function fmtDateLocal(
  iso: string | null | undefined,
  locale: string = 'fr-CA',
  opts: Intl.DateTimeFormatOptions = { day: '2-digit', month: 'short', year: 'numeric' },
): string {
  if (!iso) return '—'
  return parseLocalDate(iso).toLocaleDateString(locale, opts)
}

function pad(n: number): string {
  return String(n).padStart(2, '0')
}
