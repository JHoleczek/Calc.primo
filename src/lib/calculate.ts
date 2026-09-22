import {
  DEFAULT_HEIGHT_MM,
  ENDINGS,
  EXTENSION_RANGE,
  FLUTINGS,
  FRONT_TYPES,
  HEIGHT_OVERSIZE_FROM_MM,
  HEIGHT_RANGE,
  MATERIALS,
  NO_FLUTING_ID,
  type EndingId,
  type MaterialId,
} from '../config/catalog'

/** Po której powierzchni liczymy rozwinięcie. */
export type MeasureSide = 'outer' | 'inner'

export interface Configuration {
  frontTypeId: string
  radiusMm: number
  heightMm: number
  endingId: EndingId
  extensionMm: number
  flutingId: string
  materialId: MaterialId
  color: string
  measureSide: MeasureSide
}

export const DEFAULT_CONFIGURATION: Configuration = {
  frontTypeId: FRONT_TYPES[0].id,
  radiusMm: 300,
  heightMm: DEFAULT_HEIGHT_MM,
  endingId: 'n0',
  extensionMm: EXTENSION_RANGE.default,
  flutingId: NO_FLUTING_ID,
  materialId: MATERIALS[0].id,
  color: '',
  measureSide: 'outer',
}

export interface SideMeasure {
  /** Promień danej powierzchni [mm]. */
  radiusMm: number
  /** Długość samego łuku [mm]. */
  arcMm: number
  /** Rozwinięcie: łuk + przedłużenia [mm]. */
  developedMm: number
  /** Metry bieżące (rozwinięcie w m). */
  linearM: number
  /** Powierzchnia rozwinięta [m²]. */
  areaM2: number
}

export type NoteLevel = 'info' | 'addon' | 'warning'

export interface Note {
  level: NoteLevel
  text: string
}

export interface Result {
  /** Suma przedłużeń prostych [mm]. */
  extensionsTotalMm: number
  outer: SideMeasure
  inner: SideMeasure
  /** Strona wybrana do rozliczenia. */
  billed: SideMeasure
  notes: Note[]
  errors: string[]
}

function measure(radiusMm: number, angleDeg: number, extensionsTotalMm: number, heightMm: number): SideMeasure {
  const arcMm = (angleDeg * Math.PI * radiusMm) / 180
  const developedMm = arcMm + extensionsTotalMm
  return {
    radiusMm,
    arcMm,
    developedMm,
    linearM: developedMm / 1000,
    areaM2: (developedMm * heightMm) / 1_000_000,
  }
}

export function calculate(config: Configuration): Result {
  const frontType = FRONT_TYPES.find((t) => t.id === config.frontTypeId) ?? FRONT_TYPES[0]
  const ending = ENDINGS.find((e) => e.id === config.endingId) ?? ENDINGS[0]
  const material = MATERIALS.find((m) => m.id === config.materialId) ?? MATERIALS[0]
  const fluting = FLUTINGS.find((f) => f.id === config.flutingId) ?? FLUTINGS[0]

  const errors: string[] = []
  if (!(config.heightMm >= HEIGHT_RANGE.min && config.heightMm <= HEIGHT_RANGE.max)) {
    errors.push(`Wysokość H musi mieścić się w zakresie ${HEIGHT_RANGE.min}–${HEIGHT_RANGE.max} mm.`)
  }
  if (
    ending.extensions > 0 &&
    !(config.extensionMm >= EXTENSION_RANGE.min && config.extensionMm <= EXTENSION_RANGE.max)
  ) {
    errors.push(
      `Długość przedłużenia musi mieścić się w zakresie ${EXTENSION_RANGE.min}–${EXTENSION_RANGE.max} mm.`,
    )
  }
  const color = config.color.trim()
  if (material.colorRequired && color === '') {
    errors.push(`Dla materiału „${material.name}” wpisz kolor farby.`)
  }

  const extensionsTotalMm = ending.extensions * (ending.extensions > 0 ? config.extensionMm : 0)
  // R to promień wewnętrzny łuku; strona zewnętrzna jest większa o grubość frontu.
  const inner = measure(config.radiusMm, frontType.angleDeg, extensionsTotalMm, config.heightMm)
  const outer = measure(
    config.radiusMm + material.thicknessMm,
    frontType.angleDeg,
    extensionsTotalMm,
    config.heightMm,
  )

  const notes: Note[] = []
  if (ending.extensions > 0) {
    notes.push({
      level: 'addon',
      text: `Przedłużenie proste ${ending.name}: ${ending.extensions} × ${config.extensionMm} mm`,
    })
  }
  if (fluting.id !== NO_FLUTING_ID) {
    notes.push({ level: 'addon', text: `Ryflowanie ${fluting.name} (${fluting.description})` })
  }
  if (color !== '') {
    const label = material.id === 'lakierowane' ? 'Lakierowanie w kolorze' : 'Wykończenie'
    notes.push({ level: 'addon', text: `${label}: ${color}` })
  }
  if (config.heightMm > HEIGHT_OVERSIZE_FROM_MM) {
    notes.push({
      level: 'warning',
      text: `Wysokość ponadstandardowa (> ${HEIGHT_OVERSIZE_FROM_MM} mm) – wycena indywidualna.`,
    })
  }
  notes.push({
    level: 'info',
    text: `Grubość frontu ${material.thicknessMm} mm – różnica rozwinięć stron: ${(outer.arcMm - inner.arcMm).toFixed(1)} mm.`,
  })

  return {
    extensionsTotalMm,
    outer,
    inner,
    billed: config.measureSide === 'outer' ? outer : inner,
    notes,
    errors,
  }
}
