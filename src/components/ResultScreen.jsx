import { useState, useEffect, useRef, useMemo } from 'react'
import HospitalScene from './HospitalScene'

const TIER_NAMES = {
  0: 'Pre-med',
  1: 'Med Student',
  2: 'Resident',
  3: 'Attending',
  4: 'Professor',
  [-1]: 'Missed',
}

const TIER_COLORS = {
  0: { color: '#00ff88', bg: 'rgba(0, 255, 136, 0.1)', border: 'rgba(0, 255, 136, 0.25)' },
  1: { color: '#ffdd00', bg: 'rgba(255, 221, 0, 0.1)', border: 'rgba(255, 221, 0, 0.25)' },
  2: { color: '#ff8800', bg: 'rgba(255, 136, 0, 0.1)', border: 'rgba(255, 136, 0, 0.25)' },
  3: { color: '#c466ff', bg: 'rgba(196, 102, 255, 0.1)', border: 'rgba(196, 102, 255, 0.25)' },
  4: { color: '#ff44aa', bg: 'rgba(255, 68, 170, 0.1)', border: 'rgba(255, 68, 170, 0.25)' },
  [-1]: { color: '#4a6a85', bg: 'rgba(74, 106, 133, 0.1)', border: 'rgba(74, 106, 133, 0.25)' },
}

const TIER_EMOJI = {
  0: '💊',    // Pre-med (common)
  1: '🩺',    // Med Student
  2: '🧬',    // Resident
  3: '🧠',    // Attending
  4: '👑',    // Professor (rare)
  [-1]: '💀',  // Missed
}

const TIER_POINTS = { 0: 100, 1: 200, 2: 300, 3: 400, 4: 500 }

const MEDICAL_SYMBOLS = ['+', 'Rx', 'Dx', 'Hx', 'Tx', 'Sx', 'ECG', 'BP', 'HR', 'SpO2']

function getOverallTier(score) {
  if (score >= 2000) return { label: 'Professor', tier: 4 }
  if (score >= 1500) return { label: 'Attending', tier: 3 }
  if (score >= 1000) return { label: 'Resident', tier: 2 }
  if (score >= 500) return { label: 'Med Student', tier: 1 }
  return { label: 'Pre-med', tier: 0 }
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

function useAnimatedCounter(target, duration = 1200) {
  const [value, setValue] = useState(0)
  const ref = useRef(null)

  useEffect(() => {
    const start = performance.now()
    function tick(now) {
      const elapsed = now - start
      const progress = Math.min(elapsed / duration, 1)
      const eased = 1 - Math.pow(1 - progress, 3)
      setValue(Math.round(eased * target))
      if (progress < 1) {
        ref.current = requestAnimationFrame(tick)
      }
    }
    ref.current = requestAnimationFrame(tick)
    return () => {
      if (ref.current) cancelAnimationFrame(ref.current)
    }
  }, [target, duration])

  return value
}

function groupAnswersByTier(answers) {
  const groups = {}
  for (const [answer, tier] of Object.entries(answers)) {
    if (!groups[tier]) groups[tier] = []
    groups[tier].push(answer)
  }
  return groups
}

// Floating medical symbols
function FloatingSymbols() {
  const symbols = useMemo(() => {
    return Array.from({ length: 14 }, (_, i) => ({
      id: i,
      symbol: MEDICAL_SYMBOLS[i % MEDICAL_SYMBOLS.length],
      left: Math.random() * 100,
      duration: 18 + Math.random() * 20,
      delay: Math.random() * 18,
      size: 11 + Math.random() * 10,
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

export default function ResultScreen({ results, prompts, gameNumber, onHome }) {
  const totalScore = results.reduce((sum, r) => sum + (r.points || 0), 0)
  const maxScore = 5 * 500
  const animatedScore = useAnimatedCounter(totalScore)
  const countdown = useCountdown()
  const [mounted, setMounted] = useState(false)
  const [copied, setCopied] = useState(false)
  const [expandedIndex, setExpandedIndex] = useState(null)

  useEffect(() => {
    requestAnimationFrame(() => setMounted(true))
  }, [])

  const overall = getOverallTier(totalScore)
  const overallColors = TIER_COLORS[overall.tier]

  const emojiGrid = results.map(r => TIER_EMOJI[r.tier] ?? '\u2B1B').join('')

  function handleShare() {
    const text = [
      `Pimped #${gameNumber}`,
      `${totalScore}/${maxScore}`,
      emojiGrid,
      'pimped.io',
    ].join('\n')

    navigator.clipboard.writeText(text).then(() => {
      setCopied(true)
      setTimeout(() => setCopied(false), 2000)
    }).catch(() => {
      const ta = document.createElement('textarea')
      ta.value = text
      document.body.appendChild(ta)
      ta.select()
      document.execCommand('copy')
      document.body.removeChild(ta)
      setCopied(true)
      setTimeout(() => setCopied(false), 2000)
    })
  }

  function toggleExpand(i) {
    setExpandedIndex(expandedIndex === i ? null : i)
  }

  return (
    <div className="relative min-h-[100dvh] overflow-hidden">
      <HospitalScene depth={totalScore} />

      <div
        className="relative z-10 flex-1 max-w-lg mx-auto w-full px-5 py-8 flex flex-col gap-5"
        style={{
          opacity: mounted ? 1 : 0,
          transform: mounted ? 'translateY(0)' : 'translateY(12px)',
          transition: 'opacity 0.5s ease-out, transform 0.5s ease-out',
        }}
      >

        {/* HEADER */}
        <header className="text-center pt-4 pb-2">
          <p className="hud-label mb-3">
            Pimped #{gameNumber}
          </p>

          {/* Animated score */}
          <p
            className="font-black mono glow-text"
            style={{
              fontSize: 'clamp(3rem, 10vw, 4.5rem)',
              lineHeight: 1,
              color: 'var(--text-primary)',
            }}
          >
            {animatedScore}
          </p>
          <p className="mono text-sm mt-1" style={{ color: 'var(--text-muted)' }}>
            out of {maxScore} possible
          </p>
        </header>

        {/* TIER BADGE */}
        <div
          className="text-center"
          style={{ animation: mounted ? 'popIn 0.5s ease-out 0.4s both' : 'none' }}
        >
          <span
            className="inline-flex items-center px-5 py-2.5 rounded-lg mono text-sm font-black uppercase tracking-wider"
            style={{
              background: overallColors.bg,
              color: overallColors.color,
              border: `1px solid ${overallColors.border}`,
              boxShadow: `0 0 20px ${overallColors.bg}`,
              textShadow: `0 0 10px ${overallColors.color}50`,
            }}
          >
            {overall.label}
          </span>
        </div>

        {/* DEPTH REACHED */}
        <div className="text-center">
          <p className="hud-label mb-1">Maximum Depth</p>
          <p className="mono text-2xl font-bold" style={{ color: 'var(--accent)', textShadow: '0 0 15px var(--accent-dim)' }}>
            {totalScore}m
          </p>
        </div>

        {/* SHARE SECTION */}
        <div
          className="rounded-xl px-6 py-5 text-center border"
          style={{
            background: 'rgba(10, 22, 40, 0.7)',
            borderColor: 'rgba(255, 255, 255, 0.06)',
            backdropFilter: 'blur(12px)',
            animation: mounted ? 'slideUp 0.6s ease-out 0.5s both' : 'none',
          }}
        >
          <div
            className="text-3xl tracking-widest select-none mb-4"
            style={{ letterSpacing: '0.2em' }}
          >
            {emojiGrid}
          </div>

          <button
            onClick={handleShare}
            className={`w-full py-3.5 rounded-xl mono text-base font-bold tracking-wide active:scale-[0.97] transition-all ${
              copied ? '' : 'btn-game-primary'
            }`}
            style={copied ? {
              background: 'rgba(0, 255, 136, 0.15)',
              border: '1px solid rgba(0, 255, 136, 0.4)',
              color: '#00ff88',
            } : {}}
          >
            {copied ? 'COPIED!' : 'SHARE'}
          </button>
        </div>

        {/* YOUR ANSWERS */}
        <div
          style={{ animation: mounted ? 'slideUp 0.6s ease-out 0.65s both' : 'none' }}
        >
          <h2 className="hud-label px-1 mb-3">
            Your Answers
          </h2>

          <div className="space-y-3">
            {results.map((r, i) => {
              const tierColors = TIER_COLORS[r.tier] ?? TIER_COLORS[-1]
              const isExpanded = expandedIndex === i
              const prompt = prompts?.[r.promptIndex] ?? prompts?.[i]

              return (
                <div
                  key={i}
                  className="rounded-xl overflow-hidden border transition-all"
                  style={{
                    background: 'rgba(10, 22, 40, 0.6)',
                    borderColor: 'rgba(255, 255, 255, 0.06)',
                    animation: mounted ? `slideUp 0.4s ease-out ${0.7 + i * 0.08}s both` : 'none',
                  }}
                >
                  {/* Main row */}
                  <button
                    onClick={() => toggleExpand(i)}
                    className="w-full px-5 py-4 flex items-center justify-between text-left"
                  >
                    <div className="min-w-0 flex-1 space-y-1">
                      <p className="hud-label">
                        {r.specialty || prompt?.specialty || `Prompt ${i + 1}`}
                      </p>
                      <p className="text-sm truncate" style={{ color: 'var(--text-secondary)' }}>
                        {r.prompt || prompt?.prompt || ''}
                      </p>
                      {r.answer ? (
                        <p className="mono text-sm font-semibold" style={{ color: 'var(--text-primary)' }}>{r.answer}</p>
                      ) : (
                        <p className="mono text-sm italic" style={{ color: 'var(--text-muted)' }}>
                          {r.passed ? 'Passed' : 'No answer'}
                        </p>
                      )}
                    </div>
                    <div className="text-right ml-4 flex-shrink-0 space-y-1">
                      <p className="text-xl font-black mono" style={{ color: 'var(--text-primary)' }}>{r.points || 0}</p>
                      <span
                        className="inline-block mono text-xs font-bold px-2 py-0.5 rounded-md"
                        style={{
                          background: tierColors.bg,
                          color: tierColors.color,
                          border: `1px solid ${tierColors.border}`,
                        }}
                      >
                        {TIER_NAMES[r.tier] ?? 'Missed'}
                      </span>
                    </div>
                  </button>

                  {/* Expanded: all accepted answers by tier */}
                  {isExpanded && prompt?.answers && (
                    <div
                      className="px-5 pb-4 pt-0 border-t"
                      style={{ borderColor: 'rgba(255,255,255,0.06)' }}
                    >
                      <p className="hud-label mb-3 mt-3">
                        All Accepted Answers
                      </p>
                      {Object.entries(groupAnswersByTier(prompt.answers))
                        .sort(([a], [b]) => Number(b) - Number(a))
                        .map(([tier, answers]) => {
                          const tc = TIER_COLORS[tier] ?? TIER_COLORS[-1]
                          return (
                            <div key={tier} className="mb-2.5 last:mb-0">
                              <p className="mono text-xs font-bold mb-1" style={{ color: tc.color }}>
                                {TIER_NAMES[tier]} ({TIER_POINTS[tier]} pts)
                              </p>
                              <div className="flex flex-wrap gap-1.5">
                                {answers.map((a, j) => (
                                  <span
                                    key={j}
                                    className="mono text-xs px-2 py-1 rounded-md font-medium"
                                    style={{
                                      background: tc.bg,
                                      color: tc.color,
                                      border: `1px solid ${tc.border}`,
                                      opacity: r.answer && a.toLowerCase() === r.answer.toLowerCase() ? 1 : 0.6,
                                      fontWeight: r.answer && a.toLowerCase() === r.answer.toLowerCase() ? 800 : 500,
                                    }}
                                  >
                                    {a}
                                  </span>
                                ))}
                              </div>
                            </div>
                          )
                        })}
                    </div>
                  )}
                </div>
              )
            })}
          </div>
        </div>

        {/* FOOTER */}
        <div
          className="text-center space-y-4 pt-2 pb-8"
          style={{ animation: mounted ? 'slideUp 0.6s ease-out 1s both' : 'none' }}
        >
          <div className="space-y-1">
            <p className="hud-label">
              Next round in
            </p>
            <p className="mono text-2xl font-bold" style={{ color: 'var(--accent)', textShadow: '0 0 10px var(--accent-dim)' }}>
              {countdown}
            </p>
          </div>

          <button
            onClick={onHome}
            className="btn-game w-full py-3.5 rounded-xl text-base"
          >
            BACK TO LOBBY
          </button>
        </div>
      </div>
    </div>
  )
}
