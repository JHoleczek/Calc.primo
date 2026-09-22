import { lazy, Suspense, useMemo, useState } from 'react'
import {
  DEFAULT_HEIGHT_MM,
  ENDINGS,
  EXTENSION_RANGE,
  FLUTINGS,
  FRONT_TYPES,
  HEIGHT_RANGE,
  MATERIALS,
  NO_FLUTING_ID,
} from '../config/catalog'
import type { Configuration } from '../lib/calculate'
import type { FrontGeometryInput } from '../lib/frontGeometry'
import { resolvePaintColor } from '../lib/paintColor'
import { PlanView } from './PlanView'

// three.js jest duży – ładujemy go osobno, żeby formularz był gotowy od razu.
const FrontScene = lazy(() => import('./viz3d/FrontScene'))

type View = '3d' | 'plan'

interface Props {
  config: Configuration
}

export function VisualizationPanel({ config }: Props) {
  const [view, setView] = useState<View>('3d')

  const frontType = FRONT_TYPES.find((t) => t.id === config.frontTypeId) ?? FRONT_TYPES[0]
  const ending = ENDINGS.find((e) => e.id === config.endingId) ?? ENDINGS[0]
  const material = MATERIALS.find((m) => m.id === config.materialId) ?? MATERIALS[0]
  const fluting = FLUTINGS.find((f) => f.id === config.flutingId) ?? FLUTINGS[0]
  const paint = useMemo(() => resolvePaintColor(config.color), [config.color])

  // Niepoprawne wartości z pól liczbowych zastępujemy najbliższymi sensownymi, żeby model nie znikał.
  const clamp = (v: number, min: number, max: number) => Math.min(max, Math.max(min, v))
  const heightMm = Number.isFinite(config.heightMm)
    ? clamp(config.heightMm, HEIGHT_RANGE.min, HEIGHT_RANGE.max)
    : DEFAULT_HEIGHT_MM
  const extMm =
    ending.extensions > 0 && Number.isFinite(config.extensionMm)
      ? clamp(config.extensionMm, 0, EXTENSION_RANGE.max)
      : 0

  const geometry = useMemo<FrontGeometryInput>(
    () => ({
      radiusMm: config.radiusMm,
      angleDeg: frontType.angleDeg,
      convex: frontType.direction === 'convex',
      thicknessMm: material.thicknessMm,
      heightMm,
      extensionLeftMm: ending.extensions === 2 ? extMm : 0,
      extensionRightMm: ending.extensions >= 1 ? extMm : 0,
      fluting: fluting.profile,
    }),
    [config.radiusMm, frontType, material.thicknessMm, heightMm, ending.extensions, extMm, fluting.profile],
  )

  const colorText = config.color.trim()

  return (
    <div className="viz">
      <div className="viz__bar">
        <div className="viz__tabs" role="tablist" aria-label="Widok">
          {(
            [
              ['3d', 'Model 3D'],
              ['plan', 'Rzut z góry'],
            ] as const
          ).map(([id, label]) => (
            <button
              key={id}
              type="button"
              role="tab"
              id={`viz-tab-${id}`}
              aria-selected={view === id}
              className={`viz__tab${view === id ? ' viz__tab--active' : ''}`}
              onClick={() => setView(id)}
            >
              {label}
            </button>
          ))}
        </div>
        {view === '3d' && <span className="viz__hint">Przeciągnij, aby obrócić · kółko / szczypanie = zoom</span>}
      </div>

      <div className="viz__stage" role="tabpanel" aria-labelledby={`viz-tab-${view}`}>
        {view === '3d' ? (
          <Suspense fallback={<p className="viz__loading">Ładowanie modelu 3D…</p>}>
            <FrontScene
              geometry={geometry}
              materialId={material.id}
              colorHex={paint?.hex ?? null}
              fallback={<PlanView config={config} />}
            />
          </Suspense>
        ) : (
          <PlanView config={config} />
        )}
      </div>

      <dl className="viz__meta">
        <div>
          <dt>Typ</dt>
          <dd>{frontType.name}</dd>
        </div>
        <div>
          <dt>R / H</dt>
          <dd>
            {config.radiusMm} / {Number.isFinite(config.heightMm) ? config.heightMm : '—'} mm
          </dd>
        </div>
        <div>
          <dt>Lico</dt>
          <dd>{frontType.direction === 'convex' ? 'zewnętrzne' : 'wewnętrzne'}</dd>
        </div>
        {fluting.id !== NO_FLUTING_ID && (
          <div>
            <dt>Ryflowanie</dt>
            <dd>{fluting.profile ? fluting.name : `${fluting.name} (bez podglądu)`}</dd>
          </div>
        )}
        {colorText !== '' && (
          <div>
            <dt>Kolor</dt>
            <dd className="viz__color">
              {paint && <span className="viz__swatch" style={{ background: paint.hex }} aria-hidden="true" />}
              {colorText}
              <span className="viz__color-note">{paint ? `(${paint.source}, poglądowo)` : '(nierozpoznany)'}</span>
            </dd>
          </div>
        )}
      </dl>
    </div>
  )
}
