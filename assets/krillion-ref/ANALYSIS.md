# Krillion Visual Rendering Analysis

Extracted 2026-11-17 from https://krillion.io
Next.js app. Main rendering chunk: `3w3ki9nykrkuz.js`

---

## Architecture Overview

The game uses a **hybrid Canvas + DOM** approach inside a fixed-position container:

```
.ds-root (fixed, inset:0, overflow:hidden, bg:#050a14)
  .ds-stage (absolute, inset:0, overflow:hidden)
    canvas.ds-sea     z:0   -- background ocean gradient + tiled layer images + creatures (sea canvas)
    div.ds-world      z:1   -- DOM layer: depth markers, tier lines, cards, floor image (14800px tall, translated via transform)
    canvas.ds-fore    z:2   -- foreground particles, bubbles, krill swarm, depth ruler (fore canvas)
    div.ds-dim        z:6   -- dark overlay (opacity transition)
    div.ds-vignette   z:5   -- radial-gradient(at 50% 45%, transparent 55%, rgba(2,4,10,0.85) 100%)
    div.ds-edge       z:8   -- red glow box-shadow for urgency
    div.ds-flash      z:9   -- screen flash
    div.ds-hud        z:10  -- depth counter, dots, score (DOM, flex layout)
    div.ds-mascot     z:11  -- krill character (DOM, sprite img)
    div.ds-crt        z:12  -- CRT scanline overlay: repeating-linear-gradient(0deg, rgba(0,0,0,0.18) 0 1px, transparent 1px 3px), opacity:0.45
    button.ds-mute    z:12  -- sound toggle
```

## Two Canvas System

### ds-sea (Background Canvas)
- Canvas size: 2160x1724 (2x for retina), displayed at 1080x862
- Position: absolute, z-index: 0
- Draws: ocean gradient, sky image, water surface wave, tiled background layers, fish/creatures, marine snow particles
- Context variable: `W`

### ds-fore (Foreground Canvas)
- Canvas size: 2160x1544, displayed at 1080x772
- Position: absolute, z-index: 2, pointer-events: none
- Draws: foreground snow particles, krill swarm, bubbles, depth ruler/scale, mascot positioning
- Context variable: `H`

Both use `setTransform(P,0,0,P,...)` for HiDPI scaling where P = pixelRatio.

---

## Background Layer Images

| Image | Dimensions | File Size | Depth Range | Alpha | Description |
|-------|-----------|-----------|-------------|-------|-------------|
| bg-sky.webp | 1376x697 | 40KB | Surface (depth 0) | 1.0 | Sky/horizon image, drawn once at top |
| bg-top.webp | 768x1376 | 84KB | 40-470m | 0.45 | Upper ocean layer, tiled vertically |
| bg-mid.webp | 768x1376 | 88KB | 480-2620m | 0.50 | Mid-depth layer, tiled vertically |
| bg-trench.webp | 768x1376 | 112KB | 2950-7060m | 0.55 | Deep trench layer, tiled vertically |
| water-bg.webp | 1535x1024 | 28KB | Floor (14020px) | 0.95 | Ocean floor image at very bottom |

The three tiled layers (top/mid/trench) use the `tv()` function which:
1. Clips to the layer's depth range
2. Tiles the image vertically to fill the visible portion
3. Adds fade-in/fade-out gradients (150px) at the layer boundaries using `createLinearGradient`

---

## Viewport Helper Functions

```js
u = element.clientWidth || innerWidth          // viewport width
h = element.clientHeight || innerHeight        // viewport height
f = Math.round(element.getBoundingClientRect().left)   // left inset (for ads)
m = Math.round(element.getBoundingClientRect().top)    // top inset
p = Math.round(innerWidth - element.getBoundingClientRect().right)  // right inset
g = Math.round(innerHeight - element.getBoundingClientRect().bottom) // bottom inset

M = () => u + f + p        // full canvas width (viewport + insets)
S = () => -m               // top edge (negative for overshoot)
w = () => h + m + g        // full canvas height
T = () => u/2 - 24*(u<700) // horizontal center
v = () => -f               // left edge (for canvas offset; found from F.style.left=v()+"px")

ey = (depth) => (depth - eg) * 2 + h/2   // depth-to-screen-Y converter (eg = current scroll depth)
```

The world div (`ds-world`) is translated via: `transform: translate3d(0, ${h/2 - 2*eg}px, 0)` where `eg` is current depth, creating the parallax scroll.

---

## Color System

### Ocean Depth Gradient Stops
The sea canvas fills a full-screen gradient that shifts based on current depth:

```js
stops: [
  [0,    "#1d5580"],   // Surface: steel blue
  [150,  "#123a5e"],   // Shallow: darker blue
  [350,  "#0b1526"],   // Twilight: deep navy
  [800,  "#081020"],   // Midnight: near black
  [1400, "#050a14"],   // Abyss: darkest
  [2600, "#03070f"],   // Hadal: almost pure black
  [5200, "#02050b"]    // Trench floor: blackest
]
```

The `tf(depth)` function interpolates between these stops using RGB lerp.

### UI Color Palette
```
--color-abyss:  #050a14    (deepest background)
Sky top fill:   #81cbe8    (above water)
Sky fallback:   #8fd0f0 -> #d8f0ff  (gradient if sky image fails)
Cyan accent:    #4de3ff    (depth numbers, sonar, sparkle, tier glow)
Pink accent:    #ff5d8f    (score, timer urgency, edge danger)
Gold accent:    #ffd166    (dots done, tier krillion, waterline stroke)
Muted text:     #7d93b8    (ambient labels, secondary text)
Panel bg:       #101d33    (cards, HUD pods at ~92% opacity)
Dark panel:     #0b1526    (input, sonar scope)
Darkest:        #060d1a    (borders, shadows)
```

### Tier Colors
```js
plankton:  "#4de3ff"   // cyan
tooclever: "#ff9f43"   // orange
schooler:  "#4de3ff"   // cyan
rare:      "#ff5252"   // red
deepcut:   "#9d7bff"   // purple
krillion:  "#ffd166"   // gold
```

---

## Canvas Drawing - Main Render Loop

Each frame calls two render functions inside `E.start(callback)`:

### 1. Sea Canvas Render (Background)

```
Per frame:
1. Calculate visible depth range: r = eg - h/4, l = eg + h/4
2. Create vertical gradient across canvas using tf() color interpolation
3. fillRect the entire canvas with this gradient
4. Draw tiled background layers:
   - tv(ta, 40, 470, 0.45)    -- bg-top.webp from depth 40-470
   - tv(tn, 480, 2620, 0.50)  -- bg-mid.webp from depth 480-2620
   - tv(ts, 2950, 7060, 0.55) -- bg-trench.webp from depth 2950-7060
5. If surface visible (ey(0) > -40):
   - Draw sky image or fallback gradient
   - Draw animated water surface wave using sin() curves
   - Draw "pier posts" (vertical dark lines) at regular intervals
   - Stroke the waterline with gold/white color
6. Draw marine snow particles (tm array):
   - Each particle: { x, y, par (parallax factor), r (size), a (alpha), ph (phase) }
   - Drift with sin() horizontal wobble, parallax vertical scroll
   - Color: rgba(200,220,255, alpha)
7. Draw creatures based on depth visibility:
```

### 2. Creature Drawing (on Sea Canvas)

**Clownfish at depth 85** (7 fish):
- Orange rectangles: fillRect(-7, -0.55*7, 14, 1.1*7) with rgba(255,159,67,0.8)
- Black stripe: fillRect(3.15, ...) with rgba(90,40,20,0.85)
- Side fins: small rects matching ocean color
- Sin-based swim animation

**Bioluminescent dots at depth 800** (22 dots):
- Pulsing alpha: 0.25 + 0.2*sin(3t + r)
- Color: rgba(255,209,102, alpha) -- gold
- Size: 2.4x2.4 pixel squares

**Viperfish at depth 980** (5 fish):
- Dark body: fillRect(-14, -5, 28, 10) with rgba(18,8,24,0.9)
- Purple body segments: rgba(122,74,134,0.55)
- Light dots along edges: rgba(200,180,220,0.5)

**Shipwreck at depth 3800**:
- Drawn with arcs, lines (ship's wheel), and fillRect for hull
- Color: rgba(4,9,18,0.9)

**Jellyfish pulses at depth 4400** (5 jellyfish):
- Pulsing stroke circles, only visible when sin() > 0.55
- Color: rgba(255,159,67, pulsing_alpha)

**Wandering fish** (4 fish, ty array):
- Use `tb()` helper: draws ellipse body + triangle tail
- Random depth offsets, constant horizontal drift
- Reverse direction when going off-screen

### tb() - Fish Drawing Helper
```js
function tb(ctx, x, y, size, direction) {
  ctx.beginPath();
  ctx.ellipse(x, y, size, 0.45*size, 0, 0, 7);           // body
  ctx.moveTo(x - direction*size, y);                        // tail
  ctx.lineTo(x - direction*size*1.7, y - 0.5*size);
  ctx.lineTo(x - direction*size*1.7, y + 0.5*size);
  ctx.closePath();
  ctx.fill();
}
```

### 3. Foreground Canvas Render

```
Per frame:
1. Clear entire canvas
2. Draw foreground snow particles (tg array) - larger, faster than sea snow
   - Color: rgba(220,235,255, alpha)
3. Draw search light cone if active:
   - RadialGradient: rgba(77,227,255,0.14) center -> transparent edge
4. Draw krill swarm (if active):
   - Array of krill orbiting around a point
   - Each: rotate, translate, draw sprite or gold cross shape
   - Pulsing radius during special states
5. Draw ascending bubbles (e4 array):
   - Each bubble floats up with wobble
   - Stroke circle or filled square depending on mode
6. Draw particle explosions (e3 array):
   - Velocity-based particles with gravity
   - Decay over lifetime
7. Draw depth ruler (right edge):
   - Vertical line from depth 0 downward
   - Tick marks every 10m (small), 50m (medium), 100m (large with label)
   - "YOU" marker with pink arrow at current score depth
   - Font: 13px monospace
```

---

## Post-Processing Overlays (CSS/DOM)

1. **Vignette** (.ds-vignette): `radial-gradient(at 50% 45%, transparent 55%, rgba(2,4,10,0.85) 100%)`
   - Opacity ramps from 0.25 at surface to 0.72 at deep depths
   - Formula: `Math.min(0.72, 0.25 + Math.max(0, eg) / 2400)`

2. **CRT Scanlines** (.ds-crt): `repeating-linear-gradient(0deg, rgba(0,0,0,0.18) 0 1px, transparent 1px 3px)`
   - Always visible at opacity 0.45

3. **Film Grain** (on html element): SVG-based feTurbulence noise
   - fractalNoise, baseFrequency=0.85, numOctaves=2
   - Very subtle: alpha 0.025

4. **Dim overlay** (.ds-dim): Solid dark overlay, animated opacity for transitions

5. **Edge glow** (.ds-edge): `box-shadow: inset 0 0 90px 18px rgba(255,93,143,0.6)` with throb animation

---

## Particle Systems

### Marine Snow (Background - tm array)
- Count: ~70 * particleScale * min(canvasArea/304500, 2.4)
- Properties: x, y, parallax (0.35-0.85), radius (1.4-3.4), alpha (0.08-0.22), phase
- Drift: vertical scroll with parallax, horizontal sin wobble
- Wraps around viewport edges

### Marine Snow (Foreground - tg array)
- Count: ~26 * particleScale
- Same concept but larger, faster, brighter
- Color: rgba(220,235,255, alpha)

### Bubbles (e4 array)
- Spawned by mascot interaction and scoring events
- Rise upward (vd velocity), wobble horizontally
- Lifetime: 4 seconds, max 90 active
- Drawn as stroked circles or filled squares

### Celebration Particles (e3 array)
- Burst from point source with random velocity
- Gravity-affected
- Max 260 active, lifetime 0.6-0.8s
- Custom color per tier

---

## Key CSS Patterns for Hospital Replication

### Pixel-art Clipping (ds-px)
Used on HUD pods for retro look:
```css
clip-path: polygon(0 10px, 5px 10px, 5px 5px, 10px 5px, 10px 0,
  calc(100%-10px) 0, calc(100%-10px) 5px, ... /* 8-bit corner cuts */);
```

### Card Styling
```css
.ds-card {
  background: #101d33ed;
  box-shadow: 0 0 0 3px #4de3ff40, 0 0 50px rgba(0,0,0,0.6), inset 0 0 34px #050a1499;
  /* Plus scanline overlay via :after pseudo-element */
}
```

### Title Text Effect
```css
.ds-title {
  color: #e8f1ff;
  text-shadow: -4px 3px #ff5d8f, 4px -3px rgba(77,227,255,0.85), 0 0 30px rgba(77,227,255,0.35);
  font-size: clamp(58px, 17vw, 124px);
  /* Each letter individually animated with bob */
}
```

### Font
VT323 (Google Fonts) - monospace pixel font, loaded as variable font woff2.

---

## Image Files Saved (Ready to Use)

All images downloaded as valid webp files:
- bg-sky.webp (1376x697, 40KB) -- pixel-art sky with clouds, sun, boat at waterline
- bg-top.webp (768x1376, 84KB) -- upper ocean: light rays, seaweed/coral silhouettes on edges
- bg-mid.webp (768x1376, 88KB) -- mid-depth: darker, rock spires, kelp tendrils, halftone texture
- bg-trench.webp (768x1376, 112KB) -- deep trench: rock walls with cyan/pink bioluminescent spots
- water-bg.webp (1535x1024, 28KB) -- ocean floor: coral/plant silhouettes, overhead light glow

Note: .b64 intermediary files can be deleted.

---

## Hospital Theme Translation Notes

For replicating this with hospital theming:

**Replace layers:**
- bg-sky.webp -> Hospital exterior/skyline
- bg-top.webp -> Hospital hallway/lobby (tiled)
- bg-mid.webp -> Operating room / deeper ward (tiled)
- bg-trench.webp -> Basement/morgue/underground (tiled)
- water-bg.webp -> Floor/foundation texture

**Replace gradient stops:**
- Surface: Hospital white/blue -> deeper greens -> surgical blues -> dark basement
- Suggested hospital palette: white (#f0f4f8) -> clinical blue (#5ba4cf) -> surgical green (#2d6a4f) -> dim hallway (#1a2f3a) -> basement black (#0a1118)

**Replace creatures with hospital elements:**
- Clownfish -> Medical staff walking
- Bioluminescent dots -> Monitor blips / IV drips
- Viperfish -> Gurneys / wheelchairs
- Shipwreck -> X-ray machine or old equipment
- Jellyfish -> Floating medical charts / heartbeat monitors
- Wandering fish -> Nurses / orderlies

**Replace ambient markers:**
- "light begins to fade" -> "lobby lights dim past reception"
- "THE MIDNIGHT ZONE" -> "THE RESTRICTED WING"
- "the Titanic rests here" -> "the original wing, abandoned since 1962"
- "the trench floor" -> "sub-basement level 4 -- nobody comes here"

**Keep the same:**
- Two-canvas architecture
- Parallax tiling system (tv function)
- CRT scanline overlay
- Vignette darkening with depth
- Particle system (repurpose as dust motes / floating lint)
- Pixel-art clipping on UI elements
