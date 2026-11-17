import { useState, useEffect } from 'react'
import HomeScreen from './components/HomeScreen'
import GameScreen from './components/GameScreen'
import ResultScreen from './components/ResultScreen'

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

// Game number: starts at #18 on Nov 17, 2026 and increments daily
function getGameNumber(dateStr) {
  const launch = new Date('2026-11-17T00:00:00')
  const today = new Date(dateStr + 'T00:00:00')
  return Math.floor((today - launch) / 86400000) + 18
}

// Fake percentile based on score: makes player feel competitive
function getPercentile(totalScore) {
  // Higher scores = better percentile. Scale 0-2500 to reasonable percentiles
  if (totalScore >= 2000) return 95 + Math.floor(Math.random() * 4) // 95-98%
  if (totalScore >= 1500) return 82 + Math.floor(Math.random() * 10) // 82-91%
  if (totalScore >= 1000) return 55 + Math.floor(Math.random() * 20) // 55-74%
  if (totalScore >= 500) return 25 + Math.floor(Math.random() * 25) // 25-49%
  return 5 + Math.floor(Math.random() * 18) // 5-22%
}

// ── Main App ─────────────────────────────────────────
// Pick N random prompts from the full bank (for practice mode)
function getRandomPrompts(allPrompts, count = 5) {
  const shuffled = [...allPrompts].sort(() => Math.random() - 0.5)
  return shuffled.slice(0, count)
}

export default function App() {
  const [screen, setScreen] = useState('home') // 'home' | 'game' | 'result' | 'practice'
  const [allPrompts, setAllPrompts] = useState([])
  const [todayPrompts, setTodayPrompts] = useState([])
  const [practicePrompts, setPracticePrompts] = useState([])
  const [gameMode, setGameMode] = useState('daily') // 'daily' | 'practice'
  const [gameNumber, setGameNumber] = useState(18)
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
    setGameMode('daily')
    setResults([])
    setScreen('game')
  }

  function handlePractice() {
    setGameMode('practice')
    setPracticePrompts(getRandomPrompts(allPrompts, 5))
    setResults([])
    setScreen('game')
  }

  function handleGameFinish(gameResults) {
    // Enrich results with prompt text and specialty from todayPrompts
    const enriched = gameResults.map((r, i) => ({
      ...r,
      prompt: todayPrompts[r.promptIndex]?.prompt ?? todayPrompts[i]?.prompt ?? '',
      specialty: todayPrompts[r.promptIndex]?.specialty ?? todayPrompts[i]?.specialty ?? '',
    }))

    // Save to localStorage
    const dateStr = getTodayStr()
    const totalScore = enriched.reduce((sum, r) => sum + (r.points || 0), 0)
    const payload = { totalScore, results: enriched, playedAt: new Date().toISOString() }
    localStorage.setItem(`pimped-played-${dateStr}`, JSON.stringify(payload))

    // Update streak
    updateStreak(dateStr)

    setResults(enriched)
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
      streak.current += 1
    } else if (diffDays === 0) {
      // Same day, no change
    } else {
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
          onPractice={handlePractice}
        />
      )}
      {screen === 'game' && (
        <GameScreen
          prompts={gameMode === 'practice' ? practicePrompts : todayPrompts}
          onFinish={handleGameFinish}
          onBack={handleBackHome}
        />
      )}
      {screen === 'result' && (
        <ResultScreen
          results={results}
          prompts={todayPrompts}
          gameNumber={gameNumber}
          percentile={getPercentile(results.reduce((s, r) => s + (r.points || 0), 0))}
          onHome={handleBackHome}
        />
      )}
    </>
  )
}
