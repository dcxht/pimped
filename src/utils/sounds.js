// Pimped.io Sound Engine - Web Audio API synthesized sounds (like Krillion)
// No audio files needed. All sounds generated in browser.

let ctx = null
let muted = false

function getCtx() {
  if (!ctx) {
    ctx = new (window.AudioContext || window.webkitAudioContext)()
  }
  if (ctx.state === 'suspended') ctx.resume()
  return ctx
}

export function setMuted(m) { muted = m }
export function isMuted() { return muted }
export function toggleMute() { muted = !muted; return muted }

function play(fn) {
  if (muted) return
  try { fn(getCtx()) } catch {}
}

// Correct answer - ascending chime
export function playCorrect() {
  play((ctx) => {
    const now = ctx.currentTime
    const gain = ctx.createGain()
    gain.connect(ctx.destination)
    gain.gain.setValueAtTime(0.15, now)
    gain.gain.exponentialRampToValueAtTime(0.01, now + 0.5)

    const o1 = ctx.createOscillator()
    o1.type = 'sine'
    o1.frequency.setValueAtTime(523, now) // C5
    o1.frequency.setValueAtTime(659, now + 0.1) // E5
    o1.frequency.setValueAtTime(784, now + 0.2) // G5
    o1.connect(gain)
    o1.start(now)
    o1.stop(now + 0.5)
  })
}

// Wrong answer - descending buzz
export function playWrong() {
  play((ctx) => {
    const now = ctx.currentTime
    const gain = ctx.createGain()
    gain.connect(ctx.destination)
    gain.gain.setValueAtTime(0.1, now)
    gain.gain.exponentialRampToValueAtTime(0.01, now + 0.3)

    const o = ctx.createOscillator()
    o.type = 'square'
    o.frequency.setValueAtTime(200, now)
    o.frequency.exponentialRampToValueAtTime(100, now + 0.3)
    o.connect(gain)
    o.start(now)
    o.stop(now + 0.3)
  })
}

// Timer tick (last 5 seconds)
export function playTick() {
  play((ctx) => {
    const now = ctx.currentTime
    const gain = ctx.createGain()
    gain.connect(ctx.destination)
    gain.gain.setValueAtTime(0.06, now)
    gain.gain.exponentialRampToValueAtTime(0.01, now + 0.08)

    const o = ctx.createOscillator()
    o.type = 'sine'
    o.frequency.setValueAtTime(880, now) // A5
    o.connect(gain)
    o.start(now)
    o.stop(now + 0.08)
  })
}

// Timer expired - alarm
export function playTimeUp() {
  play((ctx) => {
    const now = ctx.currentTime
    const gain = ctx.createGain()
    gain.connect(ctx.destination)
    gain.gain.setValueAtTime(0.12, now)
    gain.gain.exponentialRampToValueAtTime(0.01, now + 0.6)

    const o = ctx.createOscillator()
    o.type = 'sawtooth'
    o.frequency.setValueAtTime(440, now)
    o.frequency.setValueAtTime(220, now + 0.15)
    o.frequency.setValueAtTime(440, now + 0.3)
    o.frequency.setValueAtTime(220, now + 0.45)
    o.connect(gain)
    o.start(now)
    o.stop(now + 0.6)
  })
}

// Tier reveal - rising arpeggio (higher pitch for rarer tiers)
export function playTierReveal(tier = 0) {
  play((ctx) => {
    const now = ctx.currentTime
    const baseFreqs = {
      0: [262, 330, 392],       // C4-E4-G4 (Pre-med)
      1: [330, 415, 494],       // E4-Ab4-B4 (Med Student)
      2: [392, 494, 587],       // G4-B4-D5 (Resident)
      3: [494, 622, 740],       // B4-Eb5-F#5 (Attending)
      4: [587, 740, 880, 1047], // D5-F#5-A5-C6 (Professor!)
    }
    const freqs = baseFreqs[tier] || baseFreqs[0]
    const gain = ctx.createGain()
    gain.connect(ctx.destination)
    gain.gain.setValueAtTime(0.12, now)
    gain.gain.exponentialRampToValueAtTime(0.01, now + 0.15 * freqs.length + 0.3)

    freqs.forEach((freq, i) => {
      const o = ctx.createOscillator()
      o.type = tier >= 3 ? 'triangle' : 'sine'
      o.frequency.setValueAtTime(freq, now + i * 0.12)
      o.connect(gain)
      o.start(now + i * 0.12)
      o.stop(now + i * 0.12 + 0.2)
    })
  })
}

// Button click - short blip
export function playClick() {
  play((ctx) => {
    const now = ctx.currentTime
    const gain = ctx.createGain()
    gain.connect(ctx.destination)
    gain.gain.setValueAtTime(0.05, now)
    gain.gain.exponentialRampToValueAtTime(0.01, now + 0.05)

    const o = ctx.createOscillator()
    o.type = 'sine'
    o.frequency.setValueAtTime(660, now)
    o.connect(gain)
    o.start(now)
    o.stop(now + 0.05)
  })
}

// Game start - quick ascending sweep
export function playGameStart() {
  play((ctx) => {
    const now = ctx.currentTime
    const gain = ctx.createGain()
    gain.connect(ctx.destination)
    gain.gain.setValueAtTime(0.1, now)
    gain.gain.exponentialRampToValueAtTime(0.01, now + 0.4)

    const o = ctx.createOscillator()
    o.type = 'triangle'
    o.frequency.setValueAtTime(220, now)
    o.frequency.exponentialRampToValueAtTime(880, now + 0.3)
    o.connect(gain)
    o.start(now)
    o.stop(now + 0.4)
  })
}

// Share/copy confirmation - double blip
export function playShare() {
  play((ctx) => {
    const now = ctx.currentTime
    const gain = ctx.createGain()
    gain.connect(ctx.destination)
    gain.gain.setValueAtTime(0.08, now)
    gain.gain.exponentialRampToValueAtTime(0.01, now + 0.2)

    ;[0, 0.1].forEach((delay) => {
      const o = ctx.createOscillator()
      o.type = 'sine'
      o.frequency.setValueAtTime(880, now + delay)
      o.connect(gain)
      o.start(now + delay)
      o.stop(now + delay + 0.06)
    })
  })
}

// Pass - deflating sound
export function playPass() {
  play((ctx) => {
    const now = ctx.currentTime
    const gain = ctx.createGain()
    gain.connect(ctx.destination)
    gain.gain.setValueAtTime(0.08, now)
    gain.gain.exponentialRampToValueAtTime(0.01, now + 0.25)

    const o = ctx.createOscillator()
    o.type = 'sine'
    o.frequency.setValueAtTime(400, now)
    o.frequency.exponentialRampToValueAtTime(150, now + 0.25)
    o.connect(gain)
    o.start(now)
    o.stop(now + 0.25)
  })
}
