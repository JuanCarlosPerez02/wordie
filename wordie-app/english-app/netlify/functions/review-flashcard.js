// netlify/functions/review-flashcard.js
// Aplica el algoritmo SM-2 (SuperMemo 2) tras valorar una flashcard

import { createClient } from '@supabase/supabase-js'

const supabase = createClient(
  process.env.SUPABASE_URL || process.env.VITE_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_KEY || process.env.VITE_SUPABASE_ANON_KEY
)

export const handler = async (event) => {
  if (event.httpMethod === 'OPTIONS') return { statusCode: 200, headers: cors(), body: '' }
  if (event.httpMethod !== 'POST') return { statusCode: 405, body: 'Method Not Allowed' }

  try {
    const { userId, wordId, quality } = JSON.parse(event.body || '{}')
    // quality: 0=Otra vez, 3=Difícil, 4=Bien, 5=Fácil

    if (!userId || !wordId || quality === undefined) {
      return { statusCode: 400, headers: cors(), body: JSON.stringify({ error: 'Missing params' }) }
    }

    // Obtener estado actual de la card
    const { data: card, error } = await supabase
      .from('vocabulary_mastery')
      .select('sm_interval, sm_ease_factor, sm_repetitions')
      .eq('id', wordId)
      .eq('user_id', userId)
      .single()

    if (error || !card) {
      return { statusCode: 404, headers: cors(), body: JSON.stringify({ error: 'Card not found' }) }
    }

    // Algoritmo SM-2
    const { interval, easeFactor, repetitions } = sm2(
      quality,
      card.sm_repetitions,
      card.sm_ease_factor,
      card.sm_interval
    )

    // Calcular próxima fecha de repaso
    const nextReview = new Date()
    nextReview.setDate(nextReview.getDate() + interval)

    // Guardar en Supabase
    await supabase
      .from('vocabulary_mastery')
      .update({
        sm_interval:    interval,
        sm_ease_factor: easeFactor,
        sm_repetitions: repetitions,
        next_review:    nextReview.toISOString(),
      })
      .eq('id', wordId)
      .eq('user_id', userId)

    return {
      statusCode: 200,
      headers: cors(),
      body: JSON.stringify({ interval, nextReview: nextReview.toISOString() }),
    }
  } catch (err) {
    return { statusCode: 500, headers: cors(), body: JSON.stringify({ error: err.message }) }
  }
}

// ── SM-2 Algorithm ─────────────────────────────────────────────────────────────
// quality: 0 = blackout/fail, 3 = hard, 4 = good, 5 = easy
function sm2(quality, repetitions, easeFactor, interval) {
  let newReps     = repetitions
  let newEF       = easeFactor
  let newInterval = interval

  if (quality < 3) {
    // Respuesta incorrecta — reiniciar
    newReps     = 0
    newInterval = 1
  } else {
    // Respuesta correcta
    if (newReps === 0)      newInterval = 1
    else if (newReps === 1) newInterval = 6
    else                    newInterval = Math.round(newInterval * newEF)
    newReps++
  }

  // Actualizar ease factor (mínimo 1.3 para evitar intervalos muy cortos)
  newEF = newEF + (0.1 - (5 - quality) * (0.08 + (5 - quality) * 0.02))
  newEF = Math.max(1.3, Math.round(newEF * 100) / 100)

  return { interval: newInterval, easeFactor: newEF, repetitions: newReps }
}

function cors() {
  return {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Headers': 'Content-Type',
    'Content-Type': 'application/json',
  }
}