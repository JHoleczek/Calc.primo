// Dane katalogowe kalkulatora frontów giętych – na podstawie
// „Fronty Primo — Katalog frontów giętych 2026” (https://katalog.primomeble.pl/).
// Cała logika UI, obliczeń i rysunków czyta wyłącznie z tego pliku.

/** Grubość wszystkich frontów giętych [mm]. */
export const THICKNESS_MM = 18

/** Wysokość H [mm]. */
export const HEIGHT_RANGE = { min: 100, max: 3200, step: 1 }

/** Domyślna wysokość H [mm]. */
export const DEFAULT_HEIGHT_MM = 720

export type FrontTypeId = 'narozne' | 'przedluzane' | 'obustronne' | 'luk'

export interface FrontType {
  id: FrontTypeId
  /** Kod typu w kodzie katalogowym (np. FGN-N2-R300). */
  code: string
  name: string
  description: string
  /** Krótki podpis na karcie typu. */
  short: string
  /** Dostępne promienie R [mm] (po licu zewnętrznym). */
  radii: number[]
}

const range = (from: number, to: number, step: number) =>
  Array.from({ length: Math.floor((to - from) / step) + 1 }, (_, i) => from + i * step)

export const FRONT_TYPES: FrontType[] = [
  {
    id: 'narozne',
    code: 'FGN',
    name: 'Narożne',
    short: 'Łuk 90°',
    description: 'Łuk 90°, zakończenia N0 / N1 / N2',
    radii: range(50, 600, 50),
  },
  {
    id: 'przedluzane',
    code: 'FGP',
    name: 'Przedłużane',
    short: 'Łuk z przedłużeniem',
    description: 'Łuk 90° z prostym przedłużeniem, wymiar L max 700',
    radii: range(50, 600, 50),
  },
  {
    id: 'obustronne',
    code: 'FGO',
    name: 'Obustronne',
    short: '2 łuki',
    description: 'Dwa łuki R100, szerokość W 600 / 700 / 800',
    radii: [100],
  },
  {
    id: 'luk',
    code: 'EGL',
    name: 'W łuk',
    short: 'Półokrąg 180°',
    description: 'Półokrąg 180°',
    radii: range(200, 350, 50),
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

/**
 * Przedłużenia narożnika [mm] – lewe i prawe wpisywane przez klienta.
 * 0 = brak; zakończenie wynika z liczby przedłużeń: 0 → N0, jedno → N1, oba → N2.
 */
export const CORNER_EXTENSION = { min: 10, max: 50, default: 0 }

/** Powyżej tej wysokości H [mm] front wykonujemy tylko z laminatu gładkiego (i z dopłatą). */
export const TALL_HEIGHT_MM = 2780

/** Elementy przedłużane: całkowity wymiar L (od lica łuku do końca przedłużenia) [mm]. */
export const EXTENDED_LENGTH = { max: 700, minAboveRadius: 50, default: 700 }

/** Elementy obustronne: szerokość W i opcjonalne przedłużenie boków Z [mm]. */
export const DOUBLE_WIDTHS = [600, 700, 800]
/** Kod obustronnego z przedłużeniem boków Z (front gięty obustronny przedłużany). */
export const DOUBLE_EXTENDED_CODE = 'FGOP'
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

export const SMOOTH_FLUTING_ID = 'FG'

/** Ryflowanie: FG (gładki) i FR01–FR13; wymiary z rysunków katalogowych (środki podanych zakresów). */
export const FLUTINGS: Fluting[] = [
  { id: 'FG', name: 'Gładki' },
  { id: 'FR01', name: 'Wpust 15', profile: { shape: 'u', widthMm: 15, pitchMm: 27, depthMm: 3 } },
  { id: 'FR02', name: 'Klin 15', profile: { shape: 'v', widthMm: 15, pitchMm: 27, depthMm: 3 } },
  { id: 'FR03', name: 'Fala 18', profile: { shape: 'round', widthMm: 18, pitchMm: 19.5, depthMm: 4 } },
  { id: 'FR04', name: 'Fala 12', profile: { shape: 'u', widthMm: 11.5, pitchMm: 14.5, depthMm: 3 } },
  { id: 'FR05', name: 'Wałek 19', profile: { shape: 'rib', widthMm: 19, pitchMm: 19, depthMm: 5 } },
  { id: 'FR06', name: 'Wałek 25', profile: { shape: 'rib', widthMm: 25, pitchMm: 25, depthMm: 5 } },
  { id: 'FR07', name: 'Wałek 9', profile: { shape: 'rib', widthMm: 9, pitchMm: 9, depthMm: 4 } },
  { id: 'FR08', name: 'Wpust 20', profile: { shape: 'square', widthMm: 20, pitchMm: 40, depthMm: 4 } },
  { id: 'FR09', name: 'Rowek 6', profile: { shape: 'v', widthMm: 6, pitchMm: 25, depthMm: 3 } },
  { id: 'FR10', name: 'Rowek 3', profile: { shape: 'square', widthMm: 3, pitchMm: 23, depthMm: 3 } },
  { id: 'FR11', name: 'Wpust 10', profile: { shape: 'square', widthMm: 10, pitchMm: 20, depthMm: 4 } },
  { id: 'FR12', name: 'Fala 10', profile: { shape: 'round', widthMm: 10, pitchMm: 11.5, depthMm: 5 } },
  { id: 'FR13', name: 'Klin 10', profile: { shape: 'v', widthMm: 8, pitchMm: 18, depthMm: 5 } },
]

export type MaterialId = 'laminat' | 'fornirowane' | 'lakierowane'

export interface Material {
  id: MaterialId
  name: string
  /** Krótki opis na karcie materiału. */
  hint: string
  /** Tylko lico gładkie (bez ryflowania). */
  smoothOnly: boolean
  /** Pole tekstowe pod materiałem: tytuł sekcji, podpis, podpowiedź w pustym polu. */
  field: { title: string; label: string; placeholder: string; required: boolean }
  /** Ważna informacja dla klienta (np. kto pokrywa koszt laminatu). */
  note?: string
}

// Kolejność kart: lakier, fornir, laminat.
export const MATERIALS: Material[] = [
  {
    id: 'lakierowane',
    name: 'Lakierowane',
    hint: 'Wszystkie ryflowania',
    smoothOnly: false,
    field: { title: 'Kolor', label: 'Kolor farby', placeholder: 'np. RAL 9010, NCS S 0502-Y', required: true },
  },
  {
    id: 'fornirowane',
    name: 'Fornirowane',
    hint: 'Dąb lub orzech, wszystkie ryflowania',
    smoothOnly: false,
    field: { title: 'Bejca', label: 'Kolor bejcy', placeholder: 'Kolor / numer bejcy', required: true },
  },
  {
    id: 'laminat',
    name: 'Laminat',
    hint: 'Tylko gładki (FG)',
    smoothOnly: true,
    field: {
      title: 'Dekor',
      label: 'Numer dekoru / numer i symbol laminatu',
      placeholder: 'Numer dekoru / numer i symbol laminatu',
      required: true,
    },
    note: 'Koszt laminatu po stronie klienta.',
  },
]

/** Rodzaje forniru (przy materiale „Fornirowane”). */
export type VeneerId = 'dab' | 'dab-bejcowany' | 'orzech'

export interface Veneer {
  id: VeneerId
  name: string
  /** Czy wymaga podania koloru bejcy. */
  stained: boolean
  /** Odcień drewna w modelu 3D (poglądowo). */
  color3d: string
}

export const VENEERS: Veneer[] = [
  { id: 'dab', name: 'Dąb naturalny', stained: false, color3d: '#cfa878' },
  { id: 'dab-bejcowany', name: 'Dąb bejcowany', stained: true, color3d: '#a97c50' },
  { id: 'orzech', name: 'Orzech amerykański', stained: false, color3d: '#8a5f42' },
]

/** Kolor modelu 3D dla lakieru i laminatu – jak fornir dębowy (forma frontu lepiej widoczna). */
export const DEFAULT_WOOD_3D = VENEERS[0].color3d

/** Kontakt do wyceny (z katalogu). */
export const CONTACT = { email: 'biuro.primomeble@gmail.com', phone: '691-766-559' }

/** Dane firmy (stopka, polityka prywatności). */
export const COMPANY = {
  brand: 'Primo Meble',
  legalName: 'Primo Duda Krzysztof, Marek Skiba',
  legalForm: 'spółka cywilna',
  street: 'ul. Michała Glinki 7',
  city: '41-905 Bytom',
  nip: '6262940701',
  regon: '241149669',
  www: 'www.primomeble.pl',
  since: 2009,
  /** Numer konta do zadatku (pokazywany w ofercie). Pusty = do uzupełnienia. */
  bankAccount: '',
}

/** Adres zapytań pokazywany klientowi (np. gdy wysyłka się nie uda) – firmowa skrzynka kalkulatora. */
export const PUBLIC_QUOTE_EMAIL = 'kalkulator@primomeble.pl'

/**
 * Wysyłka zapytań: własny skrypt PHP na hostingu (cyber_folks), ścieżka względna do strony.
 * Bez serwisów zewnętrznych – maile wysyła serwer pocztowy hostingu.
 */
export const QUOTE_API: string = import.meta.env.VITE_QUOTE_API || 'api/wyslij.php'

/** Domyślne warunki oferty (biuro może je zmienić w ofercie przed wysłaniem). */
export const OFFER_DEFAULTS = {
  /** Ważność oferty [dni]. */
  validDays: 14,
  /** Zadatek [% wartości brutto]. */
  depositPct: 50,
  /** Stawka VAT [%]. */
  vatPct: 23,
  /** Termin płatności zadatku od akceptacji [dni]. */
  depositDays: 7,
  leadTime: '4–6 tygodni od zaksięgowania zadatku',
}
