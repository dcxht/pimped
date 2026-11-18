// HospitalScene - Canvas scene with MuchoPixels hospital tileset sprites
// Krillion-style layered world: night sky exterior -> entrance line -> deep hospital interior
// Sprites from /sprites/mp-*.png replace the old Canvas rectangle silhouettes

import { useRef, useEffect } from 'react'

// --- Sprite region definitions (sx, sy, sw, sh) mapped from the tilesheets ---
// Coordinates derived from visual inspection of each PNG

const SPRITES = {
  exteriors: {
    src: '/sprites/mp-exteriors.png',
    regions: {
      entrance:     { sx: 0, sy: 0, sw: 288, sh: 64 },
      facadeUpper:  { sx: 0, sy: 64, sw: 288, sh: 80 },
      facadeLower:  { sx: 0, sy: 144, sw: 288, sh: 64 },
      hospitalText: { sx: 0, sy: 240, sw: 200, sh: 32 },
      redCross:     { sx: 200, sy: 208, sw: 40, sh: 40 },
      ambulance1:   { sx: 8, sy: 304, sw: 128, sh: 64 },
      ambulance2:   { sx: 8, sy: 384, sw: 128, sh: 64 },
      darkCanopy:   { sx: 0, sy: 208, sw: 288, sh: 32 },
    }
  },
  patient: {
    src: '/sprites/mp-patient.png',
    regions: {
      chairRed:    { sx: 0, sy: 0, sw: 16, sh: 16 },
      chairBlue:   { sx: 16, sy: 0, sw: 16, sh: 16 },
      chairGreen:  { sx: 32, sy: 0, sw: 16, sh: 16 },
      chairPurple: { sx: 48, sy: 0, sw: 16, sh: 16 },
      chairTeal:   { sx: 64, sy: 0, sw: 16, sh: 16 },
      chairOrange: { sx: 80, sy: 0, sw: 16, sh: 16 },
      bedGreen:    { sx: 0, sy: 16, sw: 32, sh: 32 },
      bedBlue:     { sx: 32, sy: 16, sw: 32, sh: 32 },
      bedRed:      { sx: 64, sy: 16, sw: 32, sh: 32 },
      bedTeal:     { sx: 0, sy: 48, sw: 32, sh: 32 },
      bedPurple:   { sx: 32, sy: 48, sw: 32, sh: 32 },
      bedYellow:   { sx: 64, sy: 48, sw: 32, sh: 32 },
      ivPole1:     { sx: 0, sy: 80, sw: 16, sh: 48 },
      ivPole2:     { sx: 16, sy: 80, sw: 16, sh: 48 },
      ivPole3:     { sx: 32, sy: 80, sw: 16, sh: 48 },
      ivPole4:     { sx: 48, sy: 80, sw: 16, sh: 48 },
      monitor1:    { sx: 0, sy: 128, sw: 32, sh: 24 },
      monitor2:    { sx: 32, sy: 128, sw: 32, sh: 24 },
      monitor3:    { sx: 64, sy: 128, sw: 32, sh: 24 },
      flower:      { sx: 96, sy: 80, sw: 16, sh: 16 },
      trashcan:    { sx: 112, sy: 80, sw: 16, sh: 16 },
    }
  },
  lobby: {
    src: '/sprites/mp-lobby.png',
    regions: {
      waitingChairs:   { sx: 0, sy: 0, sw: 48, sh: 32 },
      vendingMachine1: { sx: 48, sy: 0, sw: 32, sh: 48 },
      vendingMachine2: { sx: 80, sy: 0, sw: 32, sh: 48 },
      vendingMachine3: { sx: 112, sy: 0, sw: 32, sh: 48 },
      vendingMachine4: { sx: 144, sy: 0, sw: 32, sh: 48 },
      receptionDesk:   { sx: 0, sy: 96, sw: 80, sh: 32 },
      benchBlue:       { sx: 0, sy: 64, sw: 48, sh: 16 },
      monitorWall:     { sx: 160, sy: 48, sw: 48, sh: 32 },
      radiator:        { sx: 0, sy: 144, sw: 48, sh: 16 },
      largeDeskArea:   { sx: 80, sy: 80, sw: 96, sh: 48 },
      smallMonitor:    { sx: 176, sy: 0, sw: 32, sh: 24 },
    }
  },
  radiology: {
    src: '/sprites/mp-radiology.png',
    regions: {
      windowLarge:   { sx: 0, sy: 0, sw: 80, sh: 48 },
      windowSmall:   { sx: 0, sy: 56, sw: 80, sh: 40 },
      examBedBlue:   { sx: 80, sy: 48, sw: 48, sh: 16 },
      examBedGreen:  { sx: 80, sy: 64, sw: 48, sh: 16 },
      examBedRed:    { sx: 80, sy: 80, sw: 48, sh: 16 },
      surgicalLight: { sx: 160, sy: 0, sw: 48, sh: 48 },
      xrayScreen1:   { sx: 208, sy: 48, sw: 32, sh: 32 },
      xrayScreen2:   { sx: 208, sy: 80, sw: 32, sh: 32 },
      mriMachine:    { sx: 0, sy: 224, sw: 96, sh: 64 },
      hazardSymbol:  { sx: 144, sy: 176, sw: 24, sh: 24 },
      scrubsRack:    { sx: 176, sy: 176, sw: 80, sh: 80 },
      examChair:     { sx: 80, sy: 32, sw: 32, sh: 16 },
    }
  },
  background: {
    src: '/sprites/mp-background.png',
    regions: {
      cloudSmall1:    { sx: 0, sy: 0, sw: 24, sh: 16 },
      cloudSmall2:    { sx: 24, sy: 0, sw: 24, sh: 16 },
      cloudMedium:    { sx: 96, sy: 0, sw: 64, sh: 24 },
      cloudLarge:     { sx: 96, sy: 24, sw: 80, sh: 32 },
      sun:            { sx: 192, sy: 0, sw: 32, sh: 32 },
      citySilhouette: { sx: 0, sy: 48, sw: 192, sh: 24 },
      moon:           { sx: 192, sy: 56, sw: 24, sh: 24 },
    }
  },
  walls: {
    src: '/sprites/mp-walls.png',
    regions: {
      doorRed:     { sx: 0, sy: 0, sw: 32, sh: 48 },
      doorGreen:   { sx: 32, sy: 0, sw: 32, sh: 48 },
      doorDark:    { sx: 64, sy: 0, sw: 32, sh: 48 },
      doorSliding: { sx: 96, sy: 0, sw: 48, sh: 48 },
      floorTile:   { sx: 128, sy: 96, sw: 64, sh: 64 },
      wallPanel:   { sx: 128, sy: 0, sw: 48, sh: 48 },
    }
  }
}

// --- Animated element factories ---

function createStars(count = 60) {
  return Array.from({ length: count }, () => ({
    x: Math.random(),
    y: Math.random() * 0.18,
    r: 0.5 + Math.random() * 1.5,
    phase: Math.random() * Math.PI * 2,
    twinkleSpeed: 0.001 + Math.random() * 0.003,
  }))
}

function createBubbles(count = 25) {
  return Array.from({ length: count }, () => ({
    x: Math.random(),
    y: 0.4 + Math.random() * 0.6,
    r: 1 + Math.random() * 3,
    speed: 0.0001 + Math.random() * 0.0003,
    drift: (Math.random() - 0.5) * 0.0001,
    phase: Math.random() * Math.PI * 2,
    alpha: 0.08 + Math.random() * 0.15,
  }))
}

function createMovingElements() {
  return [
    // Hospital beds rolling across (sprite-based, replace old gurneys)
    { type: 'bed', sprite: 'bedGreen', y: 0.46, speed: 0.15, dir: 1, x: -0.2, size: 1.0, alpha: 0.5 },
    { type: 'bed', sprite: 'bedRed', y: 0.62, speed: 0.08, dir: -1, x: 1.2, size: 0.7, alpha: 0.3 },
    // Walking figures (silhouettes work great as depth shadows)
    { type: 'figure', y: 0.44, speed: 0.2, dir: 1, x: -0.3, size: 1.0, alpha: 0.45 },
    { type: 'figure', y: 0.55, speed: 0.12, dir: -1, x: 1.3, size: 0.8, alpha: 0.35 },
    { type: 'figure', y: 0.72, speed: 0.06, dir: 1, x: -0.5, size: 0.55, alpha: 0.2 },
    // Wheelchairs (silhouettes for depth)
    { type: 'wheelchair', y: 0.52, speed: 0.1, dir: -1, x: 1.1, size: 0.85, alpha: 0.4 },
    { type: 'wheelchair', y: 0.82, speed: 0.04, dir: 1, x: -0.4, size: 0.45, alpha: 0.15 },
    // Nurse with clipboard (silhouette)
    { type: 'nurse', y: 0.65, speed: 0.09, dir: 1, x: -0.6, size: 0.65, alpha: 0.28 },
    // Ambulances driving across the exterior area
    { type: 'ambulance', sprite: 'ambulance1', y: 0.28, speed: 0.25, dir: 1, x: -0.4, size: 0.9, alpha: 0.65 },
    { type: 'ambulance', sprite: 'ambulance2', y: 0.30, speed: 0.18, dir: -1, x: 1.4, size: 0.7, alpha: 0.45 },
  ]
}

// --- Sprite loader ---

function loadAllSprites() {
  const loaded = {}
  for (const [key, def] of Object.entries(SPRITES)) {
    const img = new Image()
    img.src = def.src
    loaded[key] = { img, regions: def.regions, ready: false }
    img.onload = () => { loaded[key].ready = true }
  }
  return loaded
}

// Helper: draw a sprite region scaled up with crisp pixels
function drawSprite(ctx, sheet, regionName, dx, dy, dw, dh, flipX) {
  if (!sheet || !sheet.ready) return false
  const r = sheet.regions[regionName]
  if (!r) return false

  ctx.save()
  ctx.imageSmoothingEnabled = false

  if (flipX) {
    ctx.translate(dx + dw, dy)
    ctx.scale(-1, 1)
    ctx.drawImage(sheet.img, r.sx, r.sy, r.sw, r.sh, 0, 0, dw, dh)
  } else {
    ctx.drawImage(sheet.img, r.sx, r.sy, r.sw, r.sh, dx, dy, dw, dh)
  }

  ctx.restore()
  return true
}

// Store elementsRef at module scope so draw functions can access it
let _elementsRef = null
let _bubblesRef = null
let _starsRef = null

export default function HospitalScene({ depth = 0, maxDepth = 2500 }) {
  const canvasRef = useRef(null)
  const rafRef = useRef(null)
  const depthRef = useRef(depth)
  const smoothDepthRef = useRef(depth)
  const starsRef = useRef(createStars())
  const bubblesRef = useRef(createBubbles())
  const elementsRef = useRef(createMovingElements())
  const spritesRef = useRef(null)

  _elementsRef = elementsRef
  _bubblesRef = bubblesRef
  _starsRef = starsRef

  depthRef.current = depth

  // Load sprites on mount
  useEffect(() => {
    spritesRef.current = loadAllSprites()
  }, [])

  // Resize
  useEffect(() => {
    const canvas = canvasRef.current
    if (!canvas) return
    const resize = () => {
      const dpr = window.devicePixelRatio || 1
      canvas.width = window.innerWidth * dpr
      canvas.height = window.innerHeight * dpr
      canvas.style.width = window.innerWidth + 'px'
      canvas.style.height = window.innerHeight + 'px'
    }
    resize()
    window.addEventListener('resize', resize)
    return () => window.removeEventListener('resize', resize)
  }, [])

  // Main render loop
  useEffect(() => {
    const canvas = canvasRef.current
    if (!canvas) return
    const ctx = canvas.getContext('2d')

    const ENTRANCE_Y = 0.42

    const frame = (t) => {
      const w = canvas.width, h = canvas.height
      const sp = spritesRef.current
      smoothDepthRef.current += (depthRef.current - smoothDepthRef.current) * 0.05
      const sd = smoothDepthRef.current
      const depthNorm = Math.min(sd / maxDepth, 1)

      // ========== 1. SKY GRADIENT (top 32%) ==========
      const skyGrad = ctx.createLinearGradient(0, 0, 0, h * ENTRANCE_Y)
      skyGrad.addColorStop(0, '#0d1628')
      skyGrad.addColorStop(0.4, '#152040')
      skyGrad.addColorStop(0.8, '#1a2644')
      skyGrad.addColorStop(1, '#1e3050')
      ctx.fillStyle = skyGrad
      ctx.fillRect(0, 0, w, h * ENTRANCE_Y + 2)

      // ========== 2. INTERIOR GRADIENT (below entrance) ==========
      const intGrad = ctx.createLinearGradient(0, h * ENTRANCE_Y, 0, h)
      intGrad.addColorStop(0, '#1a3a4a')
      intGrad.addColorStop(0.3, '#0f2838')
      intGrad.addColorStop(0.6, '#0a1628')
      intGrad.addColorStop(1, '#060e1a')
      ctx.fillStyle = intGrad
      ctx.fillRect(0, h * ENTRANCE_Y, w, h * (1 - ENTRANCE_Y))

      // ========== 3. STARS ==========
      for (const s of starsRef.current) {
        const twinkle = 0.3 + 0.7 * Math.abs(Math.sin(t * s.twinkleSpeed + s.phase))
        ctx.globalAlpha = twinkle * 0.7
        ctx.fillStyle = '#ffffff'
        ctx.beginPath()
        ctx.arc(s.x * w, s.y * h, s.r, 0, Math.PI * 2)
        ctx.fill()
      }
      ctx.globalAlpha = 1

      // ========== 3.5 SKY SPRITES (moon, clouds, city silhouette) ==========
      if (sp) drawSkySprites(ctx, w, h, ENTRANCE_Y, t, sp)

      // ========== 4. BUILDING (sprite facade over dark base) ==========
      drawBuilding(ctx, w, h, ENTRANCE_Y, t, sp)

      // ========== 5. ENTRANCE LINE ("water surface") ==========
      drawEntranceLine(ctx, w, h, ENTRANCE_Y, t)

      // ========== 6. LIGHT RAYS ==========
      drawLightRays(ctx, w, h, ENTRANCE_Y, t, depthNorm)

      // ========== 7. INTERIOR SCENERY (sprite objects) ==========
      drawInteriorScenery(ctx, w, h, ENTRANCE_Y, t, depthNorm, sp)

      // ========== 8. ANIMATED MOVERS ==========
      drawMovingElements(ctx, w, h, t, depthNorm, sp)

      // ========== 9. BUBBLES ==========
      drawBubbles(ctx, w, h, t)

      // ========== 10. DEPTH MARKERS ==========
      drawDepthMarkers(ctx, w, h, sd, maxDepth)

      // ========== 11. EKG LINE ==========
      if (depthNorm > 0.25) drawEKG(ctx, w, h, t, depthNorm)

      // ========== 12. STATUS LIGHTS ==========
      drawStatusLights(ctx, w, h, t, depthNorm)

      // ========== 13. CURTAINS ==========
      drawCurtains(ctx, w, h, t, depthNorm)

      // ========== 14. VIGNETTE ==========
      const vigR = Math.max(w, h) * 0.65
      const vigGrad = ctx.createRadialGradient(w / 2, h / 2, vigR * 0.3, w / 2, h / 2, vigR)
      vigGrad.addColorStop(0, 'rgba(0,0,0,0)')
      vigGrad.addColorStop(1, 'rgba(0,0,0,0.45)')
      ctx.fillStyle = vigGrad
      ctx.fillRect(0, 0, w, h)

      // ========== 15. CRT SCANLINES ==========
      ctx.fillStyle = 'rgba(0,0,0,0.03)'
      for (let y = 0; y < h; y += 3) ctx.fillRect(0, y, w, 1)

      rafRef.current = requestAnimationFrame(frame)
    }

    rafRef.current = requestAnimationFrame(frame)
    return () => { if (rafRef.current) cancelAnimationFrame(rafRef.current) }
  }, [maxDepth])

  return (
    <canvas
      ref={canvasRef}
      style={{
        position: 'fixed',
        inset: 0,
        width: '100%',
        height: '100%',
        pointerEvents: 'none',
        zIndex: 0,
      }}
    />
  )
}

// ============================================================
// DRAW FUNCTIONS
// ============================================================

function drawSkySprites(ctx, w, h, entranceY, t, sp) {
  const bg = sp.background
  if (!bg || !bg.ready) return
  const ey = h * entranceY

  // Moon in upper right
  ctx.globalAlpha = 0.7
  const moonSize = Math.max(32, w * 0.04)
  drawSprite(ctx, bg, 'moon', w * 0.82, h * 0.03, moonSize, moonSize)

  // Drifting clouds (slow parallax)
  const drift1 = ((t * 0.012) % (w + w * 0.2)) - w * 0.1
  const drift2 = ((t * 0.008 + w * 0.4) % (w + w * 0.3)) - w * 0.15
  const drift3 = ((t * 0.015 + w * 0.7) % (w + w * 0.25)) - w * 0.1

  ctx.globalAlpha = 0.15
  const ch1 = Math.max(20, h * 0.03)
  drawSprite(ctx, bg, 'cloudLarge', drift1, h * 0.05, ch1 * 3.2, ch1)

  ctx.globalAlpha = 0.12
  const ch2 = Math.max(16, h * 0.025)
  drawSprite(ctx, bg, 'cloudMedium', drift2, h * 0.09, ch2 * 2.8, ch2)

  ctx.globalAlpha = 0.1
  const ch3 = Math.max(12, h * 0.018)
  drawSprite(ctx, bg, 'cloudSmall1', drift3, h * 0.13, ch3 * 2, ch3)

  // City silhouette behind building (tiled across)
  ctx.globalAlpha = 0.25
  const cityH = Math.max(24, h * 0.04)
  const cityChunk = w * 0.55
  for (let cx = -w * 0.05; cx < w * 1.05; cx += cityChunk) {
    drawSprite(ctx, bg, 'citySilhouette', cx, ey - cityH * 1.6, cityChunk, cityH)
  }

  ctx.globalAlpha = 1
}

function drawBuilding(ctx, w, h, entranceY, t, sp) {
  const baseY = h * entranceY
  const ext = sp ? sp.exteriors : null

  // Building dimensions
  const bw = w * 0.55
  const bh = baseY * 0.7
  const bx = (w - bw) / 2
  const by = baseY - bh

  // Dark building body (base layer behind sprites)
  ctx.fillStyle = '#0f1830'
  ctx.fillRect(bx, by, bw, bh)

  // Wings
  const lwW = w * 0.18, lwH = bh * 0.55
  ctx.fillRect(bx - lwW + 4, baseY - lwH, lwW, lwH)
  ctx.fillRect(bx + bw - 4, baseY - lwH, lwW, lwH)

  // Parapet
  ctx.fillRect(bx + bw * 0.1, by - bh * 0.08, bw * 0.8, bh * 0.08)

  if (ext && ext.ready) {
    // === SPRITE FACADE ===

    // Upper facade (glass windows section) - top 40% of building
    ctx.globalAlpha = 0.9
    const facadeUpperH = bh * 0.4
    drawSprite(ctx, ext, 'facadeUpper', bx, by, bw, facadeUpperH)

    // Lower facade (blue panels + brick) - middle 35%
    const facadeLowerH = bh * 0.35
    drawSprite(ctx, ext, 'facadeLower', bx, by + facadeUpperH, bw, facadeLowerH)

    // Entrance doors at bottom of building
    const entranceH = bh * 0.25
    drawSprite(ctx, ext, 'entrance', bx, baseY - entranceH, bw, entranceH)

    // Dark canopy above entrance
    ctx.globalAlpha = 0.8
    const canopyH = bh * 0.08
    drawSprite(ctx, ext, 'darkCanopy', bx, baseY - entranceH - canopyH * 0.5, bw, canopyH)

    // "HOSPITAL" text centered
    ctx.globalAlpha = 0.85
    const textW = bw * 0.5
    const textH = textW * (32 / 200)
    drawSprite(ctx, ext, 'hospitalText',
      w / 2 - textW / 2,
      by + facadeUpperH + facadeLowerH * 0.3 - textH / 2,
      textW, textH
    )

    // Red cross on roof (pulsing)
    ctx.globalAlpha = 0.6 + 0.4 * Math.sin(t * 0.003)
    const crossSize = bw * 0.08
    drawSprite(ctx, ext, 'redCross',
      w / 2 - crossSize / 2,
      by - crossSize * 0.6,
      crossSize, crossSize
    )
    // Red cross glow
    ctx.globalAlpha = (0.6 + 0.4 * Math.sin(t * 0.003)) * 0.12
    ctx.fillStyle = '#ff4444'
    ctx.beginPath()
    ctx.arc(w / 2, by - crossSize * 0.6 + crossSize / 2, crossSize * 1.5, 0, Math.PI * 2)
    ctx.fill()

    // Wings get the facade tiled on them
    ctx.globalAlpha = 0.7
    drawSprite(ctx, ext, 'facadeUpper', bx - lwW + 4, baseY - lwH, lwW, lwH * 0.55)
    drawSprite(ctx, ext, 'facadeLower', bx - lwW + 4, baseY - lwH * 0.45, lwW, lwH * 0.45)
    drawSprite(ctx, ext, 'facadeUpper', bx + bw - 4, baseY - lwH, lwW, lwH * 0.55)
    drawSprite(ctx, ext, 'facadeLower', bx + bw - 4, baseY - lwH * 0.45, lwW, lwH * 0.45)

    ctx.globalAlpha = 1
  }

  // Animated window glow overlay (adds flickering life on top of sprite)
  const rows = 4, cols = 6
  const winW = bw * 0.06, winH = bh * 0.06
  const padX = bw * 0.08, padY = bh * 0.08
  const gridW = (bw - padX * 2 - winW) / (cols - 1)
  const gridH = (bh - padY * 2 - winH) / (rows - 1)

  for (let r = 0; r < rows; r++) {
    for (let c = 0; c < cols; c++) {
      const wx = bx + padX + c * gridW
      const wy = by + padY + r * gridH
      const on = Math.sin(t * 0.0008 + r * 2.3 + c * 1.7) > -0.3
      if (on) {
        const flicker = 0.5 + 0.5 * Math.sin(t * 0.002 + r + c * 3)
        ctx.globalAlpha = 0.08 + flicker * 0.1
        ctx.fillStyle = '#ffb84d'
        ctx.fillRect(wx, wy, winW, winH)
        // Soft glow halo
        ctx.globalAlpha = 0.03 + flicker * 0.02
        ctx.fillRect(wx - 2, wy - 2, winW + 4, winH + 4)
      }
    }
  }

  // Wing window glows (smaller)
  for (let r = 0; r < 2; r++) {
    for (let c = 0; c < 2; c++) {
      const on = Math.sin(t * 0.001 + r * 5 + c * 3 + 10) > -0.2
      if (!on) continue
      const flicker = 0.4 + 0.3 * Math.sin(t * 0.0025 + r + c)
      ctx.globalAlpha = flicker * 0.15
      ctx.fillStyle = '#ffb84d'
      ctx.fillRect(bx - lwW + 14 + c * lwW * 0.4, baseY - lwH + 10 + r * lwH * 0.4, winW * 0.7, winH * 0.7)
      ctx.fillRect(bx + bw + 10 + c * lwW * 0.4, baseY - lwH + 10 + r * lwH * 0.4, winW * 0.7, winH * 0.7)
    }
  }
  ctx.globalAlpha = 1
}

function drawEntranceLine(ctx, w, h, entranceY, t) {
  const ey = h * entranceY

  const lineGrad = ctx.createLinearGradient(0, ey - 3, 0, ey + 3)
  lineGrad.addColorStop(0, 'rgba(64,224,208,0)')
  lineGrad.addColorStop(0.4, 'rgba(64,224,208,0.6)')
  lineGrad.addColorStop(0.5, 'rgba(64,224,208,0.9)')
  lineGrad.addColorStop(0.6, 'rgba(64,224,208,0.6)')
  lineGrad.addColorStop(1, 'rgba(64,224,208,0)')
  ctx.fillStyle = lineGrad
  ctx.fillRect(0, ey - 4, w, 8)

  const shimmerX = ((t * 0.05) % (w * 1.5)) - w * 0.25
  const shimGrad = ctx.createRadialGradient(shimmerX, ey, 0, shimmerX, ey, w * 0.15)
  shimGrad.addColorStop(0, 'rgba(200,255,250,0.35)')
  shimGrad.addColorStop(1, 'rgba(200,255,250,0)')
  ctx.fillStyle = shimGrad
  ctx.fillRect(0, ey - 10, w, 20)

  const glowAbove = ctx.createLinearGradient(0, ey - h * 0.06, 0, ey)
  glowAbove.addColorStop(0, 'rgba(64,224,208,0)')
  glowAbove.addColorStop(1, 'rgba(64,224,208,0.08)')
  ctx.fillStyle = glowAbove
  ctx.fillRect(0, ey - h * 0.06, w, h * 0.06)

  const glowBelow = ctx.createLinearGradient(0, ey, 0, ey + h * 0.08)
  glowBelow.addColorStop(0, 'rgba(64,224,208,0.1)')
  glowBelow.addColorStop(1, 'rgba(64,224,208,0)')
  ctx.fillStyle = glowBelow
  ctx.fillRect(0, ey, w, h * 0.08)

  const doorW = w * 0.06, doorH = h * 0.04
  const doorCount = 5
  const spacing = w / (doorCount + 1)
  ctx.strokeStyle = 'rgba(64,224,208,0.3)'
  ctx.lineWidth = 1
  for (let i = 1; i <= doorCount; i++) {
    const dx = i * spacing - doorW / 2
    ctx.strokeRect(dx, ey - doorH / 2, doorW, doorH)
    ctx.fillStyle = 'rgba(64,224,208,0.5)'
    ctx.beginPath()
    ctx.arc(dx + doorW * 0.8, ey, 1.5, 0, Math.PI * 2)
    ctx.fill()
  }
}

function drawLightRays(ctx, w, h, entranceY, t, depthNorm) {
  const ey = h * entranceY
  const rayCount = 7
  const intensity = 0.5 + depthNorm * 0.3

  for (let i = 0; i < rayCount; i++) {
    const baseX = (i + 0.5) / rayCount * w + Math.sin(t * 0.0003 + i * 2.1) * w * 0.04
    const spread = w * 0.03 + Math.sin(t * 0.0005 + i) * w * 0.01
    const rayAlpha = (0.03 + 0.02 * Math.sin(t * 0.0007 + i * 1.5)) * intensity
    const rayLen = h * (0.35 + depthNorm * 0.25)

    const grad = ctx.createLinearGradient(baseX, ey, baseX + spread * 2, ey + rayLen)
    grad.addColorStop(0, `rgba(64,224,208,${rayAlpha})`)
    grad.addColorStop(0.5, `rgba(100,220,200,${rayAlpha * 0.4})`)
    grad.addColorStop(1, 'rgba(100,220,200,0)')

    ctx.fillStyle = grad
    ctx.beginPath()
    ctx.moveTo(baseX - spread, ey)
    ctx.lineTo(baseX + spread * 2, ey)
    ctx.lineTo(baseX + spread * 5, ey + rayLen)
    ctx.lineTo(baseX - spread * 2, ey + rayLen)
    ctx.closePath()
    ctx.fill()
  }
}

function drawInteriorScenery(ctx, w, h, entranceY, t, depthNorm, sp) {
  const pat = sp ? sp.patient : null
  const lob = sp ? sp.lobby : null
  const rad = sp ? sp.radiology : null
  const wal = sp ? sp.walls : null

  // Tile scale: native 16px tiles drawn 2-3x for mobile visibility
  const tileScale = Math.max(2, Math.min(3, w / 500))
  const ts16 = 16 * tileScale
  const ts32 = 32 * tileScale

  // --- IV Drip stands (pixel art) ---
  const ivItems = [
    { x: 0.06, y: 0.5, sprite: 'ivPole1' },
    { x: 0.94, y: 0.55, sprite: 'ivPole2' },
    { x: 0.08, y: 0.75, sprite: 'ivPole3' },
    { x: 0.92, y: 0.8, sprite: 'ivPole4' },
  ]
  for (const iv of ivItems) {
    const visible = iv.y - entranceY < depthNorm * 0.8 + 0.15
    if (!visible) continue
    const a = Math.min(0.5, (depthNorm * 0.8 + 0.15 - (iv.y - entranceY)) * 2.5)
    ctx.globalAlpha = a
    const ivW = ts16
    const ivH = 48 * tileScale
    const ix = iv.x * w, iy = iv.y * h
    if (!drawSprite(ctx, pat, iv.sprite, ix - ivW / 2, iy - ivH, ivW, ivH)) {
      // Fallback: simple line art
      ctx.strokeStyle = '#0a1520'
      ctx.lineWidth = 2
      ctx.beginPath()
      ctx.moveTo(ix, iy)
      ctx.lineTo(ix, iy - h * 0.06)
      ctx.stroke()
      ctx.beginPath()
      ctx.moveTo(ix - 4, iy - h * 0.06)
      ctx.lineTo(ix + 4, iy - h * 0.06)
      ctx.stroke()
      ctx.fillStyle = 'rgba(40,80,100,0.3)'
      ctx.beginPath()
      ctx.ellipse(ix, iy - h * 0.05, 4, 7, 0, 0, Math.PI * 2)
      ctx.fill()
    }
  }
  ctx.globalAlpha = 1

  // --- EKG Monitors (pixel art + animated squiggle overlay) ---
  const monitors = [
    { x: 0.14, y: 0.58, sprite: 'monitor1' },
    { x: 0.86, y: 0.68, sprite: 'monitor2' },
    { x: 0.1, y: 0.88, sprite: 'monitor3' },
  ]
  for (const m of monitors) {
    const mx = m.x * w, my = m.y * h
    const visible = m.y - entranceY < depthNorm * 0.8 + 0.15
    if (!visible) continue
    const a = Math.min(0.55, (depthNorm * 0.8 + 0.15 - (m.y - entranceY)) * 2.5)
    ctx.globalAlpha = a

    const monW = ts32
    const monH = 24 * tileScale
    if (!drawSprite(ctx, pat, m.sprite, mx - monW / 2, my - monH / 2, monW, monH)) {
      ctx.fillStyle = '#0a1a25'
      ctx.fillRect(mx - 12, my - 8, 24, 16)
      ctx.strokeStyle = '#1a3040'
      ctx.lineWidth = 1
      ctx.strokeRect(mx - 12, my - 8, 24, 16)
    }

    // Animated EKG squiggle on the monitor sprite
    ctx.strokeStyle = '#00ff60'
    ctx.lineWidth = 1
    ctx.globalAlpha = a * 0.6
    ctx.beginPath()
    const monLeft = mx - monW / 2 + 4
    for (let px = 0; px < monW - 8; px += 2) {
      const phase = ((px + t * 0.05) % 20)
      let dy = 0
      if (phase > 8 && phase < 10) dy = -4
      else if (phase > 10 && phase < 12) dy = 6
      else if (phase > 12 && phase < 14) dy = -2
      else dy = Math.sin(px * 0.5) * 0.8
      if (px === 0) ctx.moveTo(monLeft + px, my + dy)
      else ctx.lineTo(monLeft + px, my + dy)
    }
    ctx.stroke()
  }
  ctx.globalAlpha = 1

  // --- Static hospital beds (pixel art) ---
  const beds = [
    { x: 0.2, y: 0.9, sprite: 'bedTeal' },
    { x: 0.75, y: 0.92, sprite: 'bedPurple' },
  ]
  for (const b of beds) {
    const bx = b.x * w, by = b.y * h
    const visible = b.y - entranceY < depthNorm * 0.8 + 0.15
    if (!visible) continue
    ctx.globalAlpha = 0.35
    const bedW = ts32 * 1.2
    const bedH = ts32
    if (!drawSprite(ctx, pat, b.sprite, bx - bedW / 2, by - bedH / 2, bedW, bedH)) {
      ctx.fillStyle = '#0a1520'
      ctx.fillRect(bx - 20, by - 4, 40, 8)
      ctx.fillRect(bx - 20, by - 12, 4, 12)
      ctx.fillRect(bx - 18, by + 4, 3, 5)
      ctx.fillRect(bx + 16, by + 4, 3, 5)
    }
  }
  ctx.globalAlpha = 1

  // --- Vending machines (from lobby sheet) ---
  const vending = [
    { x: 0.04, y: 0.62, sprite: 'vendingMachine1' },
    { x: 0.96, y: 0.72, sprite: 'vendingMachine2' },
    { x: 0.03, y: 0.85, sprite: 'vendingMachine3' },
  ]
  for (const v of vending) {
    const visible = v.y - entranceY < depthNorm * 0.8 + 0.15
    if (!visible) continue
    const a = Math.min(0.4, (depthNorm * 0.8 + 0.15 - (v.y - entranceY)) * 2)
    ctx.globalAlpha = a
    const vendW = ts32
    const vendH = 48 * tileScale
    drawSprite(ctx, lob, v.sprite, v.x * w - vendW / 2, v.y * h - vendH, vendW, vendH)
  }
  ctx.globalAlpha = 1

  // --- Waiting chairs (lobby level) ---
  const chairs = [
    { x: 0.3, y: 0.48, sprite: 'waitingChairs' },
    { x: 0.7, y: 0.5, sprite: 'waitingChairs' },
  ]
  for (const c of chairs) {
    const visible = c.y - entranceY < depthNorm * 0.8 + 0.15
    if (!visible) continue
    const a = Math.min(0.4, (depthNorm * 0.8 + 0.15 - (c.y - entranceY)) * 2)
    ctx.globalAlpha = a
    const chairW = 48 * tileScale
    const chairH = ts32
    drawSprite(ctx, lob, c.sprite, c.x * w - chairW / 2, c.y * h - chairH / 2, chairW, chairH)
  }
  ctx.globalAlpha = 1

  // --- Reception desk (lobby) ---
  if (depthNorm > 0.05) {
    const rdA = Math.min(0.45, (depthNorm - 0.05) * 1.5)
    ctx.globalAlpha = rdA
    const rdW = 80 * tileScale
    const rdH = ts32
    drawSprite(ctx, lob, 'receptionDesk', w * 0.5 - rdW / 2, h * 0.42, rdW, rdH)
  }
  ctx.globalAlpha = 1

  // --- Doors along the walls ---
  if (depthNorm > 0.2) {
    const doorA = Math.min(0.3, (depthNorm - 0.2) * 0.6)
    ctx.globalAlpha = doorA
    const doorW = ts32
    const doorH = 48 * tileScale
    drawSprite(ctx, wal, 'doorDark', w * 0.01, h * 0.5 - doorH / 2, doorW, doorH)
    drawSprite(ctx, wal, 'doorGreen', w * 0.01, h * 0.7 - doorH / 2, doorW, doorH)
    drawSprite(ctx, wal, 'doorRed', w * 0.99 - doorW, h * 0.55 - doorH / 2, doorW, doorH, true)
    drawSprite(ctx, wal, 'doorDark', w * 0.99 - doorW, h * 0.78 - doorH / 2, doorW, doorH, true)
  }
  ctx.globalAlpha = 1

  // --- X-ray screens (radiology) ---
  if (depthNorm > 0.35) {
    const xrA = Math.min(0.45, (depthNorm - 0.35) * 1.5)
    ctx.globalAlpha = xrA
    const xrS = ts32
    drawSprite(ctx, rad, 'xrayScreen1', w * 0.88, h * 0.6, xrS, xrS)
    drawSprite(ctx, rad, 'xrayScreen2', w * 0.12 - xrS, h * 0.7, xrS, xrS)
  }
  ctx.globalAlpha = 1

  // --- MRI machine (deep in radiology) ---
  if (depthNorm > 0.4) {
    const mriA = Math.min(0.4, (depthNorm - 0.4) * 1.2)
    ctx.globalAlpha = mriA
    const mriW = 96 * tileScale
    const mriH = 64 * tileScale
    drawSprite(ctx, rad, 'mriMachine', w * 0.5 - mriW / 2, h * 0.88 - mriH / 2, mriW, mriH)
  }
  ctx.globalAlpha = 1

  // --- Hazard symbol near MRI (pulsing) ---
  if (depthNorm > 0.45) {
    const hzA = Math.min(0.4, (depthNorm - 0.45))
    const pulse = 0.6 + 0.4 * Math.sin(t * 0.004)
    ctx.globalAlpha = hzA * pulse
    const hzS = 24 * tileScale
    drawSprite(ctx, rad, 'hazardSymbol', w * 0.4 - hzS, h * 0.84, hzS, hzS)
  }
  ctx.globalAlpha = 1

  // --- Surgical lights (OR depth) ---
  if (depthNorm > 0.5) {
    const slA = Math.min(0.35, (depthNorm - 0.5) * 0.8)
    ctx.globalAlpha = slA
    const slS = 48 * tileScale
    drawSprite(ctx, rad, 'surgicalLight', w * 0.5 - slS / 2, h * 0.42, slS, slS)
    ctx.globalAlpha = slA * 0.7
    drawSprite(ctx, rad, 'surgicalLight', w * 0.3 - slS / 2, h * 0.52, slS * 0.8, slS * 0.8)
  }
  ctx.globalAlpha = 1

  // --- Scrubs rack (deep) ---
  if (depthNorm > 0.55) {
    const srA = Math.min(0.3, (depthNorm - 0.55) * 0.8)
    ctx.globalAlpha = srA
    const srW = 80 * tileScale
    const srH = 80 * tileScale
    drawSprite(ctx, rad, 'scrubsRack', w * 0.85 - srW / 2, h * 0.82, srW, srH)
  }
  ctx.globalAlpha = 1

  // --- Small life details: flowers, trashcans ---
  const details = [
    { x: 0.18, y: 0.52, sprite: 'flower', sheet: 'patient' },
    { x: 0.82, y: 0.56, sprite: 'trashcan', sheet: 'patient' },
    { x: 0.25, y: 0.76, sprite: 'flower', sheet: 'patient' },
  ]
  for (const item of details) {
    const visible = item.y - entranceY < depthNorm * 0.8 + 0.15
    if (!visible) continue
    const a = Math.min(0.4, (depthNorm * 0.8 + 0.15 - (item.y - entranceY)) * 2)
    ctx.globalAlpha = a
    const sheet = sp ? sp[item.sheet] : null
    drawSprite(ctx, sheet, item.sprite, item.x * w, item.y * h, ts16, ts16)
  }
  ctx.globalAlpha = 1

  // --- Wall-mounted monitors (lobby) ---
  if (depthNorm > 0.1) {
    const wmA = Math.min(0.35, (depthNorm - 0.1) * 0.8)
    ctx.globalAlpha = wmA
    const wmW = 48 * tileScale
    const wmH = ts32
    drawSprite(ctx, lob, 'monitorWall', w * 0.15, h * 0.44, wmW, wmH)
    drawSprite(ctx, lob, 'monitorWall', w * 0.82, h * 0.5, wmW, wmH)
  }
  ctx.globalAlpha = 1
}

function drawMovingElements(ctx, w, h, t, depthNorm, sp) {
  const elems = _elementsRef ? _elementsRef.current : []
  const pat = sp ? sp.patient : null
  const ext = sp ? sp.exteriors : null

  const tileScale = Math.max(2, Math.min(3, w / 500))

  for (const e of elems) {
    const elemDepthNorm = (e.y - 0.32) / 0.68
    if (elemDepthNorm > depthNorm + 0.2) continue

    // Move horizontally
    e.x += e.dir * e.speed * 0.00035
    if (e.dir > 0 && e.x > 1.3) e.x = -0.3
    if (e.dir < 0 && e.x < -0.3) e.x = 1.3

    const px = e.x * w, py = e.y * h
    const sc = e.size
    const fadeIn = Math.min(1, (depthNorm + 0.2 - elemDepthNorm) * 3)
    ctx.globalAlpha = e.alpha * fadeIn

    if (e.type === 'bed') {
      // Sprite-based hospital bed
      const bedW = 32 * tileScale * sc
      const bedH = 32 * tileScale * sc
      const flipX = e.dir < 0
      if (!drawSprite(ctx, pat, e.sprite, px - bedW / 2, py - bedH / 2, bedW, bedH, flipX)) {
        ctx.fillStyle = '#0a1520'
        drawGurneyFallback(ctx, px, py, sc, e.dir)
      }
    } else if (e.type === 'ambulance') {
      // Sprite-based ambulance in exterior zone
      const ambW = 128 * tileScale * sc * 0.5
      const ambH = 64 * tileScale * sc * 0.5
      const flipX = e.dir < 0
      if (!drawSprite(ctx, ext, e.sprite, px - ambW / 2, py - ambH / 2, ambW, ambH, flipX)) {
        ctx.fillStyle = '#0a1520'
        ctx.fillRect(px - 20 * sc, py - 8 * sc, 40 * sc, 16 * sc)
      }
    } else if (e.type === 'figure') {
      ctx.fillStyle = '#0a1520'
      drawFigure(ctx, px, py, sc, t, e.dir)
    } else if (e.type === 'wheelchair') {
      ctx.fillStyle = '#0a1520'
      drawWheelchair(ctx, px, py, sc, e.dir)
    } else if (e.type === 'nurse') {
      ctx.fillStyle = '#0a1520'
      drawNurse(ctx, px, py, sc, t, e.dir)
    }
  }
  ctx.globalAlpha = 1
}

// --- Silhouette draw functions (kept for figures/wheelchair/nurse -- they look good as depth shadows) ---

function drawGurneyFallback(ctx, x, y, sc, dir) {
  const s = 18 * sc
  ctx.fillRect(x - s, y - s * 0.3, s * 2, s * 0.25)
  ctx.fillRect(x - s * 0.8, y - s * 0.05, 2, s * 0.3)
  ctx.fillRect(x + s * 0.7, y - s * 0.05, 2, s * 0.3)
  ctx.beginPath()
  ctx.arc(x - s * 0.7, y + s * 0.3, 3 * sc, 0, Math.PI * 2)
  ctx.arc(x + s * 0.7, y + s * 0.3, 3 * sc, 0, Math.PI * 2)
  ctx.fill()
  const px = dir > 0 ? x - s * 0.7 : x + s * 0.5
  ctx.fillRect(px, y - s * 0.5, s * 0.3, s * 0.2)
}

function drawFigure(ctx, x, y, sc, t, dir) {
  const s = 14 * sc
  ctx.beginPath()
  ctx.arc(x, y - s * 1.3, s * 0.3, 0, Math.PI * 2)
  ctx.fill()
  ctx.fillRect(x - s * 0.2, y - s, s * 0.4, s * 0.7)
  ctx.fillRect(x - s * 0.15, y - s * 0.3, 3, s * 0.5)
  ctx.save()
  ctx.translate(x + s * 0.05, y - s * 0.3)
  ctx.fillRect(0, 0, 3, s * 0.5)
  ctx.restore()
}

function drawWheelchair(ctx, x, y, sc, dir) {
  const s = 12 * sc
  ctx.fillRect(x - s * 0.5, y - s * 0.3, s, s * 0.2)
  ctx.fillRect(dir > 0 ? x - s * 0.5 : x + s * 0.3, y - s * 0.9, 3, s * 0.7)
  ctx.beginPath()
  ctx.arc(dir > 0 ? x + s * 0.3 : x - s * 0.3, y + s * 0.1, s * 0.35, 0, Math.PI * 2)
  ctx.fill()
  ctx.beginPath()
  ctx.arc(dir > 0 ? x - s * 0.4 : x + s * 0.4, y + s * 0.1, s * 0.15, 0, Math.PI * 2)
  ctx.fill()
  ctx.beginPath()
  ctx.arc(x, y - s * 0.7, s * 0.25, 0, Math.PI * 2)
  ctx.fill()
}

function drawNurse(ctx, x, y, sc, t, dir) {
  const s = 14 * sc
  ctx.beginPath()
  ctx.arc(x, y - s * 1.4, s * 0.28, 0, Math.PI * 2)
  ctx.fill()
  ctx.fillRect(x - s * 0.2, y - s * 1.7, s * 0.4, s * 0.1)
  ctx.fillRect(x - s * 0.25, y - s * 1.1, s * 0.5, s * 0.8)
  const clipX = dir > 0 ? x + s * 0.3 : x - s * 0.45
  ctx.fillRect(clipX, y - s * 0.8, s * 0.15, s * 0.35)
  ctx.fillRect(x - s * 0.15, y - s * 0.3, 3, s * 0.5)
  ctx.fillRect(x + s * 0.05, y - s * 0.3, 3, s * 0.5)
}

function drawBubbles(ctx, w, h, t) {
  const bubbles = _bubblesRef ? _bubblesRef.current : []
  for (const b of bubbles) {
    b.y -= b.speed
    b.x += b.drift + Math.sin(t * 0.001 + b.phase) * 0.00003
    if (b.y < 0.3) { b.y = 1.02; b.x = Math.random() }
    const flicker = 0.6 + 0.4 * Math.sin(t * 0.002 + b.phase)
    ctx.globalAlpha = b.alpha * flicker
    ctx.strokeStyle = 'rgba(100,200,210,0.5)'
    ctx.lineWidth = 0.5
    ctx.beginPath()
    ctx.arc(b.x * w, b.y * h, b.r, 0, Math.PI * 2)
    ctx.stroke()
    ctx.fillStyle = 'rgba(180,240,250,0.3)'
    ctx.beginPath()
    ctx.arc(b.x * w - b.r * 0.3, b.y * h - b.r * 0.3, b.r * 0.3, 0, Math.PI * 2)
    ctx.fill()
  }
  ctx.globalAlpha = 1
}

function drawDepthMarkers(ctx, w, h, sd, maxD) {
  const labels = ['LOBBY', 'WARD', 'ICU', 'OR']
  const depths = [0, 625, 1250, 1875]
  const positions = [0.4, 0.55, 0.72, 0.88]
  const markerX = w - 30

  ctx.strokeStyle = 'rgba(64,192,160,0.1)'
  ctx.lineWidth = 1
  ctx.beginPath()
  ctx.moveTo(markerX, h * 0.38)
  ctx.lineTo(markerX, h * 0.92)
  ctx.stroke()

  ctx.font = `${Math.max(8, w * 0.012) | 0}px monospace`
  ctx.textAlign = 'right'

  for (let i = 0; i < labels.length; i++) {
    const y = h * positions[i]
    const active = i === labels.length - 1
      ? sd >= depths[i]
      : sd >= depths[i] && sd < depths[i + 1]
    ctx.globalAlpha = active ? 0.75 : 0.18
    ctx.fillStyle = '#40c0a0'
    ctx.fillRect(markerX - 4, y, 8, 1)
    ctx.fillText(labels[i], markerX - 10, y + 4)
    ctx.beginPath()
    ctx.arc(markerX, y, active ? 3.5 : 2, 0, Math.PI * 2)
    ctx.fill()
  }

  const normSD = Math.min(sd / maxD, 1)
  const curY = h * (0.38 + normSD * 0.54)
  ctx.globalAlpha = 0.6
  ctx.fillStyle = '#40c0a0'
  ctx.beginPath()
  ctx.moveTo(markerX + 7, curY)
  ctx.lineTo(markerX + 2, curY - 4)
  ctx.lineTo(markerX + 2, curY + 4)
  ctx.closePath()
  ctx.fill()
  ctx.globalAlpha = 1
}

function drawEKG(ctx, w, h, t, depthNorm) {
  const y0 = h * 0.78
  const speed = t * 0.08
  const alpha = Math.min(0.3, (depthNorm - 0.25) * 0.6)
  ctx.strokeStyle = `rgba(0,255,96,${alpha})`
  ctx.lineWidth = 1.5
  ctx.beginPath()
  for (let x = 0; x < w; x += 2) {
    const phase = (x + speed) % 180
    let dy = 0
    if (phase > 60 && phase < 64) dy = -14
    else if (phase > 64 && phase < 68) dy = 20
    else if (phase > 68 && phase < 72) dy = -9
    else if (phase > 72 && phase < 76) dy = 0
    else dy = Math.sin((x + speed) * 0.015) * 1.2
    if (x === 0) ctx.moveTo(x, y0 + dy)
    else ctx.lineTo(x, y0 + dy)
  }
  ctx.stroke()
}

function drawStatusLights(ctx, w, h, t, depthNorm) {
  if (depthNorm < 0.15) return
  const lights = [
    { x: 0.12, y: 0.42, color: '#44ff88', rate: 0.003 },
    { x: 0.88, y: 0.48, color: '#ff4444', rate: 0.005 },
    { x: 0.5,  y: 0.44, color: '#ffaa44', rate: 0.004 },
    { x: 0.22, y: 0.6,  color: '#44ff88', rate: 0.0035 },
    { x: 0.78, y: 0.7,  color: '#ff4444', rate: 0.006 },
    { x: 0.4,  y: 0.85, color: '#ffaa44', rate: 0.0025 },
  ]
  for (const l of lights) {
    const elemDepth = (l.y - 0.32) / 0.68
    if (elemDepth > depthNorm + 0.15) continue
    const blink = Math.sin(t * l.rate + l.x * 50) > 0.2 ? 1 : 0.08
    const fadeIn = Math.min(1, (depthNorm + 0.15 - elemDepth) * 4)
    ctx.globalAlpha = 0.5 * blink * fadeIn
    ctx.fillStyle = l.color
    ctx.beginPath()
    ctx.arc(l.x * w, l.y * h, 3, 0, Math.PI * 2)
    ctx.fill()
    if (blink > 0.5) {
      ctx.globalAlpha = 0.06 * fadeIn
      ctx.beginPath()
      ctx.arc(l.x * w, l.y * h, 15, 0, Math.PI * 2)
      ctx.fill()
    }
  }
  ctx.globalAlpha = 1
}

function drawCurtains(ctx, w, h, t, depthNorm) {
  if (depthNorm < 0.3) return
  const alpha = Math.min(0.2, (depthNorm - 0.3) * 0.4)
  const curtainColor = 'rgba(10,25,40,'

  for (let i = 0; i < 4; i++) {
    const baseX = w * 0.02 + i * w * 0.012
    const baseY = h * 0.85
    const sway = Math.sin(t * 0.0015 + i * 1.5) * 6

    ctx.globalAlpha = alpha * (0.5 + i * 0.15)
    ctx.strokeStyle = `${curtainColor}${alpha * 2})`
    ctx.lineWidth = 2.5
    ctx.beginPath()
    ctx.moveTo(baseX, baseY)
    ctx.quadraticCurveTo(baseX + sway, baseY + h * 0.06, baseX + sway * 0.5, h)
    ctx.stroke()
  }

  for (let i = 0; i < 4; i++) {
    const baseX = w * 0.98 - i * w * 0.012
    const baseY = h * 0.85
    const sway = Math.sin(t * 0.0015 + i * 1.5 + 3) * 6

    ctx.globalAlpha = alpha * (0.5 + i * 0.15)
    ctx.strokeStyle = `${curtainColor}${alpha * 2})`
    ctx.lineWidth = 2.5
    ctx.beginPath()
    ctx.moveTo(baseX, baseY)
    ctx.quadraticCurveTo(baseX + sway, baseY + h * 0.06, baseX + sway * 0.5, h)
    ctx.stroke()
  }
  ctx.globalAlpha = 1
}
