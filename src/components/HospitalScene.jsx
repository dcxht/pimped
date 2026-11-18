// HospitalScene - Canvas gradient background + positioned PNG "window" + animated overlays
// Inspired by Krillion's layered approach: gradient canvas (z:0), small image (z:1), animated canvas (z:2)
// Instead of stretching a 2:1 PNG across a 9:19 phone, we draw a full-screen gradient
// and place the PNG as a centered "room view" window within it.

import { useRef, useEffect, useCallback } from 'react'

const SCENES = [
  { min: 0,    max: 499,  src: '/scenes/exterior-night.png', label: 'EXTERIOR' },
  { min: 500,  max: 999,  src: '/scenes/lobby.png',          label: 'LOBBY' },
  { min: 1000, max: 1499, src: '/scenes/ward.png',           label: 'WARD' },
  { min: 1500, max: 1999, src: '/scenes/icu.png',            label: 'ICU' },
  { min: 2000, max: 2500, src: '/scenes/or.png',             label: 'OR' },
]

// Each scene: gradient palette [top, mid, bottom] as [r,g,b]
const PALETTES = [
  { top: [12, 15, 40],  mid: [18, 22, 55],  bot: [8, 10, 30] },   // exterior: deep night
  { top: [45, 35, 22],  mid: [55, 42, 28],  bot: [30, 24, 16] },  // lobby: warm amber
  { top: [14, 42, 42],  mid: [18, 50, 48],  bot: [10, 32, 32] },  // ward: clinical teal
  { top: [10, 12, 35],  mid: [14, 16, 42],  bot: [6, 8, 22] },    // icu: dark blue
  { top: [6, 6, 14],    mid: [10, 10, 20],  bot: [4, 4, 10] },    // or: near black
]

function getSceneIndex(d) {
  for (let i = 0; i < SCENES.length; i++) if (d <= SCENES[i].max) return i
  return SCENES.length - 1
}

function lerpColor(a, b, t) {
  return [a[0] + (b[0] - a[0]) * t, a[1] + (b[1] - a[1]) * t, a[2] + (b[2] - a[2]) * t]
}

function rgb(c) { return `rgb(${c[0] | 0},${c[1] | 0},${c[2] | 0})` }

function createParticles(count = 35) {
  return Array.from({ length: count }, () => ({
    x: Math.random(), y: Math.random(),
    r: 1 + Math.random() * 2.5,
    speed: 0.0002 + Math.random() * 0.0004,
    drift: (Math.random() - 0.5) * 0.0003,
    phase: Math.random() * Math.PI * 2,
    alpha: 0.12 + Math.random() * 0.18,
  }))
}

function createCrosses(count = 8) {
  return Array.from({ length: count }, () => ({
    x: Math.random(), y: Math.random(),
    size: 4 + Math.random() * 6,
    speed: 0.00015 + Math.random() * 0.0003,
    drift: (Math.random() - 0.5) * 0.0002,
    rot: Math.random() * Math.PI,
    rotSpeed: (Math.random() - 0.5) * 0.001,
    alpha: 0.06 + Math.random() * 0.1,
  }))
}

export default function HospitalScene({ depth = 0, maxDepth = 2500 }) {
  const canvasRef = useRef(null)
  const imagesRef = useRef({})
  const loadedRef = useRef(false)
  const particlesRef = useRef(createParticles())
  const crossesRef = useRef(createCrosses())
  const rafRef = useRef(null)
  const depthRef = useRef(depth)
  const smoothDepthRef = useRef(depth)
  const prevIdxRef = useRef(0)
  const fadeRef = useRef(1)

  depthRef.current = depth

  // Preload all scene images
  useEffect(() => {
    let cancelled = false
    const promises = SCENES.map(s => new Promise(resolve => {
      const img = new Image()
      img.src = s.src
      img.onload = () => { if (!cancelled) imagesRef.current[s.src] = img; resolve() }
      img.onerror = () => resolve()
    }))
    Promise.all(promises).then(() => { if (!cancelled) loadedRef.current = true })
    return () => { cancelled = true }
  }, [])

  // --- Drawing helpers ---

  const drawGradient = useCallback((ctx, w, h, palette) => {
    const grad = ctx.createLinearGradient(0, 0, 0, h)
    grad.addColorStop(0, rgb(palette.top))
    grad.addColorStop(0.45, rgb(palette.mid))
    grad.addColorStop(1, rgb(palette.bot))
    ctx.fillStyle = grad
    ctx.fillRect(0, 0, w, h)
  }, [])

  const drawLightRays = useCallback((ctx, w, h, t, palette) => {
    for (let i = 0; i < 5; i++) {
      const baseX = (i / 5) * w + Math.sin(t * 0.0003 + i * 1.8) * w * 0.08
      const spread = w * 0.06
      const alpha = 0.025 + 0.015 * Math.sin(t * 0.0005 + i * 2.1)
      const bright = palette.top.map(c => Math.min(255, c + 60))
      const grad = ctx.createLinearGradient(baseX, 0, baseX + spread, h * 0.7)
      grad.addColorStop(0, `rgba(${bright[0]},${bright[1]},${bright[2]},${alpha})`)
      grad.addColorStop(1, `rgba(${bright[0]},${bright[1]},${bright[2]},0)`)
      ctx.fillStyle = grad
      ctx.beginPath()
      ctx.moveTo(baseX - spread * 0.5, 0)
      ctx.lineTo(baseX + spread * 1.5, 0)
      ctx.lineTo(baseX + spread * 3, h * 0.7)
      ctx.lineTo(baseX - spread, h * 0.7)
      ctx.closePath()
      ctx.fill()
    }
  }, [])

  const drawRoomWindow = useCallback((ctx, img, w, h, alpha, t) => {
    if (!img || alpha <= 0) return
    ctx.imageSmoothingEnabled = false

    const winW = w * 0.82
    const winH = winW * (img.height / img.width)
    const maxH = h * 0.48
    const scale = winH > maxH ? maxH / winH : 1
    const fw = winW * scale
    const fh = winH * scale
    const fx = (w - fw) / 2
    const fy = h * 0.18

    // Subtle frame glow
    ctx.globalAlpha = alpha * 0.15
    ctx.shadowColor = 'rgba(100,180,200,0.3)'
    ctx.shadowBlur = 20
    ctx.fillStyle = 'rgba(100,180,200,0.05)'
    ctx.fillRect(fx - 4, fy - 4, fw + 8, fh + 8)
    ctx.shadowBlur = 0

    // Draw the PNG - pixel crisp
    ctx.globalAlpha = alpha
    ctx.drawImage(img, fx, fy, fw, fh)

    // Thin border frame
    ctx.strokeStyle = `rgba(140,200,220,${alpha * 0.2})`
    ctx.lineWidth = 1
    ctx.strokeRect(fx - 1, fy - 1, fw + 2, fh + 2)

    ctx.globalAlpha = 1
  }, [])

  const drawParticles = useCallback((ctx, w, h, t) => {
    for (const p of particlesRef.current) {
      p.y -= p.speed
      p.x += p.drift + Math.sin(t * 0.001 + p.phase) * 0.00005
      if (p.y < -0.02) { p.y = 1.02; p.x = Math.random() }
      if (p.x < -0.02 || p.x > 1.02) { p.x = Math.random(); p.y = 1.02 }
      const flicker = 0.7 + 0.3 * Math.sin(t * 0.002 + p.phase)
      ctx.globalAlpha = p.alpha * flicker
      ctx.fillStyle = 'rgba(160,210,220,0.8)'
      ctx.beginPath()
      ctx.arc(p.x * w, p.y * h, p.r, 0, Math.PI * 2)
      ctx.fill()
    }
    ctx.globalAlpha = 1
  }, [])

  const drawCrosses = useCallback((ctx, w, h, t) => {
    for (const c of crossesRef.current) {
      c.y -= c.speed
      c.x += c.drift
      c.rot += c.rotSpeed
      if (c.y < -0.05) { c.y = 1.05; c.x = Math.random() }
      const px = c.x * w, py = c.y * h
      const flicker = 0.6 + 0.4 * Math.sin(t * 0.0015 + c.rot * 3)
      ctx.save()
      ctx.translate(px, py)
      ctx.rotate(c.rot)
      ctx.globalAlpha = c.alpha * flicker
      ctx.strokeStyle = 'rgba(180,220,230,0.6)'
      ctx.lineWidth = 1.5
      ctx.beginPath()
      ctx.moveTo(-c.size, 0); ctx.lineTo(c.size, 0)
      ctx.moveTo(0, -c.size); ctx.lineTo(0, c.size)
      ctx.stroke()
      ctx.restore()
    }
    ctx.globalAlpha = 1
  }, [])

  const drawDepthMarkers = useCallback((ctx, w, h, sd) => {
    const labels = ['EXTERIOR', 'LOBBY', 'WARD', 'ICU', 'OR']
    const thresholds = [0, 500, 1000, 1500, 2000]
    const markerX = w - 28
    const startY = h * 0.25, endY = h * 0.75
    const range = endY - startY

    // Track line
    ctx.strokeStyle = 'rgba(120,180,200,0.12)'
    ctx.lineWidth = 1
    ctx.beginPath()
    ctx.moveTo(markerX, startY)
    ctx.lineTo(markerX, endY)
    ctx.stroke()

    ctx.font = '8px monospace'
    ctx.textAlign = 'right'
    for (let i = 0; i < labels.length; i++) {
      const y = startY + (thresholds[i] / maxDepth) * range
      const active = sd >= thresholds[i] && (i === labels.length - 1 || sd < thresholds[i + 1])
      ctx.globalAlpha = active ? 0.7 : 0.18
      ctx.fillStyle = active ? '#7cf0c8' : '#8ab8c8'
      ctx.beginPath()
      ctx.arc(markerX, y, active ? 3 : 2, 0, Math.PI * 2)
      ctx.fill()
      ctx.fillText(labels[i], markerX - 8, y + 3)
    }

    // Current position arrow
    const curY = startY + (sd / maxDepth) * range
    ctx.globalAlpha = 0.5
    ctx.fillStyle = '#7cf0c8'
    ctx.beginPath()
    ctx.moveTo(markerX + 6, curY)
    ctx.lineTo(markerX + 2, curY - 3)
    ctx.lineTo(markerX + 2, curY + 3)
    ctx.closePath()
    ctx.fill()
    ctx.globalAlpha = 1
  }, [maxDepth])

  const drawEKGLine = useCallback((ctx, w, h, t) => {
    const y0 = h * 0.72
    const speed = t * 0.08
    ctx.strokeStyle = 'rgba(80,220,160,0.25)'
    ctx.lineWidth = 1.5
    ctx.beginPath()
    for (let x = 0; x < w; x += 2) {
      const phase = (x + speed) % 200
      let dy = 0
      if (phase > 60 && phase < 65) dy = -12
      else if (phase > 65 && phase < 70) dy = 18
      else if (phase > 70 && phase < 75) dy = -8
      else if (phase > 75 && phase < 80) dy = 0
      else dy = Math.sin((x + speed) * 0.02) * 1.5
      if (x === 0) ctx.moveTo(x, y0 + dy)
      else ctx.lineTo(x, y0 + dy)
    }
    ctx.stroke()
  }, [])

  const drawICULights = useCallback((ctx, w, h, t) => {
    const dots = [
      { x: 0.12, y: 0.14, color: [0, 255, 136] },
      { x: 0.88, y: 0.12, color: [255, 68, 68] },
      { x: 0.55, y: 0.16, color: [68, 170, 255] },
    ]
    for (const d of dots) {
      const blink = Math.sin(t * 0.003 + d.x * 100) > 0.3 ? 1 : 0.1
      ctx.globalAlpha = 0.5 * blink
      ctx.fillStyle = `rgb(${d.color.join(',')})`
      ctx.beginPath()
      ctx.arc(d.x * w, d.y * h, 3, 0, Math.PI * 2)
      ctx.fill()
      if (blink > 0.5) {
        ctx.globalAlpha = 0.08
        ctx.beginPath()
        ctx.arc(d.x * w, d.y * h, 14, 0, Math.PI * 2)
        ctx.fill()
      }
    }
    ctx.globalAlpha = 1
  }, [])

  const drawORSpotlight = useCallback((ctx, w, h, t) => {
    const pulse = 0.07 + 0.035 * Math.sin(t * 0.0015)
    const grad = ctx.createRadialGradient(w * 0.5, h * 0.1, 0, w * 0.5, h * 0.1, h * 0.55)
    grad.addColorStop(0, `rgba(200,220,255,${pulse})`)
    grad.addColorStop(1, 'rgba(200,220,255,0)')
    ctx.fillStyle = grad
    ctx.fillRect(0, 0, w, h)
  }, [])

  const drawVignette = useCallback((ctx, w, h) => {
    const r = Math.max(w, h) * 0.7
    const grad = ctx.createRadialGradient(w / 2, h / 2, r * 0.35, w / 2, h / 2, r)
    grad.addColorStop(0, 'rgba(0,0,0,0)')
    grad.addColorStop(1, 'rgba(0,0,0,0.3)')
    ctx.fillStyle = grad
    ctx.fillRect(0, 0, w, h)
  }, [])

  const drawScanlines = useCallback((ctx, w, h) => {
    ctx.fillStyle = 'rgba(0,0,0,0.025)'
    for (let y = 0; y < h; y += 3) ctx.fillRect(0, y, w, 1)
  }, [])

  // --- Main animation loop ---
  useEffect(() => {
    const canvas = canvasRef.current
    if (!canvas) return
    const ctx = canvas.getContext('2d')

    const frame = (t) => {
      const d = depthRef.current
      const w = canvas.width, h = canvas.height

      // Smooth depth easing
      smoothDepthRef.current += (d - smoothDepthRef.current) * 0.06
      const sd = smoothDepthRef.current
      const idx = getSceneIndex(sd)

      // Crossfade on scene change
      if (idx !== prevIdxRef.current) {
        fadeRef.current = 0
        prevIdxRef.current = idx
      }
      fadeRef.current = Math.min(1, fadeRef.current + 0.02)

      // Lerp palettes for smooth gradient transition near boundaries
      const progress = (sd - SCENES[idx].min) / (SCENES[idx].max - SCENES[idx].min)
      const nextIdx = Math.min(idx + 1, PALETTES.length - 1)
      const blendT = Math.max(0, (progress - 0.7) / 0.3)
      const palette = {
        top: lerpColor(PALETTES[idx].top, PALETTES[nextIdx].top, blendT),
        mid: lerpColor(PALETTES[idx].mid, PALETTES[nextIdx].mid, blendT),
        bot: lerpColor(PALETTES[idx].bot, PALETTES[nextIdx].bot, blendT),
      }

      // 1. Full-screen gradient background
      drawGradient(ctx, w, h, palette)

      // 2. Light rays from top
      drawLightRays(ctx, w, h, t, palette)

      // 3. Room window PNG (centered, not full-screen)
      if (loadedRef.current) {
        const img = imagesRef.current[SCENES[idx].src]
        drawRoomWindow(ctx, img, w, h, fadeRef.current, t)
      }

      // 4. Animated overlays
      drawParticles(ctx, w, h, t)
      drawCrosses(ctx, w, h, t)
      drawDepthMarkers(ctx, w, h, sd)

      // Scene-specific effects
      if (idx >= 2) drawEKGLine(ctx, w, h, t)
      if (idx === 3) drawICULights(ctx, w, h, t)
      if (idx === 4) drawORSpotlight(ctx, w, h, t)

      // 5. Post-processing
      drawVignette(ctx, w, h)
      drawScanlines(ctx, w, h)

      rafRef.current = requestAnimationFrame(frame)
    }

    rafRef.current = requestAnimationFrame(frame)
    return () => { if (rafRef.current) cancelAnimationFrame(rafRef.current) }
  }, [drawGradient, drawLightRays, drawRoomWindow, drawParticles, drawCrosses,
      drawDepthMarkers, drawEKGLine, drawICULights, drawORSpotlight, drawVignette, drawScanlines])

  // Resize canvas to viewport
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

  return (
    <canvas
      ref={canvasRef}
      style={{
        position: 'fixed',
        inset: 0,
        width: '100%',
        height: '100%',
        imageRendering: 'pixelated',
        pointerEvents: 'none',
        zIndex: 0,
      }}
    />
  )
}
