import { useState, useEffect, useCallback } from 'react'
import { useAuth } from '../hooks/useAuth'
import { supabase } from '../lib/supabase'

const IS_DEV = import.meta.env.DEV
const BASE = IS_DEV ? 'http://localhost:8888/.netlify/functions' : '/.netlify/functions'

function IconCards({ active }) {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={active ? 2.5 : 2} className="w-5 h-5">
      <rect x="2" y="6" width="16" height="12" rx="2" strokeLinecap="round"/>
      <path strokeLinecap="round" d="M6 6V4a2 2 0 012-2h12a2 2 0 012 2v12a2 2 0 01-2 2h-2"/>
    </svg>
  )
}
function IconChart({ active }) {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={active ? 2.5 : 2} className="w-5 h-5">
      <path strokeLinecap="round" strokeLinejoin="round" d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z"/>
    </svg>
  )
}

export default function Review() {
  const { user } = useAuth()
  const [tab, setTab]       = useState('flashcards')
  const [cards, setCards]   = useState([])
  const [words, setWords]   = useState([])
  const [accuracy, setAccuracy]   = useState(0)
  const [totalEx, setTotalEx]     = useState(0)
  const [loading, setLoading]     = useState(true)

  const loadData = useCallback(async () => {
    if (!user?.id) return
    setLoading(true)
    try {
      // ── Flashcards vencidas — query directa desde cliente (tiene JWT) ──
      const { data: dueCards } = await supabase
        .from('vocabulary_mastery')
        .select('id, word, translation, correct_count, incorrect_count, next_review, sm_repetitions, sm_interval, sm_ease_factor')
        .eq('user_id', user.id)
        .lte('next_review', new Date().toISOString())
        .order('next_review', { ascending: true })
        .limit(50)

      setCards(dueCards || [])

      // ── Historial de errores ──
      const { data: history } = await supabase
        .from('exercise_history')
        .select('word_or_topic, correct, mode')
        .eq('user_id', user.id)
        .not('word_or_topic', 'is', null)
        .order('created_at', { ascending: false })
        .limit(500)

      const rows = history || []
      const totalOk = rows.filter(h => h.correct).length
      setTotalEx(rows.length)
      setAccuracy(rows.length > 0 ? Math.round((totalOk / rows.length) * 100) : 0)

      // Agrupar por palabra
      const map = {}
      for (const h of rows) {
        const key = h.word_or_topic?.toLowerCase()
        if (!key || key.length < 2) continue
        if (!map[key]) map[key] = { word: h.word_or_topic, mode: h.mode, correct: 0, total: 0 }
        map[key].total++
        if (h.correct) map[key].correct++
      }
      const weak = Object.values(map)
        .filter(w => w.total >= 2)
        .map(w => ({ ...w, incorrect: w.total - w.correct, errorRate: Math.round(((w.total - w.correct) / w.total) * 100) }))
        .filter(w => w.errorRate > 0)
        .sort((a, b) => b.errorRate - a.errorRate)
        .slice(0, 20)
      setWords(weak)
    } catch (e) {
      console.error('loadData error:', e)
    } finally {
      setLoading(false)
    }
  }, [user])

  useEffect(() => { loadData() }, [loadData])

  return (
    <div style={{ width: '100%' }} className="min-h-dvh bg-cream-100 block">
      <div className="px-5 pt-12 pb-5 w-full">
        <p className="text-ink-lighter text-xs font-bold uppercase tracking-widest mb-1">Repasar</p>
        <h1 className="font-display text-2xl font-bold text-ink mb-5">Review</h1>

        <div className="flex gap-2 p-1 bg-cream-200 rounded-2xl w-full">
          {[
            { id: 'flashcards', label: 'Flashcards', icon: <IconCards active={tab==='flashcards'}/> },
            { id: 'errors',     label: 'Mis errores', icon: <IconChart active={tab==='errors'}/> },
          ].map(t => (
            <button key={t.id} onClick={() => setTab(t.id)}
              className={`flex-1 flex items-center justify-center gap-2 py-2.5 rounded-xl
                          text-sm font-bold transition-all duration-200
                          ${tab===t.id ? 'bg-white text-ink shadow-soft' : 'text-ink-light hover:text-ink'}`}>
              {t.icon}
              {t.label}
              {t.id==='flashcards' && cards.length > 0 && (
                <span className="bg-warm-500 text-white text-xs font-bold px-1.5 py-0.5 rounded-full min-w-5 text-center">
                  {cards.length}
                </span>
              )}
            </button>
          ))}
        </div>
        <div className="h-px bg-cream-300 mt-5" />
      </div>

      <div className="px-5 pb-10 w-full">
        {loading ? (
          <div className="w-full card flex flex-col items-center py-12 gap-4">
            <div className="flex gap-1.5">
              {[0,1,2].map(i => (
                <div key={i} className="w-2.5 h-2.5 bg-warm-400 rounded-full animate-bounce"
                  style={{ animationDelay: `${i*0.15}s` }} />
              ))}
            </div>
            <p className="text-ink-light font-semibold text-sm">Cargando...</p>
          </div>
        ) : tab==='flashcards' ? (
          <FlashcardsTab cards={cards} userId={user?.id} onDone={loadData} />
        ) : (
          <ErrorsTab weakWords={words} accuracy={accuracy} totalExercises={totalEx} />
        )}
      </div>
    </div>
  )
}

// ── Flashcards ─────────────────────────────────────────────────────────────────
function FlashcardsTab({ cards, userId, onDone }) {
  const [queue, setQueue]     = useState([...cards])
  const [idx, setIdx]         = useState(0)
  const [flipped, setFlipped] = useState(false)
  const [done, setDone]       = useState(0)
  const [busy, setBusy]       = useState(false)

  useEffect(() => { setQueue([...cards]); setIdx(0); setFlipped(false); setDone(0) }, [cards])

  if (queue.length === 0) {
    return (
      <div className="w-full card flex flex-col items-center py-12 gap-4 text-center">
        <div className="w-16 h-16 rounded-full bg-sage-400/20 flex items-center justify-center">
          <svg viewBox="0 0 24 24" fill="none" stroke="#7BAE83" strokeWidth="2" className="w-8 h-8">
            <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7"/>
          </svg>
        </div>
        <h2 className="font-display text-xl font-bold text-ink">¡Al día!</h2>
        <p className="text-ink-light font-semibold text-sm max-w-xs leading-relaxed">
          No hay flashcards pendientes. Las palabras que practiques en <strong>Vocabulary</strong> aparecerán aquí para repasar.
        </p>
      </div>
    )
  }

  if (idx >= queue.length) {
    return (
      <div className="w-full card flex flex-col items-center py-12 gap-4 text-center">
        <div className="w-16 h-16 rounded-full bg-amber-100 flex items-center justify-center">
          <svg viewBox="0 0 24 24" fill="#F59E0B" className="w-8 h-8">
            <path d="M13 2L3 14h9l-1 8 10-12h-9l1-8z"/>
          </svg>
        </div>
        <h2 className="font-display text-2xl font-bold text-ink">Sesión completada</h2>
        <p className="text-ink-light font-semibold">{done} tarjetas repasadas</p>
        <button onClick={onDone} className="btn-primary mt-2">Actualizar</button>
      </div>
    )
  }

  const card = queue[idx]

  const handleRate = async (quality) => {
    if (busy) return
    setBusy(true)
    try {
      // SM-2 directamente en cliente — no necesita service key
      const { interval, easeFactor, repetitions } = sm2(
        quality,
        card.sm_repetitions || 0,
        2.5,
        card.sm_interval || 1
      )
      const nextReview = new Date()
      nextReview.setDate(nextReview.getDate() + interval)

      await supabase
        .from('vocabulary_mastery')
        .update({
          sm_interval:    interval,
          sm_ease_factor: easeFactor,
          sm_repetitions: repetitions,
          next_review:    nextReview.toISOString(),
        })
        .eq('id', card.id)
        .eq('user_id', userId)
    } catch (e) { console.error(e) }
    setDone(d => d+1)
    setIdx(i => i+1)
    setFlipped(false)
    setBusy(false)
  }

  const progress = Math.round((idx / queue.length) * 100)

  return (
    <div className="w-full">
      <div className="flex items-center justify-between mb-3">
        <span className="text-xs font-bold text-ink-lighter">{idx+1} / {queue.length}</span>
        <span className="text-xs font-bold text-ink-lighter">{queue.length - idx} pendientes</span>
      </div>
      <div className="w-full bg-cream-300 rounded-full h-2 mb-6 overflow-hidden">
        <div className="h-full bg-warm-500 rounded-full transition-all duration-500"
          style={{ width: `${progress}%` }} />
      </div>

      {/* Card flip */}
      <div className="w-full mb-5" style={{ perspective: '1000px' }}>
        <div className="w-full relative transition-all duration-500"
          style={{ transformStyle:'preserve-3d', transform: flipped ? 'rotateY(180deg)' : 'rotateY(0deg)', minHeight:'200px' }}>

          {/* Frontal — inglés */}
          <div className="w-full card cursor-pointer select-none absolute inset-0"
            style={{ backfaceVisibility:'hidden', minHeight:'200px' }}
            onClick={() => !flipped && setFlipped(true)}>
            <div className="flex flex-col items-center justify-center h-full py-6 gap-4">
              <p className="font-display text-3xl font-bold text-ink text-center">{card.word}</p>
              <p className="text-xs text-ink-lighter font-semibold mt-2">Toca para ver la traducción</p>
            </div>
          </div>

          {/* Trasera — español */}
          <div className="w-full card absolute inset-0"
            style={{ backfaceVisibility:'hidden', transform:'rotateY(180deg)', minHeight:'200px' }}>
            <div className="flex flex-col items-center justify-center h-full py-6 gap-3">
              <p className="font-display text-3xl font-bold text-warm-500 text-center">
                {card.translation || '—'}
              </p>
              <p className="text-sm text-ink-light font-semibold text-center">{card.word}</p>
              <span className="text-xs text-ink-lighter font-bold">
                ✓ {card.correct_count} · ✗ {card.incorrect_count}
              </span>
            </div>
          </div>
        </div>
      </div>

      {/* Botones valoración */}
      {flipped ? (
        <div className="w-full grid grid-cols-4 gap-2">
          {[
            { q:0, label:'Otra vez', bg:'bg-red-100',    text:'text-red-500',    border:'border-red-200' },
            { q:3, label:'Difícil',  bg:'bg-orange-100', text:'text-orange-500', border:'border-orange-200' },
            { q:4, label:'Bien',     bg:'bg-blue-100',   text:'text-blue-500',   border:'border-blue-200' },
            { q:5, label:'Fácil',    bg:'bg-sage-400/20',text:'text-sage-500',   border:'border-sage-400/40' },
          ].map(btn => (
            <button key={btn.q} onClick={() => handleRate(btn.q)} disabled={busy}
              className={`py-3 rounded-2xl border-2 font-bold text-xs
                          ${btn.bg} ${btn.text} ${btn.border}
                          active:scale-95 transition-all disabled:opacity-50`}>
              {btn.label}
            </button>
          ))}
        </div>
      ) : (
        <button onClick={() => setFlipped(true)} className="btn-primary">
          Ver traducción
        </button>
      )}
    </div>
  )
}

// ── Errors Tab ─────────────────────────────────────────────────────────────────
function ErrorsTab({ weakWords, accuracy, totalExercises }) {
  if (totalExercises === 0) {
    return (
      <div className="w-full card flex flex-col items-center py-12 gap-4 text-center">
        <p className="font-display text-xl font-bold text-ink">Sin datos aún</p>
        <p className="text-ink-light font-semibold text-sm">
          Completa algunos ejercicios para ver tus estadísticas.
        </p>
      </div>
    )
  }
  return (
    <div className="w-full space-y-4">
      <div className="grid grid-cols-2 gap-3">
        <div className="card text-center">
          <p className="text-3xl font-bold text-sage-500">{accuracy}%</p>
          <p className="text-xs text-ink-lighter font-bold uppercase tracking-wide mt-1">Precisión global</p>
        </div>
        <div className="card text-center">
          <p className="text-3xl font-bold text-warm-500">{totalExercises}</p>
          <p className="text-xs text-ink-lighter font-bold uppercase tracking-wide mt-1">Ejercicios totales</p>
        </div>
      </div>

      {weakWords.length > 0 ? (
        <div className="card">
          <h2 className="font-display font-bold text-lg text-ink mb-4">Palabras difíciles</h2>
          <div className="space-y-3">
            {weakWords.map((w, i) => <WordErrorRow key={i} word={w} />)}
          </div>
        </div>
      ) : (
        <div className="card text-center py-8">
          <p className="text-sage-500 font-bold text-lg mb-1">¡Excelente!</p>
          <p className="text-ink-light font-semibold text-sm">No tienes palabras con errores frecuentes.</p>
        </div>
      )}
    </div>
  )
}

function WordErrorRow({ word }) {
  const color = word.errorRate >= 70 ? '#E8A097' : word.errorRate >= 40 ? '#C8956A' : '#C8A87A'
  const modeLabel = word.mode === 'grammar' ? 'Gramática' : 'Vocabulario'
  const modeColor = word.mode === 'grammar' ? '#7BAED4' : '#C8956A'
  return (
    <div className="flex items-center gap-3">
      <div className="w-12 h-12 rounded-2xl flex items-center justify-center flex-shrink-0"
        style={{ backgroundColor: `${color}22` }}>
        <span className="text-sm font-bold" style={{ color }}>{word.errorRate}%</span>
      </div>
      <div className="flex-1 min-w-0">
        <div className="flex items-center justify-between mb-1">
          <span className="font-bold text-ink text-sm truncate">{word.word}</span>
          <span className="text-xs text-ink-lighter font-semibold ml-2 flex-shrink-0">
            {word.incorrect} fallo{word.incorrect !== 1 ? 's' : ''} de {word.total}
          </span>
        </div>
        <div className="flex items-center gap-2">
          <div className="flex-1 bg-cream-200 rounded-full h-1.5 overflow-hidden">
            <div className="h-full rounded-full transition-all duration-700"
              style={{ width:`${word.errorRate}%`, backgroundColor: color }} />
          </div>
          <span className="text-xs font-bold flex-shrink-0"
            style={{ color: modeColor }}>{modeLabel}</span>
        </div>
      </div>
    </div>
  )
}

// SM-2 Algorithm
function sm2(quality, repetitions, easeFactor, interval) {
  let reps = repetitions, ef = easeFactor, iv = interval
  if (quality < 3) {
    reps = 0; iv = 1
  } else {
    if (reps === 0)      iv = 1
    else if (reps === 1) iv = 6
    else                 iv = Math.round(iv * ef)
    reps++
  }
  ef = Math.max(1.3, Math.round((ef + 0.1 - (5 - quality) * (0.08 + (5 - quality) * 0.02)) * 100) / 100)
  return { interval: iv, easeFactor: ef, repetitions: reps }
}