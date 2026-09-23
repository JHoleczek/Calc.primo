import { CONTACT, FLUTINGS, FRONT_TYPES, MATERIALS } from '../config/catalog'
import { CTA_IMAGE } from '../config/images'
import type { Configuration, Result } from '../lib/calculate'

interface Props {
  config: Configuration
  result: Result
}

const fmt = (v: number, digits: number) =>
  Number.isFinite(v) ? v.toLocaleString('pl-PL', { minimumFractionDigits: digits, maximumFractionDigits: digits }) : '—'

/** CTA „Zapytaj o wycenę” w układzie z katalogu: zdjęcie realizacji + kontakt. */
export function QuoteCta({ config, result }: Props) {
  const type = FRONT_TYPES.find((t) => t.id === config.typeId) ?? FRONT_TYPES[0]
  const material = MATERIALS.find((m) => m.id === config.materialId) ?? MATERIALS[0]
  const fluting = FLUTINGS.find((f) => f.id === result.flutingCode) ?? FLUTINGS[0]
  const valid = result.errors.length === 0

  // Gotowa treść maila z kodem i metrami bieżącymi – tego katalog prosi przy wycenie.
  const subject = `Wycena: ${result.code} ${result.flutingCode}`
  const body = [
    'Dzień dobry,',
    '',
    'proszę o wycenę frontu giętego:',
    `Kod: ${result.code}`,
    `Typ: ${type.name}`,
    `Ryflowanie: ${fluting.id} ${fluting.name}`,
    `Materiał: ${material.name}${config.color.trim() ? `, kolor: ${config.color.trim()}` : ''}`,
    `Wysokość H: ${config.heightMm} mm`,
    valid ? `Metry bieżące: ${fmt(result.linearM, 3)} mb, powierzchnia: ${fmt(result.areaM2, 3)} m²` : '',
    '',
  ]
    .filter((line, i, all) => line !== '' || all[i - 1] !== '')
    .join('\n')
  const mailto = `mailto:${CONTACT.email}?subject=${encodeURIComponent(subject)}&body=${encodeURIComponent(body)}`

  return (
    <section className="cta" aria-labelledby="cta-title">
      <div className="cta__layout">
      <div className="cta__image">
        <img src={CTA_IMAGE} alt="Realizacja Primo Meble — front gięty ryflowany" loading="lazy" />
      </div>
      <div className="cta__content">
        <h2 id="cta-title" className="cta__title">
          Zapytaj o wycenę
        </h2>
        <p className="cta__desc">Przygotuj kody z katalogu oraz metry bieżące, żeby wycena była dokładna.</p>
        <p className="cta__summary">
          <span>{result.code}</span>
          <span>{result.flutingCode}</span>
          {valid && <span>{fmt(result.linearM, 3)} mb</span>}
        </p>
        <div className="cta__contact">
          <div className="cta__contact-item">
            <span className="cta__contact-label">Wyślij maila na:</span>
            <a className="cta__button" href={mailto}>
              {CONTACT.email}
            </a>
          </div>
          <div className="cta__contact-item">
            <span className="cta__contact-label">lub zadzwoń na numer</span>
            <a className="cta__button" href={`tel:+48${CONTACT.phone.replace(/\D/g, '')}`}>
              {CONTACT.phone}
            </a>
          </div>
        </div>
      </div>
      </div>
    </section>
  )
}
