import { CONTACT } from '../config/catalog'
import { CTA_IMAGE } from '../config/images'
import { cartTotals, type CartLine } from '../lib/cart'

const fmt = (v: number) => v.toLocaleString('pl-PL', { minimumFractionDigits: 3, maximumFractionDigits: 3 })

/** Baner na końcu strony (zdjęcie z katalogu) – prowadzi do koszyka i „Wyślij do oceny”. */
export function CtaBanner({ lines, onOpenCart }: { lines: CartLine[]; onOpenCart: () => void }) {
  const totals = cartTotals(lines)
  const empty = lines.length === 0
  return (
    <section className="cta" aria-labelledby="cta-title">
      <div className="cta__layout">
        <div className="cta__image">
          <img src={CTA_IMAGE} alt="Realizacja Primo Meble — front gięty ryflowany" loading="lazy" />
        </div>
        <div className="cta__content">
          <h2 id="cta-title" className="cta__title">
            Wyślij do oceny
          </h2>
          <p className="cta__desc">
            Zbierz fronty w koszyku i prześlij je do biura Primo – ocenimy wykonalność i przygotujemy wycenę.
          </p>
          {empty ? (
            <p className="cta__hint">Koszyk jest pusty – dodaj skonfigurowany front przyciskiem „Dodaj do koszyka”.</p>
          ) : (
            <p className="cta__summary">
              <span>{lines.length} poz.</span>
              <span>{totals.pieces} szt.</span>
              <span>{fmt(totals.linearM)} mb</span>
              <span>{fmt(totals.areaM2)} m²</span>
            </p>
          )}
          <div className="cta__actions">
            <button type="button" className="btn-primary" onClick={onOpenCart}>
              Otwórz koszyk
            </button>
          </div>
          <p className="cta__phone">
            Wolisz porozmawiać? Zadzwoń: <a href={`tel:+48${CONTACT.phone.replace(/\D/g, '')}`}>{CONTACT.phone}</a>
          </p>
        </div>
      </div>
    </section>
  )
}
