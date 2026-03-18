import { useState, useEffect, useRef, useCallback } from 'react'
import { useAuth } from '../hooks/useAuth'
import { supabase } from '../lib/supabase'

const IS_DEV = import.meta.env.DEV
const BASE = IS_DEV ? 'http://localhost:8888/.netlify/functions' : '/.netlify/functions'

const LEVELS = [
  { key: 2, label: 'A2', color: '#7BAED4' },
  { key: 3, label: 'B1', color: '#C8956A' },
  { key: 4, label: 'B2', color: '#9B7FD4' },
]

async function fetchFromAI(level) {
  const res = await fetch(`${BASE}/generate-reading`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ level }),
  })
  if (!res.ok) throw new Error(`HTTP ${res.status}`)
  const data = await res.json()
  if (data.error) throw new Error(data.error)
  return data
}

async function saveToSupabase(userId, level, generated) {
  const { data } = await supabase
    .from('readings')
    .insert({
      user_id: userId,
      level,
      title: generated.title,
      text: generated.text,
      topic: generated.topic || '',
    })
    .select()
    .single()
  return data
}

export default function Reading() {
  const { user } = useAuth()

  // Cache de readings por nivel: { 2: {...}, 3: {...}, 4: {...} }
  const [cache, setCache] = useState({})
  // Qué niveles están cargando
  const [loadingLevels, setLoadingLevels] = useState({})
  // Nivel activo
  const [level, setLevel] = useState(2)
  // Popup
  const [popup, setPopup] = useState(null)
  const [translating, setTranslating] = useState(false)
  const containerRef = useRef(null)
  // Para evitar dobles peticiones
  const inFlight = useRef({})

  const loadLevel = useCallback(async (lvl, userId, forceNew = false) => {
    if (inFlight.current[lvl] && !forceNew) return
    inFlight.current[lvl] = true

    setLoadingLevels(prev => ({ ...prev, [lvl]: true }))

    try {
      // 1. Intentar Supabase primero (si no es forzado)
      if (!forceNew) {
        const { data } = await supabase
          .from('readings')
          .select('*')
          .eq('user_id', userId)
          .eq('level', lvl)
          .order('created_at', { ascending: false })
          .limit(1)
          .single()

        if (data) {
          setCache(prev => ({ ...prev, [lvl]: data }))
          setLoadingLevels(prev => ({ ...prev, [lvl]: false }))
          inFlight.current[lvl] = false
          return
        }
      }

      // 2. No hay en Supabase — generar con IA
      const generated = await fetchFromAI(lvl)
      const saved = await saveToSupabase(userId, lvl, generated)
      setCache(prev => ({ ...prev, [lvl]: saved || { title: generated.title, text: generated.text, level: lvl } }))
    } catch (err) {
      console.error(`Error loading level ${lvl}:`, err)
      setCache(prev => ({ ...prev, [lvl]: null }))
    } finally {
      setLoadingLevels(prev => ({ ...prev, [lvl]: false }))
      inFlight.current[lvl] = false
    }
  }, [])

  // Al montar: cargar los 3 niveles simultáneamente
  useEffect(() => {
    if (!user) return
    LEVELS.forEach(l => loadLevel(l.key, user.id))
  }, [user, loadLevel])

  const handleRefresh = (lvl) => {
    setPopup(null)
    if (!user) return
    setCache(prev => ({ ...prev, [lvl]: undefined }))
    loadLevel(lvl, user.id, true)
  }

  const handleWordTap = async (word, event) => {
    const clean = word.replace(/[^a-zA-Z'-]/g, '').trim()
    if (!clean || clean.length < 2) return

    const rect = event.target.getBoundingClientRect()
    const containerRect = containerRef.current?.getBoundingClientRect() || { top: 0, left: 0 }

    const reading = cache[level]
    setPopup({
      word: clean,
      x: rect.left - containerRect.left + rect.width / 2,
      y: rect.top - containerRect.top - 8,
      data: null,
    })
    setTranslating(true)

    try {
      const sentences = (reading?.text || '').split(/[.!?]/)
      const sentence = sentences.find(s => s.toLowerCase().includes(clean.toLowerCase())) || ''

      const res = await fetch(`${BASE}/translate-word`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ word: clean, sentence: sentence.trim() }),
      })
      const result = await res.json()
      setPopup(prev => prev ? { ...prev, data: result } : null)
    } catch {
      setPopup(prev => prev ? { ...prev, data: { translation: 'Error al traducir', type: '' } } : null)
    } finally {
      setTranslating(false)
    }
  }

  const levelInfo = LEVELS.find(l => l.key === level) || LEVELS[0]
  const reading = cache[level]
  const isLoading = loadingLevels[level]

  return (
    <div className="bg-cream-100 min-h-dvh" onClick={() => setPopup(null)}>
      {/* Header */}
      <div className="px-5 pt-12 pb-5">
        <div className="flex items-center justify-between mb-5">
          <div>
            <p className="text-ink-lighter text-xs font-bold uppercase tracking-widest mb-1">Lectura</p>
            <h1 className="font-display text-2xl font-bold text-ink">Reading</h1>
          </div>
          <button
            onClick={(e) => { e.stopPropagation(); handleRefresh(level) }}
            disabled={isLoading}
            className="w-10 h-10 flex items-center justify-center rounded-2xl bg-cream-200
                       hover:bg-cream-300 transition-colors disabled:opacity-40 flex-shrink-0"
            title="Nuevo texto"
          >
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"
              className={`w-5 h-5 text-ink-light ${isLoading ? 'animate-spin' : ''}`}>
              <path strokeLinecap="round" strokeLinejoin="round"
                d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
            </svg>
          </button>
        </div>

        {/* Level selector */}
        <div className="flex gap-2">
          {LEVELS.map(lvl => (
            <button
              key={lvl.key}
              onClick={(e) => { e.stopPropagation(); setLevel(lvl.key); setPopup(null) }}
              className="px-4 py-1.5 rounded-full text-xs font-bold transition-all"
              style={level === lvl.key
                ? { backgroundColor: `${lvl.color}33`, color: lvl.color, border: `2px solid ${lvl.color}66` }
                : { backgroundColor: '#F5EDD8', color: '#A89880', border: '2px solid transparent' }
              }
            >
              {lvl.label}
              {/* Puntito si está cargando en background */}
              {loadingLevels[lvl.key] && level !== lvl.key && (
                <span className="inline-block w-1 h-1 ml-1 rounded-full bg-current opacity-50 align-middle" />
              )}
            </button>
          ))}
        </div>
      </div>

      {/* Content */}
      <div className="px-5 pb-10">
        {isLoading ? (
          <div className="w-full card flex flex-col items-center justify-center gap-4"
            style={{ minHeight: 'calc(100dvh - 220px)' }}>
            <div className="w-12 h-12 rounded-2xl flex items-center justify-center animate-pulse"
              style={{ backgroundColor: `${levelInfo.color}33` }}>
              <svg viewBox="0 0 24 24" fill="none" stroke={levelInfo.color} strokeWidth="1.8" className="w-6 h-6">
                <path strokeLinecap="round" strokeLinejoin="round"
                  d="M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5c1.747 0 3.332.477 4.5 1.253v13C19.832 18.477 18.247 18 16.5 18c-1.746 0-3.332.477-4.5 1.253" />
              </svg>
            </div>
            <p className="text-ink-light font-semibold text-sm">Cargando texto...</p>
            <div className="flex gap-1.5">
              {[0,1,2].map(i => (
                <div key={i} className="w-2 h-2 bg-warm-400 rounded-full animate-bounce"
                  style={{ animationDelay: `${i * 0.15}s` }} />
              ))}
            </div>
          </div>
        ) : reading ? (
          <div ref={containerRef} className="relative w-full" onClick={e => e.stopPropagation()}>
            <div className="card w-full">
              <div className="flex items-start justify-between mb-4">
                <h2 className="font-display text-xl font-bold text-ink leading-snug flex-1 pr-3">
                  {reading.title}
                </h2>
                <span className="text-xs font-bold px-2 py-1 rounded-full flex-shrink-0"
                  style={{ backgroundColor: `${levelInfo.color}22`, color: levelInfo.color }}>
                  {levelInfo.label}
                </span>
              </div>

              <p className="text-xs text-ink-lighter font-semibold mb-4 flex items-center gap-1.5">
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="w-3.5 h-3.5 flex-shrink-0">
                  <path strokeLinecap="round" strokeLinejoin="round"
                    d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"/>
                </svg>
                Toca cualquier palabra para traducirla
              </p>

              <p className="text-base text-ink leading-relaxed font-body">
                {reading.text.split(/(\s+)/).map((token, i) => {
                  if (/^\s+$/.test(token)) return <span key={i}>{token}</span>
                  const clean = token.replace(/[^a-zA-Z'-]/g, '')
                  if (!clean || clean.length < 2) return <span key={i}>{token}</span>
                  return (
                    <span
                      key={i}
                      onClick={(e) => { e.stopPropagation(); handleWordTap(token, e) }}
                      className="cursor-pointer rounded px-0.5 transition-colors duration-150
                                 hover:bg-warm-400/20 active:bg-warm-400/30 select-none"
                      style={{
                        textDecorationLine: 'underline',
                        textDecorationStyle: 'dotted',
                        textDecorationColor: '#C8A87A',
                        textDecorationThickness: '1px',
                        textUnderlineOffset: '3px',
                      }}
                    >
                      {token}
                    </span>
                  )
                })}
              </p>
            </div>

            {/* Overlay invisible para cerrar popup al tocar fuera */}
            {popup && (
              <div
                className="fixed inset-0 z-40"
                onClick={() => setPopup(null)}
                onTouchStart={() => setPopup(null)}
              />
            )}

            {/* Translation popup */}
            {popup && (
              <div
                className="absolute z-50 animate-fade-in"
                style={{
                  left: `${Math.min(Math.max(popup.x - 105, 0), 170)}px`,
                  top: `${popup.y - 115}px`,
                  width: '210px',
                }}
                onClick={e => e.stopPropagation()}
              >
                <div className="rounded-2xl px-4 py-3"
                  style={{
                    background: 'rgba(255,253,248,0.97)',
                    backdropFilter: 'blur(16px)',
                    boxShadow: '0 8px 32px rgba(44,36,22,0.18)',
                    border: '1.5px solid rgba(200,168,122,0.35)',
                  }}
                >
                  {translating ? (
                    <div className="flex items-center gap-2 py-1">
                      <div className="flex gap-1">
                        {[0,1,2].map(i => (
                          <div key={i} className="w-1.5 h-1.5 bg-warm-400 rounded-full animate-bounce"
                            style={{ animationDelay: `${i * 0.12}s` }} />
                        ))}
                      </div>
                      <span className="text-xs text-ink-light font-semibold">Traduciendo...</span>
                    </div>
                  ) : popup.data ? (
                    <>
                      <div className="flex items-baseline gap-2 mb-1">
                        <span className="font-display font-bold text-ink text-sm">{popup.word}</span>
                        {popup.data.type && (
                          <span className="text-xs text-ink-lighter font-semibold italic">{popup.data.type}</span>
                        )}
                      </div>
                      <p className="text-warm-500 font-bold text-base leading-tight">{popup.data.translation}</p>
                      {popup.data.example && (
                        <p className="text-xs text-ink-lighter mt-1.5 leading-snug italic">{popup.data.example}</p>
                      )}
                    </>
                  ) : null}
                </div>
                <div className="flex justify-center">
                  <div className="w-3 h-3 rotate-45 -mt-1.5"
                    style={{
                      background: 'rgba(255,253,248,0.97)',
                      borderRight: '1.5px solid rgba(200,168,122,0.3)',
                      borderBottom: '1.5px solid rgba(200,168,122,0.3)',
                    }}
                  />
                </div>
              </div>
            )}
          </div>
        ) : (
          <div className="w-full card text-center py-10">
            <p className="text-ink-light font-semibold mb-4">No se pudo cargar el texto</p>
            <button
              onClick={() => user && loadLevel(level, user.id, true)}
              className="btn-primary max-w-xs mx-auto"
            >
              Intentar de nuevo
            </button>
          </div>
        )}
      </div>
    </div>
  )
}