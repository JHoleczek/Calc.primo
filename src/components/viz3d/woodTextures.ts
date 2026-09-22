import * as THREE from 'three'

// Proceduralne tekstury drewna (canvas), bez plików graficznych.
// Tekstura obejmuje TILE_W × TILE_H metrów; UV geometrii są w metrach.

export const TILE_W = 0.4
export const TILE_H = 0.8

const PX_W = 512
const PX_H = 1024

/** Deterministyczny generator liczb losowych, żeby usłojenie się nie „przeskakiwało”. */
function rng(seed: number) {
  let s = seed >>> 0
  return () => {
    s = (s * 1664525 + 1013904223) >>> 0
    return s / 4294967296
  }
}

function drawGrain(ctx: CanvasRenderingContext2D, x0: number, width: number, rand: () => number) {
  const lines = Math.round(width / 3)
  for (let i = 0; i < lines; i++) {
    const x = x0 + rand() * width
    const amp = 0.5 + rand() * 2.5
    // Całkowita liczba okresów na wysokość tekstury, żeby kafelki łączyły się bez szwu.
    const freq = (1 + Math.floor(rand() * 3)) / PX_H
    const phase = rand() * Math.PI * 2
    const dark = rand() < 0.7
    ctx.strokeStyle = dark ? `rgba(90,55,25,${0.04 + rand() * 0.1})` : `rgba(255,235,200,${0.04 + rand() * 0.08})`
    ctx.lineWidth = 0.5 + rand() * 1.4
    ctx.beginPath()
    for (let y = 0; y <= PX_H; y += 16) {
      const px = x + Math.sin(y * freq * Math.PI * 2 + phase) * amp
      if (y === 0) ctx.moveTo(px, y)
      else ctx.lineTo(px, y)
    }
    ctx.stroke()
  }
}

function makeCanvas(draw: (ctx: CanvasRenderingContext2D, rand: () => number) => void, seed: number) {
  const canvas = document.createElement('canvas')
  canvas.width = PX_W
  canvas.height = PX_H
  const ctx = canvas.getContext('2d')!
  draw(ctx, rng(seed))
  const texture = new THREE.CanvasTexture(canvas)
  texture.wrapS = THREE.RepeatWrapping
  texture.wrapT = THREE.RepeatWrapping
  texture.repeat.set(1 / TILE_W, 1 / TILE_H)
  texture.colorSpace = THREE.SRGBColorSpace
  texture.anisotropy = 8
  return texture
}

/** Fornir: jednolity arkusz z pionowym usłojeniem. */
export function createVeneerTexture() {
  return makeCanvas((ctx, rand) => {
    ctx.fillStyle = '#c9a171'
    ctx.fillRect(0, 0, PX_W, PX_H)
    drawGrain(ctx, 0, PX_W, rand)
  }, 7)
}

/** Lamele: pionowe listwy ~40 mm o różnym odcieniu, z delikatną fugą. */
export function createLamellaTexture() {
  return makeCanvas((ctx, rand) => {
    const stripPx = (PX_W * 0.04) / TILE_W
    const tones = ['#c49a68', '#b98d5c', '#cfa877', '#bf9362', '#d2ad7e', '#b58a5a']
    for (let x = 0, i = 0; x < PX_W; x += stripPx, i++) {
      ctx.fillStyle = tones[Math.floor(rand() * tones.length)]
      ctx.fillRect(x, 0, stripPx, PX_H)
      drawGrain(ctx, x, stripPx, rand)
      ctx.fillStyle = 'rgba(60,35,15,0.35)'
      ctx.fillRect(x, 0, 1, PX_H)
    }
  }, 11)
}
