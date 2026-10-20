import type { ReactNode } from 'react'
import type { Result } from '../lib/calculate'
import type { LinePrice } from '../lib/pricing'
import { pln } from '../lib/quote'

interface Props {
  result: Result
  /** Przyciski pod podsumowaniem (dodaj do koszyka / zobacz koszyk). */
  children?: ReactNode
  /** Tryb biura: cena frontu z cennika. */
  price?: LinePrice
}

/** Tryb biura: cena 1 szt. z cennika z rozpisaniem (m² × stawka × dopłaty). */
function AdminPrice({ price, result }: { price: LinePrice; result: Result }) {
  if (price.unitPrice === null || price.rate === null || price.baseRate === null) {
    return (
      <div className="admin-price">
        <span className="admin-price__label">Cena (biuro)</span>
        <p className="admin-price__value">do ustalenia</p>
        <p className="admin-price__calc">{price.missing}</p>
      </div>
    )
  }
  const zl = (v: number) => Math.round(v).toLocaleString('pl-PL')
  return (
    <div className="admin-price">
      <span className="admin-price__label">Cena (biuro) · 1 szt.</span>
      <p className="admin-price__value">
        {pln(price.unitPrice)} <span>netto</span>
      </p>
      <p className="admin-price__gross">{pln(Math.round(price.unitPrice * 1.23))} brutto</p>
      <p className="admin-price__calc">
        {result.areaM2.toLocaleString('pl-PL', { maximumFractionDigits: 3 })} m² × {zl(price.baseRate)} zł/m² ({price.baseLabel.toLowerCase()})
        {price.surcharges.map((s) => ` × ${(1 + s.rate).toLocaleString('pl-PL')} (${s.label})`).join('')}
      </p>
    </div>
  )
}

/**
 * Podsumowanie frontu dla klienta: kod katalogowy, dodatki i uwagi.
 * Bez m² i cen – te trafiają tylko do biura w zapytaniu o wycenę.
 */
export function ResultPanel({ result, children, price }: Props) {
  const invalid = result.errors.length > 0

  return (
    <section className="result" aria-labelledby="result-title" aria-live="polite">
      <div className="result__head">
        <h2 id="result-title">Podsumowanie</h2>
      </div>

      <p className="result__code">
        <span className="result__code-main">{result.code}</span>
        <span className="result__code-fluting">{result.flutingCode}</span>
      </p>

      {invalid && (
        <ul className="result__errors">
          {result.errors.map((e) => (
            <li key={e}>{e}</li>
          ))}
        </ul>
      )}

      <h3 className="result__subtitle">Dodatki i uwagi</h3>
      {result.notes.length > 0 ? (
        <ul className="notes">
          {result.notes.map((n) => (
            <li key={n.text} className={`note note--${n.level}`}>
              {n.text}
            </li>
          ))}
        </ul>
      ) : (
        <p className="notes__empty">Brak dodatków.</p>
      )}

      {price && <AdminPrice price={price} result={result} />}

      <p className="result__next">
        {price
          ? 'Dodaj front do koszyka – w koszyku możesz zmienić ceny, dać rabat i wygenerować PDF.'
          : 'Dodaj front do koszyka, a na końcu kliknij „Zapytaj o wycenę” – przygotujemy ofertę.'}
      </p>
      {children}
    </section>
  )
}
