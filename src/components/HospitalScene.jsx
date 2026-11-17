// Hospital Scene - Canvas-based animated background
// Lobby (top) -> Ward -> ICU -> OR -> Chief's Office (deep)

import { useRef, useEffect } from 'react'

export default function HospitalScene({ depth = 0, maxDepth = 2500 }) {
  const canvasRef = useRef(null)
  const animRef = useRef(null)
  const stateRef = useRef({
    particles: [],
    crosses: [],
    ekgOffset: 0,
    time: 0,
    width: 0,
    height: 0,
    dpr: 1,
    windowLitMap: null,
  })

  useEffect(() => {
    const canvas = canvasRef.current
    if (!canvas) return
    const ctx = canvas.getContext('2d')
    const state = stateRef.current

    // Initialize particles once
    state.dpr = window.devicePixelRatio || 1
    state.particles = Array.from({ length: 18 }, () => ({
      x: Math.random(),
      y: Math.random(),
      speed: 0.0002 + Math.random() * 0.0004,
      size: 1 + Math.random() * 2,
      wobbleSpeed: 0.5 + Math.random() * 1.5,
      wobbleAmp: 0.003 + Math.random() * 0.007,
      phase: Math.random() * Math.PI * 2,
      opacity: 0.2 + Math.random() * 0.4,
    }))

    // Floating medical cross symbols
    state.crosses = Array.from({ length: 8 }, () => ({
      x: Math.random(),
      y: Math.random(),
      speed: 0.0001 + Math.random() * 0.00025,
      driftSpeed: 0.3 + Math.random() * 0.7,
      driftAmp: 0.005 + Math.random() * 0.01,
      phase: Math.random() * Math.PI * 2,
      size: 3 + Math.random() * 5,
      opacity: 0.06 + Math.random() * 0.1,
      rotation: Math.random() * Math.PI * 0.5,
      rotSpeed: 0.1 + Math.random() * 0.3,
    }))

    // Pre-generate which windows are lit (stable across frames)
    // 6 cols x 4 rows grid
    state.windowLitMap = Array.from({ length: 24 }, () => Math.random() < 0.4)

    function resize() {
      const dpr = window.devicePixelRatio || 1
      state.dpr = dpr
      state.width = window.innerWidth
      state.height = window.innerHeight
      canvas.width = state.width * dpr
      canvas.height = state.height * dpr
      canvas.style.width = state.width + 'px'
      canvas.style.height = state.height + 'px'
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0)
    }

    resize()
    window.addEventListener('resize', resize)

    function lerpRGB(a, b, t) {
      return [
        Math.round(a[0] + (b[0] - a[0]) * t),
        Math.round(a[1] + (b[1] - a[1]) * t),
        Math.round(a[2] + (b[2] - a[2]) * t),
      ]
    }

    // EKG PQRST waveform as normalized points
    const ekgPoints = [
      [0, 0.5], [0.08, 0.5],
      [0.12, 0.42], [0.16, 0.5],
      [0.20, 0.5],
      [0.24, 0.55],
      [0.28, 0.12],
      [0.32, 0.65],
      [0.36, 0.48], [0.44, 0.48],
      [0.50, 0.36], [0.56, 0.48],
      [0.64, 0.5], [1.0, 0.5],
    ]

    function getEkgY(normalizedX) {
      for (let i = 0; i < ekgPoints.length - 1; i++) {
        const [x0, y0] = ekgPoints[i]
        const [x1, y1] = ekgPoints[i + 1]
        if (normalizedX >= x0 && normalizedX <= x1) {
          const t = (normalizedX - x0) / (x1 - x0)
          const st = t * t * (3 - 2 * t)
          return y0 + (y1 - y0) * st
        }
      }
      return 0.5
    }

    const depthMarkers = [
      { label: 'LOBBY', at: 0 },
      { label: 'WARD', at: 500 },
      { label: 'ICU', at: 1000 },
      { label: 'OR', at: 1500 },
      { label: 'CHIEF', at: 2000 },
    ]

    const doorPositionsLeft = [0.20, 0.40, 0.60, 0.80]
    const doorPositionsRight = [0.30, 0.50, 0.70]

    // Helper: draw a medical cross shape
    function drawCross(cx, cy, size, alpha) {
      const arm = size
      const thick = size * 0.35
      ctx.fillStyle = `rgba(255, 70, 70, ${alpha})`
      ctx.fillRect(cx - thick, cy - arm, thick * 2, arm * 2)
      ctx.fillRect(cx - arm, cy - thick, arm * 2, thick * 2)
    }

    // Helper: draw mini EKG in a monitor box
    function drawMonitor(mx, my, mw, mh, alpha, timeOffset) {
      // Monitor frame
      ctx.strokeStyle = `rgba(0, 229, 255, ${alpha * 0.6})`
      ctx.lineWidth = 1
      ctx.strokeRect(mx, my, mw, mh)

      // Screen background
      ctx.fillStyle = `rgba(0, 20, 30, ${alpha * 0.5})`
      ctx.fillRect(mx + 1, my + 1, mw - 2, mh - 2)

      // Mini EKG line inside
      ctx.strokeStyle = `rgba(0, 255, 180, ${alpha})`
      ctx.lineWidth = 1
      ctx.beginPath()
      const miniCycle = mw * 0.8
      const startMX = mx + mw * 0.1
      const midY = my + mh * 0.5
      const miniAmp = mh * 0.35
      for (let i = 0; i <= miniCycle; i += 2) {
        const nx = ((i + timeOffset * 40) % miniCycle) / miniCycle
        const ey = midY + (getEkgY(nx) - 0.5) * miniAmp * 2
        if (i === 0) ctx.moveTo(startMX + i, ey)
        else ctx.lineTo(startMX + i, ey)
      }
      ctx.stroke()
    }

    // Helper: draw IV drip stand
    function drawIVStand(bx, by, scale, alpha) {
      const s = scale
      ctx.strokeStyle = `rgba(0, 229, 255, ${alpha})`
      ctx.lineWidth = 1

      ctx.beginPath()
      // Vertical pole
      ctx.moveTo(bx, by)
      ctx.lineTo(bx, by - 60 * s)
      // Hook at top (small curved arm)
      ctx.moveTo(bx - 6 * s, by - 60 * s)
      ctx.lineTo(bx + 6 * s, by - 60 * s)
      // Hanger arm
      ctx.moveTo(bx + 4 * s, by - 60 * s)
      ctx.lineTo(bx + 8 * s, by - 55 * s)
      ctx.stroke()

      // IV bag (small rounded rectangle)
      ctx.fillStyle = `rgba(140, 180, 255, ${alpha * 0.4})`
      ctx.fillRect(bx + 5 * s, by - 54 * s, 8 * s, 12 * s)
      ctx.strokeRect(bx + 5 * s, by - 54 * s, 8 * s, 12 * s)

      // Drip line
      ctx.strokeStyle = `rgba(0, 229, 255, ${alpha * 0.4})`
      ctx.beginPath()
      ctx.moveTo(bx + 9 * s, by - 42 * s)
      ctx.lineTo(bx + 9 * s, by - 20 * s)
      ctx.stroke()

      // Base (tripod feet)
      ctx.strokeStyle = `rgba(0, 229, 255, ${alpha * 0.5})`
      ctx.beginPath()
      ctx.moveTo(bx, by)
      ctx.lineTo(bx - 8 * s, by + 4 * s)
      ctx.moveTo(bx, by)
      ctx.lineTo(bx + 8 * s, by + 4 * s)
      ctx.moveTo(bx, by)
      ctx.lineTo(bx, by + 5 * s)
      ctx.stroke()
    }

    // Helper: draw hospital bed/stretcher
    function drawBed(bx, by, bw, bh, alpha) {
      ctx.strokeStyle = `rgba(0, 229, 255, ${alpha})`
      ctx.lineWidth = 1

      // Bed frame
      ctx.strokeRect(bx, by, bw, bh)

      // Mattress area
      ctx.fillStyle = `rgba(0, 229, 255, ${alpha * 0.08})`
      ctx.fillRect(bx + 1, by + 1, bw - 2, bh - 2)

      // Headboard (raised end)
      ctx.beginPath()
      ctx.moveTo(bx, by)
      ctx.lineTo(bx, by - bh * 0.5)
      ctx.lineTo(bx + bw * 0.15, by - bh * 0.5)
      ctx.lineTo(bx + bw * 0.15, by)
      ctx.stroke()

      // Wheels (4 small circles)
      const wheelR = 2.5
      ctx.beginPath()
      ctx.arc(bx + 5, by + bh + wheelR + 1, wheelR, 0, Math.PI * 2)
      ctx.moveTo(bx + bw - 5 + wheelR, by + bh + wheelR + 1)
      ctx.arc(bx + bw - 5, by + bh + wheelR + 1, wheelR, 0, Math.PI * 2)
      ctx.stroke()

      // Legs
      ctx.beginPath()
      ctx.moveTo(bx + 5, by + bh)
      ctx.lineTo(bx + 5, by + bh + wheelR + 1)
      ctx.moveTo(bx + bw - 5, by + bh)
      ctx.lineTo(bx + bw - 5, by + bh + wheelR + 1)
      ctx.stroke()
    }

    function draw(timestamp) {
      const pct = Math.min(depth / maxDepth, 1)
      const w = state.width
      const h = state.height
      state.time = timestamp * 0.001

      ctx.clearRect(0, 0, w, h)

      // ============================================================
      //  ZONE BOUNDARIES (for visual density)
      //  Top 20%  : Lobby/Exterior (brighter, building, sky)
      //  20%-50%  : Ward (beds, IV drips)
      //  50%-75%  : ICU (monitors, darker)
      //  75%-100% : OR (darkest, surgical lights)
      // ============================================================

      // --- 1. Background gradient (zone-aware) ---
      const topColor = lerpRGB([22, 42, 69], [10, 18, 34], pct)
      const botColor = lerpRGB([10, 24, 42], [6, 14, 26], pct)
      const bgGrad = ctx.createLinearGradient(0, 0, 0, h)
      bgGrad.addColorStop(0, `rgb(${topColor.join(',')})`)
      bgGrad.addColorStop(0.2, `rgb(${lerpRGB(topColor, botColor, 0.15).join(',')})`)
      bgGrad.addColorStop(0.5, `rgb(${lerpRGB(topColor, botColor, 0.5).join(',')})`)
      bgGrad.addColorStop(0.75, `rgb(${lerpRGB(topColor, botColor, 0.8).join(',')})`)
      bgGrad.addColorStop(1, `rgb(${botColor.join(',')})`)
      ctx.fillStyle = bgGrad
      ctx.fillRect(0, 0, w, h)

      // --- 2. Floor perspective lines (3D corridor effect) ---
      const vanishX = w * 0.5
      const vanishY = h * 0.25
      const floorAlpha = 0.025 + pct * 0.015
      ctx.strokeStyle = `rgba(0, 200, 230, ${floorAlpha})`
      ctx.lineWidth = 0.5
      ctx.beginPath()
      // Lines from bottom-left corner converging to vanishing point
      for (let i = 0; i < 6; i++) {
        const bx = w * (i / 12)
        ctx.moveTo(bx, h)
        ctx.lineTo(vanishX, vanishY)
      }
      // Lines from bottom-right corner converging to vanishing point
      for (let i = 0; i < 6; i++) {
        const bx = w - w * (i / 12)
        ctx.moveTo(bx, h)
        ctx.lineTo(vanishX, vanishY)
      }
      ctx.stroke()

      // --- 3. Grid lines (horizontal) ---
      const gridOpacity = 0.03 + pct * 0.03
      ctx.strokeStyle = `rgba(0, 200, 230, ${gridOpacity})`
      ctx.lineWidth = 0.5
      ctx.beginPath()
      for (let y = 0; y < h; y += 60) {
        ctx.moveTo(0, y)
        ctx.lineTo(w, y)
      }
      ctx.stroke()

      // --- 4. Ambient light from top (Lobby zone brighter) ---
      const ambientOpacity = 0.08 - pct * 0.05
      if (ambientOpacity > 0.005) {
        const ambGrad = ctx.createRadialGradient(w * 0.5, 0, 0, w * 0.5, 0, h * 0.45)
        ambGrad.addColorStop(0, `rgba(100, 180, 255, ${ambientOpacity})`)
        ambGrad.addColorStop(1, 'rgba(0, 229, 255, 0)')
        ctx.fillStyle = ambGrad
        ctx.fillRect(0, 0, w, h * 0.5)
      }

      // --- 5. Hospital building silhouette (top 18%) ---
      const buildingAlpha = Math.max(0.04, 0.12 - pct * 0.08)
      const bldgLeft = w * 0.2
      const bldgRight = w * 0.8
      const bldgTop = h * 0.02
      const bldgBottom = h * 0.17
      const bldgW = bldgRight - bldgLeft
      const bldgH = bldgBottom - bldgTop

      // Main building body
      ctx.fillStyle = `rgba(10, 30, 50, ${buildingAlpha * 3})`
      ctx.fillRect(bldgLeft, bldgTop + bldgH * 0.15, bldgW, bldgH * 0.85)

      // Roof line
      ctx.strokeStyle = `rgba(0, 229, 255, ${buildingAlpha})`
      ctx.lineWidth = 1
      ctx.beginPath()
      ctx.moveTo(bldgLeft - 4, bldgTop + bldgH * 0.15)
      ctx.lineTo(bldgRight + 4, bldgTop + bldgH * 0.15)
      ctx.stroke()

      // Left wing (shorter)
      ctx.fillStyle = `rgba(10, 30, 50, ${buildingAlpha * 2.5})`
      ctx.fillRect(bldgLeft - w * 0.06, bldgTop + bldgH * 0.35, w * 0.06, bldgH * 0.65)

      // Right wing (shorter)
      ctx.fillRect(bldgRight, bldgTop + bldgH * 0.35, w * 0.06, bldgH * 0.65)

      // Medical cross on top of building
      const crossCX = w * 0.5
      const crossCY = bldgTop + bldgH * 0.07
      drawCross(crossCX, crossCY, 7, buildingAlpha * 1.5)

      // Cross glow
      const crossGlowR = 12
      const crossGlow = ctx.createRadialGradient(crossCX, crossCY, 0, crossCX, crossCY, crossGlowR)
      crossGlow.addColorStop(0, `rgba(255, 60, 60, ${buildingAlpha * 0.8})`)
      crossGlow.addColorStop(1, 'rgba(255, 60, 60, 0)')
      ctx.fillStyle = crossGlow
      ctx.fillRect(crossCX - crossGlowR, crossCY - crossGlowR, crossGlowR * 2, crossGlowR * 2)

      // Windows grid (6 columns x 4 rows)
      const winCols = 6
      const winRows = 4
      const winW = 6
      const winH = 5
      const winGapX = (bldgW - winCols * winW) / (winCols + 1)
      const winGapY = (bldgH * 0.75) / (winRows + 1)
      const winStartY = bldgTop + bldgH * 0.22

      const flickerTime = Math.floor(state.time * 0.5) // slow flicker cycle
      for (let row = 0; row < winRows; row++) {
        for (let col = 0; col < winCols; col++) {
          const wx = bldgLeft + winGapX + col * (winW + winGapX)
          const wy = winStartY + winGapY + row * (winH + winGapY)
          const idx = row * winCols + col
          const isLit = state.windowLitMap[idx]
          // Some windows flicker
          const flicker = isLit && (Math.sin(state.time * 2.0 + idx * 1.7) > 0.7)

          if (isLit) {
            ctx.fillStyle = flicker
              ? `rgba(255, 200, 80, ${buildingAlpha * 3})`
              : `rgba(255, 180, 60, ${buildingAlpha * 2})`
            ctx.fillRect(wx, wy, winW, winH)
          } else {
            ctx.fillStyle = `rgba(30, 50, 80, ${buildingAlpha * 0.8})`
            ctx.fillRect(wx, wy, winW, winH)
          }
        }
      }

      // --- 6. Ceiling lights (top of each zone) ---
      const lightCount = Math.max(3, Math.floor(w / 180))
      const lightW = 30
      const lightH = 3
      // Zone tops: 0, 0.2h, 0.5h, 0.75h
      const zoneTops = [h * 0.19, h * 0.5, h * 0.75]
      const zoneAlphas = [0.08, 0.06, 0.1]
      for (let z = 0; z < zoneTops.length; z++) {
        const zy = zoneTops[z]
        const za = zoneAlphas[z] + pct * 0.02
        for (let i = 0; i < lightCount; i++) {
          const lx = (w / (lightCount + 1)) * (i + 1) - lightW * 0.5
          // Light fixture rectangle
          ctx.fillStyle = `rgba(255, 240, 200, ${za})`
          ctx.fillRect(lx, zy, lightW, lightH)

          // Glow cone beneath
          const glowGrad = ctx.createLinearGradient(lx + lightW * 0.5, zy, lx + lightW * 0.5, zy + 40)
          glowGrad.addColorStop(0, `rgba(255, 240, 200, ${za * 0.6})`)
          glowGrad.addColorStop(1, 'rgba(255, 240, 200, 0)')
          ctx.fillStyle = glowGrad
          ctx.beginPath()
          ctx.moveTo(lx - 5, zy + lightH)
          ctx.lineTo(lx + lightW + 5, zy + lightH)
          ctx.lineTo(lx + lightW + 15, zy + 40)
          ctx.lineTo(lx - 15, zy + 40)
          ctx.closePath()
          ctx.fill()
        }
      }

      // --- 7. IV drip stands (Ward zone, 20%-50%) ---
      const ivAlpha = 0.08 + pct * 0.04
      drawIVStand(w * 0.08, h * 0.40, 0.9, ivAlpha)
      drawIVStand(w * 0.92, h * 0.36, 0.8, ivAlpha * 0.8)
      drawIVStand(w * 0.12, h * 0.48, 0.7, ivAlpha * 0.6)

      // --- 8. Hospital beds/stretchers (Ward/ICU zones) ---
      const bedAlpha = 0.07 + pct * 0.04
      drawBed(w * 0.06, h * 0.33, 44, 14, bedAlpha)
      drawBed(w * 0.88, h * 0.44, 40, 12, bedAlpha * 0.7)

      // --- 9. Vitals monitors (ICU zone, 50%-75%) ---
      const monAlpha = 0.1 + pct * 0.06
      drawMonitor(w * 0.05, h * 0.56, 50, 28, monAlpha, state.time)
      drawMonitor(w * 0.90, h * 0.62, 44, 24, monAlpha * 0.7, state.time + 3.0)
      // Smaller monitor near a bed
      drawMonitor(w * 0.10, h * 0.68, 36, 20, monAlpha * 0.5, state.time + 1.5)

      // --- 10. OR surgical lights (bottom zone, 75%-100%) ---
      const orAlpha = 0.06 + pct * 0.06
      // Large overhead surgical light (circular glow)
      const surgX = w * 0.5
      const surgY = h * 0.78
      const surgR = 25
      const surgGlow = ctx.createRadialGradient(surgX, surgY, 0, surgX, surgY, surgR * 3)
      surgGlow.addColorStop(0, `rgba(255, 250, 230, ${orAlpha * 2})`)
      surgGlow.addColorStop(0.3, `rgba(255, 220, 180, ${orAlpha * 0.8})`)
      surgGlow.addColorStop(1, 'rgba(140, 220, 255, 0)')
      ctx.fillStyle = surgGlow
      ctx.fillRect(surgX - surgR * 3, surgY - surgR * 3, surgR * 6, surgR * 6)

      // Surgical light fixture (circle with cross inside)
      ctx.strokeStyle = `rgba(0, 229, 255, ${orAlpha})`
      ctx.lineWidth = 1
      ctx.beginPath()
      ctx.arc(surgX, surgY, surgR, 0, Math.PI * 2)
      ctx.stroke()
      // Inner cross of the surgical lamp
      ctx.beginPath()
      ctx.moveTo(surgX - surgR * 0.5, surgY)
      ctx.lineTo(surgX + surgR * 0.5, surgY)
      ctx.moveTo(surgX, surgY - surgR * 0.5)
      ctx.lineTo(surgX, surgY + surgR * 0.5)
      ctx.stroke()

      // Second smaller surgical light
      const surg2X = w * 0.38
      const surg2Y = h * 0.82
      const surg2R = 16
      const surg2Glow = ctx.createRadialGradient(surg2X, surg2Y, 0, surg2X, surg2Y, surg2R * 2.5)
      surg2Glow.addColorStop(0, `rgba(200, 240, 255, ${orAlpha})`)
      surg2Glow.addColorStop(1, 'rgba(140, 220, 255, 0)')
      ctx.fillStyle = surg2Glow
      ctx.fillRect(surg2X - surg2R * 2.5, surg2Y - surg2R * 2.5, surg2R * 5, surg2R * 5)
      ctx.strokeStyle = `rgba(0, 229, 255, ${orAlpha * 0.7})`
      ctx.beginPath()
      ctx.arc(surg2X, surg2Y, surg2R, 0, Math.PI * 2)
      ctx.stroke()

      // --- 11. EKG heartbeat line (original, widened across mid-screen) ---
      const ekgY = h * 0.48
      const ekgHeight = 30
      const cycleWidth = 220
      const ekgAlpha = 0.05 + pct * 0.05
      state.ekgOffset = (state.ekgOffset + 0.4) % cycleWidth

      ctx.strokeStyle = `rgba(0, 255, 100, ${ekgAlpha})`
      ctx.lineWidth = 1.2
      ctx.beginPath()

      const startX = -state.ekgOffset
      let first = true
      for (let x = startX; x < w + cycleWidth; x += 1.5) {
        const cycleX = ((x - startX) % cycleWidth) / cycleWidth
        const ey = ekgY + (getEkgY(cycleX) - 0.5) * ekgHeight * 2
        if (first) {
          ctx.moveTo(x, ey)
          first = false
        } else {
          ctx.lineTo(x, ey)
        }
      }
      ctx.stroke()

      // --- 12. Floating particles ---
      ctx.save()
      for (const p of state.particles) {
        p.y -= p.speed
        if (p.y < -0.02) {
          p.y = 1.02
          p.x = Math.random()
        }
        const px = (p.x + Math.sin(state.time * p.wobbleSpeed + p.phase) * p.wobbleAmp) * w
        const py = p.y * h
        const r = p.size

        ctx.globalAlpha = p.opacity * (0.6 + 0.4 * Math.sin(state.time * 1.2 + p.phase))
        ctx.shadowColor = `rgba(${pColors[i % pColors.length]}, 0.6)`
        ctx.shadowBlur = 6
        const pColors = ['0, 220, 240', '0, 255, 100', '255, 200, 80', '255, 100, 100', '180, 140, 255']
        ctx.fillStyle = `rgba(${pColors[i % pColors.length]}, 0.9)`
        ctx.beginPath()
        ctx.arc(px, py, r, 0, Math.PI * 2)
        ctx.fill()
      }
      ctx.restore()

      // --- 13. Floating medical cross symbols ---
      ctx.save()
      for (const c of state.crosses) {
        c.y -= c.speed
        if (c.y < -0.03) {
          c.y = 1.03
          c.x = Math.random()
        }
        const cx = (c.x + Math.sin(state.time * c.driftSpeed + c.phase) * c.driftAmp) * w
        const cy = c.y * h
        const pulse = 0.7 + 0.3 * Math.sin(state.time * 1.5 + c.phase)
        const alpha = c.opacity * pulse

        ctx.save()
        ctx.translate(cx, cy)
        ctx.rotate(c.rotation + Math.sin(state.time * c.rotSpeed) * 0.15)
        drawCross(0, 0, c.size, alpha)
        ctx.restore()
      }
      ctx.restore()

      // --- 14. Room doors (left side) ---
      const doorW = 16
      const doorH = 28
      for (let i = 0; i < doorPositionsLeft.length; i++) {
        const dy = doorPositionsLeft[i] * h
        const isActive = depth >= i * 500
        const alpha = isActive ? 0.25 : 0.04
        ctx.strokeStyle = `rgba(0, 229, 255, ${alpha})`
        ctx.lineWidth = 1
        ctx.strokeRect(w * 0.03, dy, doorW, doorH)
        if (isActive) {
          ctx.fillStyle = `rgba(0, 229, 255, 0.04)`
          ctx.fillRect(w * 0.03, dy, doorW, doorH)
          // Door window
          ctx.fillStyle = `rgba(0, 229, 255, ${alpha * 0.3})`
          ctx.fillRect(w * 0.03 + 4, dy + 4, doorW - 8, 8)
        }
      }

      // Room doors (right side)
      for (let i = 0; i < doorPositionsRight.length; i++) {
        const dy = doorPositionsRight[i] * h
        const isActive = depth >= (i + 1) * 500
        const alpha = isActive ? 0.25 : 0.04
        ctx.strokeStyle = `rgba(0, 229, 255, ${alpha})`
        ctx.lineWidth = 1
        ctx.strokeRect(w * 0.97 - doorW, dy, doorW, doorH)
        if (isActive) {
          ctx.fillStyle = `rgba(0, 229, 255, 0.04)`
          ctx.fillRect(w * 0.97 - doorW, dy, doorW, doorH)
          // Door window
          ctx.fillStyle = `rgba(0, 229, 255, ${alpha * 0.3})`
          ctx.fillRect(w * 0.97 - doorW + 4, dy + 4, doorW - 8, 8)
        }
      }

      // --- 15. Corridor wall lines (subtle vertical edges) ---
      const wallAlpha = 0.03 + pct * 0.02
      ctx.strokeStyle = `rgba(0, 200, 230, ${wallAlpha})`
      ctx.lineWidth = 1
      ctx.beginPath()
      // Left wall edge
      ctx.moveTo(w * 0.15, h * 0.2)
      ctx.lineTo(w * 0.02, h)
      // Right wall edge
      ctx.moveTo(w * 0.85, h * 0.2)
      ctx.lineTo(w * 0.98, h)
      ctx.stroke()

      // --- 16. Zone separator lines (subtle dashed horizontals) ---
      ctx.strokeStyle = `rgba(0, 229, 255, 0.04)`
      ctx.lineWidth = 0.5
      ctx.setLineDash([8, 12])
      ctx.beginPath()
      ctx.moveTo(w * 0.1, h * 0.2)
      ctx.lineTo(w * 0.9, h * 0.2)
      ctx.moveTo(w * 0.1, h * 0.5)
      ctx.lineTo(w * 0.9, h * 0.5)
      ctx.moveTo(w * 0.1, h * 0.75)
      ctx.lineTo(w * 0.9, h * 0.75)
      ctx.stroke()
      ctx.setLineDash([])

      // --- 17. Depth markers (right side) ---
      ctx.textAlign = 'right'
      ctx.textBaseline = 'middle'
      ctx.font = 'bold 9px "SF Mono", "Fira Code", "Cascadia Code", monospace'

      for (const marker of depthMarkers) {
        const my = ((marker.at / maxDepth) * 0.80 + 0.08) * h
        const isActive = depth >= marker.at
        const markerAlpha = isActive ? 0.7 : 0.08

        ctx.strokeStyle = `rgba(0, 229, 255, ${markerAlpha})`
        ctx.lineWidth = 1
        ctx.beginPath()
        ctx.moveTo(w - 70, my)
        ctx.lineTo(w - 56, my)
        ctx.stroke()

        if (isActive) {
          ctx.shadowColor = 'rgba(0, 229, 255, 0.5)'
          ctx.shadowBlur = 8
        }

        ctx.fillStyle = `rgba(0, 229, 255, ${markerAlpha})`
        ctx.fillText(marker.label, w - 12, my)

        ctx.shadowColor = 'transparent'
        ctx.shadowBlur = 0
      }

      // --- 18. Scanline overlay ---
      ctx.fillStyle = 'rgba(0, 229, 255, 0.008)'
      for (let y = 0; y < h; y += 4) {
        ctx.fillRect(0, y, w, 1)
      }

      // --- 19. Vignette ---
      const vigAlpha = 0.35 + pct * 0.3
      const vigGrad = ctx.createRadialGradient(w * 0.5, h * 0.5, w * 0.25, w * 0.5, h * 0.5, w * 0.75)
      vigGrad.addColorStop(0, 'rgba(0,0,0,0)')
      vigGrad.addColorStop(1, `rgba(0,0,0,${vigAlpha})`)
      ctx.fillStyle = vigGrad
      ctx.fillRect(0, 0, w, h)

      animRef.current = requestAnimationFrame(draw)
    }

    animRef.current = requestAnimationFrame(draw)

    return () => {
      window.removeEventListener('resize', resize)
      if (animRef.current) cancelAnimationFrame(animRef.current)
    }
  }, [depth, maxDepth])

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
