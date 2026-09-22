// Dane katalogowe kalkulatora frontów giętych.
//
// UWAGA: nazwy, kody i progi poniżej są PLACEHOLDERAMI do uzupełnienia
// na podstawie https://katalog.primomeble.pl/#katalog. Cała logika UI i
// obliczeń czyta wyłącznie z tego pliku, więc aktualizacja katalogu
// sprowadza się do edycji tych tablic.

export type BendDirection = 'convex' | 'concave'

export interface FrontType {
  id: string
  name: string
  /** Kąt gięcia łuku w stopniach. */
  angleDeg: number
  /** Wypukły (lico na zewnątrz łuku) lub wklęsły (lico wewnątrz łuku). */
  direction: BendDirection
  description: string
}

export const FRONT_TYPES: FrontType[] = [
  {
    id: 'FG-90-W',
    name: 'Łuk 90° wypukły',
    angleDeg: 90,
    direction: 'convex',
    description: 'Narożnik zewnętrzny, ćwiartka okręgu',
  },
  {
    id: 'FG-90-K',
    name: 'Łuk 90° wklęsły',
    angleDeg: 90,
    direction: 'concave',
    description: 'Narożnik wewnętrzny, ćwiartka okręgu',
  },
  {
    id: 'FG-180-W',
    name: 'Półłuk 180° wypukły',
    angleDeg: 180,
    direction: 'convex',
    description: 'Zakończenie zabudowy, półokrąg',
  },
  {
    id: 'FG-45-W',
    name: 'Łuk 45° wypukły',
    angleDeg: 45,
    direction: 'convex',
    description: 'Narożnik ścięty, 1/8 okręgu',
  },
]

/** Promień R [mm]: 50–600 co 50. */
export const RADIUS_OPTIONS: number[] = Array.from({ length: 12 }, (_, i) => 50 + i * 50)

/** Wysokość H [mm]. */
export const HEIGHT_RANGE = { min: 100, max: 3600, step: 1 }

/** Domyślna wysokość H [mm]. */
export const DEFAULT_HEIGHT_MM = 720

/** Powyżej tej wysokości front traktujemy jako ponadstandardowy. */
export const HEIGHT_OVERSIZE_FROM_MM = 2800

export type EndingId = 'n0' | 'n1' | 'n2'

export interface Ending {
  id: EndingId
  name: string
  /** Liczba prostych przedłużeń (0, 1 lub 2). */
  extensions: 0 | 1 | 2
  description: string
}

export const ENDINGS: Ending[] = [
  { id: 'n0', name: 'N0', extensions: 0, description: 'Sam łuk, bez przedłużeń' },
  { id: 'n1', name: 'N1', extensions: 1, description: 'Proste przedłużenie z jednej strony' },
  { id: 'n2', name: 'N2', extensions: 2, description: 'Proste przedłużenia z obu stron' },
]

/** Długość pojedynczego przedłużenia prostego [mm]. */
export const EXTENSION_RANGE = { min: 10, max: 1000, step: 1, default: 100 }

/**
 * Kształt frezu w przekroju (patrząc z góry):
 * - round: rowek półokrągły, square: rowek prostokątny, v: rowek trójkątny,
 * - rib: wypukłe lamele (cała podziałka to zaokrąglone żebro).
 */
export type FlutingShape = 'round' | 'square' | 'v' | 'rib'

export interface FlutingProfile {
  shape: FlutingShape
  /** Szerokość rowka [mm] (dla 'rib' ignorowana – żebro zajmuje całą podziałkę). */
  widthMm: number
  /** Rozstaw osi rowków [mm]. */
  pitchMm: number
  /** Głębokość frezu [mm]. */
  depthMm: number
}

export interface Fluting {
  id: string
  name: string
  description: string
  /** Profil do wizualizacji; brak = lico gładkie lub wzór bez podglądu. */
  profile?: FlutingProfile
}

export const NO_FLUTING_ID = 'brak'

/** 15 wzorów ryflowania + opcja „brak”. */
export const FLUTINGS: Fluting[] = [
  { id: NO_FLUTING_ID, name: 'Bez ryflowania', description: 'Gładkie lico' },
  { id: 'RF-01', name: 'RF-01', description: 'Półokrągłe 10 mm', profile: { shape: 'round', widthMm: 10, pitchMm: 20, depthMm: 5 } },
  { id: 'RF-02', name: 'RF-02', description: 'Półokrągłe 15 mm', profile: { shape: 'round', widthMm: 15, pitchMm: 25, depthMm: 6 } },
  { id: 'RF-03', name: 'RF-03', description: 'Półokrągłe 20 mm', profile: { shape: 'round', widthMm: 20, pitchMm: 30, depthMm: 7 } },
  { id: 'RF-04', name: 'RF-04', description: 'Półokrągłe 30 mm', profile: { shape: 'round', widthMm: 30, pitchMm: 40, depthMm: 7 } },
  { id: 'RF-05', name: 'RF-05', description: 'Prostokątne 10 mm', profile: { shape: 'square', widthMm: 10, pitchMm: 20, depthMm: 4 } },
  { id: 'RF-06', name: 'RF-06', description: 'Prostokątne 15 mm', profile: { shape: 'square', widthMm: 15, pitchMm: 25, depthMm: 4 } },
  { id: 'RF-07', name: 'RF-07', description: 'Prostokątne 20 mm', profile: { shape: 'square', widthMm: 20, pitchMm: 30, depthMm: 5 } },
  { id: 'RF-08', name: 'RF-08', description: 'Trójkątne (V) 10 mm', profile: { shape: 'v', widthMm: 10, pitchMm: 15, depthMm: 4 } },
  { id: 'RF-09', name: 'RF-09', description: 'Trójkątne (V) 15 mm', profile: { shape: 'v', widthMm: 15, pitchMm: 20, depthMm: 5 } },
  { id: 'RF-10', name: 'RF-10', description: 'Trójkątne (V) 20 mm', profile: { shape: 'v', widthMm: 20, pitchMm: 25, depthMm: 6 } },
  { id: 'RF-11', name: 'RF-11', description: 'Wypukłe (lamela) 15 mm', profile: { shape: 'rib', widthMm: 15, pitchMm: 15, depthMm: 3 } },
  { id: 'RF-12', name: 'RF-12', description: 'Wypukłe (lamela) 25 mm', profile: { shape: 'rib', widthMm: 25, pitchMm: 25, depthMm: 4 } },
  { id: 'RF-13', name: 'RF-13', description: 'Frezy rzadkie, rozstaw 50 mm', profile: { shape: 'round', widthMm: 8, pitchMm: 50, depthMm: 4 } },
  { id: 'RF-14', name: 'RF-14', description: 'Frezy mieszane', profile: { shape: 'square', widthMm: 6, pitchMm: 18, depthMm: 3 } },
  { id: 'RF-15', name: 'RF-15', description: 'Wzór indywidualny' },
]

export type MaterialId = 'lamelowane' | 'fornirowane' | 'lakierowane'

export interface Material {
  id: MaterialId
  name: string
  /** Grubość frontu [mm] – potrzebna do promienia strony zewnętrznej. */
  thicknessMm: number
  /** Czy kolor (farba) jest wymagany. */
  colorRequired: boolean
  colorPlaceholder: string
}

export const MATERIALS: Material[] = [
  {
    id: 'lamelowane',
    name: 'Lamelowane',
    thicknessMm: 19,
    colorRequired: false,
    colorPlaceholder: 'np. olej naturalny, bejca orzech',
  },
  {
    id: 'fornirowane',
    name: 'Fornirowane',
    thicknessMm: 19,
    colorRequired: false,
    colorPlaceholder: 'np. dąb naturalny, bejca',
  },
  {
    id: 'lakierowane',
    name: 'Lakierowane',
    thicknessMm: 19,
    colorRequired: true,
    colorPlaceholder: 'np. RAL 9010, NCS S 0502-Y',
  },
]
