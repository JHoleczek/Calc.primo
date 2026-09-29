import {
  CORNER_EXTENSION,
  DEFAULT_HEIGHT_MM,
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
  type EndingId,
  type FrontTypeId,
  type MaterialId,
} from '../config/catalog'
import { frontPath, pathLength, segmentLength } from './frontPath'

export interface Configuration {
  typeId: FrontTypeId
  /** Promień R po licu zewnętrznym [mm]. */
  radiusMm: number
  heightMm: number
  /** Narożne: zakończenie N0 / N1 / N2. */
  endingId: EndingId
  /** Narożne N2: przedłużenie lewe [mm]. */
  extLeftMm: number
  /** Narożne N1/N2: przedłużenie prawe [mm]. */
  extRightMm: number
  /** Przedłużane: całkowity wymiar L [mm]. */
  lengthMm: number
  /** Obustronne: szerokość W [mm]. */
  widthMm: number
  /** Obustronne: przedłużenie boków (wariant -Z). */
  sideExtension: boolean
  /** Obustronne: całkowita głębokość Z [mm]. */
  zMm: number
  flutingId: string
  materialId: MaterialId
  color: string
  /** Bryła: front + środek (zamiast samego frontu). */
  body: boolean
}

export const DEFAULT_CONFIGURATION: Configuration = {
  typeId: 'narozne',
  radiusMm: 300,
  heightMm: DEFAULT_HEIGHT_MM,
  endingId: 'n2',
  extLeftMm: CORNER_EXTENSION.default,
  extRightMm: CORNER_EXTENSION.default,
  lengthMm: EXTENDED_LENGTH.default,
  widthMm: DOUBLE_WIDTHS[0],
  sideExtension: false,
  zMm: DOUBLE_Z.default,
  flutingId: SMOOTH_FLUTING_ID,
  materialId: MATERIALS[0].id,
  color: '',
  body: false,
}

/** Uzupełnia konfigurację zapisaną przez starszą wersję (np. koszyk w przeglądarce). */
export function normalizeConfiguration(config: Partial<Configuration>): Configuration {
  return { ...DEFAULT_CONFIGURATION, ...config }
}

/** Liczba przedłużeń narożnika: N0 – 0, N1 – 1 (prawe), N2 – 2 (lewe i prawe). */
export function cornerExtensions(config: Pick<Configuration, 'typeId' | 'endingId'>): 0 | 1 | 2 {
  if (config.typeId !== 'narozne') return 0
  return (ENDINGS.find((e) => e.id === config.endingId) ?? ENDINGS[0]).extensions
}

/** Wysokość wymagająca laminatu gładkiego i dopłaty. */
export const isTall = (heightMm: number) => heightMm > TALL_HEIGHT_MM

/** Promień dozwolony dla danego typu (najbliższy z listy katalogowej). */
export function allowedRadius(typeId: FrontTypeId, radiusMm: number): number {
  const radii = (FRONT_TYPES.find((t) => t.id === typeId) ?? FRONT_TYPES[0]).radii
  if (radii.length === 0 || radii.includes(radiusMm)) return radiusMm
  return radii.reduce((best, r) => (Math.abs(r - radiusMm) < Math.abs(best - radiusMm) ? r : best), radii[0])
}

export type NoteLevel = 'info' | 'addon' | 'warning'

export interface Note {
  level: NoteLevel
  text: string
}

/** Wynik liczony po licu zewnętrznym (R to promień powierzchni zewnętrznej). */
export interface Result {
  /** Kod elementu z katalogu, np. „EG-N2-R300”. */
  code: string
  /** Kod ryflowania, np. „F03”. */
  flutingCode: string
  /** Łuki po zewnętrznej [mm]. */
  arcMm: number
  /** Odcinki proste [mm]. */
  straightMm: number
  /** Rozwinięcie: łuki + odcinki proste [mm]. */
  developedMm: number
  /** Powierzchnia rozwinięta [m²] = (łuki + odcinki proste) × H. */
  areaM2: number
  notes: Note[]
  errors: string[]
}

const mmText = (mm: number) => (Number.isFinite(mm) ? `${Math.round(mm)} mm` : '—')

/** Opis przedłużeń narożnika, np. „lewe 50 mm, prawe 80 mm”; pusty dla N0 i innych typów. */
export function extensionText(config: Configuration): string {
  const exts = cornerExtensions(config)
  if (exts === 0) return ''
  if (exts === 1) return `przedłużenie prawe ${mmText(config.extRightMm)}`
  return `przedłużenie lewe ${mmText(config.extLeftMm)}, prawe ${mmText(config.extRightMm)}`
}

const pad3 = (n: number) => String(Math.round(n)).padStart(3, '0')

function catalogCode(c: Configuration): string {
  switch (c.typeId) {
    case 'narozne':
      return `EG-${c.endingId.toUpperCase()}-R${pad3(c.radiusMm)}`
    case 'przedluzane':
      return `EG-N1-R${pad3(c.radiusMm)}-L${Math.round(c.lengthMm)}`
    case 'obustronne':
      return `EG-D-R${c.radiusMm}-W${c.widthMm}${c.sideExtension ? `-Z${Math.round(c.zMm)}` : ''}`
    case 'luk':
      return `EG-P-R${c.radiusMm}`
  }
}

export function calculate(config: Configuration): Result {
  const material = MATERIALS.find((m) => m.id === config.materialId) ?? MATERIALS[0]
  // Laminat występuje tylko jako gładki – ryflowanie ignorujemy.
  const flutingId = material.smoothOnly ? SMOOTH_FLUTING_ID : config.flutingId
  const fluting = FLUTINGS.find((f) => f.id === flutingId) ?? FLUTINGS[0]

  const errors: string[] = []
  if (!(config.heightMm >= HEIGHT_RANGE.min && config.heightMm <= HEIGHT_RANGE.max)) {
    errors.push(`Wysokość H musi mieścić się w zakresie ${HEIGHT_RANGE.min}–${HEIGHT_RANGE.max} mm.`)
  }
  const exts = cornerExtensions(config)
  const extChecks: [string, number][] = [
    ...(exts === 2 ? ([['lewe', config.extLeftMm]] as [string, number][]) : []),
    ...(exts >= 1 ? ([['prawe', config.extRightMm]] as [string, number][]) : []),
  ]
  for (const [side, mm] of extChecks) {
    if (!(mm >= CORNER_EXTENSION.min && mm <= CORNER_EXTENSION.max)) {
      errors.push(`Przedłużenie ${side} musi mieścić się w zakresie ${CORNER_EXTENSION.min}–${CORNER_EXTENSION.max} mm.`)
    }
  }
  if (isTall(config.heightMm) && config.heightMm <= HEIGHT_RANGE.max && !material.smoothOnly) {
    errors.push(`Przy wysokości H powyżej ${TALL_HEIGHT_MM} mm dostępny jest tylko laminat gładki – zmień materiał.`)
  }
  if (config.typeId === 'przedluzane') {
    const min = config.radiusMm + EXTENDED_LENGTH.minAboveRadius
    if (!(config.lengthMm >= min && config.lengthMm <= EXTENDED_LENGTH.max)) {
      errors.push(`Wymiar L dla R${config.radiusMm} musi mieścić się w zakresie ${min}–${EXTENDED_LENGTH.max} mm.`)
    }
  }
  if (config.typeId === 'obustronne' && config.sideExtension) {
    const min = config.radiusMm + DOUBLE_Z.minAboveRadius
    if (!(config.zMm >= min && config.zMm <= DOUBLE_Z.max)) {
      errors.push(`Wymiar Z musi mieścić się w zakresie ${min}–${DOUBLE_Z.max} mm.`)
    }
  }
  const color = config.color.trim()

  const path = frontPath(config)
  let arcMm = 0
  let straightMm = 0
  for (const s of path.segments) {
    if (s.kind === 'arc') arcMm += segmentLength(s)
    else straightMm += s.length
  }
  const developedMm = pathLength(path)

  const notes: Note[] = []
  if (exts > 0) {
    const ending = ENDINGS.find((e) => e.id === config.endingId) ?? ENDINGS[0]
    notes.push({
      level: 'addon',
      text: `Zakończenie ${ending.name}: ${extensionText(config)}`,
    })
  }
  if (config.body) {
    notes.push({ level: 'addon', text: 'Bryła: front + środek' })
  }
  if (isTall(config.heightMm) && config.heightMm <= HEIGHT_RANGE.max) {
    notes.push({ level: 'info', text: `Wysokość powyżej ${TALL_HEIGHT_MM} mm – wykonanie tylko z laminatu gładkiego.` })
  }
  if (config.typeId === 'przedluzane') {
    notes.push({ level: 'addon', text: `Przedłużenie proste: ${Math.round(config.lengthMm - config.radiusMm)} mm (L ${Math.round(config.lengthMm)})` })
  }
  if (config.typeId === 'obustronne' && config.sideExtension) {
    notes.push({ level: 'addon', text: `Przedłużenie boków: 2 × ${Math.round(config.zMm - config.radiusMm)} mm (Z ${Math.round(config.zMm)})` })
  }
  if (fluting.id !== SMOOTH_FLUTING_ID) {
    notes.push({ level: 'addon', text: `Ryflowanie ${fluting.id} – ${fluting.name}` })
  }
  // Brak koloru nie wpływa na m² – tylko przypominamy, że jest potrzebny do zamówienia.
  if (material.colorRequired && color === '') {
    notes.push({ level: 'warning', text: `Wpisz kolor farby – wymagany do zamówienia frontu ${material.name.toLowerCase()}go.` })
  }
  if (color !== '') {
    const label = material.id === 'lakierowane' ? 'Lakierowanie w kolorze' : 'Wykończenie'
    notes.push({ level: 'addon', text: `${label}: ${color}` })
  }

  return {
    code: catalogCode(config),
    flutingCode: fluting.id,
    arcMm,
    straightMm,
    developedMm,
    areaM2: (developedMm * config.heightMm) / 1_000_000,
    notes,
    errors,
  }
}
