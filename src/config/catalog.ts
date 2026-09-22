// Dane katalogowe kalkulatora frontów giętych – na podstawie
// „Fronty Primo — Katalog frontów giętych 2026” (https://katalog.primomeble.pl/).
// Cała logika UI, obliczeń i rysunków czyta wyłącznie z tego pliku.

/** Grubość wszystkich frontów giętych [mm]. */
export const THICKNESS_MM = 18

/** Wysokość H [mm]. */
export const HEIGHT_RANGE = { min: 100, max: 3200, step: 1 }

/** Domyślna wysokość H [mm]. */
export const DEFAULT_HEIGHT_MM = 720

export type FrontTypeId = 'narozne' | 'przedluzane' | 'obustronne' | 'luk' | 'bryla'

export interface FrontType {
  id: FrontTypeId
  name: string
  description: string
  /** Dostępne promienie R [mm] (po licu zewnętrznym); pusta lista = brak wyboru. */
  radii: number[]
}

const range = (from: number, to: number, step: number) =>
  Array.from({ length: Math.floor((to - from) / step) + 1 }, (_, i) => from + i * step)

export const FRONT_TYPES: FrontType[] = [
  {
    id: 'narozne',
    name: 'Narożne',
    description: 'Łuk 90°, zakończenia N0 / N1 / N2',
    radii: range(50, 600, 50),
  },
  {
    id: 'przedluzane',
    name: 'Przedłużane',
    description: 'Łuk 90° z prostym przedłużeniem, wymiar L max 700',
    radii: range(50, 600, 50),
  },
  {
    id: 'obustronne',
    name: 'Obustronne',
    description: 'Dwa łuki R100, szerokość W 600 / 700 / 800',
    radii: [100],
  },
  {
    id: 'luk',
    name: 'W łuk',
    description: 'Półokrąg 180°',
    radii: range(200, 400, 50),
  },
  {
    id: 'bryla',
    name: 'Bryła',
    description: 'Rzeźbiona bryła, wycena indywidualna',
    radii: [],
  },
]

/** Zakończenia elementów narożnych. */
export type EndingId = 'n0' | 'n1' | 'n2'

export interface Ending {
  id: EndingId
  name: string
  /** Liczba prostych przedłużeń (0, 1 lub 2). */
  extensions: 0 | 1 | 2
  description: string
}

export const ENDINGS: Ending[] = [
  { id: 'n0', name: 'N0', extensions: 0, description: 'Bez przedłużenia' },
  { id: 'n1', name: 'N1', extensions: 1, description: 'Przedłużenie jednostronne' },
  { id: 'n2', name: 'N2', extensions: 2, description: 'Przedłużenie obustronne' },
]

/** Przedłużenie narożnika N1/N2 [mm] – np. do montażu zawiasów. */
export const CORNER_EXTENSION_MM = 50

/** Elementy przedłużane: całkowity wymiar L (od lica łuku do końca przedłużenia) [mm]. */
export const EXTENDED_LENGTH = { max: 700, minAboveRadius: 50, default: 700 }

/** Elementy obustronne: szerokość W i opcjonalne przedłużenie boków Z [mm]. */
export const DOUBLE_WIDTHS = [600, 700, 800]
export const DOUBLE_Z = { max: 200, minAboveRadius: 10, default: 200 }

/**
 * Kształt frezu w przekroju (patrząc z góry):
 * - round: rowek łukowy (fala), u: wpust z zaokrąglonym dnem, square: wpust prostokątny,
 * - v: klin / rowek trójkątny, rib: wałek (wypukłe żebro na całą podziałkę).
 */
export type FlutingShape = 'round' | 'u' | 'square' | 'v' | 'rib'

export interface FlutingProfile {
  shape: FlutingShape
  /** Szerokość rowka [mm] (dla 'rib' – szerokość wałka). */
  widthMm: number
  /** Rozstaw osi rowków [mm]. */
  pitchMm: number
  /** Głębokość frezu [mm]. */
  depthMm: number
}

export interface Fluting {
  id: string
  name: string
  /** Profil do wizualizacji; brak = lico gładkie. */
  profile?: FlutingProfile
}

export const SMOOTH_FLUTING_ID = 'F00'

/** Ryflowanie F00–F13; wymiary z rysunków katalogowych (środki podanych zakresów). */
export const FLUTINGS: Fluting[] = [
  { id: 'F00', name: 'Gładki' },
  { id: 'F01', name: 'Wpust 15', profile: { shape: 'u', widthMm: 15, pitchMm: 27, depthMm: 3 } },
  { id: 'F02', name: 'Klin 15', profile: { shape: 'v', widthMm: 15, pitchMm: 27, depthMm: 3 } },
  { id: 'F03', name: 'Fala 18', profile: { shape: 'round', widthMm: 18, pitchMm: 19.5, depthMm: 4 } },
  { id: 'F04', name: 'Fala 12', profile: { shape: 'u', widthMm: 11.5, pitchMm: 14.5, depthMm: 3 } },
  { id: 'F05', name: 'Wałek 19', profile: { shape: 'rib', widthMm: 19, pitchMm: 19, depthMm: 5 } },
  { id: 'F06', name: 'Wałek 25', profile: { shape: 'rib', widthMm: 25, pitchMm: 25, depthMm: 5 } },
  { id: 'F07', name: 'Wałek 9', profile: { shape: 'rib', widthMm: 9, pitchMm: 9, depthMm: 4 } },
  { id: 'F08', name: 'Wpust 20', profile: { shape: 'square', widthMm: 20, pitchMm: 40, depthMm: 4 } },
  { id: 'F09', name: 'Rowek 6', profile: { shape: 'v', widthMm: 6, pitchMm: 25, depthMm: 3 } },
  { id: 'F10', name: 'Rowek 3', profile: { shape: 'square', widthMm: 3, pitchMm: 23, depthMm: 3 } },
  { id: 'F11', name: 'Wpust 10', profile: { shape: 'square', widthMm: 10, pitchMm: 20, depthMm: 4 } },
  { id: 'F12', name: 'Fala 10', profile: { shape: 'round', widthMm: 10, pitchMm: 11.5, depthMm: 5 } },
  { id: 'F13', name: 'Klin 10', profile: { shape: 'v', widthMm: 8, pitchMm: 18, depthMm: 5 } },
]

export type MaterialId = 'lamelowane' | 'fornirowane' | 'lakierowane'

export interface Material {
  id: MaterialId
  name: string
  /** Czy kolor (farba) jest wymagany. */
  colorRequired: boolean
  colorPlaceholder: string
}

export const MATERIALS: Material[] = [
  { id: 'lamelowane', name: 'Lamelowane', colorRequired: false, colorPlaceholder: 'np. olej naturalny, bejca orzech' },
  { id: 'fornirowane', name: 'Fornirowane', colorRequired: false, colorPlaceholder: 'np. dąb naturalny, bejca' },
  { id: 'lakierowane', name: 'Lakierowane', colorRequired: true, colorPlaceholder: 'np. RAL 9010, NCS S 0502-Y' },
]

/** Kontakt do wyceny (z katalogu). */
export const CONTACT = { email: 'biuro.primomeble@gmail.com', phone: '691-766-559' }
