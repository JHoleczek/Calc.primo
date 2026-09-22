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

export interface Configuration {
  frontTypeId: string
  radiusMm: number
  heightMm: number
  endingId: EndingId
  extensionMm: number
  flutingId: string
  materialId: MaterialId
  color: string
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
}

export type NoteLevel = 'info' | 'addon' | 'warning'

export interface Note {
  level: NoteLevel
  text: string
}

/** Wynik liczony po licu zewnętrznym (R to promień powierzchni zewnętrznej). */
export interface Result {
  /** Promień zewnętrzny R [mm]. */
  radiusMm: number
  /** Długość łuku po zewnętrznej [mm]. */
  arcMm: number
  /** Suma przedłużeń prostych [mm]. */
  extensionsTotalMm: number
  /** Rozwinięcie: łuk + przedłużenia [mm]. */
  developedMm: number
  /** Metry bieżące (rozwinięcie w m). */
  linearM: number
  /** Powierzchnia rozwinięta [m²]. */
  areaM2: number
  notes: Note[]
  errors: string[]
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

  const extensionsTotalMm = ending.extensions > 0 ? ending.extensions * config.extensionMm : 0
  // R to promień lica zewnętrznego – po nim liczymy rozwinięcie.
  const arcMm = (frontType.angleDeg * Math.PI * config.radiusMm) / 180
  const developedMm = arcMm + extensionsTotalMm

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
  return {
    radiusMm: config.radiusMm,
    arcMm,
    extensionsTotalMm,
    developedMm,
    linearM: developedMm / 1000,
    areaM2: (developedMm * config.heightMm) / 1_000_000,
    notes,
    errors,
  }
}
