import { useMemo, useState, type ReactNode } from 'react'
import { ChoiceGroup } from './components/ChoiceGroup'
import { ResultPanel } from './components/ResultPanel'
import { VisualizationPlaceholder } from './components/VisualizationPlaceholder'
import {
  ENDINGS,
  EXTENSION_RANGE,
  FLUTINGS,
  FRONT_TYPES,
  HEIGHT_RANGE,
  MATERIALS,
  RADIUS_OPTIONS,
} from './config/catalog'
import { calculate, DEFAULT_CONFIGURATION, type Configuration } from './lib/calculate'

function Step({ n, title, hint, children }: { n: number; title: string; hint?: ReactNode; children: ReactNode }) {
  return (
    <fieldset className="step">
      <legend className="step__legend">
        <span className="step__num">{n}</span>
        {title}
      </legend>
      {hint && <p className="step__hint">{hint}</p>}
      {children}
    </fieldset>
  )
}

/** Pole liczbowe z suwakiem; trzyma surowy tekst, żeby dało się swobodnie wpisywać. */
function NumberField({
  id,
  label,
  value,
  min,
  max,
  step,
  disabled,
  onChange,
}: {
  id: string
  label: string
  value: number
  min: number
  max: number
  step: number
  disabled?: boolean
  onChange: (value: number) => void
}) {
  const [text, setText] = useState(String(value))
  const sync = (v: number) => {
    setText(String(v))
    onChange(v)
  }
  return (
    <div className="number-field">
      <div className="number-field__input">
        <input
          id={id}
          aria-label={label}
          type="number"
          inputMode="numeric"
          min={min}
          max={max}
          step={step}
          value={text}
          disabled={disabled}
          onChange={(e) => {
            setText(e.target.value)
            onChange(e.target.value === '' ? NaN : Number(e.target.value))
          }}
        />
        <span className="number-field__unit">mm</span>
      </div>
      <input
        type="range"
        aria-label={`${label} – suwak`}
        min={min}
        max={max}
        step={step}
        value={Number.isFinite(value) ? Math.min(max, Math.max(min, value)) : min}
        disabled={disabled}
        onChange={(e) => sync(Number(e.target.value))}
      />
      <div className="number-field__range">
        <span>{min}</span>
        <span>{max}</span>
      </div>
    </div>
  )
}

export default function App() {
  const [config, setConfig] = useState<Configuration>(DEFAULT_CONFIGURATION)
  const result = useMemo(() => calculate(config), [config])
  const set = <K extends keyof Configuration>(key: K, value: Configuration[K]) =>
    setConfig((c) => ({ ...c, [key]: value }))

  const ending = ENDINGS.find((e) => e.id === config.endingId) ?? ENDINGS[0]
  const material = MATERIALS.find((m) => m.id === config.materialId) ?? MATERIALS[0]

  return (
    <div className="layout">
      <aside className="layout__viz" aria-label="Wizualizacja">
        <VisualizationPlaceholder config={config} />
      </aside>

      <main className="layout__config">
        <header className="page-head">
          <p className="page-head__eyebrow">Primo Meble</p>
          <h1>Kalkulator frontów giętych</h1>
        </header>

        <form className="steps" onSubmit={(e) => e.preventDefault()}>
          <Step n={1} title="Typ frontu giętego">
            <ChoiceGroup
              name="front-type"
              variant="cards"
              value={config.frontTypeId}
              onChange={(v) => set('frontTypeId', v)}
              choices={FRONT_TYPES.map((t) => ({
                value: t.id,
                label: t.name,
                hint: `${t.id} · ${t.description}`,
              }))}
            />
          </Step>

          <Step n={2} title="Promień R" hint="Promień wewnętrzny łuku, 50–600 mm co 50 mm.">
            <ChoiceGroup
              name="radius"
              value={config.radiusMm}
              onChange={(v) => set('radiusMm', v)}
              choices={RADIUS_OPTIONS.map((r) => ({ value: r, label: r }))}
            />
          </Step>

          <Step n={3} title="Wysokość H">
            <NumberField
              id="height"
              label="Wysokość H"
              value={config.heightMm}
              min={HEIGHT_RANGE.min}
              max={HEIGHT_RANGE.max}
              step={HEIGHT_RANGE.step}
              onChange={(v) => set('heightMm', v)}
            />
          </Step>

          <Step n={4} title="Zakończenie">
            <ChoiceGroup
              name="ending"
              variant="cards"
              columns={3}
              value={config.endingId}
              onChange={(v) => set('endingId', v)}
              choices={ENDINGS.map((e) => ({ value: e.id, label: e.name, hint: e.description }))}
            />
          </Step>

          <Step
            n={5}
            title="Długość przedłużenia"
            hint={ending.extensions === 0 ? 'Nie dotyczy dla zakończenia N0.' : 'Długość jednego przedłużenia prostego.'}
          >
            <NumberField
              id="extension"
              label="Długość przedłużenia"
              value={config.extensionMm}
              min={EXTENSION_RANGE.min}
              max={EXTENSION_RANGE.max}
              step={EXTENSION_RANGE.step}
              disabled={ending.extensions === 0}
              onChange={(v) => set('extensionMm', v)}
            />
          </Step>

          <Step n={6} title="Ryflowanie">
            <ChoiceGroup
              name="fluting"
              variant="cards"
              value={config.flutingId}
              onChange={(v) => set('flutingId', v)}
              choices={FLUTINGS.map((f) => ({ value: f.id, label: f.name, hint: f.description }))}
            />
          </Step>

          <Step n={7} title="Materiał">
            <ChoiceGroup
              name="material"
              value={config.materialId}
              onChange={(v) => set('materialId', v)}
              choices={MATERIALS.map((m) => ({ value: m.id, label: m.name }))}
            />
          </Step>

          <Step n={8} title="Kolor" hint={material.colorRequired ? 'Wymagany dla frontów lakierowanych.' : 'Opcjonalnie.'}>
            <input
              className="text-input"
              type="text"
              aria-label="Kolor farby"
              placeholder={material.colorPlaceholder}
              value={config.color}
              required={material.colorRequired}
              onChange={(e) => set('color', e.target.value)}
            />
          </Step>
        </form>

        <ResultPanel
          result={result}
          measureSide={config.measureSide}
          onMeasureSideChange={(v) => set('measureSide', v)}
        />
      </main>
    </div>
  )
}
