// Hospital Scene - Scrolling camera through 5 distinct zones
// Sky -> Lobby -> Ward Corridor -> ICU -> OR
// depth prop (0-2500) controls vertical camera offset through a tall virtual world
// Each zone fills roughly one full viewport height

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

      // Stars (spread across zone 0)
      const stars = Array.from({ length: 140 }, () => ({
        x: Math.random(),
        y: Math.random() * 0.85, // fill most of sky zone
        r: rand(0.4, 1.8),
        twinkleSpeed: rand(0.8, 3.0),
        phase: Math.random() * Math.PI * 2,
        brightness: rand(0.4, 1.0),
      }))

      // City skyline buildings
      const skyline = []
      let sx = 0
      while (sx < 1) {
        const bw = rand(0.025, 0.07)
        const bh = rand(0.04, 0.14)
        skyline.push({ x: sx, w: bw, h: bh, windows: Math.floor(rand(2, 6)) })
        sx += bw + rand(0.002, 0.012)
      }

      // Hospital building windows (stable lit map)
      const hospitalWindows = Array.from({ length: 40 }, () => ({
        lit: Math.random() < 0.45,
        flickerPhase: Math.random() * Math.PI * 2,
        flickerSpeed: rand(1.5, 4.0),
      }))

      // Lobby people silhouettes
      const lobbyPeople = Array.from({ length: 10 }, (_, i) => ({
        x: rand(0.08, 0.92),
        sitting: i < 4,
        height: rand(0.8, 1.2),
        width: rand(0.8, 1.1),
      }))

      // Walking figures across different zones
      const walkers = Array.from({ length: 8 }, (_, i) => {
        const goRight = i % 2 === 0
        const zone = i < 3 ? 1 : i < 6 ? 2 : 3 // lobby, ward, ICU
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
      const wardDoors = Array.from({ length: 8 }, (_, i) => ({
        side: i % 2 === 0 ? 'left' : 'right',
        yFrac: 0.25 + i * 0.08,
        open: Math.random() < 0.4,
        lightIntensity: rand(0.3, 0.8),
      }))

      // ICU curtains
      const curtains = Array.from({ length: 5 }, (_, i) => ({
        x: 0.1 + i * 0.2,
        swayPhase: Math.random() * Math.PI * 2,
        swaySpeed: rand(0.4, 1.2),
      }))

      // ICU blinking lights
      const statusLights = Array.from({ length: 20 }, () => ({
        x: rand(0.03, 0.97),
        y: rand(0.15, 0.85),
        color: ['red', 'green', 'amber'][Math.floor(Math.random() * 3)],
        blinkSpeed: rand(0.5, 3.0),
        phase: Math.random() * Math.PI * 2,
        size: rand(1.5, 3.5),
      }))

      // Floating particles (throughout world)
      const particles = Array.from({ length: 50 }, () => ({
        x: Math.random(),
        y: Math.random() * 5, // span entire world (5 zones)
        speed: rand(0.0001, 0.0005),
        size: rand(0.8, 2.5),
        wobbleSpeed: rand(0.3, 1.5),
        wobbleAmp: rand(0.002, 0.008),
        phase: Math.random() * Math.PI * 2,
        colorIdx: Math.floor(Math.random() * 5),
      }))

      // Shooting stars
      const shootingStars = Array.from({ length: 3 }, () => ({
        x: rand(-0.2, 1.2),
        y: rand(0.05, 0.4),
        vx: rand(0.003, 0.008),
        vy: rand(0.001, 0.004),
        active: false,
        timer: rand(5, 20),
        length: rand(0.03, 0.08),
      }))

      stateRef.current = {
        stars, skyline, hospitalWindows, lobbyPeople, walkers,
        wardDoors, curtains, statusLights, particles, shootingStars,
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
          const tt = (nx - x0) / (x1 - x0)
          return y0 + (y1 - y0) * tt * tt * (3 - 2 * tt)
        }
      }
      return 0.5
    }

    // Check if a world-y range is visible given camera
    function isVisible(worldYTop, worldYBottom, cameraY, viewH) {
      const buffer = viewH * 0.25
      return worldYBottom > cameraY - buffer && worldYTop < cameraY + viewH + buffer
    }

    // ── DRAW ───────────────────────────────────────────────────────
    function draw(timestamp) {
      const w = S.width
      const h = S.height
      const t = timestamp * 0.001
      S.time = t

      // Virtual world is 5 screens tall
      const ZONE_COUNT = 5
      const worldH = h * ZONE_COUNT
      const viewH = h

      // Camera Y: smoothly scroll based on depth
      const pct = Math.min(depth / maxDepth, 1)
      const targetCameraY = pct * (worldH - viewH)
      // Zone boundaries (each zone = 1 viewport height)
      // Zone 0: 0 to h (Sky)
      // Zone 1: h to 2h (Lobby)
      // Zone 2: 2h to 3h (Ward)
      // Zone 3: 3h to 4h (ICU)
      // Zone 4: 4h to 5h (OR)
      const cameraY = targetCameraY

      ctx.clearRect(0, 0, w, h)

      // Apply camera transform
      ctx.save()
      ctx.translate(0, -cameraY)

      // ════════════════════════════════════════════════════════════
      // ZONE 0 - SKY / EXTERIOR (worldY: 0 to h)
      // ════════════════════════════════════════════════════════════
      const z0Top = 0
      const z0Bot = h

      if (isVisible(z0Top, z0Bot, cameraY, viewH)) {
        // Deep night sky gradient
        const skyGrad = ctx.createLinearGradient(0, z0Top, 0, z0Bot)
        skyGrad.addColorStop(0, '#020810')
        skyGrad.addColorStop(0.3, '#06101e')
        skyGrad.addColorStop(0.6, '#0a1628')
        skyGrad.addColorStop(0.85, '#0d1f3c')
        skyGrad.addColorStop(1, '#101e38')
        ctx.fillStyle = skyGrad
        ctx.fillRect(0, z0Top, w, z0Bot - z0Top)

        // Nebula / atmospheric glow (upper left)
        const nebX = w * 0.25
        const nebY = z0Top + h * 0.2
        const nebGlow = ctx.createRadialGradient(nebX, nebY, 0, nebX, nebY, h * 0.35)
        nebGlow.addColorStop(0, 'rgba(30, 10, 60, 0.15)')
        nebGlow.addColorStop(0.5, 'rgba(15, 5, 40, 0.06)')
        nebGlow.addColorStop(1, 'rgba(0, 0, 0, 0)')
        ctx.fillStyle = nebGlow
        ctx.fillRect(0, z0Top, w, h * 0.6)

        // Moon (upper right, prominent)
        const moonX = w * 0.78
        const moonY = z0Top + h * 0.12
        const moonR = 18
        // Moon outer glow
        const moonOuter = ctx.createRadialGradient(moonX, moonY, 0, moonX, moonY, h * 0.18)
        moonOuter.addColorStop(0, 'rgba(200, 215, 255, 0.2)')
        moonOuter.addColorStop(0.3, 'rgba(150, 180, 230, 0.06)')
        moonOuter.addColorStop(1, 'rgba(80, 120, 180, 0)')
        ctx.fillStyle = moonOuter
        ctx.beginPath()
        ctx.arc(moonX, moonY, h * 0.18, 0, Math.PI * 2)
        ctx.fill()
        // Moon disc
        ctx.fillStyle = 'rgba(220, 230, 250, 0.8)'
        ctx.beginPath()
        ctx.arc(moonX, moonY, moonR, 0, Math.PI * 2)
        ctx.fill()
        // Moon shadow (crescent effect)
        ctx.fillStyle = '#06101e'
        ctx.beginPath()
        ctx.arc(moonX + 6, moonY - 3, moonR * 0.85, 0, Math.PI * 2)
        ctx.fill()

        // Stars
        for (const star of S.stars) {
          const twinkle = 0.3 + 0.7 * (0.5 + 0.5 * Math.sin(t * star.twinkleSpeed + star.phase))
          const alpha = star.brightness * twinkle
          if (alpha < 0.05) continue
          ctx.fillStyle = `rgba(255, 255, 240, ${alpha})`
          ctx.beginPath()
          ctx.arc(star.x * w, z0Top + star.y * h, star.r, 0, Math.PI * 2)
          ctx.fill()
        }

        // Shooting stars
        for (const ss of S.shootingStars) {
          ss.timer -= 0.016
          if (ss.timer <= 0 && !ss.active) {
            ss.active = true
            ss.x = rand(0.1, 0.9)
            ss.y = rand(0.05, 0.3)
          }
          if (ss.active) {
            ss.x += ss.vx
            ss.y += ss.vy
            const ssX = ss.x * w
            const ssY = z0Top + ss.y * h
            const tailX = ssX - ss.length * w
            const tailY = ssY - ss.length * h * 0.5
            const ssGrad = ctx.createLinearGradient(tailX, tailY, ssX, ssY)
            ssGrad.addColorStop(0, 'rgba(255, 255, 255, 0)')
            ssGrad.addColorStop(1, 'rgba(255, 255, 240, 0.6)')
            ctx.strokeStyle = ssGrad
            ctx.lineWidth = 1.2
            ctx.beginPath()
            ctx.moveTo(tailX, tailY)
            ctx.lineTo(ssX, ssY)
            ctx.stroke()
            if (ss.x > 1.3 || ss.y > 0.8) {
              ss.active = false
              ss.timer = rand(8, 25)
            }
          }
        }

        // City skyline silhouettes (lower portion of sky zone)
        const skylineBase = z0Top + h * 0.72
        for (const b of S.skyline) {
          const bx = b.x * w
          const bw = b.w * w
          const bh = b.h * h
          ctx.fillStyle = 'rgba(8, 14, 28, 0.9)'
          ctx.fillRect(bx, skylineBase - bh, bw, bh + h * 0.3)
          // Tiny city windows
          const winSize = 1.5
          for (let wy = skylineBase - bh + 4; wy < skylineBase - 2; wy += 6) {
            for (let wx = bx + 3; wx < bx + bw - 3; wx += 5) {
              if (((Math.floor(wx) * 7 + Math.floor(wy) * 13) % 11) > 4) continue
              const winFlicker = 0.08 + 0.07 * Math.sin(t * 0.5 + wx * 0.01)
              ctx.fillStyle = `rgba(255, 200, 100, ${winFlicker})`
              ctx.fillRect(wx, wy, winSize, winSize)
            }
          }
        }

        // Hospital building (center, large focal point)
        const hospLeft = w * 0.22
        const hospRight = w * 0.78
        const hospTop = z0Top + h * 0.38
        const hospBottom = z0Top + h * 0.95
        const hospW = hospRight - hospLeft
        const hospH = hospBottom - hospTop

        // Main building
        ctx.fillStyle = 'rgba(12, 22, 40, 0.97)'
        ctx.fillRect(hospLeft, hospTop, hospW, hospH)

        // Wings
        ctx.fillStyle = 'rgba(10, 18, 36, 0.93)'
        ctx.fillRect(hospLeft - w * 0.08, hospTop + hospH * 0.25, w * 0.08, hospH * 0.75)
        ctx.fillRect(hospRight, hospTop + hospH * 0.25, w * 0.08, hospH * 0.75)

        // Hospital windows (10 cols x 8 rows)
        const hwCols = 10
        const hwRows = 8
        const hwW = Math.max(4, hospW * 0.035)
        const hwH = Math.max(3, hospH * 0.04)
        const hwGapX = (hospW - hwCols * hwW) / (hwCols + 1)
        const hwGapY = (hospH * 0.85) / (hwRows + 1)
        const hwStartY = hospTop + hospH * 0.1

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
              ctx.fillStyle = `rgba(255, 184, 77, ${flicker * 0.12})`
              ctx.fillRect(wx - 2, wy - 2, hwW + 4, hwH + 4)
            } else {
              ctx.fillStyle = 'rgba(18, 30, 50, 0.6)'
              ctx.fillRect(wx, wy, hwW, hwH)
            }
          }
        }

        // Red cross on hospital roof (pulsing)
        const crossX = w * 0.5
        const crossY = hospTop + 14
        const crossPulse = 0.7 + 0.3 * Math.sin(t * 1.2)
        ctx.fillStyle = `rgba(255, 70, 70, ${crossPulse})`
        ctx.fillRect(crossX - 3, crossY - 8, 6, 16)
        ctx.fillRect(crossX - 8, crossY - 3, 16, 6)
        // Cross glow
        const cGlow = ctx.createRadialGradient(crossX, crossY, 0, crossX, crossY, 24)
        cGlow.addColorStop(0, `rgba(255, 50, 50, ${0.25 + 0.15 * Math.sin(t * 1.2)})`)
        cGlow.addColorStop(1, 'rgba(255, 50, 50, 0)')
        ctx.fillStyle = cGlow
        ctx.beginPath()
        ctx.arc(crossX, crossY, 24, 0, Math.PI * 2)
        ctx.fill()

        // "HOSPITAL" text glow
        ctx.fillStyle = `rgba(255, 240, 200, ${0.06 + 0.02 * Math.sin(t)})`
        ctx.font = `${Math.max(10, w * 0.012)}px sans-serif`
        ctx.textAlign = 'center'
        ctx.fillText('HOSPITAL', crossX, hospTop + 36)

        // Ambulance bay at bottom of hospital
        const ambY = hospBottom - h * 0.08
        // Canopy
        ctx.fillStyle = 'rgba(20, 35, 55, 0.8)'
        ctx.fillRect(hospLeft + hospW * 0.3, ambY, hospW * 0.4, 4)
        // Ambulance silhouette
        const ambX = hospLeft + hospW * 0.42
        ctx.fillStyle = 'rgba(30, 45, 65, 0.6)'
        ctx.fillRect(ambX, ambY + 6, 36, 16)
        ctx.fillRect(ambX - 10, ambY + 10, 10, 12)
        // Ambulance lights
        ctx.fillStyle = `rgba(255, 50, 50, ${0.3 + 0.3 * Math.sin(t * 3)})`
        ctx.beginPath()
        ctx.arc(ambX + 18, ambY + 5, 2, 0, Math.PI * 2)
        ctx.fill()
        ctx.fillStyle = `rgba(50, 100, 255, ${0.3 + 0.3 * Math.sin(t * 3 + Math.PI)})`
        ctx.beginPath()
        ctx.arc(ambX + 24, ambY + 5, 2, 0, Math.PI * 2)
        ctx.fill()

        // Ground / entrance area
        ctx.fillStyle = 'rgba(8, 16, 30, 0.95)'
        ctx.fillRect(0, z0Bot - h * 0.05, w, h * 0.05)
      }

      // Transition gradient between sky and lobby
      const t01 = z0Bot - h * 0.1
      if (isVisible(t01, z0Bot + h * 0.1, cameraY, viewH)) {
        const transGrad = ctx.createLinearGradient(0, t01, 0, z0Bot + h * 0.1)
        transGrad.addColorStop(0, 'rgba(10, 18, 34, 0)')
        transGrad.addColorStop(0.5, 'rgba(14, 24, 42, 0.95)')
        transGrad.addColorStop(1, 'rgba(18, 28, 44, 0)')
        ctx.fillStyle = transGrad
        ctx.fillRect(0, t01, w, h * 0.2)
      }

      // ════════════════════════════════════════════════════════════
      // ZONE 1 - LOBBY (worldY: h to 2h)
      // ════════════════════════════════════════════════════════════
      const z1Top = h
      const z1Bot = h * 2

      if (isVisible(z1Top, z1Bot, cameraY, viewH)) {
        // Lobby background - warm, inviting
        const lobbyGrad = ctx.createLinearGradient(0, z1Top, 0, z1Bot)
        lobbyGrad.addColorStop(0, 'rgba(18, 28, 44, 1)')
        lobbyGrad.addColorStop(0.15, 'rgba(22, 34, 52, 1)')
        lobbyGrad.addColorStop(0.5, 'rgba(24, 36, 54, 1)')
        lobbyGrad.addColorStop(0.85, 'rgba(20, 32, 50, 1)')
        lobbyGrad.addColorStop(1, 'rgba(16, 28, 46, 1)')
        ctx.fillStyle = lobbyGrad
        ctx.fillRect(0, z1Top, w, z1Bot - z1Top)

        // Warm ambient wash from ceiling
        const lobbyWash = ctx.createRadialGradient(w * 0.5, z1Top + h * 0.1, 0, w * 0.5, z1Top + h * 0.1, w * 0.6)
        lobbyWash.addColorStop(0, 'rgba(255, 220, 160, 0.04)')
        lobbyWash.addColorStop(0.5, 'rgba(255, 200, 140, 0.02)')
        lobbyWash.addColorStop(1, 'rgba(255, 180, 120, 0)')
        ctx.fillStyle = lobbyWash
        ctx.fillRect(0, z1Top, w, h * 0.5)

        // Ceiling panels
        ctx.strokeStyle = 'rgba(40, 55, 75, 0.15)'
        ctx.lineWidth = 0.5
        for (let i = 0; i < 8; i++) {
          const lx = w * (0.05 + i * 0.13)
          ctx.beginPath()
          ctx.moveTo(lx, z1Top + 5)
          ctx.lineTo(lx, z1Top + h * 0.04)
          ctx.stroke()
        }

        // Warm overhead lights (8 recessed lights)
        for (let i = 0; i < 8; i++) {
          const lx = w * (0.06 + i * 0.125)
          const ly = z1Top + h * 0.05
          const lGlow = ctx.createRadialGradient(lx, ly, 0, lx, ly, h * 0.12)
          lGlow.addColorStop(0, 'rgba(255, 230, 180, 0.1)')
          lGlow.addColorStop(0.4, 'rgba(255, 220, 160, 0.04)')
          lGlow.addColorStop(1, 'rgba(255, 200, 140, 0)')
          ctx.fillStyle = lGlow
          ctx.fillRect(lx - h * 0.12, ly - h * 0.04, h * 0.24, h * 0.16)
          // Light fixture
          ctx.fillStyle = 'rgba(255, 240, 200, 0.15)'
          ctx.fillRect(lx - 15, ly, 30, 2)
        }

        // Floor tiles (subtle grid)
        const floorY = z1Top + h * 0.6
        ctx.strokeStyle = 'rgba(40, 55, 75, 0.06)'
        ctx.lineWidth = 0.5
        for (let gy = floorY; gy < z1Bot; gy += 30) {
          ctx.beginPath()
          ctx.moveTo(0, gy)
          ctx.lineTo(w, gy)
          ctx.stroke()
        }
        for (let gx = 0; gx < w; gx += 30) {
          ctx.beginPath()
          ctx.moveTo(gx, floorY)
          ctx.lineTo(gx, z1Bot)
          ctx.stroke()
        }
        // Floor sheen
        const floorSheen = ctx.createLinearGradient(0, floorY, 0, z1Bot)
        floorSheen.addColorStop(0, 'rgba(100, 140, 180, 0.03)')
        floorSheen.addColorStop(0.5, 'rgba(80, 120, 160, 0.01)')
        floorSheen.addColorStop(1, 'rgba(60, 100, 140, 0)')
        ctx.fillStyle = floorSheen
        ctx.fillRect(0, floorY, w, z1Bot - floorY)

        // Reception desk (prominent, centered)
        const deskY = z1Top + h * 0.42
        const deskLeft = w * 0.25
        const deskW = w * 0.5
        const deskH = h * 0.06
        // Desk front
        ctx.fillStyle = 'rgba(40, 55, 75, 0.7)'
        ctx.fillRect(deskLeft, deskY, deskW, deskH)
        // Desk top surface
        const deskTopGrad = ctx.createLinearGradient(0, deskY, 0, deskY + 3)
        deskTopGrad.addColorStop(0, 'rgba(90, 110, 130, 0.5)')
        deskTopGrad.addColorStop(1, 'rgba(60, 80, 100, 0.3)')
        ctx.fillStyle = deskTopGrad
        ctx.fillRect(deskLeft, deskY, deskW, 3)
        // Monitor on desk
        ctx.fillStyle = 'rgba(10, 25, 40, 0.6)'
        ctx.fillRect(deskLeft + deskW * 0.4, deskY - h * 0.04, 22, h * 0.035)
        ctx.fillStyle = 'rgba(0, 180, 200, 0.12)'
        ctx.fillRect(deskLeft + deskW * 0.4 + 2, deskY - h * 0.038, 18, h * 0.03)
        // Monitor stand
        ctx.fillStyle = 'rgba(40, 55, 75, 0.5)'
        ctx.fillRect(deskLeft + deskW * 0.4 + 8, deskY - 5, 6, 5)
        // Second monitor
        ctx.fillStyle = 'rgba(10, 25, 40, 0.6)'
        ctx.fillRect(deskLeft + deskW * 0.6, deskY - h * 0.035, 18, h * 0.03)
        ctx.fillStyle = 'rgba(0, 160, 180, 0.1)'
        ctx.fillRect(deskLeft + deskW * 0.6 + 2, deskY - h * 0.033, 14, h * 0.025)

        // "RECEPTION" sign
        ctx.fillStyle = 'rgba(0, 200, 220, 0.08)'
        ctx.font = `${Math.max(8, w * 0.008)}px sans-serif`
        ctx.textAlign = 'center'
        ctx.fillText('RECEPTION', w * 0.5, deskY + deskH * 0.6)

        // Waiting room chairs (left cluster)
        const chairY = z1Top + h * 0.56
        for (let i = 0; i < 8; i++) {
          const cx = w * 0.06 + i * w * 0.045
          ctx.fillStyle = 'rgba(35, 50, 70, 0.6)'
          ctx.fillRect(cx, chairY, 12, 6)
          ctx.fillRect(cx, chairY - 10, 12, 10)
          ctx.fillStyle = 'rgba(50, 65, 85, 0.4)'
          ctx.fillRect(cx + 1, chairY + 6, 2, 5)
          ctx.fillRect(cx + 9, chairY + 6, 2, 5)
        }
        // Right cluster
        for (let i = 0; i < 6; i++) {
          const cx = w * 0.68 + i * w * 0.045
          ctx.fillStyle = 'rgba(35, 50, 70, 0.6)'
          ctx.fillRect(cx, chairY + 4, 12, 6)
          ctx.fillRect(cx, chairY + 4 - 10, 12, 10)
          ctx.fillStyle = 'rgba(50, 65, 85, 0.4)'
          ctx.fillRect(cx + 1, chairY + 10, 2, 5)
          ctx.fillRect(cx + 9, chairY + 10, 2, 5)
        }

        // Potted plants
        function drawPlant(px, py, sc) {
          const s = sc || 1
          ctx.fillStyle = 'rgba(90, 60, 40, 0.5)'
          ctx.beginPath()
          ctx.moveTo(px - 6 * s, py)
          ctx.lineTo(px + 6 * s, py)
          ctx.lineTo(px + 5 * s, py + 12 * s)
          ctx.lineTo(px - 5 * s, py + 12 * s)
          ctx.closePath()
          ctx.fill()
          ctx.fillStyle = 'rgba(30, 90, 50, 0.45)'
          ctx.beginPath()
          ctx.arc(px, py - 5 * s, 9 * s, 0, Math.PI * 2)
          ctx.fill()
          ctx.fillStyle = 'rgba(40, 110, 60, 0.35)'
          ctx.beginPath()
          ctx.arc(px - 5 * s, py - 9 * s, 6 * s, 0, Math.PI * 2)
          ctx.fill()
          ctx.beginPath()
          ctx.arc(px + 5 * s, py - 8 * s, 6 * s, 0, Math.PI * 2)
          ctx.fill()
        }
        drawPlant(w * 0.05, z1Top + h * 0.4, 1.3)
        drawPlant(w * 0.95, z1Top + h * 0.42, 1.3)
        drawPlant(w * 0.48, z1Top + h * 0.6, 1)
        drawPlant(w * 0.52, z1Top + h * 0.6, 1)

        // Lobby people silhouettes
        for (const p of S.lobbyPeople) {
          const px = p.x * w
          const baseY = p.sitting ? z1Top + h * 0.54 : z1Top + h * 0.48
          const sc = p.height * 0.9
          ctx.fillStyle = `rgba(22, 35, 52, ${0.55 * p.width})`
          if (p.sitting) {
            ctx.beginPath()
            ctx.arc(px, baseY - 12 * sc, 5 * sc, 0, Math.PI * 2)
            ctx.fill()
            ctx.fillRect(px - 5 * sc, baseY - 7 * sc, 10 * sc, 12 * sc)
          } else {
            ctx.beginPath()
            ctx.arc(px, baseY - 22 * sc, 5 * sc, 0, Math.PI * 2)
            ctx.fill()
            ctx.fillRect(px - 5 * sc, baseY - 17 * sc, 10 * sc, 22 * sc)
            ctx.fillRect(px - 3 * sc, baseY + 5 * sc, 3 * sc, 10 * sc)
            ctx.fillRect(px + 0.5 * sc, baseY + 5 * sc, 3 * sc, 10 * sc)
          }
        }

        // Elevator doors (back wall)
        for (let i = 0; i < 3; i++) {
          const ex = w * (0.35 + i * 0.15)
          const ey = z1Top + h * 0.2
          const ew = w * 0.06
          const eh = h * 0.16
          ctx.fillStyle = 'rgba(30, 45, 65, 0.6)'
          ctx.fillRect(ex, ey, ew, eh)
          ctx.strokeStyle = 'rgba(60, 85, 110, 0.2)'
          ctx.lineWidth = 0.5
          ctx.strokeRect(ex, ey, ew, eh)
          // Center line
          ctx.beginPath()
          ctx.moveTo(ex + ew / 2, ey)
          ctx.lineTo(ex + ew / 2, ey + eh)
          ctx.stroke()
          // Floor indicator
          const floorNum = Math.floor(t + i) % 8 + 1
          ctx.fillStyle = 'rgba(0, 200, 180, 0.15)'
          ctx.font = '8px sans-serif'
          ctx.textAlign = 'center'
          ctx.fillText(floorNum.toString(), ex + ew / 2, ey - 4)
        }

        // Info/direction signs
        ctx.fillStyle = 'rgba(0, 180, 200, 0.06)'
        ctx.fillRect(w * 0.02, z1Top + h * 0.18, w * 0.12, h * 0.03)
        ctx.fillStyle = 'rgba(0, 200, 220, 0.1)'
        ctx.font = `${Math.max(7, w * 0.006)}px sans-serif`
        ctx.textAlign = 'left'
        ctx.fillText('EMERGENCY', w * 0.03, z1Top + h * 0.202)
        ctx.fillStyle = 'rgba(0, 180, 200, 0.06)'
        ctx.fillRect(w * 0.86, z1Top + h * 0.18, w * 0.12, h * 0.03)
        ctx.fillStyle = 'rgba(0, 200, 220, 0.1)'
        ctx.textAlign = 'right'
        ctx.fillText('RADIOLOGY', w * 0.97, z1Top + h * 0.202)
      }

      // ════════════════════════════════════════════════════════════
      // ZONE 2 - WARD CORRIDOR (worldY: 2h to 3h)
      // ════════════════════════════════════════════════════════════
      const z2Top = h * 2
      const z2Bot = h * 3

      if (isVisible(z2Top, z2Bot, cameraY, viewH)) {
        // Ward background - cooler, clinical
        const wardGrad = ctx.createLinearGradient(0, z2Top, 0, z2Bot)
        wardGrad.addColorStop(0, 'rgba(16, 28, 46, 1)')
        wardGrad.addColorStop(0.3, 'rgba(14, 30, 48, 1)')
        wardGrad.addColorStop(0.7, 'rgba(12, 26, 44, 1)')
        wardGrad.addColorStop(1, 'rgba(10, 22, 40, 1)')
        ctx.fillStyle = wardGrad
        ctx.fillRect(0, z2Top, w, z2Bot - z2Top)

        // Corridor perspective - vanishing point
        const vanishX = w * 0.5
        const vanishY = z2Top + h * 0.15

        // Corridor walls (perspective lines)
        ctx.strokeStyle = 'rgba(0, 180, 200, 0.06)'
        ctx.lineWidth = 1
        // Left wall
        ctx.beginPath()
        ctx.moveTo(0, z2Bot)
        ctx.lineTo(vanishX - w * 0.12, vanishY)
        ctx.stroke()
        // Right wall
        ctx.beginPath()
        ctx.moveTo(w, z2Bot)
        ctx.lineTo(vanishX + w * 0.12, vanishY)
        ctx.stroke()

        // Ceiling line
        ctx.strokeStyle = 'rgba(60, 85, 110, 0.08)'
        ctx.beginPath()
        ctx.moveTo(0, z2Top + h * 0.08)
        ctx.lineTo(vanishX - w * 0.12, vanishY)
        ctx.stroke()
        ctx.beginPath()
        ctx.moveTo(w, z2Top + h * 0.08)
        ctx.lineTo(vanishX + w * 0.12, vanishY)
        ctx.stroke()

        // Floor perspective lines
        ctx.strokeStyle = 'rgba(0, 160, 180, 0.03)'
        ctx.lineWidth = 0.5
        for (let i = 0; i < 12; i++) {
          const y = z2Top + h * (0.25 + i * 0.06)
          const spread = (y - vanishY) / (z2Bot - vanishY)
          const leftX = vanishX - w * 0.12 - spread * (vanishX - w * 0.12)
          const rightX = vanishX + w * 0.12 + spread * (w - vanishX - w * 0.12)
          ctx.beginPath()
          ctx.moveTo(leftX, y)
          ctx.lineTo(rightX, y)
          ctx.stroke()
        }

        // Corridor ceiling lights (receding into distance)
        for (let i = 0; i < 7; i++) {
          const ly = z2Top + h * (0.12 + i * 0.1)
          const spread = Math.max(0, (ly - vanishY) / (z2Bot - vanishY))
          const lightW = 20 + spread * 40
          const lightGlow = ctx.createRadialGradient(vanishX, ly, 0, vanishX, ly, 25 + spread * 50)
          lightGlow.addColorStop(0, 'rgba(255, 240, 210, 0.08)')
          lightGlow.addColorStop(0.5, 'rgba(255, 240, 210, 0.02)')
          lightGlow.addColorStop(1, 'rgba(255, 240, 210, 0)')
          ctx.fillStyle = lightGlow
          ctx.fillRect(vanishX - lightW, ly - 15, lightW * 2, 30)
          // Light fixture
          ctx.fillStyle = 'rgba(255, 240, 200, 0.12)'
          ctx.fillRect(vanishX - lightW * 0.3, ly, lightW * 0.6, 1.5)
        }

        // Doors along corridor (perspective-correct)
        for (const door of S.wardDoors) {
          const dy = z2Top + door.yFrac * h
          const spread = Math.max(0, (dy - vanishY) / (z2Bot - vanishY))
          const doorH = 20 + spread * 24
          const doorW = 10 + spread * 10

          let dx
          if (door.side === 'left') {
            dx = vanishX - w * 0.12 - spread * (vanishX * 0.6) - doorW
          } else {
            dx = vanishX + w * 0.12 + spread * (vanishX * 0.6)
          }

          if (door.open) {
            // Warm light spilling out
            const spillGlow = ctx.createRadialGradient(dx + doorW / 2, dy + doorH / 2, 0, dx + doorW / 2, dy + doorH / 2, doorH * 2)
            spillGlow.addColorStop(0, `rgba(255, 200, 120, ${0.1 * door.lightIntensity})`)
            spillGlow.addColorStop(1, 'rgba(255, 200, 120, 0)')
            ctx.fillStyle = spillGlow
            ctx.fillRect(dx - doorH * 1.5, dy - doorH, doorH * 4, doorH * 3)

            ctx.fillStyle = `rgba(255, 190, 100, ${0.15 * door.lightIntensity})`
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
            // Door handle
            ctx.fillStyle = 'rgba(100, 140, 160, 0.25)'
            ctx.fillRect(dx + doorW - 3, dy + doorH * 0.5, 2, 2)
          }

          // Room number
          ctx.fillStyle = 'rgba(0, 200, 220, 0.08)'
          ctx.font = `${Math.max(5, 4 + spread * 4)}px sans-serif`
          ctx.textAlign = 'center'
          ctx.fillText(`${200 + Math.floor(door.yFrac * 10)}`, dx + doorW / 2, dy - 3)
        }

        // IV stands
        function drawIV(ix, iy, sc, alpha) {
          ctx.strokeStyle = `rgba(100, 150, 170, ${alpha})`
          ctx.lineWidth = 1
          ctx.beginPath()
          ctx.moveTo(ix, iy)
          ctx.lineTo(ix, iy - 44 * sc)
          ctx.stroke()
          ctx.beginPath()
          ctx.moveTo(ix - 6 * sc, iy - 44 * sc)
          ctx.lineTo(ix + 6 * sc, iy - 44 * sc)
          ctx.stroke()
          ctx.fillStyle = `rgba(140, 180, 220, ${alpha * 0.5})`
          ctx.fillRect(ix + 2 * sc, iy - 42 * sc, 7 * sc, 12 * sc)
          ctx.strokeStyle = `rgba(100, 150, 170, ${alpha * 0.4})`
          ctx.beginPath()
          ctx.moveTo(ix + 5 * sc, iy - 30 * sc)
          ctx.lineTo(ix + 5 * sc, iy - 14 * sc)
          ctx.stroke()
          // Tripod base
          ctx.strokeStyle = `rgba(100, 150, 170, ${alpha * 0.5})`
          ctx.beginPath()
          ctx.moveTo(ix, iy)
          ctx.lineTo(ix - 7 * sc, iy + 4 * sc)
          ctx.moveTo(ix, iy)
          ctx.lineTo(ix + 7 * sc, iy + 4 * sc)
          ctx.moveTo(ix, iy)
          ctx.lineTo(ix, iy + 5 * sc)
          ctx.stroke()
        }
        drawIV(w * 0.06, z2Top + h * 0.65, 0.9, 0.22)
        drawIV(w * 0.94, z2Top + h * 0.6, 0.8, 0.18)
        drawIV(w * 0.15, z2Top + h * 0.75, 0.7, 0.15)
        drawIV(w * 0.85, z2Top + h * 0.72, 0.65, 0.13)

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
        drawBed(w * 0.03, z2Top + h * 0.45, 32, 12, 0.18)
        drawBed(w * 0.92, z2Top + h * 0.52, 30, 11, 0.15)

        // Wheelchair
        const wcX = w * 0.12
        const wcY = z2Top + h * 0.82
        ctx.strokeStyle = 'rgba(90, 130, 150, 0.18)'
        ctx.lineWidth = 1
        ctx.beginPath()
        ctx.arc(wcX, wcY, 7, 0, Math.PI * 2)
        ctx.stroke()
        ctx.beginPath()
        ctx.arc(wcX + 12, wcY, 4, 0, Math.PI * 2)
        ctx.stroke()
        ctx.beginPath()
        ctx.moveTo(wcX - 2, wcY - 10)
        ctx.lineTo(wcX + 12, wcY - 6)
        ctx.lineTo(wcX + 12, wcY - 3)
        ctx.stroke()
        ctx.beginPath()
        ctx.moveTo(wcX - 2, wcY - 10)
        ctx.lineTo(wcX - 4, wcY - 18)
        ctx.stroke()

        // EKG monitors on walls
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
          const ekgSx = mx + mw * 0.075
          const midY = my + mh * 0.5
          const amp = mh * 0.35
          for (let i = 0; i <= cycleW; i += 1.5) {
            const nx = ((i + timeOff * 35) % cycleW) / cycleW
            const ey = midY + (getEkgY(nx) - 0.5) * amp * 2
            if (i === 0) ctx.moveTo(ekgSx + i, ey)
            else ctx.lineTo(ekgSx + i, ey)
          }
          ctx.stroke()
          // Status dot
          ctx.fillStyle = `rgba(0, 255, 100, ${0.5 + 0.5 * Math.sin(t * 2 + timeOff)})`
          ctx.beginPath()
          ctx.arc(mx + mw - 4, my + 4, 1.5, 0, Math.PI * 2)
          ctx.fill()
        }
        drawMonitor(w * 0.02, z2Top + h * 0.3, 40, 22, 0.28, t)
        drawMonitor(w * 0.92, z2Top + h * 0.35, 36, 20, 0.22, t + 2)

        // Hand sanitizer dispensers on walls
        for (let i = 0; i < 3; i++) {
          const hx = w * (0.3 + i * 0.2)
          const hy = z2Top + h * 0.2
          ctx.fillStyle = 'rgba(50, 70, 90, 0.3)'
          ctx.fillRect(hx, hy, 6, 10)
          ctx.fillStyle = 'rgba(0, 180, 200, 0.1)'
          ctx.fillRect(hx + 1, hy + 1, 4, 4)
        }
      }

      // ════════════════════════════════════════════════════════════
      // ZONE 3 - ICU (worldY: 3h to 4h)
      // ════════════════════════════════════════════════════════════
      const z3Top = h * 3
      const z3Bot = h * 4

      if (isVisible(z3Top, z3Bot, cameraY, viewH)) {
        // ICU background - darker, more clinical
        const icuGrad = ctx.createLinearGradient(0, z3Top, 0, z3Bot)
        icuGrad.addColorStop(0, 'rgba(10, 22, 40, 1)')
        icuGrad.addColorStop(0.3, 'rgba(8, 18, 34, 1)')
        icuGrad.addColorStop(0.7, 'rgba(6, 14, 28, 1)')
        icuGrad.addColorStop(1, 'rgba(6, 12, 24, 1)')
        ctx.fillStyle = icuGrad
        ctx.fillRect(0, z3Top, w, z3Bot - z3Top)

        // Dark ambient - screens cast a cold glow
        const icuGlow = ctx.createRadialGradient(w * 0.5, z3Top + h * 0.4, 0, w * 0.5, z3Top + h * 0.4, w * 0.5)
        icuGlow.addColorStop(0, 'rgba(0, 60, 80, 0.04)')
        icuGlow.addColorStop(1, 'rgba(0, 30, 50, 0)')
        ctx.fillStyle = icuGlow
        ctx.fillRect(0, z3Top, w, h)

        // ICU monitors (many, prominent with glow)
        function drawICUMonitor(mx, my, mw, mh, alpha, timeOff) {
          // Screen glow on wall
          const scrGlow = ctx.createRadialGradient(mx + mw / 2, my + mh / 2, 0, mx + mw / 2, my + mh / 2, mw * 1.5)
          scrGlow.addColorStop(0, `rgba(0, 180, 160, ${alpha * 0.08})`)
          scrGlow.addColorStop(1, 'rgba(0, 100, 80, 0)')
          ctx.fillStyle = scrGlow
          ctx.fillRect(mx - mw, my - mh, mw * 3, mh * 3)

          ctx.fillStyle = `rgba(6, 18, 28, ${alpha * 0.9})`
          ctx.fillRect(mx, my, mw, mh)
          ctx.strokeStyle = `rgba(0, 200, 180, ${alpha * 0.5})`
          ctx.lineWidth = 0.8
          ctx.strokeRect(mx, my, mw, mh)

          // EKG line
          ctx.strokeStyle = `rgba(0, 255, 130, ${alpha})`
          ctx.lineWidth = 1.2
          ctx.beginPath()
          const cycleW = mw * 0.85
          const ekgSx = mx + mw * 0.075
          const midY = my + mh * 0.35
          const amp = mh * 0.25
          for (let i = 0; i <= cycleW; i += 1.5) {
            const nx = ((i + timeOff * 35) % cycleW) / cycleW
            const ey = midY + (getEkgY(nx) - 0.5) * amp * 2
            if (i === 0) ctx.moveTo(ekgSx + i, ey)
            else ctx.lineTo(ekgSx + i, ey)
          }
          ctx.stroke()

          // SpO2 line (second trace)
          ctx.strokeStyle = `rgba(0, 200, 255, ${alpha * 0.6})`
          ctx.lineWidth = 0.8
          ctx.beginPath()
          const midY2 = my + mh * 0.65
          for (let i = 0; i <= cycleW; i += 2) {
            const nx = ((i + timeOff * 25) % cycleW) / cycleW
            const ey = midY2 + Math.sin(nx * Math.PI * 4 + timeOff) * amp * 0.5
            if (i === 0) ctx.moveTo(ekgSx + i, ey)
            else ctx.lineTo(ekgSx + i, ey)
          }
          ctx.stroke()

          // Vitals numbers
          ctx.fillStyle = `rgba(0, 255, 130, ${alpha * 0.7})`
          ctx.font = `${Math.max(6, mh * 0.2)}px monospace`
          ctx.textAlign = 'right'
          const hr = 72 + Math.floor(Math.sin(t * 0.3 + timeOff) * 8)
          ctx.fillText(hr.toString(), mx + mw - 3, my + mh * 0.3)
          ctx.fillStyle = `rgba(0, 200, 255, ${alpha * 0.6})`
          ctx.fillText('98', mx + mw - 3, my + mh * 0.7)

          // Status dot
          ctx.fillStyle = `rgba(0, 255, 100, ${0.5 + 0.5 * Math.sin(t * 2 + timeOff)})`
          ctx.beginPath()
          ctx.arc(mx + mw - 4, my + 4, 2, 0, Math.PI * 2)
          ctx.fill()
        }

        drawICUMonitor(w * 0.02, z3Top + h * 0.12, 60, 34, 0.4, t + 1)
        drawICUMonitor(w * 0.85, z3Top + h * 0.15, 56, 32, 0.35, t + 3.5)
        drawICUMonitor(w * 0.04, z3Top + h * 0.52, 52, 30, 0.3, t + 5)
        drawICUMonitor(w * 0.87, z3Top + h * 0.55, 50, 28, 0.28, t + 7)
        // Central nursing station monitor
        drawICUMonitor(w * 0.38, z3Top + h * 0.08, 70, 40, 0.35, t + 2)

        // Ventilator shapes
        function drawVentilator(vx, vy, alpha) {
          ctx.fillStyle = `rgba(16, 32, 48, ${alpha})`
          ctx.fillRect(vx, vy, 20, 30)
          ctx.strokeStyle = `rgba(0, 180, 200, ${alpha * 0.5})`
          ctx.lineWidth = 0.5
          ctx.strokeRect(vx, vy, 20, 30)
          // Screen
          ctx.fillStyle = `rgba(0, 100, 130, ${alpha * 0.5})`
          ctx.fillRect(vx + 2, vy + 2, 16, 10)
          // Pressure waveform on vent screen
          ctx.strokeStyle = `rgba(255, 220, 80, ${alpha * 0.5})`
          ctx.lineWidth = 0.6
          ctx.beginPath()
          for (let i = 0; i < 14; i++) {
            const nx = i / 14
            const ey = vy + 7 + Math.sin(nx * Math.PI * 3 + t * 2) * 3
            if (i === 0) ctx.moveTo(vx + 3 + i, ey)
            else ctx.lineTo(vx + 3 + i, ey)
          }
          ctx.stroke()
          // Tubing
          ctx.strokeStyle = `rgba(140, 180, 200, ${alpha * 0.3})`
          ctx.lineWidth = 2.5
          ctx.beginPath()
          ctx.moveTo(vx + 10, vy + 30)
          ctx.quadraticCurveTo(vx + 10, vy + 44, vx + 24, vy + 44)
          ctx.stroke()
        }
        drawVentilator(w * 0.18, z3Top + h * 0.3, 0.35)
        drawVentilator(w * 0.78, z3Top + h * 0.35, 0.3)
        drawVentilator(w * 0.22, z3Top + h * 0.6, 0.25)

        // Curtain dividers (wavy vertical lines)
        for (const curtain of S.curtains) {
          const cx = curtain.x * w
          const sway = Math.sin(t * curtain.swaySpeed + curtain.swayPhase) * 3
          ctx.strokeStyle = 'rgba(60, 90, 120, 0.18)'
          ctx.lineWidth = 1
          ctx.beginPath()
          const curtTop = z3Top + h * 0.1
          const curtBot = z3Top + h * 0.9
          for (let y = curtTop; y < curtBot; y += 2) {
            const offset = sway * Math.sin((y - curtTop) * 0.04)
            if (y <= curtTop + 1) ctx.moveTo(cx + offset, y)
            else ctx.lineTo(cx + offset, y)
          }
          ctx.stroke()
          // Curtain rod
          ctx.fillStyle = 'rgba(80, 110, 140, 0.12)'
          ctx.fillRect(cx - 10, curtTop - 2, 20, 2)
        }

        // Status lights (blinking red, green, amber scattered)
        for (const light of S.statusLights) {
          const lx = light.x * w
          const ly = z3Top + light.y * h
          const blink = 0.3 + 0.7 * (0.5 + 0.5 * Math.sin(t * light.blinkSpeed + light.phase))
          let r, g, b
          if (light.color === 'red') { r = 255; g = 60; b = 60 }
          else if (light.color === 'green') { r = 60; g = 255; b = 100 }
          else { r = 255; g = 190; b = 60 }

          ctx.fillStyle = `rgba(${r}, ${g}, ${b}, ${blink * 0.6})`
          ctx.beginPath()
          ctx.arc(lx, ly, light.size, 0, Math.PI * 2)
          ctx.fill()

          const lglow = ctx.createRadialGradient(lx, ly, 0, lx, ly, light.size * 5)
          lglow.addColorStop(0, `rgba(${r}, ${g}, ${b}, ${blink * 0.12})`)
          lglow.addColorStop(1, `rgba(${r}, ${g}, ${b}, 0)`)
          ctx.fillStyle = lglow
          ctx.beginPath()
          ctx.arc(lx, ly, light.size * 5, 0, Math.PI * 2)
          ctx.fill()
        }

        // ICU beds
        function drawICUBed(bx, by, bw, bh, alpha) {
          ctx.strokeStyle = `rgba(100, 150, 170, ${alpha})`
          ctx.lineWidth = 1
          ctx.strokeRect(bx, by, bw, bh)
          ctx.fillStyle = `rgba(50, 80, 110, ${alpha * 0.3})`
          ctx.fillRect(bx, by, bw, bh)
          // Headboard
          ctx.fillStyle = `rgba(70, 100, 130, ${alpha * 0.5})`
          ctx.fillRect(bx, by - bh * 0.3, bw * 0.1, bh * 1.3)
          // Patient silhouette
          ctx.fillStyle = `rgba(30, 50, 70, ${alpha * 0.4})`
          ctx.fillRect(bx + bw * 0.15, by + 1, bw * 0.7, bh - 2)
        }
        drawICUBed(w * 0.22, z3Top + h * 0.42, 40, 14, 0.25)
        drawICUBed(w * 0.58, z3Top + h * 0.45, 38, 13, 0.22)
        drawICUBed(w * 0.25, z3Top + h * 0.72, 36, 12, 0.2)
        drawICUBed(w * 0.60, z3Top + h * 0.75, 34, 12, 0.18)

        // IV stands
        drawIV(w * 0.30, z3Top + h * 0.4, 0.7, 0.2)
        drawIV(w * 0.66, z3Top + h * 0.43, 0.65, 0.18)
        drawIV(w * 0.33, z3Top + h * 0.7, 0.6, 0.16)

        // "ICU" sign
        ctx.fillStyle = `rgba(255, 70, 70, ${0.08 + 0.04 * Math.sin(t * 0.8)})`
        ctx.font = `bold ${Math.max(10, w * 0.015)}px sans-serif`
        ctx.textAlign = 'center'
        ctx.fillText('ICU', w * 0.5, z3Top + h * 0.04)
      }

      // ════════════════════════════════════════════════════════════
      // ZONE 4 - OPERATING ROOM (worldY: 4h to 5h)
      // ════════════════════════════════════════════════════════════
      const z4Top = h * 4
      const z4Bot = h * 5

      if (isVisible(z4Top, z4Bot, cameraY, viewH)) {
        // OR background - darkest, dramatic
        const orGrad = ctx.createLinearGradient(0, z4Top, 0, z4Bot)
        orGrad.addColorStop(0, 'rgba(6, 12, 24, 1)')
        orGrad.addColorStop(0.3, 'rgba(4, 10, 20, 1)')
        orGrad.addColorStop(0.7, 'rgba(3, 8, 16, 1)')
        orGrad.addColorStop(1, 'rgba(2, 6, 12, 1)')
        ctx.fillStyle = orGrad
        ctx.fillRect(0, z4Top, w, z4Bot - z4Top)

        // Dramatic surgical spotlight (main - bright cone)
        const spotX = w * 0.5
        const spotTop = z4Top + h * 0.1
        const spotBottom = z4Top + h * 0.7
        // Outer glow halo around lamp
        const haloGlow = ctx.createRadialGradient(spotX, spotTop, 0, spotX, spotTop, 60)
        haloGlow.addColorStop(0, 'rgba(255, 252, 240, 0.15)')
        haloGlow.addColorStop(0.5, 'rgba(255, 248, 230, 0.03)')
        haloGlow.addColorStop(1, 'rgba(255, 245, 220, 0)')
        ctx.fillStyle = haloGlow
        ctx.beginPath()
        ctx.arc(spotX, spotTop, 60, 0, Math.PI * 2)
        ctx.fill()

        // Main light cone
        const spotGrad = ctx.createLinearGradient(spotX, spotTop, spotX, spotBottom)
        spotGrad.addColorStop(0, 'rgba(255, 252, 240, 0.14)')
        spotGrad.addColorStop(0.3, 'rgba(255, 248, 230, 0.07)')
        spotGrad.addColorStop(0.7, 'rgba(255, 245, 220, 0.03)')
        spotGrad.addColorStop(1, 'rgba(255, 245, 220, 0)')
        ctx.fillStyle = spotGrad
        ctx.beginPath()
        ctx.moveTo(spotX - 20, spotTop)
        ctx.lineTo(spotX + 20, spotTop)
        ctx.lineTo(spotX + 100, spotBottom)
        ctx.lineTo(spotX - 100, spotBottom)
        ctx.closePath()
        ctx.fill()

        // Surgical lamp fixture (detailed)
        ctx.fillStyle = 'rgba(140, 160, 180, 0.25)'
        ctx.beginPath()
        ctx.arc(spotX, spotTop, 24, 0, Math.PI * 2)
        ctx.fill()
        ctx.strokeStyle = 'rgba(180, 200, 220, 0.18)'
        ctx.lineWidth = 1.5
        ctx.beginPath()
        ctx.arc(spotX, spotTop, 24, 0, Math.PI * 2)
        ctx.stroke()
        // Inner ring
        ctx.strokeStyle = 'rgba(255, 250, 230, 0.12)'
        ctx.beginPath()
        ctx.arc(spotX, spotTop, 14, 0, Math.PI * 2)
        ctx.stroke()
        // Cross pattern
        ctx.strokeStyle = 'rgba(255, 250, 230, 0.15)'
        ctx.lineWidth = 1
        ctx.beginPath()
        ctx.moveTo(spotX - 10, spotTop)
        ctx.lineTo(spotX + 10, spotTop)
        ctx.moveTo(spotX, spotTop - 10)
        ctx.lineTo(spotX, spotTop + 10)
        ctx.stroke()
        // Arm connecting to ceiling
        ctx.strokeStyle = 'rgba(120, 140, 160, 0.15)'
        ctx.lineWidth = 2.5
        ctx.beginPath()
        ctx.moveTo(spotX, spotTop - 24)
        ctx.lineTo(spotX + 15, z4Top + 5)
        ctx.stroke()

        // Second smaller lamp (left)
        const spot2X = w * 0.33
        const spot2Top = z4Top + h * 0.18
        const spot2Bot = z4Top + h * 0.6
        const spot2Grad = ctx.createLinearGradient(spot2X, spot2Top, spot2X, spot2Bot)
        spot2Grad.addColorStop(0, 'rgba(220, 240, 255, 0.08)')
        spot2Grad.addColorStop(0.5, 'rgba(200, 220, 240, 0.03)')
        spot2Grad.addColorStop(1, 'rgba(180, 200, 220, 0)')
        ctx.fillStyle = spot2Grad
        ctx.beginPath()
        ctx.moveTo(spot2X - 12, spot2Top)
        ctx.lineTo(spot2X + 12, spot2Top)
        ctx.lineTo(spot2X + 55, spot2Bot)
        ctx.lineTo(spot2X - 55, spot2Bot)
        ctx.closePath()
        ctx.fill()
        ctx.fillStyle = 'rgba(140, 160, 180, 0.18)'
        ctx.beginPath()
        ctx.arc(spot2X, spot2Top, 15, 0, Math.PI * 2)
        ctx.fill()
        ctx.strokeStyle = 'rgba(120, 140, 160, 0.12)'
        ctx.lineWidth = 2
        ctx.beginPath()
        ctx.moveTo(spot2X, spot2Top - 15)
        ctx.lineTo(spot2X - 10, z4Top + 5)
        ctx.stroke()

        // Operating table (prominent, center)
        const tableX = w * 0.5
        const tableY = z4Top + h * 0.58
        const tableW = w * 0.2
        const tableH = h * 0.025
        // Table surface
        ctx.fillStyle = 'rgba(50, 70, 90, 0.6)'
        ctx.fillRect(tableX - tableW / 2, tableY, tableW, tableH)
        // Surface highlight
        const tableHighlight = ctx.createLinearGradient(0, tableY, 0, tableY + tableH)
        tableHighlight.addColorStop(0, 'rgba(100, 130, 160, 0.2)')
        tableHighlight.addColorStop(1, 'rgba(50, 70, 90, 0)')
        ctx.fillStyle = tableHighlight
        ctx.fillRect(tableX - tableW / 2, tableY, tableW, tableH)
        ctx.strokeStyle = 'rgba(100, 130, 160, 0.25)'
        ctx.lineWidth = 0.5
        ctx.strokeRect(tableX - tableW / 2, tableY, tableW, tableH)
        // Table legs
        ctx.fillStyle = 'rgba(60, 80, 100, 0.35)'
        ctx.fillRect(tableX - tableW * 0.3, tableY + tableH, 4, h * 0.04)
        ctx.fillRect(tableX + tableW * 0.3 - 4, tableY + tableH, 4, h * 0.04)
        // Central column
        ctx.fillRect(tableX - 3, tableY + tableH, 6, h * 0.04)
        // Pillow/head area
        ctx.fillStyle = 'rgba(70, 90, 110, 0.35)'
        ctx.fillRect(tableX - tableW / 2, tableY - 3, tableW * 0.12, tableH + 3)

        // Drape on patient (subtle shape)
        ctx.fillStyle = 'rgba(40, 70, 100, 0.15)'
        ctx.fillRect(tableX - tableW * 0.3, tableY - 6, tableW * 0.6, 6)

        // Tool tray (right side)
        const trayX = w * 0.66
        const trayY = z4Top + h * 0.52
        ctx.fillStyle = 'rgba(60, 80, 100, 0.35)'
        ctx.fillRect(trayX, trayY, 28, 2)
        ctx.strokeStyle = 'rgba(80, 100, 120, 0.2)'
        ctx.lineWidth = 1
        ctx.beginPath()
        ctx.moveTo(trayX + 14, trayY + 2)
        ctx.lineTo(trayX + 14, trayY + 20)
        ctx.stroke()
        // Tripod base
        ctx.beginPath()
        ctx.moveTo(trayX + 14, trayY + 20)
        ctx.lineTo(trayX + 6, trayY + 24)
        ctx.moveTo(trayX + 14, trayY + 20)
        ctx.lineTo(trayX + 22, trayY + 24)
        ctx.stroke()
        // Surgical instruments on tray
        ctx.strokeStyle = 'rgba(170, 190, 210, 0.25)'
        ctx.lineWidth = 0.6
        for (let i = 0; i < 5; i++) {
          ctx.beginPath()
          ctx.moveTo(trayX + 4 + i * 5, trayY - 1)
          ctx.lineTo(trayX + 4 + i * 5, trayY + 1.5)
          ctx.stroke()
        }

        // Second tool tray (left)
        const tray2X = w * 0.28
        const tray2Y = z4Top + h * 0.54
        ctx.fillStyle = 'rgba(60, 80, 100, 0.3)'
        ctx.fillRect(tray2X, tray2Y, 24, 2)
        ctx.strokeStyle = 'rgba(80, 100, 120, 0.15)'
        ctx.lineWidth = 1
        ctx.beginPath()
        ctx.moveTo(tray2X + 12, tray2Y + 2)
        ctx.lineTo(tray2X + 12, tray2Y + 18)
        ctx.stroke()

        // Anesthesia machine (left side)
        const aneX = w * 0.12
        const aneY = z4Top + h * 0.3
        ctx.fillStyle = 'rgba(18, 35, 50, 0.5)'
        ctx.fillRect(aneX, aneY, 28, 50)
        ctx.strokeStyle = 'rgba(0, 150, 170, 0.2)'
        ctx.lineWidth = 0.5
        ctx.strokeRect(aneX, aneY, 28, 50)
        // Screen
        ctx.fillStyle = 'rgba(0, 80, 100, 0.4)'
        ctx.fillRect(aneX + 3, aneY + 3, 22, 14)
        // Waveform on screen
        ctx.strokeStyle = 'rgba(0, 255, 180, 0.4)'
        ctx.lineWidth = 0.8
        ctx.beginPath()
        for (let i = 0; i < 20; i++) {
          const nx = i / 20
          const ey = aneY + 10 + Math.sin(nx * Math.PI * 2 + t * 1.5) * 4
          if (i === 0) ctx.moveTo(aneX + 4 + i, ey)
          else ctx.lineTo(aneX + 4 + i, ey)
        }
        ctx.stroke()
        // Dials
        ctx.fillStyle = 'rgba(100, 130, 160, 0.3)'
        ctx.beginPath()
        ctx.arc(aneX + 8, aneY + 28, 3, 0, Math.PI * 2)
        ctx.fill()
        ctx.beginPath()
        ctx.arc(aneX + 20, aneY + 28, 3, 0, Math.PI * 2)
        ctx.fill()
        // Gas canisters
        ctx.fillStyle = 'rgba(40, 60, 80, 0.4)'
        ctx.fillRect(aneX + 2, aneY + 50, 8, 18)
        ctx.fillRect(aneX + 14, aneY + 50, 8, 18)
        // Tubing to patient
        ctx.strokeStyle = 'rgba(120, 160, 190, 0.15)'
        ctx.lineWidth = 2
        ctx.beginPath()
        ctx.moveTo(aneX + 28, aneY + 20)
        ctx.quadraticCurveTo(aneX + 50, aneY + 15, tableX - tableW / 2, tableY - 4)
        ctx.stroke()

        // Surgeon silhouettes (around table)
        function drawSurgeon(sx, sy, sc, facing) {
          const alpha = 0.2
          const dir = facing === 'right' ? 1 : -1
          ctx.fillStyle = `rgba(15, 30, 45, ${alpha})`
          // Head (with cap)
          ctx.beginPath()
          ctx.arc(sx, sy - 22 * sc, 5 * sc, 0, Math.PI * 2)
          ctx.fill()
          // Cap
          ctx.fillStyle = `rgba(20, 50, 65, ${alpha})`
          ctx.beginPath()
          ctx.arc(sx, sy - 24 * sc, 5.5 * sc, Math.PI, 0)
          ctx.fill()
          // Body (gown)
          ctx.fillStyle = `rgba(15, 35, 50, ${alpha})`
          ctx.fillRect(sx - 6 * sc, sy - 17 * sc, 12 * sc, 20 * sc)
          // Arms extended toward table
          ctx.fillRect(sx + dir * 4 * sc, sy - 12 * sc, 10 * sc * dir, 3 * sc)
          // Mask
          ctx.fillStyle = `rgba(30, 60, 80, ${alpha * 0.8})`
          ctx.fillRect(sx - 3 * sc, sy - 20 * sc, 6 * sc, 3 * sc)
        }
        drawSurgeon(w * 0.38, z4Top + h * 0.56, 1.1, 'right')
        drawSurgeon(w * 0.62, z4Top + h * 0.55, 1.0, 'left')
        drawSurgeon(w * 0.44, z4Top + h * 0.48, 0.9, 'right')

        // Monitors in OR
        function drawORMonitor(mx, my, mw, mh, alpha, timeOff) {
          const scrGlow = ctx.createRadialGradient(mx + mw / 2, my + mh / 2, 0, mx + mw / 2, my + mh / 2, mw)
          scrGlow.addColorStop(0, `rgba(0, 160, 140, ${alpha * 0.06})`)
          scrGlow.addColorStop(1, 'rgba(0, 80, 60, 0)')
          ctx.fillStyle = scrGlow
          ctx.fillRect(mx - mw * 0.5, my - mh * 0.5, mw * 2, mh * 2)

          ctx.fillStyle = `rgba(6, 16, 26, ${alpha * 0.9})`
          ctx.fillRect(mx, my, mw, mh)
          ctx.strokeStyle = `rgba(0, 200, 180, ${alpha * 0.5})`
          ctx.lineWidth = 0.8
          ctx.strokeRect(mx, my, mw, mh)
          // EKG
          ctx.strokeStyle = `rgba(0, 255, 130, ${alpha})`
          ctx.lineWidth = 1
          ctx.beginPath()
          const cycleW = mw * 0.85
          const ekgSx = mx + mw * 0.075
          const midY = my + mh * 0.4
          for (let i = 0; i <= cycleW; i += 1.5) {
            const nx = ((i + timeOff * 35) % cycleW) / cycleW
            const ey = midY + (getEkgY(nx) - 0.5) * mh * 0.5
            if (i === 0) ctx.moveTo(ekgSx + i, ey)
            else ctx.lineTo(ekgSx + i, ey)
          }
          ctx.stroke()
          // Vitals text
          ctx.fillStyle = `rgba(0, 255, 130, ${alpha * 0.6})`
          ctx.font = `${Math.max(6, mh * 0.18)}px monospace`
          ctx.textAlign = 'right'
          const hr = 68 + Math.floor(Math.sin(t * 0.4 + timeOff) * 5)
          ctx.fillText(`HR ${hr}`, mx + mw - 3, my + mh * 0.85)
        }
        drawORMonitor(w * 0.82, z4Top + h * 0.2, 65, 38, 0.35, t + 0.5)
        drawORMonitor(w * 0.02, z4Top + h * 0.22, 55, 32, 0.3, t + 4)

        // Dark vignette edges (dramatic OR lighting)
        const vigW = w * 0.35
        const orVigL = ctx.createLinearGradient(0, z4Top, vigW, z4Top)
        orVigL.addColorStop(0, 'rgba(1, 3, 8, 0.8)')
        orVigL.addColorStop(1, 'rgba(1, 3, 8, 0)')
        ctx.fillStyle = orVigL
        ctx.fillRect(0, z4Top, vigW, h)

        const orVigR = ctx.createLinearGradient(w, z4Top, w - vigW, z4Top)
        orVigR.addColorStop(0, 'rgba(1, 3, 8, 0.8)')
        orVigR.addColorStop(1, 'rgba(1, 3, 8, 0)')
        ctx.fillStyle = orVigR
        ctx.fillRect(w - vigW, z4Top, vigW, h)

        // Bottom darkness
        const orVigBot = ctx.createLinearGradient(0, z4Bot - h * 0.15, 0, z4Bot)
        orVigBot.addColorStop(0, 'rgba(1, 3, 8, 0)')
        orVigBot.addColorStop(1, 'rgba(1, 3, 8, 0.6)')
        ctx.fillStyle = orVigBot
        ctx.fillRect(0, z4Bot - h * 0.15, w, h * 0.15)
      }

      // ════════════════════════════════════════════════════════════
      // ANIMATED WALKING FIGURES (zone-relative)
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

        // Zone Y position (in world coords)
        let baseY
        let zoneTop
        if (walker.zone === 1) {
          zoneTop = z1Top
          baseY = z1Top + h * (0.55 + walker.yOffset)
        } else if (walker.zone === 2) {
          zoneTop = z2Top
          baseY = z2Top + h * (0.6 + walker.yOffset)
        } else {
          zoneTop = z3Top
          baseY = z3Top + h * (0.5 + walker.yOffset)
        }

        // Skip if not visible
        if (!isVisible(baseY - 30, baseY + 20, cameraY, viewH)) continue

        const wx = walker.x * w
        const sc = walker.scale * (walker.zone === 1 ? 1.0 : walker.zone === 2 ? 0.9 : 0.75)
        const legSwing = Math.sin(t * 4 + walker.legPhase) * 4 * sc

        const walkerAlpha = walker.zone === 1 ? 0.4 : walker.zone === 2 ? 0.3 : 0.22

        ctx.save()
        ctx.globalAlpha = walkerAlpha

        // Shadow
        ctx.fillStyle = 'rgba(0, 0, 0, 0.1)'
        ctx.beginPath()
        ctx.ellipse(wx, baseY + 2 * sc, 7 * sc, 2 * sc, 0, 0, Math.PI * 2)
        ctx.fill()

        let bodyColor
        if (walker.zone === 1) bodyColor = 'rgba(28, 42, 62, 1)'
        else if (walker.zone === 2) bodyColor = 'rgba(22, 50, 60, 1)' // scrubs teal
        else bodyColor = 'rgba(18, 36, 50, 1)'

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
        ctx.fillStyle = 'rgba(55, 70, 90, 1)'
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
      // FLOATING PARTICLES (throughout world, zone-aware)
      // ════════════════════════════════════════════════════════════

      for (let i = 0; i < S.particles.length; i++) {
        const p = S.particles[i]
        p.y -= p.speed
        if (p.y < -0.02) {
          p.y = 5.02
          p.x = Math.random()
        }

        const worldPY = p.y * h // particles span 0 to 5h
        // Skip if not visible
        if (worldPY < cameraY - viewH * 0.3 || worldPY > cameraY + viewH * 1.3) continue

        const px = (p.x + Math.sin(t * p.wobbleSpeed + p.phase) * p.wobbleAmp) * w
        const py = worldPY
        const pulse = 0.5 + 0.5 * Math.sin(t * 1.3 + p.phase)
        const c = pColors[p.colorIdx]
        const alpha = 0.15 + pulse * 0.2

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
      // FULL-WIDTH EKG LINE (subtle, one per visible zone transition)
      // ════════════════════════════════════════════════════════════

      // Draw an EKG line at each zone boundary
      const ekgPositions = [z1Top, z2Top, z3Top, z4Top]
      for (const ekgWorldY of ekgPositions) {
        if (!isVisible(ekgWorldY - 20, ekgWorldY + 20, cameraY, viewH)) continue
        const ekgHeight = 18
        const cycleWidth = 200
        const ekgAlpha = 0.04
        const ekgOffset = (t * 40) % cycleWidth

        ctx.strokeStyle = `rgba(0, 255, 130, ${ekgAlpha})`
        ctx.lineWidth = 1
        ctx.beginPath()
        let first = true
        for (let x = -ekgOffset; x < w + cycleWidth; x += 1.5) {
          const cycleX = ((x + ekgOffset) % cycleWidth) / cycleWidth
          const ey = ekgWorldY + (getEkgY(cycleX) - 0.5) * ekgHeight * 2
          if (first) { ctx.moveTo(x, ey); first = false }
          else ctx.lineTo(x, ey)
        }
        ctx.stroke()
      }

      // Restore camera transform
      ctx.restore()

      // ════════════════════════════════════════════════════════════
      // SCREEN-SPACE OVERLAYS (not affected by camera)
      // ════════════════════════════════════════════════════════════

      // Scanlines (subtle retro feel)
      ctx.fillStyle = 'rgba(0, 200, 220, 0.005)'
      for (let sy = 0; sy < h; sy += 3) {
        ctx.fillRect(0, sy, w, 1)
      }

      // Vignette (screen-space)
      const vigAlpha = 0.35 + pct * 0.3
      const vigGrad = ctx.createRadialGradient(w * 0.5, h * 0.5, w * 0.2, w * 0.5, h * 0.5, w * 0.75)
      vigGrad.addColorStop(0, 'rgba(0, 0, 0, 0)')
      vigGrad.addColorStop(1, `rgba(0, 0, 0, ${vigAlpha})`)
      ctx.fillStyle = vigGrad
      ctx.fillRect(0, 0, w, h)

      // ── NEXT FRAME ──────────────────────────────────────────────
      animRef.current = requestAnimationFrame(draw)
    }

    // Helper for shooting stars init
    function rand(lo, hi) { return lo + Math.random() * (hi - lo) }

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
