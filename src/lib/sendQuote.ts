import { QUOTE_ENDPOINT, QUOTE_FORM_ACTION } from '../config/catalog'
import { officeEmail, type CartLine, type Contact } from './cart'

/** Pola wiadomości do biura (FormSubmit → e-mail); „Odpowiedz” w poczcie trafia do klienta (_replyto). */
export function quoteFields(lines: CartLine[], contact: Contact): Record<string, string> {
  const { subject, text } = officeEmail(lines, contact)
  return {
    _subject: subject,
    _replyto: contact.email.trim(),
    _template: 'box',
    email: contact.email.trim(),
    telefon: contact.phone.trim(),
    firma: contact.company.trim() || '—',
    message: text,
  }
}

/** Wysyłka nie doszła do serwera (sieć, bloker reklam) – można spróbować zwykłym formularzem. */
export class QuoteNetworkError extends Error {}

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
    throw new QuoteNetworkError(`brak połączenia z serwisem wysyłki (${e instanceof Error ? e.message : String(e)})`)
  }
  const data: unknown = await response.json().catch(() => null)
  const ok = !!data && typeof data === 'object' && String((data as { success?: unknown }).success) === 'true'
  if (!response.ok || !ok) {
    const message = data && typeof data === 'object' ? String((data as { message?: unknown }).message ?? '') : ''
    throw new Error(message || `HTTP ${response.status}`)
  }
}

/** Znacznik w adresie po powrocie z wysyłki zwykłym formularzem. */
export const SENT_HASH = '#zapytanie-wyslane'

/**
 * Wysyłka awaryjna: zwykły formularz HTML (przejście na stronę serwisu i powrót tutaj).
 * Działa także tam, gdzie zapytania w tle są blokowane. Koszyk zostaje w przeglądarce.
 */
export function submitQuoteForm(lines: CartLine[], contact: Contact) {
  const form = document.createElement('form')
  form.method = 'POST'
  form.action = QUOTE_FORM_ACTION
  form.acceptCharset = 'UTF-8'
  const back = new URL(window.location.href)
  back.hash = SENT_HASH
  const fields = { ...quoteFields(lines, contact), _captcha: 'false', _next: back.toString() }
  for (const [k, v] of Object.entries(fields)) {
    const input = document.createElement('input')
    input.type = 'hidden'
    input.name = k
    input.value = v
    form.append(input)
  }
  document.body.append(form)
  form.submit()
}
