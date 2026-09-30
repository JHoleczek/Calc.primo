import { QUOTE_ENDPOINT, WEB3FORMS_ACCESS_KEY } from '../config/catalog'
import { orderEmail, type CartLine, type Contact } from './cart'
import { planLink } from './share'

/**
 * Pola wiadomości: pola techniczne serwisu + wiersze zamówienia (serwis układa je w tabelę
 * w tej samej kolejności). „Odpowiedz” w poczcie trafia do klienta.
 */
export function quoteFields(lines: CartLine[], contact: Contact, base = window.location.href): Record<string, string> {
  const { subject, rows } = orderEmail(lines, contact, (config) => planLink(config, base))
  const meta: Record<string, string> = WEB3FORMS_ACCESS_KEY
    ? { access_key: WEB3FORMS_ACCESS_KEY, subject, from_name: 'Kalkulator frontów giętych', replyto: contact.email.trim() }
    : { _subject: subject, _replyto: contact.email.trim(), _template: 'table' }
  return { ...meta, ...Object.fromEntries(rows) }
}

/**
 * Wysyła zapytanie do biura. Dane idą jako zwykły formularz (FormData), bez nagłówka JSON –
 * przeglądarka nie robi wtedy dodatkowego zapytania kontrolnego (CORS preflight).
 */
export async function sendQuote(lines: CartLine[], contact: Contact, fetchImpl: typeof fetch = fetch): Promise<void> {
  const body = new FormData()
  for (const [k, v] of Object.entries(quoteFields(lines, contact))) body.append(k, v)
  let response: Response
  try {
    response = await fetchImpl(QUOTE_ENDPOINT, { method: 'POST', headers: { Accept: 'application/json' }, body })
  } catch (e) {
    throw new Error(`brak połączenia z serwisem wysyłki (${e instanceof Error ? e.message : String(e)})`)
  }
  const data: unknown = await response.json().catch(() => null)
  const ok = !!data && typeof data === 'object' && String((data as { success?: unknown }).success) === 'true'
  if (!response.ok || !ok) {
    const message = data && typeof data === 'object' ? String((data as { message?: unknown }).message ?? '') : ''
    throw new Error(message || `HTTP ${response.status}`)
  }
}
