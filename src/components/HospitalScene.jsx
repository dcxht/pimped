// Hospital Scene - immersive CSS-art background
// Lobby (top) → Ward → ICU → OR → Chief's Office (deep)

export default function HospitalScene({ depth = 0, maxDepth = 2500 }) {
  const pct = Math.min(depth / maxDepth, 1)

  const bgTop = lerpColor([22, 60, 90], [6, 14, 26], pct)
  const bgMid = lerpColor([15, 45, 70], [8, 18, 32], pct)
  const bgBot = lerpColor([10, 30, 50], [4, 10, 20], pct)

  const symbols = ['⚕️', '💊', '🩺', '❤️', '🫁', '🧬', '💉', '🩻', '🔬', '🧪', '🏥', '➕', '🫀', '🦷', '👁️', '🦴']

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

      {/* Grid pattern (hospital tile floor) */}
      <div
        className="absolute inset-0"
        style={{
          opacity: 0.025 + pct * 0.015,
          backgroundImage: `
            linear-gradient(rgba(0, 229, 255, 0.15) 1px, transparent 1px),
            linear-gradient(90deg, rgba(0, 229, 255, 0.15) 1px, transparent 1px)
          `,
          backgroundSize: '60px 60px',
        }}
      />

      {/* Perspective corridor lines */}
      <svg className="absolute inset-0 w-full h-full" style={{ opacity: 0.04 + pct * 0.03 }}>
        {/* Left wall */}
        <line x1="0" y1="0" x2="15%" y2="100%" stroke="rgba(0, 229, 255, 0.4)" strokeWidth="1" />
        <line x1="5%" y1="0" x2="18%" y2="100%" stroke="rgba(0, 229, 255, 0.2)" strokeWidth="1" />
        {/* Right wall */}
        <line x1="100%" y1="0" x2="85%" y2="100%" stroke="rgba(0, 229, 255, 0.4)" strokeWidth="1" />
        <line x1="95%" y1="0" x2="82%" y2="100%" stroke="rgba(0, 229, 255, 0.2)" strokeWidth="1" />
        {/* Ceiling line */}
        <line x1="15%" y1="8%" x2="85%" y2="8%" stroke="rgba(0, 229, 255, 0.15)" strokeWidth="1" />
      </svg>

      {/* Hospital room doors on left */}
      {[20, 40, 60, 80].map((top, i) => {
        const isActive = depth >= i * 500
        return (
          <div
            key={`door-l-${i}`}
            className="absolute left-[3%] transition-all duration-700"
            style={{ top: `${top}%` }}
          >
            <div
              className="w-5 h-8 rounded-sm border transition-all duration-500"
              style={{
                borderColor: isActive ? 'rgba(0, 229, 255, 0.3)' : 'rgba(255,255,255,0.04)',
                background: isActive ? 'rgba(0, 229, 255, 0.05)' : 'transparent',
                boxShadow: isActive ? '0 0 8px rgba(0, 229, 255, 0.1)' : 'none',
              }}
            />
          </div>
        )
      })}

      {/* Hospital room doors on right (offset) */}
      {[30, 50, 70].map((top, i) => {
        const isActive = depth >= (i + 1) * 500
        return (
          <div
            key={`door-r-${i}`}
            className="absolute right-[3%] transition-all duration-700"
            style={{ top: `${top}%` }}
          >
            <div
              className="w-5 h-8 rounded-sm border transition-all duration-500"
              style={{
                borderColor: isActive ? 'rgba(0, 229, 255, 0.3)' : 'rgba(255,255,255,0.04)',
                background: isActive ? 'rgba(0, 229, 255, 0.05)' : 'transparent',
                boxShadow: isActive ? '0 0 8px rgba(0, 229, 255, 0.1)' : 'none',
              }}
            />
          </div>
        )
      })}

      {/* Depth markers on right side */}
      {[
        { label: 'LOBBY', depth: 0, icon: '🏥' },
        { label: 'WARD', depth: 500, icon: '🛏️' },
        { label: 'ICU', depth: 1000, icon: '🫀' },
        { label: 'OR', depth: 1500, icon: '🔪' },
        { label: 'CHIEF', depth: 2000, icon: '👑' },
      ].map((marker) => {
        const y = (marker.depth / maxDepth) * 80 + 8
        const isActive = depth >= marker.depth
        return (
          <div
            key={marker.label}
            className="absolute right-2 transition-all duration-700"
            style={{ top: `${y}%`, transform: 'translateY(-50%)' }}
          >
            <div className="flex items-center gap-1">
              <div
                className="w-4 h-px transition-all duration-500"
                style={{
                  background: isActive ? 'var(--accent)' : 'rgba(255,255,255,0.06)',
                  boxShadow: isActive ? '0 0 6px var(--accent-dim)' : 'none',
                }}
              />
              <span
                className="text-[7px] font-mono font-bold tracking-[0.15em] uppercase transition-all duration-500"
                style={{
                  color: isActive ? 'var(--accent)' : 'rgba(255,255,255,0.08)',
                  textShadow: isActive ? '0 0 8px var(--accent-dim)' : 'none',
                }}
              >
                {marker.icon} {marker.label}
              </span>
            </div>
          </div>
        )
      })}

      {/* Floating medical symbols */}
      {symbols.map((sym, i) => {
        const left = 3 + (i * 13) % 94
        const duration = 18 + (i * 7) % 25
        const delay = (i * 2.3) % 18
        const size = 12 + (i * 4) % 14
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

      {/* EKG line across the middle */}
      <svg
        className="absolute w-full transition-opacity duration-1000"
        style={{ top: '48%', height: '40px', opacity: 0.06 + pct * 0.04 }}
        viewBox="0 0 400 40"
        preserveAspectRatio="none"
      >
        <polyline
          points="0,20 50,20 60,20 70,5 80,35 90,10 100,30 110,20 160,20 200,20 210,20 220,5 230,35 240,10 250,30 260,20 310,20 350,20 360,20 370,5 380,35 390,10 400,20"
          fill="none"
          stroke="var(--accent)"
          strokeWidth="1.5"
          className="ekg-line"
        />
      </svg>

      {/* Ambient light from above (ceiling light) */}
      <div
        className="absolute top-0 left-1/2 -translate-x-1/2 transition-opacity duration-1000"
        style={{
          width: '200px',
          height: '300px',
          opacity: 0.06 - pct * 0.04,
          background: `radial-gradient(ellipse at center top, rgba(0, 229, 255, 0.2) 0%, transparent 70%)`,
        }}
      />

      {/* Particle dust */}
      {Array.from({ length: 8 }, (_, i) => (
        <div
          key={`dust-${i}`}
          className="absolute rounded-full"
          style={{
            width: '2px',
            height: '2px',
            background: 'rgba(0, 229, 255, 0.3)',
            left: `${10 + (i * 23) % 80}%`,
            top: `${15 + (i * 17) % 70}%`,
            animation: `floatPulse ${3 + i * 0.7}s ease-in-out infinite`,
            animationDelay: `${i * 0.5}s`,
          }}
        />
      ))}

      {/* Scanline effect */}
      <div
        className="absolute inset-0"
        style={{
          opacity: 0.012,
          backgroundImage: `repeating-linear-gradient(0deg, transparent, transparent 2px, rgba(0, 229, 255, 0.08) 2px, rgba(0, 229, 255, 0.08) 4px)`,
        }}
      />

      {/* Vignette */}
      <div
        className="absolute inset-0"
        style={{
          background: `radial-gradient(ellipse 65% 65% at 50% 50%, transparent 0%, rgba(0,0,0,${0.35 + pct * 0.3}) 100%)`,
        }}
      />
    </div>
  )
}

function lerpColor(a, b, t) {
  return a.map((v, i) => Math.round(v + (b[i] - v) * t))
}
