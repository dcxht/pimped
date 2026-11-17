import { useState, useEffect, useMemo } from 'react'
import HospitalScene from './HospitalScene'

const TIER_LEGEND = [
  { label: 'Pre-med', points: 100, color: '#00ff88' },
  { label: 'Med Student', points: 200, color: '#ffdd00' },
  { label: 'Resident', points: 300, color: '#ff8800' },
  { label: 'Attending', points: 400, color: '#c466ff' },
  { label: 'Professor', points: 500, color: '#ff44aa' },
]

const TIER_EMOJI = { 0: '💊', 1: '🩺', 2: '🧬', 3: '🧠', 4: '👑', [-1]: '💀' }

const MEDICAL_SYMBOLS = ['+', 'Rx', 'Dx', 'Hx', 'Tx', 'Sx', 'ECG', 'BP', 'HR', 'SpO2', 'ABG', 'CBC', 'BMP', 'INR']

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

// Floating medical symbols background
function FloatingSymbols() {
  const symbols = useMemo(() => {
    return Array.from({ length: 18 }, (_, i) => ({
      id: i,
      symbol: MEDICAL_SYMBOLS[i % MEDICAL_SYMBOLS.length],
      left: Math.random() * 100,
      duration: 15 + Math.random() * 20,
      delay: Math.random() * 15,
      size: 12 + Math.random() * 14,
    }))
  }, [])

  return (
    <div className="fixed inset-0 pointer-events-none overflow-hidden z-0">
      {symbols.map((s) => (
        <span
          key={s.id}
          className="float-symbol"
          style={{
            left: `${s.left}%`,
            animationDuration: `${s.duration}s`,
            animationDelay: `${s.delay}s`,
            fontSize: `${s.size}px`,
          }}
        >
          {s.symbol}
        </span>
      ))}
    </div>
  )
}

export default function HomeScreen({ todayPrompts, gameNumber, onPlay, onPractice }) {
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

  const emojiGrid = played?.results
    ? played.results.map(r => TIER_EMOJI[r.tier] ?? '\u2B1B').join('')
    : ''

  return (
    <div className="relative min-h-[100dvh] overflow-hidden">
      <HospitalScene depth={0} />

      <div
        className="relative z-10 flex-1 max-w-lg mx-auto w-full px-5 py-8 flex flex-col gap-6"
        style={{
          opacity: mounted ? 1 : 0,
          transform: mounted ? 'translateY(0)' : 'translateY(12px)',
          transition: 'opacity 0.6s ease-out, transform 0.6s ease-out',
        }}
      >

        {/* LOGO */}
        <header className="text-center pt-10 pb-2">
          <h1
            className="pixel select-none glow-text"
            style={{
              fontSize: 'clamp(3.5rem, 12vw, 5rem)',
              lineHeight: 1,
              color: '#e0f0ff',
              animation: 'logoPulse 3s ease-in-out infinite',
            }}
          >
            PIMPED
          </h1>
          <p
            className="mono text-sm font-medium mt-3 tracking-wider"
            style={{ color: 'var(--accent)' }}
          >
            Get pimped. Score rare.
          </p>
        </header>

        {/* TODAY'S ROUND */}
        <div
          className="rounded-xl overflow-hidden border"
          style={{
            background: 'rgba(10, 22, 40, 0.7)',
            borderColor: 'rgba(0, 229, 255, 0.15)',
            backdropFilter: 'blur(12px)',
            animation: mounted ? 'slideUp 0.6s ease-out 0.15s both' : 'none',
          }}
        >
          <div className="px-6 py-5 space-y-4">
            {/* Top row */}
            <div className="flex items-center justify-between">
              <span className="hud-label">
                Today's Round
              </span>
              {gameNumber != null && (
                <span className="hud-label">
                  #{gameNumber}
                </span>
              )}
            </div>

            <p className="mono text-sm font-medium" style={{ color: 'var(--text-secondary)' }}>
              {formatDate(todayStr)}
            </p>

            {specialties.length > 0 && (
              <div className="flex flex-wrap gap-2">
                {specialties.map(s => (
                  <span
                    key={s}
                    className="mono text-xs font-bold tracking-wide px-2.5 py-1 rounded-md"
                    style={{
                      background: 'rgba(0, 229, 255, 0.08)',
                      color: 'var(--accent)',
                      border: '1px solid rgba(0, 229, 255, 0.2)',
                    }}
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
                    className="inline-flex items-center px-3 py-1.5 rounded-md mono text-xs font-bold uppercase tracking-wide"
                    style={{
                      background: `${scoreTier.color}20`,
                      color: scoreTier.color,
                      border: `1px solid ${scoreTier.color}40`,
                    }}
                  >
                    {scoreTier.label}
                  </span>
                  <span className="text-3xl font-black" style={{ color: 'var(--text-primary)' }}>
                    {totalScore}
                    <span className="text-sm font-medium ml-1" style={{ color: 'var(--text-muted)' }}>
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
                <div className="flex items-center gap-2 mono text-sm" style={{ color: 'var(--text-muted)' }}>
                  <svg className="w-4 h-4 flex-shrink-0" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" d="M12 6v6h4.5m4.5 0a9 9 0 11-18 0 9 9 0 0118 0z" />
                  </svg>
                  Next round in <span className="font-bold" style={{ color: 'var(--text-primary)' }}>{countdown}</span>
                </div>
              </div>
            ) : (
              <button
                onClick={onPlay}
                className="btn-game-primary w-full py-4 rounded-xl text-lg"
              >
                BEGIN ROUNDS
              </button>
            )}
          </div>
        </div>

        {/* PRACTICE MODE */}
        <div
          style={{ animation: mounted ? 'slideUp 0.6s ease-out 0.25s both' : 'none' }}
        >
          <button
            onClick={onPractice}
            className="w-full py-3.5 rounded-xl text-base font-bold tracking-wide uppercase transition-all active:scale-[0.97]"
            style={{
              background: 'rgba(0, 229, 255, 0.1)',
              border: '1.5px solid rgba(0, 229, 255, 0.4)',
              color: '#00e5ff',
            }}
          >
            PRACTICE MODE — Unlimited Rounds
          </button>
        </div>

        {/* SCORING TIERS */}
        <div
          style={{ animation: mounted ? 'slideUp 0.6s ease-out 0.3s both' : 'none' }}
        >
          <h2 className="hud-label px-1 mb-3">
            Scoring Tiers
          </h2>
          <div className="flex flex-wrap gap-2">
            {TIER_LEGEND.map(t => (
              <span
                key={t.label}
                className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-md mono text-xs font-bold"
                style={{
                  background: `${t.color}15`,
                  color: t.color,
                  border: `1px solid ${t.color}30`,
                }}
              >
                {t.label}
                <span style={{ opacity: 0.6 }}>{t.points}</span>
              </span>
            ))}
          </div>
        </div>

        {/* STREAK */}
        <div
          className="rounded-xl px-6 py-5 border"
          style={{
            background: 'rgba(10, 22, 40, 0.5)',
            borderColor: 'rgba(255, 255, 255, 0.06)',
            animation: mounted ? 'slideUp 0.6s ease-out 0.4s both' : 'none',
          }}
        >
          <h2 className="hud-label mb-4">Streak</h2>
          <div className="flex items-center justify-around">
            <div className="text-center">
              <p className="text-3xl font-black mono" style={{ color: streak.current > 0 ? 'var(--accent)' : 'var(--text-muted)' }}>
                {streak.current}
              </p>
              <p className="hud-label mt-1">Current</p>
            </div>
            <div className="w-px h-10" style={{ background: 'rgba(255,255,255,0.08)' }} />
            <div className="text-center">
              <p className="text-3xl font-black mono" style={{ color: 'var(--tier-1)' }}>
                {streak.best}
              </p>
              <p className="hud-label mt-1">Best</p>
            </div>
          </div>
        </div>

        {/* HOW IT WORKS */}
        <div
          className="rounded-xl px-6 py-5 border"
          style={{
            background: 'rgba(10, 22, 40, 0.5)',
            borderColor: 'rgba(255, 255, 255, 0.06)',
            animation: mounted ? 'slideUp 0.6s ease-out 0.5s both' : 'none',
          }}
        >
          <h2 className="hud-label mb-3">How It Works</h2>
          <div className="space-y-2.5">
            {[
              '5 prompts, 25 seconds each',
              'Type any valid medical answer',
              'Rarer answers score higher',
            ].map((text, i) => (
              <div key={i} className="flex items-start gap-3">
                <span
                  className="flex-shrink-0 w-6 h-6 rounded-md mono text-xs font-bold flex items-center justify-center mt-0.5"
                  style={{
                    background: 'rgba(0, 229, 255, 0.1)',
                    color: 'var(--accent)',
                    border: '1px solid rgba(0, 229, 255, 0.2)',
                  }}
                >
                  {i + 1}
                </span>
                <p className="text-sm" style={{ color: 'var(--text-secondary)' }}>{text}</p>
              </div>
            ))}
          </div>
        </div>

        {/* FOOTER */}
        <footer
          className="text-center space-y-2 pt-2 pb-8"
          style={{ animation: mounted ? 'slideUp 0.6s ease-out 0.6s both' : 'none' }}
        >
          <p className="mono text-xs" style={{ color: 'var(--text-muted)' }}>
            Made for med students
          </p>
          <a
            href="https://dailydx.org"
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center gap-1.5 mono text-xs font-semibold transition-colors"
            style={{ color: 'var(--accent)' }}
          >
            Play our diagnosis game too &rarr; dailydx.org
          </a>
        </footer>
      </div>
    </div>
  )
}
