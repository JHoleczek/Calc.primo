import { DEFAULT_CONFIGURATION, normalizeConfiguration, type Configuration } from './calculate'
import type { Contact } from './cart'

// Link do konkretnego frontu: konfiguracja zakodowana w adresie (#rzut=…).
// Otwiera kalkulator z tym frontem i od razu pokazuje rzut z góry (np. z maila z zamówieniem).

const PREFIX = '#rzut='

const toBase64Url = (text: string) => {
  const bytes = new TextEncoder().encode(text)
  let bin = ''
  bytes.forEach((b) => (bin += String.fromCharCode(b)))
  return btoa(bin).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '')
}

const fromBase64Url = (code: string) => {
  const bin = atob(code.replace(/-/g, '+').replace(/_/g, '/'))
  return new TextDecoder().decode(Uint8Array.from(bin, (c) => c.charCodeAt(0)))
}

// Tylko pola różne od domyślnych – krótszy link; brakujące uzupełnia normalizeConfiguration.
const configDiff = (config: Configuration) =>
  Object.fromEntries(Object.entries(config).filter(([k, v]) => DEFAULT_CONFIGURATION[k as keyof Configuration] !== v))

/** Sama część adresu po „#rzut=” (bez adresu strony). */
export const planCode = (config: Configuration) => toBase64Url(JSON.stringify(configDiff(config)))

/** Pełny adres kalkulatora otwierający rzut danego frontu. */
export function planLink(config: Configuration, base: string): string {
  return `${base.split('#')[0]}${PREFIX}${planCode(config)}`
}

// ---------- Oferta dla biura (#oferta=…&nr=…) ----------
// Link z maila „Utwórz ofertę”: kontakt klienta + pozycje koszyka. Numer zapytania dopisuje serwer.

const OFFER_PREFIX = '#oferta='

export interface OfferData {
  number: string
  contact: Contact
  items: { config: Configuration; qty: number }[]
}

/** Zawartość linku oferty (bez numeru – nadaje go serwer). */
export function offerCode(items: { config: Configuration; qty: number }[], contact: Contact): string {
  const c = { p: contact.phone.trim(), e: contact.email.trim(), f: contact.company.trim(), n: contact.notes.trim() }
  return toBase64Url(JSON.stringify({ c, i: items.map((it) => [configDiff(it.config), it.qty]) }))
}

/** Dane oferty z adresu albo null. */
export function offerFromHash(hash: string): OfferData | null {
  if (!hash.startsWith(OFFER_PREFIX)) return null
  try {
    const params = new URLSearchParams(hash.slice(1))
    const data = JSON.parse(fromBase64Url(params.get('oferta') ?? '')) as {
      c?: Record<string, string>
      i?: [Partial<Configuration>, number][]
    }
    if (!data || !Array.isArray(data.i)) return null
    const c = data.c ?? {}
    return {
      number: params.get('nr') ?? '',
      contact: { phone: c.p ?? '', email: c.e ?? '', company: c.f ?? '', notes: c.n ?? '' },
      items: data.i.map(([cfg, qty]) => ({
        config: normalizeConfiguration(cfg ?? {}),
        qty: Math.max(1, Math.round(Number(qty) || 1)),
      })),
    }
  } catch {
    return null
  }
}

/** Konfiguracja z adresu (#rzut=…) albo null. */
export function configFromHash(hash: string): Configuration | null {
  if (!hash.startsWith(PREFIX)) return null
  try {
    const data: unknown = JSON.parse(fromBase64Url(hash.slice(PREFIX.length)))
    return data && typeof data === 'object' ? normalizeConfiguration(data as Partial<Configuration>) : null
  } catch {
    return null
  }
}
