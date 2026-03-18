// netlify/functions/generate-exercise.js
// Genera ejercicios de inglés con Groq (Llama 3.1) — preguntas siempre en inglés

export const handler = async (event) => {
  if (event.httpMethod === 'OPTIONS') {
    return { statusCode: 200, headers: corsHeaders(), body: '' }
  }
  if (event.httpMethod !== 'POST') {
    return { statusCode: 405, body: 'Method Not Allowed' }
  }

  try {
    const { level, mode, count = 10 } = JSON.parse(event.body)
    const exercises = await generateWithGroq({ level, mode, count })
    return {
      statusCode: 200,
      headers: corsHeaders(),
      body: JSON.stringify({ exercises }),
    }
  } catch (error) {
    console.error('Error:', error)
    return {
      statusCode: 500,
      headers: corsHeaders(),
      body: JSON.stringify({ error: error.message }),
    }
  }
}

function corsHeaders() {
  return {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Headers': 'Content-Type',
    'Content-Type': 'application/json',
  }
}

// ─── Groq generation ──────────────────────────────────────────────────────────

const LEVEL_CONTEXT = {
  1: 'A1 beginner. Topics: colors, numbers, greetings, family, food, animals. Grammar: verb to be, articles, simple plurals, basic prepositions.',
  2: 'A2 elementary. Topics: daily routines, clothes, weather, shopping, jobs. Grammar: present simple, present continuous, can/can\'t, there is/are, possessives.',
  3: 'B1 intermediate. Topics: travel, health, media, environment, technology. Grammar: past simple, past continuous, present perfect (basic), future will/going to, comparatives.',
  4: 'B2 upper-intermediate. Topics: abstract concepts, academic vocabulary, idioms. Grammar: present perfect continuous, conditionals (1st/2nd/3rd), passive voice, reported speech.',
  5: 'C1 advanced. Topics: nuanced vocabulary, collocations, formal/informal register. Grammar: modal perfects, inversion, cleft sentences, subjunctive mood.',
}

async function generateWithGroq({ level, mode, count }) {
  const context = LEVEL_CONTEXT[level] || LEVEL_CONTEXT[1]

  // Seed aleatoria para forzar variedad en cada llamada
  const seed = Math.random().toString(36).slice(2, 8)
  const topicPool = {
    vocabulary: ['food & cooking', 'travel & transport', 'home & furniture', 'clothes & fashion', 'sports & hobbies', 'technology & gadgets', 'nature & animals', 'health & body', 'work & jobs', 'emotions & personality', 'city & places', 'time & schedules'],
    grammar: ['present simple', 'present continuous', 'past simple', 'past continuous', 'present perfect', 'future will', 'going to', 'conditionals', 'modal verbs', 'passive voice', 'reported speech', 'comparatives & superlatives'],
  }
  const pool = topicPool[mode] || topicPool.vocabulary
  // Elegir 3 temas aleatorios distintos para esta tanda
  const shuffled = pool.sort(() => Math.random() - 0.5).slice(0, 3)
  const topicHint = shuffled.join(', ')

  const vocabPrompt = `You are an expert English language teacher creating vocabulary exercises for Spanish speakers at level ${context}

Generate exactly ${count} vocabulary exercises focused on these topics: ${topicHint}. Session ID: ${seed} — make sure ALL exercises are different from previous sessions.
ALL questions and options MUST be in ENGLISH. The "translation" field provides the Spanish equivalent as a hint.

Return ONLY a valid JSON array with no extra text, no markdown, no backticks.

Use these two types:
- "multiple_choice": ask the meaning or usage of an English word
- "fill_blank": complete an English sentence with the right word

Example format:
[
  {
    "type": "multiple_choice",
    "question": "What does 'exhausted' mean?",
    "options": ["very hungry", "very tired", "very happy", "very cold"],
    "correct": 1,
    "explanation": "'Exhausted' significa extremadamente cansado. Ejemplo: 'After the marathon, she was exhausted.'",
    "word": "exhausted"
  },
  {
    "type": "fill_blank",
    "sentence": "She always ___ her homework before dinner.",
    "translation": "Ella siempre ___ sus deberes antes de cenar.",
    "options": ["make", "do", "does", "making"],
    "correct": 2,
    "explanation": "Usamos 'do' con homework. En tercera persona del singular (she) se usa 'does'.",
    "word": "do"
  }
]

Rules:
- All questions, sentences and options in ENGLISH
- The "translation" field is in Spanish (optional hint)
- Wrong options must be plausible but clearly wrong
- "correct" is 0-indexed
- Explanations in SPANISH (the student is a Spanish speaker)
- Vary question types evenly`

  const grammarPrompt = `You are an expert English grammar teacher creating exercises for Spanish speakers at level ${context}

Generate exactly ${count} grammar exercises focused on these areas: ${topicHint}. Session ID: ${seed} — make sure ALL exercises are different from previous sessions.
ALL content MUST be in ENGLISH. The "translation" provides Spanish context only as a hint.

Return ONLY a valid JSON array with no extra text, no markdown, no backticks.

Use these types:
- "multiple_choice": choose the correct grammatical form
- "fill_blank": fill in the blank with the correct form
- "error_correction": identify the sentence with the correct grammar

Example format:
[
  {
    "type": "multiple_choice",
    "question": "She ___ to the gym every Monday.",
    "translation": "Ella ___ al gimnasio cada lunes.",
    "options": ["go", "goes", "going", "is go"],
    "correct": 1,
    "explanation": "Con la tercera persona del singular (she/he/it) en present simple, se añade -s/-es al verbo: 'goes'.",
    "topic": "Present Simple – third person"
  },
  {
    "type": "error_correction",
    "question": "Which sentence is correct?",
    "options": [
      "Yesterday I goed to the market.",
      "Yesterday I went to the market.",
      "Yesterday I have gone to the market.",
      "Yesterday I goes to the market."
    ],
    "correct": 1,
    "explanation": "'Go' es irregular en past simple. La forma correcta es 'went', no 'goed'.",
    "topic": "Past Simple – irregular verbs"
  }
]

Rules:
- All questions and options in ENGLISH
- The "translation" field is optional, in Spanish when helpful
- Grammar topic must be appropriate for ${context}
- Distractors should target common Spanish-speaker errors
- Explanations in SPANISH (the student is a Spanish speaker)
- Vary exercise types`

  const prompt = mode === 'grammar' ? grammarPrompt : vocabPrompt

  const response = await fetch('https://api.groq.com/openai/v1/chat/completions', {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${process.env.GROQ_API_KEY}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      model: 'llama-3.3-70b-versatile',   // modelo más potente para mejor calidad
      messages: [
        {
          role: 'system',
          content: 'You are an English language exercise generator. You output ONLY valid JSON arrays. Never add markdown, backticks, or explanatory text outside the JSON.',
        },
        { role: 'user', content: prompt },
      ],
      temperature: 0.7,
      max_tokens: 3000,
    }),
  })

  if (!response.ok) {
    const errText = await response.text()
    throw new Error(`Groq API ${response.status}: ${errText}`)
  }

  const data = await response.json()
  const content = data.choices[0].message.content.trim()

  // Extraer el JSON aunque venga envuelto en markdown
  const jsonMatch = content.match(/\[[\s\S]*\]/)
  if (!jsonMatch) throw new Error('No JSON array found in Groq response')

  const exercises = JSON.parse(jsonMatch[0])

  if (!Array.isArray(exercises) || exercises.length === 0) {
    throw new Error('Empty exercise array returned')
  }

  return exercises
}