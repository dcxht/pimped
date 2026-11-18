// HospitalScene - Fully procedural Canvas scene (no stock images)
// Krillion-style layered world: night sky exterior -> entrance line -> deep hospital interior
// Everything drawn with Canvas API. Animated elements at multiple depths.

import { useRef, useEffect } from 'react'

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
  // Horizontal elements at specific depths (like Krillion's fish)
  return [
    // Gurneys
    { type: 'gurney', y: 0.46, speed: 0.15, dir: 1, x: -0.2, size: 1.0, alpha: 0.5 },
    { type: 'gurney', y: 0.62, speed: 0.08, dir: -1, x: 1.2, size: 0.7, alpha: 0.3 },
    // Walking figures
    { type: 'figure', y: 0.44, speed: 0.2, dir: 1, x: -0.3, size: 1.0, alpha: 0.45 },
    { type: 'figure', y: 0.55, speed: 0.12, dir: -1, x: 1.3, size: 0.8, alpha: 0.35 },
    { type: 'figure', y: 0.72, speed: 0.06, dir: 1, x: -0.5, size: 0.55, alpha: 0.2 },
    // Wheelchairs
    { type: 'wheelchair', y: 0.52, speed: 0.1, dir: -1, x: 1.1, size: 0.85, alpha: 0.4 },
    { type: 'wheelchair', y: 0.82, speed: 0.04, dir: 1, x: -0.4, size: 0.45, alpha: 0.15 },
    // Nurse with clipboard
    { type: 'nurse', y: 0.65, speed: 0.09, dir: 1, x: -0.6, size: 0.65, alpha: 0.28 },
  ]
}

export default function HospitalScene({ depth = 0, maxDepth = 2500 }) {
  const canvasRef = useRef(null)
  const rafRef = useRef(null)
  const depthRef = useRef(depth)
  const smoothDepthRef = useRef(depth)
  const starsRef = useRef(createStars())
  const bubblesRef = useRef(createBubbles())
  const elementsRef = useRef(createMovingElements())

  depthRef.current = depth

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

  // Load muchopixels sprite sheets
  const spritesRef = useRef({})
  useEffect(() => {
    const load = (name, src) => {
      const img = new Image()
      img.src = src
      img.onload = () => { spritesRef.current[name] = img }
    }
    load('exteriors', '/sprites/mp-exteriors.png')
    load('patient', '/sprites/mp-patient.png')
    load('lobby', '/sprites/mp-lobby.png')
    load('radiology', '/sprites/mp-radiology.png')
    load('background', '/sprites/mp-background.png')
  }, [])

  // Main loop
  useEffect(() => {
    const canvas = canvasRef.current
    if (!canvas) return
    const ctx = canvas.getContext('2d')

    const ENTRANCE_Y = 0.32 // The "water line" - entrance at 32% of screen

    const frame = (t) => {
      const w = canvas.width, h = canvas.height
      smoothDepthRef.current += (depthRef.current - smoothDepthRef.current) * 0.05
      const sd = smoothDepthRef.current
      const depthNorm = Math.min(sd / maxDepth, 1) // 0..1

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

      // ========== 4. BUILDING SILHOUETTE ==========
      drawBuilding(ctx, w, h, ENTRANCE_Y, t)

      // ========== 4b. PIXEL ART SPRITES (muchopixels) ==========
      ctx.imageSmoothingEnabled = false
      const sp = spritesRef.current

      // Hospital exterior facade from mp-exteriors.png (top 160px of sheet = building entrance)
      if (sp.exteriors) {
        const ey = h * ENTRANCE_Y
        const bw = w * 0.7
        const bh = bw * (160 / 288)
        ctx.globalAlpha = 0.6
        ctx.drawImage(sp.exteriors, 0, 0, 288, 160, (w - bw) / 2, ey - bh, bw, bh)
        ctx.globalAlpha = 1
      }

      // ========== 5. ENTRANCE LINE (the "water surface") ==========
      drawEntranceLine(ctx, w, h, ENTRANCE_Y, t)

      // ========== 6. LIGHT RAYS piercing down from entrance ==========
      drawLightRays(ctx, w, h, ENTRANCE_Y, t, depthNorm)

      // ========== 7. HOSPITAL INTERIOR ELEMENTS (static scenery) ==========
      drawInteriorScenery(ctx, w, h, ENTRANCE_Y, t, depthNorm)

      // ========== 7b. PIXEL ART INTERIOR SPRITES ==========
      ctx.imageSmoothingEnabled = false
      // Patient room equipment along left edge (beds, IV)
      if (sp.patient && depthNorm > 0.1) {
        const a = Math.min(0.4, depthNorm * 0.6)
        ctx.globalAlpha = a
        // Beds from patient sprite (top-left area, ~128x48)
        ctx.drawImage(sp.patient, 0, 32, 128, 48, w * 0.02, h * 0.55, 80, 30)
        ctx.drawImage(sp.patient, 0, 32, 128, 48, w * 0.85, h * 0.65, 70, 26)
        // IV poles (mid area, ~32x64)
        ctx.drawImage(sp.patient, 128, 0, 32, 80, w * 0.06, h * 0.45, 20, 50)
        ctx.drawImage(sp.patient, 128, 0, 32, 80, w * 0.90, h * 0.55, 18, 45)
        ctx.globalAlpha = 1
      }
      // Lobby items along edges (vending machines, chairs)
      if (sp.lobby && depthNorm > 0.05) {
        const a = Math.min(0.35, depthNorm * 0.5)
        ctx.globalAlpha = a
        // Vending machines (top-right area of lobby sheet, ~48x64)
        ctx.drawImage(sp.lobby, 96, 0, 48, 64, w * 0.88, h * 0.42, 36, 48)
        // Waiting chairs (bottom-left, ~96x32)
        ctx.drawImage(sp.lobby, 0, 96, 96, 32, w * 0.03, h * 0.72, 60, 20)
        ctx.globalAlpha = 1
      }
      // Radiology equipment deep in interior
      if (sp.radiology && depthNorm > 0.4) {
        const a = Math.min(0.3, (depthNorm - 0.4) * 0.8)
        ctx.globalAlpha = a
        // MRI machine (bottom-left of radiology sheet, ~64x48)
        ctx.drawImage(sp.radiology, 0, 192, 64, 48, w * 0.3, h * 0.82, 60, 45)
        // Surgical lights (top-right, ~48x48)
        ctx.drawImage(sp.radiology, 160, 0, 48, 48, w * 0.5, h * 0.76, 40, 40)
        ctx.globalAlpha = 1
      }

      // ========== 8. ANIMATED HORIZONTAL ELEMENTS ==========
      drawMovingElements(ctx, w, h, t, depthNorm)

      // ========== 9. BUBBLES (rising particles) ==========
      drawBubbles(ctx, w, h, t)

      // ========== 10. DEPTH MARKERS ==========
      drawDepthMarkers(ctx, w, h, sd, maxDepth)

      // ========== 11. EKG LINE ==========
      if (depthNorm > 0.25) drawEKG(ctx, w, h, t, depthNorm)

      // ========== 12. STATUS LIGHTS ==========
      drawStatusLights(ctx, w, h, t, depthNorm)

      // ========== 13. CURTAINS (swaying at bottom edges, like seaweed) ==========
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

function drawBuilding(ctx, w, h, entranceY, t) {
  const baseY = h * entranceY
  const bldgColor = '#0f1830'
  const winColor = '#ffb84d'

  // Main building body (centered)
  const bw = w * 0.55, bh = baseY * 0.7
  const bx = (w - bw) / 2, by = baseY - bh

  ctx.fillStyle = bldgColor
  ctx.fillRect(bx, by, bw, bh)

  // Left wing
  const lwW = w * 0.18, lwH = bh * 0.55
  ctx.fillRect(bx - lwW + 4, baseY - lwH, lwW, lwH)

  // Right wing
  ctx.fillRect(bx + bw - 4, baseY - lwH, lwW, lwH)

  // Roof detail / parapet
  ctx.fillRect(bx + bw * 0.1, by - bh * 0.08, bw * 0.8, bh * 0.08)

  // ---- WINDOWS (glowing amber) ----
  const rows = 4, cols = 6
  const winW = bw * 0.07, winH = bh * 0.08
  const padX = bw * 0.08, padY = bh * 0.06
  const gridW = (bw - padX * 2 - winW) / (cols - 1)
  const gridH = (bh - padY * 2 - winH) / (rows - 1)

  for (let r = 0; r < rows; r++) {
    for (let c = 0; c < cols; c++) {
      const wx = bx + padX + c * gridW
      const wy = by + padY + r * gridH
      // Some windows flicker
      const on = Math.sin(t * 0.0008 + r * 2.3 + c * 1.7) > -0.3
      if (on) {
        const flicker = 0.5 + 0.5 * Math.sin(t * 0.002 + r + c * 3)
        ctx.globalAlpha = 0.4 + flicker * 0.4
        ctx.fillStyle = winColor
        ctx.fillRect(wx, wy, winW, winH)
        // Glow
        ctx.globalAlpha = 0.06 + flicker * 0.04
        ctx.fillRect(wx - 2, wy - 2, winW + 4, winH + 4)
      }
    }
  }

  // Wing windows (smaller)
  for (let r = 0; r < 2; r++) {
    for (let c = 0; c < 2; c++) {
      const on = Math.sin(t * 0.001 + r * 5 + c * 3 + 10) > -0.2
      if (!on) continue
      const flicker = 0.4 + 0.3 * Math.sin(t * 0.0025 + r + c)
      ctx.globalAlpha = flicker
      ctx.fillStyle = winColor
      // Left wing
      ctx.fillRect(bx - lwW + 14 + c * lwW * 0.4, baseY - lwH + 10 + r * lwH * 0.4, winW * 0.7, winH * 0.7)
      // Right wing
      ctx.fillRect(bx + bw + 10 + c * lwW * 0.4, baseY - lwH + 10 + r * lwH * 0.4, winW * 0.7, winH * 0.7)
    }
  }
  ctx.globalAlpha = 1

  // ---- RED CROSS on top ----
  const crossSize = bw * 0.04
  const crossX = w / 2
  const crossY = by - bh * 0.08 - crossSize * 1.5
  const pulse = 0.6 + 0.4 * Math.sin(t * 0.003)

  ctx.globalAlpha = pulse
  ctx.fillStyle = '#ff4444'
  // Horizontal bar
  ctx.fillRect(crossX - crossSize * 1.5, crossY - crossSize * 0.4, crossSize * 3, crossSize * 0.8)
  // Vertical bar
  ctx.fillRect(crossX - crossSize * 0.4, crossY - crossSize * 1.5, crossSize * 0.8, crossSize * 3)
  // Glow
  ctx.globalAlpha = pulse * 0.15
  ctx.beginPath()
  ctx.arc(crossX, crossY, crossSize * 3, 0, Math.PI * 2)
  ctx.fillStyle = '#ff4444'
  ctx.fill()
  ctx.globalAlpha = 1
}

function drawEntranceLine(ctx, w, h, entranceY, t) {
  const ey = h * entranceY

  // Main bright line
  const lineGrad = ctx.createLinearGradient(0, ey - 3, 0, ey + 3)
  lineGrad.addColorStop(0, 'rgba(64,224,208,0)')
  lineGrad.addColorStop(0.4, 'rgba(64,224,208,0.6)')
  lineGrad.addColorStop(0.5, 'rgba(64,224,208,0.9)')
  lineGrad.addColorStop(0.6, 'rgba(64,224,208,0.6)')
  lineGrad.addColorStop(1, 'rgba(64,224,208,0)')
  ctx.fillStyle = lineGrad
  ctx.fillRect(0, ey - 4, w, 8)

  // Shimmer moving across
  const shimmerX = ((t * 0.05) % (w * 1.5)) - w * 0.25
  const shimGrad = ctx.createRadialGradient(shimmerX, ey, 0, shimmerX, ey, w * 0.15)
  shimGrad.addColorStop(0, 'rgba(200,255,250,0.35)')
  shimGrad.addColorStop(1, 'rgba(200,255,250,0)')
  ctx.fillStyle = shimGrad
  ctx.fillRect(0, ey - 10, w, 20)

  // Soft glow above and below
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

  // Glass door shapes
  const doorW = w * 0.06, doorH = h * 0.04
  const doorCount = 5
  const spacing = w / (doorCount + 1)
  ctx.strokeStyle = 'rgba(64,224,208,0.3)'
  ctx.lineWidth = 1
  for (let i = 1; i <= doorCount; i++) {
    const dx = i * spacing - doorW / 2
    ctx.strokeRect(dx, ey - doorH / 2, doorW, doorH)
    // Door handle dot
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

function drawInteriorScenery(ctx, w, h, entranceY, t, depthNorm) {
  const ey = h * entranceY
  const color = '#0a1520'

  // --- IV Drip stands along edges ---
  const ivPositions = [
    { x: 0.06, y: 0.5 }, { x: 0.94, y: 0.55 },
    { x: 0.08, y: 0.75 }, { x: 0.92, y: 0.8 },
  ]
  for (const iv of ivPositions) {
    const ix = iv.x * w, iy = iv.y * h
    const visible = iv.y - entranceY < depthNorm * 0.8 + 0.15
    if (!visible) continue
    const a = Math.min(0.3, (depthNorm * 0.8 + 0.15 - (iv.y - entranceY)) * 2)
    ctx.globalAlpha = a
    ctx.strokeStyle = color
    ctx.lineWidth = 2
    // Pole
    ctx.beginPath()
    ctx.moveTo(ix, iy); ctx.lineTo(ix, iy - h * 0.06)
    ctx.stroke()
    // Top hook
    ctx.beginPath()
    ctx.moveTo(ix - 4, iy - h * 0.06); ctx.lineTo(ix + 4, iy - h * 0.06)
    ctx.stroke()
    // Bag
    ctx.fillStyle = 'rgba(40,80,100,0.3)'
    ctx.beginPath()
    ctx.ellipse(ix, iy - h * 0.05, 4, 7, 0, 0, Math.PI * 2)
    ctx.fill()
    // Drip line
    ctx.strokeStyle = 'rgba(40,80,100,0.2)'
    ctx.lineWidth = 0.5
    ctx.beginPath()
    ctx.moveTo(ix, iy - h * 0.043); ctx.lineTo(ix, iy - h * 0.02)
    ctx.stroke()
    // Base
    ctx.fillStyle = color
    ctx.fillRect(ix - 5, iy, 10, 2)
  }
  ctx.globalAlpha = 1

  // --- EKG Monitors ---
  const monPositions = [
    { x: 0.14, y: 0.58 }, { x: 0.86, y: 0.68 }, { x: 0.1, y: 0.88 },
  ]
  for (const m of monPositions) {
    const mx = m.x * w, my = m.y * h
    const visible = m.y - entranceY < depthNorm * 0.8 + 0.15
    if (!visible) continue
    const a = Math.min(0.35, (depthNorm * 0.8 + 0.15 - (m.y - entranceY)) * 2)
    ctx.globalAlpha = a
    // Monitor box
    ctx.fillStyle = '#0a1a25'
    ctx.fillRect(mx - 12, my - 8, 24, 16)
    ctx.strokeStyle = '#1a3040'
    ctx.lineWidth = 1
    ctx.strokeRect(mx - 12, my - 8, 24, 16)
    // Green squiggly EKG line
    ctx.strokeStyle = '#00ff60'
    ctx.lineWidth = 1
    ctx.globalAlpha = a * 0.8
    ctx.beginPath()
    for (let px = 0; px < 20; px++) {
      const phase = ((px + t * 0.05) % 20)
      let dy = 0
      if (phase > 8 && phase < 10) dy = -5
      else if (phase > 10 && phase < 12) dy = 7
      else if (phase > 12 && phase < 14) dy = -3
      else dy = Math.sin(px * 0.5) * 0.8
      if (px === 0) ctx.moveTo(mx - 10 + px, my + dy)
      else ctx.lineTo(mx - 10 + px, my + dy)
    }
    ctx.stroke()
  }
  ctx.globalAlpha = 1

  // --- Hospital beds along bottom edges ---
  const bedPositions = [
    { x: 0.2, y: 0.9 }, { x: 0.75, y: 0.92 },
  ]
  for (const b of bedPositions) {
    const bx = b.x * w, by = b.y * h
    const visible = b.y - entranceY < depthNorm * 0.8 + 0.15
    if (!visible) continue
    ctx.globalAlpha = 0.2
    ctx.fillStyle = color
    // Bed frame
    ctx.fillRect(bx - 20, by - 4, 40, 8)
    // Headboard
    ctx.fillRect(bx - 20, by - 12, 4, 12)
    // Legs
    ctx.fillRect(bx - 18, by + 4, 3, 5)
    ctx.fillRect(bx + 16, by + 4, 3, 5)
  }
  ctx.globalAlpha = 1
}

function drawMovingElements(ctx, w, h, t, depthNorm) {
  const elems = elementsRef.current

  for (const e of elems) {
    // Only show elements that the depth reveals
    const elemDepthNorm = (e.y - 0.32) / 0.68
    if (elemDepthNorm > depthNorm + 0.2) continue

    // Move horizontally
    e.x += e.dir * e.speed * 0.00035
    // Wrap around
    if (e.dir > 0 && e.x > 1.3) e.x = -0.3
    if (e.dir < 0 && e.x < -0.3) e.x = 1.3

    const px = e.x * w, py = e.y * h
    const sc = e.size
    const fadeIn = Math.min(1, (depthNorm + 0.2 - elemDepthNorm) * 3)
    ctx.globalAlpha = e.alpha * fadeIn
    ctx.fillStyle = '#0a1520'

    if (e.type === 'gurney') {
      drawGurney(ctx, px, py, sc, e.dir)
    } else if (e.type === 'figure') {
      drawFigure(ctx, px, py, sc, t, e.dir)
    } else if (e.type === 'wheelchair') {
      drawWheelchair(ctx, px, py, sc, e.dir)
    } else if (e.type === 'nurse') {
      drawNurse(ctx, px, py, sc, t, e.dir)
    }
  }
  ctx.globalAlpha = 1
}

function drawGurney(ctx, x, y, sc, dir) {
  const s = 18 * sc
  // Bed surface
  ctx.fillRect(x - s, y - s * 0.3, s * 2, s * 0.25)
  // Legs
  ctx.fillRect(x - s * 0.8, y - s * 0.05, 2, s * 0.3)
  ctx.fillRect(x + s * 0.7, y - s * 0.05, 2, s * 0.3)
  // Wheels
  ctx.beginPath()
  ctx.arc(x - s * 0.7, y + s * 0.3, 3 * sc, 0, Math.PI * 2)
  ctx.arc(x + s * 0.7, y + s * 0.3, 3 * sc, 0, Math.PI * 2)
  ctx.fill()
  // Pillow bump
  const px = dir > 0 ? x - s * 0.7 : x + s * 0.5
  ctx.fillRect(px, y - s * 0.5, s * 0.3, s * 0.2)
}

function drawFigure(ctx, x, y, sc, t, dir) {
  const s = 14 * sc
  // Head
  ctx.beginPath()
  ctx.arc(x, y - s * 1.3, s * 0.3, 0, Math.PI * 2)
  ctx.fill()
  // Body
  ctx.fillRect(x - s * 0.2, y - s, s * 0.4, s * 0.7)
  // Walking legs (animated)
  const legSwing = Math.sin(t * 0.008) * s * 0.3
  ctx.fillRect(x - s * 0.15, y - s * 0.3, 3, s * 0.5)
  ctx.save()
  ctx.translate(x + s * 0.05, y - s * 0.3)
  ctx.fillRect(0, 0, 3, s * 0.5)
  ctx.restore()
}

function drawWheelchair(ctx, x, y, sc, dir) {
  const s = 12 * sc
  // Seat
  ctx.fillRect(x - s * 0.5, y - s * 0.3, s, s * 0.2)
  // Back
  ctx.fillRect(dir > 0 ? x - s * 0.5 : x + s * 0.3, y - s * 0.9, 3, s * 0.7)
  // Big wheel
  ctx.beginPath()
  ctx.arc(dir > 0 ? x + s * 0.3 : x - s * 0.3, y + s * 0.1, s * 0.35, 0, Math.PI * 2)
  ctx.fill()
  // Small wheel
  ctx.beginPath()
  ctx.arc(dir > 0 ? x - s * 0.4 : x + s * 0.4, y + s * 0.1, s * 0.15, 0, Math.PI * 2)
  ctx.fill()
  // Person silhouette in chair
  ctx.beginPath()
  ctx.arc(x, y - s * 0.7, s * 0.25, 0, Math.PI * 2)
  ctx.fill()
}

function drawNurse(ctx, x, y, sc, t, dir) {
  const s = 14 * sc
  // Head
  ctx.beginPath()
  ctx.arc(x, y - s * 1.4, s * 0.28, 0, Math.PI * 2)
  ctx.fill()
  // Cap (small rectangle on top)
  ctx.fillRect(x - s * 0.2, y - s * 1.7, s * 0.4, s * 0.1)
  // Body (slightly wider - scrubs)
  ctx.fillRect(x - s * 0.25, y - s * 1.1, s * 0.5, s * 0.8)
  // Clipboard in hand
  const clipX = dir > 0 ? x + s * 0.3 : x - s * 0.45
  ctx.fillRect(clipX, y - s * 0.8, s * 0.15, s * 0.35)
  // Legs
  ctx.fillRect(x - s * 0.15, y - s * 0.3, 3, s * 0.5)
  ctx.fillRect(x + s * 0.05, y - s * 0.3, 3, s * 0.5)
}

function drawBubbles(ctx, w, h, t) {
  for (const b of bubblesRef.current) {
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
    // Highlight dot
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

  // Track line
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
    ctx.fillStyle = active ? '#40c0a0' : '#40c0a0'
    // Tick mark
    ctx.fillRect(markerX - 4, y, 8, 1)
    // Label
    ctx.fillText(labels[i], markerX - 10, y + 4)
    // Dot
    ctx.beginPath()
    ctx.arc(markerX, y, active ? 3.5 : 2, 0, Math.PI * 2)
    ctx.fill()
  }

  // Current depth indicator
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

  // Left side curtains
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

  // Right side curtains
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
