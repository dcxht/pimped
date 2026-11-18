import { useState, useEffect } from 'react'
import HospitalScene from './HospitalScene'

const TIER_LEGEND = [
  { label: 'Pre-med', points: 100, color: '#00ff88' },
  { label: 'Med Student', points: 200, color: '#ffdd00' },
  { label: 'Resident', points: 300, color: '#ff8800' },
  { label: 'Attending', points: 400, color: '#c466ff' },
  { label: 'Professor', points: 500, color: '#ff44aa' },
]

const TIER_EMOJI = { 0: '\u{1F48A}', 1: '\u{1FA7A}', 2: '\u{1F9EC}', 3: '\u{1F9E0}', 4: '\u{1F451}', [-1]: '\u{1F480}' }

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

function getScoreTier(score) {
  if (score >= 2000) return { label: 'Professor', color: '#ff44aa' }
  if (score >= 1500) return { label: 'Attending', color: '#c466ff' }
  if (score >= 1000) return { label: 'Resident', color: '#ff8800' }
  if (score >= 500) return { label: 'Med Student', color: '#ffdd00' }
  return { label: 'Pre-med', color: '#00ff88' }
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

function formatShortDate(dateStr) {
  const d = new Date(dateStr + 'T12:00:00')
  return d.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })
}

// Hamburger slide-out menu
function SlideMenu({ open, onClose }) {
  const streak = getStreak()

  return (
    <>
      {/* Backdrop */}
      <div
        onClick={onClose}
        style={{
          position: 'fixed',
          inset: 0,
          background: 'rgba(0, 0, 0, 0.6)',
          zIndex: 90,
          opacity: open ? 1 : 0,
          pointerEvents: open ? 'auto' : 'none',
          transition: 'opacity 0.3s ease',
        }}
      />
      {/* Panel */}
      <div
        style={{
          position: 'fixed',
          top: 0,
          left: 0,
          bottom: 0,
          width: 'min(300px, 80vw)',
          background: 'rgba(10, 22, 40, 0.95)',
          backdropFilter: 'blur(20px)',
          borderRight: '1px solid rgba(0, 229, 255, 0.15)',
          zIndex: 100,
          transform: open ? 'translateX(0)' : 'translateX(-100%)',
          transition: 'transform 0.3s ease',
          overflowY: 'auto',
          padding: '24px',
        }}
      >
        {/* Close button */}
        <button
          onClick={onClose}
          style={{
            position: 'absolute',
            top: 16,
            right: 16,
            background: 'none',
            border: 'none',
            color: 'var(--text-muted)',
            fontSize: 24,
            cursor: 'pointer',
            lineHeight: 1,
          }}
        >
          {'\u2715'}
        </button>

        <h2
          className="pixel"
          style={{
            fontSize: '1rem',
            color: 'var(--accent)',
            marginBottom: 32,
            marginTop: 8,
          }}
        >
          PIMPED
        </h2>

        {/* How It Works */}
        <section style={{ marginBottom: 28 }}>
          <h3 className="hud-label" style={{ marginBottom: 12 }}>How It Works</h3>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
            {[
              '5 prompts, 25 seconds each',
              'Type any valid medical answer',
              'Rarer answers score higher',
            ].map((text, i) => (
              <div key={i} style={{ display: 'flex', alignItems: 'flex-start', gap: 10 }}>
                <span
                  className="mono"
                  style={{
                    flexShrink: 0,
                    width: 22,
                    height: 22,
                    borderRadius: 6,
                    fontSize: 11,
                    fontWeight: 700,
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    background: 'rgba(0, 229, 255, 0.1)',
                    color: 'var(--accent)',
                    border: '1px solid rgba(0, 229, 255, 0.2)',
                  }}
                >
                  {i + 1}
                </span>
                <p className="mono" style={{ fontSize: 13, color: 'var(--text-secondary)', lineHeight: 1.5 }}>{text}</p>
              </div>
            ))}
          </div>
        </section>

        {/* Scoring Tiers */}
        <section style={{ marginBottom: 28 }}>
          <h3 className="hud-label" style={{ marginBottom: 12 }}>Scoring Tiers</h3>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
            {TIER_LEGEND.map(t => (
              <div
                key={t.label}
                className="mono"
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  padding: '6px 10px',
                  borderRadius: 6,
                  background: `${t.color}10`,
                  border: `1px solid ${t.color}25`,
                  fontSize: 12,
                  fontWeight: 700,
                  color: t.color,
                }}
              >
                <span>{t.label}</span>
                <span style={{ opacity: 0.6 }}>{t.points}+</span>
              </div>
            ))}
          </div>
        </section>

        {/* Streak */}
        <section style={{ marginBottom: 28 }}>
          <h3 className="hud-label" style={{ marginBottom: 12 }}>Streak</h3>
          <div style={{ display: 'flex', gap: 24 }}>
            <div style={{ textAlign: 'center' }}>
              <p className="mono" style={{ fontSize: 28, fontWeight: 900, color: streak.current > 0 ? 'var(--accent)' : 'var(--text-muted)' }}>
                {streak.current}
              </p>
              <p className="hud-label" style={{ marginTop: 4 }}>Current</p>
            </div>
            <div style={{ width: 1, background: 'rgba(255,255,255,0.08)' }} />
            <div style={{ textAlign: 'center' }}>
              <p className="mono" style={{ fontSize: 28, fontWeight: 900, color: 'var(--tier-1)' }}>
                {streak.best}
              </p>
              <p className="hud-label" style={{ marginTop: 4 }}>Best</p>
            </div>
          </div>
        </section>

        {/* DailyDx link */}
        <section>
          <a
            href="https://dailydx.org"
            target="_blank"
            rel="noopener noreferrer"
            className="mono"
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: 8,
              fontSize: 12,
              fontWeight: 600,
              color: 'var(--accent)',
              textDecoration: 'none',
              padding: '10px 0',
            }}
          >
            Play DailyDx {'\u2192'} dailydx.org
          </a>
        </section>
      </div>
    </>
  )
}

export default function HomeScreen({ todayPrompts, gameNumber, onPlay, onPractice }) {
  const todayStr = getTodayStr()
  const played = getTodayResults()
  const countdown = useCountdown()
  const [mounted, setMounted] = useState(false)
  const [menuOpen, setMenuOpen] = useState(false)

  useEffect(() => {
    requestAnimationFrame(() => setMounted(true))
  }, [])

  const totalScore = played ? (played.totalScore ?? played.score ?? 0) : 0
  const scoreTier = getScoreTier(totalScore)

  const emojiGrid = played?.results
    ? played.results.map(r => TIER_EMOJI[r.tier] ?? '\u2B1B').join('')
    : ''

  // Shared text shadow for readability over pixel art
  const ts = '0 2px 12px rgba(0,0,0,0.9), 0 0 40px rgba(0,0,0,0.5)'
  const tsGlow = '0 2px 12px rgba(0,0,0,0.9), 0 0 40px rgba(0,0,0,0.5), 0 0 20px rgba(0,229,255,0.15)'

  return (
    <div style={{ position: 'relative', minHeight: '100dvh', overflow: 'hidden' }}>
      {/* Full-screen pixel art scene */}
      <HospitalScene depth={0} />

      {/* Slide-out menu */}
      <SlideMenu open={menuOpen} onClose={() => setMenuOpen(false)} />

      {/* Hamburger button - top left */}
      <button
        onClick={() => setMenuOpen(true)}
        aria-label="Open menu"
        style={{
          position: 'fixed',
          top: 16,
          left: 16,
          zIndex: 50,
          background: 'rgba(10, 22, 40, 0.4)',
          backdropFilter: 'blur(8px)',
          border: '1px solid rgba(255,255,255,0.08)',
          borderRadius: 10,
          width: 40,
          height: 40,
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          justifyContent: 'center',
          gap: 4,
          cursor: 'pointer',
          transition: 'background 0.2s',
        }}
      >
        <span style={{ width: 18, height: 2, background: 'var(--text-secondary)', borderRadius: 1 }} />
        <span style={{ width: 18, height: 2, background: 'var(--text-secondary)', borderRadius: 1 }} />
        <span style={{ width: 18, height: 2, background: 'var(--text-secondary)', borderRadius: 1 }} />
      </button>

      {/* Main floating content - centered vertically */}
      <div
        style={{
          position: 'relative',
          zIndex: 10,
          minHeight: '100dvh',
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          justifyContent: 'space-between',
          padding: '0 24px',
          pointerEvents: 'none',
          opacity: mounted ? 1 : 0,
          transform: mounted ? 'translateY(0)' : 'translateY(10px)',
          transition: 'opacity 0.8s ease-out, transform 0.8s ease-out',
        }}
      >
        {/* Top section: Logo + tagline */}
        <div style={{ textAlign: 'center', paddingTop: 'max(60px, 12vh)', pointerEvents: 'none' }}>
          <h1
            className="pixel glow-text select-none"
            style={{
              fontSize: 'clamp(3rem, 11vw, 4.5rem)',
              lineHeight: 1,
              color: '#e0f0ff',
              textShadow: tsGlow,
              animation: 'logoPulse 3s ease-in-out infinite',
            }}
          >
            PIMPED
          </h1>
          <p
            className="mono"
            style={{
              fontSize: 14,
              fontWeight: 600,
              marginTop: 12,
              color: 'var(--accent)',
              textShadow: ts,
              letterSpacing: '0.08em',
            }}
          >
            Get pimped. Score rare.
          </p>
        </div>

        {/* Middle section: Game info or results */}
        <div style={{ textAlign: 'center', pointerEvents: 'none' }}>
          {played ? (
            /* POST-GAME: score, emoji grid, countdown */
            <div
              style={{
                display: 'flex',
                flexDirection: 'column',
                alignItems: 'center',
                gap: 14,
                background: 'rgba(6, 12, 24, 0.55)',
                backdropFilter: 'blur(4px)',
                borderRadius: 16,
                padding: '20px 28px',
                border: '1px solid rgba(255,255,255,0.06)',
              }}
            >
              {/* Score */}
              <div>
                <span
                  className="mono"
                  style={{
                    fontSize: 48,
                    fontWeight: 900,
                    color: 'var(--text-primary)',
                    textShadow: ts,
                    lineHeight: 1,
                  }}
                >
                  {totalScore}
                </span>
                <span
                  className="mono"
                  style={{
                    fontSize: 18,
                    fontWeight: 500,
                    color: 'var(--text-muted)',
                    textShadow: ts,
                    marginLeft: 4,
                  }}
                >
                  / 2500
                </span>
              </div>

              {/* Tier badge */}
              <span
                className="mono"
                style={{
                  fontSize: 13,
                  fontWeight: 700,
                  textTransform: 'uppercase',
                  letterSpacing: '0.12em',
                  color: scoreTier.color,
                  textShadow: `0 0 14px ${scoreTier.color}aa, 0 1px 4px rgba(0,0,0,0.8)`,
                }}
              >
                {scoreTier.label}
              </span>

              {/* Emoji grid */}
              {emojiGrid && (
                <div
                  style={{
                    fontSize: 28,
                    letterSpacing: '0.2em',
                    textShadow: ts,
                  }}
                >
                  {emojiGrid}
                </div>
              )}

              {/* Countdown */}
              <div
                className="mono"
                style={{
                  fontSize: 14,
                  color: 'var(--text-secondary)',
                  textShadow: '0 1px 4px rgba(0,0,0,0.8)',
                  marginTop: 8,
                }}
              >
                Next in{' '}
                <span style={{ color: 'var(--accent)', fontWeight: 700 }}>{countdown}</span>
              </div>
            </div>
          ) : (
            /* PRE-GAME: game number + date */
            <div style={{
              background: 'rgba(6, 12, 24, 0.5)',
              backdropFilter: 'blur(4px)',
              borderRadius: 12,
              padding: '12px 20px',
              border: '1px solid rgba(255,255,255,0.06)',
            }}>
              {gameNumber != null && (
                <p
                  className="mono"
                  style={{
                    fontSize: 14,
                    color: 'var(--text-secondary)',
                    textShadow: ts,
                    letterSpacing: '0.05em',
                  }}
                >
                  #{gameNumber} &middot; {formatShortDate(todayStr)}
                </p>
              )}
            </div>
          )}
        </div>

        {/* Bottom section: Action buttons */}
        <div
          style={{
            paddingBottom: 'max(32px, 6vh)',
            width: '100%',
            maxWidth: 320,
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            gap: 14,
            pointerEvents: 'auto',
          }}
        >
          {played ? (
            /* Post-game: practice button */
            <button
              onClick={onPractice}
              className="btn-game-primary"
              style={{
                width: '100%',
                padding: '16px 0',
                borderRadius: 14,
                fontSize: 15,
                letterSpacing: '0.15em',
              }}
            >
              PRACTICE
            </button>
          ) : (
            /* Pre-game: begin rounds */
            <button
              onClick={onPlay}
              className="btn-game-primary"
              style={{
                width: '100%',
                padding: '18px 0',
                borderRadius: 14,
                fontSize: 16,
                letterSpacing: '0.15em',
              }}
            >
              BEGIN ROUNDS
            </button>
          )}

          {/* Practice link (only shown pre-game, below the main button) */}
          {!played && (
            <button
              onClick={onPractice}
              className="mono"
              style={{
                background: 'none',
                border: 'none',
                color: 'var(--text-muted)',
                fontSize: 12,
                fontWeight: 600,
                letterSpacing: '0.08em',
                cursor: 'pointer',
                textShadow: ts,
                padding: '4px 0',
                textTransform: 'uppercase',
                transition: 'color 0.2s',
              }}
              onMouseEnter={e => { e.currentTarget.style.color = 'var(--accent)' }}
              onMouseLeave={e => { e.currentTarget.style.color = 'var(--text-muted)' }}
            >
              Practice Mode
            </button>
          )}
        </div>
      </div>
    </div>
  )
}
