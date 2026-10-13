import { describeConfig, extensionsText, finishText, type CartLine, type Contact } from './cart'
import { offerCode, planCode } from './share'
import { FLUTINGS, QUOTE_API } from '../config/catalog'

/** Wynik wysyłki: numer zapytania nadany przez nasz serwer. */
export interface QuoteReceipt {
  number: string | null
}

/** Dane dla naszego serwera (api/wyslij.php) – bez obrazków. */
export function quotePayload(lines: CartLine[], contact: Contact) {
  return {
    contact: {
      phone: contact.phone.trim(),
      email: contact.email.trim(),
      company: contact.company.trim(),
      notes: contact.notes.trim(),
    },
    items: lines.map((l) => ({
      code: l.result.code,
      fluting: l.result.flutingCode,
      name: describeConfig(l.item.config, l.result.flutingCode),
      height: l.item.config.heightMm,
      ext: extensionsText(l.item.config),
      finish: finishText(l.item.config),
      flutingName: FLUTINGS.find((f) => f.id === l.result.flutingCode)?.name ?? '',
      body: l.item.config.body,
      // m² całej pozycji (sztuka × ilość).
      area: Math.round(l.areaM2 * 1000) / 1000,
      qty: l.item.qty,
      unit: l.price.unitPrice,
      total: l.price.total,
      rzut: planCode(l.item.config),
    })),
    offer: offerCode(lines.map((l) => ({ config: l.item.config, qty: l.item.qty })), contact),
  }
}

const unreachable = (e: unknown) => new Error(`brak połączenia z serwisem wysyłki (${e instanceof Error ? e.message : String(e)})`)

/** Wysyła zapytanie do biura przez nasz serwer (api/wyslij.php na hostingu). */
export async function sendQuote(lines: CartLine[], contact: Contact, fetchImpl: typeof fetch = fetch): Promise<QuoteReceipt> {
  const body = JSON.stringify(quotePayload(lines, contact))
  let response: Response
  try {
    response = await fetchImpl(QUOTE_API, { method: 'POST', headers: { 'Content-Type': 'application/json', Accept: 'application/json' }, body })
  } catch (e) {
    throw unreachable(e)
  }
  const data = (await response.json().catch(() => null)) as { ok?: boolean; number?: string | null; message?: string } | null
  if (!response.ok || !data?.ok) throw new Error(data?.message || `HTTP ${response.status}`)
  return { number: data.number ?? null }
}
