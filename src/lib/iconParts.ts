import type { FrontTypeId } from '../config/catalog'
import type { Segment } from './frontPath'
import type { IconPart, PartMode } from './isoIcon'

// Zestawy części do ikon izometrycznych (proporcje poglądowe, nie w skali).

export const arc = (radius: number, angleDeg: number): Segment => ({ kind: 'arc', radius, angleDeg })
export const line = (length: number): Segment => ({ kind: 'line', length })
export const part = (segment: Segment, mode: PartMode = 'solid'): IconPart => ({ segment, mode })

export interface IconSpec {
  parts: IconPart[]
  start: number
  inside?: boolean
}

/** Ikony typów – proporcje poglądowe, nie w skali. */
export function typeIcon(typeId: FrontTypeId): IconSpec {
  switch (typeId) {
    case 'narozne':
      return { parts: [part(arc(300, 90))], start: 0 }
    case 'przedluzane':
      return { parts: [part(arc(220, 90)), part(line(200))], start: 0 }
    case 'obustronne':
      return { parts: [part(arc(110, 90)), part(line(300)), part(arc(110, 90))], start: -90 }
    case 'luk':
      return { parts: [part(arc(200, 180))], start: 0 }
  }
}

/** Zakończenie narożnika: przedłużenia złote, brakujące – przerywany kontur. */
export function endingIcon(hasLeft: boolean, hasRight: boolean): IconSpec {
  return {
    parts: [part(line(90), hasLeft ? 'gold' : 'ghost'), part(arc(240, 90)), part(line(90), hasRight ? 'gold' : 'ghost')],
    start: 0,
    inside: true,
  }
}

/** Wysokość: bryła typu z wyróżnionym pionowym pasem przy krawędzi. */
export function heightIcon(): IconSpec {
  return { parts: [part(arc(280, 76)), part(arc(280, 14), 'gold')], start: 0 }
}

/** Przedłużane: prosty odcinek (wymiar L) złoty. */
export function lengthIcon(): IconSpec {
  return { parts: [part(arc(220, 90)), part(line(220), 'gold')], start: 0 }
}

/** Obustronne: środek (szerokość W) złoty. */
export function widthIcon(): IconSpec {
  return { parts: [part(arc(110, 90)), part(line(300), 'gold'), part(arc(110, 90))], start: -90 }
}

/** Obustronne: przedłużenia boków (Z) złote albo przerywane. */
export function sideIcon(on: boolean): IconSpec {
  const leg = part(line(90), on ? 'gold' : 'ghost')
  return { parts: [leg, part(arc(110, 90)), part(line(300)), part(arc(110, 90)), leg], start: -90 }
}
