import { useEffect, useMemo, useState, type ReactNode } from 'react'
import { ChoiceGroup } from './components/ChoiceGroup'
import { ResultPanel } from './components/ResultPanel'
import { VisualizationPanel } from './components/VisualizationPanel'
import {
  CORNER_EXTENSION,
  DOUBLE_WIDTHS,
  DOUBLE_Z,
  ENDINGS,
  EXTENDED_LENGTH,
  FLUTINGS,
  FRONT_TYPES,
  HEIGHT_RANGE,
  MATERIALS,
  SMOOTH_FLUTING_ID,
  TALL_HEIGHT_MM,
  THICKNESS_MM,
  type FrontTypeId,
  type MaterialId,
} from './config/catalog'
import { Cart } from './components/Cart'
import { CartButton, CartDrawer } from './components/CartDrawer'
import { CtaBanner } from './components/CtaBanner'
import { SubmitForm } from './components/SubmitForm'
import { catalogImage, extendedImage, TYPE_IMAGES } from './config/images'
import { allowedRadius, calculate, cornerExtensions, DEFAULT_CONFIGURATION, isTall, type Configuration } from './lib/calculate'
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
  const [drawerOpen, setDrawerOpen] = useState(false)
  // Zmiana klucza przebudowuje pola formularza po wczytaniu frontu do edycji.
  const [formKey, setFormKey] = useState(0)
  useEffect(() => saveCart(cart), [cart])
  const lines = useMemo(() => cartLines(cart), [cart])
  const pieces = lines.reduce((n, l) => n + l.item.qty, 0)
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
    setDrawerOpen(true)
  }
  const startEdit = (id: string) => {
    const item = cart.find((i) => i.id === id)
    if (!item) return
    setConfig({ ...item.config })
    setEditingId(id)
    setFormKey((k) => k + 1)
    setCartMessage('')
    setDrawerOpen(false)
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
  // Powyżej 2780 mm tylko laminat gładki – przełączamy materiał od razu.
  const smoothOnlyMaterial = MATERIALS.find((m) => m.smoothOnly) ?? MATERIALS[0]
  const setHeight = (heightMm: number) =>
    setConfig((c) =>
      isTall(heightMm) && heightMm <= HEIGHT_RANGE.max && !MATERIALS.find((m) => m.id === c.materialId)?.smoothOnly
        ? { ...c, heightMm, materialId: smoothOnlyMaterial.id, flutingId: SMOOTH_FLUTING_ID }
        : { ...c, heightMm },
    )
  const tall = isTall(config.heightMm)
  const exts = cornerExtensions(config)

  const radii = frontType.radii
  // Pełna skala R ze wszystkich typów – promienie spoza zakresu typu są wyszarzone.
  const ALL_RADII = [...new Set(FRONT_TYPES.flatMap((ft) => ft.radii))].sort((a, b) => a - b)
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
            choices={ALL_RADII.map((r) => ({
              value: r,
              label: r,
              disabled: !radii.includes(r),
              disabledReason: `Niedostępne dla typu „${frontType.name}”`,
            }))}
          />
        ),
      },
      {
        title: 'Wysokość H',
        hint: tall
          ? `Powyżej ${TALL_HEIGHT_MM} mm front wykonujemy tylko z laminatu gładkiego.`
          : `Powyżej ${TALL_HEIGHT_MM} mm dostępny jest tylko laminat gładki.`,
        body: (
          <NumberField
            id="height"
            label="Wysokość H"
            value={config.heightMm}
            min={HEIGHT_RANGE.min}
            max={HEIGHT_RANGE.max}
            step={HEIGHT_RANGE.step}
            onChange={setHeight}
          />
        ),
      },
  )
  if (t === 'narozne') {
    steps.push({
      title: 'Zakończenie',
      hint: 'Proste przedłużenia frontu, np. do montażu zawiasów – długość wpisz pod rysunkami.',
      body: (
        <>
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
          {/* N0 – brak pól, N1 – jedno (prawe), N2 – lewe i prawe. */}
          {exts > 0 && (
            <div className="ext-fields">
              {exts === 2 && (
                <div>
                  <span className="ext-fields__label">Przedłużenie lewe (początek frontu)</span>
                  <NumberField
                    id="ext-left"
                    label="Przedłużenie lewe"
                    value={config.extLeftMm}
                    min={CORNER_EXTENSION.min}
                    max={CORNER_EXTENSION.max}
                    step={1}
                    onChange={(v) => set('extLeftMm', v)}
                  />
                </div>
              )}
              <div>
                <span className="ext-fields__label">Przedłużenie prawe (koniec łuku)</span>
                <NumberField
                  id="ext-right"
                  label="Przedłużenie prawe"
                  value={config.extRightMm}
                  min={CORNER_EXTENSION.min}
                  max={CORNER_EXTENSION.max}
                  step={1}
                  onChange={(v) => set('extRightMm', v)}
                />
              </div>
            </div>
          )}
        </>
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
        choices={FLUTINGS.map((f) => ({
          value: f.id,
          label: f.id,
          hint: f.name,
          image: catalogImage(f.id),
          // Laminat tylko gładki: pozostałe ryflowania widoczne, ale wyszarzone.
          disabled: material.smoothOnly && f.id !== SMOOTH_FLUTING_ID,
          disabledReason: material.id === 'laminat' ? 'Niedostępne dla laminatu' : `Niedostępne: ${material.name}`,
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
          variant="cards"
          columns={3}
          choices={MATERIALS.map((m) => ({
            value: m.id,
            label: m.name,
            hint: m.smoothOnly ? `Tylko gładki (${SMOOTH_FLUTING_ID})` : 'Wszystkie ryflowania',
            disabled: tall && !m.smoothOnly,
            disabledReason: `Niedostępne przy H > ${TALL_HEIGHT_MM} mm`,
          }))}
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
    {
      title: 'Bryła',
      hint: 'Sam front albo bryła – front wraz ze środkiem.',
      body: (
        <ChoiceGroup
          name="body"
          variant="cards"
          columns={2}
          value={config.body ? 'body' : 'front'}
          onChange={(v) => set('body', v === 'body')}
          choices={[
            { value: 'front', label: 'Sam front', hint: 'Tylko front gięty' },
            { value: 'body', label: 'Bryła', hint: 'Front + środek' },
          ]}
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
          <p className="page-head__eyebrow">Fronty Primo — katalog 2026</p>
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

        <ResultPanel result={result} />

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
            {cartMessage}{' '}
            {cartMessage && !editingId && (
              <button type="button" className="link-btn" onClick={() => setDrawerOpen(true)}>
                Zobacz koszyk
              </button>
            )}
          </p>
        </div>

        <CtaBanner lines={lines} onOpenCart={() => setDrawerOpen(true)} />
      </main>

      <CartButton count={pieces} open={drawerOpen} onClick={() => setDrawerOpen(true)} />
      <CartDrawer open={drawerOpen} onClose={() => setDrawerOpen(false)}>
        <Cart
          lines={lines}
          editingId={editingId}
          onQty={(id, q) => setCart((c) => setQty(c, id, q))}
          onEdit={startEdit}
          onDuplicate={(id) => setCart((c) => duplicateItem(c, id))}
          onRemove={remove}
          headerAction={
            <button type="button" className="drawer__close" onClick={() => setDrawerOpen(false)} aria-label="Zamknij koszyk">
              ✕
            </button>
          }
          footer={
            <SubmitForm
              lines={lines}
              onClear={() => {
                setCart([])
                setEditingId(null)
              }}
            />
          }
        />
      </CartDrawer>
    </div>
  )
}
