// Scena i kamera three.js są mutowalne z założenia (standardowy wzorzec R3F).
/* oxlint-disable react/immutability */
import { ContactShadows, OrbitControls } from '@react-three/drei'
import { Canvas, useThree } from '@react-three/fiber'
import { useEffect, useMemo, useRef, type ComponentRef, type ReactNode } from 'react'
import * as THREE from 'three'
import { RoomEnvironment } from 'three/examples/jsm/environments/RoomEnvironment.js'
import type { MaterialId } from '../../config/catalog'
import type { FrontGeometryInput } from '../../lib/frontGeometry'
import { buildFrontGeometry } from '../../lib/frontGeometry'
import { createLamellaTexture, createVeneerTexture } from './woodTextures'

export interface FrontSceneProps {
  geometry: FrontGeometryInput
  materialId: MaterialId
  /** Kolor farby / bejcy (hex) lub null, gdy nie rozpoznano. */
  colorHex: string | null
}

const FOV = 32

/** Oświetlenie otoczenia z wbudowanego „pokoju” three.js (bez plików HDR). */
function RoomLighting() {
  const { gl, scene } = useThree()
  useEffect(() => {
    const pmrem = new THREE.PMREMGenerator(gl)
    const env = pmrem.fromScene(new RoomEnvironment(), 0.04).texture
    scene.environment = env
    scene.environmentIntensity = 0.6
    return () => {
      scene.environment = null
      env.dispose()
      pmrem.dispose()
    }
  }, [gl, scene])
  return null
}

function FrontMesh({ geometry, materialId, colorHex }: FrontSceneProps) {
  const data = useMemo(() => buildFrontGeometry(geometry), [geometry])

  const bufferGeometry = useMemo(() => {
    const g = new THREE.BufferGeometry()
    g.setAttribute('position', new THREE.BufferAttribute(data.positions, 3))
    g.setAttribute('normal', new THREE.BufferAttribute(data.normals, 3))
    g.setAttribute('uv', new THREE.BufferAttribute(data.uvs, 2))
    return g
  }, [data])
  useEffect(() => () => bufferGeometry.dispose(), [bufferGeometry])

  const texture = useMemo(() => {
    if (materialId === 'lamelowane') return createLamellaTexture()
    if (materialId === 'fornirowane') return createVeneerTexture()
    return null
  }, [materialId])
  useEffect(() => () => texture?.dispose(), [texture])

  const material = useMemo(() => {
    if (materialId === 'lakierowane') {
      return new THREE.MeshPhysicalMaterial({
        color: new THREE.Color(colorHex ?? '#e8e6e1'),
        roughness: 0.42,
        clearcoat: 0.35,
        clearcoatRoughness: 0.3,
      })
    }
    // Drewno; wpisany kolor traktujemy jak bejcę (przyciemnienie/zabarwienie).
    const tint = colorHex ? new THREE.Color('#ffffff').lerp(new THREE.Color(colorHex), 0.55) : new THREE.Color('#ffffff')
    return new THREE.MeshStandardMaterial({ map: texture, color: tint, roughness: 0.62 })
  }, [materialId, colorHex, texture])
  useEffect(() => () => material.dispose(), [material])

  // Front ustawiony środkiem na osi Y, na podłodze. Wklęsły obracamy o 180°,
  // żeby lico (strona wewnętrzna łuku) było zwrócone do oglądającego.
  const cx = (data.min[0] + data.max[0]) / 2
  const cz = (data.min[2] + data.max[2]) / 2

  return (
    <group rotation={[0, geometry.convex ? 0 : Math.PI, 0]}>
      <mesh geometry={bufferGeometry} material={material} position={[-cx, 0, -cz]} castShadow receiveShadow />
    </group>
  )
}

/** Ustawia kamerę tak, by cały front mieścił się w kadrze; tylko gdy zmienią się wymiary. */
function CameraRig({ size }: { size: [number, number, number] }) {
  const { camera } = useThree()
  const controls = useRef<ComponentRef<typeof OrbitControls>>(null)
  const [w, h, d] = size

  useEffect(() => {
    const cam = camera as THREE.PerspectiveCamera
    const radius = Math.hypot(w, h, d) / 2
    const fit = radius / Math.sin(THREE.MathUtils.degToRad(FOV / 2))
    const aspectFit = cam.aspect < 1 ? fit / Math.max(cam.aspect, 0.55) : fit
    const dist = aspectFit * 0.8
    const dir = new THREE.Vector3(0.55, 0.32, 1).normalize()
    const target = new THREE.Vector3(0, h / 2, 0)
    cam.position.copy(target).addScaledVector(dir, dist)
    cam.near = dist / 100
    cam.far = dist * 20
    cam.updateProjectionMatrix()
    controls.current?.target.copy(target)
    controls.current?.update()
  }, [camera, w, h, d])

  return (
    <OrbitControls
      ref={controls}
      makeDefault
      enableDamping
      enablePan={false}
      minPolarAngle={0.15}
      maxPolarAngle={Math.PI / 2 - 0.02}
    />
  )
}

export default function FrontScene({ fallback, ...props }: FrontSceneProps & { fallback?: ReactNode }) {
  const size = useMemo(() => {
    const { min, max } = buildFrontGeometry({ ...props.geometry, fluting: undefined })
    return [max[0] - min[0], max[1] - min[1], max[2] - min[2]] as [number, number, number]
  }, [props.geometry])
  const shadowScale = Math.max(size[0], size[2]) * 2.2

  return (
    <Canvas
      className="viz3d__canvas"
      fallback={fallback}
      shadows
      dpr={[1, 2]}
      camera={{ fov: FOV, position: [1, 1, 3] }}
      gl={{ antialias: true, preserveDrawingBuffer: true }}
      onCreated={({ gl }) => {
        gl.toneMapping = THREE.ACESFilmicToneMapping
        gl.toneMappingExposure = 1.05
      }}
    >
      <RoomLighting />
      <ambientLight intensity={0.25} />
      <directionalLight position={[2, 4, 3]} intensity={1.6} castShadow shadow-mapSize={[1024, 1024]} />
      <directionalLight position={[-3, 2, -2]} intensity={0.35} />
      <FrontMesh {...props} />
      <ContactShadows position={[0, 0.0005, 0]} scale={shadowScale} blur={2.2} opacity={0.6} far={size[1] * 0.6} />
      <CameraRig size={size} />
    </Canvas>
  )
}
