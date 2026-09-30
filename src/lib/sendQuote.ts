import { QUOTE_ENDPOINT, WEB3FORMS_ACCESS_KEY } from '../config/catalog'
import { officeEmail, type CartLine, type Contact } from './cart'

/** Pola wiadomości do biura; „Odpowiedz” w poczcie trafia do klienta (replyto / _replyto). */
export function quoteFields(lines: CartLine[], contact: Contact): Record<string, string> {
  const { subject, text } = officeEmail(lines, contact)
  const common = {
    email: contact.email.trim(),
    telefon: contact.phone.trim(),
    firma: contact.company.trim() || '—',
    message: text,
  }
  return WEB3FORMS_ACCESS_KEY
    ? {
        access_key: WEB3FORMS_ACCESS_KEY,
        subject,
        from_name: 'Kalkulator frontów giętych',
        replyto: contact.email.trim(),
        ...common,
      }
    : { _subject: subject, _replyto: contact.email.trim(), _template: 'box', ...common }
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
