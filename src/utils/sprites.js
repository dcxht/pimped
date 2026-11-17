// Procedural pixel art sprite generator for Pimped.io
// Draws tiny sprites on offscreen canvases, scales up with pixelated rendering

const spriteCache = {}

function createSprite(name, width, height, drawFn) {
  if (spriteCache[name]) return spriteCache[name]
  const canvas = document.createElement('canvas')
  canvas.width = width
  canvas.height = height
  const ctx = canvas.getContext('2d')
  ctx.imageSmoothingEnabled = false
  drawFn(ctx, width, height)
  spriteCache[name] = canvas
  return canvas
}

// Helper: set a pixel
function px(ctx, x, y, color) {
  ctx.fillStyle = color
  ctx.fillRect(x, y, 1, 1)
}

// ═══════════════════════════════════════
// DOCTOR SPRITE (16x24 pixels)
// ═══════════════════════════════════════
export function getDoctorSprite(frame = 0) {
  return createSprite(`doctor-${frame}`, 16, 24, (ctx) => {
    const skin = '#f0c8a0'
    const coat = '#e8e8f0'
    const pants = '#3040a0'
    const hair = '#3a2a1a'
    const shoe = '#1a1a2a'
    const steth = '#40a0d0'

    // Hair
    px(ctx, 7, 2, hair); px(ctx, 8, 2, hair)
    px(ctx, 6, 3, hair); px(ctx, 7, 3, hair); px(ctx, 8, 3, hair); px(ctx, 9, 3, hair)

    // Head
    px(ctx, 7, 4, skin); px(ctx, 8, 4, skin)
    px(ctx, 6, 5, skin); px(ctx, 7, 5, skin); px(ctx, 8, 5, skin); px(ctx, 9, 5, skin)
    px(ctx, 7, 6, skin); px(ctx, 8, 6, skin)

    // Eyes
    px(ctx, 7, 5, '#1a1a3a'); px(ctx, 8, 5, '#1a1a3a')

    // White coat body
    for (let y = 7; y <= 15; y++) {
      for (let x = 5; x <= 10; x++) {
        px(ctx, x, y, coat)
      }
    }

    // Coat pocket
    px(ctx, 6, 10, '#c0c0d0'); px(ctx, 7, 10, '#c0c0d0')

    // Stethoscope
    px(ctx, 8, 7, steth); px(ctx, 9, 8, steth); px(ctx, 9, 9, steth)

    // Arms
    const armOffset = frame % 2 === 0 ? 0 : 1
    px(ctx, 4, 8 + armOffset, skin); px(ctx, 4, 9 + armOffset, skin)
    px(ctx, 11, 9 - armOffset, skin); px(ctx, 11, 10 - armOffset, skin)

    // Pants
    for (let y = 16; y <= 19; y++) {
      px(ctx, 6, y, pants); px(ctx, 7, y, pants)
      px(ctx, 8, y, pants); px(ctx, 9, y, pants)
    }

    // Legs walking
    const legOffset = frame % 2 === 0 ? 0 : 1
    px(ctx, 6, 20, pants); px(ctx, 7, 20, pants)
    px(ctx, 8 + legOffset, 20, pants); px(ctx, 9 + legOffset, 20, pants)

    // Shoes
    px(ctx, 6, 21, shoe); px(ctx, 7, 21, shoe)
    px(ctx, 8 + legOffset, 21, shoe); px(ctx, 9 + legOffset, 21, shoe)
  })
}

// ═══════════════════════════════════════
// NURSE SPRITE (16x24 pixels)
// ═══════════════════════════════════════
export function getNurseSprite(frame = 0) {
  return createSprite(`nurse-${frame}`, 16, 24, (ctx) => {
    const skin = '#f0c8a0'
    const scrubs = '#40a0a0'
    const scrubsDark = '#308080'
    const hair = '#5a3020'
    const shoe = '#f0f0f0'
    const cap = '#e0e0f0'

    // Cap
    px(ctx, 7, 1, cap); px(ctx, 8, 1, cap)
    px(ctx, 6, 2, cap); px(ctx, 7, 2, cap); px(ctx, 8, 2, cap); px(ctx, 9, 2, cap)

    // Hair
    px(ctx, 6, 3, hair); px(ctx, 9, 3, hair)
    px(ctx, 5, 4, hair); px(ctx, 10, 4, hair)

    // Head
    px(ctx, 7, 3, skin); px(ctx, 8, 3, skin)
    px(ctx, 6, 4, skin); px(ctx, 7, 4, skin); px(ctx, 8, 4, skin); px(ctx, 9, 4, skin)
    px(ctx, 7, 5, skin); px(ctx, 8, 5, skin)

    // Eyes
    px(ctx, 7, 4, '#1a1a3a'); px(ctx, 8, 4, '#1a1a3a')

    // Scrubs body
    for (let y = 6; y <= 14; y++) {
      for (let x = 5; x <= 10; x++) {
        px(ctx, x, y, y < 10 ? scrubs : scrubsDark)
      }
    }

    // Arms
    const armOff = frame % 2 === 0 ? 0 : 1
    px(ctx, 4, 7 + armOff, scrubs); px(ctx, 4, 8 + armOff, skin)
    px(ctx, 11, 8 - armOff, scrubs); px(ctx, 11, 9 - armOff, skin)

    // Pants
    for (let y = 15; y <= 19; y++) {
      px(ctx, 6, y, scrubsDark); px(ctx, 7, y, scrubsDark)
      px(ctx, 8, y, scrubsDark); px(ctx, 9, y, scrubsDark)
    }

    // Walking legs
    const legOff = frame % 2 === 0 ? 0 : 1
    px(ctx, 6, 20, scrubsDark); px(ctx, 7, 20, scrubsDark)
    px(ctx, 8 + legOff, 20, scrubsDark); px(ctx, 9 + legOff, 20, scrubsDark)

    // Shoes
    px(ctx, 6, 21, shoe); px(ctx, 7, 21, shoe)
    px(ctx, 8 + legOff, 21, shoe); px(ctx, 9 + legOff, 21, shoe)
  })
}

// ═══════════════════════════════════════
// HOSPITAL BED (32x16 pixels)
// ═══════════════════════════════════════
export function getBedSprite() {
  return createSprite('bed', 32, 16, (ctx) => {
    const frame = '#607090'
    const mattress = '#d0dae8'
    const pillow = '#e8e0d0'
    const wheel = '#a0a0b0'
    const blanket = '#80a0c0'

    // Frame
    ctx.fillStyle = frame
    ctx.fillRect(2, 6, 28, 2)  // rail
    ctx.fillRect(2, 6, 2, 8)   // left leg
    ctx.fillRect(28, 6, 2, 8)  // right leg

    // Headboard
    ctx.fillStyle = '#506080'
    ctx.fillRect(0, 2, 4, 6)

    // Mattress
    ctx.fillStyle = mattress
    ctx.fillRect(4, 4, 24, 4)

    // Pillow
    ctx.fillStyle = pillow
    ctx.fillRect(4, 3, 6, 3)

    // Blanket
    ctx.fillStyle = blanket
    ctx.fillRect(10, 4, 18, 3)

    // Wheels
    ctx.fillStyle = wheel
    ctx.beginPath()
    ctx.arc(5, 14, 2, 0, Math.PI * 2)
    ctx.arc(27, 14, 2, 0, Math.PI * 2)
    ctx.fill()
  })
}

// ═══════════════════════════════════════
// IV STAND (8x32 pixels)
// ═══════════════════════════════════════
export function getIVSprite() {
  return createSprite('iv', 8, 32, (ctx) => {
    const pole = '#a0b0c0'
    const bag = '#c0d8f0'
    const bagEdge = '#90a8c0'
    const tube = '#80c0e0'

    // Pole
    ctx.fillStyle = pole
    ctx.fillRect(3, 4, 2, 24)

    // Hook
    ctx.fillRect(1, 3, 6, 1)
    ctx.fillRect(5, 3, 1, 3)

    // IV bag
    ctx.fillStyle = bag
    ctx.fillRect(5, 5, 3, 5)
    ctx.fillStyle = bagEdge
    ctx.fillRect(5, 5, 3, 1)
    ctx.fillRect(5, 9, 3, 1)

    // Drip line
    ctx.fillStyle = tube
    ctx.fillRect(6, 10, 1, 8)

    // Base tripod
    ctx.fillStyle = pole
    ctx.fillRect(1, 28, 6, 1)
    ctx.fillRect(0, 29, 8, 1)
  })
}

// ═══════════════════════════════════════
// HEART MONITOR (16x12 pixels)
// ═══════════════════════════════════════
export function getMonitorSprite() {
  return createSprite('monitor', 16, 12, (ctx) => {
    // Monitor body
    ctx.fillStyle = '#2a3040'
    ctx.fillRect(1, 1, 14, 9)
    ctx.fillStyle = '#1a2030'
    ctx.fillRect(2, 2, 12, 7)

    // Screen
    ctx.fillStyle = '#0a1a0a'
    ctx.fillRect(3, 3, 10, 5)

    // EKG line on screen
    ctx.fillStyle = '#00ff60'
    px(ctx, 3, 5); px(ctx, 4, 5); px(ctx, 5, 5)
    px(ctx, 6, 4); px(ctx, 7, 2); px(ctx, 8, 6)
    px(ctx, 9, 4); px(ctx, 10, 5); px(ctx, 11, 5); px(ctx, 12, 5)

    // Status LEDs
    px(ctx, 3, 8, '#ff4040')  // red
    px(ctx, 5, 8, '#40ff40')  // green
    px(ctx, 7, 8, '#ffaa00')  // amber

    // Stand
    ctx.fillStyle = '#607080'
    ctx.fillRect(7, 10, 2, 2)
    ctx.fillRect(5, 11, 6, 1)
  })
}

// ═══════════════════════════════════════
// WHEELCHAIR (16x16 pixels)
// ═══════════════════════════════════════
export function getWheelchairSprite() {
  return createSprite('wheelchair', 16, 16, (ctx) => {
    const metal = '#8090a0'
    const seat = '#304060'
    const wheel = '#607080'

    // Back rest
    ctx.fillStyle = seat
    ctx.fillRect(3, 2, 2, 8)

    // Seat
    ctx.fillRect(3, 8, 8, 2)

    // Armrest
    ctx.fillStyle = metal
    ctx.fillRect(3, 5, 8, 1)

    // Front support
    ctx.fillRect(10, 6, 1, 6)

    // Big back wheel
    ctx.fillStyle = wheel
    ctx.beginPath()
    ctx.arc(5, 13, 3, 0, Math.PI * 2)
    ctx.fill()
    ctx.fillStyle = '#a0b0c0'
    ctx.beginPath()
    ctx.arc(5, 13, 1, 0, Math.PI * 2)
    ctx.fill()

    // Small front wheel
    ctx.fillStyle = wheel
    ctx.beginPath()
    ctx.arc(12, 14, 1.5, 0, Math.PI * 2)
    ctx.fill()

    // Handle
    ctx.fillStyle = metal
    ctx.fillRect(2, 1, 1, 3)
    ctx.fillRect(1, 1, 3, 1)
  })
}

// ═══════════════════════════════════════
// MEDICAL CROSS (8x8 pixels)
// ═══════════════════════════════════════
export function getCrossSprite(color = '#ff4040') {
  return createSprite(`cross-${color}`, 8, 8, (ctx) => {
    ctx.fillStyle = color
    ctx.fillRect(3, 1, 2, 6)  // vertical
    ctx.fillRect(1, 3, 6, 2)  // horizontal
  })
}

// ═══════════════════════════════════════
// SYRINGE (16x4 pixels)
// ═══════════════════════════════════════
export function getSyringeSprite() {
  return createSprite('syringe', 16, 4, (ctx) => {
    // Barrel
    ctx.fillStyle = '#d0e0f0'
    ctx.fillRect(3, 1, 8, 2)
    // Plunger
    ctx.fillStyle = '#a0b0c0'
    ctx.fillRect(0, 1, 3, 2)
    // Needle
    ctx.fillStyle = '#c0c8d0'
    ctx.fillRect(11, 1, 5, 1)
    // Liquid
    ctx.fillStyle = '#80c0ff'
    ctx.fillRect(5, 1, 4, 2)
  })
}

// ═══════════════════════════════════════
// PILL (6x6 pixels)
// ═══════════════════════════════════════
export function getPillSprite(color1 = '#ff6060', color2 = '#f0f0f0') {
  return createSprite(`pill-${color1}`, 6, 6, (ctx) => {
    // Left half
    ctx.fillStyle = color1
    ctx.fillRect(0, 1, 3, 4)
    px(ctx, 1, 0, color1); px(ctx, 2, 0, color1)
    px(ctx, 1, 5, color1); px(ctx, 2, 5, color1)
    // Right half
    ctx.fillStyle = color2
    ctx.fillRect(3, 1, 3, 4)
    px(ctx, 3, 0, color2); px(ctx, 4, 0, color2)
    px(ctx, 3, 5, color2); px(ctx, 4, 5, color2)
  })
}

// ═══════════════════════════════════════
// AMBULANCE (32x16 pixels)
// ═══════════════════════════════════════
export function getAmbulanceSprite() {
  return createSprite('ambulance', 32, 16, (ctx) => {
    const body = '#f0f0f0'
    const red = '#ff3030'
    const window = '#80c0ff'
    const wheel = '#2a2a3a'

    // Body
    ctx.fillStyle = body
    ctx.fillRect(2, 3, 26, 9)

    // Cab (front section - shorter/angled)
    ctx.fillRect(24, 5, 6, 7)

    // Red stripe
    ctx.fillStyle = red
    ctx.fillRect(2, 7, 22, 2)

    // Red cross
    px(ctx, 10, 4, red); px(ctx, 11, 4, red)
    px(ctx, 9, 5, red); px(ctx, 10, 5, red); px(ctx, 11, 5, red); px(ctx, 12, 5, red)
    px(ctx, 10, 6, red); px(ctx, 11, 6, red)

    // Windows
    ctx.fillStyle = window
    ctx.fillRect(25, 5, 4, 3)
    ctx.fillRect(16, 4, 4, 3)

    // Siren light
    ctx.fillStyle = '#ff0000'
    ctx.fillRect(14, 2, 3, 2)

    // Wheels
    ctx.fillStyle = wheel
    ctx.beginPath()
    ctx.arc(8, 13, 2.5, 0, Math.PI * 2)
    ctx.arc(25, 13, 2.5, 0, Math.PI * 2)
    ctx.fill()
  })
}
