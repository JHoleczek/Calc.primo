import type { FlutingProfile as Profile } from '../config/catalog'
import { profileOutline } from '../lib/flutingGeometry'

const BOARD = 18 // grubość płyty [mm]
/** Szerokość wycinka płyty [mm] – taka sama dla wszystkich wzorów, więc ilustracje mają jeden rozmiar. */
const W = 48

/**
 * Przekrój płyty z frezem (widok z boku): szary kształt z jasnym konturem.
 * Rysowany z wymiarów profilu z katalogu – każdy wzór ma swój kształt.
 */
export function FlutingProfile({ profile }: { profile?: Profile }) {
  const pad = 1
  return (
    <svg className="fluting-profile" viewBox={`${-pad} ${-pad} ${W + pad * 2} ${BOARD + pad * 2}`} aria-hidden="true" focusable="false">
      <path d={profileOutline(profile, W)} />
    </svg>
  )
}
