import { exportPlanSvg, renderMarkup, svgToPng, THUMB_LAYOUT_WIDTH, THUMB_SCALE } from './planExport'
import { describeConfig, orderEmail, type CartLine, type Contact } from './cart'
import { offerCode, planCode, planLink } from './share'
import { QUOTE_API, QUOTE_ENDPOINT, WEB3FORMS_ACCESS_KEY } from '../config/catalog'

/** Wynik wysyłki: numer zapytania nadany przez nasz serwer (Web3Forms go nie nadaje). */
export interface QuoteReceipt {
  number: string | null
}

/**
 * Pola wiadomości Web3Forms: pola techniczne serwisu + wiersze zamówienia (serwis układa je w tabelę
 * w tej samej kolejności). „Odpowiedz” w poczcie trafia do klienta.
 */
export function quoteFields(lines: CartLine[], contact: Contact, base = window.location.href): Record<string, string> {
  const { subject, rows } = orderEmail(lines, contact, (config) => planLink(config, base))
  const meta: Record<string, string> = WEB3FORMS_ACCESS_KEY
    ? { access_key: WEB3FORMS_ACCESS_KEY, subject, from_name: 'Kalkulator frontów giętych', replyto: contact.email.trim() }
    : { _subject: subject, _replyto: contact.email.trim(), _template: 'table' }
  const offer = `${base.split('#')[0]}#oferta=${offerCode(lines.map((l) => ({ config: l.item.config, qty: l.item.qty })), contact)}`
  return { ...meta, ...Object.fromEntries(rows), 'Utwórz ofertę': offer }
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
      qty: l.item.qty,
      unit: l.price.unitPrice,
      total: l.price.total,
      rzut: planCode(l.item.config),
    })),
    offer: offerCode(lines.map((l) => ({ config: l.item.config, qty: l.item.qty })), contact),
  }
}

/** Miniatura rzutu do maila (PNG w base64) – przy błędzie po prostu bez obrazka. */
async function thumbnail(line: CartLine): Promise<string | undefined> {
  try {
    const title = `${line.result.code} ${line.result.flutingCode}`
    const file = exportPlanSvg(line.item.config, title, '', THUMB_SCALE, renderMarkup, THUMB_LAYOUT_WIDTH)
    const blob = await svgToPng(file)
    const bytes = new Uint8Array(await blob.arrayBuffer())
    let bin = ''
    bytes.forEach((b) => (bin += String.fromCharCode(b)))
    return btoa(bin)
  } catch {
    return undefined
  }
}

const unreachable = (e: unknown) => new Error(`brak połączenia z serwisem wysyłki (${e instanceof Error ? e.message : String(e)})`)

/** Wysyła zapytanie do biura: przez nasz serwer (jeśli jest) albo przez Web3Forms. */
export async function sendQuote(lines: CartLine[], contact: Contact, fetchImpl: typeof fetch = fetch): Promise<QuoteReceipt> {
  if (QUOTE_API) {
    const payload = quotePayload(lines, contact)
    const pngs = await Promise.all(lines.map(thumbnail))
    const body = JSON.stringify({ ...payload, items: payload.items.map((it, i) => ({ ...it, png: pngs[i] })) })
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

  // Strona bez serwera: dane idą jako zwykły formularz (FormData) – bez zapytania kontrolnego CORS.
  const body = new FormData()
  for (const [k, v] of Object.entries(quoteFields(lines, contact))) body.append(k, v)
  let response: Response
  try {
    response = await fetchImpl(QUOTE_ENDPOINT, { method: 'POST', headers: { Accept: 'application/json' }, body })
  } catch (e) {
    throw unreachable(e)
  }
  const data: unknown = await response.json().catch(() => null)
  const ok = !!data && typeof data === 'object' && String((data as { success?: unknown }).success) === 'true'
  if (!response.ok || !ok) {
    const message = data && typeof data === 'object' ? String((data as { message?: unknown }).message ?? '') : ''
    throw new Error(message || `HTTP ${response.status}`)
  }
  return { number: null }
}
