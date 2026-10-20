import { OFFER_DEFAULTS, PUBLIC_QUOTE_EMAIL } from '../config/catalog'
import type { CartLine } from './cart'

// Wycena z trybu biura (PDF): sumy z rabatem, kwoty i link potwierdzenia – jak w wycenie z maila.

export interface QuoteTotals {
  /** Suma netto przed rabatem; null = któraś pozycja bez ceny. */
  net: number | null
  discountPct: number
  discount: number
  /** Suma netto po rabacie. */
  netAfter: number | null
  vat: number
  gross: number | null
}

const round2 = (v: number) => Math.round(v * 100) / 100

export function quoteTotals(lines: CartLine[], discountPct: number): QuoteTotals {
  const pct = Number.isFinite(discountPct) ? Math.min(100, Math.max(0, discountPct)) : 0
  const priced = lines.length > 0 && lines.every((l) => l.net !== null)
  if (!priced) return { net: null, discountPct: pct, discount: 0, netAfter: null, vat: 0, gross: null }
  const net = round2(lines.reduce((s, l) => s + (l.net ?? 0), 0))
  const discount = round2((net * pct) / 100)
  const netAfter = round2(net - discount)
  const vat = round2((netAfter * OFFER_DEFAULTS.vatPct) / 100)
  return { net, discountPct: pct, discount, netAfter, vat, gross: round2(netAfter + vat) }
}

/** Kwota jak w mailu: „12 345 PLN”, z groszami tylko gdy są („12 345,50 PLN”). */
export function pln(v: number): string {
  const whole = Number.isInteger(round2(v))
  return `${v.toLocaleString('pl-PL', { minimumFractionDigits: whole ? 0 : 2, maximumFractionDigits: whole ? 0 : 2, useGrouping: true })} PLN`.replace(
    / | /g,
    ' ',
  )
}

/** Link „Odpowiedz i potwierdź”: gotowa wiadomość do biura z numerem i kwotą wyceny. */
export function acceptMailto(number: string, totals: QuoteTotals, client: string): string {
  const label = number.trim() ? `nr ${number.trim()}` : `z dnia ${new Date().toLocaleDateString('pl-PL')}`
  const amount =
    totals.netAfter === null || totals.gross === null ? '' : ` na kwotę ${pln(totals.netAfter)} netto (${pln(totals.gross)} brutto)`
  const body =
    'Dzień dobry,\n\n' +
    `potwierdzam wycenę ${label}${amount} i proszę o przygotowanie zamówienia ` +
    'oraz informację o zadatku i terminie realizacji.\n\n' +
    `Pozdrawiam\n${client.trim()}\n`
  return `mailto:${PUBLIC_QUOTE_EMAIL}?subject=${encodeURIComponent(`Potwierdzam wycenę ${label}`)}&body=${encodeURIComponent(body)}`
}
