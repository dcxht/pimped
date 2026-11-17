import { useState, useEffect } from 'react'

const TIER_LEGEND = [
  { label: 'Pre-med', points: 100, bg: '#dcfce7', text: '#15803d' },
  { label: 'Med Student', points: 200, bg: '#fef9c3', text: '#a16207' },
  { label: 'Resident', points: 300, bg: '#ffedd5', text: '#c2410c' },
  { label: 'Attending', points: 400, bg: '#ede9fe', text: '#7c3aed' },
  { label: 'Professor', points: 500, bg: '#f3e8ff', text: '#6b21a8' },
]

const TIER_EMOJI = { 0: '\u{1F7E9}', 1: '\u{1F7E8}', 2: '\u{1F7E7}', 3: '\u{1F7EA}', 4: '\u{1F7EA}', [-1]: '\u2B1B' }

function getTodayStr() {
  return new Date().toISOString().slice(0, 10)
}

function getTodayResults() {
  try {
    const raw = localStorage.getItem(`pimped-played-${getTodayStr()}`)
    return raw ? JSON.parse(raw) : null
  } catch { return null }
}

function getStreak() {
  try {
    const raw = localStorage.getItem('pimped-streak')
    return raw ? JSON.parse(raw) : { current: 0, best: 0, lastPlayed: null }
  } catch { return { current: 0, best: 0, lastPlayed: null } }
}

function formatDate(dateStr) {
  const d = new Date(dateStr + 'T12:00:00')
  return d.toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric' })
}

function getScoreTier(score) {
  if (score >= 2000) return { label: 'Professor', bg: '#6b21a8', text: '#fff' }
  if (score >= 1500) return { label: 'Attending', bg: '#7c3aed', text: '#fff' }
  if (score >= 1000) return { label: 'Resident', bg: '#ea580c', text: '#fff' }
  if (score >= 500) return { label: 'Med Student', bg: '#ca8a04', text: '#fff' }
  return { label: 'Pre-med', bg: '#16a34a', text: '#fff' }
}

function useCountdown() {
  const [timeLeft, setTimeLeft] = useState('')

  useEffect(() => {
    function calc() {
      const now = new Date()
      const tomorrow = new Date(now)
      tomorrow.setDate(tomorrow.getDate() + 1)
      tomorrow.setHours(0, 0, 0, 0)
      const diff = tomorrow - now
      const h = Math.floor(diff / 3600000)
      const m = Math.floor((diff % 3600000) / 60000)
      const s = Math.floor((diff % 60000) / 1000)
      setTimeLeft(
        `${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`
      )
    }
    calc()
    const id = setInterval(calc, 1000)
    return () => clearInterval(id)
  }, [])

  return timeLeft
}

export default function HomeScreen({ todayPrompts, gameNumber, onPlay }) {
  const todayStr = getTodayStr()
  const played = getTodayResults()
  const streak = getStreak()
  const countdown = useCountdown()
  const [mounted, setMounted] = useState(false)

  useEffect(() => {
    requestAnimationFrame(() => setMounted(true))
  }, [])

  const specialties = todayPrompts
    ? [...new Set(todayPrompts.map(p => (p.specialty || p.category || '').toUpperCase()))].filter(Boolean)
    : []

  const totalScore = played ? (played.totalScore ?? played.score ?? 0) : 0
  const scoreTier = getScoreTier(totalScore)

  // Build emoji grid from saved results
  const emojiGrid = played?.results
    ? played.results.map(r => TIER_EMOJI[r.tier] ?? '\u2B1B').join('')
    : ''

  return (
    <div
      className="min-h-[100dvh] flex flex-col"
      style={{ background: '#F5F3EC' }}
    >
      <div
        className="flex-1 max-w-lg mx-auto w-full px-5 py-8 flex flex-col gap-6"
        style={{
          opacity: mounted ? 1 : 0,
          transform: mounted ? 'translateY(0)' : 'translateY(12px)',
          transition: 'opacity 0.5s ease-out, transform 0.5s ease-out',
        }}
      >

        {/* LOGO */}
        <header className="text-center pt-6 pb-2">
          <h1
            className="font-black tracking-tighter text-gray-900 select-none"
            style={{
              fontSize: 'clamp(3.5rem, 12vw, 5rem)',
              lineHeight: 1,
              animation: 'logoPulse 3s ease-in-out infinite',
            }}
          >
            PIMPED
          </h1>
          <p
            className="text-base font-semibold mt-2"
            style={{ color: '#7c3aed' }}
          >
            Get pimped. Score rare.
          </p>
        </header>

        {/* TODAY'S GAME CARD */}
        <div
          className="bg-white rounded-2xl overflow-hidden"
          style={{
            boxShadow: '0 4px 24px rgba(0,0,0,0.08)',
            animation: mounted ? 'slideUp 0.6s ease-out 0.15s both' : 'none',
          }}
        >
          <div className="px-6 py-5 space-y-4">
            {/* Top row */}
            <div className="flex items-center justify-between">
              <span
                className="text-xs font-bold tracking-widest uppercase"
                style={{ color: '#a3a3a3' }}
              >
                Today's Round
              </span>
              {gameNumber != null && (
                <span className="mono text-xs" style={{ color: '#a3a3a3' }}>
                  #{gameNumber}
                </span>
              )}
            </div>

            <p className="text-sm font-medium" style={{ color: '#525252' }}>
              {formatDate(todayStr)}
            </p>

            {specialties.length > 0 && (
              <div className="flex flex-wrap gap-2">
                {specialties.map(s => (
                  <span
                    key={s}
                    className="text-xs font-bold tracking-wide px-2.5 py-1 rounded-full"
                    style={{ background: '#f3f4f6', color: '#6b7280' }}
                  >
                    {s}
                  </span>
                ))}
              </div>
            )}

            {played ? (
              <div className="space-y-4 pt-1">
                {/* Score + Tier Badge */}
                <div className="flex items-center gap-3">
                  <span
                    className="inline-flex items-center px-3 py-1.5 rounded-full text-xs font-bold uppercase tracking-wide"
                    style={{ background: scoreTier.bg, color: scoreTier.text }}
                  >
                    {scoreTier.label}
                  </span>
                  <span className="text-3xl font-black text-gray-900">
                    {totalScore}
                    <span className="text-sm font-medium ml-1" style={{ color: '#a3a3a3' }}>
                      / 2500
                    </span>
                  </span>
                </div>

                {/* Emoji Grid */}
                {emojiGrid && (
                  <div className="text-2xl tracking-widest select-none" style={{ letterSpacing: '0.15em' }}>
                    {emojiGrid}
                  </div>
                )}

                {/* Countdown */}
                <div className="flex items-center gap-2 text-sm" style={{ color: '#737373' }}>
                  <svg className="w-4 h-4 flex-shrink-0" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" d="M12 6v6h4.5m4.5 0a9 9 0 11-18 0 9 9 0 0118 0z" />
                  </svg>
                  Next round in <span className="mono font-semibold text-gray-900">{countdown}</span>
                </div>
              </div>
            ) : (
              <button
                onClick={onPlay}
                className="w-full py-4 rounded-xl text-white text-lg font-bold tracking-wide
                           active:scale-[0.97] transition-all hover:opacity-90"
                style={{
                  background: 'linear-gradient(135deg, #7c3aed 0%, #6d28d9 100%)',
                  boxShadow: '0 4px 14px rgba(124, 58, 237, 0.35)',
                }}
              >
                PLAY
              </button>
            )}
          </div>
        </div>

        {/* SCORING TIERS */}
        <div
          style={{ animation: mounted ? 'slideUp 0.6s ease-out 0.3s both' : 'none' }}
        >
          <h2
            className="text-xs font-bold tracking-widest uppercase px-1 mb-3"
            style={{ color: '#a3a3a3' }}
          >
            Scoring Tiers
          </h2>
          <div className="flex flex-wrap gap-2">
            {TIER_LEGEND.map(t => (
              <span
                key={t.label}
                className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-bold"
                style={{ background: t.bg, color: t.text }}
              >
                {t.label}
                <span style={{ opacity: 0.6 }}>{t.points}</span>
              </span>
            ))}
          </div>
        </div>

        {/* STREAK */}
        <div
          className="bg-white rounded-2xl px-6 py-5"
          style={{
            boxShadow: '0 2px 12px rgba(0,0,0,0.04)',
            animation: mounted ? 'slideUp 0.6s ease-out 0.4s both' : 'none',
          }}
        >
          <h2
            className="text-xs font-bold tracking-widest uppercase mb-4"
            style={{ color: '#a3a3a3' }}
          >
            Streak
          </h2>
          <div className="flex items-center justify-around">
            <div className="text-center">
              <div className="flex items-center justify-center gap-1">
                <span className="text-2xl select-none">{streak.current > 0 ? '\u{1F525}' : '\u{1F9CA}'}</span>
                <p className="text-3xl font-black text-gray-900">{streak.current}</p>
              </div>
              <p className="text-xs font-medium mt-1" style={{ color: '#a3a3a3' }}>
                Current
              </p>
            </div>
            <div className="w-px h-10" style={{ background: '#e5e2da' }} />
            <div className="text-center">
              <div className="flex items-center justify-center gap-1">
                <span className="text-2xl select-none">{'\u{1F3C6}'}</span>
                <p className="text-3xl font-black text-gray-900">{streak.best}</p>
              </div>
              <p className="text-xs font-medium mt-1" style={{ color: '#a3a3a3' }}>
                Best
              </p>
            </div>
          </div>
        </div>

        {/* HOW IT WORKS */}
        <div
          className="bg-white rounded-2xl px-6 py-5"
          style={{
            boxShadow: '0 2px 12px rgba(0,0,0,0.04)',
            animation: mounted ? 'slideUp 0.6s ease-out 0.5s both' : 'none',
          }}
        >
          <h2
            className="text-xs font-bold tracking-widest uppercase mb-3"
            style={{ color: '#a3a3a3' }}
          >
            How It Works
          </h2>
          <div className="space-y-2.5">
            {[
              '5 prompts, 25 seconds each',
              'Type any valid medical answer',
              'Rarer answers score higher',
            ].map((text, i) => (
              <div key={i} className="flex items-start gap-3">
                <span
                  className="flex-shrink-0 w-6 h-6 rounded-full text-xs font-bold flex items-center justify-center mt-0.5"
                  style={{ background: '#f3f4f6', color: '#6b7280' }}
                >
                  {i + 1}
                </span>
                <p className="text-sm" style={{ color: '#525252' }}>{text}</p>
              </div>
            ))}
          </div>
        </div>

        {/* FOOTER */}
        <footer
          className="text-center space-y-2 pt-2 pb-8"
          style={{ animation: mounted ? 'slideUp 0.6s ease-out 0.6s both' : 'none' }}
        >
          <p className="text-xs font-medium" style={{ color: '#a3a3a3' }}>
            Made for med students
          </p>
          <a
            href="https://dailydx.org"
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center gap-1.5 text-xs font-semibold transition-colors"
            style={{ color: '#7c3aed' }}
          >
            <span>{'\u{1FA7A}'}</span> Play our diagnosis game too &rarr; dailydx.org
          </a>
        </footer>
      </div>

      {/* Keyframe animations */}
      <style>{`
        @keyframes logoPulse {
          0%, 100% { transform: scale(1); }
          50% { transform: scale(1.02); }
        }
        @keyframes slideUp {
          from {
            opacity: 0;
            transform: translateY(16px);
          }
          to {
            opacity: 1;
            transform: translateY(0);
          }
        }
      `}</style>
    </div>
  )
}
