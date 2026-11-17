// Hospital Scene - CSS-art background that shifts as you descend
// Lobby (top) → Ward → ICU → OR → Chief's Office (deep)

export default function HospitalScene({ depth = 0, maxDepth = 2500 }) {
  const pct = Math.min(depth / maxDepth, 1)

  // Shift colors from bright hospital lobby to dark OR
  const bgTop = lerpColor([22, 60, 90], [6, 14, 26], pct)
  const bgMid = lerpColor([15, 45, 70], [8, 18, 32], pct)
  const bgBot = lerpColor([10, 30, 50], [4, 10, 20], pct)

  // Floating medical symbols
  const symbols = ['⚕️', '💊', '🩺', '❤️', '🫁', '🧬', '💉', '🩻', '🔬', '🧪', '🏥', '➕']

  return (
    <div className="fixed inset-0 overflow-hidden pointer-events-none" style={{ zIndex: 0 }}>
      {/* Main gradient */}
      <div
        className="absolute inset-0 transition-all duration-1000"
        style={{
          background: `linear-gradient(180deg,
            rgb(${bgTop.join(',')}) 0%,
            rgb(${bgMid.join(',')}) 40%,
            rgb(${bgBot.join(',')}) 100%
          )`,
        }}
      />

      {/* Floor lines (hospital corridor effect) */}
      <div className="absolute inset-0" style={{ opacity: 0.03 + pct * 0.02 }}>
        {Array.from({ length: 12 }, (_, i) => (
          <div
            key={`floor-${i}`}
            className="absolute left-0 right-0"
            style={{
              top: `${8 + i * 8}%`,
              height: '1px',
              background: `linear-gradient(90deg, transparent 0%, rgba(0, 229, 255, ${0.3 - pct * 0.2}) 20%, rgba(0, 229, 255, ${0.3 - pct * 0.2}) 80%, transparent 100%)`,
            }}
          />
        ))}
      </div>

      {/* Vertical corridor walls */}
      <div className="absolute inset-0" style={{ opacity: 0.04 }}>
        <div className="absolute top-0 bottom-0 left-[8%] w-px" style={{ background: 'rgba(0, 229, 255, 0.3)' }} />
        <div className="absolute top-0 bottom-0 right-[8%] w-px" style={{ background: 'rgba(0, 229, 255, 0.3)' }} />
      </div>

      {/* Depth markers on right side */}
      {[
        { label: 'LOBBY', depth: 0 },
        { label: 'WARD', depth: 500 },
        { label: 'ICU', depth: 1000 },
        { label: 'OR', depth: 1500 },
        { label: 'CHIEF', depth: 2000 },
      ].map((marker) => {
        const y = (marker.depth / maxDepth) * 85 + 5
        const isActive = depth >= marker.depth
        return (
          <div
            key={marker.label}
            className="absolute right-3 transition-all duration-700"
            style={{
              top: `${y}%`,
              transform: 'translateY(-50%)',
            }}
          >
            <div className="flex items-center gap-1.5">
              <div
                className="w-6 h-px transition-all duration-500"
                style={{
                  background: isActive ? 'var(--accent)' : 'rgba(255,255,255,0.08)',
                  boxShadow: isActive ? '0 0 6px var(--accent-dim)' : 'none',
                }}
              />
              <span
                className="text-[8px] font-mono font-bold tracking-[0.2em] uppercase transition-all duration-500"
                style={{
                  color: isActive ? 'var(--accent)' : 'rgba(255,255,255,0.12)',
                  textShadow: isActive ? '0 0 8px var(--accent-dim)' : 'none',
                }}
              >
                {marker.label}
              </span>
            </div>
          </div>
        )
      })}

      {/* Floating medical symbols */}
      {symbols.map((sym, i) => {
        const left = 5 + (i * 17) % 90
        const duration = 15 + (i * 7) % 20
        const delay = (i * 3.7) % 15
        const size = 14 + (i * 5) % 12
        return (
          <div
            key={i}
            className="float-symbol"
            style={{
              left: `${left}%`,
              fontSize: `${size}px`,
              animationDuration: `${duration}s`,
              animationDelay: `${delay}s`,
            }}
          >
            {sym}
          </div>
        )
      })}

      {/* Ambient light rays */}
      <div
        className="absolute inset-0 transition-opacity duration-1000"
        style={{
          opacity: 0.03 - pct * 0.02,
          background: `radial-gradient(ellipse 80% 50% at 50% 20%, rgba(0, 229, 255, 0.15) 0%, transparent 70%)`,
        }}
      />

      {/* Scanline effect (subtle) */}
      <div
        className="absolute inset-0"
        style={{
          opacity: 0.015,
          backgroundImage: `repeating-linear-gradient(
            0deg,
            transparent,
            transparent 2px,
            rgba(0, 229, 255, 0.1) 2px,
            rgba(0, 229, 255, 0.1) 4px
          )`,
        }}
      />

      {/* Vignette */}
      <div
        className="absolute inset-0"
        style={{
          background: `radial-gradient(ellipse 70% 70% at 50% 50%, transparent 0%, rgba(0,0,0,${0.3 + pct * 0.3}) 100%)`,
        }}
      />
    </div>
  )
}

function lerpColor(a, b, t) {
  return a.map((v, i) => Math.round(v + (b[i] - v) * t))
}
