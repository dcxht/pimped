import { useState, useEffect, useRef, useCallback } from 'react'

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
  0: '#22c55e',
  1: '#eab308',
  2: '#f97316',
  3: '#a855f7',
  4: '#ec4899',
}

const TIER_BG_CLASSES = {
  0: 'bg-green-50',
  1: 'bg-yellow-50',
  2: 'bg-orange-50',
  3: 'bg-purple-50',
  4: 'bg-pink-50',
}

const MILESTONES = [
  { label: 'Intern', score: 0, color: '#94a3b8' },
  { label: 'Med Student', score: 500, color: '#eab308' },
  { label: 'Resident', score: 1000, color: '#f97316' },
  { label: 'Attending', score: 1500, color: '#a855f7' },
  { label: 'Professor', score: 2000, color: '#ec4899' },
]

const MAX_SCORE = 2500

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

// Specialty pill colors
function specialtyColor(specialty) {
  const s = (specialty || '').toLowerCase()
  if (s.includes('cardio')) return { bg: '#fef2f2', text: '#dc2626' }
  if (s.includes('neuro')) return { bg: '#f0f9ff', text: '#0369a1' }
  if (s.includes('gi') || s.includes('gastro')) return { bg: '#fefce8', text: '#a16207' }
  if (s.includes('pulm') || s.includes('resp')) return { bg: '#ecfdf5', text: '#047857' }
  if (s.includes('renal') || s.includes('neph')) return { bg: '#fdf4ff', text: '#9333ea' }
  if (s.includes('endo')) return { bg: '#fff7ed', text: '#c2410c' }
  if (s.includes('heme') || s.includes('onc')) return { bg: '#fdf2f8', text: '#be185d' }
  if (s.includes('derm')) return { bg: '#fffbeb', text: '#b45309' }
  if (s.includes('id') || s.includes('infect')) return { bg: '#f0fdf4', text: '#15803d' }
  return { bg: '#f5f3ff', text: '#6d28d9' }
}

// Circular timer component
function CircularTimer({ timeLeft, duration }) {
  const seconds = Math.ceil(timeLeft / 1000)
  const progress = timeLeft / duration
  const isLow = seconds <= 5
  const radius = 40
  const circumference = 2 * Math.PI * radius
  const strokeOffset = circumference * (1 - progress)
  const color = isLow ? '#ef4444' : '#4571FF'

  return (
    <div className={`relative inline-flex items-center justify-center ${isLow && timeLeft > 0 ? 'timer-pulse' : ''}`}>
      <svg width="100" height="100" className="transform -rotate-90">
        {/* Background circle */}
        <circle
          cx="50" cy="50" r={radius}
          stroke="#e5e2da"
          strokeWidth="6"
          fill="none"
        />
        {/* Progress arc */}
        <circle
          cx="50" cy="50" r={radius}
          stroke={color}
          strokeWidth="6"
          fill="none"
          strokeLinecap="round"
          strokeDasharray={circumference}
          strokeDashoffset={strokeOffset}
          className="transition-[stroke-dashoffset] duration-100 ease-linear"
        />
      </svg>
      {/* Seconds in center */}
      <span
        className="absolute font-mono font-bold text-3xl transition-colors duration-200"
        style={{ color }}
      >
        {seconds}
      </span>
    </div>
  )
}

// Score meter component
function ScoreMeter({ score, animatedScore }) {
  const displayScore = animatedScore
  const pct = Math.min((displayScore / MAX_SCORE) * 100, 100)

  return (
    <div className="w-full">
      {/* Milestone labels */}
      <div className="relative h-6 mb-1">
        {MILESTONES.map((m) => {
          const left = (m.score / MAX_SCORE) * 100
          const isActive = displayScore >= m.score
          return (
            <span
              key={m.label}
              className="absolute text-[10px] font-bold tracking-wide uppercase transition-all duration-500 whitespace-nowrap"
              style={{
                left: `${left}%`,
                transform: 'translateX(-50%)',
                color: isActive ? m.color : '#c4c0b8',
              }}
            >
              {m.label}
            </span>
          )
        })}
      </div>

      {/* Bar track */}
      <div className="relative w-full h-3 rounded-full bg-[#e5e2da] overflow-hidden">
        {/* Filled bar */}
        <div
          className="absolute inset-y-0 left-0 rounded-full transition-all duration-700 ease-out"
          style={{
            width: `${pct}%`,
            background: `linear-gradient(90deg, #22c55e 0%, #eab308 30%, #f97316 50%, #a855f7 75%, #ec4899 100%)`,
          }}
        />
        {/* Milestone tick marks */}
        {MILESTONES.slice(1).map((m) => {
          const left = (m.score / MAX_SCORE) * 100
          return (
            <div
              key={m.label}
              className="absolute top-0 bottom-0 w-0.5 bg-white/50"
              style={{ left: `${left}%` }}
            />
          )
        })}
      </div>

      {/* Score number */}
      <div className="text-center mt-1">
        <span className="font-mono font-bold text-sm" style={{ color: '#1a1a1a' }}>
          {Math.round(displayScore)} pts
        </span>
      </div>
    </div>
  )
}

// Confetti burst component
function Confetti({ active }) {
  if (!active) return null
  // 20 confetti particles
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

export default function GameScreen({ prompts, onFinish }) {
  const [currentIndex, setCurrentIndex] = useState(0)
  const [input, setInput] = useState('')
  const [phase, setPhase] = useState('answering') // 'answering' | 'reveal'
  const [timeLeft, setTimeLeft] = useState(TIMER_DURATION)
  const [results, setResults] = useState([])
  const [shaking, setShaking] = useState(false)
  const [wrongMessage, setWrongMessage] = useState(false)
  const [revealData, setRevealData] = useState(null)
  const [slideDirection, setSlideDirection] = useState('in') // 'in' | 'out'
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
      // Ease out cubic
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

    // Professor tier confetti
    if (tier === 4) {
      setShowConfetti(true)
      setTimeout(() => setShowConfetti(false), 1500)
    }

    // Slide-up reveal with slight delay
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
      setTimeout(() => {
        setShaking(false)
      }, 500)
      setTimeout(() => setWrongMessage(false), 2000)
      setInput('')
      if (inputRef.current) inputRef.current.focus()
    }
  }, [input, prompt, handleReveal])

  // Timer auto-submit on expiry
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

  // Start timer when entering answering phase
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

  // Focus input when answering
  useEffect(() => {
    if (phase === 'answering' && inputRef.current) {
      setTimeout(() => inputRef.current?.focus(), 300)
    }
  }, [phase, currentIndex])

  // Slide-in animation on prompt change
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

  const spColor = specialtyColor(prompt.specialty)

  return (
    <div className="min-h-[100dvh] flex flex-col bg-cream relative overflow-hidden">
      <Confetti active={showConfetti} />

      {/* ---- HEADER ---- */}
      <div className="flex items-center justify-between px-4 pt-4 pb-2">
        <span className="font-bold text-sm tracking-widest uppercase" style={{ color: '#1a1a1a' }}>
          PIMPED
        </span>
        <span className="font-mono font-bold text-sm" style={{ color: '#1a1a1a' }}>
          {currentIndex + 1}/{TOTAL_PROMPTS}
        </span>
      </div>

      {/* Specialty pill */}
      <div className="px-4 pb-3">
        <span
          className="inline-block text-xs font-bold tracking-wider uppercase px-3 py-1 rounded-full"
          style={{ backgroundColor: spColor.bg, color: spColor.text }}
        >
          {prompt.specialty}
        </span>
      </div>

      {/* ---- SCORE METER ---- */}
      <div className="px-4 pb-3">
        <ScoreMeter score={totalScore} animatedScore={animatedScore} />
      </div>

      {/* ---- MAIN CONTENT ---- */}
      <div className="flex-1 flex flex-col px-4 pb-4">

        {/* Timer */}
        {phase === 'answering' && (
          <div className="flex justify-center py-2">
            <CircularTimer timeLeft={timeLeft} duration={TIMER_DURATION} />
          </div>
        )}

        {/* Prompt text */}
        <div
          className={`text-center text-xl sm:text-2xl font-semibold leading-relaxed px-2 py-4 prompt-${slideDirection}`}
          style={{ color: '#1a1a1a' }}
        >
          {prompt.prompt}
        </div>

        {/* ---- ANSWERING PHASE ---- */}
        {phase === 'answering' && (
          <div className="mt-auto space-y-3 pb-safe">
            {/* Wrong answer feedback */}
            <div className={`text-center text-sm font-semibold transition-all duration-300 ${wrongMessage ? 'opacity-100 translate-y-0' : 'opacity-0 -translate-y-2'}`} style={{ color: '#ef4444', minHeight: '20px' }}>
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
                className={`w-full px-5 py-4 rounded-2xl text-lg border-2 outline-none transition-all duration-200 ${
                  shaking
                    ? 'border-red-400 bg-red-50'
                    : 'border-[#e5e2da] bg-white focus:border-[#4571FF] focus:shadow-[0_0_0_3px_rgba(69,113,255,0.1)]'
                }`}
                style={{ color: '#1a1a1a', fontSize: '18px' }}
                autoComplete="off"
                autoCapitalize="off"
                spellCheck={false}
              />
            </div>

            {/* Submit button */}
            <button
              onClick={() => {
                setSubmitPressed(true)
                setTimeout(() => setSubmitPressed(false), 150)
                handleSubmit()
              }}
              disabled={!input.trim()}
              className={`w-full py-4 rounded-2xl text-lg font-bold text-white transition-all duration-150 active:scale-[0.97] disabled:opacity-40 disabled:cursor-not-allowed ${submitPressed ? 'scale-[0.97]' : 'scale-100'}`}
              style={{ backgroundColor: input.trim() ? '#4571FF' : '#94a3b8' }}
            >
              Submit
            </button>

            {/* Pass button */}
            <button
              onClick={handlePass}
              className="w-full py-2.5 text-sm font-semibold tracking-wide uppercase transition-all duration-150 active:scale-[0.98] rounded-xl"
              style={{ color: '#9b9b9b' }}
            >
              Pass
            </button>
          </div>
        )}

        {/* ---- REVEAL PHASE ---- */}
        {phase === 'reveal' && revealData && (
          <div
            className={`mt-auto pb-safe transition-all duration-500 ease-out ${revealVisible ? 'translate-y-0 opacity-100' : 'translate-y-8 opacity-0'}`}
          >
            {/* Result card */}
            <div className="rounded-3xl p-6 mb-4 shadow-lg border border-white/60 bg-white">
              {revealData.passed ? (
                <div className="text-center space-y-2">
                  <div className="text-5xl mb-2">---</div>
                  <div className="text-gray-400 text-lg font-semibold">Passed</div>
                  <div className="text-3xl font-bold text-gray-300 font-mono">+0</div>
                </div>
              ) : revealData.tier === -1 ? (
                <div className="text-center space-y-2">
                  <div className="text-5xl mb-2">---</div>
                  <div className="text-red-500 text-lg font-semibold">Time's up!</div>
                  {revealData.answer && (
                    <div className="text-sm text-gray-500">
                      "{revealData.answer}" - not on the sheet
                    </div>
                  )}
                  <div className="text-3xl font-bold text-gray-300 font-mono">+0</div>
                </div>
              ) : (
                <div className="text-center space-y-2">
                  {/* Tier badge */}
                  <div
                    className={`inline-block px-4 py-1.5 rounded-full text-sm font-bold tracking-wider uppercase mb-1 ${TIER_BG_CLASSES[revealData.tier]}`}
                    style={{ color: TIER_COLORS_HEX[revealData.tier] }}
                  >
                    {TIER_NAMES[revealData.tier]}
                  </div>

                  {/* Points with scale animation */}
                  <div
                    className="text-5xl font-bold font-mono points-pop"
                    style={{ color: TIER_COLORS_HEX[revealData.tier] }}
                  >
                    +{revealData.points}
                  </div>

                  {/* Percentage */}
                  <div className="text-sm text-gray-500 font-medium">
                    {getAnswerPercentage(revealData.answer, prompt.answers)}% said this
                  </div>

                  {/* Answer shown */}
                  <div className="text-base font-medium mt-1" style={{ color: '#1a1a1a' }}>
                    "{revealData.answer}"
                  </div>
                </div>
              )}
            </div>

            {/* Professor answers */}
            <div className="rounded-2xl p-4 mb-4 bg-white/70 border border-[#e5e2da]">
              <div className="text-[10px] font-bold tracking-[0.15em] uppercase mb-3" style={{ color: '#ec4899' }}>
                Professor-tier answers
              </div>
              <div className="space-y-2">
                {getProfessorAnswers(prompt.answers).length > 0 ? (
                  getProfessorAnswers(prompt.answers).map((ans, i) => (
                    <div
                      key={i}
                      className="text-sm font-medium px-3 py-2 rounded-xl bg-pink-50 text-pink-700 prof-answer-in"
                      style={{ animationDelay: `${i * 0.1}s` }}
                    >
                      {ans}
                    </div>
                  ))
                ) : (
                  <div className="text-sm text-gray-400 italic">None for this prompt</div>
                )}
              </div>
            </div>

            {/* Next button */}
            <button
              onClick={handleNext}
              className="w-full py-4 rounded-2xl text-lg font-bold text-white transition-all duration-150 active:scale-[0.97] shadow-md"
              style={{ backgroundColor: '#4571FF' }}
            >
              {currentIndex < TOTAL_PROMPTS - 1 ? 'Next' : 'See Results'}
            </button>
          </div>
        )}
      </div>

      {/* ---- ANIMATIONS ---- */}
      <style>{`
        /* Prompt slide in */
        .prompt-in {
          animation: promptSlideIn 0.4s ease-out both;
        }
        .prompt-out {
          animation: promptSlideOut 0.25s ease-in both;
        }
        @keyframes promptSlideIn {
          from { opacity: 0; transform: translateX(30px); }
          to { opacity: 1; transform: translateX(0); }
        }
        @keyframes promptSlideOut {
          from { opacity: 1; transform: translateX(0); }
          to { opacity: 0; transform: translateX(-30px); }
        }

        /* Shake */
        .shake {
          animation: shake 0.45s cubic-bezier(0.36, 0.07, 0.19, 0.97) both;
        }
        @keyframes shake {
          0%, 100% { transform: translateX(0); }
          15% { transform: translateX(-10px); }
          30% { transform: translateX(8px); }
          45% { transform: translateX(-6px); }
          60% { transform: translateX(5px); }
          75% { transform: translateX(-3px); }
          90% { transform: translateX(2px); }
        }

        /* Timer pulse when low */
        .timer-pulse {
          animation: timerPulse 0.8s ease-in-out infinite;
        }
        @keyframes timerPulse {
          0%, 100% { transform: scale(1); }
          50% { transform: scale(1.06); }
        }

        /* Points pop-in */
        .points-pop {
          animation: pointsPop 0.5s cubic-bezier(0.17, 0.89, 0.32, 1.25) both;
        }
        @keyframes pointsPop {
          0% { transform: scale(0.3); opacity: 0; }
          60% { transform: scale(1.1); opacity: 1; }
          100% { transform: scale(1); opacity: 1; }
        }

        /* Professor answer stagger in */
        .prof-answer-in {
          animation: profIn 0.3s ease-out both;
        }
        @keyframes profIn {
          from { opacity: 0; transform: translateY(8px); }
          to { opacity: 1; transform: translateY(0); }
        }

        /* Confetti particle */
        .confetti-particle {
          animation: confettiFall 1.2s cubic-bezier(0.25, 0.46, 0.45, 0.94) both;
        }
        @keyframes confettiFall {
          0% {
            transform: translate(0, 0) rotate(0deg) scale(1);
            opacity: 1;
          }
          100% {
            transform: translate(var(--drift, 20px), -200px) rotate(720deg) scale(0);
            opacity: 0;
          }
        }

        /* Safe area padding for bottom buttons on notched phones */
        .pb-safe {
          padding-bottom: max(16px, env(safe-area-inset-bottom));
        }
      `}</style>
    </div>
  )
}
