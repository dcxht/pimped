// HospitalScene - Cross-section hospital skyscraper
// Camera scrolls DOWN through floors as questions are answered
// All visuals from muchopixels tileset - no custom backgrounds
// Colors sampled from tileset: walls #c7cfdd, floor #858585, accents #5ac54f/#00cdf9

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

// Exact sprite regions (from pixel analysis - content starts at ~16px border)
// Format: [sx, sy, sw, sh]
const SP = {
  // mp-exteriors
  extTop:     [16, 16, 256, 80],    // glass window ceiling
  extMid:     [16, 112, 256, 96],   // facade with orange accent
  extBot:     [16, 224, 256, 64],   // blue panels + entrance
  extText:    [34, 295, 172, 18],   // "HOSPITAL" text (individual letters)
  extAmb1:    [16, 324, 160, 60],   // ambulance white/red
  extAmb2:    [80, 388, 160, 60],   // ambulance blue
  extBadge:   [192, 328, 32, 51],   // star of life badge

  // mp-background
  bgCloud:    [128, 0, 80, 32],     // cloud
  bgSun:      [208, 0, 32, 32],     // sun
  bgCity:     [96, 48, 64, 32],     // city silhouette

  // mp-lobby
  lobChairs:  [22, 10, 36, 54],     // waiting chair group
  lobVend:    [64, 16, 192, 48],    // vending machines row
  lobDesk:    [20, 74, 40, 86],     // reception side piece
  lobCounter: [64, 72, 48, 88],     // counter/desk
  lobPanels:  [128, 72, 128, 88],   // monitors + dark panels + display

  // mp-patient
  patChair1:  [22, 22, 20, 26],     // red/blue chair
  patChair2:  [54, 22, 20, 26],     // green/purple chair
  patBed1:    [86, 18, 36, 30],     // bed variant 1 (green/blue)
  patBed2:    [134, 18, 36, 30],    // bed variant 2 (teal/red)
  patChair3:  [22, 54, 20, 26],     // chair variant 3
  patChair4:  [54, 54, 20, 26],     // chair variant 4
  patBed3:    [86, 50, 36, 30],     // bed variant 3
  patBed4:    [134, 50, 36, 30],    // bed variant 4
  patIVs:     [16, 96, 160, 48],    // IV pole stands (all together)
  patMons:    [16, 160, 80, 32],    // monitor bank
  patPlant:   [112, 160, 16, 32],   // plant
  patTrash:   [160, 160, 15, 32],   // trash can

  // mp-radiology
  radWin1:    [16, 21, 80, 59],     // observation window 1
  radEquip1:  [112, 22, 48, 58],    // exam equipment cluster
  radLight:   [176, 28, 48, 52],    // surgical light
  radXray1:   [240, 12, 48, 68],    // x-ray screen + equipment
  radWin2:    [16, 85, 80, 59],     // observation window 2
  radEquip2:  [112, 86, 48, 58],    // more equipment
  radLight2:  [176, 92, 48, 52],    // second light
  radXray2:   [240, 83, 32, 59],    // x-ray screen 2
  radBigArea: [16, 147, 256, 141],  // MRI + scrubs + hazard (large composite)

  // mp-walls
  walDoors:   [16, 16, 192, 96],    // all doors (2 rows of doors)
  walDoorTop: [16, 16, 192, 48],    // top row doors only
  walDoorBot: [16, 64, 192, 48],    // bottom row doors only
  walTiles:   [96, 128, 144, 64],   // floor tiles + wall panel
  walSmall:   [16, 133, 72, 59],    // small decorative items

  // mp-office
  ofcTop:     [17, 16, 238, 96],    // certificates, bookshelf, anatomy, plants
  ofcBot:     [27, 113, 228, 31],   // desk + chairs
}

// Floor names for elevator
const FLOOR_NAMES = ['ROOF', 'LOBBY', 'WARD', 'ICU', 'OR']

// Tileset palette colors (sampled from actual sprites)
const WALL_COLOR = '#c7cfdd'  // light concrete
const WALL_DARK = '#92a1b9'   // darker concrete
const FLOOR_COLOR = '#858585' // floor gray
const FLOOR_DARK = '#5d5d5d'  // shadow gray
const FLOOR_LIGHT = '#b4b4b4' // highlight gray
const ACCENT_GREEN = '#5ac54f'
const ACCENT_CYAN = '#00cdf9'
const ACCENT_RED = '#c42430'
const DARK_BG = '#1a1932'

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

// Tile a sprite region horizontally
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

      for (let i = 0; i <= 4; i++) {
        const scrY = i * h - camY
        if (scrY > h + 20 || scrY + h < -20) continue
        drawFloor(ctx, i, scrY, w, h, t, sp)
      }

      // Structural beams between floors
      const beamH = Math.max(12, h * 0.022)
      for (let i = 0; i < 4; i++) {
        const by = (i + 1) * h - camY
        if (by < -beamH || by > h + beamH) continue
        ctx.fillStyle = FLOOR_DARK
        ctx.fillRect(0, by - beamH / 2, w, beamH)
        ctx.fillStyle = FLOOR_COLOR
        ctx.fillRect(0, by - beamH / 2, w, 3)
        ctx.fillStyle = DARK_BG
        ctx.fillRect(0, by + beamH / 2 - 2, w, 2)
      }

      // Scanlines (very subtle)
      ctx.fillStyle = 'rgba(0,0,0,0.015)'
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

function drawFloor(ctx, idx, y, w, h, t, sp) {
  switch (idx) {
    case 0: drawExterior(ctx, y, w, h, t, sp); break
    case 1: drawLobby(ctx, y, w, h, t, sp); break
    case 2: drawWard(ctx, y, w, h, t, sp); break
    case 3: drawICU(ctx, y, w, h, t, sp); break
    case 4: drawOR(ctx, y, w, h, t, sp); break
  }
}

// Draw a room interior using tileset palette + tiled floor
function drawRoom(ctx, y, w, h, accentColor, sp) {
  const wallW = w * 0.06

  // Wall fill (tileset concrete color)
  ctx.fillStyle = WALL_COLOR
  ctx.fillRect(0, y, w, h)

  // Side walls (darker concrete)
  ctx.fillStyle = WALL_DARK
  ctx.fillRect(0, y, wallW, h)
  ctx.fillRect(w - wallW, y, wallW, h)

  // Wall inner edge highlight
  ctx.fillStyle = FLOOR_LIGHT
  ctx.fillRect(wallW, y, 2, h)
  ctx.fillRect(w - wallW - 2, y, 2, h)

  // Floor area (bottom 12%)
  const floorH = h * 0.12
  ctx.fillStyle = FLOOR_COLOR
  ctx.fillRect(wallW, y + h - floorH, w - wallW * 2, floorH)

  // Tile floor texture from tileset
  if (sp?.wal?.ok) {
    ctx.globalAlpha = 0.35
    drTile(ctx, sp.wal, SP.walTiles, wallW, y + h - floorH, w - wallW * 2, floorH)
    ctx.globalAlpha = 1
  }

  // Floor edge line
  ctx.fillStyle = FLOOR_DARK
  ctx.fillRect(wallW, y + h - floorH, w - wallW * 2, 2)

  // Accent stripe (like the green/teal stripe in the tileset promo)
  if (accentColor) {
    ctx.fillStyle = accentColor
    ctx.fillRect(wallW, y + h * 0.28, w - wallW * 2, 4)
  }
}

function sc(w) { return Math.min(4.5, Math.max(2.5, w / 400)) }

// ── FLOOR 0: EXTERIOR ─────────────────────────────
function drawExterior(ctx, y, w, h, t, sp) {
  if (!sp) return
  const { ext, bg } = sp
  const s = sc(w)

  // Sky from tileset palette (#0098dc blue)
  ctx.fillStyle = '#5bb9e8'
  ctx.fillRect(0, y, w, h * 0.75)
  // Ground
  ctx.fillStyle = FLOOR_COLOR
  ctx.fillRect(0, y + h * 0.75, w, h * 0.25)

  // Clouds from tileset
  if (bg?.ok) {
    const drift = (t * 0.01) % (w + 200)
    ctx.globalAlpha = 0.7
    dr(ctx, bg, SP.bgCloud, drift - 100, y + h * 0.06, s * 24, s * 10)
    dr(ctx, bg, SP.bgCloud, drift + w * 0.4, y + h * 0.12, s * 18, s * 8)
    dr(ctx, bg, SP.bgCloud, drift + w * 0.7, y + h * 0.04, s * 20, s * 9)
    ctx.globalAlpha = 1

    // Sun
    dr(ctx, bg, SP.bgSun, w * 0.82, y + h * 0.03, s * 10, s * 10)

    // City silhouette
    ctx.globalAlpha = 0.25
    drTile(ctx, bg, SP.bgCity, 0, y + h * 0.42, w, s * 10)
    ctx.globalAlpha = 1
  }

  // Hospital building facade (centered, using all 3 bands)
  if (ext?.ok) {
    const bw = Math.min(w * 0.78, 256 * s * 0.85)
    const bx = (w - bw) / 2
    const bandH = h * 0.15

    // 3 facade sections stacked
    dr(ctx, ext, SP.extTop, bx, y + h * 0.28, bw, bandH)
    dr(ctx, ext, SP.extMid, bx, y + h * 0.28 + bandH, bw, bandH * 1.2)
    dr(ctx, ext, SP.extBot, bx, y + h * 0.28 + bandH * 2.2, bw, bandH * 0.8)

    // "HOSPITAL" text
    const tw = bw * 0.5, th = tw * (18 / 172)
    dr(ctx, ext, SP.extText, w / 2 - tw / 2, y + h * 0.24, tw, th)

    // Ambulance
    const aw = s * 48, ah = aw * (60 / 160)
    dr(ctx, ext, SP.extAmb1, w * 0.08, y + h * 0.78, aw, ah)
    dr(ctx, ext, SP.extAmb2, w * 0.62, y + h * 0.8, aw * 0.85, ah * 0.85)

    // Star of life badge
    dr(ctx, ext, SP.extBadge, w * 0.88, y + h * 0.72, s * 10, s * 16)
  }

  // Road markings
  ctx.fillStyle = '#FFD54F'
  for (let x = ((t * 0.02) % 56) - 28; x < w; x += 56) {
    ctx.fillRect(x, y + h * 0.88, 18, 3)
  }
}

// ── FLOOR 1: LOBBY ────────────────────────────────
function drawLobby(ctx, y, w, h, t, sp) {
  drawRoom(ctx, y, w, h, '#e07438', sp) // orange accent like tileset
  if (!sp) return
  const { lob, wal } = sp
  const s = sc(w)
  const ww = w * 0.06
  const iW = w - ww * 2

  // Doors on walls (from tileset)
  if (wal?.ok) {
    // Top row doors on walls
    const dh = s * 20
    const dw = dh * (192 / 48)
    // Single door on left wall
    dr(ctx, wal, [16, 16, 32, 48], ww + 5, y + h * 0.08, s * 12, s * 18)
    // Single door on right wall
    dr(ctx, wal, [80, 16, 32, 48], w - ww - s * 12 - 5, y + h * 0.08, s * 12, s * 18)
  }

  if (lob?.ok) {
    // Vending machines row (top of room, against wall)
    const vendW = iW * 0.65, vendH = vendW * (48 / 192)
    dr(ctx, lob, SP.lobVend, ww + iW * 0.02, y + h * 0.08, vendW, vendH)

    // Waiting chairs (left side)
    const chW = s * 14, chH = chW * (54 / 36)
    dr(ctx, lob, SP.lobChairs, ww + iW * 0.03, y + h * 0.42, chW, chH)
    dr(ctx, lob, SP.lobChairs, ww + iW * 0.12, y + h * 0.42, chW, chH)

    // Reception desk piece
    const deskW = s * 16, deskH = deskW * (86 / 40)
    dr(ctx, lob, SP.lobDesk, ww + iW * 0.35, y + h * 0.35, deskW, deskH)

    // Counter
    const cntW = s * 18, cntH = cntW * (88 / 48)
    dr(ctx, lob, SP.lobCounter, ww + iW * 0.45, y + h * 0.33, cntW, cntH)

    // Right panels (monitors + displays)
    const panW = iW * 0.42, panH = panW * (88 / 128)
    dr(ctx, lob, SP.lobPanels, ww + iW * 0.55, y + h * 0.33, panW, panH)

    // More chairs on right
    dr(ctx, lob, SP.lobChairs, w - ww - iW * 0.15, y + h * 0.56, chW, chH)
    dr(ctx, lob, SP.lobChairs, w - ww - iW * 0.06, y + h * 0.56, chW, chH)
  }
}

// ── FLOOR 2: WARD ─────────────────────────────────
function drawWard(ctx, y, w, h, t, sp) {
  drawRoom(ctx, y, w, h, ACCENT_GREEN, sp) // green accent
  if (!sp) return
  const { pat, wal, ofc } = sp
  const s = sc(w)
  const ww = w * 0.06
  const iW = w - ww * 2

  // Doors
  if (wal?.ok) {
    dr(ctx, wal, [16, 16, 32, 48], ww + 5, y + h * 0.06, s * 12, s * 18)
    dr(ctx, wal, [48, 16, 32, 48], ww + iW * 0.25, y + h * 0.06, s * 12, s * 18)
    dr(ctx, wal, [80, 16, 32, 48], w - ww - s * 12 - 5, y + h * 0.06, s * 12, s * 18)
    dr(ctx, wal, [16, 64, 32, 48], w - ww - iW * 0.25 - s * 12, y + h * 0.06, s * 12, s * 18)
  }

  // Office decorations on wall
  if (ofc?.ok) {
    const decW = iW * 0.45, decH = decW * (96 / 238)
    dr(ctx, ofc, SP.ofcTop, ww + iW * 0.28, y + h * 0.03, decW, decH)
  }

  if (pat?.ok) {
    // Beds - LEFT side (2 beds stacked)
    const bedW = s * 14, bedH = bedW * (30 / 36)
    dr(ctx, pat, SP.patBed1, ww + iW * 0.03, y + h * 0.38, bedW, bedH)
    dr(ctx, pat, SP.patBed3, ww + iW * 0.03, y + h * 0.55, bedW, bedH)

    // Beds - RIGHT side (2 beds stacked, flipped)
    dr(ctx, pat, SP.patBed2, w - ww - iW * 0.03 - bedW, y + h * 0.38, bedW, bedH, true)
    dr(ctx, pat, SP.patBed4, w - ww - iW * 0.03 - bedW, y + h * 0.55, bedW, bedH, true)

    // IV poles (the whole row, centered)
    const ivW = iW * 0.5, ivH = ivW * (48 / 160)
    dr(ctx, pat, SP.patIVs, ww + iW * 0.25, y + h * 0.35, ivW, ivH)

    // Monitor bank (center)
    const monW = iW * 0.3, monH = monW * (32 / 80)
    dr(ctx, pat, SP.patMons, ww + iW * 0.35, y + h * 0.6, monW, monH)

    // EKG squiggle on monitors
    ctx.strokeStyle = `rgba(90,197,79,0.6)`
    ctx.lineWidth = 1.5
    ctx.beginPath()
    const monLeft = ww + iW * 0.35 + 4
    const monMid = y + h * 0.6 + monH / 2
    for (let px = 0; px < monW - 8; px += 2) {
      const phase = ((px + t * 0.05) % 20)
      let dy = phase > 8 && phase < 10 ? -4 : phase > 10 && phase < 12 ? 6 : phase > 12 && phase < 14 ? -2 : Math.sin(px * 0.5) * 0.8
      if (px === 0) ctx.moveTo(monLeft + px, monMid + dy)
      else ctx.lineTo(monLeft + px, monMid + dy)
    }
    ctx.stroke()

    // Chairs along bottom
    const chW = s * 8, chH = chW * (26 / 20)
    dr(ctx, pat, SP.patChair1, ww + iW * 0.15, y + h * 0.72, chW, chH)
    dr(ctx, pat, SP.patChair2, ww + iW * 0.22, y + h * 0.72, chW, chH)
    dr(ctx, pat, SP.patChair3, w - ww - iW * 0.22, y + h * 0.72, chW, chH)
    dr(ctx, pat, SP.patChair4, w - ww - iW * 0.15, y + h * 0.72, chW, chH)

    // Plant + trash
    const smS = s * 6
    dr(ctx, pat, SP.patPlant, ww + iW * 0.5, y + h * 0.7, smS, smS * 2)
    dr(ctx, pat, SP.patTrash, w - ww - iW * 0.1, y + h * 0.72, smS, smS * 2)
  }
}

// ── FLOOR 3: ICU ──────────────────────────────────
function drawICU(ctx, y, w, h, t, sp) {
  drawRoom(ctx, y, w, h, ACCENT_CYAN, sp) // cyan accent
  if (!sp) return
  const { rad, pat, wal } = sp
  const s = sc(w)
  const ww = w * 0.06
  const iW = w - ww * 2

  // Double door
  if (wal?.ok) {
    dr(ctx, wal, [112, 16, 48, 48], ww + 5, y + h * 0.06, s * 18, s * 18)
    dr(ctx, wal, [112, 64, 48, 48], w - ww - s * 18 - 5, y + h * 0.06, s * 18, s * 18)
  }

  if (rad?.ok) {
    // Observation windows on upper walls
    const winW = s * 28, winH = winW * (59 / 80)
    dr(ctx, rad, SP.radWin1, ww + iW * 0.02, y + h * 0.04, winW, winH)
    dr(ctx, rad, SP.radWin2, w - ww - iW * 0.02 - winW, y + h * 0.05, winW, winH)

    // Surgical lights
    const ltW = s * 16, ltH = ltW * (52 / 48)
    dr(ctx, rad, SP.radLight, ww + iW * 0.22, y + h * 0.03, ltW, ltH)
    dr(ctx, rad, SP.radLight2, w - ww - iW * 0.22 - ltW, y + h * 0.04, ltW, ltH)

    // Equipment clusters
    const eqW = s * 16, eqH = eqW * (58 / 48)
    dr(ctx, rad, SP.radEquip1, ww + iW * 0.12, y + h * 0.42, eqW, eqH)
    dr(ctx, rad, SP.radEquip2, w - ww - iW * 0.12 - eqW, y + h * 0.42, eqW, eqH, true)

    // X-ray screens
    const xrW = s * 16, xrH = xrW * (68 / 48)
    dr(ctx, rad, SP.radXray1, ww + iW * 0.35, y + h * 0.04, xrW, xrH)
    dr(ctx, rad, SP.radXray2, w - ww - iW * 0.35 - s * 10, y + h * 0.08, s * 10, s * 18)

    // X-ray screen glow
    ctx.globalAlpha = 0.08 + 0.05 * Math.sin(t * 0.003)
    ctx.fillStyle = ACCENT_CYAN
    ctx.fillRect(ww + iW * 0.35 + 3, y + h * 0.04 + 3, xrW - 6, xrH - 6)
    ctx.globalAlpha = 1

    // BIG MRI + scrubs + hazard area (the large composite)
    const bigW = iW * 0.7, bigH = bigW * (141 / 256)
    dr(ctx, rad, SP.radBigArea, ww + iW * 0.15, y + h * 0.42, bigW, bigH)

    // MRI glow ring animation
    const rp = (t * 0.003) % (Math.PI * 2)
    const mriCx = ww + iW * 0.15 + bigW * 0.19 // MRI is left side of big area
    const mriCy = y + h * 0.42 + bigH * 0.7
    ctx.strokeStyle = `rgba(0,205,249,${0.08 + 0.08 * Math.sin(rp)})`
    ctx.lineWidth = 3
    ctx.beginPath()
    ctx.ellipse(mriCx, mriCy, bigW * 0.12, bigH * 0.15, 0, 0, Math.PI * 2)
    ctx.stroke()
  }

  // Patient monitors from patient sheet
  if (pat?.ok) {
    const monW = iW * 0.22, monH = monW * (32 / 80)
    dr(ctx, pat, SP.patMons, ww + iW * 0.03, y + h * 0.35, monW, monH)
    dr(ctx, pat, SP.patMons, w - ww - iW * 0.03 - monW, y + h * 0.37, monW, monH)
  }

  // Blinking status lights
  const lights = [
    { x: 0.15, c: ACCENT_GREEN }, { x: 0.35, c: ACCENT_RED },
    { x: 0.55, c: ACCENT_CYAN }, { x: 0.75, c: ACCENT_GREEN }, { x: 0.9, c: ACCENT_RED },
  ]
  for (let li = 0; li < lights.length; li++) {
    const l = lights[li]
    const on = Math.sin(t * 0.005 + li * 2.3) > 0.3
    ctx.globalAlpha = on ? 0.6 : 0.08
    ctx.fillStyle = l.c
    ctx.beginPath()
    ctx.arc(ww + iW * l.x, y + h * 0.03, 4, 0, Math.PI * 2)
    ctx.fill()
  }
  ctx.globalAlpha = 1
}

// ── FLOOR 4: OR ───────────────────────────────────
function drawOR(ctx, y, w, h, t, sp) {
  drawRoom(ctx, y, w, h, ACCENT_RED, sp) // red accent for OR
  if (!sp) return
  const { rad, pat, wal, ofc } = sp
  const s = sc(w)
  const ww = w * 0.06
  const iW = w - ww * 2

  // Red doors
  if (wal?.ok) {
    dr(ctx, wal, [16, 16, 32, 48], ww + 5, y + h * 0.06, s * 12, s * 18)
    dr(ctx, wal, [16, 16, 32, 48], w - ww - s * 12 - 5, y + h * 0.06, s * 12, s * 18, true)
  }

  // Dramatic spotlight from above
  const lp = 0.85 + 0.15 * Math.sin(t * 0.002)
  const sg = ctx.createRadialGradient(w / 2, y + h * 0.1, 0, w / 2, y + h * 0.5, h * 0.4)
  sg.addColorStop(0, `rgba(255,255,245,${0.12 * lp})`)
  sg.addColorStop(1, 'rgba(255,255,245,0)')
  ctx.fillStyle = sg
  ctx.fillRect(ww, y, iW, h)

  if (rad?.ok) {
    // Surgical lights (prominent)
    const ltW = s * 18, ltH = ltW * (52 / 48)
    dr(ctx, rad, SP.radLight, w * 0.32 - ltW / 2, y + h * 0.01, ltW, ltH)
    dr(ctx, rad, SP.radLight2, w * 0.62 - ltW / 2, y + h * 0.02, ltW, ltH)

    // Windows
    const winW = s * 24, winH = winW * (59 / 80)
    dr(ctx, rad, SP.radWin1, ww + iW * 0.35, y + h * 0.03, winW, winH)

    // X-ray screens flanking
    const xrW = s * 14, xrH = xrW * (68 / 48)
    dr(ctx, rad, SP.radXray1, ww + 10, y + h * 0.08, xrW, xrH)
    dr(ctx, rad, SP.radXray2, w - ww - s * 10 - 10, y + h * 0.1, s * 10, s * 18)

    // Equipment clusters (operating area)
    const eqW = s * 18, eqH = eqW * (58 / 48)
    dr(ctx, rad, SP.radEquip1, ww + iW * 0.12, y + h * 0.4, eqW, eqH)
    dr(ctx, rad, SP.radEquip2, w - ww - iW * 0.12 - eqW, y + h * 0.4, eqW, eqH, true)

    // Central equipment (MRI/surgical area from big composite)
    const bigW = iW * 0.55, bigH = bigW * (141 / 256)
    dr(ctx, rad, SP.radBigArea, ww + iW * 0.22, y + h * 0.45, bigW, bigH)
  }

  // Monitors
  if (pat?.ok) {
    const monW = iW * 0.2, monH = monW * (32 / 80)
    dr(ctx, pat, SP.patMons, ww + 10, y + h * 0.38, monW, monH)
    dr(ctx, pat, SP.patMons, w - ww - monW - 10, y + h * 0.4, monW, monH)

    // IV poles
    const ivW = iW * 0.3, ivH = ivW * (48 / 160)
    dr(ctx, pat, SP.patIVs, ww + iW * 0.35, y + h * 0.35, ivW, ivH)
  }

  // Office desk
  if (ofc?.ok) {
    const dW = iW * 0.35, dH = dW * (31 / 228)
    dr(ctx, ofc, SP.ofcBot, ww + iW * 0.32, y + h * 0.72, dW, dH)
  }

  // EKG line
  ctx.strokeStyle = `rgba(90,197,79,0.3)`
  ctx.lineWidth = 2
  ctx.beginPath()
  const ekgY = y + h * 0.78
  for (let x = 0; x < w; x += 2) {
    const phase = (x + t * 0.08) % 160
    let dy = phase > 55 && phase < 60 ? -15 : phase > 60 && phase < 65 ? 20 : phase > 65 && phase < 70 ? -8 : Math.sin((x + t * 0.08) * 0.015) * 1.5
    if (x === 0) ctx.moveTo(x, ekgY + dy); else ctx.lineTo(x, ekgY + dy)
  }
  ctx.stroke()

  // Status lights
  const lights = [
    { x: 0.1, c: ACCENT_GREEN }, { x: 0.3, c: ACCENT_RED },
    { x: 0.5, c: ACCENT_CYAN }, { x: 0.7, c: ACCENT_GREEN }, { x: 0.9, c: ACCENT_RED },
  ]
  for (let li = 0; li < lights.length; li++) {
    const on = Math.sin(t * 0.005 + li * 1.8) > 0.2
    ctx.globalAlpha = on ? 0.5 : 0.06
    ctx.fillStyle = lights[li].c
    ctx.beginPath()
    ctx.arc(ww + iW * lights[li].x, y + h * 0.03, 3.5, 0, Math.PI * 2)
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
    ctx.fillStyle = active ? ACCENT_GREEN : WALL_DARK
    ctx.fillRect(sx - 5, fy - 1, 10, 2)
    ctx.fillText(FLOOR_NAMES[i], sx - 12, fy + fs * 0.35)
    ctx.beginPath()
    ctx.arc(sx, fy, active ? 4.5 : 2, 0, Math.PI * 2)
    ctx.fill()
  }

  const curY = top + (Math.min(cam, 4) / 4) * span
  ctx.globalAlpha = 0.6
  ctx.fillStyle = ACCENT_GREEN
  ctx.beginPath()
  ctx.moveTo(sx + 10, curY)
  ctx.lineTo(sx + 4, curY - 5)
  ctx.lineTo(sx + 4, curY + 5)
  ctx.closePath()
  ctx.fill()
  ctx.globalAlpha = 1
}
