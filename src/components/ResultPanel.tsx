import type { MeasureSide, Result } from '../lib/calculate'
import { ChoiceGroup } from './ChoiceGroup'

interface Props {
  result: Result
  measureSide: MeasureSide
  onMeasureSideChange: (side: MeasureSide) => void
}

const fmt = (value: number, digits: number) =>
  Number.isFinite(value)
    ? value.toLocaleString('pl-PL', { minimumFractionDigits: digits, maximumFractionDigits: digits })
    : '—'

export function ResultPanel({ result, measureSide, onMeasureSideChange }: Props) {
  const invalid = result.errors.length > 0
  const { billed, outer, inner } = result

  return (
    <section className="result" aria-labelledby="result-title" aria-live="polite">
      <div className="result__head">
        <h2 id="result-title">Wynik</h2>
        <ChoiceGroup<MeasureSide>
          name="measure-side"
          value={measureSide}
          onChange={onMeasureSideChange}
          choices={[
            { value: 'outer', label: 'Po zewnętrznej' },
            { value: 'inner', label: 'Po wewnętrznej' },
          ]}
        />
      </div>

      {invalid && (
        <ul className="result__errors">
          {result.errors.map((e) => (
            <li key={e}>{e}</li>
          ))}
        </ul>
      )}

      <div className={`result__totals${invalid ? ' result__totals--invalid' : ''}`}>
        <div className="total">
          <span className="total__value">{invalid ? '—' : fmt(billed.areaM2, 3)}</span>
          <span className="total__unit">m²</span>
        </div>
        <div className="total">
          <span className="total__value">{invalid ? '—' : fmt(billed.linearM, 3)}</span>
          <span className="total__unit">mb</span>
        </div>
      </div>

      <div className="result__table-wrap">
        <table className="result__table">
          <thead>
            <tr>
              <th scope="col">Strona</th>
              <th scope="col">Promień</th>
              <th scope="col">Rozwinięcie</th>
              <th scope="col">m²</th>
            </tr>
          </thead>
          <tbody>
            {(
              [
                ['outer', 'Zewnętrzna', outer],
                ['inner', 'Wewnętrzna', inner],
              ] as const
            ).map(([side, label, m]) => (
              <tr key={side} className={side === measureSide ? 'is-billed' : undefined}>
                <th scope="row">{label}</th>
                <td>{fmt(m.radiusMm, 0)} mm</td>
                <td>{fmt(m.developedMm, 1)} mm</td>
                <td>{invalid ? '—' : fmt(m.areaM2, 3)}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <h3 className="result__subtitle">Dodatki i uwagi</h3>
      <ul className="notes">
        {result.notes.map((n) => (
          <li key={n.text} className={`note note--${n.level}`}>
            {n.text}
          </li>
        ))}
      </ul>
    </section>
  )
}
