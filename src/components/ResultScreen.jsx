import { useState } from 'react'

const TIER_CONFIG = [
  { label: 'Pre-med',    color: '#22c55e', emoji: '\u{1F7E9}' },
  { label: 'Med Student', color: '#eab308', emoji: '\u{1F7E8}' },
  { label: 'Resident',    color: '#f97316', emoji: '\u{1F7E7}' },
  { label: 'Attending',   color: '#a855f7', emoji: '\u{1F7EA}' },
  { label: 'Professor',   color: '#ec4899', emoji: '\u{1F7EA}' },
]

const MISSED_EMOJI = '\u2B1B'

const PERFORMANCE_LABELS = [
  { max: 500,  label: 'Intern' },
  { max: 1000, label: 'Medical Student' },
  { max: 1500, label: 'Resident' },
  { max: 2000, label: 'Attending' },
  { max: 2500, label: 'Professor' },
]

function getPerformanceLabel(total) {
  for (const { max, label } of PERFORMANCE_LABELS) {
    if (total <= max) return label
  }
  return 'Professor'
}

function getEmojiForResult(r) {
  if (!r || !r.tier && r.tier !== 0 || r.passed || r.points === 0) return MISSED_EMOJI
  const tierIdx = Math.min(r.tier, 4)
  return TIER_CONFIG[tierIdx]?.emoji || MISSED_EMOJI
}

function getTierLabel(tier) {
  if (tier == null || tier < 0 || tier > 4) return null
  return TIER_CONFIG[tier].label
}

function getTierColor(tier) {
  if (tier == null || tier < 0 || tier > 4) return '#6b7280'
  return TIER_CONFIG[tier].color
}

function formatDate() {
  return new Date().toLocaleDateString('en-US', {
    month: 'long',
    day: 'numeric',
    year: 'numeric',
  })
}

export default function ResultScreen({ results, prompts, gameNumber, onPlayAgain }) {
  const [copied, setCopied] = useState(false)
  const [expandedIdx, setExpandedIdx] = useState(null)

  const totalPoints = results.reduce((sum, r) => sum + (r.points || 0), 0)
  const perfLabel = getPerformanceLabel(totalPoints)

  // Build share text
  const emojiRow = results.map(r => getEmojiForResult(r)).join('')
  const shareText = `Pimped #${gameNumber} \u{1FA7A}\n${totalPoints}/2500\n${emojiRow}\npimped.io`

  async function handleCopy() {
    try {
      await navigator.clipboard.writeText(shareText)
      setCopied(true)
      setTimeout(() => setCopied(false), 2000)
    } catch {
      // Fallback
      const ta = document.createElement('textarea')
      ta.value = shareText
      document.body.appendChild(ta)
      ta.select()
      document.execCommand('copy')
      document.body.removeChild(ta)
      setCopied(true)
      setTimeout(() => setCopied(false), 2000)
    }
  }

  function toggleAccordion(idx) {
    setExpandedIdx(prev => (prev === idx ? null : idx))
  }

  return (
    <div className="min-h-screen" style={{ backgroundColor: '#F5F3EC', color: '#1a1a1a' }}>
      <div className="max-w-lg mx-auto px-5 py-8 space-y-8">

        {/* ── 1. HEADER ── */}
        <div className="text-center space-y-1">
          <h1 className="text-3xl font-bold tracking-tight">
            PIMPED #{gameNumber}
          </h1>
          <p className="text-sm opacity-60">{formatDate()}</p>
          <p className="text-lg font-semibold mt-2">
            {totalPoints} <span className="opacity-50">/ 2500</span>
          </p>
        </div>

        {/* ── 2. SCORE SUMMARY ── */}
        <div className="text-center space-y-3">
          <div className="text-6xl font-extrabold tracking-tight">{totalPoints}</div>
          <div
            className="inline-block px-4 py-1.5 rounded-full text-sm font-semibold text-white"
            style={{
              backgroundColor:
                totalPoints <= 500 ? '#6b7280'
                : totalPoints <= 1000 ? '#eab308'
                : totalPoints <= 1500 ? '#f97316'
                : totalPoints <= 2000 ? '#a855f7'
                : '#ec4899',
            }}
          >
            {perfLabel}
          </div>
        </div>

        {/* ── 3. SHARE SECTION ── */}
        <div className="rounded-2xl p-5 space-y-4" style={{ backgroundColor: '#ece9e0' }}>
          <div className="text-center text-2xl tracking-widest">{emojiRow}</div>
          <button
            onClick={handleCopy}
            className="w-full py-3 rounded-xl text-sm font-semibold transition-all active:scale-95"
            style={{
              backgroundColor: copied ? '#22c55e' : '#1a1a1a',
              color: '#F5F3EC',
            }}
          >
            {copied ? 'Copied!' : 'Copy results'}
          </button>
        </div>

        {/* ── 4. YOUR ANSWERS ── */}
        <div className="space-y-1">
          <h2 className="text-xs font-bold uppercase tracking-widest opacity-50 mb-3">
            Your Answers
          </h2>
          <div className="space-y-3">
            {results.map((r, i) => {
              const prompt = prompts[i]
              const missed = r.passed || r.points === 0
              return (
                <div
                  key={i}
                  className="rounded-xl p-4"
                  style={{ backgroundColor: '#ece9e0' }}
                >
                  <p className="text-sm font-medium opacity-70 mb-2 leading-snug">
                    {prompt?.prompt || `Prompt ${i + 1}`}
                  </p>
                  {missed ? (
                    <span className="text-sm font-semibold opacity-40">
                      {r.passed ? 'PASSED' : "TIME'S UP"}
                    </span>
                  ) : (
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="text-sm font-semibold">{r.answer}</span>
                      <span
                        className="text-xs font-bold px-2 py-0.5 rounded-full text-white"
                        style={{ backgroundColor: getTierColor(r.tier) }}
                      >
                        {getTierLabel(r.tier)}
                      </span>
                      <span className="text-xs font-semibold opacity-50">
                        +{r.points} pts
                      </span>
                    </div>
                  )}
                </div>
              )
            })}
          </div>
        </div>

        {/* ── 5. FULL ANSWER SHEETS (Accordion) ── */}
        <div className="space-y-1">
          <h2 className="text-xs font-bold uppercase tracking-widest opacity-50 mb-3">
            Full Answer Sheets
          </h2>
          <div className="space-y-2">
            {prompts.map((p, i) => {
              const isOpen = expandedIdx === i
              // Group answers by tier
              const answersByTier = {}
              if (p?.answers) {
                for (const a of p.answers) {
                  const t = a.tier ?? 0
                  if (!answersByTier[t]) answersByTier[t] = []
                  answersByTier[t].push(a)
                }
              }

              return (
                <div
                  key={i}
                  className="rounded-xl overflow-hidden"
                  style={{ backgroundColor: '#ece9e0' }}
                >
                  <button
                    onClick={() => toggleAccordion(i)}
                    className="w-full flex items-center justify-between px-4 py-3 text-left"
                  >
                    <span className="text-sm font-medium leading-snug pr-4">
                      {p?.prompt || `Prompt ${i + 1}`}
                    </span>
                    <svg
                      className={`w-4 h-4 shrink-0 transition-transform duration-200 ${isOpen ? 'rotate-180' : ''}`}
                      fill="none"
                      viewBox="0 0 24 24"
                      strokeWidth={2.5}
                      stroke="currentColor"
                    >
                      <path strokeLinecap="round" strokeLinejoin="round" d="M19.5 8.25l-7.5 7.5-7.5-7.5" />
                    </svg>
                  </button>
                  {isOpen && (
                    <div className="px-4 pb-4 space-y-3">
                      {[0, 1, 2, 3, 4].map(tier => {
                        const answers = answersByTier[tier]
                        if (!answers || answers.length === 0) return null
                        const cfg = TIER_CONFIG[tier]
                        return (
                          <div key={tier}>
                            <div className="flex items-center gap-2 mb-1.5">
                              <span
                                className="text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-full text-white"
                                style={{ backgroundColor: cfg.color }}
                              >
                                {cfg.label}
                              </span>
                            </div>
                            <div className="flex flex-wrap gap-1.5">
                              {answers.map((a, j) => (
                                <span
                                  key={j}
                                  className="text-xs px-2.5 py-1 rounded-lg font-medium"
                                  style={{
                                    backgroundColor: '#F5F3EC',
                                    border: `1.5px solid ${cfg.color}`,
                                    color: '#1a1a1a',
                                  }}
                                >
                                  {a.text || a.answer || a}
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

        {/* ── PLAY AGAIN (future practice mode) ── */}
        {onPlayAgain && (
          <div className="pt-2 pb-8">
            <button
              onClick={onPlayAgain}
              className="w-full py-3.5 rounded-xl text-sm font-semibold transition-all active:scale-95"
              style={{ backgroundColor: '#1a1a1a', color: '#F5F3EC' }}
            >
              Play Again
            </button>
          </div>
        )}
      </div>
    </div>
  )
}
