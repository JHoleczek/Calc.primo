import { useEffect, useMemo, useState, type ReactNode } from 'react'
import { ChoiceGroup } from './components/ChoiceGroup'
import { ResultPanel } from './components/ResultPanel'
import { VisualizationPanel } from './components/VisualizationPanel'
import {
  CORNER_EXTENSION_MM,
  DOUBLE_WIDTHS,
  DOUBLE_Z,
  ENDINGS,
  EXTENDED_LENGTH,
  FLUTINGS,
  FRONT_TYPES,
  HEIGHT_RANGE,
  MATERIALS,
  SMOOTH_FLUTING_ID,
  THICKNESS_MM,
  type FrontTypeId,
  type MaterialId,
} from './config/catalog'
import { Cart } from './components/Cart'
import { SubmitCta } from './components/SubmitCta'
import { catalogImage, extendedImage, TYPE_IMAGES } from './config/images'
import { allowedRadius, calculate, DEFAULT_CONFIGURATION, type Configuration } from './lib/calculate'
import {
  addItem,
  cartLines,
  duplicateItem,
  loadCart,
  removeItem,
  saveCart,
  setQty,
  updateItem,
  type CartItem,
} from './lib/cart'

function Step({ n, title, hint, children }: { n: number; title: string; hint?: ReactNode; children: ReactNode }) {
  return (
    <fieldset className="step">
      <legend className="step__legend">
        <span className="step__num">{String(n).padStart(2, '0')}</span>
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

  // Koszyk: zapisywany w przeglądarce, żeby przetrwał odświeżenie strony.
  const [cart, setCart] = useState<CartItem[]>(loadCart)
  const [editingId, setEditingId] = useState<string | null>(null)
  const [cartMessage, setCartMessage] = useState('')
  // Zmiana klucza przebudowuje pola formularza po wczytaniu frontu do edycji.
  const [formKey, setFormKey] = useState(0)
  useEffect(() => saveCart(cart), [cart])
  const lines = useMemo(() => cartLines(cart), [cart])
  const editingIndex = cart.findIndex((i) => i.id === editingId)

  const scrollTo = (id: string) => {
    const reduce = window.matchMedia?.('(prefers-reduced-motion: reduce)').matches
    document.getElementById(id)?.scrollIntoView({ behavior: reduce ? 'auto' : 'smooth', block: 'start' })
  }
  const addToCart = () => {
    setCart((c) => addItem(c, config))
    setCartMessage(`Dodano do koszyka: ${result.code} ${result.flutingCode}.`)
  }
  const saveEdit = () => {
    if (!editingId) return
    setCart((c) => updateItem(c, editingId, config))
    setCartMessage(`Zapisano zmiany w pozycji ${String(editingIndex + 1).padStart(2, '0')}.`)
    setEditingId(null)
    scrollTo('koszyk')
  }
  const startEdit = (id: string) => {
    const item = cart.find((i) => i.id === id)
    if (!item) return
    setConfig({ ...item.config })
    setEditingId(id)
    setFormKey((k) => k + 1)
    setCartMessage('')
    scrollTo('konfigurator')
  }
  const remove = (id: string) => {
    setCart((c) => removeItem(c, id))
    if (id === editingId) setEditingId(null)
  }
  const set = <K extends keyof Configuration>(key: K, value: Configuration[K]) =>
    setConfig((c) => ({ ...c, [key]: value }))

  const frontType = FRONT_TYPES.find((t) => t.id === config.typeId) ?? FRONT_TYPES[0]
  const material = MATERIALS.find((m) => m.id === config.materialId) ?? MATERIALS[0]
  const t = config.typeId

  // Zmiana typu: promień dociągamy do listy katalogowej danego typu.
  const setType = (typeId: FrontTypeId) =>
    setConfig((c) => ({ ...c, typeId, radiusMm: allowedRadius(typeId, c.radiusMm) }))
  // Laminat tylko gładki: przy wyborze laminatu ryflowanie wraca do F00.
  const setMaterial = (materialId: MaterialId) =>
    setConfig((c) => ({
      ...c,
      materialId,
      flutingId: MATERIALS.find((m) => m.id === materialId)?.smoothOnly ? SMOOTH_FLUTING_ID : c.flutingId,
    }))

  const radii = frontType.radii
  const radiusHint =
    radii.length === 1
      ? `Stały promień ${radii[0]} mm (po zewnętrznej powierzchni łuku).`
      : `Promień po zewnętrznej powierzchni łuku, ${radii[0]}–${radii[radii.length - 1]} mm co 50 mm.`

  // Kroki numerowane kolejno; część dotyczy tylko wybranych typów.
  const steps: { title: string; hint?: ReactNode; body: ReactNode }[] = [
    {
      title: 'Typ frontu giętego',
      body: (
        <ChoiceGroup
          name="front-type"
          variant="cards"
          value={t}
          onChange={setType}
          choices={FRONT_TYPES.map((ft) => ({
            value: ft.id,
            label: ft.name,
            hint: ft.description,
            image: catalogImage(TYPE_IMAGES[ft.id]),
          }))}
        />
      ),
    },
  ]
  steps.push(
      {
        title: 'Promień R',
        hint: radiusHint,
        body: (
          <ChoiceGroup
            name="radius"
            value={config.radiusMm}
            onChange={(v) => set('radiusMm', v)}
            choices={radii.map((r) => ({ value: r, label: r }))}
          />
        ),
      },
      {
        title: 'Wysokość H',
        body: (
          <NumberField
            id="height"
            label="Wysokość H"
            value={config.heightMm}
            min={HEIGHT_RANGE.min}
            max={HEIGHT_RANGE.max}
            step={HEIGHT_RANGE.step}
            onChange={(v) => set('heightMm', v)}
          />
        ),
      },
  )
  if (t === 'narozne') {
    steps.push({
      title: 'Zakończenie',
      hint: `Przedłużenie frontu o ${CORNER_EXTENSION_MM} mm, np. do montażu zawiasów.`,
      body: (
        <ChoiceGroup
          name="ending"
          variant="cards"
          columns={3}
          value={config.endingId}
          onChange={(v) => set('endingId', v)}
          choices={ENDINGS.map((e) => ({
            value: e.id,
            label: e.name,
            hint: e.description,
            image: catalogImage(e.name),
          }))}
        />
      ),
    })
  }
  if (t === 'przedluzane') {
    steps.push({
      title: 'Wymiar L',
      hint: `Całkowity wymiar od lica łuku do końca przedłużenia, max ${EXTENDED_LENGTH.max} mm.`,
      body: (
        <div className="step__with-figure">
        <NumberField
          key={`L-${config.radiusMm}`}
          id="length"
          label="Wymiar L"
          value={config.lengthMm}
          min={config.radiusMm + EXTENDED_LENGTH.minAboveRadius}
          max={EXTENDED_LENGTH.max}
          step={1}
          onChange={(v) => set('lengthMm', v)}
        />
          {extendedImage(config.radiusMm) && (
            <figure className="step__figure">
              <img src={extendedImage(config.radiusMm)} alt={`Rysunek katalogowy elementu przedłużanego R${config.radiusMm}, wymiar L max 700 mm`} />
              <figcaption>Rysunek katalogowy · R{config.radiusMm}, L max {EXTENDED_LENGTH.max}</figcaption>
            </figure>
          )}
        </div>
      ),
    })
  }
  if (t === 'obustronne') {
    steps.push(
      {
        title: 'Szerokość W',
        body: (
          <ChoiceGroup
            name="width"
            value={config.widthMm}
            onChange={(v) => set('widthMm', v)}
            choices={DOUBLE_WIDTHS.map((w) => ({ value: w, label: w }))}
          />
        ),
      },
      {
        title: 'Przedłużenie boków',
        hint: `Wymiar Z – całkowita głębokość z przedłużeniem, max ${DOUBLE_Z.max} mm.`,
        body: (
          <div className="step__stack">
            <ChoiceGroup
              name="side-extension"
              variant="cards"
              columns={2}
              value={config.sideExtension ? 'z' : 'none'}
              onChange={(v) => set('sideExtension', v === 'z')}
              choices={[
                {
                  value: 'none',
                  label: 'Bez przedłużenia',
                  hint: `Głębokość ${config.radiusMm} mm`,
                  image: catalogImage('EG-D-R100-W600'),
                },
                { value: 'z', label: 'Z przedłużeniem', hint: 'Wariant -Z', image: catalogImage('EG-D-R100-W600-Z200') },
              ]}
            />
            {config.sideExtension && (
              <NumberField
                id="z"
                label="Wymiar Z"
                value={config.zMm}
                min={config.radiusMm + DOUBLE_Z.minAboveRadius}
                max={DOUBLE_Z.max}
                step={1}
                onChange={(v) => set('zMm', v)}
              />
            )}
          </div>
        ),
      },
    )
  }
  steps.push({
    title: 'Ryflowanie',
    hint: material.smoothOnly ? `${material.name} występuje tylko w wersji gładkiej (F00).` : undefined,
    body: (
      <ChoiceGroup
        name="fluting"
        variant="cards"
        value={material.smoothOnly ? SMOOTH_FLUTING_ID : config.flutingId}
        onChange={(v) => set('flutingId', v)}
        choices={FLUTINGS.filter((f) => !material.smoothOnly || f.id === SMOOTH_FLUTING_ID).map((f) => ({
          value: f.id,
          label: f.id,
          hint: f.name,
          image: catalogImage(f.id),
        }))}
      />
    ),
  })
  steps.push(
    {
      title: 'Materiał',
      body: (
        <ChoiceGroup
          name="material"
          value={config.materialId}
          onChange={setMaterial}
          choices={MATERIALS.map((m) => ({ value: m.id, label: m.name }))}
        />
      ),
    },
    {
      title: 'Kolor',
      hint: material.colorRequired ? 'Wymagany dla frontów lakierowanych.' : 'Opcjonalnie.',
      body: (
        <input
          className="text-input"
          type="text"
          id="color"
          aria-label="Kolor farby"
          placeholder={material.colorPlaceholder}
          value={config.color}
          required={material.colorRequired}
          onChange={(e) => set('color', e.target.value)}
        />
      ),
    },
  )

  return (
    <div className="layout">
      <aside className="layout__viz" aria-label="Wizualizacja">
        <VisualizationPanel config={config} result={result} />
      </aside>

      <main className="layout__config">
        <header className="page-head" id="konfigurator">
          <div className="page-head__top">
            <p className="page-head__eyebrow">Fronty Primo — katalog 2026</p>
            <a className="page-head__cart" href="#koszyk">
              Koszyk ({lines.reduce((n, l) => n + l.item.qty, 0)})
            </a>
          </div>
          <h1>Kalkulator frontów giętych</h1>
          <p className="page-head__specs">
            Grubość {THICKNESS_MM} mm · wysokość do {HEIGHT_RANGE.max} mm
          </p>
        </header>

        {editingId && (
          <p className="edit-banner" role="status">
            Edytujesz pozycję {String(editingIndex + 1).padStart(2, '0')} z koszyka – zapisz zmiany pod wynikiem.
          </p>
        )}

        <form key={formKey} className="steps" onSubmit={(e) => e.preventDefault()}>
          {steps.map((step, i) => (
            <Step key={step.title} n={i + 1} title={step.title} hint={step.hint}>
              {step.body}
            </Step>
          ))}
        </form>

        <ResultPanel result={result} heightMm={config.heightMm} />

        <div className="add-bar">
          {editingId ? (
            <>
              <button type="button" className="btn-primary" onClick={saveEdit} disabled={result.errors.length > 0}>
                Zapisz zmiany w pozycji {String(editingIndex + 1).padStart(2, '0')}
              </button>
              <button type="button" className="link-btn" onClick={() => setEditingId(null)}>
                Anuluj edycję
              </button>
            </>
          ) : (
            <button type="button" className="btn-primary" onClick={addToCart} disabled={result.errors.length > 0}>
              Dodaj do koszyka
            </button>
          )}
          <p className="add-bar__status" role="status">
            {cartMessage}
          </p>
        </div>

        <Cart
          lines={lines}
          editingId={editingId}
          onQty={(id, q) => setCart((c) => setQty(c, id, q))}
          onEdit={startEdit}
          onDuplicate={(id) => setCart((c) => duplicateItem(c, id))}
          onRemove={remove}
        />
        <SubmitCta lines={lines} />
      </main>
    </div>
  )
}
