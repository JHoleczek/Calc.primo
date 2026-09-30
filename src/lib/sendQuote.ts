import { QUOTE_ENDPOINT } from '../config/catalog'
import { officeEmail, type CartLine, type Contact } from './cart'

/**
 * Wysyła zapytanie do biura (FormSubmit → e-mail). Wiadomość zawiera pełne wyliczenie
 * i proponowaną odpowiedź do klienta; „Odpowiedz” w poczcie trafia do klienta (_replyto).
 */
export async function sendQuote(lines: CartLine[], contact: Contact, fetchImpl: typeof fetch = fetch): Promise<void> {
  const { subject, text } = officeEmail(lines, contact)
  let response: Response
  try {
    response = await fetchImpl(QUOTE_ENDPOINT, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Accept: 'application/json' },
      body: JSON.stringify({
        _subject: subject,
        _replyto: contact.email.trim(),
        _template: 'box',
        email: contact.email.trim(),
        telefon: contact.phone.trim(),
        firma: contact.company.trim() || '—',
        message: text,
      }),
    })
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
