import { useState, useEffect } from 'react'
import HomeScreen from './components/HomeScreen'
import GameScreen from './components/GameScreen'

// ── Daily prompt selection ────────────────────────────
function getDailyPrompts(allPrompts, dateStr) {
  let hash = 0
  for (let i = 0; i < dateStr.length; i++) {
    hash = ((hash << 5) - hash) + dateStr.charCodeAt(i)
    hash |= 0
  }
  const start = Math.abs(hash) % allPrompts.length
  const picks = []
  for (let i = 0; i < 5; i++) {
    picks.push(allPrompts[(start + i) % allPrompts.length])
  }
  return picks
}

function getTodayStr() {
  return new Date().toISOString().slice(0, 10)
}

// Game number = days since launch (Nov 17, 2026)
function getGameNumber(dateStr) {
  const launch = new Date('2026-11-17T00:00:00')
  const today = new Date(dateStr + 'T00:00:00')
  return Math.floor((today - launch) / 86400000) + 1
}

// ── Result Screen (inline) ───────────────────────────
function ResultScreen({ results, gameNumber, onHome }) {
  const totalScore = results.reduce((sum, r) => sum + (r.points || 0), 0)
  const maxScore = 5 * 500

  return (
    <div className="min-h-screen" style={{ background: '#F5F3EC' }}>
      <div className="max-w-lg mx-auto px-5 py-10 space-y-6">
        <div className="text-center space-y-2">
          <p className="text-xs font-bold tracking-widest text-gray-400 uppercase">
            Round #{gameNumber} Complete
          </p>
          <p className="text-5xl font-black text-gray-900">{totalScore}</p>
          <p className="text-sm text-gray-500">{totalScore} / {maxScore} possible</p>
        </div>

        <div className="space-y-3">
          {results.map((r, i) => (
            <div key={i} className="bg-white rounded-xl px-5 py-4 shadow-sm flex items-center justify-between">
              <div className="space-y-1 min-w-0 flex-1">
                <p className="text-xs font-bold text-gray-400 uppercase tracking-wide">
                  {r.specialty || `Prompt ${i + 1}`}
                </p>
                <p className="text-sm text-gray-700 truncate">{r.prompt}</p>
                {r.answer && (
                  <p className="text-sm font-semibold text-gray-900">{r.answer}</p>
                )}
              </div>
              <div className="text-right ml-4 flex-shrink-0">
                <p className="text-xl font-black text-gray-900">{r.points || 0}</p>
                {r.tier && <p className="text-xs text-gray-400">{r.tier}</p>}
              </div>
            </div>
          ))}
        </div>

        <button
          onClick={onHome}
          className="w-full py-4 rounded-xl bg-gray-900 text-white text-lg font-bold tracking-wide
                     active:scale-[0.97] transition-transform"
        >
          DONE
        </button>
      </div>
    </div>
  )
}

// ── Main App ─────────────────────────────────────────
export default function App() {
  const [screen, setScreen] = useState('home') // 'home' | 'game' | 'result'
  const [allPrompts, setAllPrompts] = useState([])
  const [todayPrompts, setTodayPrompts] = useState([])
  const [gameNumber, setGameNumber] = useState(1)
  const [results, setResults] = useState([])

  // Load prompts on mount
  useEffect(() => {
    fetch('/data/prompts.json')
      .then(r => r.json())
      .then(data => {
        const prompts = Array.isArray(data) ? data : data.prompts || []
        setAllPrompts(prompts)
        const dateStr = getTodayStr()
        const daily = getDailyPrompts(prompts, dateStr)
        setTodayPrompts(daily)
        setGameNumber(getGameNumber(dateStr))
      })
      .catch(err => {
        console.error('Failed to load prompts:', err)
      })
  }, [])

  function handlePlay() {
    setResults([])
    setScreen('game')
  }

  function handleGameFinish(gameResults) {
    // Save to localStorage
    const dateStr = getTodayStr()
    const totalScore = gameResults.reduce((sum, r) => sum + (r.points || 0), 0)
    const payload = { totalScore, results: gameResults, playedAt: new Date().toISOString() }
    localStorage.setItem(`pimped-played-${dateStr}`, JSON.stringify(payload))

    // Update streak
    updateStreak(dateStr)

    setResults(gameResults)
    setScreen('result')
  }

  function updateStreak(dateStr) {
    let streak = { current: 0, best: 0, lastPlayed: null }
    try {
      const raw = localStorage.getItem('pimped-streak')
      if (raw) streak = JSON.parse(raw)
    } catch {}

    const today = new Date(dateStr + 'T00:00:00')
    const last = streak.lastPlayed ? new Date(streak.lastPlayed + 'T00:00:00') : null
    const diffDays = last ? Math.floor((today - last) / 86400000) : null

    if (diffDays === 1) {
      // Consecutive day
      streak.current += 1
    } else if (diffDays === 0) {
      // Same day, no change
    } else {
      // Streak broken or first play
      streak.current = 1
    }

    streak.best = Math.max(streak.best, streak.current)
    streak.lastPlayed = dateStr
    localStorage.setItem('pimped-streak', JSON.stringify(streak))
  }

  function handleBackHome() {
    setScreen('home')
  }

  return (
    <>
      {screen === 'home' && (
        <HomeScreen
          todayPrompts={todayPrompts}
          gameNumber={gameNumber}
          onPlay={handlePlay}
        />
      )}
      {screen === 'game' && (
        <GameScreen
          prompts={todayPrompts}
          onFinish={handleGameFinish}
          onBack={handleBackHome}
        />
      )}
      {screen === 'result' && (
        <ResultScreen
          results={results}
          gameNumber={gameNumber}
          onHome={handleBackHome}
        />
      )}
    </>
  )
}
