import { useState, useEffect, useRef, useCallback, useMemo } from 'react'

const TIMER_DURATION = 25000
const TOTAL_PROMPTS = 5

const TIER_NAMES = {
  0: 'Pre-med',
  1: 'Med Student',
  2: 'Resident',
  3: 'Attending',
  4: 'Professor',
}

const TIER_POINTS = {
  0: 100,
  1: 200,
  2: 300,
  3: 400,
  4: 500,
}

const TIER_COLORS_HEX = {
  0: '#00ff88',
  1: '#ffdd00',
  2: '#ff8800',
  3: '#c466ff',
  4: '#ff44aa',
}

const DEPTH_FLOORS = [
  { label: 'LOBBY', depth: '0m', score: 0 },
  { label: 'WARD', depth: '500m', score: 500 },
  { label: 'ICU', depth: '1000m', score: 1000 },
  { label: 'OR', depth: '1500m', score: 1500 },
  { label: "CHIEF'S OFFICE", depth: '2000m', score: 2000 },
]

const MAX_SCORE = 2500

const MEDICAL_SYMBOLS = ['+', 'Rx', 'Dx', 'Hx', 'Tx', 'Sx', 'ECG', 'BP', 'HR', 'SpO2']

function normalize(s) {
  return s.toLowerCase().trim().replace(/[^a-z0-9 ]/g, '').replace(/\s+/g, ' ')
}

function findMatch(typed, answers) {
  const n = normalize(typed)
  if (!n) return null
  for (const [answer, tier] of Object.entries(answers)) {
    if (normalize(answer) === n) return { answer, tier }
  }
  return null
}

function getProfessorAnswers(answers) {
  return Object.entries(answers)
    .filter(([, tier]) => tier === 4)
    .slice(0, 3)
    .map(([answer]) => answer)
}

function getAnswerPercentage(answer, answers) {
  const tier = answers[answer] ?? 0
  const percentages = { 0: 42, 1: 25, 2: 15, 3: 8, 4: 3 }
  return percentages[tier] ?? 5
}

// Depth-based background color
function getDepthBackground(score) {
  const pct = Math.min(score / MAX_SCORE, 1)
  // Interpolate from lobby (lighter teal) to deep (dark navy)
  const r = Math.round(26 - pct * 20)
  const g = Math.round(58 - pct * 44)
  const b = Math.round(74 - pct * 48)
  const r2 = Math.round(15 - pct * 9)
  const g2 = Math.round(34 - pct * 20)
  const b2 = Math.round(53 - pct * 35)
  return `linear-gradient(180deg, rgb(${r},${g},${b}) 0%, rgb(${r2},${g2},${b2}) 50%, #060e1a 100%)`
}

// Floating medical symbols
function FloatingSymbols() {
  const symbols = useMemo(() => {
    return Array.from({ length: 12 }, (_, i) => ({
      id: i,
      symbol: MEDICAL_SYMBOLS[i % MEDICAL_SYMBOLS.length],
      left: Math.random() * 100,
      duration: 18 + Math.random() * 20,
      delay: Math.random() * 18,
      size: 11 + Math.random() * 10,
    }))
  }, [])

  return (
    <div className="absolute inset-0 pointer-events-none overflow-hidden z-0">
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

// Confetti burst
function Confetti({ active }) {
  if (!active) return null
  const particles = Array.from({ length: 20 }, (_, i) => i)
  return (
    <div className="fixed inset-0 pointer-events-none z-50 overflow-hidden">
      {particles.map((i) => {
        const left = 30 + Math.random() * 40
        const delay = Math.random() * 0.3
        const hue = Math.random() * 360
        const size = 6 + Math.random() * 6
        const drift = -30 + Math.random() * 60
        return (
          <div
            key={i}
            className="absolute confetti-particle"
            style={{
              left: `${left}%`,
              top: '40%',
              width: `${size}px`,
              height: `${size}px`,
              borderRadius: Math.random() > 0.5 ? '50%' : '2px',
              backgroundColor: `hsl(${hue}, 85%, 60%)`,
              animationDelay: `${delay}s`,
              '--drift': `${drift}px`,
            }}
          />
        )
      })}
    </div>
  )
}

// Depth markers on the right side
function DepthMarkers({ score }) {
  return (
    <div className="absolute right-3 top-16 bottom-20 flex flex-col justify-between z-10 pointer-events-none">
      {DEPTH_FLOORS.map((floor) => {
        const isActive = score >= floor.score
        return (
          <div
            key={floor.label}
            className={`depth-marker text-right ${isActive ? 'active' : ''}`}
            style={{ transition: 'all 0.5s ease' }}
          >
            <div style={{ fontSize: '8px', letterSpacing: '0.12em' }}>{floor.label}</div>
            <div style={{ fontSize: '10px', fontWeight: 700 }}>{floor.depth}</div>
          </div>
        )
      })}
    </div>
  )
}

export default function GameScreen({ prompts, onFinish }) {
  const [currentIndex, setCurrentIndex] = useState(0)
  const [input, setInput] = useState('')
  const [phase, setPhase] = useState('answering')
  const [timeLeft, setTimeLeft] = useState(TIMER_DURATION)
  const [results, setResults] = useState([])
  const [shaking, setShaking] = useState(false)
  const [wrongMessage, setWrongMessage] = useState(false)
  const [wrongFlash, setWrongFlash] = useState(false)
  const [revealData, setRevealData] = useState(null)
  const [slideDirection, setSlideDirection] = useState('in')
  const [animatedScore, setAnimatedScore] = useState(0)
  const [showConfetti, setShowConfetti] = useState(false)
  const [revealVisible, setRevealVisible] = useState(false)
  const [submitPressed, setSubmitPressed] = useState(false)

  const timerRef = useRef(null)
  const startTimeRef = useRef(null)
  const inputRef = useRef(null)
  const scoreAnimRef = useRef(null)

  const prompt = prompts[currentIndex]
  const totalScore = results.reduce((sum, r) => sum + r.points, 0)

  // Animate score counter
  useEffect(() => {
    const target = totalScore
    const start = animatedScore
    if (Math.abs(target - start) < 1) return

    const duration = 600
    const startTime = performance.now()

    function tick(now) {
      const elapsed = now - startTime
      const progress = Math.min(elapsed / duration, 1)
      const eased = 1 - Math.pow(1 - progress, 3)
      setAnimatedScore(start + (target - start) * eased)

      if (progress < 1) {
        scoreAnimRef.current = requestAnimationFrame(tick)
      }
    }

    scoreAnimRef.current = requestAnimationFrame(tick)
    return () => {
      if (scoreAnimRef.current) cancelAnimationFrame(scoreAnimRef.current)
    }
  }, [totalScore])

  const stopTimer = useCallback(() => {
    if (timerRef.current) {
      clearInterval(timerRef.current)
      timerRef.current = null
    }
  }, [])

  const handleReveal = useCallback((answer, tier, points, timeMs, passed) => {
    stopTimer()
    setPhase('reveal')
    setWrongMessage(false)

    const result = {
      promptIndex: currentIndex,
      answer,
      tier,
      points,
      timeMs,
      passed,
    }

    setRevealData(result)
    setResults(prev => [...prev, result])

    if (tier === 4) {
      setShowConfetti(true)
      setTimeout(() => setShowConfetti(false), 1500)
    }

    setTimeout(() => setRevealVisible(true), 50)
  }, [currentIndex, stopTimer])

  const handlePass = useCallback(() => {
    const elapsed = Date.now() - startTimeRef.current
    handleReveal(null, -1, 0, elapsed, true)
  }, [handleReveal])

  const handleSubmit = useCallback(() => {
    const typed = input.trim()
    if (!typed) return

    const match = findMatch(typed, prompt.answers)
    if (match) {
      const elapsed = Date.now() - startTimeRef.current
      const points = TIER_POINTS[match.tier]
      handleReveal(typed, match.tier, points, elapsed, false)
    } else {
      setShaking(true)
      setWrongMessage(true)
      setWrongFlash(true)
      setTimeout(() => setShaking(false), 500)
      setTimeout(() => setWrongMessage(false), 2000)
      setTimeout(() => setWrongFlash(false), 500)
      setInput('')
      if (inputRef.current) inputRef.current.focus()
    }
  }, [input, prompt, handleReveal])

  const handleTimerExpiry = useCallback(() => {
    const typed = input.trim()
    if (typed) {
      const match = findMatch(typed, prompt.answers)
      if (match) {
        handleReveal(typed, match.tier, TIER_POINTS[match.tier], TIMER_DURATION, false)
      } else {
        handleReveal(typed, -1, 0, TIMER_DURATION, false)
      }
    } else {
      handleReveal(null, -1, 0, TIMER_DURATION, false)
    }
  }, [input, prompt, handleReveal])

  const timerExpiryRef = useRef(handleTimerExpiry)
  useEffect(() => {
    timerExpiryRef.current = handleTimerExpiry
  }, [handleTimerExpiry])

  useEffect(() => {
    if (phase !== 'answering') return

    startTimeRef.current = Date.now()
    setTimeLeft(TIMER_DURATION)

    timerRef.current = setInterval(() => {
      const elapsed = Date.now() - startTimeRef.current
      const remaining = Math.max(0, TIMER_DURATION - elapsed)
      setTimeLeft(remaining)

      if (remaining <= 0) {
        clearInterval(timerRef.current)
        timerRef.current = null
        timerExpiryRef.current()
      }
    }, 50)

    return () => {
      if (timerRef.current) {
        clearInterval(timerRef.current)
        timerRef.current = null
      }
    }
  }, [phase, currentIndex])

  useEffect(() => {
    if (phase === 'answering' && inputRef.current) {
      setTimeout(() => inputRef.current?.focus(), 300)
    }
  }, [phase, currentIndex])

  useEffect(() => {
    setSlideDirection('in')
  }, [currentIndex])

  const handleNext = () => {
    setRevealVisible(false)
    setSlideDirection('out')

    setTimeout(() => {
      if (currentIndex < TOTAL_PROMPTS - 1) {
        setCurrentIndex(prev => prev + 1)
        setInput('')
        setPhase('answering')
        setWrongMessage(false)
        setRevealData(null)
      } else {
        onFinish([...results])
      }
    }, 250)
  }

  const handleKeyDown = (e) => {
    if (e.key === 'Enter' && phase === 'answering') {
      e.preventDefault()
      handleSubmit()
    }
  }

  const timerProgress = timeLeft / TIMER_DURATION
  const isTimerLow = Math.ceil(timeLeft / 1000) <= 5
  const depthBg = getDepthBackground(totalScore)

  return (
    <div
      className="min-h-[100dvh] flex flex-col relative overflow-hidden bg-depth-transition"
      style={{ background: depthBg }}
    >
      <Confetti active={showConfetti} />
      <FloatingSymbols />
      <DepthMarkers score={totalScore} />

      {/* Wrong answer red flash on edges */}
      {wrongFlash && (
        <div
          className="fixed inset-0 pointer-events-none z-40 wrong-flash"
          style={{
            boxShadow: 'inset 0 0 80px rgba(255, 68, 68, 0.4), inset 0 0 160px rgba(255, 68, 68, 0.2)',
          }}
        />
      )}

      {/* TIMER BAR - thin bar at very top */}
      {phase === 'answering' && (
        <div className="absolute top-0 left-0 right-0 z-30" style={{ height: '3px', background: 'rgba(255,255,255,0.05)' }}>
          <div
            className={`timer-bar ${isTimerLow ? 'timer-low' : ''}`}
            style={{ width: `${timerProgress * 100}%` }}
          />
        </div>
      )}

      {/* HUD BAR */}
      <div className="relative z-20 flex items-center justify-between px-4 pt-5 pb-2">
        {/* Left: Depth */}
        <div>
          <div className="hud-label">DEPTH</div>
          <div className="mono text-lg font-bold" style={{ color: 'var(--accent)' }}>
            {Math.round(animatedScore)}m
          </div>
        </div>

        {/* Center: Progress blocks */}
        <div className="flex items-center gap-1.5">
          {Array.from({ length: TOTAL_PROMPTS }, (_, i) => {
            const r = results[i]
            let classes = 'progress-block'
            if (r) {
              classes += ' filled'
            } else if (i === currentIndex) {
              classes += ' current'
            }
            return <div key={i} className={classes} />
          })}
        </div>

        {/* Right: Score */}
        <div className="text-right">
          <div className="hud-label">SCORE</div>
          <div className="mono text-lg font-bold" style={{ color: 'var(--text-primary)' }}>
            {Math.round(animatedScore)}
          </div>
        </div>
      </div>

      {/* Specialty tag */}
      <div className="relative z-20 px-4 pb-2">
        <span
          className="mono text-xs font-bold tracking-wider uppercase px-2.5 py-1 rounded-md inline-block"
          style={{
            background: 'rgba(0, 229, 255, 0.08)',
            color: 'var(--accent)',
            border: '1px solid rgba(0, 229, 255, 0.2)',
          }}
        >
          {prompt.specialty}
        </span>
      </div>

      {/* MAIN CONTENT */}
      <div className="flex-1 flex flex-col px-4 pb-4 relative z-20">

        {/* Timer seconds (small, inline) */}
        {phase === 'answering' && (
          <div className="text-center py-2">
            <span
              className={`mono text-2xl font-bold ${isTimerLow && timeLeft > 0 ? 'timer-pulse' : ''}`}
              style={{
                color: isTimerLow ? 'var(--wrong)' : 'var(--accent)',
                textShadow: isTimerLow
                  ? '0 0 15px rgba(255,68,68,0.5)'
                  : '0 0 15px var(--accent-dim)',
              }}
            >
              {Math.ceil(timeLeft / 1000)}
            </span>
          </div>
        )}

        {/* Prompt text */}
        <div
          className={`text-center text-xl sm:text-2xl font-semibold leading-relaxed px-2 py-6 prompt-${slideDirection}`}
          style={{ color: 'var(--text-primary)' }}
        >
          {prompt.prompt}
        </div>

        {/* ANSWERING PHASE */}
        {phase === 'answering' && (
          <div className="mt-auto space-y-3 pb-safe">
            {/* Wrong answer feedback */}
            <div
              className={`text-center mono text-sm font-semibold transition-all duration-300 ${wrongMessage ? 'opacity-100 translate-y-0' : 'opacity-0 -translate-y-2'}`}
              style={{ color: 'var(--wrong)', minHeight: '20px' }}
            >
              Not on the answer sheet
            </div>

            {/* Input */}
            <div className={shaking ? 'shake' : ''}>
              <input
                ref={inputRef}
                type="text"
                value={input}
                onChange={(e) => setInput(e.target.value)}
                onKeyDown={handleKeyDown}
                placeholder="Type your answer..."
                className={`game-input ${shaking ? 'input-wrong' : ''}`}
                autoComplete="off"
                autoCapitalize="off"
                spellCheck={false}
              />
            </div>

            {/* Submit + Pass row */}
            <div className="flex gap-3">
              <button
                onClick={() => {
                  setSubmitPressed(true)
                  setTimeout(() => setSubmitPressed(false), 150)
                  handleSubmit()
                }}
                disabled={!input.trim()}
                className={`btn-game-primary flex-1 py-4 rounded-xl text-base ${submitPressed ? 'scale-[0.97]' : 'scale-100'}`}
                style={{ transition: 'all 0.15s ease' }}
              >
                SUBMIT
              </button>
              <button
                onClick={handlePass}
                className="btn-game px-6 py-4 rounded-xl text-sm"
              >
                PASS
              </button>
            </div>
          </div>
        )}

        {/* REVEAL PHASE */}
        {phase === 'reveal' && revealData && (
          <div
            className={`mt-auto pb-safe transition-all duration-500 ease-out ${revealVisible ? 'translate-y-0 opacity-100' : 'translate-y-8 opacity-0'}`}
          >
            {/* Result card */}
            <div
              className="rounded-xl p-6 mb-4 border"
              style={{
                background: 'rgba(10, 22, 40, 0.8)',
                borderColor: revealData.tier >= 0
                  ? `${TIER_COLORS_HEX[revealData.tier]}40`
                  : 'rgba(255,255,255,0.08)',
                backdropFilter: 'blur(12px)',
              }}
            >
              {revealData.passed ? (
                <div className="text-center space-y-2">
                  <div className="text-4xl mb-2 mono" style={{ color: 'var(--text-muted)' }}>---</div>
                  <div className="mono text-lg font-semibold" style={{ color: 'var(--text-muted)' }}>Passed</div>
                  <div className="text-3xl font-bold mono" style={{ color: 'var(--text-muted)' }}>+0</div>
                </div>
              ) : revealData.tier === -1 ? (
                <div className="text-center space-y-2">
                  <div className="text-4xl mb-2 mono" style={{ color: 'var(--text-muted)' }}>---</div>
                  <div className="mono text-lg font-semibold" style={{ color: 'var(--wrong)' }}>Time's up!</div>
                  {revealData.answer && (
                    <div className="mono text-sm" style={{ color: 'var(--text-muted)' }}>
                      "{revealData.answer}" -- not on the sheet
                    </div>
                  )}
                  <div className="text-3xl font-bold mono" style={{ color: 'var(--text-muted)' }}>+0</div>
                </div>
              ) : (
                <div className="text-center space-y-2">
                  {/* Tier badge */}
                  <div
                    className="inline-block px-4 py-1.5 rounded-md mono text-sm font-bold tracking-wider uppercase mb-1"
                    style={{
                      background: `${TIER_COLORS_HEX[revealData.tier]}20`,
                      color: TIER_COLORS_HEX[revealData.tier],
                      border: `1px solid ${TIER_COLORS_HEX[revealData.tier]}40`,
                    }}
                  >
                    {TIER_NAMES[revealData.tier]}
                  </div>

                  {/* Points */}
                  <div
                    className={`text-5xl font-bold mono points-pop tier-glow-${revealData.tier}`}
                    style={{ color: TIER_COLORS_HEX[revealData.tier] }}
                  >
                    +{revealData.points}
                  </div>

                  {/* Percentage */}
                  <div className="mono text-sm" style={{ color: 'var(--text-muted)' }}>
                    {getAnswerPercentage(revealData.answer, prompt.answers)}% said this
                  </div>

                  {/* Answer */}
                  <div className="text-base font-medium mt-1" style={{ color: 'var(--text-primary)' }}>
                    "{revealData.answer}"
                  </div>
                </div>
              )}
            </div>

            {/* Professor answers */}
            <div
              className="rounded-xl p-4 mb-4 border"
              style={{
                background: 'rgba(255, 68, 170, 0.05)',
                borderColor: 'rgba(255, 68, 170, 0.15)',
              }}
            >
              <div className="mono text-[10px] font-bold tracking-[0.15em] uppercase mb-3" style={{ color: '#ff44aa' }}>
                Professor-tier answers
              </div>
              <div className="space-y-2">
                {getProfessorAnswers(prompt.answers).length > 0 ? (
                  getProfessorAnswers(prompt.answers).map((ans, i) => (
                    <div
                      key={i}
                      className="mono text-sm font-medium px-3 py-2 rounded-lg prof-answer-in"
                      style={{
                        animationDelay: `${i * 0.1}s`,
                        background: 'rgba(255, 68, 170, 0.1)',
                        color: '#ff44aa',
                        border: '1px solid rgba(255, 68, 170, 0.2)',
                      }}
                    >
                      {ans}
                    </div>
                  ))
                ) : (
                  <div className="mono text-sm italic" style={{ color: 'var(--text-muted)' }}>None for this prompt</div>
                )}
              </div>
            </div>

            {/* Next / See Results button */}
            <button
              onClick={handleNext}
              className="btn-game-primary w-full py-4 rounded-xl text-lg"
            >
              {currentIndex < TOTAL_PROMPTS - 1 ? 'DESCEND' : 'SEE RESULTS'}
            </button>
          </div>
        )}
      </div>
    </div>
  )
}
