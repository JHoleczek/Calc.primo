import { FLUTINGS, FRONT_TYPES, MATERIALS } from '../config/catalog'
import { calculate, type Configuration } from './calculate'

// Koszyk frontów do oceny: czyste funkcje (łatwe do testowania) + zapis w przeglądarce.

export interface CartItem {
  id: string
  config: Configuration
  qty: number
}

export const MAX_QTY = 999

const clampQty = (qty: number) => Math.min(MAX_QTY, Math.max(1, Math.round(Number.isFinite(qty) ? qty : 1)))

let counter = 0
export const newId = () => `${Date.now().toString(36)}-${(counter++).toString(36)}-${Math.random().toString(36).slice(2, 7)}`

export function addItem(cart: CartItem[], config: Configuration, qty = 1): CartItem[] {
  return [...cart, { id: newId(), config: { ...config }, qty: clampQty(qty) }]
}

export function updateItem(cart: CartItem[], id: string, config: Configuration): CartItem[] {
  return cart.map((item) => (item.id === id ? { ...item, config: { ...config } } : item))
}

export function removeItem(cart: CartItem[], id: string): CartItem[] {
  return cart.filter((item) => item.id !== id)
}

/** Kopia pozycji wstawiana tuż pod oryginałem. */
export function duplicateItem(cart: CartItem[], id: string): CartItem[] {
  const i = cart.findIndex((item) => item.id === id)
  if (i < 0) return cart
  const copy = { ...cart[i], id: newId(), config: { ...cart[i].config } }
  return [...cart.slice(0, i + 1), copy, ...cart.slice(i + 1)]
}

export function setQty(cart: CartItem[], id: string, qty: number): CartItem[] {
  return cart.map((item) => (item.id === id ? { ...item, qty: clampQty(qty) } : item))
}

export interface CartLine {
  item: CartItem
  result: ReturnType<typeof calculate>
  /** mb i m² dla całej pozycji (sztuka × ilość). */
  linearM: number
  areaM2: number
}

export function cartLines(cart: CartItem[]): CartLine[] {
  return cart.map((item) => {
    const result = calculate(item.config)
    return { item, result, linearM: result.linearM * item.qty, areaM2: result.areaM2 * item.qty }
  })
}

export function cartTotals(lines: CartLine[]) {
  return lines.reduce(
    (t, l) => ({ pieces: t.pieces + l.item.qty, linearM: t.linearM + l.linearM, areaM2: t.areaM2 + l.areaM2 }),
    { pieces: 0, linearM: 0, areaM2: 0 },
  )
}

const fmt = (v: number, digits = 3) =>
  v.toLocaleString('pl-PL', { minimumFractionDigits: digits, maximumFractionDigits: digits })

/** Jednolinijkowy opis frontu (bez ilości), np. „Narożne · F03 Fala 18 · Fornirowane, dąb · H 720 mm”. */
export function describeConfig(config: Configuration, flutingCode: string): string {
  const type = FRONT_TYPES.find((t) => t.id === config.typeId) ?? FRONT_TYPES[0]
  const material = MATERIALS.find((m) => m.id === config.materialId) ?? MATERIALS[0]
  const fluting = FLUTINGS.find((f) => f.id === flutingCode) ?? FLUTINGS[0]
  const color = config.color.trim()
  return [
    type.name,
    `${fluting.id} ${fluting.name}`,
    `${material.name}${color ? `, ${color}` : ''}`,
    `H ${config.heightMm} mm`,
  ].join(' · ')
}

export interface Contact {
  name: string
  reply: string
  notes: string
}

/** Treść zapytania „do oceny”: lista frontów z kodami i metrami bieżącymi + dane kontaktowe. */
export function quoteText(lines: CartLine[], contact: Contact): string {
  const totals = cartTotals(lines)
  const out = ['Dzień dobry,', '', 'proszę o ocenę i wycenę poniższych frontów giętych:', '']
  lines.forEach((l, i) => {
    out.push(`${i + 1}. ${l.result.code} ${l.result.flutingCode} – ${describeConfig(l.item.config, l.result.flutingCode)}`)
    out.push(
      `   ${l.item.qty} szt. × ${fmt(l.result.linearM)} mb = ${fmt(l.linearM)} mb (${fmt(l.areaM2)} m²)`,
    )
  })
  out.push('', `Razem: ${totals.pieces} szt., ${fmt(totals.linearM)} mb, ${fmt(totals.areaM2)} m²`)
  if (contact.notes.trim()) out.push('', `Uwagi: ${contact.notes.trim()}`)
  out.push('')
  if (contact.name.trim()) out.push(contact.name.trim())
  if (contact.reply.trim()) out.push(`Kontakt: ${contact.reply.trim()}`)
  return out.join('\n')
}

// --- Zapis w przeglądarce (tylko wygoda: pusty lub niedostępny storage nie psuje strony) ---

const STORAGE_KEY = 'primo-koszyk-v1'

export function loadCart(): CartItem[] {
  try {
    const raw = localStorage.getItem(STORAGE_KEY)
    const parsed: unknown = raw ? JSON.parse(raw) : []
    if (!Array.isArray(parsed)) return []
    return parsed.filter(
      (x): x is CartItem => !!x && typeof x.id === 'string' && typeof x.qty === 'number' && typeof x.config === 'object',
    )
  } catch {
    return []
  }
}

export function saveCart(cart: CartItem[]) {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(cart))
  } catch {
    // Brak dostępu do storage (tryb prywatny itp.) – koszyk działa do odświeżenia strony.
  }
}
