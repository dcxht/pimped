// HospitalScene - Pixel art background scenes with light animated overlays
// Loads pre-made Blueberry scene PNGs and crossfades between them based on depth.
// Overlays: floating particles, scanlines, vignette, scene-specific effects.

import { useRef, useEffect, useCallback } from 'react'

// Scene definitions: depth range -> image path
const SCENES = [
  { min: 0,    max: 499,  src: '/scenes/exterior-night.png' },
  { min: 500,  max: 999,  src: '/scenes/lobby.png' },
  { min: 1000, max: 1499, src: '/scenes/ward.png' },
  { min: 1500, max: 1999, src: '/scenes/icu.png' },
  { min: 2000, max: 2500, src: '/scenes/or.png' },
]

const CROSSFADE_RANGE = 150 // depth units over which scenes blend

function getSceneIndex(depth) {
  for (let i = 0; i < SCENES.length; i++) {
    if (depth <= SCENES[i].max) return i
  }
  return SCENES.length - 1
}

// Seed a set of persistent particles
function createParticles(count = 40) {
  return Array.from({ length: count }, () => ({
    x: Math.random(),
    y: Math.random(),
    r: 1 + Math.random() * 2,
    speed: 0.0002 + Math.random() * 0.0004,
    drift: (Math.random() - 0.5) * 0.0003,
    hue: Math.random() * 60 + 160, // teal-blue range
    alpha: 0.15 + Math.random() * 0.2,
  }))
}

export default function HospitalScene({ depth = 0, maxDepth = 2500 }) {
  const canvasRef = useRef(null)
  const imagesRef = useRef({})    // src -> HTMLImageElement
  const loadedRef = useRef(false)
  const particlesRef = useRef(createParticles())
  const rafRef = useRef(null)
  const depthRef = useRef(depth)

  // Keep depth in a ref so the animation loop always sees the latest value
  depthRef.current = depth

  // Load all scene images once on mount
  useEffect(() => {
    let cancelled = false
    const srcs = SCENES.map(s => s.src)
    const promises = srcs.map(src => {
      return new Promise((resolve) => {
        const img = new Image()
        img.src = src
        img.onload = () => {
          if (!cancelled) imagesRef.current[src] = img
          resolve()
        }
        img.onerror = () => resolve() // graceful fallback
      })
    })
    Promise.all(promises).then(() => {
      if (!cancelled) loadedRef.current = true
    })
    return () => { cancelled = true }
  }, [])

  // Draw an image to cover the canvas (like CSS background-size: cover, centered)
  const drawCover = useCallback((ctx, img, w, h, alpha) => {
    if (!img || alpha <= 0) return
    const imgAspect = img.width / img.height
    const canvasAspect = w / h
    let dw, dh, dx, dy
    if (canvasAspect > imgAspect) {
      dw = w
      dh = w / imgAspect
      dx = 0
      dy = (h - dh) / 2
    } else {
      dh = h
      dw = h * imgAspect
      dx = (w - dw) / 2
      dy = 0
    }
    ctx.globalAlpha = alpha
    ctx.drawImage(img, dx, dy, dw, dh)
    ctx.globalAlpha = 1
  }, [])

  // Draw floating particles
  const drawParticles = useCallback((ctx, w, h, t) => {
    const particles = particlesRef.current
    for (const p of particles) {
      // Animate
      p.y -= p.speed
      p.x += p.drift + Math.sin(t * 0.001 + p.hue) * 0.00005
      if (p.y < -0.02) { p.y = 1.02; p.x = Math.random() }
      if (p.x < -0.02 || p.x > 1.02) { p.x = Math.random(); p.y = 1.02 }

      const px = p.x * w
      const py = p.y * h
      const flicker = 0.7 + 0.3 * Math.sin(t * 0.002 + p.hue)
      ctx.globalAlpha = p.alpha * flicker
      ctx.fillStyle = `hsl(${p.hue}, 50%, 70%)`
      ctx.beginPath()
      ctx.arc(px, py, p.r, 0, Math.PI * 2)
      ctx.fill()
    }
    ctx.globalAlpha = 1
  }, [])

  // Scanline overlay
  const drawScanlines = useCallback((ctx, w, h) => {
    ctx.fillStyle = 'rgba(0,0,0,0.04)'
    for (let y = 0; y < h; y += 3) {
      ctx.fillRect(0, y, w, 1)
    }
  }, [])

  // Vignette
  const drawVignette = useCallback((ctx, w, h) => {
    const cx = w / 2, cy = h / 2
    const r = Math.max(w, h) * 0.7
    const grad = ctx.createRadialGradient(cx, cy, r * 0.4, cx, cy, r)
    grad.addColorStop(0, 'rgba(0,0,0,0)')
    grad.addColorStop(1, 'rgba(0,0,0,0.45)')
    ctx.fillStyle = grad
    ctx.fillRect(0, 0, w, h)
  }, [])

  // ICU: blinking status dots
  const drawICULights = useCallback((ctx, w, h, t) => {
    const dots = [
      { x: 0.15, y: 0.2, color: '#00ff88' },
      { x: 0.82, y: 0.18, color: '#ff4444' },
      { x: 0.6, y: 0.25, color: '#44aaff' },
    ]
    for (const d of dots) {
      const blink = Math.sin(t * 0.003 + d.x * 100) > 0.3 ? 1 : 0.15
      ctx.globalAlpha = 0.6 * blink
      ctx.fillStyle = d.color
      ctx.beginPath()
      ctx.arc(d.x * w, d.y * h, 3, 0, Math.PI * 2)
      ctx.fill()
      // glow
      if (blink > 0.5) {
        ctx.globalAlpha = 0.15
        ctx.beginPath()
        ctx.arc(d.x * w, d.y * h, 10, 0, Math.PI * 2)
        ctx.fill()
      }
    }
    ctx.globalAlpha = 1
  }, [])

  // OR: subtle spotlight pulse
  const drawORSpotlight = useCallback((ctx, w, h, t) => {
    const pulse = 0.06 + 0.03 * Math.sin(t * 0.0015)
    const cx = w * 0.5, cy = h * 0.15
    const grad = ctx.createRadialGradient(cx, cy, 0, cx, cy, h * 0.6)
    grad.addColorStop(0, `rgba(200,220,255,${pulse})`)
    grad.addColorStop(1, 'rgba(200,220,255,0)')
    ctx.fillStyle = grad
    ctx.fillRect(0, 0, w, h)
  }, [])

  // Main animation loop
  useEffect(() => {
    const canvas = canvasRef.current
    if (!canvas) return
    const ctx = canvas.getContext('2d')

    const frame = (t) => {
      const d = depthRef.current
      const w = canvas.width
      const h = canvas.height

      // Clear
      ctx.clearRect(0, 0, w, h)

      // Crisp pixel art
      ctx.imageSmoothingEnabled = false

      if (!loadedRef.current) {
        // Loading fallback: dark background
        ctx.fillStyle = '#0a0e14'
        ctx.fillRect(0, 0, w, h)
        rafRef.current = requestAnimationFrame(frame)
        return
      }

      // Determine current and next scene, plus crossfade alpha
      const idx = getSceneIndex(d)
      const scene = SCENES[idx]
      const img = imagesRef.current[scene.src]

      // Check if we're in a crossfade zone near a boundary
      let blendAlpha = 0
      let blendImg = null

      if (idx < SCENES.length - 1) {
        const boundary = scene.max
        const distToBoundary = boundary - d
        if (distToBoundary < CROSSFADE_RANGE && distToBoundary >= 0) {
          blendAlpha = 1 - (distToBoundary / CROSSFADE_RANGE)
          blendImg = imagesRef.current[SCENES[idx + 1].src]
        }
      }
      if (idx > 0) {
        const prevBoundary = SCENES[idx - 1].max
        const distFromPrev = d - prevBoundary
        if (distFromPrev >= 0 && distFromPrev < CROSSFADE_RANGE) {
          blendAlpha = distFromPrev / CROSSFADE_RANGE
          blendImg = imagesRef.current[SCENES[idx - 1].src]
          // Swap: prev scene fades out, current fades in
          drawCover(ctx, blendImg, w, h, 1 - blendAlpha)
          drawCover(ctx, img, w, h, blendAlpha)
          // skip the normal draw below
          blendImg = null
          blendAlpha = 0
        }
      }

      if (blendAlpha === 0 && blendImg === null) {
        // No crossfade, draw current scene at full opacity
        drawCover(ctx, img, w, h, 1)
      } else if (blendImg) {
        // Crossfading into next scene
        drawCover(ctx, img, w, h, 1 - blendAlpha)
        drawCover(ctx, blendImg, w, h, blendAlpha)
      }

      // -- Overlays --
      drawParticles(ctx, w, h, t)
      drawScanlines(ctx, w, h)
      drawVignette(ctx, w, h)

      // Scene-specific effects
      if (idx === 3) drawICULights(ctx, w, h, t)   // ICU
      if (idx === 4) drawORSpotlight(ctx, w, h, t)  // OR

      rafRef.current = requestAnimationFrame(frame)
    }

    rafRef.current = requestAnimationFrame(frame)
    return () => {
      if (rafRef.current) cancelAnimationFrame(rafRef.current)
    }
  }, [drawCover, drawParticles, drawScanlines, drawVignette, drawICULights, drawORSpotlight])

  // Resize canvas to fill container
  useEffect(() => {
    const canvas = canvasRef.current
    if (!canvas) return
    const resize = () => {
      const dpr = window.devicePixelRatio || 1
      const rect = canvas.parentElement?.getBoundingClientRect() || { width: window.innerWidth, height: window.innerHeight }
      canvas.width = rect.width * dpr
      canvas.height = rect.height * dpr
      canvas.style.width = rect.width + 'px'
      canvas.style.height = rect.height + 'px'
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
      }}
    />
  )
}
