import { useEffect, useMemo, useState, type CSSProperties, type ReactNode } from 'react'
import { ChoiceGroup } from './components/ChoiceGroup'
import { DimIcon } from './components/DimIcon'
import { FlutingProfile } from './components/FlutingProfile'
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
import { CookieNotice, PrivacyDialog, SiteFooter } from './components/SiteFooter'
import { SubmitForm } from './components/SubmitForm'
import { TYPE_ICONS } from './config/images'
import { allowedRadius, calculate, DEFAULT_CONFIGURATION, endingOf, isTall, type Configuration } from './lib/calculate'
import { extensionMm } from './lib/frontPath'
import { configFromHash } from './lib/share'
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

/** Sekcja konfiguratora: tytuł wersalikami + podtytuł (design system). */
function Section({ title, subtitle, hint, children }: { title: string; subtitle?: string; hint?: ReactNode; children: ReactNode }) {
  return (
    <fieldset className="section">
      <legend className="section__title">{title}</legend>
      {subtitle && <p className="section__sub">{subtitle}</p>}
      {hint && <p className="section__hint">{hint}</p>}
      {children}
    </fieldset>
  )
}

/** Karta wymiaru: ikona z zaznaczonym wymiarem, pod nią pola (opcjonalnie ze złotą literą wymiaru). */
function DimCard({ icon, title, letter, children }: { icon: ReactNode; title: string; letter?: string; children: ReactNode }) {
  return (
    <div className="dim-card" role="group" aria-label={title}>
      <div className="dim-card__icon">{icon}</div>
      <div className="dim-card__fields">
        {letter && (
          <span className="dim-chip" aria-hidden="true">
            {letter}
          </span>
        )}
        {children}
      </div>
    </div>
  )
}

/** Wysokość H: suwak na całą szerokość konfiguratora + pole do wpisania dokładnej wartości. */
function HeightField({ value, onChange }: { value: number; onChange: (value: number) => void }) {
  const { min, max } = HEIGHT_RANGE
  const v = Number.isFinite(value) ? Math.min(max, Math.max(min, value)) : min
  const pct = (x: number) => `${((x - min) / (max - min)) * 100}%`
  return (
    <div className="height-field">
      <div className="height-field__head">
        <label className="height-field__label" htmlFor="height-range">
          <span className="dim-chip" aria-hidden="true">
            H
          </span>
          Wysokość
        </label>
        <MmInput id="height" label="Wysokość H – dokładna wartość" value={value} min={min} max={max} onChange={onChange} />
      </div>
      <input
        id="height-range"
        className="range"
        type="range"
        min={min}
        max={max}
        step={10}
        value={v}
        style={{ '--fill': pct(v), '--tall': pct(TALL_HEIGHT_MM) } as CSSProperties}
        aria-valuetext={`${value} mm`}
        aria-describedby="height-scale"
        onChange={(e) => onChange(Number(e.target.value))}
      />
      <div className="height-field__scale" id="height-scale">
        <span>{min} mm</span>
        <span className="sr-only">Powyżej {TALL_HEIGHT_MM} mm (paski na suwaku) – tylko laminat gładki.</span>
        <span>{max} mm</span>
      </div>
    </div>
  )
}

/**
 * Pole w milimetrach (bez suwaka): trzyma surowy tekst, żeby dało się swobodnie wpisywać.
 * `zeroIsEmpty` – 0 oznacza „brak” (pole puste z podpowiedzią „0”); wypełnione pole ma złote podkreślenie.
 */
function MmInput({
  id,
  label,
  value,
  min,
  max,
  caption,
  zeroIsEmpty,
  disabled,
  onChange,
}: {
  id: string
  label: string
  value: number
  min: number
  max: number
  caption?: ReactNode
  zeroIsEmpty?: boolean
  disabled?: boolean
  onChange: (value: number) => void
}) {
  const shown = (v: number) => (!Number.isFinite(v) || (zeroIsEmpty && v === 0) ? '' : String(v))
  const [text, setText] = useState(shown(value))
  // Wartość zmieniona z zewnątrz (np. suwakiem) – pole pokazuje nową liczbę.
  const [prevValue, setPrevValue] = useState(value)
  if (!Object.is(prevValue, value)) {
    setPrevValue(value)
    const typed = text.trim() === '' ? (zeroIsEmpty ? 0 : NaN) : Number(text)
    if (!Object.is(typed, value)) setText(shown(value))
  }
  const filled = text.trim() !== '' && !(zeroIsEmpty && Number(text) === 0)
  const invalid = filled && !(Number(text) >= min && Number(text) <= max)
  return (
    <div className="mm-field">
      <label className={`mm-input${filled ? ' mm-input--filled' : ''}${invalid ? ' mm-input--invalid' : ''}`} htmlFor={id}>
        <span className="sr-only">{label}</span>
        <input
          id={id}
          type="number"
          inputMode="numeric"
          min={zeroIsEmpty ? 0 : min}
          max={max}
          step={1}
          placeholder="0"
          value={text}
          disabled={disabled}
          aria-invalid={invalid || undefined}
          aria-describedby={caption ? `${id}-caption` : undefined}
          onChange={(e) => {
            setText(e.target.value)
            onChange(e.target.value === '' ? (zeroIsEmpty ? 0 : NaN) : Number(e.target.value))
          }}
        />
        <span className="mm-input__unit" aria-hidden="true">
          mm
        </span>
      </label>
      {caption && (
        <span className="sr-only" id={`${id}-caption`}>
          {caption}
        </span>
      )}
    </div>
  )
}

export default function App() {
  // Link „Rzut” z maila (#rzut=…) otwiera dany front od razu w rzucie z góry.
  const [linked] = useState(() => configFromHash(window.location.hash))
  const [config, setConfig] = useState<Configuration>(linked ?? DEFAULT_CONFIGURATION)
  const result = useMemo(() => calculate(config), [config])

  // Koszyk: zapisywany w przeglądarce, żeby przetrwał odświeżenie strony.
  const [cart, setCart] = useState<CartItem[]>(loadCart)
  const [editingId, setEditingId] = useState<string | null>(null)
  const [cartMessage, setCartMessage] = useState('')
  const [drawerOpen, setDrawerOpen] = useState(false)
  // Polityka prywatności (opcjonalnie od razu na sekcji o cookies).
  const [privacy, setPrivacy] = useState<{ open: boolean; section?: 'cookies' }>({ open: false })
  const openPrivacy = (section?: 'cookies') => setPrivacy({ open: true, section })
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
  // Laminat tylko gładki: przy wyborze laminatu ryflowanie wraca do FG.
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

  const radii = frontType.radii
  // Pełna skala R ze wszystkich typów – promienie spoza zakresu typu są wyszarzone.
  const ALL_RADII = [...new Set(FRONT_TYPES.flatMap((ft) => ft.radii))].sort((a, b) => a - b)
  const radiusHint =
    radii.length === 1
      ? `Stały promień ${radii[0]} mm (po zewnętrznej powierzchni łuku).`
      : `Promień po zewnętrznej powierzchni łuku, ${radii[0]}–${radii[radii.length - 1]} mm co 50 mm.`

  const leftMm = extensionMm(config.extLeftMm)
  const rightMm = extensionMm(config.extRightMm)
  const icon = (src: string) => <img className="icon-img" src={src} alt="" />

  // Karty wymiarów – zależne od typu (wysokość ma osobny suwak).
  const dimCards: ReactNode[] = []
  if (t === 'narozne') {
    // Zakończenie wynika z przedłużeń: oba 0 → N0, jedno → N1, oba → N2.
    const ending = ENDINGS.find((e) => e.id === endingOf(config)) ?? ENDINGS[0]
    dimCards.push(
      <DimCard key="ext" icon={<DimIcon name="ext" left={leftMm > 0} right={rightMm > 0} />} title={`Przedłużenia – ${ending.name}`}>
        <MmInput
          id="ext-left"
          label="Przedłużenie lewe"
          value={config.extLeftMm}
          min={CORNER_EXTENSION.min}
          max={CORNER_EXTENSION.max}
          zeroIsEmpty
          caption={`brak albo ${CORNER_EXTENSION.min}–${CORNER_EXTENSION.max} mm`}
          onChange={(v) => set('extLeftMm', v)}
        />
        <MmInput
          id="ext-right"
          label="Przedłużenie prawe"
          value={config.extRightMm}
          min={CORNER_EXTENSION.min}
          max={CORNER_EXTENSION.max}
          zeroIsEmpty
          caption={`brak albo ${CORNER_EXTENSION.min}–${CORNER_EXTENSION.max} mm`}
          onChange={(v) => set('extRightMm', v)}
        />
      </DimCard>,
    )
  }
  if (t === 'przedluzane') {
    const min = config.radiusMm + EXTENDED_LENGTH.minAboveRadius
    dimCards.push(
      <DimCard key="L" icon={<DimIcon name="l" />} title="Wymiar L – od lica łuku do końca" letter="L">
        <MmInput
          key={`L-${config.radiusMm}`}
          id="length"
          label="Wymiar L"
          value={config.lengthMm}
          min={min}
          max={EXTENDED_LENGTH.max}
          caption={`${min}–${EXTENDED_LENGTH.max} mm`}
          onChange={(v) => set('lengthMm', v)}
        />
      </DimCard>,
    )
  }
  if (t === 'obustronne') {
    const zMin = config.radiusMm + DOUBLE_Z.minAboveRadius
    dimCards.push(
      <DimCard key="W" icon={<DimIcon name="w" />} title="Szerokość W" letter="W">
        <ChoiceGroup
          name="width"
          variant="grid"
          columns={3}
          value={config.widthMm}
          onChange={(v) => set('widthMm', v)}
          choices={DOUBLE_WIDTHS.map((w) => ({ value: w, label: w }))}
        />
      </DimCard>,
      <DimCard key="Z" icon={<DimIcon name="z" />} title="Boki Z – przedłużenie boków" letter="Z">
        <MmInput
          id="z"
          label="Wymiar Z – przedłużenie boków"
          value={config.sideExtension ? config.zMm : 0}
          min={zMin}
          max={DOUBLE_Z.max}
          zeroIsEmpty
          caption={`brak albo ${zMin}–${DOUBLE_Z.max} mm`}
          onChange={(v) => setConfig((c) => ({ ...c, sideExtension: v > 0, zMm: v > 0 ? v : c.zMm }))}
        />
      </DimCard>,
    )
  }

  const sections: { title: string; subtitle: string; hint?: ReactNode; body: ReactNode }[] = [
    {
      title: 'Typ frontu giętego',
      subtitle: 'Wybierz kształt',
      body: (
        <ChoiceGroup
          name="front-type"
          variant="cards"
          columns={4}
          value={t}
          onChange={setType}
          choices={FRONT_TYPES.map((ft) => ({
            value: ft.id,
            label: ft.name,
            hint: ft.short,
            icon: icon(TYPE_ICONS[ft.id]),
          }))}
        />
      ),
    },
    {
      title: 'Promień',
      subtitle: 'Wybierz promień gięcia R',
      hint: radiusHint,
      body: (
        <ChoiceGroup
          name="radius"
          variant="grid"
          columns={3}
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
      title: 'Wymiary',
      subtitle: 'Określ wysokość i przedłużenia',
      hint: tall ? `Powyżej ${TALL_HEIGHT_MM} mm front wykonujemy tylko z laminatu gładkiego.` : undefined,
      body: (
        <>
          <HeightField value={config.heightMm} onChange={setHeight} />
          {dimCards.length > 0 && <div className="dim-cards">{dimCards}</div>}
        </>
      ),
    },
    {
      title: 'Materiał',
      subtitle: 'Wybierz wykończenie',
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
      subtitle: material.colorRequired ? 'Wpisz kolor farby – wymagany' : 'Wpisz kolor – opcjonalnie',
      body: (
        <input
          className={`text-input${config.color.trim() ? ' text-input--filled' : ''}`}
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
      title: 'Ryflowanie',
      subtitle: 'Wybierz wzór frezowania lica',
      hint: material.smoothOnly ? `${material.name} występuje tylko w wersji gładkiej (FG).` : undefined,
      body: (
        <ChoiceGroup
          name="fluting"
          variant="tiles"
          columns={3}
          value={material.smoothOnly ? SMOOTH_FLUTING_ID : config.flutingId}
          onChange={(v) => set('flutingId', v)}
          choices={FLUTINGS.map((f) => ({
            value: f.id,
            label: f.id,
            hint: f.name,
            icon: <FlutingProfile profile={f.profile} />,
            // Laminat tylko gładki: pozostałe ryflowania widoczne, ale wyszarzone.
            disabled: material.smoothOnly && f.id !== SMOOTH_FLUTING_ID,
            disabledReason: material.id === 'laminat' ? 'Niedostępne dla laminatu' : `Niedostępne: ${material.name}`,
          }))}
        />
      ),
    },
  ]

  return (
    <div className="layout">
      <aside className="layout__viz" aria-label="Wizualizacja">
        <VisualizationPanel config={config} result={result} initialView={linked ? 'plan' : '3d'} />
      </aside>

      <main className="layout__config">
        <header className="page-head" id="konfigurator">
          <h1>Primo Front</h1>
          <p className="page-head__specs">
            Kalkulator frontów giętych · grubość {THICKNESS_MM} mm · H do {HEIGHT_RANGE.max} mm
          </p>
        </header>

        {editingId && (
          <p className="edit-banner" role="status">
            Edytujesz pozycję {String(editingIndex + 1).padStart(2, '0')} z koszyka – zapisz zmiany pod wynikiem.
          </p>
        )}

        <form key={formKey} className="sections" onSubmit={(e) => e.preventDefault()}>
          {sections.map((section) => (
            <Section key={section.title} title={section.title} subtitle={section.subtitle} hint={section.hint}>
              {section.body}
            </Section>
          ))}

          {/* Bryła – opcja dla każdego typu, jako drobny dopisek zamiast osobnej sekcji. */}
          <label className="check" htmlFor="body">
            <input id="body" type="checkbox" checked={config.body} onChange={(e) => set('body', e.target.checked)} />
            <span className="check__box" aria-hidden="true">
              <svg viewBox="0 0 16 16">
                <path d="M3.5 8.5 6.5 11.5 12.5 4.5" />
              </svg>
            </span>
            <span className="check__text">
              <span className="check__label">Bryła – front + środek</span>
              <span className="check__hint">Jest możliwość wykonania całej bryły: frontu wraz ze środkiem.</span>
            </span>
          </label>
        </form>

        <ResultPanel result={result}>
          <div className="add-bar">
            {editingId ? (
              <>
                <button type="button" className="btn-primary btn-cta" onClick={saveEdit} disabled={result.errors.length > 0}>
                  Zapisz zmiany w pozycji {String(editingIndex + 1).padStart(2, '0')}
                </button>
                <button type="button" className="btn-secondary" onClick={() => setEditingId(null)}>
                  Anuluj edycję
                </button>
              </>
            ) : (
              <>
                <button type="button" className="btn-primary btn-cta" onClick={addToCart} disabled={result.errors.length > 0}>
                  Dodaj do koszyka
                </button>
                <button type="button" className="btn-secondary" onClick={() => setDrawerOpen(true)}>
                  Zobacz koszyk{pieces > 0 ? ` (${pieces})` : ''}
                </button>
              </>
            )}
            <p className="add-bar__status" role="status">
              {cartMessage}
            </p>
          </div>
        </ResultPanel>

        <SiteFooter onPrivacy={openPrivacy} />
      </main>

      <CookieNotice onPrivacy={openPrivacy} />
      <PrivacyDialog open={privacy.open} section={privacy.section} onClose={() => setPrivacy({ open: false })} />
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
