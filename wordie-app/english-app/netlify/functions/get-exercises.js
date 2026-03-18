import { createClient } from '@supabase/supabase-js'

const supabase = createClient(
  process.env.SUPABASE_URL || process.env.VITE_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_KEY || process.env.VITE_SUPABASE_ANON_KEY
)

const SERVE_N    = 10  // cuántas dar al usuario por tanda
const GENERATE_N = 5   // cuántas pedir a Groq de una vez (seguro y rápido)
const MIN_BANK   = 15  // reponer banco si quedan menos de estas sin ver

export const handler = async (event) => {
  if (event.httpMethod === 'OPTIONS') return { statusCode: 200, headers: cors(), body: '' }
  if (event.httpMethod !== 'POST') return { statusCode: 405, body: 'Method Not Allowed' }

  try {
    const { level, mode, userId } = JSON.parse(event.body || '{}')
    console.log('get-exercises params:', { level, mode, userId })
    if (!level || !mode || !userId) {
      return { statusCode: 400, headers: cors(), body: JSON.stringify({ error: `Missing params: level=${level} mode=${mode} userId=${userId}` }) }
    }

    // Ids ya vistos por este usuario en este modo+nivel
    const { data: seenRows } = await supabase
      .from('seen_questions')
      .select('question_id')
      .eq('user_id', userId)
    const seenIds = (seenRows || []).map(r => r.question_id)

    // Preguntas disponibles no vistas
    let pool = await getUnseen({ mode, level, seenIds })

    // Si no hay nada — resetear vistas y volver a cargar
    if (pool.length === 0) {
      await resetSeen({ userId, mode, level })
      pool = await getUnseen({ mode, level, seenIds: [] })
    }

    // Si el banco está vacío o casi vacío — generar síncronamente hasta tener suficiente
    let attempts = 0
    while (pool.length < SERVE_N && attempts < 3) {
      attempts++
      try {
        const newOnes = await generateAndStore({ level, mode })
        if (newOnes && newOnes.length > 0) {
          pool = [...pool, ...newOnes]
        } else {
          break // sin nuevas preguntas, salir
        }
      } catch (e) {
        console.error('generateAndStore error:', e.message)
        break // error generando, salir del loop
      }
    }

    // Si aún no hay suficientes, devolver las que haya (mínimo 1)
    if (pool.length === 0) {
      return { statusCode: 500, headers: cors(), body: JSON.stringify({ error: 'No questions available' }) }
    }

    // Mezclar y coger SERVE_N
    const shuffled = pool.sort(() => Math.random() - 0.5).slice(0, SERVE_N)

    // Marcar como vistas
    await supabase.from('seen_questions').upsert(
      shuffled.map(q => ({ user_id: userId, question_id: q.id })),
      { onConflict: 'user_id,question_id' }
    )

    // Reponer banco en background si queda poco (sin bloquear respuesta)
    const remaining = pool.length - SERVE_N
    if (remaining < MIN_BANK) {
      generateAndStore({ level, mode }).catch(() => {})
    }

    return {
      statusCode: 200,
      headers: cors(),
      body: JSON.stringify({ exercises: shuffled.map(toExercise) }),
    }
  } catch (err) {
    console.error(err)
    return { statusCode: 500, headers: cors(), body: JSON.stringify({ error: err.message }) }
  }
}

// ── Helpers ───────────────────────────────────────────────────────────────────

async function getUnseen({ mode, level, seenIds }) {
  let q = supabase.from('question_bank').select('*').eq('mode', mode).eq('level', level)
  if (seenIds.length > 0) q = q.not('id', 'in', `(${seenIds.join(',')})`)
  const { data } = await q.limit(100)
  return data || []
}

async function resetSeen({ userId, mode, level }) {
  const { data: all } = await supabase
    .from('question_bank').select('id').eq('mode', mode).eq('level', level)
  const ids = (all || []).map(r => r.id)
  if (ids.length > 0) {
    await supabase.from('seen_questions')
      .delete().eq('user_id', userId).in('question_id', ids)
  }
}

function toExercise(q) {
  return {
    type: q.type,
    question: q.question,
    sentence: q.sentence,
    translation: q.translation,
    options: q.options,
    correct: q.correct,
    explanation: q.explanation,
    word: q.word,
    topic: q.topic,
  }
}

function cors() {
  return {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Headers': 'Content-Type',
    'Content-Type': 'application/json',
  }
}

// ── Generación Groq (5 preguntas por llamada) ─────────────────────────────────

const LEVEL_CONTEXT = {
  1: 'A1 beginner: colors, numbers, greetings, family, food.',
  2: 'A2 elementary: daily routines, clothes, weather, shopping, jobs.',
  3: 'B1 intermediate: travel, health, technology, environment.',
  4: 'B2 upper-intermediate: idioms, academic vocabulary, abstract topics.',
  5: 'C1 advanced: collocations, formal register, nuanced vocabulary.',
}
const VOCAB_TOPICS   = ['food','travel','home','clothes','sports','technology','nature','health','work','emotions','city','family','shopping','education','weather']
const GRAMMAR_TOPICS = ['present simple','present continuous','past simple','past continuous','present perfect','future will','going to','conditionals','modal verbs','passive voice','reported speech','comparatives','phrasal verbs','articles','prepositions']
const WORDS_TOPICS   = ['colors','numbers','animals','body parts','food','clothes','transport','weather','furniture','family','sports','jobs','school','nature','city']

async function generateAndStore({ level, mode }) {
  const context = LEVEL_CONTEXT[level] || LEVEL_CONTEXT[2]
  const pool    = mode === 'grammar' ? GRAMMAR_TOPICS : mode === 'words' ? WORDS_TOPICS : VOCAB_TOPICS
  const topic   = pool[Math.floor(Math.random() * pool.length)]
  const seed    = Math.random().toString(36).slice(2, 7)

  const prompt = mode === 'words'
    ? `Generate exactly ${GENERATE_N} word translation exercises. Topic: ${topic}. Level: ${context}. Seed:${seed}.

OUTPUT: ONLY a raw JSON array. No markdown, no backticks, no text before or after the array.

CRITICAL: Every "question" must be a DIFFERENT English word. No repeated words in the same batch.

Each object must have exactly these keys:
- "type": "multiple_choice"
- "question": one English word (e.g. "cat") — MUST be unique across all ${GENERATE_N} items
- "options": array of exactly 4 Spanish words, all different from each other
- "correct": integer 0-3 (index of correct translation)
- "explanation": one sentence in Spanish
- "word": same as question

Example output:
[{"type":"multiple_choice","question":"cat","options":["perro","gato","pájaro","pez"],"correct":1,"explanation":"'Cat' significa gato en español.","word":"cat"},{"type":"multiple_choice","question":"house","options":["coche","jardín","casa","calle"],"correct":2,"explanation":"'House' significa casa en español.","word":"house"}]

Generate ${GENERATE_N} objects with ${GENERATE_N} completely different English words.`
    : mode === 'vocabulary'
    ? `Generate ${GENERATE_N} English vocabulary exercises for Spanish speakers. Level: ${context}. Topic: ${topic}. Seed:${seed}.

STRICT RULES:
1. The "question" field MUST always be in ENGLISH
2. For multiple_choice: question in English (e.g. "What does 'windy' mean?"), options in SPANISH
3. For fill_blank: question in English with ___, options in English, translation in Spanish
4. ALWAYS exactly 4 options
5. The correct answer must be unambiguously correct
6. Explanations in Spanish
7. correct is 0-indexed integer (0, 1, 2, or 3)

Return ONLY a JSON array, no markdown:
[
  {"type":"multiple_choice","question":"What does 'windy' mean?","options":["lluvioso","nublado","ventoso","soleado"],"correct":2,"explanation":"'Windy' significa ventoso, cuando hay mucho viento.","word":"windy"},
  {"type":"fill_blank","question":"She always ___ an umbrella when it rains.","translation":"Ella siempre ___ un paraguas cuando llueve.","options":["carries","wears","puts","holds"],"correct":0,"explanation":"'Carry an umbrella' es la expresión correcta en inglés.","word":"carry"}
]`
    : `Generate ${GENERATE_N} English grammar exercises for Spanish speakers. Level: ${context}. Topic: ${topic}. Seed:${seed}.

STRICT RULES:
1. ONLY use type "multiple_choice" or "fill_blank" — never "error_correction"
2. For fill_blank:
   - The "question" field MUST contain ___ where the blank is
   - Example CORRECT: "She ___ to school every day."
   - Example WRONG: "She goes to school every day." ← no blank, NEVER do this
   - The blank must have ONE unambiguously correct answer
3. For multiple_choice: ask about a grammar rule, e.g. "Which sentence is correct?"
4. Questions and options in English, translation hint in Spanish
5. ALWAYS exactly 4 options
6. Explanations in Spanish
7. correct is 0-indexed integer (0, 1, 2, or 3)

Return ONLY a JSON array, no markdown:
[
  {"type":"fill_blank","question":"She ___ to school every day.","translation":"Ella ___ a la escuela cada día.","options":["go","goes","going","gone"],"correct":1,"explanation":"Con she/he/it en present simple se añade -s al verbo: 'goes'.","topic":"present simple"},
  {"type":"multiple_choice","question":"Which sentence uses the present perfect correctly?","options":["I have went there","I have gone there","I went there yesterday","I go there yesterday"],"correct":1,"explanation":"'Have gone' es el present perfect de 'go'. Se usa para hablar de experiencias pasadas.","topic":"present perfect"}
]`

  let lastError
  for (let attempt = 0; attempt < 3; attempt++) {
    if (attempt > 0) await new Promise(r => setTimeout(r, 2000 * attempt))

    const res = await fetch('https://api.groq.com/openai/v1/chat/completions', {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${process.env.GROQ_API_KEY}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: 'llama-3.1-8b-instant',
        messages: [
          { role: 'system', content: 'You output ONLY a valid compact JSON array. No markdown, no backticks, no explanations outside JSON.' },
          { role: 'user', content: prompt },
        ],
        temperature: 0.7,
        max_tokens: 1200,
      }),
    })

    if (res.status === 429) {
      lastError = new Error('Groq rate limit')
      continue
    }
    if (!res.ok) throw new Error(`Groq ${res.status}`)

    const data    = await res.json()
    const content = data.choices[0].message.content.trim()
    const match   = content.match(/\[[\s\S]*\]/)
    if (!match) { lastError = new Error('No JSON array'); continue }

    let questions
    try { questions = JSON.parse(match[0]) }
    catch (e) { lastError = new Error('JSON parse error'); continue }

    const batchId = `${mode}-${level}-${seed}`
    const rows = questions
      .filter(q => {
        if (!q.question || !Array.isArray(q.options) || q.options.length < 2) return false
        // Rechazar fill_blank sin hueco
        if (q.type === 'fill_blank' && !q.question.includes('___')) return false
        return true
      })
      .map(q => ({
        mode, level, batch_id: batchId,
        question:    q.question || '',
        sentence:    q.sentence    || null,
        translation: q.translation || null,
        options:     q.options.slice(0, 4),  // máximo 4 siempre
        correct:     Math.min(Number(q.correct) || 0, 3), // máximo índice 3
        explanation: q.explanation || null,
        type:        q.type || 'multiple_choice',
        word:        q.word  || null,
        topic:       q.topic || null,
      }))

    if (rows.length === 0) { lastError = new Error('No valid questions'); continue }

    const { data: inserted, error } = await supabase
      .from('question_bank').insert(rows).select()
    if (error) console.error('Insert error:', error)
    return inserted || rows
  }

  throw lastError || new Error('Failed after retries')
}