import { useState, useEffect, useCallback, useRef } from 'react'
import { useSearchParams, useNavigate } from 'react-router-dom'
import { useAuth } from '../hooks/useAuth'
import { useProgress } from '../hooks/useProgress'
import { generateExercises, LEVELS } from '../lib/groq'

const BATCH_SIZE = 10

// Niveles disponibles para elegir
const SELECTABLE_LEVELS = [
  { key: 2, label: 'A2', sublabel: 'Elemental',        color: '#7BAED4', bg: 'bg-blue-50',   border: 'border-blue-200',   text: 'text-blue-700' },
  { key: 3, label: 'B1', sublabel: 'Intermedio',       color: '#C8956A', bg: 'bg-amber-50',  border: 'border-amber-200',  text: 'text-amber-700' },
  { key: 4, label: 'B2', sublabel: 'Avanzado',         color: '#9B7FD4', bg: 'bg-purple-50', border: 'border-purple-200', text: 'text-purple-700' },
]

export default function Study() {
  const [params] = useSearchParams()
  const mode = params.get('mode') || 'vocabulary'
  const navigate = useNavigate()
  const { user } = useAuth()
  const { profile, recordExercise } = useProgress(user?.id)

  // Fase de la app
  const [phase, setPhase] = useState('select') // select | exercise | answered | result | error

  // Nivel elegido por el usuario
  const [chosenLevel, setChosenLevel] = useState(null)

  // Ejercicios
  const [queue, setQueue] = useState([])          // cola de ejercicios listos
  const [current, setCurrent] = useState(0)       // índice dentro de queue
  const [selected, setSelected] = useState(null)
  const [sessionResults, setSessionResults] = useState([])
  const [loadError, setLoadError] = useState(null)
  const [xpGained, setXpGained] = useState(0)
  const [leveledUp, setLeveledUp] = useState(false)
  const [loadingMore, setLoadingMore] = useState(false)

  // Referencia para precarga en segundo plano
  const nextBatchRef = useRef(null)

  // Precarga el siguiente bloque en segundo plano
  const prefetchBatch = useCallback(async () => {
    // El banco de preguntas se repone automáticamente en el servidor
    // No hacemos prefetch desde el cliente para evitar 429 en Groq
  }, [])

  // Inicia la sesión con el nivel elegido
  const startSession = useCallback(async (level) => {
    if (!user?.id) {
      setLoadError('Usuario no autenticado')
      setPhase('error')
      return
    }
    setPhase('loading-first')
    setLoadError(null)
    try {
      const batch = await generateExercises({ level, mode, userId: user.id })
      setQueue(batch)
      setCurrent(0)
      setSelected(null)
      setSessionResults([])
      setXpGained(0)
      setLeveledUp(false)
      setPhase('exercise')
      // Precarga siguiente bloque inmediatamente
      prefetchBatch(level)
    } catch (err) {
      setLoadError(err.message)
      setPhase('error')
    }
  }, [mode, prefetchBatch, user])

  const handleAnswer = async (idx) => {
    if (selected !== null || phase === 'answered') return
    setSelected(idx)
    setPhase('answered')

    const exercise = queue[current]
    const isCorrect = idx === exercise.correct

    const result = await recordExercise({
      mode,
      correct: isCorrect,
      wordOrTopic: exercise.word || exercise.topic || exercise.question?.slice(0, 50),
      exerciseType: exercise.type,
      translation: exercise.translation || null,
    })

    if (result) {
      setXpGained(prev => prev + result.xpGained)
      if (result.leveledUp) setLeveledUp(true)
    }

    setSessionResults(prev => [...prev, { isCorrect, exercise }])
  }

  const handleNext = () => {
    const nextIdx = current + 1

    if (nextIdx >= queue.length) {
      // Fin del bloque actual — ¿hay siguiente bloque listo?
      if (nextBatchRef.current) {
        const newQueue = nextBatchRef.current
        nextBatchRef.current = null
        setQueue(newQueue)
        setCurrent(0)
        setSelected(null)
        setPhase('exercise')
        // Precarga el siguiente bloque ya
        prefetchBatch(chosenLevel)
      } else {
        // No hay más — mostrar resultado
        setPhase('result')
      }
    } else {
      setCurrent(nextIdx)
      setSelected(null)
      setPhase('exercise')
    }
  }

  const exercise = queue[current]
  const answeredCount = phase === 'answered' ? current + 1 : current
  const progressPct = queue.length > 0
    ? Math.round((answeredCount / queue.length) * 100)
    : 0

  // ── SELECT LEVEL ──────────────────────────────────────────────────────────
  if (phase === 'select') {
    return (
      <div className="min-h-dvh bg-cream-100 flex flex-col">
        <div className="px-5 pt-12 pb-6">
          <button onClick={() => navigate('/')}
            className="w-9 h-9 flex items-center justify-center rounded-2xl bg-cream-200 mb-6">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" className="w-4 h-4 text-ink-light">
              <path strokeLinecap="round" strokeLinejoin="round" d="M15 19l-7-7 7-7" />
            </svg>
          </button>

          <p className="text-ink-lighter text-xs font-bold uppercase tracking-widest mb-1">
            {mode === 'grammar' ? 'Grammar' : mode === 'words' ? 'Palabras' : 'Vocabulary'}
          </p>
          <h1 className="font-display text-2xl font-bold text-ink mb-1">
            Choose your level
          </h1>
          <p className="text-ink-light text-sm font-semibold mb-8">
            Pick the difficulty that matches you
          </p>

          <div className="space-y-3">
            {SELECTABLE_LEVELS.map((lvl) => (
              <button
                key={lvl.key}
                onClick={() => {
                  setChosenLevel(lvl.key)
                  startSession(lvl.key)
                }}
                className={`w-full text-left p-5 rounded-2xl border-2 ${lvl.border} ${lvl.bg}
                            active:scale-95 transition-all duration-150 flex items-center gap-4`}
                style={{ boxShadow: '0 2px 12px rgba(44,36,22,0.06)' }}
              >
                <div className="w-12 h-12 rounded-2xl flex items-center justify-center flex-shrink-0"
                  style={{ backgroundColor: `${lvl.color}22` }}>
                  <span className="font-display font-bold text-lg" style={{ color: lvl.color }}>
                    {lvl.label}
                  </span>
                </div>
                <div className="flex-1">
                  <div className={`font-bold text-base ${lvl.text}`}>{lvl.sublabel}</div>
                  <div className="text-xs text-ink-light font-semibold mt-0.5">
                    {lvl.key === 2 && 'Daily routines, present & past tenses'}
                    {lvl.key === 3 && 'Travel, health, conditionals'}
                    {lvl.key === 4 && 'Idioms, passive voice, advanced grammar'}
                  </div>
                </div>
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"
                  className={`w-4 h-4 ${lvl.text} opacity-40`}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M9 5l7 7-7 7" />
                </svg>
              </button>
            ))}
          </div>
        </div>
      </div>
    )
  }

  // ── LOADING FIRST BATCH ───────────────────────────────────────────────────
  if (phase === 'loading-first') {
    const lvlInfo = SELECTABLE_LEVELS.find(l => l.key === chosenLevel) || SELECTABLE_LEVELS[0]
    return (
      <div className="min-h-dvh bg-cream-100 flex flex-col items-center justify-center p-6 gap-4">
        <div className="w-16 h-16 rounded-3xl flex items-center justify-center animate-pulse"
          style={{ backgroundColor: lvlInfo.color }}>
          <svg viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="1.8" className="w-8 h-8">
            <path strokeLinecap="round" strokeLinejoin="round"
              d={mode === 'grammar'
                ? "M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z"
                : "M7 7h10M7 11h6M7 15h8M5 3h14a2 2 0 012 2v14a2 2 0 01-2 2H5a2 2 0 01-2-2V5a2 2 0 012-2z"
              }
            />
          </svg>
        </div>
        <h2 className="font-display text-2xl font-bold text-ink">Preparing session...</h2>
        <p className="text-ink-light font-semibold text-center text-sm">
          {mode === 'grammar' ? 'Grammar' : mode === 'words' ? 'Palabras' : 'Vocabulary'} · Level {lvlInfo.label}
        </p>
        <div className="flex gap-1.5 mt-2">
          {[0,1,2].map(i => (
            <div key={i} className="w-2.5 h-2.5 bg-warm-400 rounded-full animate-bounce"
              style={{ animationDelay: `${i * 0.15}s` }} />
          ))}
        </div>
      </div>
    )
  }

  // ── ERROR ─────────────────────────────────────────────────────────────────
  if (phase === 'error') {
    return (
      <div className="min-h-dvh bg-cream-100 flex flex-col items-center justify-center p-6 gap-4">
        <div className="w-16 h-16 rounded-3xl bg-red-100 flex items-center justify-center">
          <svg viewBox="0 0 24 24" fill="none" stroke="#EF4444" strokeWidth="2" className="w-8 h-8">
            <path strokeLinecap="round" strokeLinejoin="round"
              d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
          </svg>
        </div>
        <h2 className="font-display text-xl font-bold text-ink text-center">Could not load exercises</h2>
        <p className="text-ink-light text-sm text-center font-semibold max-w-xs">
          {loadError || 'Check your connection and that the Netlify function is deployed.'}
        </p>
        <button onClick={() => startSession(chosenLevel)} className="btn-primary max-w-xs mt-2">Try again</button>
        <button onClick={() => setPhase('select')} className="btn-secondary max-w-xs">Change level</button>
      </div>
    )
  }

  // ── RESULT ────────────────────────────────────────────────────────────────
  if (phase === 'result') {
    const total   = sessionResults.length
    const correct = sessionResults.filter(r => r.isCorrect).length
    const pct     = total > 0 ? Math.round((correct / total) * 100) : 0
    const perfect = pct === 100 && total > 0

    return (
      <div className="min-h-dvh bg-cream-100 flex flex-col items-center justify-center p-6">
        <div className="w-full max-w-sm animate-bounce-in">
          <div className="card text-center mb-5">
            <div className="w-20 h-20 mx-auto mb-4 rounded-full flex items-center justify-center"
              style={{ background: pct >= 70 ? '#7BAE8322' : '#C8784822' }}>
              {perfect ? <TrophyIcon /> : pct >= 70 ? <StarIcon /> : <MuscleIcon />}
            </div>
            <h2 className="font-display text-3xl font-bold text-ink mb-1">
              {perfect ? 'Perfect!' : pct >= 70 ? 'Well done!' : 'Keep going!'}
            </h2>
            <p className="text-ink-light font-semibold mb-5">
              {correct} out of {sessionResults.length} correct
            </p>

            <div className="flex justify-center mb-5">
              <div className="relative w-28 h-28">
                <svg viewBox="0 0 100 100" className="w-full h-full -rotate-90">
                  <circle cx="50" cy="50" r="40" fill="none" stroke="#F5EDD8" strokeWidth="10"/>
                  <circle cx="50" cy="50" r="40" fill="none"
                    stroke={pct >= 70 ? '#7BAE83' : '#C87848'}
                    strokeWidth="10"
                    strokeDasharray={`${2.51 * pct} ${251 - 2.51 * pct}`}
                    strokeLinecap="round"
                  />
                </svg>
                <div className="absolute inset-0 flex flex-col items-center justify-center">
                  <span className="text-2xl font-bold text-ink">{pct}%</span>
                  <span className="text-xs text-ink-light font-semibold">accuracy</span>
                </div>
              </div>
            </div>

          </div>

          {sessionResults.some(r => !r.isCorrect) && (
            <div className="card mb-5">
              <h3 className="font-display font-semibold text-ink mb-3">Repasar estos</h3>
              <div className="space-y-3">
                {sessionResults.filter(r => !r.isCorrect).map((r, i) => (
                  <div key={i} className="bg-red-50 border border-red-100 rounded-xl p-3">
                    <p className="text-sm font-bold text-ink mb-1">
                      {r.exercise.question || r.exercise.sentence}
                    </p>
                    <p className="text-xs text-sage-500 font-semibold">
                      ✓ {r.exercise.options?.[r.exercise.correct]}
                    </p>
                    {r.exercise.explanation && (
                      <p className="text-xs text-ink-light mt-1">{r.exercise.explanation}</p>
                    )}
                  </div>
                ))}
              </div>
            </div>
          )}

          <button onClick={() => setPhase('select')} className="btn-primary mb-3">
            Nueva sesión
          </button>
          <button onClick={() => navigate('/')} className="btn-secondary">
            Volver al inicio
          </button>
        </div>
      </div>
    )
  }

  // ── EXERCISE + ANSWERED ───────────────────────────────────────────────────
  const isAnswered = phase === 'answered'
  const isCorrect  = selected === exercise?.correct
  const lvlInfo    = SELECTABLE_LEVELS.find(l => l.key === chosenLevel) || SELECTABLE_LEVELS[0]

  return (
    <div style={{ width: '100%' }} className="min-h-dvh bg-cream-100 block">
      {/* Header */}
      <div className="px-5 pt-12 pb-4 w-full">
        {/* Fila 1: botón atrás + modo + nivel */}
        <div className="flex items-center gap-3 mb-3">
          <button
            onClick={() => setPhase('select')}
            className="w-9 h-9 flex items-center justify-center rounded-2xl bg-cream-200 flex-shrink-0"
          >
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" className="w-4 h-4 text-ink-light">
              <path strokeLinecap="round" strokeLinejoin="round" d="M15 19l-7-7 7-7" />
            </svg>
          </button>
          <div className="flex items-center gap-2">
            <span className="text-xs font-bold text-ink-lighter uppercase tracking-widest">
              {mode === 'grammar' ? 'Grammar' : mode === 'words' ? 'Palabras' : 'Vocabulary'}
            </span>
            <span className="text-xs font-bold px-2 py-0.5 rounded-full"
              style={{ backgroundColor: `${lvlInfo.color}22`, color: lvlInfo.color }}>
              {lvlInfo.label}
            </span>
          </div>
        </div>
        {/* Fila 2: barra de progreso full-width, mismo ancho que los cards */}
        <div className="w-full bg-cream-300 rounded-full h-2 overflow-hidden">
          <div
            className="h-full bg-warm-500 rounded-full transition-all duration-500"
            style={{ width: `${progressPct}%` }}
          />
        </div>
        <div className="h-px bg-cream-300 mt-4" />
      </div>

      {/* Exercise */}
      <div className="px-5 py-6 w-full box-border">
        {exercise && (
          <div key={current} className="animate-slide-up w-full">
            <p className="text-xs font-bold text-ink-lighter uppercase tracking-wide mb-2">
              {exercise.type === 'fill_blank'
                ? 'Complete the sentence'
                : exercise.type === 'error_correction'
                ? 'Correct the error'
                : 'Choose the answer'}
            </p>

            <div className="card mb-5 w-full">
              <p className="font-display text-xl font-semibold text-ink leading-snug w-full">
                {exercise.question || exercise.sentence}
              </p>
              {/* Ocultar traducción en preguntas de significado — daría la pista */}
              {exercise.translation && exercise.type === 'fill_blank' && (
                <p className="text-sm text-ink-light mt-2 italic font-body">
                  {exercise.translation}
                </p>
              )}
            </div>

            <div className="space-y-3">
              {exercise.options?.slice(0, 4).map((opt, idx) => {
                const isThis  = idx === selected
                const isRight = idx === exercise.correct
                let borderColor = '#EDE0C4'
                let bgColor     = 'white'
                let textColor   = '#2C2416'
                let labelBg     = '#F5EDD8'
                let labelColor  = '#7A6952'

                if (isAnswered) {
                  if (isRight) {
                    borderColor = '#7BAE83'; bgColor = '#7BAE8311'; textColor = '#5A8A62'
                    labelBg = '#7BAE83'; labelColor = 'white'
                  } else if (isThis) {
                    borderColor = '#E8A097'; bgColor = '#FFF0EE'; textColor = '#C0504A'
                    labelBg = '#E8A097'; labelColor = 'white'
                  }
                }

                return (
                  <button
                    key={idx}
                    disabled={isAnswered}
                    onClick={() => handleAnswer(idx)}
                    className={`w-full text-left py-4 px-5 rounded-2xl border-2 font-semibold
                                transition-all duration-200 flex items-center gap-3 text-base
                                ${!isAnswered ? 'active:scale-95 cursor-pointer hover:border-warm-400' : ''}
                                ${isAnswered && isThis && !isRight ? 'animate-shake' : ''}`}
                    style={{ borderColor, backgroundColor: bgColor, color: textColor }}
                  >
                    <span className="inline-flex items-center justify-center w-7 h-7 rounded-xl text-sm font-bold flex-shrink-0"
                      style={{ backgroundColor: labelBg, color: labelColor }}>
                      {['A','B','C','D'][idx]}
                    </span>
                    {opt}
                  </button>
                )
              })}
            </div>

            {isAnswered && (
              <div className={`mt-5 p-4 rounded-2xl border-2 animate-slide-up
                ${isCorrect ? 'border-sage-400/40 bg-sage-400/10' : 'border-red-200 bg-red-50'}`}>
                <p className={`font-bold mb-1 text-sm ${isCorrect ? 'text-sage-500' : 'text-red-500'}`}>
                  {isCorrect ? '✓ Correct!' : '✗ Not quite'}
                </p>
                {!isCorrect && (
                  <p className="text-sm text-ink font-semibold mb-1">
                    Answer: <span className="text-sage-500">{exercise.options?.[exercise.correct]}</span>
                  </p>
                )}
                {exercise.explanation && (
                  <p className="text-sm text-ink-light leading-relaxed">{exercise.explanation}</p>
                )}
                <button
                  onClick={handleNext}
                  className={`mt-4 w-full py-3.5 rounded-2xl font-bold text-sm
                              transition-all active:scale-95 flex items-center justify-center gap-2
                    ${isCorrect ? 'bg-sage-500 text-white' : 'bg-warm-500 text-white'}`}
                >
                  {current + 1 >= queue.length && !nextBatchRef.current ? 'Ver resultados' : 'Continuar'}
                  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" className="w-4 h-4">
                    <path strokeLinecap="round" strokeLinejoin="round" d="M9 5l7 7-7 7"/>
                  </svg>
                </button>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  )
}

function TrophyIcon() {
  return (
    <svg className="w-10 h-10 text-amber-500" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8">
      <path strokeLinecap="round" strokeLinejoin="round"
        d="M8 21h8m-4-4v4M5 3H3v4a4 4 0 004 4h1m6 0h1a4 4 0 004-4V3h-2M5 3h14M9 3v8a3 3 0 006 0V3" />
    </svg>
  )
}
function StarIcon() {
  return (
    <svg className="w-10 h-10 text-sage-500" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8">
      <polygon strokeLinecap="round" strokeLinejoin="round"
        points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2"/>
    </svg>
  )
}
function MuscleIcon() {
  return (
    <svg className="w-10 h-10 text-warm-500" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8">
      <path strokeLinecap="round" strokeLinejoin="round"
        d="M9 12l2 2 4-4M7.835 4.697a3.42 3.42 0 001.946-.806 3.42 3.42 0 014.438 0 3.42 3.42 0 001.946.806 3.42 3.42 0 013.138 3.138 3.42 3.42 0 00.806 1.946 3.42 3.42 0 010 4.438 3.42 3.42 0 00-.806 1.946 3.42 3.42 0 01-3.138 3.138 3.42 3.42 0 00-1.946.806 3.42 3.42 0 01-4.438 0 3.42 3.42 0 00-1.946-.806 3.42 3.42 0 01-3.138-3.138 3.42 3.42 0 00-.806-1.946 3.42 3.42 0 010-4.438 3.42 3.42 0 00.806-1.946 3.42 3.42 0 013.138-3.138z"/>
    </svg>
  )
}