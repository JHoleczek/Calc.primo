import type { Result } from '../lib/calculate'

interface Props {
  result: Result
  heightMm: number
}

const fmt = (value: number, digits: number) =>
  Number.isFinite(value)
    ? value.toLocaleString('pl-PL', { minimumFractionDigits: digits, maximumFractionDigits: digits })
    : '—'

export function ResultPanel({ result, heightMm }: Props) {
  const invalid = result.errors.length > 0
  const show = (value: number, digits: number) => (invalid ? '—' : fmt(value, digits))

  return (
    <section className="result" aria-labelledby="result-title" aria-live="polite">
      <div className="result__head">
        <h2 id="result-title">Wynik</h2>
        <span className="result__basis">po licu zewnętrznym</span>
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

      <>
          <div className="result__totals">
            <div className="total">
              <span className="total__value">{show(result.areaM2, 3)}</span>
              <span className="total__unit">m²</span>
            </div>
            <div className="total">
              <span className="total__value">{show(result.linearM, 3)}</span>
              <span className="total__unit">mb</span>
            </div>
          </div>

          <dl className="result__breakdown">
            <div>
              <dt>Łuki (po zewnętrznej)</dt>
              <dd>{show(result.arcMm, 1)} mm</dd>
            </div>
            {result.straightMm > 0 && (
              <div>
                <dt>Odcinki proste</dt>
                <dd>{show(result.straightMm, 0)} mm</dd>
              </div>
            )}
            <div>
              <dt>Rozwinięcie</dt>
              <dd>{show(result.developedMm, 1)} mm</dd>
            </div>
            <div>
              <dt>Wysokość H</dt>
              <dd>{show(heightMm, 0)} mm</dd>
            </div>
          </dl>
      </>

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

    </section>
  )
}
