// HospitalScene - Cross-section hospital skyscraper
// Camera scrolls DOWN through floors as questions are answered
// Each floor is a distinct room with pixel art from muchopixels tileset

import { useRef, useEffect } from 'react'

// ── Sprite sheets ─────────────────────────────────
const SHEET_SRCS = {
  ext: '/sprites/mp-exteriors.png',
  lob: '/sprites/mp-lobby.png',
  pat: '/sprites/mp-patient.png',
  rad: '/sprites/mp-radiology.png',
  ofc: '/sprites/mp-office.png',
  wal: '/sprites/mp-walls.png',
  bg:  '/sprites/mp-background.png',
}

// ── Floor palettes (BRIGHT, like the tileset promo) ─
const FLOORS = [
  { name: 'ROOF',  top: '#7EC8E3', mid: '#A8D8EA', bot: '#C8E6F0', wall: '#808898', tile: '#90A4AE' },
  { name: 'LOBBY', top: '#FFF3E0', mid: '#FFE8CC', bot: '#FFE0B2', wall: '#D7CCC8', tile: '#BCAAA4' },
  { name: 'WARD',  top: '#E0F2F1', mid: '#B2DFDB', bot: '#80CBC4', wall: '#B0BEC5', tile: '#90A4AE' },
  { name: 'ICU',   top: '#E3F2FD', mid: '#BBDEFB', bot: '#90CAF9', wall: '#90A4AE', tile: '#78909C' },
  { name: 'OR',    top: '#E8F5E9', mid: '#C8E6C9', bot: '#A5D6A7', wall: '#A5D6A7', tile: '#81C784' },
]

// ── Sprite loader ─────────────────────────────────
function loadSheets() {
  const s = {}
  for (const [k, src] of Object.entries(SHEET_SRCS)) {
    const img = new Image()
    img.src = src
    s[k] = { img, ok: false }
    img.onload = () => { s[k].ok = true }
  }
  return s
}

// Draw sprite region (crisp pixels)
function d(ctx, sh, sx, sy, sw, sh2, dx, dy, dw, dh, flip) {
  if (!sh?.ok) return
  ctx.save()
  ctx.imageSmoothingEnabled = false
  if (flip) {
    ctx.translate(dx + dw, dy)
    ctx.scale(-1, 1)
    ctx.drawImage(sh.img, sx, sy, sw, sh2, 0, 0, dw, dh)
  } else {
    ctx.drawImage(sh.img, sx, sy, sw, sh2, dx, dy, dw, dh)
  }
  ctx.restore()
}

// Tile a sprite horizontally
function dTile(ctx, sh, sx, sy, sw, sh2, x, y, totalW, dh) {
  if (!sh?.ok) return
  ctx.save()
  ctx.imageSmoothingEnabled = false
  const tileW = (sw / sh2) * dh
  for (let tx = x; tx < x + totalW; tx += tileW) {
    const drawW = Math.min(tileW, x + totalW - tx)
    const srcW = (drawW / tileW) * sw
    ctx.drawImage(sh.img, sx, sy, srcW, sh2, tx, y, drawW, dh)
  }
  ctx.restore()
}

function makeClouds() {
  return [
    { x: 0.1, y: 0.06, sp: 0.015 },
    { x: 0.5, y: 0.14, sp: 0.009 },
    { x: 0.8, y: 0.04, sp: 0.012 },
    { x: 0.3, y: 0.2,  sp: 0.02 },
  ]
}

// ═══════════════════════════════════════════════════
// COMPONENT
// ═══════════════════════════════════════════════════
export default function HospitalScene({ depth = 0, floor = 0, maxDepth = 2500 }) {
  const canvasRef = useRef(null)
  const rafRef = useRef(null)
  const floorRef = useRef(floor)
  const camRef = useRef(floor) // smooth camera position (0-4)
  const sheetsRef = useRef(null)
  const cloudsRef = useRef(makeClouds())

  floorRef.current = floor

  useEffect(() => { sheetsRef.current = loadSheets() }, [])

  useEffect(() => {
    const c = canvasRef.current
    if (!c) return
    const resize = () => {
      const dpr = window.devicePixelRatio || 1
      c.width = window.innerWidth * dpr
      c.height = window.innerHeight * dpr
      c.style.width = window.innerWidth + 'px'
      c.style.height = window.innerHeight + 'px'
    }
    resize()
    window.addEventListener('resize', resize)
    return () => window.removeEventListener('resize', resize)
  }, [])

  useEffect(() => {
    const canvas = canvasRef.current
    if (!canvas) return
    const ctx = canvas.getContext('2d')

    const frame = (t) => {
      const w = canvas.width, h = canvas.height
      const sp = sheetsRef.current

      // Smooth scroll toward target floor
      camRef.current += (floorRef.current - camRef.current) * 0.04
      const cam = camRef.current
      const camY = cam * h // virtual Y position

      ctx.clearRect(0, 0, w, h)

      // Draw visible floors
      for (let i = 0; i <= 4; i++) {
        const scrY = i * h - camY
        if (scrY > h + 20 || scrY + h < -20) continue
        drawFloor(ctx, i, scrY, w, h, t, sp, cloudsRef.current)
      }

      // Structural beams between floors
      const beamH = Math.max(10, h * 0.02)
      for (let i = 0; i < 4; i++) {
        const by = (i + 1) * h - camY
        if (by < -beamH || by > h + beamH) continue
        ctx.fillStyle = '#6a7078'
        ctx.fillRect(0, by - beamH / 2, w, beamH)
        ctx.fillStyle = '#8a929a'
        ctx.fillRect(0, by - beamH / 2, w, 2)
        ctx.fillStyle = '#4a5058'
        ctx.fillRect(0, by + beamH / 2 - 2, w, 2)
      }

      // Scanlines
      ctx.fillStyle = 'rgba(255,255,255,0.01)'
      for (let sy = 0; sy < h; sy += 4) ctx.fillRect(0, sy, w, 1)

      // Elevator indicator
      drawElevator(ctx, w, h, cam)

      rafRef.current = requestAnimationFrame(frame)
    }

    rafRef.current = requestAnimationFrame(frame)
    return () => { if (rafRef.current) cancelAnimationFrame(rafRef.current) }
  }, [maxDepth])

  return (
    <canvas ref={canvasRef}
      style={{ position: 'fixed', inset: 0, width: '100%', height: '100%', pointerEvents: 'none', zIndex: 0 }}
    />
  )
}

// ═══════════════════════════════════════════════════
// FLOOR RENDERING
// ═══════════════════════════════════════════════════

function drawFloor(ctx, idx, y, w, h, t, sp, clouds) {
  const f = FLOORS[idx]
  const grad = ctx.createLinearGradient(0, y, 0, y + h)
  grad.addColorStop(0, f.top)
  grad.addColorStop(0.5, f.mid)
  grad.addColorStop(1, f.bot)
  ctx.fillStyle = grad
  ctx.fillRect(0, y, w, h)

  switch (idx) {
    case 0: drawExterior(ctx, y, w, h, t, sp, clouds); break
    case 1: drawLobby(ctx, y, w, h, t, sp); break
    case 2: drawWard(ctx, y, w, h, t, sp); break
    case 3: drawICU(ctx, y, w, h, t, sp); break
    case 4: drawOR(ctx, y, w, h, t, sp); break
  }

  // Floor label watermark
  ctx.globalAlpha = 0.08
  ctx.font = `bold ${Math.max(36, h * 0.055) | 0}px monospace`
  ctx.fillStyle = '#000'
  ctx.textAlign = 'left'
  ctx.fillText(f.name, w * 0.08, y + h * 0.95)
  ctx.globalAlpha = 1
}

// Shared wall + floor tile renderer for interior floors
function drawRoom(ctx, y, w, h, wallColor, tileColor, sp) {
  const ww = w * 0.06

  // Walls
  ctx.fillStyle = wallColor
  ctx.fillRect(0, y, ww, h)
  ctx.fillRect(w - ww, y, ww, h)
  ctx.fillStyle = 'rgba(255,255,255,0.05)'
  ctx.fillRect(ww - 2, y, 2, h)
  ctx.fillRect(w - ww, y, 2, h)

  // Floor tiles
  const fh = h * 0.08
  ctx.fillStyle = tileColor
  ctx.fillRect(ww, y + h - fh, w - ww * 2, fh)
  // Tile floor sprite if available
  if (sp?.wal?.ok) {
    ctx.globalAlpha = 0.25
    dTile(ctx, sp.wal, 160, 64, 64, 64, ww, y + h - fh, w - ww * 2, fh)
    ctx.globalAlpha = 1
  }

  // Ceiling lights
  for (let i = 0; i < 4; i++) {
    const lx = ww + (i + 0.5) * ((w - ww * 2) / 4)
    ctx.fillStyle = 'rgba(255,255,220,0.12)'
    ctx.beginPath()
    ctx.arc(lx, y + 6, 10, 0, Math.PI * 2)
    ctx.fill()
  }
}

function S(w) { return Math.min(4.5, Math.max(2.5, w / 400)) }

// ── FLOOR 0: EXTERIOR ─────────────────────────────
function drawExterior(ctx, y, w, h, t, sp, clouds) {
  if (!sp) return
  const { ext, bg } = sp
  const s = S(w)

  // Clouds
  if (bg?.ok) {
    for (const c of clouds) {
      c.x = ((c.x * w + c.sp) % (w + 300) - 200) / w
      ctx.globalAlpha = 0.65
      const cx = c.x * w, cy = y + c.y * h
      d(ctx, bg, 128, 0, 80, 32, cx, cy, s * 22, s * 10)
    }
    ctx.globalAlpha = 1

    // Sun
    d(ctx, bg, 208, 0, 32, 32, w * 0.82, y + h * 0.04, s * 10, s * 10)
    ctx.globalAlpha = 0.06
    ctx.fillStyle = '#fff8d0'
    ctx.beginPath()
    ctx.arc(w * 0.82 + s * 5, y + h * 0.04 + s * 5, s * 18, 0, Math.PI * 2)
    ctx.fill()
    ctx.globalAlpha = 1

    // City silhouette
    ctx.globalAlpha = 0.2
    dTile(ctx, bg, 96, 48, 64, 32, 0, y + h * 0.33, w, s * 12)
    ctx.globalAlpha = 1
  }

  // Hospital building
  if (ext?.ok) {
    const bw = Math.min(w * 0.8, 288 * s * 0.9)
    const bx = (w - bw) / 2
    const fS = bw / 288

    // Shadow
    ctx.fillStyle = 'rgba(0,0,0,0.08)'
    ctx.fillRect(bx + 6, y + h * 0.28 + 6, bw, h * 0.5)

    // Building body
    ctx.fillStyle = '#909aaa'
    ctx.fillRect(bx, y + h * 0.28, bw, h * 0.5)

    // Facade bands
    ctx.globalAlpha = 0.95
    const bandH = h * 0.5 / 3
    d(ctx, ext, 0, 0, 288, 80, bx, y + h * 0.28, bw, bandH)
    d(ctx, ext, 0, 80, 288, 64, bx, y + h * 0.28 + bandH, bw, bandH)
    d(ctx, ext, 0, 144, 288, 64, bx, y + h * 0.28 + bandH * 2, bw, bandH)
    ctx.globalAlpha = 1

    // "HOSPITAL" text
    const tw = bw * 0.6, th = tw * (32 / 240)
    d(ctx, ext, 0, 272, 240, 32, w / 2 - tw / 2, y + h * 0.22, tw, th)

    // Red cross (pulsing)
    const pulse = 0.65 + 0.35 * Math.sin(t * 0.003)
    ctx.globalAlpha = pulse
    const cs = s * 10
    d(ctx, ext, 200, 208, 32, 32, w / 2 - cs / 2, y + h * 0.16, cs, cs)
    ctx.globalAlpha = pulse * 0.12
    ctx.fillStyle = '#ff4444'
    ctx.beginPath()
    ctx.arc(w / 2, y + h * 0.16 + cs / 2, cs * 1.5, 0, Math.PI * 2)
    ctx.fill()
    ctx.globalAlpha = 1

    // Window glow
    for (let r = 0; r < 3; r++) {
      for (let c = 0; c < 5; c++) {
        if (Math.sin(t * 0.0008 + r * 2.3 + c * 1.7) < -0.3) continue
        const fl = 0.4 + 0.3 * Math.sin(t * 0.002 + r + c * 3)
        ctx.globalAlpha = fl * 0.1
        ctx.fillStyle = '#ffb84d'
        const ww = bw * 0.055, wh = bandH * 0.3
        const wx = bx + bw * 0.1 + c * (bw * 0.8 / 4) - ww / 2
        const wy = y + h * 0.28 + bandH * 0.2 + r * bandH + (bandH - wh) / 2
        ctx.fillRect(wx, wy, ww, wh)
      }
    }
    ctx.globalAlpha = 1

    // Ambulances
    const aw = 144 * s * 0.5, ah = 64 * s * 0.5
    d(ctx, ext, 0, 320, 144, 64, w * 0.06, y + h * 0.82 - ah, aw, ah)
    d(ctx, ext, 0, 400, 144, 64, w * 0.6, y + h * 0.84 - ah * 0.85, aw * 0.85, ah * 0.85)

    // Ambulance lights
    if (Math.sin(t * 0.008) > 0) {
      ctx.globalAlpha = 0.5
      ctx.fillStyle = '#ff2200'
      ctx.beginPath()
      ctx.arc(w * 0.06 + aw * 0.12, y + h * 0.82 - ah - 3, 4, 0, Math.PI * 2)
      ctx.fill()
      ctx.globalAlpha = 1
    }
  }

  // Road markings
  ctx.fillStyle = '#FFD54F'
  for (let x = ((t * 0.02) % 56) - 28; x < w; x += 56) {
    ctx.fillRect(x, y + h * 0.9, 18, 3)
  }
}

// ── FLOOR 1: LOBBY ────────────────────────────────
function drawLobby(ctx, y, w, h, t, sp) {
  drawRoom(ctx, y, w, h, FLOORS[1].wall, FLOORS[1].tile, sp)
  if (!sp) return
  const { lob, wal } = sp
  const s = S(w)
  const ww = w * 0.06
  const iL = ww, iR = w - ww, iW = iR - iL

  // Cream upper wall
  ctx.fillStyle = '#F5EDE0'
  ctx.fillRect(ww, y, iW, h * 0.3)
  ctx.fillStyle = '#8D6E63'
  ctx.fillRect(ww, y + h * 0.3, iW, 4)

  // Doors
  if (wal?.ok) {
    d(ctx, wal, 64, 64, 32, 64, iL + 5, y + h * 0.06, 32 * s * 0.85, 64 * s * 0.85)
    d(ctx, wal, 32, 0, 32, 64, iR - 32 * s * 0.85 - 5, y + h * 0.06, 32 * s * 0.85, 64 * s * 0.85, true)
  }

  if (lob?.ok) {
    // Reception desk (center)
    d(ctx, lob, 0, 96, 160, 48, w / 2 - 80 * s * 0.42 / 2, y + h * 0.38, 160 * s * 0.42, 48 * s * 0.42)

    // Monitors on wall
    d(ctx, lob, 160, 64, 128, 48, w * 0.3, y + h * 0.04, 128 * s * 0.38, 48 * s * 0.38)

    // Chair rows
    const cw = 96 * s * 0.42, ch = 48 * s * 0.42
    d(ctx, lob, 0, 0, 96, 48, iL + iW * 0.03, y + h * 0.48, cw, ch)
    d(ctx, lob, 0, 0, 96, 48, iL + iW * 0.03, y + h * 0.6, cw, ch)
    d(ctx, lob, 0, 0, 96, 48, iR - cw - iW * 0.03, y + h * 0.5, cw, ch, true)

    // Vending machines
    const vw = 48 * s * 0.42, vh = 64 * s * 0.42
    d(ctx, lob, 96, 0, 48, 64, iR - vw - 8, y + h * 0.33, vw, vh)
    d(ctx, lob, 144, 0, 48, 64, iR - vw * 2 - 14, y + h * 0.33, vw, vh)
    d(ctx, lob, 192, 0, 48, 64, iL + 8, y + h * 0.33, vw, vh)

    // Bench
    d(ctx, lob, 0, 64, 96, 32, w / 2 - 48 * s * 0.4, y + h * 0.72, 96 * s * 0.4, 32 * s * 0.4)

    // Railing
    dTile(ctx, lob, 0, 160, 288, 16, ww, y + h * 0.78, iW, s * 5)
  }

  // Warm light
  const lg = ctx.createRadialGradient(w * 0.5, y, 0, w * 0.5, y, h * 0.55)
  lg.addColorStop(0, 'rgba(255,243,224,0.12)')
  lg.addColorStop(1, 'rgba(255,243,224,0)')
  ctx.fillStyle = lg
  ctx.fillRect(ww, y, iW, h)
}

// ── FLOOR 2: WARD ─────────────────────────────────
function drawWard(ctx, y, w, h, t, sp) {
  drawRoom(ctx, y, w, h, FLOORS[2].wall, FLOORS[2].tile, sp)
  if (!sp) return
  const { pat, wal, ofc } = sp
  const s = S(w)
  const ww = w * 0.06
  const iL = ww, iR = w - ww, iW = iR - iL

  // Teal accent wall
  ctx.fillStyle = '#D8EDE8'
  ctx.fillRect(ww, y, iW, h * 0.3)
  ctx.fillStyle = '#26A69A'
  ctx.fillRect(ww, y + h * 0.28, iW, 4)

  // Doors
  if (wal?.ok) {
    const dW = 32 * s * 0.85, dH = 64 * s * 0.85
    d(ctx, wal, 0, 64, 32, 64, iL + 5, y + h * 0.04, dW, dH)
    d(ctx, wal, 64, 64, 32, 64, iR - dW - 5, y + h * 0.04, dW, dH, true)
    d(ctx, wal, 32, 64, 32, 64, iL + iW * 0.35, y + h * 0.04, dW, dH)
    d(ctx, wal, 0, 0, 32, 64, iR - iW * 0.35 - dW, y + h * 0.04, dW, dH, true)
  }

  // Certificates on wall
  if (ofc?.ok) {
    d(ctx, ofc, 0, 0, 64, 32, iL + iW * 0.5, y + h * 0.03, 64 * s * 0.3, 32 * s * 0.3)
    d(ctx, ofc, 160, 0, 32, 48, iL + iW * 0.65, y + h * 0.01, 32 * s * 0.35, 48 * s * 0.35)
  }

  if (pat?.ok) {
    const bS = s * 1.3
    const bW = 32 * bS * 0.35, bH = 32 * bS * 0.35

    // Left beds + right beds
    const beds = [
      [0, 32, iL + iW * 0.03, y + h * 0.42], // blue
      [64, 32, iL + iW * 0.03, y + h * 0.57], // green
      [96, 32, iL + iW * 0.03, y + h * 0.72], // teal
      [32, 32, iR - iW * 0.03 - bW, y + h * 0.42], // red (flipped)
      [128, 32, iR - iW * 0.03 - bW, y + h * 0.57], // purple
      [160, 32, iR - iW * 0.03 - bW, y + h * 0.72], // yellow
    ]
    for (let i = 0; i < beds.length; i++) {
      const [sx, sy, bx, by] = beds[i]
      d(ctx, pat, sx, sy, 32, 32, bx, by, bW, bH, i >= 3)
    }

    // IV poles
    const ivW = 32 * bS * 0.28, ivH = 48 * bS * 0.28
    d(ctx, pat, 0, 64, 32, 48, iL + iW * 0.03 + bW + 4, y + h * 0.38, ivW, ivH)
    d(ctx, pat, 32, 64, 32, 48, iL + iW * 0.03 + bW + 4, y + h * 0.53, ivW, ivH)
    d(ctx, pat, 64, 64, 32, 48, iR - iW * 0.03 - bW - ivW - 4, y + h * 0.38, ivW, ivH)

    // Monitors center
    const mW = 64 * bS * 0.3, mH = 48 * bS * 0.3
    d(ctx, pat, 96, 64, 64, 48, w / 2 - mW / 2, y + h * 0.42, mW, mH)
    d(ctx, pat, 96, 64, 64, 48, w / 2 - mW / 2, y + h * 0.6, mW, mH)

    // EKG on monitors
    ctx.strokeStyle = 'rgba(0,220,100,0.5)'
    ctx.lineWidth = 1.5
    for (const my of [y + h * 0.42 + mH / 2, y + h * 0.6 + mH / 2]) {
      ctx.beginPath()
      for (let px = 0; px < mW - 6; px += 2) {
        const phase = ((px + t * 0.05) % 20)
        let dy = phase > 8 && phase < 10 ? -4 : phase > 10 && phase < 12 ? 6 : phase > 12 && phase < 14 ? -2 : Math.sin(px * 0.5) * 0.8
        const mx = w / 2 - mW / 2 + 3 + px
        if (px === 0) ctx.moveTo(mx, my + dy); else ctx.lineTo(mx, my + dy)
      }
      ctx.stroke()
    }

    // Chairs + plants
    d(ctx, pat, 0, 0, 192, 32, w / 2 - 96 * s * 0.2, y + h * 0.78, 192 * s * 0.2, 32 * s * 0.2)
    d(ctx, pat, 160, 64, 32, 48, iR - iW * 0.12, y + h * 0.72, 32 * s * 0.3, 48 * s * 0.3)
  }
}

// ── FLOOR 3: ICU ──────────────────────────────────
function drawICU(ctx, y, w, h, t, sp) {
  drawRoom(ctx, y, w, h, FLOORS[3].wall, FLOORS[3].tile, sp)
  if (!sp) return
  const { rad, pat, wal } = sp
  const s = S(w)
  const ww = w * 0.06
  const iL = ww, iR = w - ww, iW = iR - iL

  // Cool blue accent
  ctx.fillStyle = '#CFD8DC'
  ctx.fillRect(ww, y, iW, h * 0.28)
  ctx.fillStyle = '#5C6BC0'
  ctx.fillRect(ww, y + h * 0.26, iW, 4)

  // Doors
  if (wal?.ok) {
    d(ctx, wal, 96, 0, 64, 64, iL + 5, y + h * 0.04, 64 * s * 0.42, 64 * s * 0.42)
    d(ctx, wal, 96, 64, 64, 64, iR - 64 * s * 0.42 - 5, y + h * 0.04, 64 * s * 0.42, 64 * s * 0.42)
  }

  if (rad?.ok) {
    // Observation windows
    d(ctx, rad, 0, 0, 96, 64, iL + iW * 0.2, y + h * 0.02, 96 * s * 0.42, 64 * s * 0.42)
    d(ctx, rad, 0, 64, 96, 64, iR - iW * 0.2 - 96 * s * 0.42, y + h * 0.03, 96 * s * 0.38, 64 * s * 0.38)

    // Surgical lights
    const slW = 48 * s * 0.5, slH = 64 * s * 0.5
    d(ctx, rad, 176, 0, 48, 64, iL + iW * 0.15, y + h * 0.06, slW, slH)
    d(ctx, rad, 176, 0, 48, 64, iR - iW * 0.15 - slW, y + h * 0.06, slW, slH)

    // MRI machine (center, big)
    const mw = 96 * s * 0.6, mh = 64 * s * 0.6
    d(ctx, rad, 0, 256, 96, 64, w / 2 - mw / 2, y + h * 0.52, mw, mh)
    // MRI glow ring
    const rp = (t * 0.003) % (Math.PI * 2)
    ctx.strokeStyle = `rgba(100,181,246,${0.08 + 0.08 * Math.sin(rp)})`
    ctx.lineWidth = 3
    ctx.beginPath()
    ctx.ellipse(w / 2, y + h * 0.52 + mh / 2, mw * 0.35, mh * 0.3, 0, 0, Math.PI * 2)
    ctx.stroke()

    // Exam beds
    d(ctx, rad, 96, 16, 48, 24, iL + iW * 0.03, y + h * 0.5, 48 * s * 0.42, 24 * s * 0.42)
    d(ctx, rad, 96, 48, 48, 24, iR - 48 * s * 0.42 - iW * 0.03, y + h * 0.5, 48 * s * 0.42, 24 * s * 0.42, true)

    // X-ray screens
    const xs = 32 * s * 0.5
    d(ctx, rad, 224, 128, 32, 32, iL + iW * 0.04, y + h * 0.33, xs, xs)
    d(ctx, rad, 256, 128, 32, 32, iL + iW * 0.04 + xs + 5, y + h * 0.33, xs, xs)
    d(ctx, rad, 224, 128, 32, 32, iR - iW * 0.04 - xs, y + h * 0.33, xs, xs)
    // X-ray glow
    ctx.globalAlpha = 0.1 + 0.06 * Math.sin(t * 0.003)
    ctx.fillStyle = '#a0d0ff'
    ctx.fillRect(iL + iW * 0.04 + 2, y + h * 0.33 + 2, xs - 4, xs - 4)
    ctx.fillRect(iL + iW * 0.04 + xs + 7, y + h * 0.33 + 2, xs - 4, xs - 4)
    ctx.globalAlpha = 1

    // Scrub racks
    d(ctx, rad, 160, 224, 128, 96, iR - 128 * s * 0.3 - 10, y + h * 0.65, 128 * s * 0.3, 96 * s * 0.3)

    // IV stands
    d(ctx, rad, 0, 192, 64, 64, iL + iW * 0.3, y + h * 0.38, 64 * s * 0.38, 64 * s * 0.38)

    // Hazard symbols (pulsing)
    const hp = 0.5 + 0.5 * Math.sin(t * 0.004)
    ctx.globalAlpha = hp * 0.7
    d(ctx, rad, 160, 192, 32, 32, w / 2 - s * 5, y + h * 0.78, s * 10, s * 10)
    d(ctx, rad, 192, 192, 32, 32, w / 2 + s * 6, y + h * 0.78, s * 10, s * 10)
    ctx.globalAlpha = 1
  }

  // Status lights
  const lights = [
    { x: 0.12, c: '#00ff60', r: 0.005 }, { x: 0.35, c: '#ff4444', r: 0.007 },
    { x: 0.58, c: '#ffaa00', r: 0.004 }, { x: 0.82, c: '#00ff60', r: 0.006 },
  ]
  for (const l of lights) {
    const on = Math.sin(t * l.r + l.x * 20) > 0.3
    ctx.globalAlpha = on ? 0.55 : 0.08
    ctx.fillStyle = l.c
    ctx.beginPath()
    ctx.arc(iL + iW * l.x, y + h * 0.03, 4, 0, Math.PI * 2)
    ctx.fill()
    if (on) {
      ctx.globalAlpha = 0.05
      ctx.beginPath()
      ctx.arc(iL + iW * l.x, y + h * 0.03, 14, 0, Math.PI * 2)
      ctx.fill()
    }
  }
  ctx.globalAlpha = 1
}

// ── FLOOR 4: OR ───────────────────────────────────
function drawOR(ctx, y, w, h, t, sp) {
  drawRoom(ctx, y, w, h, FLOORS[4].wall, FLOORS[4].tile, sp)
  if (!sp) return
  const { rad, pat, wal, ofc } = sp
  const s = S(w)
  const ww = w * 0.06
  const iL = ww, iR = w - ww, iW = iR - iL

  // Green accent wall
  ctx.fillStyle = '#E0E8E4'
  ctx.fillRect(ww, y, iW, h * 0.25)
  ctx.fillStyle = '#43A047'
  ctx.fillRect(ww, y + h * 0.23, iW, 4)

  // Red emergency doors
  if (wal?.ok) {
    const dW = 32 * s * 0.9, dH = 64 * s * 0.9
    d(ctx, wal, 0, 0, 32, 64, iL + 5, y + h * 0.03, dW, dH)
    d(ctx, wal, 0, 0, 32, 64, iR - dW - 5, y + h * 0.03, dW, dH, true)
  }

  // Dramatic spotlight
  const lp = 0.85 + 0.15 * Math.sin(t * 0.002)
  const sg = ctx.createRadialGradient(w / 2, y + h * 0.08, 0, w / 2, y + h * 0.45, h * 0.45)
  sg.addColorStop(0, `rgba(255,255,245,${0.18 * lp})`)
  sg.addColorStop(0.4, `rgba(255,255,235,${0.07 * lp})`)
  sg.addColorStop(1, 'rgba(255,255,235,0)')
  ctx.fillStyle = sg
  ctx.fillRect(ww, y, iW, h)

  if (rad?.ok) {
    // Surgical lights (big, prominent)
    const slW = 48 * s * 0.65, slH = 64 * s * 0.65
    d(ctx, rad, 176, 0, 48, 64, w * 0.3 - slW / 2, y - h * 0.02, slW, slH)
    d(ctx, rad, 176, 0, 48, 64, w * 0.6 - slW / 2, y - h * 0.02, slW, slH)

    // Operating table
    d(ctx, rad, 96, 80, 48, 24, w / 2 - 48 * s * 0.6 / 2, y + h * 0.48, 48 * s * 0.6, 24 * s * 0.6)
    d(ctx, rad, 160, 144, 64, 24, w / 2 - 64 * s * 0.5 / 2, y + h * 0.55, 64 * s * 0.5, 24 * s * 0.5)

    // Observation window
    d(ctx, rad, 0, 0, 96, 64, w / 2 - 96 * s * 0.35 / 2, y + h * 0.01, 96 * s * 0.35, 64 * s * 0.35)

    // X-ray screens
    const xd = 64 * s * 0.42
    d(ctx, rad, 224, 160, 64, 32, iL + 10, y + h * 0.06, xd, xd * 0.5)
    d(ctx, rad, 224, 160, 64, 32, iR - xd - 10, y + h * 0.06, xd, xd * 0.5)

    // IV stands
    d(ctx, rad, 0, 192, 64, 64, iL + iW * 0.15, y + h * 0.38, 64 * s * 0.42, 64 * s * 0.42)
    d(ctx, rad, 0, 192, 64, 64, iR - iW * 0.15 - 64 * s * 0.42, y + h * 0.38, 64 * s * 0.42, 64 * s * 0.42, true)
  }

  if (pat?.ok) {
    // Side monitors
    d(ctx, pat, 96, 64, 64, 48, iL + 10, y + h * 0.42, 64 * s * 0.35, 48 * s * 0.35)
    d(ctx, pat, 96, 64, 64, 48, iR - 64 * s * 0.35 - 10, y + h * 0.44, 64 * s * 0.35, 48 * s * 0.35)
  }

  if (ofc?.ok) {
    d(ctx, ofc, 0, 48, 96, 32, w / 2 - 96 * s * 0.3 / 2, y + h * 0.68, 96 * s * 0.3, 32 * s * 0.3)
    d(ctx, ofc, 112, 0, 48, 48, iR - 48 * s * 0.3 - 15, y + h * 0.56, 48 * s * 0.3, 48 * s * 0.3)
  }

  // EKG line
  ctx.strokeStyle = 'rgba(0,255,100,0.25)'
  ctx.lineWidth = 2
  ctx.beginPath()
  const ekgY = y + h * 0.78
  for (let x = 0; x < w; x += 2) {
    const phase = (x + t * 0.08) % 160
    let dy = phase > 55 && phase < 60 ? -15 : phase > 60 && phase < 65 ? 20 : phase > 65 && phase < 70 ? -8 : Math.sin((x + t * 0.08) * 0.015) * 1.5
    if (x === 0) ctx.moveTo(x, ekgY + dy); else ctx.lineTo(x, ekgY + dy)
  }
  ctx.stroke()

  // Status lights (intense)
  const lights = [
    { x: 0.1, c: '#00ff60', r: 0.004 }, { x: 0.3, c: '#ff4444', r: 0.006 },
    { x: 0.5, c: '#ffaa00', r: 0.005 }, { x: 0.7, c: '#00ff60', r: 0.005 },
    { x: 0.9, c: '#ff4444', r: 0.007 },
  ]
  for (const l of lights) {
    const on = Math.sin(t * l.r + l.x * 20) > 0.2
    ctx.globalAlpha = on ? 0.5 : 0.06
    ctx.fillStyle = l.c
    ctx.beginPath()
    ctx.arc(iL + iW * l.x, y + h * 0.03, 3.5, 0, Math.PI * 2)
    ctx.fill()
  }
  ctx.globalAlpha = 1
}

// ── ELEVATOR INDICATOR ────────────────────────────
function drawElevator(ctx, w, h, cam) {
  const sx = w - 36
  const top = h * 0.18, bot = h * 0.82
  const span = bot - top

  ctx.strokeStyle = 'rgba(0,0,0,0.08)'
  ctx.lineWidth = 2
  ctx.beginPath()
  ctx.moveTo(sx, top)
  ctx.lineTo(sx, bot)
  ctx.stroke()

  const fs = Math.max(8, Math.min(13, w * 0.012)) | 0
  ctx.font = `600 ${fs}px system-ui, sans-serif`
  ctx.textAlign = 'right'

  for (let i = 0; i <= 4; i++) {
    const fy = top + (i / 4) * span
    const active = Math.abs(cam - i) < 0.3
    ctx.globalAlpha = active ? 0.8 : 0.18
    ctx.fillStyle = active ? '#26A69A' : '#607D8B'
    ctx.fillRect(sx - 5, fy - 1, 10, 2)
    ctx.fillText(FLOORS[i].name, sx - 12, fy + fs * 0.35)
    ctx.beginPath()
    ctx.arc(sx, fy, active ? 4.5 : 2, 0, Math.PI * 2)
    ctx.fill()
    if (active) {
      ctx.globalAlpha = 0.1
      ctx.strokeStyle = '#26A69A'
      ctx.lineWidth = 2
      ctx.beginPath()
      ctx.arc(sx, fy, 11, 0, Math.PI * 2)
      ctx.stroke()
    }
  }

  // Position arrow
  const curY = top + (Math.min(cam, 4) / 4) * span
  ctx.globalAlpha = 0.6
  ctx.fillStyle = '#26A69A'
  ctx.beginPath()
  ctx.moveTo(sx + 10, curY)
  ctx.lineTo(sx + 4, curY - 5)
  ctx.lineTo(sx + 4, curY + 5)
  ctx.closePath()
  ctx.fill()
  ctx.globalAlpha = 1
}
