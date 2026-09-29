import type { Result } from '../lib/calculate'

interface Props {
  result: Result
}

/**
 * Podsumowanie frontu dla klienta: kod katalogowy, dodatki i uwagi.
 * Bez m² i cen – te trafiają tylko do biura w zapytaniu o wycenę.
 */
export function ResultPanel({ result }: Props) {
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

      <p className="result__next">Dodaj front do koszyka, a na końcu kliknij „Zapytaj o wycenę” – przygotujemy ofertę.</p>
    </section>
  )
}
