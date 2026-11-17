// Hospital Scene - Canvas-based animated background
// Lobby (top) -> Ward -> ICU -> OR -> Chief's Office (deep)

import { useRef, useEffect } from 'react'

export default function HospitalScene({ depth = 0, maxDepth = 2500 }) {
  const canvasRef = useRef(null)
  const animRef = useRef(null)
  const stateRef = useRef({
    particles: [],
    ekgOffset: 0,
    time: 0,
    width: 0,
    height: 0,
    dpr: 1,
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

    // EKG PQRST waveform as normalized points (x: 0-1 per cycle, y: 0-1 centered at 0.5)
    const ekgPoints = [
      [0, 0.5], [0.08, 0.5],
      // P wave
      [0.12, 0.42], [0.16, 0.5],
      // PR segment
      [0.20, 0.5],
      // Q
      [0.24, 0.55],
      // R
      [0.28, 0.12],
      // S
      [0.32, 0.65],
      // ST segment
      [0.36, 0.48], [0.44, 0.48],
      // T wave
      [0.50, 0.36], [0.56, 0.48],
      // baseline
      [0.64, 0.5], [1.0, 0.5],
    ]

    function getEkgY(normalizedX) {
      // normalizedX is 0-1 within one cycle
      for (let i = 0; i < ekgPoints.length - 1; i++) {
        const [x0, y0] = ekgPoints[i]
        const [x1, y1] = ekgPoints[i + 1]
        if (normalizedX >= x0 && normalizedX <= x1) {
          const t = (normalizedX - x0) / (x1 - x0)
          // Smooth interpolation
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

    function draw(timestamp) {
      const pct = Math.min(depth / maxDepth, 1)
      const w = state.width
      const h = state.height
      state.time = timestamp * 0.001

      ctx.clearRect(0, 0, w, h)

      // --- 1. Background gradient ---
      const topColor = lerpRGB([22, 42, 69], [10, 18, 34], pct)
      const botColor = lerpRGB([10, 24, 42], [6, 14, 26], pct)
      const bgGrad = ctx.createLinearGradient(0, 0, 0, h)
      bgGrad.addColorStop(0, `rgb(${topColor.join(',')})`)
      bgGrad.addColorStop(1, `rgb(${botColor.join(',')})`)
      ctx.fillStyle = bgGrad
      ctx.fillRect(0, 0, w, h)

      // --- 2. Grid lines (horizontal only for perf) ---
      const gridOpacity = 0.03 + pct * 0.03
      ctx.strokeStyle = `rgba(0, 200, 230, ${gridOpacity})`
      ctx.lineWidth = 0.5
      ctx.beginPath()
      for (let y = 0; y < h; y += 60) {
        ctx.moveTo(0, y)
        ctx.lineTo(w, y)
      }
      ctx.stroke()

      // --- 3. Ambient light from top ---
      const ambientOpacity = 0.08 - pct * 0.05
      if (ambientOpacity > 0.005) {
        const ambGrad = ctx.createRadialGradient(w * 0.5, 0, 0, w * 0.5, 0, h * 0.45)
        ambGrad.addColorStop(0, `rgba(0, 229, 255, ${ambientOpacity})`)
        ambGrad.addColorStop(1, 'rgba(0, 229, 255, 0)')
        ctx.fillStyle = ambGrad
        ctx.fillRect(0, 0, w, h * 0.5)
      }

      // --- 4. EKG heartbeat line ---
      const ekgY = h * 0.48
      const ekgHeight = 30
      const cycleWidth = 220
      const ekgAlpha = 0.05 + pct * 0.05
      state.ekgOffset = (state.ekgOffset + 0.4) % cycleWidth

      ctx.strokeStyle = `rgba(0, 229, 255, ${ekgAlpha})`
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

      // --- 5. Floating particles ---
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
        ctx.shadowColor = 'rgba(0, 229, 255, 0.6)'
        ctx.shadowBlur = 6
        ctx.fillStyle = 'rgba(0, 220, 240, 0.9)'
        ctx.beginPath()
        ctx.arc(px, py, r, 0, Math.PI * 2)
        ctx.fill()
      }
      ctx.restore()

      // --- 6. Room doors (left side) ---
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
        }
      }

      // --- 7. Depth markers (right side) ---
      ctx.textAlign = 'right'
      ctx.textBaseline = 'middle'
      ctx.font = 'bold 9px "SF Mono", "Fira Code", "Cascadia Code", monospace'

      for (const marker of depthMarkers) {
        const my = ((marker.at / maxDepth) * 0.80 + 0.08) * h
        const isActive = depth >= marker.at
        const markerAlpha = isActive ? 0.7 : 0.08

        // Tick mark
        ctx.strokeStyle = `rgba(0, 229, 255, ${markerAlpha})`
        ctx.lineWidth = 1
        ctx.beginPath()
        ctx.moveTo(w - 70, my)
        ctx.lineTo(w - 56, my)
        ctx.stroke()

        // Glow for active
        if (isActive) {
          ctx.shadowColor = 'rgba(0, 229, 255, 0.5)'
          ctx.shadowBlur = 8
        }

        ctx.fillStyle = `rgba(0, 229, 255, ${markerAlpha})`
        ctx.fillText(marker.label, w - 12, my)

        ctx.shadowColor = 'transparent'
        ctx.shadowBlur = 0
      }

      // --- 8. Scanline overlay ---
      ctx.fillStyle = 'rgba(0, 229, 255, 0.008)'
      for (let y = 0; y < h; y += 4) {
        ctx.fillRect(0, y, w, 1)
      }

      // --- 9. Vignette ---
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
