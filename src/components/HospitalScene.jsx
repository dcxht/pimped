// Hospital Scene - Immersive canvas background with layered depth zones
// Sky -> Lobby -> Ward Corridor -> ICU -> OR (top to bottom)
// Animated walking figures, blinking lights, swaying curtains, floating particles

import { useRef, useEffect } from 'react'

export default function HospitalScene({ depth = 0, maxDepth = 2500 }) {
  const canvasRef = useRef(null)
  const animRef = useRef(null)
  const stateRef = useRef(null)

  useEffect(() => {
    const canvas = canvasRef.current
    if (!canvas) return
    const ctx = canvas.getContext('2d')

    // ── INIT STATE (once) ──────────────────────────────────────────
    if (!stateRef.current) {
      const rand = (lo, hi) => lo + Math.random() * (hi - lo)

      // Stars
      const stars = Array.from({ length: 90 }, () => ({
        x: Math.random(),
        y: Math.random() * 0.14,
        r: rand(0.4, 1.6),
        twinkleSpeed: rand(0.8, 3.0),
        phase: Math.random() * Math.PI * 2,
        brightness: rand(0.4, 1.0),
      }))

      // City skyline buildings
      const skyline = []
      let sx = 0
      while (sx < 1) {
        const bw = rand(0.025, 0.07)
        const bh = rand(0.02, 0.07)
        skyline.push({ x: sx, w: bw, h: bh, windows: Math.floor(rand(2, 6)) })
        sx += bw + rand(0.002, 0.012)
      }

      // Hospital building windows (stable lit map)
      const hospitalWindows = Array.from({ length: 40 }, () => ({
        lit: Math.random() < 0.45,
        flickerPhase: Math.random() * Math.PI * 2,
        flickerSpeed: rand(1.5, 4.0),
      }))

      // Lobby people silhouettes (stationary)
      const lobbyPeople = Array.from({ length: 7 }, (_, i) => ({
        x: rand(0.1, 0.9),
        sitting: i < 3,
        height: rand(0.8, 1.2),
        width: rand(0.8, 1.1),
      }))

      // Walking figures (like Krillion's fish)
      const walkers = Array.from({ length: 6 }, (_, i) => {
        const goRight = i % 2 === 0
        const zone = i < 2 ? 0 : i < 4 ? 1 : 2 // 0=lobby, 1=ward, 2=ICU
        return {
          x: rand(-0.3, 1.3),
          speed: rand(0.0003, 0.0008) * (goRight ? 1 : -1),
          zone,
          scale: rand(0.7, 1.2),
          yOffset: rand(-0.01, 0.01),
          hasStethoscope: Math.random() < 0.4,
          hasClipboard: Math.random() < 0.3,
          legPhase: Math.random() * Math.PI * 2,
          goRight,
        }
      })

      // Ward corridor doors
      const wardDoors = []
      for (let i = 0; i < 5; i++) {
        wardDoors.push({
          side: i % 2 === 0 ? 'left' : 'right',
          y: 0.37 + i * 0.045,
          open: Math.random() < 0.4,
          lightIntensity: rand(0.3, 0.8),
        })
      }

      // ICU curtains
      const curtains = Array.from({ length: 4 }, (_, i) => ({
        x: 0.15 + i * 0.22,
        swayPhase: Math.random() * Math.PI * 2,
        swaySpeed: rand(0.4, 1.2),
      }))

      // ICU blinking lights
      const statusLights = Array.from({ length: 12 }, () => ({
        x: rand(0.05, 0.95),
        y: rand(0.60, 0.78),
        color: ['red', 'green', 'amber'][Math.floor(Math.random() * 3)],
        blinkSpeed: rand(0.5, 3.0),
        phase: Math.random() * Math.PI * 2,
        size: rand(1.5, 3.5),
      }))

      // Floating particles (throughout)
      const particles = Array.from({ length: 35 }, () => ({
        x: Math.random(),
        y: Math.random(),
        speed: rand(0.0001, 0.0005),
        size: rand(0.8, 2.5),
        wobbleSpeed: rand(0.3, 1.5),
        wobbleAmp: rand(0.002, 0.008),
        phase: Math.random() * Math.PI * 2,
        colorIdx: Math.floor(Math.random() * 5),
      }))

      stateRef.current = {
        stars, skyline, hospitalWindows, lobbyPeople, walkers,
        wardDoors, curtains, statusLights, particles,
        time: 0, width: 0, height: 0, dpr: 1,
      }
    }

    const S = stateRef.current

    // ── RESIZE ─────────────────────────────────────────────────────
    function resize() {
      const dpr = window.devicePixelRatio || 1
      S.dpr = dpr
      S.width = window.innerWidth
      S.height = window.innerHeight
      canvas.width = S.width * dpr
      canvas.height = S.height * dpr
      canvas.style.width = S.width + 'px'
      canvas.style.height = S.height + 'px'
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0)
    }
    resize()
    window.addEventListener('resize', resize)

    // ── HELPERS ────────────────────────────────────────────────────
    const pColors = [
      [0, 220, 240], [0, 255, 130], [255, 184, 77],
      [255, 90, 90], [170, 130, 255],
    ]

    // EKG PQRST waveform
    const ekgPts = [
      [0, 0.5], [0.08, 0.5], [0.12, 0.42], [0.16, 0.5], [0.20, 0.5],
      [0.24, 0.55], [0.28, 0.12], [0.32, 0.65], [0.36, 0.48], [0.44, 0.48],
      [0.50, 0.36], [0.56, 0.48], [0.64, 0.5], [1.0, 0.5],
    ]
    function getEkgY(nx) {
      for (let i = 0; i < ekgPts.length - 1; i++) {
        const [x0, y0] = ekgPts[i]
        const [x1, y1] = ekgPts[i + 1]
        if (nx >= x0 && nx <= x1) {
          const t = (nx - x0) / (x1 - x0)
          return y0 + (y1 - y0) * t * t * (3 - 2 * t)
        }
      }
      return 0.5
    }

    // ── DRAW ───────────────────────────────────────────────────────
    function draw(timestamp) {
      const pct = Math.min(depth / maxDepth, 1)
      const darken = pct * 0.15 // subtle darkening with score
      const w = S.width
      const h = S.height
      const t = timestamp * 0.001
      S.time = t

      ctx.clearRect(0, 0, w, h)

      // ════════════════════════════════════════════════════════════
      // LAYER 1 - SKY / EXTERIOR (top ~15%)
      // ════════════════════════════════════════════════════════════

      // Night sky gradient
      const skyGrad = ctx.createLinearGradient(0, 0, 0, h * 0.15)
      skyGrad.addColorStop(0, `rgba(${Math.max(0, 8 - darken * 20)}, ${Math.max(0, 16 - darken * 20)}, ${Math.max(0, 36 - darken * 20)}, 1)`)
      skyGrad.addColorStop(0.6, '#0a1628')
      skyGrad.addColorStop(1, '#0d1f3c')
      ctx.fillStyle = skyGrad
      ctx.fillRect(0, 0, w, h * 0.16)

      // Moon glow (upper right)
      const moonX = w * 0.82
      const moonY = h * 0.04
      const moonGlow = ctx.createRadialGradient(moonX, moonY, 0, moonX, moonY, h * 0.08)
      moonGlow.addColorStop(0, 'rgba(220, 230, 255, 0.25)')
      moonGlow.addColorStop(0.3, 'rgba(180, 200, 240, 0.08)')
      moonGlow.addColorStop(1, 'rgba(100, 140, 200, 0)')
      ctx.fillStyle = moonGlow
      ctx.fillRect(moonX - h * 0.1, 0, h * 0.2, h * 0.16)
      // Moon disc
      ctx.fillStyle = 'rgba(220, 230, 250, 0.7)'
      ctx.beginPath()
      ctx.arc(moonX, moonY, 8, 0, Math.PI * 2)
      ctx.fill()

      // Stars
      for (const star of S.stars) {
        const twinkle = 0.3 + 0.7 * (0.5 + 0.5 * Math.sin(t * star.twinkleSpeed + star.phase))
        const alpha = star.brightness * twinkle * (1 - darken * 2)
        if (alpha < 0.05) continue
        ctx.fillStyle = `rgba(255, 255, 240, ${alpha})`
        ctx.beginPath()
        ctx.arc(star.x * w, star.y * h, star.r, 0, Math.PI * 2)
        ctx.fill()
      }

      // City skyline silhouettes (behind hospital)
      const skylineBase = h * 0.10
      for (const b of S.skyline) {
        const bx = b.x * w
        const bw = b.w * w
        const bh = b.h * h
        ctx.fillStyle = `rgba(12, 20, 38, ${0.8 - darken})`
        ctx.fillRect(bx, skylineBase - bh, bw, bh)
        // Tiny city windows (deterministic using position)
        const winSize = 1.5
        for (let wy = skylineBase - bh + 4; wy < skylineBase - 3; wy += 6) {
          for (let wx = bx + 3; wx < bx + bw - 3; wx += 5) {
            // Deterministic "random" based on position
            if (((Math.floor(wx) * 7 + Math.floor(wy) * 13) % 11) > 4) continue
            ctx.fillStyle = `rgba(255, 200, 100, ${0.15 - darken * 0.3})`
            ctx.fillRect(wx, wy, winSize, winSize)
          }
        }
      }

      // Hospital building (center, larger)
      const hospLeft = w * 0.28
      const hospRight = w * 0.72
      const hospTop = h * 0.03
      const hospBottom = h * 0.14
      const hospW = hospRight - hospLeft
      const hospH = hospBottom - hospTop

      // Main building
      ctx.fillStyle = 'rgba(16, 28, 48, 0.95)'
      ctx.fillRect(hospLeft, hospTop, hospW, hospH)

      // Wings
      ctx.fillStyle = 'rgba(14, 24, 42, 0.9)'
      ctx.fillRect(hospLeft - w * 0.07, hospTop + hospH * 0.3, w * 0.07, hospH * 0.7)
      ctx.fillRect(hospRight, hospTop + hospH * 0.3, w * 0.07, hospH * 0.7)

      // Hospital windows (8 cols x 5 rows)
      const hwCols = 8
      const hwRows = 5
      const hwW = Math.max(3, hospW * 0.04)
      const hwH = Math.max(2, hospH * 0.08)
      const hwGapX = (hospW - hwCols * hwW) / (hwCols + 1)
      const hwGapY = (hospH * 0.8) / (hwRows + 1)
      const hwStartY = hospTop + hospH * 0.15

      for (let row = 0; row < hwRows; row++) {
        for (let col = 0; col < hwCols; col++) {
          const idx = (row * hwCols + col) % S.hospitalWindows.length
          const win = S.hospitalWindows[idx]
          const wx = hospLeft + hwGapX + col * (hwW + hwGapX)
          const wy = hwStartY + hwGapY + row * (hwH + hwGapY)

          if (win.lit) {
            const flicker = 0.8 + 0.2 * Math.sin(t * win.flickerSpeed + win.flickerPhase)
            ctx.fillStyle = `rgba(255, 184, 77, ${flicker * 0.7})`
            ctx.fillRect(wx, wy, hwW, hwH)
            // Window glow
            ctx.fillStyle = `rgba(255, 184, 77, ${flicker * 0.15})`
            ctx.fillRect(wx - 1, wy - 1, hwW + 2, hwH + 2)
          } else {
            ctx.fillStyle = 'rgba(20, 35, 60, 0.6)'
            ctx.fillRect(wx, wy, hwW, hwH)
          }
        }
      }

      // Red cross on hospital roof
      const crossX = w * 0.5
      const crossY = hospTop + 6
      ctx.fillStyle = `rgba(255, 70, 70, ${0.7 + 0.3 * Math.sin(t * 1.2)})`
      ctx.fillRect(crossX - 2, crossY - 5, 4, 10)
      ctx.fillRect(crossX - 5, crossY - 2, 10, 4)
      // Cross glow
      const cGlow = ctx.createRadialGradient(crossX, crossY, 0, crossX, crossY, 14)
      cGlow.addColorStop(0, `rgba(255, 50, 50, ${0.3 + 0.15 * Math.sin(t * 1.2)})`)
      cGlow.addColorStop(1, 'rgba(255, 50, 50, 0)')
      ctx.fillStyle = cGlow
      ctx.fillRect(crossX - 14, crossY - 14, 28, 28)

      // Transition strip: exterior -> interior
      const transGrad = ctx.createLinearGradient(0, h * 0.13, 0, h * 0.17)
      transGrad.addColorStop(0, 'rgba(13, 22, 40, 0)')
      transGrad.addColorStop(1, 'rgba(18, 28, 44, 1)')
      ctx.fillStyle = transGrad
      ctx.fillRect(0, h * 0.13, w, h * 0.04)

      // ════════════════════════════════════════════════════════════
      // LAYER 2 - LOBBY (15%-35%)
      // ════════════════════════════════════════════════════════════

      // Lobby background
      const lobbyGrad = ctx.createLinearGradient(0, h * 0.15, 0, h * 0.35)
      lobbyGrad.addColorStop(0, 'rgba(18, 28, 44, 1)')
      lobbyGrad.addColorStop(0.5, 'rgba(22, 34, 52, 1)')
      lobbyGrad.addColorStop(1, 'rgba(16, 30, 48, 1)')
      ctx.fillStyle = lobbyGrad
      ctx.fillRect(0, h * 0.15, w, h * 0.20)

      // Warm ambient overhead lights in lobby
      for (let i = 0; i < 5; i++) {
        const lx = w * (0.1 + i * 0.2)
        const ly = h * 0.155
        const lGlow = ctx.createRadialGradient(lx, ly, 0, lx, ly, h * 0.06)
        lGlow.addColorStop(0, 'rgba(255, 230, 180, 0.08)')
        lGlow.addColorStop(0.5, 'rgba(255, 220, 160, 0.03)')
        lGlow.addColorStop(1, 'rgba(255, 200, 140, 0)')
        ctx.fillStyle = lGlow
        ctx.fillRect(lx - h * 0.06, ly - h * 0.02, h * 0.12, h * 0.08)
        // Light fixture
        ctx.fillStyle = 'rgba(255, 240, 200, 0.12)'
        ctx.fillRect(lx - 12, ly, 24, 2)
      }

      // Reception desk
      const deskY = h * 0.28
      const deskLeft = w * 0.3
      const deskW = w * 0.4
      const deskH = h * 0.025
      ctx.fillStyle = 'rgba(40, 55, 75, 0.7)'
      ctx.fillRect(deskLeft, deskY, deskW, deskH)
      // Desk top highlight
      ctx.fillStyle = 'rgba(70, 90, 110, 0.4)'
      ctx.fillRect(deskLeft, deskY, deskW, 2)
      // Computer monitor on desk
      ctx.fillStyle = 'rgba(0, 180, 200, 0.15)'
      ctx.fillRect(deskLeft + deskW * 0.4, deskY - h * 0.02, 14, h * 0.018)
      ctx.fillStyle = 'rgba(40, 55, 75, 0.5)'
      ctx.fillRect(deskLeft + deskW * 0.4 + 5, deskY - 3, 4, 3)

      // Waiting room chairs (row of simple shapes)
      const chairY = h * 0.30
      for (let i = 0; i < 6; i++) {
        const cx = w * 0.12 + i * w * 0.04
        ctx.fillStyle = 'rgba(35, 50, 70, 0.6)'
        ctx.fillRect(cx, chairY, 10, 5)
        ctx.fillRect(cx, chairY - 8, 10, 8)
        ctx.fillStyle = 'rgba(50, 65, 85, 0.4)'
        ctx.fillRect(cx + 1, chairY + 5, 1.5, 4)
        ctx.fillRect(cx + 7.5, chairY + 5, 1.5, 4)
      }
      // Right side chairs
      for (let i = 0; i < 4; i++) {
        const cx = w * 0.78 + i * w * 0.04
        ctx.fillStyle = 'rgba(35, 50, 70, 0.6)'
        ctx.fillRect(cx, chairY + 2, 10, 5)
        ctx.fillRect(cx, chairY + 2 - 8, 10, 8)
        ctx.fillStyle = 'rgba(50, 65, 85, 0.4)'
        ctx.fillRect(cx + 1, chairY + 7, 1.5, 4)
        ctx.fillRect(cx + 7.5, chairY + 7, 1.5, 4)
      }

      // Potted plants
      function drawPlant(px, py) {
        ctx.fillStyle = 'rgba(90, 60, 40, 0.5)'
        ctx.beginPath()
        ctx.moveTo(px - 5, py)
        ctx.lineTo(px + 5, py)
        ctx.lineTo(px + 4, py + 10)
        ctx.lineTo(px - 4, py + 10)
        ctx.closePath()
        ctx.fill()
        ctx.fillStyle = 'rgba(30, 90, 50, 0.4)'
        ctx.beginPath()
        ctx.arc(px, py - 4, 7, 0, Math.PI * 2)
        ctx.fill()
        ctx.fillStyle = 'rgba(40, 110, 60, 0.3)'
        ctx.beginPath()
        ctx.arc(px - 4, py - 7, 5, 0, Math.PI * 2)
        ctx.fill()
        ctx.beginPath()
        ctx.arc(px + 4, py - 6, 5, 0, Math.PI * 2)
        ctx.fill()
      }
      drawPlant(w * 0.07, h * 0.26)
      drawPlant(w * 0.93, h * 0.27)

      // Lobby people silhouettes (stationary)
      for (const p of S.lobbyPeople) {
        const px = p.x * w
        const baseY = p.sitting ? h * 0.295 : h * 0.28
        const sc = p.height * 0.7
        ctx.fillStyle = `rgba(25, 38, 56, ${0.6 * p.width})`
        if (p.sitting) {
          ctx.beginPath()
          ctx.arc(px, baseY - 10 * sc, 4 * sc, 0, Math.PI * 2)
          ctx.fill()
          ctx.fillRect(px - 4 * sc, baseY - 6 * sc, 8 * sc, 10 * sc)
        } else {
          ctx.beginPath()
          ctx.arc(px, baseY - 18 * sc, 4 * sc, 0, Math.PI * 2)
          ctx.fill()
          ctx.fillRect(px - 4 * sc, baseY - 14 * sc, 8 * sc, 18 * sc)
          ctx.fillRect(px - 3 * sc, baseY + 4 * sc, 2.5 * sc, 8 * sc)
          ctx.fillRect(px + 0.5 * sc, baseY + 4 * sc, 2.5 * sc, 8 * sc)
        }
      }

      // ════════════════════════════════════════════════════════════
      // LAYER 3 - WARD CORRIDOR (35%-60%)
      // ════════════════════════════════════════════════════════════

      // Ward background
      const wardGrad = ctx.createLinearGradient(0, h * 0.35, 0, h * 0.60)
      wardGrad.addColorStop(0, 'rgba(16, 30, 48, 1)')
      wardGrad.addColorStop(0.5, 'rgba(14, 32, 46, 1)')
      wardGrad.addColorStop(1, 'rgba(12, 26, 42, 1)')
      ctx.fillStyle = wardGrad
      ctx.fillRect(0, h * 0.35, w, h * 0.25)

      // Corridor perspective walls
      const vanishX = w * 0.5
      const vanishY = h * 0.38
      const corridorAlpha = 0.06
      ctx.strokeStyle = `rgba(0, 180, 200, ${corridorAlpha})`
      ctx.lineWidth = 1

      // Left wall
      ctx.beginPath()
      ctx.moveTo(0, h * 0.60)
      ctx.lineTo(vanishX - w * 0.15, vanishY)
      ctx.stroke()
      // Right wall
      ctx.beginPath()
      ctx.moveTo(w, h * 0.60)
      ctx.lineTo(vanishX + w * 0.15, vanishY)
      ctx.stroke()

      // Floor lines (perspective)
      ctx.strokeStyle = 'rgba(0, 160, 180, 0.03)'
      ctx.lineWidth = 0.5
      for (let i = 0; i < 8; i++) {
        const y = h * (0.42 + i * 0.023)
        const spread = (y - vanishY) / (h * 0.60 - vanishY)
        const leftX = vanishX - w * 0.15 - spread * (vanishX - w * 0.15)
        const rightX = vanishX + w * 0.15 + spread * (w - vanishX - w * 0.15)
        ctx.beginPath()
        ctx.moveTo(leftX, y)
        ctx.lineTo(rightX, y)
        ctx.stroke()
      }

      // Corridor ceiling lights
      for (let i = 0; i < 4; i++) {
        const ly = h * (0.36 + i * 0.05)
        const spread = (ly - vanishY) / (h * 0.60 - vanishY)
        const lightGlow = ctx.createRadialGradient(vanishX, ly, 0, vanishX, ly, 30 + spread * 40)
        lightGlow.addColorStop(0, 'rgba(255, 240, 210, 0.06)')
        lightGlow.addColorStop(1, 'rgba(255, 240, 210, 0)')
        ctx.fillStyle = lightGlow
        ctx.fillRect(vanishX - 60, ly - 20, 120, 40)
        ctx.fillStyle = 'rgba(255, 240, 200, 0.1)'
        ctx.fillRect(vanishX - 10 - spread * 5, ly, 20 + spread * 10, 1.5)
      }

      // Doors along corridor
      for (const door of S.wardDoors) {
        const dy = door.y * h
        const spread = (dy - vanishY) / (h * 0.60 - vanishY)
        const doorH = 18 + spread * 14
        const doorW = 8 + spread * 6

        let dx
        if (door.side === 'left') {
          dx = vanishX - w * 0.15 - spread * (vanishX * 0.5) - doorW
        } else {
          dx = vanishX + w * 0.15 + spread * (vanishX * 0.5)
        }

        if (door.open) {
          // Warm light spilling out
          const spillGlow = ctx.createRadialGradient(dx + doorW / 2, dy + doorH / 2, 0, dx + doorW / 2, dy + doorH / 2, doorH * 1.5)
          spillGlow.addColorStop(0, `rgba(255, 200, 120, ${0.08 * door.lightIntensity})`)
          spillGlow.addColorStop(1, 'rgba(255, 200, 120, 0)')
          ctx.fillStyle = spillGlow
          ctx.fillRect(dx - doorH, dy - doorH * 0.5, doorH * 3, doorH * 2)

          ctx.fillStyle = `rgba(255, 190, 100, ${0.12 * door.lightIntensity})`
          ctx.fillRect(dx, dy, doorW, doorH)
          ctx.strokeStyle = 'rgba(80, 120, 140, 0.2)'
          ctx.lineWidth = 1
          ctx.strokeRect(dx, dy, doorW, doorH)
        } else {
          ctx.fillStyle = 'rgba(30, 50, 70, 0.5)'
          ctx.fillRect(dx, dy, doorW, doorH)
          ctx.strokeStyle = 'rgba(60, 90, 110, 0.15)'
          ctx.lineWidth = 0.5
          ctx.strokeRect(dx, dy, doorW, doorH)
          ctx.fillStyle = 'rgba(100, 140, 160, 0.2)'
          ctx.fillRect(dx + doorW - 3, dy + doorH * 0.5, 2, 2)
        }
      }

      // IV stands in ward
      function drawIV(ix, iy, sc, alpha) {
        ctx.strokeStyle = `rgba(100, 150, 170, ${alpha})`
        ctx.lineWidth = 1
        ctx.beginPath()
        ctx.moveTo(ix, iy)
        ctx.lineTo(ix, iy - 40 * sc)
        ctx.stroke()
        ctx.beginPath()
        ctx.moveTo(ix - 5 * sc, iy - 40 * sc)
        ctx.lineTo(ix + 5 * sc, iy - 40 * sc)
        ctx.stroke()
        ctx.fillStyle = `rgba(140, 180, 220, ${alpha * 0.5})`
        ctx.fillRect(ix + 2 * sc, iy - 38 * sc, 6 * sc, 10 * sc)
        ctx.strokeStyle = `rgba(100, 150, 170, ${alpha * 0.4})`
        ctx.beginPath()
        ctx.moveTo(ix + 5 * sc, iy - 28 * sc)
        ctx.lineTo(ix + 5 * sc, iy - 12 * sc)
        ctx.stroke()
        ctx.strokeStyle = `rgba(100, 150, 170, ${alpha * 0.5})`
        ctx.beginPath()
        ctx.moveTo(ix, iy)
        ctx.lineTo(ix - 6 * sc, iy + 3 * sc)
        ctx.moveTo(ix, iy)
        ctx.lineTo(ix + 6 * sc, iy + 3 * sc)
        ctx.stroke()
      }
      drawIV(w * 0.08, h * 0.52, 0.8, 0.2)
      drawIV(w * 0.92, h * 0.48, 0.7, 0.15)
      drawIV(w * 0.18, h * 0.55, 0.6, 0.12)

      // Hospital beds visible through open doors
      function drawBed(bx, by, bw, bh, alpha) {
        ctx.strokeStyle = `rgba(100, 150, 170, ${alpha})`
        ctx.lineWidth = 0.8
        ctx.strokeRect(bx, by, bw, bh)
        ctx.fillStyle = `rgba(60, 100, 130, ${alpha * 0.3})`
        ctx.fillRect(bx, by, bw, bh)
        ctx.fillStyle = `rgba(80, 110, 140, ${alpha * 0.5})`
        ctx.fillRect(bx, by - bh * 0.3, bw * 0.12, bh * 0.3 + bh)
      }
      drawBed(w * 0.04, h * 0.44, 30, 10, 0.15)
      drawBed(w * 0.90, h * 0.50, 28, 9, 0.12)

      // Wheelchair
      const wcX = w * 0.14
      const wcY = h * 0.57
      ctx.strokeStyle = 'rgba(90, 130, 150, 0.15)'
      ctx.lineWidth = 1
      ctx.beginPath()
      ctx.arc(wcX, wcY, 6, 0, Math.PI * 2)
      ctx.stroke()
      ctx.beginPath()
      ctx.arc(wcX + 10, wcY, 3, 0, Math.PI * 2)
      ctx.stroke()
      ctx.beginPath()
      ctx.moveTo(wcX - 2, wcY - 8)
      ctx.lineTo(wcX + 10, wcY - 5)
      ctx.lineTo(wcX + 10, wcY - 2)
      ctx.stroke()
      ctx.beginPath()
      ctx.moveTo(wcX - 2, wcY - 8)
      ctx.lineTo(wcX - 4, wcY - 16)
      ctx.stroke()

      // Green EKG monitors on ward walls
      function drawMonitor(mx, my, mw, mh, alpha, timeOff) {
        ctx.fillStyle = `rgba(10, 25, 35, ${alpha * 0.7})`
        ctx.fillRect(mx, my, mw, mh)
        ctx.strokeStyle = `rgba(0, 200, 180, ${alpha * 0.4})`
        ctx.lineWidth = 0.8
        ctx.strokeRect(mx, my, mw, mh)
        ctx.strokeStyle = `rgba(0, 255, 130, ${alpha * 0.9})`
        ctx.lineWidth = 1
        ctx.beginPath()
        const cycleW = mw * 0.85
        const sx = mx + mw * 0.075
        const midY = my + mh * 0.5
        const amp = mh * 0.35
        for (let i = 0; i <= cycleW; i += 1.5) {
          const nx = ((i + timeOff * 35) % cycleW) / cycleW
          const ey = midY + (getEkgY(nx) - 0.5) * amp * 2
          if (i === 0) ctx.moveTo(sx + i, ey)
          else ctx.lineTo(sx + i, ey)
        }
        ctx.stroke()
        // Status dot
        ctx.fillStyle = `rgba(0, 255, 100, ${0.5 + 0.5 * Math.sin(t * 2 + timeOff)})`
        ctx.beginPath()
        ctx.arc(mx + mw - 4, my + 4, 1.5, 0, Math.PI * 2)
        ctx.fill()
      }
      drawMonitor(w * 0.03, h * 0.40, 36, 20, 0.25, t)
      drawMonitor(w * 0.94, h * 0.43, 32, 18, 0.2, t + 2)

      // ════════════════════════════════════════════════════════════
      // LAYER 4 - ICU (60%-80%)
      // ════════════════════════════════════════════════════════════

      // ICU background (darker)
      const icuGrad = ctx.createLinearGradient(0, h * 0.60, 0, h * 0.80)
      icuGrad.addColorStop(0, 'rgba(12, 26, 42, 1)')
      icuGrad.addColorStop(0.5, 'rgba(10, 22, 38, 1)')
      icuGrad.addColorStop(1, 'rgba(8, 18, 32, 1)')
      ctx.fillStyle = icuGrad
      ctx.fillRect(0, h * 0.60, w, h * 0.20)

      // ICU monitors (more of them, larger)
      drawMonitor(w * 0.03, h * 0.63, 50, 28, 0.35, t + 1)
      drawMonitor(w * 0.88, h * 0.65, 48, 26, 0.3, t + 3.5)
      drawMonitor(w * 0.06, h * 0.72, 40, 22, 0.25, t + 5)
      drawMonitor(w * 0.90, h * 0.74, 38, 20, 0.2, t + 7)

      // Ventilator shapes
      function drawVentilator(vx, vy, alpha) {
        ctx.fillStyle = `rgba(20, 40, 55, ${alpha})`
        ctx.fillRect(vx, vy, 16, 24)
        ctx.strokeStyle = `rgba(0, 180, 200, ${alpha * 0.5})`
        ctx.lineWidth = 0.5
        ctx.strokeRect(vx, vy, 16, 24)
        ctx.fillStyle = `rgba(0, 100, 130, ${alpha * 0.4})`
        ctx.fillRect(vx + 2, vy + 2, 12, 8)
        ctx.strokeStyle = `rgba(140, 180, 200, ${alpha * 0.3})`
        ctx.lineWidth = 2
        ctx.beginPath()
        ctx.moveTo(vx + 8, vy + 24)
        ctx.quadraticCurveTo(vx + 8, vy + 36, vx + 20, vy + 36)
        ctx.stroke()
      }
      drawVentilator(w * 0.15, h * 0.65, 0.3)
      drawVentilator(w * 0.82, h * 0.68, 0.25)

      // Curtain dividers (wavy vertical lines)
      for (const curtain of S.curtains) {
        const cx = curtain.x * w
        const sway = Math.sin(t * curtain.swaySpeed + curtain.swayPhase) * 3
        ctx.strokeStyle = 'rgba(60, 90, 120, 0.15)'
        ctx.lineWidth = 1
        ctx.beginPath()
        for (let y = h * 0.61; y < h * 0.79; y += 2) {
          const offset = sway * Math.sin((y - h * 0.61) * 0.05)
          if (y <= h * 0.61 + 1) ctx.moveTo(cx + offset, y)
          else ctx.lineTo(cx + offset, y)
        }
        ctx.stroke()
        // Curtain rod
        ctx.fillStyle = 'rgba(80, 110, 140, 0.1)'
        ctx.fillRect(cx - 8, h * 0.605, 16, 1.5)
      }

      // Status lights (blinking red, green, amber)
      for (const light of S.statusLights) {
        const blink = 0.3 + 0.7 * (0.5 + 0.5 * Math.sin(t * light.blinkSpeed + light.phase))
        let r, g, b
        if (light.color === 'red') { r = 255; g = 60; b = 60 }
        else if (light.color === 'green') { r = 60; g = 255; b = 100 }
        else { r = 255; g = 190; b = 60 }

        ctx.fillStyle = `rgba(${r}, ${g}, ${b}, ${blink * 0.6})`
        ctx.beginPath()
        ctx.arc(light.x * w, light.y * h, light.size, 0, Math.PI * 2)
        ctx.fill()

        // Glow
        const lglow = ctx.createRadialGradient(
          light.x * w, light.y * h, 0,
          light.x * w, light.y * h, light.size * 4
        )
        lglow.addColorStop(0, `rgba(${r}, ${g}, ${b}, ${blink * 0.15})`)
        lglow.addColorStop(1, `rgba(${r}, ${g}, ${b}, 0)`)
        ctx.fillStyle = lglow
        ctx.beginPath()
        ctx.arc(light.x * w, light.y * h, light.size * 4, 0, Math.PI * 2)
        ctx.fill()
      }

      // ICU beds
      drawBed(w * 0.20, h * 0.70, 35, 12, 0.2)
      drawBed(w * 0.60, h * 0.72, 33, 11, 0.18)
      drawIV(w * 0.25, h * 0.69, 0.6, 0.18)
      drawIV(w * 0.65, h * 0.71, 0.55, 0.15)

      // ════════════════════════════════════════════════════════════
      // LAYER 5 - OPERATING ROOM (80%-100%)
      // ════════════════════════════════════════════════════════════

      // OR background (darkest)
      const orGrad = ctx.createLinearGradient(0, h * 0.80, 0, h)
      orGrad.addColorStop(0, 'rgba(8, 18, 32, 1)')
      orGrad.addColorStop(0.4, 'rgba(6, 14, 26, 1)')
      orGrad.addColorStop(1, 'rgba(4, 10, 20, 1)')
      ctx.fillStyle = orGrad
      ctx.fillRect(0, h * 0.80, w, h * 0.20)

      // Surgical spotlight (main) -- bright cone from above
      const spotX = w * 0.5
      const spotTop = h * 0.81
      const spotBottom = h * 0.95
      const spotGrad = ctx.createLinearGradient(spotX, spotTop, spotX, spotBottom)
      spotGrad.addColorStop(0, 'rgba(255, 252, 240, 0.12)')
      spotGrad.addColorStop(0.3, 'rgba(255, 248, 230, 0.06)')
      spotGrad.addColorStop(1, 'rgba(255, 245, 220, 0)')
      ctx.fillStyle = spotGrad
      ctx.beginPath()
      ctx.moveTo(spotX - 15, spotTop)
      ctx.lineTo(spotX + 15, spotTop)
      ctx.lineTo(spotX + 70, spotBottom)
      ctx.lineTo(spotX - 70, spotBottom)
      ctx.closePath()
      ctx.fill()

      // Surgical lamp fixture
      ctx.fillStyle = 'rgba(140, 160, 180, 0.2)'
      ctx.beginPath()
      ctx.arc(spotX, spotTop, 18, 0, Math.PI * 2)
      ctx.fill()
      ctx.strokeStyle = 'rgba(180, 200, 220, 0.15)'
      ctx.lineWidth = 1
      ctx.beginPath()
      ctx.arc(spotX, spotTop, 18, 0, Math.PI * 2)
      ctx.stroke()
      // Inner cross of lamp
      ctx.strokeStyle = 'rgba(255, 250, 230, 0.15)'
      ctx.beginPath()
      ctx.moveTo(spotX - 8, spotTop)
      ctx.lineTo(spotX + 8, spotTop)
      ctx.moveTo(spotX, spotTop - 8)
      ctx.lineTo(spotX, spotTop + 8)
      ctx.stroke()
      // Arm connecting to ceiling
      ctx.strokeStyle = 'rgba(120, 140, 160, 0.12)'
      ctx.lineWidth = 2
      ctx.beginPath()
      ctx.moveTo(spotX, spotTop - 18)
      ctx.lineTo(spotX + 10, h * 0.80)
      ctx.stroke()

      // Second smaller lamp
      const spot2X = w * 0.38
      const spot2Top = h * 0.83
      const spot2Grad = ctx.createLinearGradient(spot2X, spot2Top, spot2X, h * 0.94)
      spot2Grad.addColorStop(0, 'rgba(220, 240, 255, 0.07)')
      spot2Grad.addColorStop(1, 'rgba(200, 220, 240, 0)')
      ctx.fillStyle = spot2Grad
      ctx.beginPath()
      ctx.moveTo(spot2X - 10, spot2Top)
      ctx.lineTo(spot2X + 10, spot2Top)
      ctx.lineTo(spot2X + 40, h * 0.94)
      ctx.lineTo(spot2X - 40, h * 0.94)
      ctx.closePath()
      ctx.fill()
      ctx.fillStyle = 'rgba(140, 160, 180, 0.15)'
      ctx.beginPath()
      ctx.arc(spot2X, spot2Top, 12, 0, Math.PI * 2)
      ctx.fill()

      // Operating table
      const tableX = w * 0.5
      const tableY = h * 0.91
      const tableW = w * 0.14
      const tableH = h * 0.015
      ctx.fillStyle = 'rgba(50, 70, 90, 0.5)'
      ctx.fillRect(tableX - tableW / 2, tableY, tableW, tableH)
      ctx.strokeStyle = 'rgba(100, 130, 160, 0.2)'
      ctx.lineWidth = 0.5
      ctx.strokeRect(tableX - tableW / 2, tableY, tableW, tableH)
      // Table legs
      ctx.fillStyle = 'rgba(60, 80, 100, 0.3)'
      ctx.fillRect(tableX - tableW * 0.3, tableY + tableH, 3, h * 0.02)
      ctx.fillRect(tableX + tableW * 0.3 - 3, tableY + tableH, 3, h * 0.02)
      // Pillow/head area
      ctx.fillStyle = 'rgba(70, 90, 110, 0.3)'
      ctx.fillRect(tableX - tableW / 2, tableY - 2, tableW * 0.15, tableH + 2)

      // Tool tray
      const trayX = w * 0.62
      const trayY = h * 0.90
      ctx.fillStyle = 'rgba(60, 80, 100, 0.3)'
      ctx.fillRect(trayX, trayY, 20, 2)
      ctx.strokeStyle = 'rgba(80, 100, 120, 0.15)'
      ctx.lineWidth = 1
      ctx.beginPath()
      ctx.moveTo(trayX + 10, trayY + 2)
      ctx.lineTo(trayX + 10, trayY + 15)
      ctx.stroke()
      // Tools on tray
      ctx.strokeStyle = 'rgba(150, 170, 190, 0.2)'
      ctx.lineWidth = 0.5
      for (let i = 0; i < 4; i++) {
        ctx.beginPath()
        ctx.moveTo(trayX + 3 + i * 4, trayY - 1)
        ctx.lineTo(trayX + 3 + i * 4, trayY + 1)
        ctx.stroke()
      }

      // Dark vignette edges in OR
      const orVigL = ctx.createLinearGradient(0, h * 0.80, w * 0.2, h * 0.80)
      orVigL.addColorStop(0, 'rgba(2, 6, 14, 0.7)')
      orVigL.addColorStop(1, 'rgba(2, 6, 14, 0)')
      ctx.fillStyle = orVigL
      ctx.fillRect(0, h * 0.80, w * 0.3, h * 0.20)

      const orVigR = ctx.createLinearGradient(w, h * 0.80, w * 0.8, h * 0.80)
      orVigR.addColorStop(0, 'rgba(2, 6, 14, 0.7)')
      orVigR.addColorStop(1, 'rgba(2, 6, 14, 0)')
      ctx.fillStyle = orVigR
      ctx.fillRect(w * 0.7, h * 0.80, w * 0.3, h * 0.20)

      // ════════════════════════════════════════════════════════════
      // ANIMATED WALKING FIGURES (like Krillion's fish)
      // ════════════════════════════════════════════════════════════

      for (const walker of S.walkers) {
        // Move
        walker.x += walker.speed
        // Respawn when off screen
        if (walker.goRight && walker.x > 1.3) {
          walker.x = -0.15
          walker.scale = 0.7 + Math.random() * 0.5
          walker.yOffset = (Math.random() - 0.5) * 0.02
          walker.hasStethoscope = Math.random() < 0.4
          walker.hasClipboard = Math.random() < 0.3
        } else if (!walker.goRight && walker.x < -0.15) {
          walker.x = 1.3
          walker.scale = 0.7 + Math.random() * 0.5
          walker.yOffset = (Math.random() - 0.5) * 0.02
          walker.hasStethoscope = Math.random() < 0.4
          walker.hasClipboard = Math.random() < 0.3
        }

        // Zone Y position
        let baseY
        if (walker.zone === 0) baseY = h * (0.30 + walker.yOffset)
        else if (walker.zone === 1) baseY = h * (0.52 + walker.yOffset)
        else baseY = h * (0.73 + walker.yOffset)

        const wx = walker.x * w
        const sc = walker.scale * (walker.zone === 0 ? 1.0 : walker.zone === 1 ? 0.85 : 0.7)
        const legSwing = Math.sin(t * 4 + walker.legPhase) * 4 * sc

        // Depth-based opacity (further = more transparent)
        const walkerAlpha = walker.zone === 0 ? 0.4 : walker.zone === 1 ? 0.3 : 0.2

        ctx.save()
        ctx.globalAlpha = walkerAlpha

        // Shadow
        ctx.fillStyle = 'rgba(0, 0, 0, 0.1)'
        ctx.beginPath()
        ctx.ellipse(wx, baseY + 2 * sc, 6 * sc, 2 * sc, 0, 0, Math.PI * 2)
        ctx.fill()

        // Body color based on zone
        let bodyColor
        if (walker.zone === 0) bodyColor = 'rgba(30, 45, 65, 1)'
        else if (walker.zone === 1) bodyColor = 'rgba(25, 55, 65, 1)' // scrubs teal
        else bodyColor = 'rgba(20, 40, 55, 1)'

        // Legs
        ctx.fillStyle = bodyColor
        ctx.save()
        ctx.translate(wx - 2 * sc, baseY)
        ctx.rotate(legSwing * 0.03)
        ctx.fillRect(-1.5 * sc, -2 * sc, 3 * sc, 10 * sc)
        ctx.restore()
        ctx.save()
        ctx.translate(wx + 2 * sc, baseY)
        ctx.rotate(-legSwing * 0.03)
        ctx.fillRect(-1.5 * sc, -2 * sc, 3 * sc, 10 * sc)
        ctx.restore()

        // Torso
        ctx.fillStyle = bodyColor
        ctx.fillRect(wx - 5 * sc, baseY - 16 * sc, 10 * sc, 18 * sc)

        // Head
        ctx.fillStyle = 'rgba(60, 75, 95, 1)'
        ctx.beginPath()
        ctx.arc(wx, baseY - 20 * sc, 4.5 * sc, 0, Math.PI * 2)
        ctx.fill()

        // Stethoscope
        if (walker.hasStethoscope) {
          ctx.strokeStyle = 'rgba(0, 200, 200, 0.6)'
          ctx.lineWidth = 0.8
          ctx.beginPath()
          ctx.arc(wx, baseY - 8 * sc, 3 * sc, 0.3, Math.PI - 0.3)
          ctx.stroke()
        }

        // Clipboard
        if (walker.hasClipboard) {
          const clipSide = walker.goRight ? 1 : -1
          ctx.fillStyle = 'rgba(180, 160, 130, 0.6)'
          ctx.fillRect(wx + clipSide * 6 * sc, baseY - 10 * sc, 4 * sc, 6 * sc)
        }

        ctx.restore()
      }

      // ════════════════════════════════════════════════════════════
      // FLOATING PARTICLES (throughout scene)
      // ════════════════════════════════════════════════════════════

      for (let i = 0; i < S.particles.length; i++) {
        const p = S.particles[i]
        p.y -= p.speed
        if (p.y < -0.02) {
          p.y = 1.02
          p.x = Math.random()
        }
        const px = (p.x + Math.sin(t * p.wobbleSpeed + p.phase) * p.wobbleAmp) * w
        const py = p.y * h
        const pulse = 0.5 + 0.5 * Math.sin(t * 1.3 + p.phase)
        const c = pColors[p.colorIdx]
        const alpha = (0.15 + pulse * 0.2) * (1 - darken)

        // Glow
        const pGlow = ctx.createRadialGradient(px, py, 0, px, py, p.size * 3)
        pGlow.addColorStop(0, `rgba(${c[0]}, ${c[1]}, ${c[2]}, ${alpha * 0.4})`)
        pGlow.addColorStop(1, `rgba(${c[0]}, ${c[1]}, ${c[2]}, 0)`)
        ctx.fillStyle = pGlow
        ctx.fillRect(px - p.size * 3, py - p.size * 3, p.size * 6, p.size * 6)

        // Dot
        ctx.fillStyle = `rgba(${c[0]}, ${c[1]}, ${c[2]}, ${alpha})`
        ctx.beginPath()
        ctx.arc(px, py, p.size, 0, Math.PI * 2)
        ctx.fill()
      }

      // ════════════════════════════════════════════════════════════
      // FULL-WIDTH EKG HEARTBEAT LINE (subtle, mid-screen)
      // ════════════════════════════════════════════════════════════

      const ekgY = h * 0.47
      const ekgHeight = 22
      const cycleWidth = 200
      const ekgAlpha = 0.04 + pct * 0.03
      const ekgOffset = (t * 40) % cycleWidth

      ctx.strokeStyle = `rgba(0, 255, 130, ${ekgAlpha})`
      ctx.lineWidth = 1
      ctx.beginPath()
      let ekgFirst = true
      for (let x = -ekgOffset; x < w + cycleWidth; x += 1.5) {
        const cycleX = ((x + ekgOffset) % cycleWidth) / cycleWidth
        const ey = ekgY + (getEkgY(cycleX) - 0.5) * ekgHeight * 2
        if (ekgFirst) { ctx.moveTo(x, ey); ekgFirst = false }
        else ctx.lineTo(x, ey)
      }
      ctx.stroke()

      // ════════════════════════════════════════════════════════════
      // DEPTH-AWARE DARKENING OVERLAY
      // ════════════════════════════════════════════════════════════

      if (darken > 0.01) {
        ctx.fillStyle = `rgba(0, 0, 0, ${darken * 0.5})`
        ctx.fillRect(0, 0, w, h)
      }

      // ════════════════════════════════════════════════════════════
      // SCANLINES (subtle retro feel)
      // ════════════════════════════════════════════════════════════

      ctx.fillStyle = 'rgba(0, 200, 220, 0.006)'
      for (let sy = 0; sy < h; sy += 3) {
        ctx.fillRect(0, sy, w, 1)
      }

      // ════════════════════════════════════════════════════════════
      // VIGNETTE
      // ════════════════════════════════════════════════════════════

      const vigAlpha = 0.4 + pct * 0.25
      const vigGrad = ctx.createRadialGradient(w * 0.5, h * 0.5, w * 0.2, w * 0.5, h * 0.5, w * 0.75)
      vigGrad.addColorStop(0, 'rgba(0, 0, 0, 0)')
      vigGrad.addColorStop(1, `rgba(0, 0, 0, ${vigAlpha})`)
      ctx.fillStyle = vigGrad
      ctx.fillRect(0, 0, w, h)

      // ── NEXT FRAME ──────────────────────────────────────────────
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
