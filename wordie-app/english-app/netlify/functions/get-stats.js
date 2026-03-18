// netlify/functions/get-stats.js
// Devuelve estadísticas de errores y flashcards pendientes

import { createClient } from '@supabase/supabase-js'

const supabase = createClient(
  process.env.SUPABASE_URL || process.env.VITE_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_KEY || process.env.VITE_SUPABASE_ANON_KEY
)

export const handler = async (event) => {
  if (event.httpMethod === 'OPTIONS') return { statusCode: 200, headers: cors(), body: '' }
  if (event.httpMethod !== 'POST') return { statusCode: 405, body: 'Method Not Allowed' }

  try {
    const { userId } = JSON.parse(event.body || '{}')
    if (!userId) return { statusCode: 400, headers: cors(), body: JSON.stringify({ error: 'Missing userId' }) }

    // Flashcards vencidas hoy
    const { data: dueCards, error: dueErr } = await supabase
      .from('vocabulary_mastery')
      .select('id, word, translation, correct_count, incorrect_count, next_review, sm_repetitions')
      .eq('user_id', userId)
      .lte('next_review', new Date().toISOString())
      .order('next_review', { ascending: true })
      .limit(50)

    if (dueErr) console.error('dueCards error:', dueErr)

    // Palabras más difíciles (del historial de ejercicios)
    const { data: history, error: histErr } = await supabase
      .from('exercise_history')
      .select('word_or_topic, correct, mode')
      .eq('user_id', userId)
      .not('word_or_topic', 'is', null)
      .order('created_at', { ascending: false })
      .limit(500)

    if (histErr) console.error('history error:', histErr)

    // Agrupar por palabra y calcular error rate
    const wordMap = {}
    for (const h of history || []) {
      const key = h.word_or_topic?.toLowerCase()
      if (!key || key.length < 2) continue
      if (!wordMap[key]) wordMap[key] = { word: h.word_or_topic, mode: h.mode, correct: 0, total: 0 }
      wordMap[key].total++
      if (h.correct) wordMap[key].correct++
    }

    const weakWords = Object.values(wordMap)
      .filter(w => w.total >= 2) // al menos 2 intentos
      .map(w => ({
        word:      w.word,
        mode:      w.mode,
        total:     w.total,
        correct:   w.correct,
        incorrect: w.total - w.correct,
        errorRate: Math.round(((w.total - w.correct) / w.total) * 100),
      }))
      .filter(w => w.errorRate > 0)
      .sort((a, b) => b.errorRate - a.errorRate)
      .slice(0, 20)

    // Stats generales
    const totalEx  = (history || []).length
    const totalOk  = (history || []).filter(h => h.correct).length
    const accuracy = totalEx > 0 ? Math.round((totalOk / totalEx) * 100) : 0

    return {
      statusCode: 200,
      headers: cors(),
      body: JSON.stringify({
        dueCards:   dueCards || [],
        weakWords,
        accuracy,
        totalExercises: totalEx,
      }),
    }
  } catch (err) {
    return { statusCode: 500, headers: cors(), body: JSON.stringify({ error: err.message }) }
  }
}

function cors() {
  return {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Headers': 'Content-Type',
    'Content-Type': 'application/json',
  }
}