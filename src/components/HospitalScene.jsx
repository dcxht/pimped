// HospitalScene - Hospital cross-section using ONLY muchopixels tileset art
// All backgrounds are tiled tileset textures, all sprites at correct aspect ratios
// Camera scrolls between 5 floors as questions are answered

import { useRef, useEffect } from 'react'

const SHEET_SRCS = {
  ext: '/sprites/mp-exteriors.png',   // 288x480
  lob: '/sprites/mp-lobby.png',       // 269x191
  pat: '/sprites/mp-patient.png',     // 192x221
  rad: '/sprites/mp-radiology.png',   // 304x319
  ofc: '/sprites/mp-office.png',      // 272x175
  wal: '/sprites/mp-walls.png',       // 256x223
  bg:  '/sprites/mp-background.png',  // 256x159
}

// Exact sprite regions from pixel boundary analysis [sx, sy, sw, sh]
const SP = {
  // Building facade sections (mp-exteriors)
  extTop:     [16, 16, 256, 80],
  extMid:     [16, 112, 256, 96],
  extBot:     [16, 224, 256, 64],
  extText:    [34, 295, 172, 18],
  extAmb1:    [16, 324, 160, 60],
  extAmb2:    [80, 388, 160, 60],
  extBadge:   [192, 328, 32, 51],
  // Sky (mp-background)
  bgCloud:    [128, 0, 80, 32],
  bgSun:      [208, 0, 32, 32],
  bgCity:     [96, 48, 64, 32],
  // Lobby furniture (mp-lobby)
  lobChairs:  [22, 10, 36, 54],
  lobVend:    [64, 16, 192, 48],
  lobDesk:    [20, 74, 40, 86],
  lobCounter: [64, 72, 48, 88],
  lobPanels:  [128, 72, 128, 88],
  // Patient room (mp-patient)
  patBed1:    [86, 18, 36, 30],
  patBed2:    [134, 18, 36, 30],
  patBed3:    [86, 50, 36, 30],
  patBed4:    [134, 50, 36, 30],
  patChair1:  [22, 22, 20, 26],
  patChair2:  [54, 22, 20, 26],
  patIVs:     [16, 96, 160, 48],
  patMons:    [16, 160, 80, 32],
  patPlant:   [112, 160, 16, 32],
  patTrash:   [160, 160, 15, 32],
  // Radiology (mp-radiology)
  radWin1:    [16, 21, 80, 59],
  radEquip1:  [112, 22, 48, 58],
  radLight:   [176, 28, 48, 52],
  radXray1:   [240, 12, 48, 68],
  radWin2:    [16, 85, 80, 59],
  radEquip2:  [112, 86, 48, 58],
  radLight2:  [176, 92, 48, 52],
  radXray2:   [240, 83, 32, 59],
  radBig:     [16, 147, 256, 141],
  // Walls + floor tiles (mp-walls)
  walPanel:   [96, 128, 144, 64],  // wall panel + floor tiles
  walDoorRow: [16, 16, 192, 48],   // top row of doors
  walDoor2:   [16, 64, 192, 48],   // bottom row of doors
  // Office (mp-office)
  ofcAll:     [17, 16, 238, 96],
  ofcDesk:    [27, 113, 228, 31],
}

const FLOOR_NAMES = ['ROOF', 'LOBBY', 'WARD', 'ICU', 'OR']

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

// Draw sprite at correct aspect ratio. height = dh, width computed from source aspect ratio
function drAR(ctx, sh, region, dx, dy, dh, flip) {
  if (!sh?.ok) return
  const [sx, sy, sw, sh2] = region
  const dw = (sw / sh2) * dh
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
  return dw // return computed width
}

// Draw sprite at exact dest size (may stretch)
function dr(ctx, sh, region, dx, dy, dw, dh, flip) {
  if (!sh?.ok) return
  const [sx, sy, sw, sh2] = region
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

// Tile a region horizontally
function drTile(ctx, sh, region, x, y, totalW, dh) {
  if (!sh?.ok) return
  const [sx, sy, sw, sh2] = region
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

export default function HospitalScene({ depth = 0, floor = 0, maxDepth = 2500 }) {
  const canvasRef = useRef(null)
  const rafRef = useRef(null)
  const floorRef = useRef(floor)
  const camRef = useRef(floor)
  const sheetsRef = useRef(null)

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

      camRef.current += (floorRef.current - camRef.current) * 0.04
      const cam = camRef.current
      const camY = cam * h

      ctx.clearRect(0, 0, w, h)

      // The consistent pixel scale: tileset is 256px wide, we render at ~70% of screen
      const pxScale = (w * 0.7) / 256

      for (let i = 0; i <= 4; i++) {
        const scrY = i * h - camY
        if (scrY > h + 20 || scrY + h < -20) continue
        drawFloor(ctx, i, scrY, w, h, t, sp, pxScale)
      }

      // Structural beams
      const beamH = Math.max(12, h * 0.022)
      for (let i = 0; i < 4; i++) {
        const by = (i + 1) * h - camY
        if (by < -beamH || by > h + beamH) continue
        ctx.fillStyle = '#5d5d5d'
        ctx.fillRect(0, by - beamH / 2, w, beamH)
        ctx.fillStyle = '#858585'
        ctx.fillRect(0, by - beamH / 2, w, 3)
        ctx.fillStyle = '#1a1932'
        ctx.fillRect(0, by + beamH / 2 - 2, w, 2)
      }

      // Very subtle scanlines
      ctx.fillStyle = 'rgba(0,0,0,0.012)'
      for (let sy = 0; sy < h; sy += 4) ctx.fillRect(0, sy, w, 1)

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

function drawFloor(ctx, idx, y, w, h, t, sp, px) {
  switch (idx) {
    case 0: drawExterior(ctx, y, w, h, t, sp, px); break
    default: drawInterior(ctx, idx, y, w, h, t, sp, px); break
  }
}

// Room background: tiled wall texture + tiled floor texture from tileset
function drawRoomBG(ctx, y, w, h, sp) {
  // Fill with tileset wall color as base
  ctx.fillStyle = '#c7cfdd'
  ctx.fillRect(0, y, w, h)

  // Tile the wall panel texture across the whole room
  if (sp?.wal?.ok) {
    ctx.globalAlpha = 0.6
    drTile(ctx, sp.wal, SP.walPanel, 0, y, w, h * 0.4)
    ctx.globalAlpha = 0.4
    drTile(ctx, sp.wal, SP.walPanel, 0, y + h * 0.4, w, h * 0.3)
    ctx.globalAlpha = 1

    // Floor tiles at bottom
    drTile(ctx, sp.wal, SP.walPanel, 0, y + h * 0.82, w, h * 0.18)
  }

  // Floor line
  ctx.fillStyle = '#5d5d5d'
  ctx.fillRect(0, y + h * 0.82, w, 3)
  ctx.fillStyle = '#b4b4b4'
  ctx.fillRect(0, y + h * 0.82 - 1, w, 1)

  // Side walls (darker)
  const wallW = w * 0.05
  ctx.fillStyle = '#92a1b9'
  ctx.fillRect(0, y, wallW, h)
  ctx.fillRect(w - wallW, y, wallW, h)
  ctx.fillStyle = '#b4b4b4'
  ctx.fillRect(wallW, y, 2, h)
  ctx.fillRect(w - wallW - 2, y, 2, h)
}

// ── FLOOR 0: EXTERIOR ─────────────────────────────
function drawExterior(ctx, y, w, h, t, sp, px) {
  if (!sp) return
  const { ext, bg } = sp

  // Sky from tileset blue
  ctx.fillStyle = '#0098dc'
  ctx.fillRect(0, y, w, h * 0.72)
  // Sky gradient lighter at top
  const skyG = ctx.createLinearGradient(0, y, 0, y + h * 0.72)
  skyG.addColorStop(0, 'rgba(90,185,232,0.6)')
  skyG.addColorStop(1, 'rgba(0,152,220,0)')
  ctx.fillStyle = skyG
  ctx.fillRect(0, y, w, h * 0.72)

  // Ground
  ctx.fillStyle = '#858585'
  ctx.fillRect(0, y + h * 0.72, w, h * 0.28)
  // Sidewalk
  ctx.fillStyle = '#b4b4b4'
  ctx.fillRect(0, y + h * 0.72, w, h * 0.06)

  // Clouds (correct aspect ratio)
  if (bg?.ok) {
    const drift = (t * 0.008) % (w * 1.5)
    ctx.globalAlpha = 0.65
    const cloudH = px * 12
    drAR(ctx, bg, SP.bgCloud, drift - w * 0.3, y + h * 0.05, cloudH)
    drAR(ctx, bg, SP.bgCloud, drift + w * 0.2, y + h * 0.14, cloudH * 0.75)
    drAR(ctx, bg, SP.bgCloud, drift - w * 0.1 + w * 0.6, y + h * 0.08, cloudH * 0.6)
    ctx.globalAlpha = 1

    // Sun (correct aspect ratio)
    drAR(ctx, bg, SP.bgSun, w * 0.82, y + h * 0.03, px * 12)

    // City silhouette (tiled across width)
    ctx.globalAlpha = 0.2
    drTile(ctx, bg, SP.bgCity, 0, y + h * 0.52, w, px * 12)
    ctx.globalAlpha = 1
  }

  // Hospital building - rendered at CORRECT aspect ratio
  if (ext?.ok) {
    // Building width = 256 * pxScale, centered
    const bw = 256 * px * 0.9
    const bx = (w - bw) / 2

    // Stack 3 facade sections at correct proportions
    const topH = 80 * px * 0.9
    const midH = 96 * px * 0.9
    const botH = 64 * px * 0.9
    const totalH = topH + midH + botH
    const by = y + h * 0.72 - totalH - h * 0.04 // building sits on ground

    // Building shadow
    ctx.fillStyle = 'rgba(26,25,50,0.15)'
    ctx.fillRect(bx + 8, by + 8, bw, totalH)

    // 3 facade bands at correct aspect ratios
    dr(ctx, ext, SP.extTop, bx, by, bw, topH)
    dr(ctx, ext, SP.extMid, bx, by + topH, bw, midH)
    dr(ctx, ext, SP.extBot, bx, by + topH + midH, bw, botH)

    // Window glow overlay
    for (let r = 0; r < 3; r++) {
      for (let c = 0; c < 5; c++) {
        if (Math.sin(t * 0.0008 + r * 2.3 + c * 1.7) < -0.3) continue
        const fl = 0.3 + 0.2 * Math.sin(t * 0.002 + r + c * 3)
        ctx.globalAlpha = fl * 0.08
        ctx.fillStyle = '#ffb84d'
        const ww = bw * 0.06, wh = topH * 0.35
        ctx.fillRect(bx + bw * 0.08 + c * bw * 0.18, by + r * (totalH / 3) + (totalH / 3 - wh) / 2, ww, wh)
      }
    }
    ctx.globalAlpha = 1

    // "HOSPITAL" text (correct aspect ratio)
    const textH = px * 8
    const textW = drAR(ctx, ext, SP.extText, 0, 0, 0) // just get width
    drAR(ctx, ext, SP.extText, w / 2 - (172 / 18 * textH) / 2, by - textH - px * 4, textH)

    // Ambulances at correct aspect ratio
    const ambH = px * 22
    drAR(ctx, ext, SP.extAmb1, w * 0.05, y + h * 0.72 + h * 0.02, ambH)
    drAR(ctx, ext, SP.extAmb2, w * 0.6, y + h * 0.72 + h * 0.03, ambH * 0.85)

    // Ambulance flashing light
    if (Math.sin(t * 0.008) > 0) {
      ctx.globalAlpha = 0.5
      ctx.fillStyle = '#c42430'
      ctx.beginPath()
      ctx.arc(w * 0.05 + ambH * 0.3, y + h * 0.72 + h * 0.02 - 3, 4, 0, Math.PI * 2)
      ctx.fill()
      ctx.globalAlpha = 1
    }
  }

  // Road markings on ground
  ctx.fillStyle = '#FFD54F'
  for (let x = ((t * 0.015) % 60) - 30; x < w; x += 60) {
    ctx.fillRect(x, y + h * 0.88, 20, 3)
  }
}

// ── FLOORS 1-4: INTERIOR ROOMS ────────────────────
function drawInterior(ctx, idx, y, w, h, t, sp, px) {
  drawRoomBG(ctx, y, w, h, sp)
  if (!sp) return

  const wallW = w * 0.05
  const iL = wallW + 10
  const iR = w - wallW - 10
  const iW = iR - iL

  switch (idx) {
    case 1: drawLobby(ctx, y, w, h, t, sp, px, iL, iR, iW); break
    case 2: drawWard(ctx, y, w, h, t, sp, px, iL, iR, iW); break
    case 3: drawICU(ctx, y, w, h, t, sp, px, iL, iR, iW); break
    case 4: drawOR(ctx, y, w, h, t, sp, px, iL, iR, iW); break
  }

  // Floor name watermark
  ctx.globalAlpha = 0.06
  ctx.font = `bold ${Math.max(36, h * 0.055) | 0}px monospace`
  ctx.fillStyle = '#1a1932'
  ctx.textAlign = 'left'
  ctx.fillText(FLOOR_NAMES[idx], iL, y + h * 0.95)
  ctx.globalAlpha = 1
}

// ── LOBBY ─────────────────────────────────────────
function drawLobby(ctx, y, w, h, t, sp, px, iL, iR, iW) {
  const { lob, wal } = sp

  // Orange accent stripe (from tileset palette #e07438)
  ctx.fillStyle = '#e07438'
  ctx.fillRect(iL - 10, y + h * 0.3, iW + 20, 4)

  // Doors on walls (correct aspect ratio)
  if (wal?.ok) {
    const doorH = px * 20
    drAR(ctx, wal, [16, 16, 32, 48], iL, y + h * 0.06, doorH)
    drAR(ctx, wal, [80, 16, 32, 48], iR - px * 14, y + h * 0.06, doorH, true)
  }

  if (lob?.ok) {
    // Vending machines row (top, full width, correct AR)
    const vendH = h * 0.18
    drAR(ctx, lob, SP.lobVend, iL + iW * 0.15, y + h * 0.06, vendH)

    // Waiting chairs left
    const chairH = h * 0.2
    drAR(ctx, lob, SP.lobChairs, iL + iW * 0.02, y + h * 0.42, chairH)
    drAR(ctx, lob, SP.lobChairs, iL + iW * 0.12, y + h * 0.42, chairH)

    // Reception counter (center area)
    const cntH = h * 0.3
    drAR(ctx, lob, SP.lobCounter, iL + iW * 0.35, y + h * 0.35, cntH)
    drAR(ctx, lob, SP.lobDesk, iL + iW * 0.28, y + h * 0.33, cntH)

    // Right side panels (monitors + displays)
    const panH = h * 0.3
    drAR(ctx, lob, SP.lobPanels, iL + iW * 0.55, y + h * 0.35, panH)

    // More chairs right
    drAR(ctx, lob, SP.lobChairs, iR - iW * 0.14, y + h * 0.56, chairH * 0.8, true)
  }
}

// ── WARD ──────────────────────────────────────────
function drawWard(ctx, y, w, h, t, sp, px, iL, iR, iW) {
  const { pat, wal, ofc } = sp

  // Green accent stripe
  ctx.fillStyle = '#5ac54f'
  ctx.fillRect(iL - 10, y + h * 0.28, iW + 20, 4)

  // Doors
  if (wal?.ok) {
    const doorH = px * 18
    drAR(ctx, wal, [16, 64, 32, 48], iL, y + h * 0.05, doorH)
    drAR(ctx, wal, [48, 64, 32, 48], iL + iW * 0.22, y + h * 0.05, doorH)
    drAR(ctx, wal, [80, 64, 32, 48], iR - px * 12, y + h * 0.05, doorH, true)
    drAR(ctx, wal, [16, 16, 32, 48], iR - iW * 0.22 - px * 12, y + h * 0.05, doorH, true)
  }

  // Office decorations on wall
  if (ofc?.ok) {
    const decH = h * 0.14
    drAR(ctx, ofc, SP.ofcAll, iL + iW * 0.25, y + h * 0.03, decH)
  }

  if (pat?.ok) {
    const bedH = px * 14

    // Left beds (2 stacked)
    drAR(ctx, pat, SP.patBed1, iL + iW * 0.02, y + h * 0.38, bedH)
    drAR(ctx, pat, SP.patBed3, iL + iW * 0.02, y + h * 0.56, bedH)

    // Right beds (2 stacked, flipped)
    const bw = drAR(ctx, pat, SP.patBed2, 0, 0, 0) || px * 17
    drAR(ctx, pat, SP.patBed2, iR - iW * 0.02 - bw, y + h * 0.38, bedH, true)
    drAR(ctx, pat, SP.patBed4, iR - iW * 0.02 - bw, y + h * 0.56, bedH, true)

    // IV poles (center, full bank)
    const ivH = h * 0.16
    drAR(ctx, pat, SP.patIVs, iL + iW * 0.25, y + h * 0.33, ivH)

    // Monitors (center)
    const monH = h * 0.1
    const monW = drAR(ctx, pat, SP.patMons, w / 2 - iW * 0.15, y + h * 0.58, monH)

    // EKG squiggle on monitors
    if (monW) {
      ctx.strokeStyle = 'rgba(90,197,79,0.6)'
      ctx.lineWidth = 1.5
      ctx.beginPath()
      const mx0 = w / 2 - iW * 0.15 + 4
      const my0 = y + h * 0.58 + monH / 2
      for (let p = 0; p < (monW || 60) - 8; p += 2) {
        const ph = ((p + t * 0.05) % 20)
        let dy = ph > 8 && ph < 10 ? -4 : ph > 10 && ph < 12 ? 6 : ph > 12 && ph < 14 ? -2 : Math.sin(p * 0.5) * 0.8
        if (p === 0) ctx.moveTo(mx0 + p, my0 + dy); else ctx.lineTo(mx0 + p, my0 + dy)
      }
      ctx.stroke()
    }

    // Chairs
    drAR(ctx, pat, SP.patChair1, iL + iW * 0.4, y + h * 0.72, px * 10)
    drAR(ctx, pat, SP.patChair2, iL + iW * 0.48, y + h * 0.72, px * 10)

    // Plant + trash
    drAR(ctx, pat, SP.patPlant, iL + iW * 0.6, y + h * 0.68, px * 12)
    drAR(ctx, pat, SP.patTrash, iR - iW * 0.08, y + h * 0.68, px * 12)
  }
}

// ── ICU ───────────────────────────────────────────
function drawICU(ctx, y, w, h, t, sp, px, iL, iR, iW) {
  const { rad, pat, wal } = sp

  // Cyan accent
  ctx.fillStyle = '#00cdf9'
  ctx.fillRect(iL - 10, y + h * 0.26, iW + 20, 4)

  // Doors
  if (wal?.ok) {
    const doorH = px * 20
    drAR(ctx, wal, [112, 16, 48, 48], iL, y + h * 0.04, doorH)
    drAR(ctx, wal, [112, 64, 48, 48], iR - px * 20, y + h * 0.04, doorH)
  }

  if (rad?.ok) {
    // Observation windows (correct AR)
    const winH = px * 22
    drAR(ctx, rad, SP.radWin1, iL + iW * 0.15, y + h * 0.03, winH)
    drAR(ctx, rad, SP.radWin2, iR - iW * 0.15 - px * 30, y + h * 0.04, winH)

    // Surgical lights
    const ltH = px * 20
    drAR(ctx, rad, SP.radLight, iL + iW * 0.08, y + h * 0.01, ltH)
    drAR(ctx, rad, SP.radLight2, iR - iW * 0.08 - px * 18, y + h * 0.02, ltH)

    // X-ray screens
    const xrH = px * 24
    drAR(ctx, rad, SP.radXray1, iL + iW * 0.35, y + h * 0.02, xrH)
    drAR(ctx, rad, SP.radXray2, iR - iW * 0.35 - px * 10, y + h * 0.04, xrH * 0.8)

    // X-ray glow
    ctx.globalAlpha = 0.06 + 0.04 * Math.sin(t * 0.003)
    ctx.fillStyle = '#00cdf9'
    const xrW = (48 / 68) * xrH
    ctx.fillRect(iL + iW * 0.35 + 2, y + h * 0.02 + 2, xrW - 4, xrH - 4)
    ctx.globalAlpha = 1

    // Equipment clusters
    const eqH = px * 22
    drAR(ctx, rad, SP.radEquip1, iL + iW * 0.08, y + h * 0.42, eqH)
    drAR(ctx, rad, SP.radEquip2, iR - iW * 0.08 - px * 18, y + h * 0.42, eqH, true)

    // BIG area (MRI + scrubs + hazard - the large composite from radiology sheet)
    const bigH = h * 0.38
    drAR(ctx, rad, SP.radBig, iL + iW * 0.1, y + h * 0.42, bigH)
  }

  // Patient monitors
  if (pat?.ok) {
    const monH = h * 0.08
    drAR(ctx, pat, SP.patMons, iL + iW * 0.02, y + h * 0.33, monH)
    drAR(ctx, pat, SP.patMons, iR - iW * 0.02 - px * 20, y + h * 0.35, monH)
  }

  // Status lights
  const lights = [[0.15, '#5ac54f'], [0.35, '#c42430'], [0.55, '#00cdf9'], [0.75, '#5ac54f'], [0.9, '#c42430']]
  for (let i = 0; i < lights.length; i++) {
    const on = Math.sin(t * 0.005 + i * 2.3) > 0.3
    ctx.globalAlpha = on ? 0.55 : 0.08
    ctx.fillStyle = lights[i][1]
    ctx.beginPath()
    ctx.arc(iL + iW * lights[i][0], y + h * 0.03, 4, 0, Math.PI * 2)
    ctx.fill()
  }
  ctx.globalAlpha = 1
}

// ── OR ────────────────────────────────────────────
function drawOR(ctx, y, w, h, t, sp, px, iL, iR, iW) {
  const { rad, pat, wal, ofc } = sp

  // Red accent
  ctx.fillStyle = '#c42430'
  ctx.fillRect(iL - 10, y + h * 0.24, iW + 20, 4)

  // Red doors
  if (wal?.ok) {
    const doorH = px * 20
    drAR(ctx, wal, [16, 16, 32, 48], iL, y + h * 0.04, doorH)
    drAR(ctx, wal, [16, 16, 32, 48], iR - px * 14, y + h * 0.04, doorH, true)
  }

  // Spotlight
  const lp = 0.85 + 0.15 * Math.sin(t * 0.002)
  const sg = ctx.createRadialGradient(w / 2, y + h * 0.1, 0, w / 2, y + h * 0.5, h * 0.4)
  sg.addColorStop(0, `rgba(255,255,245,${0.1 * lp})`)
  sg.addColorStop(1, 'rgba(255,255,245,0)')
  ctx.fillStyle = sg
  ctx.fillRect(iL, y, iW, h)

  if (rad?.ok) {
    // Surgical lights (big)
    const ltH = px * 24
    drAR(ctx, rad, SP.radLight, w * 0.3 - px * 12, y - h * 0.01, ltH)
    drAR(ctx, rad, SP.radLight2, w * 0.6 - px * 12, y, ltH)

    // Windows
    const winH = px * 18
    drAR(ctx, rad, SP.radWin1, iL + iW * 0.32, y + h * 0.02, winH)

    // X-ray screens flanking
    const xrH = px * 20
    drAR(ctx, rad, SP.radXray1, iL + 5, y + h * 0.06, xrH)
    drAR(ctx, rad, SP.radXray2, iR - px * 10 - 5, y + h * 0.08, xrH * 0.75)

    // Equipment
    const eqH = px * 22
    drAR(ctx, rad, SP.radEquip1, iL + iW * 0.1, y + h * 0.38, eqH)
    drAR(ctx, rad, SP.radEquip2, iR - iW * 0.1 - px * 18, y + h * 0.38, eqH, true)

    // Big area (MRI etc)
    const bigH = h * 0.32
    drAR(ctx, rad, SP.radBig, iL + iW * 0.15, y + h * 0.46, bigH)
  }

  if (pat?.ok) {
    drAR(ctx, pat, SP.patMons, iL + 5, y + h * 0.4, h * 0.08)
    drAR(ctx, pat, SP.patMons, iR - px * 20 - 5, y + h * 0.42, h * 0.08)
    drAR(ctx, pat, SP.patIVs, iL + iW * 0.3, y + h * 0.33, h * 0.14)
  }

  if (ofc?.ok) {
    drAR(ctx, ofc, SP.ofcDesk, iL + iW * 0.3, y + h * 0.72, h * 0.08)
  }

  // EKG
  ctx.strokeStyle = 'rgba(90,197,79,0.25)'
  ctx.lineWidth = 2
  ctx.beginPath()
  const ekgY = y + h * 0.78
  for (let x = 0; x < w; x += 2) {
    const ph = (x + t * 0.08) % 160
    let dy = ph > 55 && ph < 60 ? -15 : ph > 60 && ph < 65 ? 20 : ph > 65 && ph < 70 ? -8 : Math.sin((x + t * 0.08) * 0.015) * 1.5
    if (x === 0) ctx.moveTo(x, ekgY + dy); else ctx.lineTo(x, ekgY + dy)
  }
  ctx.stroke()

  // Status lights
  const lights = [[0.1, '#5ac54f'], [0.3, '#c42430'], [0.5, '#00cdf9'], [0.7, '#5ac54f'], [0.9, '#c42430']]
  for (let i = 0; i < lights.length; i++) {
    const on = Math.sin(t * 0.005 + i * 1.8) > 0.2
    ctx.globalAlpha = on ? 0.5 : 0.06
    ctx.fillStyle = lights[i][1]
    ctx.beginPath()
    ctx.arc(iL + iW * lights[i][0], y + h * 0.03, 3.5, 0, Math.PI * 2)
    ctx.fill()
  }
  ctx.globalAlpha = 1
}

// ── ELEVATOR ──────────────────────────────────────
function drawElevator(ctx, w, h, cam) {
  const sx = w - 36, top = h * 0.18, bot = h * 0.82, span = bot - top
  ctx.strokeStyle = 'rgba(0,0,0,0.08)'
  ctx.lineWidth = 2
  ctx.beginPath(); ctx.moveTo(sx, top); ctx.lineTo(sx, bot); ctx.stroke()

  const fs = Math.max(8, Math.min(13, w * 0.012)) | 0
  ctx.font = `600 ${fs}px system-ui, sans-serif`
  ctx.textAlign = 'right'

  for (let i = 0; i <= 4; i++) {
    const fy = top + (i / 4) * span
    const active = Math.abs(cam - i) < 0.3
    ctx.globalAlpha = active ? 0.8 : 0.18
    ctx.fillStyle = active ? '#5ac54f' : '#92a1b9'
    ctx.fillRect(sx - 5, fy - 1, 10, 2)
    ctx.fillText(FLOOR_NAMES[i], sx - 12, fy + fs * 0.35)
    ctx.beginPath(); ctx.arc(sx, fy, active ? 4.5 : 2, 0, Math.PI * 2); ctx.fill()
  }

  const curY = top + (Math.min(cam, 4) / 4) * span
  ctx.globalAlpha = 0.6
  ctx.fillStyle = '#5ac54f'
  ctx.beginPath()
  ctx.moveTo(sx + 10, curY); ctx.lineTo(sx + 4, curY - 5); ctx.lineTo(sx + 4, curY + 5)
  ctx.closePath(); ctx.fill()
  ctx.globalAlpha = 1
}
