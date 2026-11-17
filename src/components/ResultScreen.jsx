import { useState, useEffect, useRef } from 'react'

const TIER_NAMES = {
  0: 'Pre-med',
  1: 'Med Student',
  2: 'Resident',
  3: 'Attending',
  4: 'Professor',
  [-1]: 'Missed',
}

const TIER_COLORS = {
  0: { bg: '#dcfce7', text: '#15803d', accent: '#16a34a' },
  1: { bg: '#fef9c3', text: '#a16207', accent: '#ca8a04' },
  2: { bg: '#ffedd5', text: '#c2410c', accent: '#ea580c' },
  3: { bg: '#ede9fe', text: '#7c3aed', accent: '#7c3aed' },
  4: { bg: '#f3e8ff', text: '#6b21a8', accent: '#6b21a8' },
  [-1]: { bg: '#f3f4f6', text: '#6b7280', accent: '#9ca3af' },
}

const TIER_EMOJI = {
  0: '\u{1F7E9}',
  1: '\u{1F7E8}',
  2: '\u{1F7E7}',
  3: '\u{1F7EA}',
  4: '\u{1F7EA}',
  [-1]: '\u2B1B',
}

const TIER_POINTS = { 0: 100, 1: 200, 2: 300, 3: 400, 4: 500 }

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
      `Pimped #${gameNumber} \u{1FA7A}`,
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
    <div className="min-h-[100dvh] flex flex-col" style={{ background: '#F5F3EC' }}>
      <div
        className="flex-1 max-w-lg mx-auto w-full px-5 py-8 flex flex-col gap-5"
        style={{
          opacity: mounted ? 1 : 0,
          transform: mounted ? 'translateY(0)' : 'translateY(12px)',
          transition: 'opacity 0.5s ease-out, transform 0.5s ease-out',
        }}
      >

        {/* HEADER */}
        <header className="text-center pt-4 pb-2">
          <p
            className="text-xs font-bold tracking-widest uppercase mb-3"
            style={{ color: '#a3a3a3' }}
          >
            Pimped #{gameNumber}
          </p>

          {/* Animated score */}
          <p
            className="font-black text-gray-900"
            style={{
              fontSize: 'clamp(3rem, 10vw, 4.5rem)',
              lineHeight: 1,
            }}
          >
            {animatedScore}
          </p>
          <p className="text-sm mt-1" style={{ color: '#737373' }}>
            out of {maxScore} possible
          </p>
        </header>

        {/* TIER BADGE */}
        <div
          className="text-center"
          style={{ animation: mounted ? 'popIn 0.5s ease-out 0.4s both' : 'none' }}
        >
          <span
            className="inline-flex items-center px-5 py-2.5 rounded-full text-sm font-black uppercase tracking-wider"
            style={{
              background: overallColors.accent,
              color: '#fff',
              boxShadow: `0 4px 14px ${overallColors.accent}50`,
            }}
          >
            {overall.label}
          </span>
        </div>

        {/* SHARE SECTION */}
        <div
          className="bg-white rounded-2xl px-6 py-5 text-center"
          style={{
            boxShadow: '0 4px 24px rgba(0,0,0,0.08)',
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
            className="w-full py-3.5 rounded-xl text-white text-base font-bold tracking-wide
                       active:scale-[0.97] transition-all"
            style={{
              background: copied
                ? '#16a34a'
                : 'linear-gradient(135deg, #7c3aed 0%, #6d28d9 100%)',
              boxShadow: copied
                ? '0 4px 14px rgba(22, 163, 106, 0.35)'
                : '0 4px 14px rgba(124, 58, 237, 0.35)',
            }}
          >
            {copied ? 'Copied!' : 'SHARE'}
          </button>
        </div>

        {/* YOUR ANSWERS */}
        <div
          style={{ animation: mounted ? 'slideUp 0.6s ease-out 0.65s both' : 'none' }}
        >
          <h2
            className="text-xs font-bold tracking-widest uppercase px-1 mb-3"
            style={{ color: '#a3a3a3' }}
          >
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
                  className="bg-white rounded-xl overflow-hidden transition-all"
                  style={{
                    boxShadow: '0 2px 12px rgba(0,0,0,0.04)',
                    animation: mounted ? `slideUp 0.4s ease-out ${0.7 + i * 0.08}s both` : 'none',
                  }}
                >
                  {/* Main row */}
                  <button
                    onClick={() => toggleExpand(i)}
                    className="w-full px-5 py-4 flex items-center justify-between text-left"
                  >
                    <div className="min-w-0 flex-1 space-y-1">
                      <p className="text-xs font-bold uppercase tracking-wide" style={{ color: '#a3a3a3' }}>
                        {r.specialty || prompt?.specialty || `Prompt ${i + 1}`}
                      </p>
                      <p className="text-sm text-gray-700 truncate">
                        {r.prompt || prompt?.prompt || ''}
                      </p>
                      {r.answer ? (
                        <p className="text-sm font-semibold text-gray-900">{r.answer}</p>
                      ) : (
                        <p className="text-sm italic" style={{ color: '#a3a3a3' }}>
                          {r.passed ? 'Passed' : 'No answer'}
                        </p>
                      )}
                    </div>
                    <div className="text-right ml-4 flex-shrink-0 space-y-1">
                      <p className="text-xl font-black text-gray-900">{r.points || 0}</p>
                      <span
                        className="inline-block text-xs font-bold px-2 py-0.5 rounded-full"
                        style={{ background: tierColors.bg, color: tierColors.text }}
                      >
                        {TIER_NAMES[r.tier] ?? 'Missed'}
                      </span>
                    </div>
                  </button>

                  {/* Expanded: all accepted answers by tier */}
                  {isExpanded && prompt?.answers && (
                    <div
                      className="px-5 pb-4 pt-0 border-t"
                      style={{ borderColor: '#f3f4f6' }}
                    >
                      <p
                        className="text-xs font-bold uppercase tracking-wide mb-3 mt-3"
                        style={{ color: '#a3a3a3' }}
                      >
                        All Accepted Answers
                      </p>
                      {Object.entries(groupAnswersByTier(prompt.answers))
                        .sort(([a], [b]) => Number(b) - Number(a))
                        .map(([tier, answers]) => {
                          const tc = TIER_COLORS[tier] ?? TIER_COLORS[-1]
                          return (
                            <div key={tier} className="mb-2.5 last:mb-0">
                              <p className="text-xs font-bold mb-1" style={{ color: tc.text }}>
                                {TIER_NAMES[tier]} ({TIER_POINTS[tier]} pts)
                              </p>
                              <div className="flex flex-wrap gap-1.5">
                                {answers.map((a, j) => (
                                  <span
                                    key={j}
                                    className="text-xs px-2 py-1 rounded-md font-medium"
                                    style={{
                                      background: tc.bg,
                                      color: tc.text,
                                      opacity: r.answer && a.toLowerCase() === r.answer.toLowerCase() ? 1 : 0.7,
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
            <p className="text-xs font-bold uppercase tracking-widest" style={{ color: '#a3a3a3' }}>
              Next round in
            </p>
            <p className="mono text-2xl font-bold text-gray-900">{countdown}</p>
          </div>

          <button
            onClick={onHome}
            className="w-full py-3.5 rounded-xl text-base font-bold tracking-wide
                       border-2 transition-all active:scale-[0.97]"
            style={{ borderColor: '#d4d4d4', color: '#525252' }}
          >
            Back to Home
          </button>
        </div>
      </div>

      <style>{`
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
        @keyframes popIn {
          from {
            opacity: 0;
            transform: scale(0.7);
          }
          to {
            opacity: 1;
            transform: scale(1);
          }
        }
      `}</style>
    </div>
  )
}
