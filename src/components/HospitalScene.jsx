// Hospital Scene - 5 discrete full-viewport scenes that crossfade based on depth
// Scene 1: Exterior (0-499) | Scene 2: Lobby (500-999) | Scene 3: Ward (1000-1499)
// Scene 4: ICU (1500-1999) | Scene 5: OR (2000-2500)
// Loads pixel art sprite sheets and draws them on canvas

import { useRef, useEffect } from 'react'

// -- Sprite config --
const SPRITES = {
  doctor: { src: '/sprites/labman_sheet_0.png', frameW: 32, frameH: 32 },
  nurse: { src: '/sprites/lablady_spritesheet_BOXED.png', frameW: 32, frameH: 32 },
  medItems: { src: '/sprites/medical_items_sheet.png', frameW: 32, frameH: 32 },
  medicinePack: { src: '/sprites/medicine_pack.png', frameW: 16, frameH: 16 },
  inside: { src: '/sprites/inside.png', frameW: 0, frameH: 0 },
  corridor: { src: '/sprites/TileSheet-Corridor.png', frameW: 32, frameH: 32 },
  bedrooms: { src: '/sprites/TileSheet-BedRooms.png', frameW: 32, frameH: 32 },
  doors: { src: '/sprites/TileSheet-Doors.png', frameW: 32, frameH: 64 },
  misc: { src: '/sprites/TileSheet-Misc.png', frameW: 32, frameH: 32 },
  labs: { src: '/sprites/TileSheet-Labs.png', frameW: 32, frameH: 32 },
  office: { src: '/sprites/TileSheet-ConsultationOffice.png', frameW: 32, frameH: 32 },
}

// -- EKG waveform data --
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

export default function HospitalScene({ depth = 0, maxDepth = 2500 }) {
  const canvasRef = useRef(null)
  const animRef = useRef(null)
  const stateRef = useRef(null)

  useEffect(() => {
    const canvas = canvasRef.current
    if (!canvas) return
    const ctx = canvas.getContext('2d')

    // == INIT STATE (once) ==
    if (!stateRef.current) {
      const rand = (lo, hi) => lo + Math.random() * (hi - lo)
      const randInt = (lo, hi) => Math.floor(rand(lo, hi))

      // Load all sprites
      const sprites = {}
      for (const [key, cfg] of Object.entries(SPRITES)) {
        const img = new Image()
        img.src = cfg.src
        sprites[key] = { img, loaded: false, ...cfg }
        img.onload = () => { sprites[key].loaded = true }
      }

      // -- Scene 1: Exterior --
      const stars = Array.from({ length: 120 }, () => ({
        x: Math.random(), y: Math.random(),
        r: rand(0.3, 1.8),
        twinkleSpeed: rand(0.6, 3.5),
        phase: Math.random() * Math.PI * 2,
        brightness: rand(0.3, 1.0),
      }))

      const skylineBuildings = []
      let bx = 0
      while (bx < 1) {
        const bw = rand(0.03, 0.08)
        const bh = rand(0.08, 0.28)
        skylineBuildings.push({
          x: bx, w: bw, h: bh,
          windowRows: randInt(2, 8),
          windowCols: randInt(1, 4),
          hue: randInt(200, 260),
        })
        bx += bw + rand(0.002, 0.015)
      }

      const hospitalWindows = Array.from({ length: 48 }, () => ({
        lit: Math.random() < 0.5,
        flickerPhase: Math.random() * Math.PI * 2,
        flickerSpeed: rand(1.0, 4.0),
      }))

      const streetLights = [0.12, 0.3, 0.7, 0.88].map(x => ({
        x, flickerPhase: Math.random() * Math.PI * 2,
      }))

      const ambulance = {
        x: rand(0.15, 0.25),
        flashPhase: Math.random() * Math.PI * 2,
      }

      // -- Scene 2: Lobby --
      const lobbyPeople = Array.from({ length: 8 }, (_, i) => ({
        x: rand(0.08, 0.92),
        sitting: i < 4,
        height: rand(0.8, 1.2),
        breathPhase: Math.random() * Math.PI * 2,
      }))

      const vendingGlow = { phase: Math.random() * Math.PI * 2 }

      const floatingMeds = Array.from({ length: 12 }, () => ({
        x: Math.random(), y: Math.random(),
        frameIdx: randInt(0, 4),
        speed: rand(0.0002, 0.0006),
        wobbleSpeed: rand(0.5, 1.5),
        wobbleAmp: rand(0.005, 0.015),
        phase: Math.random() * Math.PI * 2,
        size: rand(0.6, 1.2),
        rotation: Math.random() * Math.PI * 2,
        rotSpeed: rand(-0.3, 0.3),
      }))

      // -- Scene 3: Ward Corridor --
      const wardDoors = Array.from({ length: 8 }, (_, i) => ({
        side: i % 2 === 0 ? 'left' : 'right',
        depth: 0.1 + i * 0.1,
        open: Math.random() < 0.35,
        roomNum: 100 + randInt(1, 50),
        lightIntensity: rand(0.3, 0.9),
      }))

      const doctorWalkers = Array.from({ length: 4 }, (_, i) => ({
        x: rand(-0.2, 1.2),
        speed: rand(0.0003, 0.0008) * (i % 2 === 0 ? 1 : -1),
        goRight: i % 2 === 0,
        isNurse: i >= 2,
        scale: rand(0.8, 1.3),
        yPos: rand(0.55, 0.75),
        legPhase: Math.random() * Math.PI * 2,
        frameTime: 0,
        frameIdx: 0,
      }))

      // -- Scene 4: ICU --
      const icuMonitors = Array.from({ length: 6 }, (_, i) => ({
        x: rand(0.05, 0.95),
        y: rand(0.15, 0.55),
        w: rand(0.08, 0.15),
        h: rand(0.06, 0.1),
        timeOffset: rand(0, 10),
        traceColor: [
          [0, 255, 130], [255, 80, 80], [0, 200, 255],
          [255, 200, 0], [180, 100, 255], [0, 255, 200],
        ][i],
      }))

      const statusLights = Array.from({ length: 20 }, () => ({
        x: rand(0.03, 0.97),
        y: rand(0.1, 0.9),
        color: ['red', 'green', 'amber'][randInt(0, 3)],
        blinkSpeed: rand(0.5, 4.0),
        phase: Math.random() * Math.PI * 2,
        size: rand(1.5, 4.0),
      }))

      const icuCurtains = Array.from({ length: 5 }, (_, i) => ({
        x: 0.08 + i * 0.2,
        swayPhase: Math.random() * Math.PI * 2,
        swaySpeed: rand(0.3, 1.0),
        height: rand(0.5, 0.8),
      }))

      const ventilators = Array.from({ length: 3 }, (_, i) => ({
        x: 0.15 + i * 0.3,
        y: rand(0.55, 0.7),
        pulsePhase: Math.random() * Math.PI * 2,
      }))

      // -- Scene 5: OR --
      const surgicalTools = Array.from({ length: 8 }, (_, i) => ({
        x: 0.38 + i * 0.035,
        length: rand(8, 20),
        angle: rand(-0.15, 0.15),
        gleamPhase: Math.random() * Math.PI * 2,
      }))

      const orParticles = Array.from({ length: 15 }, () => ({
        x: 0.5 + (Math.random() - 0.5) * 0.3,
        y: rand(0.3, 0.8),
        speed: rand(0.0001, 0.0004),
        size: rand(0.5, 1.5),
        phase: Math.random() * Math.PI * 2,
      }))

      // -- Global particles --
      const particles = Array.from({ length: 25 }, () => ({
        x: Math.random(), y: Math.random(),
        speed: rand(0.0001, 0.0004),
        size: rand(0.6, 2.0),
        wobbleSpeed: rand(0.3, 1.2),
        wobbleAmp: rand(0.003, 0.01),
        phase: Math.random() * Math.PI * 2,
      }))

      stateRef.current = {
        sprites,
        stars, skylineBuildings, hospitalWindows, streetLights, ambulance,
        lobbyPeople, vendingGlow, floatingMeds,
        wardDoors, doctorWalkers,
        icuMonitors, statusLights, icuCurtains, ventilators,
        surgicalTools, orParticles,
        particles,
        time: 0, width: 0, height: 0, dpr: 1,
      }
    }

    const S = stateRef.current

    // == RESIZE ==
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

    // == SCENE BOUNDARIES ==
    const SCENE_SIZE = 500
    const CROSSFADE_RANGE = 40

    function getSceneOpacities(d) {
      const idx = Math.min(Math.floor(d / SCENE_SIZE), 4)
      const posInScene = d - idx * SCENE_SIZE
      const opacities = [0, 0, 0, 0, 0]

      if (posInScene < CROSSFADE_RANGE && idx > 0) {
        const blend = posInScene / CROSSFADE_RANGE
        opacities[idx - 1] = 1 - blend
        opacities[idx] = blend
      } else if (posInScene > SCENE_SIZE - CROSSFADE_RANGE && idx < 4) {
        const blend = (posInScene - (SCENE_SIZE - CROSSFADE_RANGE)) / CROSSFADE_RANGE
        opacities[idx] = 1 - blend
        opacities[idx + 1] = blend
      } else {
        opacities[idx] = 1
      }
      return opacities
    }

    // == SPRITE DRAW HELPER ==
    function drawSprite(sprite, sx, sy, sw, sh, dx, dy, dw, dh, sprAlpha) {
      if (!sprite.loaded) return
      ctx.save()
      ctx.globalAlpha = sprAlpha
      ctx.imageSmoothingEnabled = false
      ctx.drawImage(sprite.img, sx, sy, sw, sh, dx, dy, dw, dh)
      ctx.restore()
    }

    // ================================================================
    // SCENE 1: HOSPITAL EXTERIOR (cool blues / purples)
    // ================================================================
    function drawExterior(w, h, t, alpha) {
      ctx.save()
      ctx.globalAlpha = alpha

      // Night sky gradient
      const skyGrad = ctx.createLinearGradient(0, 0, 0, h)
      skyGrad.addColorStop(0, '#060818')
      skyGrad.addColorStop(0.2, '#0a1030')
      skyGrad.addColorStop(0.5, '#101840')
      skyGrad.addColorStop(0.75, '#141e48')
      skyGrad.addColorStop(1, '#0c1428')
      ctx.fillStyle = skyGrad
      ctx.fillRect(0, 0, w, h)

      // Atmospheric glow at horizon
      const auroraGrad = ctx.createLinearGradient(0, h * 0.5, 0, h * 0.75)
      auroraGrad.addColorStop(0, 'rgba(40, 20, 80, 0)')
      auroraGrad.addColorStop(0.5, 'rgba(30, 40, 90, 0.15)')
      auroraGrad.addColorStop(1, 'rgba(20, 30, 60, 0)')
      ctx.fillStyle = auroraGrad
      ctx.fillRect(0, h * 0.5, w, h * 0.25)

      // Moon
      const moonX = w * 0.78
      const moonY = h * 0.1
      const moonGlow = ctx.createRadialGradient(moonX, moonY, 0, moonX, moonY, h * 0.15)
      moonGlow.addColorStop(0, 'rgba(220, 230, 255, 0.35)')
      moonGlow.addColorStop(0.2, 'rgba(180, 200, 240, 0.12)')
      moonGlow.addColorStop(0.5, 'rgba(140, 160, 220, 0.04)')
      moonGlow.addColorStop(1, 'rgba(100, 140, 200, 0)')
      ctx.fillStyle = moonGlow
      ctx.beginPath()
      ctx.arc(moonX, moonY, h * 0.15, 0, Math.PI * 2)
      ctx.fill()
      ctx.fillStyle = 'rgba(230, 235, 255, 0.85)'
      ctx.beginPath()
      ctx.arc(moonX, moonY, 14, 0, Math.PI * 2)
      ctx.fill()
      ctx.fillStyle = '#060818'
      ctx.beginPath()
      ctx.arc(moonX + 5, moonY - 2, 11, 0, Math.PI * 2)
      ctx.fill()

      // Stars
      for (const star of S.stars) {
        const twinkle = 0.3 + 0.7 * (0.5 + 0.5 * Math.sin(t * star.twinkleSpeed + star.phase))
        const a = star.brightness * twinkle
        if (a < 0.05) continue
        ctx.fillStyle = `rgba(220, 230, 255, ${a})`
        ctx.beginPath()
        ctx.arc(star.x * w, star.y * h * 0.55, star.r, 0, Math.PI * 2)
        ctx.fill()
      }

      // City skyline
      const groundY = h * 0.72
      for (const b of S.skylineBuildings) {
        const bx2 = b.x * w
        const bw2 = b.w * w
        const bh2 = b.h * h * 0.6
        ctx.fillStyle = `hsla(${b.hue}, 30%, 8%, 0.95)`
        ctx.fillRect(bx2, groundY - bh2, bw2, bh2)
        const winW = 2
        const winH = 2
        for (let row = 0; row < b.windowRows; row++) {
          for (let col = 0; col < b.windowCols; col++) {
            const wx = bx2 + 3 + col * (bw2 / (b.windowCols + 1))
            const wy = groundY - bh2 + 4 + row * (bh2 / (b.windowRows + 1))
            const lit = ((Math.floor(wx * 7) + Math.floor(wy * 13)) % 5) > 2
            ctx.fillStyle = lit
              ? `rgba(255, 210, 120, ${0.3 + 0.1 * Math.sin(t * 0.5 + wx)})`
              : 'rgba(30, 40, 60, 0.4)'
            ctx.fillRect(wx, wy, winW, winH)
          }
        }
      }

      // Hospital building
      const hospLeft = w * 0.25
      const hospW = w * 0.50
      const hospTop = h * 0.28
      const hospH = groundY - hospTop

      ctx.fillStyle = '#0c1830'
      ctx.fillRect(hospLeft, hospTop, hospW, hospH)
      ctx.fillStyle = '#0a1428'
      ctx.fillRect(hospLeft - w * 0.08, hospTop + hospH * 0.35, w * 0.08, hospH * 0.65)
      ctx.fillRect(hospLeft + hospW, hospTop + hospH * 0.35, w * 0.08, hospH * 0.65)
      ctx.fillStyle = '#0e1c38'
      ctx.fillRect(hospLeft + hospW * 0.1, hospTop - h * 0.02, hospW * 0.8, h * 0.02)

      // Hospital windows
      const hwCols = 10
      const hwRows = 6
      const hwW = Math.max(4, hospW * 0.035)
      const hwH = Math.max(3, hospH * 0.06)
      const hwGapX = (hospW - hwCols * hwW) / (hwCols + 1)
      const hwGapY = (hospH * 0.85) / (hwRows + 1)

      for (let row = 0; row < hwRows; row++) {
        for (let col = 0; col < hwCols; col++) {
          const idx = (row * hwCols + col) % S.hospitalWindows.length
          const win = S.hospitalWindows[idx]
          const wx = hospLeft + hwGapX + col * (hwW + hwGapX)
          const wy = hospTop + h * 0.02 + hwGapY + row * (hwH + hwGapY)

          if (win.lit) {
            const flicker = 0.75 + 0.25 * Math.sin(t * win.flickerSpeed + win.flickerPhase)
            const glowR = Math.max(hwW, hwH) * 2.5
            const wGlow = ctx.createRadialGradient(wx + hwW / 2, wy + hwH / 2, 0, wx + hwW / 2, wy + hwH / 2, glowR)
            wGlow.addColorStop(0, `rgba(255, 200, 100, ${flicker * 0.1})`)
            wGlow.addColorStop(1, 'rgba(255, 200, 100, 0)')
            ctx.fillStyle = wGlow
            ctx.fillRect(wx - glowR, wy - glowR, glowR * 2 + hwW, glowR * 2 + hwH)
            ctx.fillStyle = `rgba(255, 195, 90, ${flicker * 0.8})`
            ctx.fillRect(wx, wy, hwW, hwH)
          } else {
            ctx.fillStyle = 'rgba(15, 25, 50, 0.7)'
            ctx.fillRect(wx, wy, hwW, hwH)
          }
        }
      }

      // Red cross on roof
      const crossX = w * 0.5
      const crossY = hospTop - h * 0.01
      const crossPulse = 0.7 + 0.3 * Math.sin(t * 1.5)
      ctx.fillStyle = `rgba(255, 50, 50, ${crossPulse})`
      ctx.fillRect(crossX - 3, crossY - 8, 6, 16)
      ctx.fillRect(crossX - 8, crossY - 3, 16, 6)
      const cGlow = ctx.createRadialGradient(crossX, crossY, 0, crossX, crossY, 25)
      cGlow.addColorStop(0, `rgba(255, 40, 40, ${crossPulse * 0.25})`)
      cGlow.addColorStop(1, 'rgba(255, 40, 40, 0)')
      ctx.fillStyle = cGlow
      ctx.beginPath()
      ctx.arc(crossX, crossY, 25, 0, Math.PI * 2)
      ctx.fill()

      // Emergency entrance canopy
      const canopyLeft = hospLeft + hospW * 0.35
      const canopyW = hospW * 0.3
      ctx.fillStyle = 'rgba(20, 35, 55, 0.9)'
      ctx.fillRect(canopyLeft, groundY - h * 0.03, canopyW, h * 0.03)
      ctx.fillStyle = 'rgba(255, 50, 50, 0.3)'
      ctx.fillRect(canopyLeft + canopyW * 0.3, groundY - h * 0.025, canopyW * 0.4, h * 0.015)

      // Street lights
      for (const light of S.streetLights) {
        const lx = light.x * w
        const ly = groundY
        ctx.fillStyle = 'rgba(60, 70, 80, 0.6)'
        ctx.fillRect(lx - 1.5, ly - h * 0.12, 3, h * 0.12)
        ctx.fillStyle = 'rgba(80, 90, 100, 0.5)'
        ctx.fillRect(lx - 6, ly - h * 0.12, 12, 4)
        const flk = 0.8 + 0.2 * Math.sin(t * 0.8 + light.flickerPhase)
        const lGlow = ctx.createRadialGradient(lx, ly - h * 0.1, 0, lx, ly, h * 0.15)
        lGlow.addColorStop(0, `rgba(255, 220, 140, ${0.2 * flk})`)
        lGlow.addColorStop(0.3, `rgba(255, 200, 100, ${0.08 * flk})`)
        lGlow.addColorStop(1, 'rgba(255, 180, 80, 0)')
        ctx.fillStyle = lGlow
        ctx.beginPath()
        ctx.arc(lx, ly - h * 0.05, h * 0.15, 0, Math.PI * 2)
        ctx.fill()
      }

      // Ambulance
      const ambX = S.ambulance.x * w
      const ambY = groundY + h * 0.01
      const ambW = w * 0.1
      const ambH = h * 0.06
      ctx.fillStyle = 'rgba(220, 220, 230, 0.7)'
      ctx.fillRect(ambX, ambY - ambH, ambW, ambH)
      ctx.fillStyle = 'rgba(200, 200, 210, 0.6)'
      ctx.fillRect(ambX + ambW, ambY - ambH * 0.7, ambW * 0.3, ambH * 0.7)
      ctx.fillStyle = 'rgba(255, 50, 50, 0.6)'
      ctx.fillRect(ambX + ambW * 0.05, ambY - ambH * 0.55, ambW * 0.6, ambH * 0.12)
      const acx = ambX + ambW * 0.35
      const acy = ambY - ambH * 0.5
      ctx.fillStyle = 'rgba(255, 50, 50, 0.7)'
      ctx.fillRect(acx - 2, acy - 4, 4, 8)
      ctx.fillRect(acx - 4, acy - 2, 8, 4)
      ctx.fillStyle = 'rgba(30, 30, 30, 0.7)'
      ctx.beginPath()
      ctx.arc(ambX + ambW * 0.2, ambY, 5, 0, Math.PI * 2)
      ctx.fill()
      ctx.beginPath()
      ctx.arc(ambX + ambW * 0.8, ambY, 5, 0, Math.PI * 2)
      ctx.fill()
      // Flashing lights
      const flash = Math.sin(t * 6 + S.ambulance.flashPhase)
      if (flash > 0) {
        ctx.fillStyle = `rgba(255, 50, 50, ${flash * 0.5})`
        ctx.beginPath()
        ctx.arc(ambX + ambW * 0.2, ambY - ambH - 3, 3, 0, Math.PI * 2)
        ctx.fill()
        const fGlow = ctx.createRadialGradient(ambX + ambW * 0.2, ambY - ambH - 3, 0, ambX + ambW * 0.2, ambY - ambH - 3, 30)
        fGlow.addColorStop(0, `rgba(255, 50, 50, ${flash * 0.15})`)
        fGlow.addColorStop(1, 'rgba(255, 50, 50, 0)')
        ctx.fillStyle = fGlow
        ctx.beginPath()
        ctx.arc(ambX + ambW * 0.2, ambY - ambH - 3, 30, 0, Math.PI * 2)
        ctx.fill()
      } else {
        ctx.fillStyle = `rgba(50, 100, 255, ${-flash * 0.5})`
        ctx.beginPath()
        ctx.arc(ambX + ambW * 0.5, ambY - ambH - 3, 3, 0, Math.PI * 2)
        ctx.fill()
        const fGlow = ctx.createRadialGradient(ambX + ambW * 0.5, ambY - ambH - 3, 0, ambX + ambW * 0.5, ambY - ambH - 3, 30)
        fGlow.addColorStop(0, `rgba(50, 100, 255, ${-flash * 0.15})`)
        fGlow.addColorStop(1, 'rgba(50, 100, 255, 0)')
        ctx.fillStyle = fGlow
        ctx.beginPath()
        ctx.arc(ambX + ambW * 0.5, ambY - ambH - 3, 30, 0, Math.PI * 2)
        ctx.fill()
      }

      // Ground / road
      ctx.fillStyle = '#080e1c'
      ctx.fillRect(0, groundY, w, h - groundY)
      ctx.strokeStyle = 'rgba(255, 220, 100, 0.12)'
      ctx.lineWidth = 2
      ctx.setLineDash([12, 8])
      ctx.beginPath()
      ctx.moveTo(0, groundY + h * 0.06)
      ctx.lineTo(w, groundY + h * 0.06)
      ctx.stroke()
      ctx.setLineDash([])
      ctx.fillStyle = 'rgba(25, 30, 45, 0.8)'
      ctx.fillRect(0, groundY, w, h * 0.025)

      // Floating particles (blue/white)
      for (const p of S.particles) {
        const px = (p.x + Math.sin(t * p.wobbleSpeed + p.phase) * p.wobbleAmp) * w
        const py = p.y * h
        const pulse = 0.4 + 0.6 * Math.sin(t * 1.2 + p.phase)
        ctx.fillStyle = `rgba(150, 180, 255, ${0.15 * pulse})`
        ctx.beginPath()
        ctx.arc(px, py, p.size, 0, Math.PI * 2)
        ctx.fill()
        const pGlow = ctx.createRadialGradient(px, py, 0, px, py, p.size * 4)
        pGlow.addColorStop(0, `rgba(150, 180, 255, ${0.06 * pulse})`)
        pGlow.addColorStop(1, 'rgba(150, 180, 255, 0)')
        ctx.fillStyle = pGlow
        ctx.beginPath()
        ctx.arc(px, py, p.size * 4, 0, Math.PI * 2)
        ctx.fill()
      }

      // inside.png as subtle reference in entrance
      const insideSprite = S.sprites.inside
      if (insideSprite.loaded) {
        ctx.save()
        ctx.globalAlpha = 0.15
        ctx.imageSmoothingEnabled = false
        const iw = canopyW * 0.6
        const ih = iw * (insideSprite.img.height / insideSprite.img.width)
        ctx.drawImage(insideSprite.img, canopyLeft + canopyW * 0.2, groundY - h * 0.025 - ih * 0.5, iw, ih)
        ctx.restore()
      }

      // Scanlines
      ctx.fillStyle = 'rgba(100, 150, 255, 0.008)'
      for (let sy = 0; sy < h; sy += 3) {
        ctx.fillRect(0, sy, w, 1)
      }

      // Vignette
      const vig = ctx.createRadialGradient(w * 0.5, h * 0.45, w * 0.15, w * 0.5, h * 0.45, w * 0.75)
      vig.addColorStop(0, 'rgba(0, 0, 0, 0)')
      vig.addColorStop(1, 'rgba(0, 0, 0, 0.5)')
      ctx.fillStyle = vig
      ctx.fillRect(0, 0, w, h)

      ctx.restore()
    }

    // ================================================================
    // SCENE 2: LOBBY (warm amber / yellows)
    // ================================================================
    function drawLobby(w, h, t, alpha) {
      ctx.save()
      ctx.globalAlpha = alpha

      // Warm background
      const bg = ctx.createLinearGradient(0, 0, 0, h)
      bg.addColorStop(0, '#1a1510')
      bg.addColorStop(0.3, '#1e1a14')
      bg.addColorStop(0.6, '#1c1812')
      bg.addColorStop(1, '#14110c')
      ctx.fillStyle = bg
      ctx.fillRect(0, 0, w, h)

      // Ceiling
      ctx.fillStyle = '#1f1c16'
      ctx.fillRect(0, 0, w, h * 0.12)
      ctx.fillStyle = 'rgba(180, 160, 120, 0.08)'
      ctx.fillRect(0, h * 0.12, w, 3)

      // Floor
      const floorY = h * 0.78
      ctx.fillStyle = '#16130e'
      ctx.fillRect(0, floorY, w, h - floorY)
      ctx.strokeStyle = 'rgba(140, 120, 80, 0.04)'
      ctx.lineWidth = 0.5
      for (let fx = 0; fx < w; fx += 40) {
        ctx.beginPath()
        ctx.moveTo(fx, floorY)
        ctx.lineTo(fx, h)
        ctx.stroke()
      }
      for (let fy = floorY; fy < h; fy += 40) {
        ctx.beginPath()
        ctx.moveTo(0, fy)
        ctx.lineTo(w, fy)
        ctx.stroke()
      }
      const sheen = ctx.createLinearGradient(0, floorY, 0, floorY + h * 0.05)
      sheen.addColorStop(0, 'rgba(255, 230, 180, 0.03)')
      sheen.addColorStop(1, 'rgba(255, 220, 160, 0)')
      ctx.fillStyle = sheen
      ctx.fillRect(0, floorY, w, h * 0.05)

      // Warm overhead fluorescent lights
      for (let i = 0; i < 6; i++) {
        const lx = w * (0.08 + i * 0.17)
        const ly = h * 0.08
        ctx.fillStyle = 'rgba(220, 210, 180, 0.12)'
        ctx.fillRect(lx - 20, ly, 40, 3)
        const lGlow = ctx.createRadialGradient(lx, ly, 0, lx, ly + h * 0.15, h * 0.3)
        lGlow.addColorStop(0, 'rgba(255, 230, 170, 0.1)')
        lGlow.addColorStop(0.3, 'rgba(255, 220, 150, 0.04)')
        lGlow.addColorStop(1, 'rgba(255, 210, 130, 0)')
        ctx.fillStyle = lGlow
        ctx.beginPath()
        ctx.arc(lx, ly + h * 0.1, h * 0.3, 0, Math.PI * 2)
        ctx.fill()
      }

      // Back wall
      ctx.fillStyle = '#1b1812'
      ctx.fillRect(0, h * 0.12, w, h * 0.03)

      // Reception counter
      const deskLeft = w * 0.3
      const deskW = w * 0.4
      const deskY = h * 0.52
      const deskH = h * 0.08
      const deskGrad = ctx.createLinearGradient(deskLeft, deskY, deskLeft, deskY + deskH)
      deskGrad.addColorStop(0, 'rgba(100, 80, 50, 0.6)')
      deskGrad.addColorStop(1, 'rgba(70, 55, 35, 0.6)')
      ctx.fillStyle = deskGrad
      ctx.fillRect(deskLeft, deskY, deskW, deskH)
      ctx.fillStyle = 'rgba(140, 115, 75, 0.5)'
      ctx.fillRect(deskLeft - 5, deskY - 3, deskW + 10, 5)
      ctx.fillStyle = 'rgba(200, 180, 140, 0.08)'
      ctx.fillRect(deskLeft, deskY - 3, deskW, 1)

      // Computer monitor
      const monX = deskLeft + deskW * 0.6
      const monY = deskY - h * 0.06
      ctx.fillStyle = 'rgba(20, 25, 30, 0.8)'
      ctx.fillRect(monX, monY, 22, 18)
      ctx.fillStyle = `rgba(60, 180, 200, ${0.2 + 0.05 * Math.sin(t * 0.8)})`
      ctx.fillRect(monX + 2, monY + 2, 18, 14)
      ctx.fillStyle = 'rgba(60, 60, 60, 0.5)'
      ctx.fillRect(monX + 8, monY + 18, 6, 5)
      ctx.fillRect(monX + 4, deskY - 4, 14, 2)

      // Desk lamp
      ctx.strokeStyle = 'rgba(120, 100, 70, 0.4)'
      ctx.lineWidth = 2
      ctx.beginPath()
      ctx.moveTo(deskLeft + deskW * 0.15, deskY - 3)
      ctx.lineTo(deskLeft + deskW * 0.13, deskY - h * 0.05)
      ctx.lineTo(deskLeft + deskW * 0.17, deskY - h * 0.07)
      ctx.stroke()
      const lampGlow = ctx.createRadialGradient(
        deskLeft + deskW * 0.15, deskY - h * 0.04, 0,
        deskLeft + deskW * 0.15, deskY, h * 0.06
      )
      lampGlow.addColorStop(0, 'rgba(255, 220, 150, 0.08)')
      lampGlow.addColorStop(1, 'rgba(255, 200, 100, 0)')
      ctx.fillStyle = lampGlow
      ctx.beginPath()
      ctx.arc(deskLeft + deskW * 0.15, deskY - h * 0.02, h * 0.06, 0, Math.PI * 2)
      ctx.fill()

      // Waiting chairs (left side)
      const chairY = h * 0.68
      for (let i = 0; i < 5; i++) {
        const cx = w * 0.05 + i * w * 0.045
        ctx.fillStyle = 'rgba(70, 90, 120, 0.4)'
        ctx.fillRect(cx, chairY, 14, 6)
        ctx.fillStyle = 'rgba(60, 80, 110, 0.35)'
        ctx.fillRect(cx, chairY - 14, 14, 14)
        ctx.fillStyle = 'rgba(90, 90, 90, 0.3)'
        ctx.fillRect(cx + 1, chairY + 6, 2, 8)
        ctx.fillRect(cx + 11, chairY + 6, 2, 8)
      }
      // Right side chairs
      for (let i = 0; i < 4; i++) {
        const cx = w * 0.78 + i * w * 0.045
        ctx.fillStyle = 'rgba(70, 90, 120, 0.4)'
        ctx.fillRect(cx, chairY + 4, 14, 6)
        ctx.fillStyle = 'rgba(60, 80, 110, 0.35)'
        ctx.fillRect(cx, chairY + 4 - 14, 14, 14)
        ctx.fillStyle = 'rgba(90, 90, 90, 0.3)'
        ctx.fillRect(cx + 1, chairY + 10, 2, 8)
        ctx.fillRect(cx + 11, chairY + 10, 2, 8)
      }

      // Potted plants
      function drawPlant(px, py, size) {
        ctx.fillStyle = 'rgba(120, 70, 40, 0.5)'
        ctx.beginPath()
        ctx.moveTo(px - 7 * size, py)
        ctx.lineTo(px + 7 * size, py)
        ctx.lineTo(px + 5 * size, py + 14 * size)
        ctx.lineTo(px - 5 * size, py + 14 * size)
        ctx.closePath()
        ctx.fill()
        ctx.fillStyle = 'rgba(40, 100, 50, 0.45)'
        ctx.beginPath()
        ctx.arc(px, py - 8 * size, 10 * size, 0, Math.PI * 2)
        ctx.fill()
        ctx.fillStyle = 'rgba(50, 120, 60, 0.35)'
        ctx.beginPath()
        ctx.arc(px - 6 * size, py - 12 * size, 7 * size, 0, Math.PI * 2)
        ctx.fill()
        ctx.beginPath()
        ctx.arc(px + 6 * size, py - 10 * size, 7 * size, 0, Math.PI * 2)
        ctx.fill()
      }
      drawPlant(w * 0.04, h * 0.60, 1.2)
      drawPlant(w * 0.96, h * 0.62, 1.0)
      drawPlant(w * 0.28, h * 0.70, 0.8)

      // Vending machine
      const vmX = w * 0.90
      const vmY = h * 0.35
      const vmW = w * 0.06
      const vmH = h * 0.25
      ctx.fillStyle = 'rgba(40, 50, 60, 0.7)'
      ctx.fillRect(vmX, vmY, vmW, vmH)
      const vmPulse = 0.6 + 0.4 * Math.sin(t * 0.5 + S.vendingGlow.phase)
      ctx.fillStyle = `rgba(100, 200, 255, ${0.12 * vmPulse})`
      ctx.fillRect(vmX + 3, vmY + 3, vmW - 6, vmH * 0.3)
      ctx.fillStyle = 'rgba(10, 15, 20, 0.6)'
      ctx.fillRect(vmX + vmW * 0.3, vmY + vmH * 0.8, vmW * 0.4, vmH * 0.08)
      const vmGlow = ctx.createRadialGradient(vmX + vmW / 2, vmY + vmH, 0, vmX + vmW / 2, vmY + vmH + 20, 40)
      vmGlow.addColorStop(0, `rgba(100, 200, 255, ${0.04 * vmPulse})`)
      vmGlow.addColorStop(1, 'rgba(100, 200, 255, 0)')
      ctx.fillStyle = vmGlow
      ctx.beginPath()
      ctx.arc(vmX + vmW / 2, vmY + vmH + 10, 40, 0, Math.PI * 2)
      ctx.fill()

      // People silhouettes
      for (const p of S.lobbyPeople) {
        const px = p.x * w
        const baseY = p.sitting ? chairY - 2 : h * 0.64
        const sc = p.height * 0.9
        const breathe = Math.sin(t * 0.8 + p.breathPhase) * 0.5

        ctx.fillStyle = 'rgba(20, 18, 15, 0.55)'
        if (p.sitting) {
          ctx.beginPath()
          ctx.arc(px, baseY - 12 * sc, 5 * sc, 0, Math.PI * 2)
          ctx.fill()
          ctx.fillRect(px - 5 * sc, baseY - 7 * sc, 10 * sc, 12 * sc + breathe)
        } else {
          ctx.beginPath()
          ctx.arc(px, baseY - 24 * sc, 5 * sc, 0, Math.PI * 2)
          ctx.fill()
          ctx.fillRect(px - 5 * sc, baseY - 19 * sc, 10 * sc, 22 * sc)
          ctx.fillRect(px - 4 * sc, baseY + 3 * sc, 3 * sc, 10 * sc)
          ctx.fillRect(px + 1 * sc, baseY + 3 * sc, 3 * sc, 10 * sc)
        }
      }

      // Floating medicine sprites
      const medSprite = S.sprites.medicinePack
      if (medSprite.loaded) {
        for (const med of S.floatingMeds) {
          const mx = (med.x + Math.sin(t * med.wobbleSpeed + med.phase) * med.wobbleAmp) * w
          const my = med.y * h
          const drawSize = 20 * med.size

          ctx.save()
          ctx.globalAlpha = 0.25 + 0.1 * Math.sin(t + med.phase)
          ctx.translate(mx, my)
          ctx.rotate(med.rotation + t * med.rotSpeed)
          ctx.imageSmoothingEnabled = false
          const frameX = med.frameIdx * 16
          ctx.drawImage(medSprite.img, frameX, 0, 16, 16, -drawSize / 2, -drawSize / 2, drawSize, drawSize)
          ctx.restore()
        }
      }

      // Scanlines
      ctx.fillStyle = 'rgba(255, 200, 100, 0.005)'
      for (let sy = 0; sy < h; sy += 3) {
        ctx.fillRect(0, sy, w, 1)
      }

      // Warm vignette
      const vig = ctx.createRadialGradient(w * 0.5, h * 0.45, w * 0.2, w * 0.5, h * 0.45, w * 0.7)
      vig.addColorStop(0, 'rgba(0, 0, 0, 0)')
      vig.addColorStop(1, 'rgba(10, 6, 2, 0.55)')
      ctx.fillStyle = vig
      ctx.fillRect(0, 0, w, h)

      ctx.restore()
    }

    // ================================================================
    // SCENE 3: WARD CORRIDOR (teal / green)
    // ================================================================
    function drawWard(w, h, t, alpha) {
      ctx.save()
      ctx.globalAlpha = alpha

      // Teal corridor background
      const bg = ctx.createLinearGradient(0, 0, 0, h)
      bg.addColorStop(0, '#0a1a1e')
      bg.addColorStop(0.3, '#0c2028')
      bg.addColorStop(0.7, '#0e2430')
      bg.addColorStop(1, '#081820')
      ctx.fillStyle = bg
      ctx.fillRect(0, 0, w, h)

      // Perspective corridor
      const vanishX = w * 0.5
      const vanishY = h * 0.32

      // Ceiling
      ctx.fillStyle = '#0c1c24'
      ctx.beginPath()
      ctx.moveTo(0, 0)
      ctx.lineTo(w, 0)
      ctx.lineTo(vanishX + w * 0.18, vanishY)
      ctx.lineTo(vanishX - w * 0.18, vanishY)
      ctx.closePath()
      ctx.fill()

      // Floor
      ctx.fillStyle = '#081418'
      ctx.beginPath()
      ctx.moveTo(0, h)
      ctx.lineTo(w, h)
      ctx.lineTo(vanishX + w * 0.18, vanishY + h * 0.36)
      ctx.lineTo(vanishX - w * 0.18, vanishY + h * 0.36)
      ctx.closePath()
      ctx.fill()

      // Left wall
      ctx.fillStyle = '#0b1e26'
      ctx.beginPath()
      ctx.moveTo(0, 0)
      ctx.lineTo(vanishX - w * 0.18, vanishY)
      ctx.lineTo(vanishX - w * 0.18, vanishY + h * 0.36)
      ctx.lineTo(0, h)
      ctx.closePath()
      ctx.fill()

      // Right wall
      ctx.fillStyle = '#0d2028'
      ctx.beginPath()
      ctx.moveTo(w, 0)
      ctx.lineTo(vanishX + w * 0.18, vanishY)
      ctx.lineTo(vanishX + w * 0.18, vanishY + h * 0.36)
      ctx.lineTo(w, h)
      ctx.closePath()
      ctx.fill()

      // Wall baseboard (teal accent)
      ctx.strokeStyle = 'rgba(0, 180, 170, 0.08)'
      ctx.lineWidth = 2
      ctx.beginPath()
      ctx.moveTo(0, h * 0.65)
      ctx.lineTo(vanishX - w * 0.18, vanishY + h * 0.28)
      ctx.stroke()
      ctx.beginPath()
      ctx.moveTo(w, h * 0.65)
      ctx.lineTo(vanishX + w * 0.18, vanishY + h * 0.28)
      ctx.stroke()

      // Floor tile lines (perspective)
      ctx.strokeStyle = 'rgba(0, 160, 160, 0.03)'
      ctx.lineWidth = 0.5
      for (let i = 0; i < 12; i++) {
        const frac = i / 12
        const y = vanishY + h * 0.36 + frac * (h - vanishY - h * 0.36)
        const spread = frac
        const leftX = (vanishX - w * 0.18) - spread * (vanishX - w * 0.18)
        const rightX = (vanishX + w * 0.18) + spread * (w - vanishX - w * 0.18)
        ctx.beginPath()
        ctx.moveTo(leftX, y)
        ctx.lineTo(rightX, y)
        ctx.stroke()
      }
      for (let i = -3; i <= 3; i++) {
        const lineX = vanishX + i * w * 0.06
        ctx.beginPath()
        ctx.moveTo(lineX, vanishY + h * 0.36)
        ctx.lineTo(lineX + i * w * 0.3, h)
        ctx.stroke()
      }

      // Ceiling lights (receding)
      for (let i = 0; i < 6; i++) {
        const frac = i / 6
        const ly = vanishY - h * 0.05 + frac * (h * 0.05)
        const lScale = 0.3 + frac * 0.7
        const fixtureW = 30 * lScale
        ctx.fillStyle = `rgba(200, 230, 220, ${0.08 * (1 - frac * 0.5)})`
        ctx.fillRect(vanishX - fixtureW / 2, ly, fixtureW, 2 * lScale)
        const glow = ctx.createRadialGradient(vanishX, ly + 5 * lScale, 0, vanishX, ly + 30 * lScale, 50 * lScale)
        glow.addColorStop(0, `rgba(200, 240, 230, ${0.06 * (1 - frac * 0.4)})`)
        glow.addColorStop(1, 'rgba(200, 240, 230, 0)')
        ctx.fillStyle = glow
        ctx.beginPath()
        ctx.arc(vanishX, ly + 20 * lScale, 50 * lScale, 0, Math.PI * 2)
        ctx.fill()
      }

      // Doors along corridor
      for (const door of S.wardDoors) {
        const frac = door.depth
        const perspective = 1 - frac * 0.6

        const doorH = h * 0.12 * perspective
        const doorW = w * 0.04 * perspective
        const dy = vanishY + frac * (h * 0.5 - vanishY) - doorH * 0.3

        let dx
        if (door.side === 'left') {
          const wallX = vanishX - w * 0.18 - frac * (vanishX - w * 0.18) * 0.3
          dx = wallX - doorW * 0.5 - frac * w * 0.1
        } else {
          const wallX = vanishX + w * 0.18 + frac * (w - vanishX - w * 0.18) * 0.3
          dx = wallX + doorW * 0.5 + frac * w * 0.05
        }

        if (door.open) {
          const spillGlow = ctx.createRadialGradient(
            dx + doorW / 2, dy + doorH / 2, 0,
            dx + doorW / 2, dy + doorH / 2, doorH * 2
          )
          spillGlow.addColorStop(0, `rgba(255, 220, 150, ${0.06 * door.lightIntensity})`)
          spillGlow.addColorStop(1, 'rgba(255, 220, 150, 0)')
          ctx.fillStyle = spillGlow
          ctx.beginPath()
          ctx.arc(dx + doorW / 2, dy + doorH / 2, doorH * 2, 0, Math.PI * 2)
          ctx.fill()
          ctx.fillStyle = `rgba(255, 210, 140, ${0.15 * door.lightIntensity})`
          ctx.fillRect(dx, dy, doorW, doorH)
        } else {
          ctx.fillStyle = 'rgba(25, 45, 55, 0.6)'
          ctx.fillRect(dx, dy, doorW, doorH)
          ctx.strokeStyle = 'rgba(0, 150, 150, 0.12)'
          ctx.lineWidth = 0.5
          ctx.strokeRect(dx, dy, doorW, doorH)
          ctx.fillStyle = 'rgba(140, 180, 170, 0.25)'
          ctx.beginPath()
          ctx.arc(dx + doorW - 3 * perspective, dy + doorH * 0.5, 1.5 * perspective, 0, Math.PI * 2)
          ctx.fill()
        }

        // Room number
        if (perspective > 0.5) {
          ctx.fillStyle = `rgba(0, 200, 180, ${0.15 * perspective})`
          ctx.font = `${Math.max(6, 9 * perspective)}px monospace`
          ctx.fillText(door.roomNum, dx + 2, dy - 3)
        }
      }

      // Door sprites near foreground
      const doorSprite = S.sprites.doors
      if (doorSprite.loaded) {
        drawSprite(doorSprite, 0, 0, 32, 64, w * 0.02, h * 0.35, 48, 96, 0.15)
        drawSprite(doorSprite, 0, 0, 32, 64, w * 0.92, h * 0.32, 48, 96, 0.12)
      }

      // EKG monitor on left wall
      const ekgX = w * 0.05
      const ekgMonY = h * 0.22
      const ekgW = w * 0.12
      const ekgH = h * 0.08
      ctx.fillStyle = 'rgba(8, 20, 25, 0.8)'
      ctx.fillRect(ekgX, ekgMonY, ekgW, ekgH)
      ctx.strokeStyle = 'rgba(0, 200, 170, 0.2)'
      ctx.lineWidth = 1
      ctx.strokeRect(ekgX, ekgMonY, ekgW, ekgH)
      ctx.strokeStyle = 'rgba(0, 255, 140, 0.8)'
      ctx.lineWidth = 1.5
      ctx.beginPath()
      const cycleW = ekgW * 0.9
      for (let i = 0; i <= cycleW; i += 1.5) {
        const nx = ((i + t * 40) % cycleW) / cycleW
        const ey = ekgMonY + ekgH * 0.5 + (getEkgY(nx) - 0.5) * ekgH * 0.7
        if (i === 0) ctx.moveTo(ekgX + ekgW * 0.05 + i, ey)
        else ctx.lineTo(ekgX + ekgW * 0.05 + i, ey)
      }
      ctx.stroke()
      ctx.fillStyle = `rgba(0, 255, 100, ${0.5 + 0.5 * Math.sin(t * 2)})`
      ctx.beginPath()
      ctx.arc(ekgX + ekgW - 5, ekgMonY + 5, 2, 0, Math.PI * 2)
      ctx.fill()

      // Second monitor (right wall)
      const ekgX2r = w * 0.84
      const ekgY2r = h * 0.25
      const ekgWr = w * 0.1
      const ekgHr = h * 0.06
      ctx.fillStyle = 'rgba(8, 20, 25, 0.7)'
      ctx.fillRect(ekgX2r, ekgY2r, ekgWr, ekgHr)
      ctx.strokeStyle = 'rgba(0, 200, 170, 0.15)'
      ctx.lineWidth = 0.8
      ctx.strokeRect(ekgX2r, ekgY2r, ekgWr, ekgHr)
      ctx.strokeStyle = 'rgba(0, 255, 140, 0.6)'
      ctx.lineWidth = 1
      ctx.beginPath()
      for (let i = 0; i <= ekgWr * 0.85; i += 1.5) {
        const nx = ((i + t * 30 + 100) % (ekgWr * 0.85)) / (ekgWr * 0.85)
        const ey = ekgY2r + ekgHr * 0.5 + (getEkgY(nx) - 0.5) * ekgHr * 0.6
        if (i === 0) ctx.moveTo(ekgX2r + ekgWr * 0.075 + i, ey)
        else ctx.lineTo(ekgX2r + ekgWr * 0.075 + i, ey)
      }
      ctx.stroke()

      // Walking doctor/nurse sprites
      const doctorSprite = S.sprites.doctor
      const nurseSprite = S.sprites.nurse
      for (const walker of S.doctorWalkers) {
        const sprite = walker.isNurse ? nurseSprite : doctorSprite
        if (sprite.loaded) {
          const wx = walker.x * w
          const wy = walker.yPos * h
          const drawScale = walker.scale * 2.5
          const drawW2 = sprite.frameW * drawScale
          const drawH2 = sprite.frameH * drawScale

          walker.frameTime += 0.016
          if (walker.frameTime > 0.2) {
            walker.frameTime = 0
            walker.frameIdx = (walker.frameIdx + 1) % 4
          }

          const sx = walker.frameIdx * sprite.frameW
          const walkRow = walker.goRight ? 16 : 17
          const sy = walkRow * sprite.frameH

          // Shadow
          ctx.fillStyle = 'rgba(0, 0, 0, 0.15)'
          ctx.beginPath()
          ctx.ellipse(wx, wy + drawH2 * 0.5, drawW2 * 0.4, drawW2 * 0.1, 0, 0, Math.PI * 2)
          ctx.fill()

          drawSprite(sprite, sx, sy, sprite.frameW, sprite.frameH, wx - drawW2 / 2, wy - drawH2 * 0.3, drawW2, drawH2, 0.5)
        }
      }

      // Hospital bed sprite through open doors
      const bedSprite = S.sprites.bedrooms
      if (bedSprite.loaded) {
        drawSprite(bedSprite, 0, 0, 64, 48, w * 0.03, h * 0.42, 56, 42, 0.12)
        drawSprite(bedSprite, 0, 0, 64, 48, w * 0.88, h * 0.46, 48, 36, 0.10)
      }

      // IV stands
      function drawIV(ix, iy, sc, ivAlpha) {
        ctx.strokeStyle = `rgba(0, 180, 170, ${ivAlpha})`
        ctx.lineWidth = 1
        ctx.beginPath()
        ctx.moveTo(ix, iy)
        ctx.lineTo(ix, iy - 40 * sc)
        ctx.stroke()
        ctx.beginPath()
        ctx.moveTo(ix - 5 * sc, iy - 40 * sc)
        ctx.lineTo(ix + 5 * sc, iy - 40 * sc)
        ctx.stroke()
        ctx.fillStyle = `rgba(100, 200, 200, ${ivAlpha * 0.4})`
        ctx.fillRect(ix + 2 * sc, iy - 38 * sc, 6 * sc, 10 * sc)
        ctx.strokeStyle = `rgba(0, 180, 170, ${ivAlpha * 0.3})`
        ctx.beginPath()
        ctx.moveTo(ix + 5 * sc, iy - 28 * sc)
        ctx.lineTo(ix + 5 * sc, iy - 14 * sc)
        ctx.stroke()
        ctx.strokeStyle = `rgba(0, 180, 170, ${ivAlpha * 0.4})`
        ctx.beginPath()
        ctx.moveTo(ix, iy)
        ctx.lineTo(ix - 6 * sc, iy + 3 * sc)
        ctx.moveTo(ix, iy)
        ctx.lineTo(ix + 6 * sc, iy + 3 * sc)
        ctx.stroke()
      }
      drawIV(w * 0.08, h * 0.60, 0.9, 0.2)
      drawIV(w * 0.92, h * 0.55, 0.8, 0.15)

      // Particles (teal)
      for (const p of S.particles) {
        const px = (p.x + Math.sin(t * p.wobbleSpeed + p.phase) * p.wobbleAmp) * w
        const py = p.y * h
        const pulse = 0.4 + 0.6 * Math.sin(t * 1.2 + p.phase)
        ctx.fillStyle = `rgba(0, 200, 180, ${0.12 * pulse})`
        ctx.beginPath()
        ctx.arc(px, py, p.size, 0, Math.PI * 2)
        ctx.fill()
      }

      // Scanlines
      ctx.fillStyle = 'rgba(0, 200, 180, 0.006)'
      for (let sy = 0; sy < h; sy += 3) {
        ctx.fillRect(0, sy, w, 1)
      }

      // Vignette
      const vig = ctx.createRadialGradient(w * 0.5, h * 0.4, w * 0.15, w * 0.5, h * 0.4, w * 0.7)
      vig.addColorStop(0, 'rgba(0, 0, 0, 0)')
      vig.addColorStop(1, 'rgba(2, 10, 12, 0.6)')
      ctx.fillStyle = vig
      ctx.fillRect(0, 0, w, h)

      ctx.restore()
    }

    // ================================================================
    // SCENE 4: ICU (dark blue / red)
    // ================================================================
    function drawICU(w, h, t, alpha) {
      ctx.save()
      ctx.globalAlpha = alpha

      // Very dark background
      const bg = ctx.createLinearGradient(0, 0, 0, h)
      bg.addColorStop(0, '#060a14')
      bg.addColorStop(0.4, '#080e18')
      bg.addColorStop(0.7, '#0a0c16')
      bg.addColorStop(1, '#040810')
      ctx.fillStyle = bg
      ctx.fillRect(0, 0, w, h)

      // Subtle red ambient
      const redAmbient = ctx.createRadialGradient(w * 0.5, h * 0.5, 0, w * 0.5, h * 0.5, w * 0.6)
      redAmbient.addColorStop(0, 'rgba(80, 20, 20, 0.06)')
      redAmbient.addColorStop(1, 'rgba(40, 10, 10, 0)')
      ctx.fillStyle = redAmbient
      ctx.fillRect(0, 0, w, h)

      // Multiple EKG monitors
      for (const mon of S.icuMonitors) {
        const mx = mon.x * w
        const my = mon.y * h
        const mw = mon.w * w
        const mh = mon.h * h
        const [cr, cg, cb] = mon.traceColor

        ctx.fillStyle = 'rgba(8, 14, 22, 0.9)'
        ctx.fillRect(mx, my, mw, mh)
        ctx.strokeStyle = `rgba(${cr}, ${cg}, ${cb}, 0.15)`
        ctx.lineWidth = 1
        ctx.strokeRect(mx, my, mw, mh)

        ctx.fillStyle = `rgba(${cr}, ${cg}, ${cb}, 0.03)`
        ctx.fillRect(mx + 2, my + 2, mw - 4, mh - 4)

        ctx.strokeStyle = `rgba(${cr}, ${cg}, ${cb}, 0.8)`
        ctx.lineWidth = 1.2
        ctx.beginPath()
        const mcycleW = mw * 0.9
        for (let i = 0; i <= mcycleW; i += 1.5) {
          const nx = ((i + (t + mon.timeOffset) * 35) % mcycleW) / mcycleW
          const ey = my + mh * 0.5 + (getEkgY(nx) - 0.5) * mh * 0.7
          if (i === 0) ctx.moveTo(mx + mw * 0.05 + i, ey)
          else ctx.lineTo(mx + mw * 0.05 + i, ey)
        }
        ctx.stroke()

        const mGlow = ctx.createRadialGradient(mx + mw / 2, my + mh / 2, 0, mx + mw / 2, my + mh / 2, mw)
        mGlow.addColorStop(0, `rgba(${cr}, ${cg}, ${cb}, 0.04)`)
        mGlow.addColorStop(1, `rgba(${cr}, ${cg}, ${cb}, 0)`)
        ctx.fillStyle = mGlow
        ctx.beginPath()
        ctx.arc(mx + mw / 2, my + mh / 2, mw, 0, Math.PI * 2)
        ctx.fill()

        ctx.fillStyle = `rgba(${cr}, ${cg}, ${cb}, ${0.5 + 0.5 * Math.sin(t * 2 + mon.timeOffset)})`
        ctx.beginPath()
        ctx.arc(mx + mw - 5, my + 5, 2, 0, Math.PI * 2)
        ctx.fill()

        ctx.fillStyle = `rgba(${cr}, ${cg}, ${cb}, 0.4)`
        ctx.font = `${Math.max(8, mh * 0.2)}px monospace`
        const bpm = 60 + Math.floor(Math.sin(t * 0.3 + mon.timeOffset) * 15)
        ctx.fillText(`${bpm}`, mx + 4, my + mh - 4)
      }

      // Blinking status lights
      for (const light of S.statusLights) {
        const blink = 0.2 + 0.8 * (0.5 + 0.5 * Math.sin(t * light.blinkSpeed + light.phase))
        let r, g, b
        if (light.color === 'red') { r = 255; g = 50; b = 50 }
        else if (light.color === 'green') { r = 50; g = 255; b = 90 }
        else { r = 255; g = 180; b = 50 }

        ctx.fillStyle = `rgba(${r}, ${g}, ${b}, ${blink * 0.7})`
        ctx.beginPath()
        ctx.arc(light.x * w, light.y * h, light.size, 0, Math.PI * 2)
        ctx.fill()

        const lglow = ctx.createRadialGradient(
          light.x * w, light.y * h, 0,
          light.x * w, light.y * h, light.size * 5
        )
        lglow.addColorStop(0, `rgba(${r}, ${g}, ${b}, ${blink * 0.12})`)
        lglow.addColorStop(1, `rgba(${r}, ${g}, ${b}, 0)`)
        ctx.fillStyle = lglow
        ctx.beginPath()
        ctx.arc(light.x * w, light.y * h, light.size * 5, 0, Math.PI * 2)
        ctx.fill()
      }

      // Ventilator shapes
      for (const vent of S.ventilators) {
        const vx = vent.x * w
        const vy = vent.y * h
        const vPulse = 0.7 + 0.3 * Math.sin(t * 1.5 + vent.pulsePhase)

        ctx.fillStyle = 'rgba(15, 25, 40, 0.8)'
        ctx.fillRect(vx, vy, 24, 36)
        ctx.strokeStyle = 'rgba(60, 100, 140, 0.15)'
        ctx.lineWidth = 0.5
        ctx.strokeRect(vx, vy, 24, 36)
        ctx.fillStyle = `rgba(0, 100, 150, ${0.2 * vPulse})`
        ctx.fillRect(vx + 3, vy + 3, 18, 10)
        ctx.strokeStyle = `rgba(0, 200, 255, ${0.4 * vPulse})`
        ctx.lineWidth = 1
        ctx.beginPath()
        for (let i = 0; i < 16; i++) {
          const bx2 = vx + 4 + i
          const by = vy + 8 + Math.sin((i + t * 3) * 0.5) * 3
          if (i === 0) ctx.moveTo(bx2, by)
          else ctx.lineTo(bx2, by)
        }
        ctx.stroke()
        ctx.strokeStyle = 'rgba(100, 150, 180, 0.2)'
        ctx.lineWidth = 2.5
        ctx.beginPath()
        ctx.moveTo(vx + 12, vy + 36)
        ctx.quadraticCurveTo(vx + 12, vy + 55, vx + 30, vy + 55)
        ctx.stroke()
      }

      // Curtain dividers (swaying)
      for (const curtain of S.icuCurtains) {
        const cx = curtain.x * w
        const sway = Math.sin(t * curtain.swaySpeed + curtain.swayPhase) * 4
        const curtainTop = h * 0.15
        const curtainBottom = curtainTop + curtain.height * h

        ctx.fillStyle = 'rgba(60, 80, 100, 0.12)'
        ctx.fillRect(cx - 12, curtainTop - 2, 24, 3)

        ctx.strokeStyle = 'rgba(50, 70, 100, 0.12)'
        ctx.lineWidth = 1.5
        for (let fold = -2; fold <= 2; fold++) {
          ctx.beginPath()
          for (let y = curtainTop; y < curtainBottom; y += 2) {
            const frac = (y - curtainTop) / (curtainBottom - curtainTop)
            const offset = sway * frac * Math.sin(frac * Math.PI) + fold * 3
            if (y <= curtainTop + 1) ctx.moveTo(cx + offset, y)
            else ctx.lineTo(cx + offset, y)
          }
          ctx.stroke()
        }
        ctx.fillStyle = 'rgba(40, 55, 80, 0.06)'
        ctx.fillRect(cx - 8 + sway * 0.3, curtainTop, 16, curtainBottom - curtainTop)
      }

      // Medical items sprites
      const medItemSprite = S.sprites.medItems
      if (medItemSprite.loaded) {
        const items = [
          { sx: 0, sy: 0, x: 0.35, y: 0.75, s: 1.8 },
          { sx: 32, sy: 0, x: 0.55, y: 0.80, s: 1.5 },
          { sx: 0, sy: 32, x: 0.72, y: 0.70, s: 1.6 },
        ]
        for (const item of items) {
          drawSprite(medItemSprite, item.sx, item.sy, 32, 32,
            item.x * w, item.y * h, 32 * item.s, 32 * item.s, 0.15)
        }
      }

      // ICU beds
      function drawBed(bedX, bedY, bw, bh, bedAlpha) {
        ctx.strokeStyle = `rgba(80, 120, 150, ${bedAlpha})`
        ctx.lineWidth = 0.8
        ctx.strokeRect(bedX, bedY, bw, bh)
        ctx.fillStyle = `rgba(40, 60, 90, ${bedAlpha * 0.3})`
        ctx.fillRect(bedX, bedY, bw, bh)
        ctx.fillStyle = `rgba(60, 80, 110, ${bedAlpha * 0.5})`
        ctx.fillRect(bedX, bedY - bh * 0.3, bw * 0.1, bh * 1.3)
        ctx.fillStyle = `rgba(100, 130, 160, ${bedAlpha * 0.1})`
        ctx.fillRect(bedX + bw * 0.15, bedY + 1, bw * 0.7, bh * 0.3)
      }
      drawBed(w * 0.15, h * 0.65, 50, 16, 0.2)
      drawBed(w * 0.55, h * 0.68, 48, 15, 0.18)
      drawBed(w * 0.35, h * 0.82, 45, 14, 0.15)

      // Scanlines
      ctx.fillStyle = 'rgba(255, 50, 50, 0.004)'
      for (let sy = 0; sy < h; sy += 2) {
        ctx.fillRect(0, sy, w, 1)
      }

      // Heavy vignette
      const vig = ctx.createRadialGradient(w * 0.5, h * 0.4, w * 0.1, w * 0.5, h * 0.4, w * 0.65)
      vig.addColorStop(0, 'rgba(0, 0, 0, 0)')
      vig.addColorStop(1, 'rgba(0, 0, 0, 0.7)')
      ctx.fillStyle = vig
      ctx.fillRect(0, 0, w, h)

      ctx.restore()
    }

    // ================================================================
    // SCENE 5: OPERATING ROOM (black with bright white center)
    // ================================================================
    function drawOR(w, h, t, alpha) {
      ctx.save()
      ctx.globalAlpha = alpha

      // Near-black background
      ctx.fillStyle = '#030508'
      ctx.fillRect(0, 0, w, h)

      // Main surgical spotlight
      const spotX = w * 0.5
      const spotTop = h * 0.08
      const spotBottom = h * 0.75

      const spotGrad = ctx.createLinearGradient(spotX, spotTop, spotX, spotBottom)
      spotGrad.addColorStop(0, 'rgba(255, 252, 245, 0.2)')
      spotGrad.addColorStop(0.2, 'rgba(255, 250, 240, 0.12)')
      spotGrad.addColorStop(0.5, 'rgba(255, 248, 235, 0.06)')
      spotGrad.addColorStop(1, 'rgba(255, 245, 230, 0)')
      ctx.fillStyle = spotGrad
      ctx.beginPath()
      ctx.moveTo(spotX - 25, spotTop)
      ctx.lineTo(spotX + 25, spotTop)
      ctx.lineTo(spotX + w * 0.15, spotBottom)
      ctx.lineTo(spotX - w * 0.15, spotBottom)
      ctx.closePath()
      ctx.fill()

      // Pool of light on table
      const poolGlow = ctx.createRadialGradient(spotX, h * 0.62, 0, spotX, h * 0.62, w * 0.18)
      poolGlow.addColorStop(0, 'rgba(255, 250, 240, 0.08)')
      poolGlow.addColorStop(0.5, 'rgba(255, 245, 230, 0.03)')
      poolGlow.addColorStop(1, 'rgba(255, 240, 220, 0)')
      ctx.fillStyle = poolGlow
      ctx.beginPath()
      ctx.arc(spotX, h * 0.62, w * 0.18, 0, Math.PI * 2)
      ctx.fill()

      // Lamp fixture
      ctx.fillStyle = 'rgba(160, 170, 185, 0.25)'
      ctx.beginPath()
      ctx.arc(spotX, spotTop, 24, 0, Math.PI * 2)
      ctx.fill()
      ctx.strokeStyle = 'rgba(200, 210, 225, 0.15)'
      ctx.lineWidth = 1
      ctx.beginPath()
      ctx.arc(spotX, spotTop, 24, 0, Math.PI * 2)
      ctx.stroke()
      // Inner LED ring
      for (let angle = 0; angle < Math.PI * 2; angle += Math.PI / 6) {
        const lx = spotX + Math.cos(angle) * 15
        const ly = spotTop + Math.sin(angle) * 15
        ctx.fillStyle = `rgba(255, 250, 240, ${0.3 + 0.1 * Math.sin(t * 0.5 + angle)})`
        ctx.beginPath()
        ctx.arc(lx, ly, 2, 0, Math.PI * 2)
        ctx.fill()
      }
      // Arm to ceiling
      ctx.strokeStyle = 'rgba(130, 140, 155, 0.15)'
      ctx.lineWidth = 3
      ctx.beginPath()
      ctx.moveTo(spotX, spotTop - 24)
      ctx.lineTo(spotX + 15, 0)
      ctx.stroke()

      // Secondary lamp
      const spot2X = w * 0.35
      const spot2Y = h * 0.12
      const spot2Grad = ctx.createLinearGradient(spot2X, spot2Y, spot2X, h * 0.65)
      spot2Grad.addColorStop(0, 'rgba(230, 240, 255, 0.08)')
      spot2Grad.addColorStop(0.3, 'rgba(220, 230, 250, 0.03)')
      spot2Grad.addColorStop(1, 'rgba(210, 220, 240, 0)')
      ctx.fillStyle = spot2Grad
      ctx.beginPath()
      ctx.moveTo(spot2X - 15, spot2Y)
      ctx.lineTo(spot2X + 15, spot2Y)
      ctx.lineTo(spot2X + w * 0.08, h * 0.65)
      ctx.lineTo(spot2X - w * 0.08, h * 0.65)
      ctx.closePath()
      ctx.fill()
      ctx.fillStyle = 'rgba(140, 150, 165, 0.18)'
      ctx.beginPath()
      ctx.arc(spot2X, spot2Y, 16, 0, Math.PI * 2)
      ctx.fill()

      // Operating table
      const tableX = w * 0.5
      const tableY = h * 0.63
      const tableW = w * 0.2
      const tableH = h * 0.025
      const tableSurf = ctx.createLinearGradient(tableX - tableW / 2, tableY, tableX + tableW / 2, tableY)
      tableSurf.addColorStop(0, 'rgba(50, 60, 75, 0.5)')
      tableSurf.addColorStop(0.5, 'rgba(70, 80, 95, 0.6)')
      tableSurf.addColorStop(1, 'rgba(50, 60, 75, 0.5)')
      ctx.fillStyle = tableSurf
      ctx.fillRect(tableX - tableW / 2, tableY, tableW, tableH)
      ctx.fillStyle = 'rgba(255, 250, 240, 0.08)'
      ctx.fillRect(tableX - tableW / 2 + tableW * 0.2, tableY, tableW * 0.6, 2)
      ctx.fillStyle = 'rgba(60, 70, 85, 0.4)'
      ctx.fillRect(tableX - tableW * 0.35, tableY + tableH, 4, h * 0.04)
      ctx.fillRect(tableX + tableW * 0.35 - 4, tableY + tableH, 4, h * 0.04)
      ctx.fillStyle = 'rgba(80, 90, 105, 0.35)'
      ctx.fillRect(tableX - tableW / 2, tableY - 3, tableW * 0.12, tableH + 3)
      ctx.fillStyle = 'rgba(60, 90, 100, 0.12)'
      ctx.fillRect(tableX - tableW * 0.3, tableY - 1, tableW * 0.6, tableH + 1)

      // Tool tray
      const trayX = w * 0.66
      const trayY = h * 0.58
      ctx.fillStyle = 'rgba(70, 80, 95, 0.4)'
      ctx.fillRect(trayX, trayY, 30, 3)
      ctx.strokeStyle = 'rgba(80, 90, 105, 0.2)'
      ctx.lineWidth = 1.5
      ctx.beginPath()
      ctx.moveTo(trayX + 15, trayY + 3)
      ctx.lineTo(trayX + 15, trayY + 25)
      ctx.stroke()
      ctx.fillStyle = 'rgba(70, 80, 95, 0.25)'
      ctx.fillRect(trayX + 5, trayY + 25, 20, 3)

      // Surgical instruments on tray
      for (const tool of S.surgicalTools) {
        const tx = tool.x * w
        const ty = trayY - 1
        const gleam = 0.15 + 0.1 * Math.sin(t * 1.5 + tool.gleamPhase)

        ctx.save()
        ctx.translate(tx, ty)
        ctx.rotate(tool.angle)
        ctx.fillStyle = `rgba(160, 170, 190, ${gleam})`
        ctx.fillRect(-1, 0, 2, -tool.length)
        ctx.fillStyle = `rgba(255, 255, 255, ${gleam * 0.5 * (0.5 + 0.5 * Math.sin(t * 2 + tool.gleamPhase))})`
        ctx.beginPath()
        ctx.arc(0, -tool.length, 1, 0, Math.PI * 2)
        ctx.fill()
        ctx.restore()
      }

      // Anesthesia machine (left side)
      const amX = w * 0.3
      const amY = h * 0.50
      ctx.fillStyle = 'rgba(20, 30, 45, 0.7)'
      ctx.fillRect(amX, amY, 30, 50)
      ctx.strokeStyle = 'rgba(60, 80, 100, 0.12)'
      ctx.lineWidth = 0.5
      ctx.strokeRect(amX, amY, 30, 50)
      ctx.fillStyle = `rgba(0, 150, 100, ${0.12 + 0.03 * Math.sin(t)})`
      ctx.fillRect(amX + 3, amY + 3, 24, 14)
      for (let d = 0; d < 3; d++) {
        ctx.fillStyle = 'rgba(60, 80, 100, 0.3)'
        ctx.beginPath()
        ctx.arc(amX + 8 + d * 8, amY + 25, 3, 0, Math.PI * 2)
        ctx.fill()
        ctx.strokeStyle = `rgba(0, 200, 150, ${0.2 + 0.1 * Math.sin(t * 0.5 + d)})`
        ctx.lineWidth = 0.5
        const dialAngle = t * 0.3 + d * 2
        ctx.beginPath()
        ctx.moveTo(amX + 8 + d * 8, amY + 25)
        ctx.lineTo(amX + 8 + d * 8 + Math.cos(dialAngle) * 2.5, amY + 25 + Math.sin(dialAngle) * 2.5)
        ctx.stroke()
      }
      ctx.strokeStyle = 'rgba(80, 120, 140, 0.15)'
      ctx.lineWidth = 2
      ctx.beginPath()
      ctx.moveTo(amX + 15, amY + 50)
      ctx.quadraticCurveTo(amX + 15, amY + 70, amX + 40, amY + 70)
      ctx.stroke()

      // Side monitor
      const smX = w * 0.72
      const smY = h * 0.35
      const smW = w * 0.08
      const smH = h * 0.06
      ctx.fillStyle = 'rgba(8, 14, 22, 0.8)'
      ctx.fillRect(smX, smY, smW, smH)
      ctx.strokeStyle = 'rgba(0, 255, 130, 0.12)'
      ctx.lineWidth = 0.5
      ctx.strokeRect(smX, smY, smW, smH)
      ctx.strokeStyle = 'rgba(0, 255, 130, 0.6)'
      ctx.lineWidth = 1
      ctx.beginPath()
      for (let i = 0; i <= smW * 0.85; i += 1.5) {
        const nx = ((i + t * 30) % (smW * 0.85)) / (smW * 0.85)
        const ey = smY + smH * 0.5 + (getEkgY(nx) - 0.5) * smH * 0.6
        if (i === 0) ctx.moveTo(smX + smW * 0.075 + i, ey)
        else ctx.lineTo(smX + smW * 0.075 + i, ey)
      }
      ctx.stroke()
      ctx.strokeStyle = 'rgba(0, 180, 255, 0.4)'
      ctx.lineWidth = 0.8
      ctx.beginPath()
      for (let i = 0; i <= smW * 0.85; i += 1.5) {
        const nx = ((i + t * 25 + 50) % (smW * 0.85)) / (smW * 0.85)
        const ey = smY + smH * 0.75 + Math.sin(nx * Math.PI * 2) * smH * 0.1
        if (i === 0) ctx.moveTo(smX + smW * 0.075 + i, ey)
        else ctx.lineTo(smX + smW * 0.075 + i, ey)
      }
      ctx.stroke()

      // Floating dust in spotlight
      for (const p of S.orParticles) {
        p.y -= p.speed
        if (p.y < 0.1) { p.y = 0.85; p.x = 0.5 + (Math.random() - 0.5) * 0.25 }
        const px = (p.x + Math.sin(t * 0.4 + p.phase) * 0.01) * w
        const py = p.y * h
        const distFromCenter = Math.abs(px - spotX) / (w * 0.15)
        if (distFromCenter > 1) continue
        const inLight = 1 - distFromCenter
        const pulse = 0.3 + 0.7 * Math.sin(t * 0.8 + p.phase)
        ctx.fillStyle = `rgba(255, 250, 240, ${0.15 * inLight * pulse})`
        ctx.beginPath()
        ctx.arc(px, py, p.size, 0, Math.PI * 2)
        ctx.fill()
      }

      // Scanlines (tighter)
      ctx.fillStyle = 'rgba(255, 255, 255, 0.004)'
      for (let sy = 0; sy < h; sy += 2) {
        ctx.fillRect(0, sy, w, 1)
      }

      // Very heavy vignette
      const vig = ctx.createRadialGradient(w * 0.5, h * 0.5, w * 0.08, w * 0.5, h * 0.5, w * 0.55)
      vig.addColorStop(0, 'rgba(0, 0, 0, 0)')
      vig.addColorStop(0.5, 'rgba(0, 0, 0, 0.4)')
      vig.addColorStop(1, 'rgba(0, 0, 0, 0.85)')
      ctx.fillStyle = vig
      ctx.fillRect(0, 0, w, h)

      ctx.restore()
    }

    // ================================================================
    // MAIN DRAW LOOP
    // ================================================================
    function draw(timestamp) {
      const w = S.width
      const h = S.height
      const t = timestamp * 0.001
      S.time = t

      ctx.clearRect(0, 0, w, h)

      const d = Math.max(0, Math.min(depth, maxDepth))
      const opacities = getSceneOpacities(d)

      // Update shared particle positions
      for (const p of S.particles) {
        p.y -= p.speed
        if (p.y < -0.02) { p.y = 1.02; p.x = Math.random() }
      }

      // Update floating meds
      for (const med of S.floatingMeds) {
        med.y -= med.speed * 0.5
        if (med.y < -0.05) { med.y = 1.05; med.x = Math.random() }
      }

      // Draw each scene at its opacity
      if (opacities[0] > 0.001) drawExterior(w, h, t, opacities[0])
      if (opacities[1] > 0.001) drawLobby(w, h, t, opacities[1])
      if (opacities[2] > 0.001) drawWard(w, h, t, opacities[2])
      if (opacities[3] > 0.001) drawICU(w, h, t, opacities[3])
      if (opacities[4] > 0.001) drawOR(w, h, t, opacities[4])

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
