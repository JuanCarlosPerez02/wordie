// netlify/functions/generate-reading.js
// Genera un texto de lectura en inglés con Groq y lo devuelve estructurado

export const handler = async (event) => {
  if (event.httpMethod === 'OPTIONS') {
    return { statusCode: 200, headers: corsHeaders(), body: '' }
  }
  if (event.httpMethod !== 'POST') {
    return { statusCode: 405, body: 'Method Not Allowed' }
  }

  try {
    const { level } = JSON.parse(event.body || '{}')
    const reading = await generateReading(level || 2)
    return {
      statusCode: 200,
      headers: corsHeaders(),
      body: JSON.stringify(reading),
    }
  } catch (error) {
    console.error('Error generating reading:', error)
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

const LEVEL_CONTEXT = {
  1: 'A1 beginner — very simple sentences, basic vocabulary, present tense only. Max 80 words.',
  2: 'A2 elementary — simple past and present, everyday topics like routines or travel. Max 120 words.',
  3: 'B1 intermediate — varied tenses, slightly complex sentences, topics like culture or nature. Max 160 words.',
  4: 'B2 upper-intermediate — rich vocabulary, nuanced sentences, topics like society or science. Max 200 words.',
  5: 'C1 advanced — sophisticated language, idiomatic expressions, complex topics. Max 250 words.',
}

const TOPICS = [
  'a short story about a person discovering something unexpected',
  'a description of a fascinating place in the world',
  'a brief article about an interesting animal',
  'a short narrative about a memorable journey',
  'a description of a typical day in an unusual job',
  'a short article about a surprising fact about food',
  'a brief story about friendship',
  'a description of a local festival or tradition',
]

async function generateReading(level) {
  const context = LEVEL_CONTEXT[level] || LEVEL_CONTEXT[2]
  const topic = TOPICS[Math.floor(Math.random() * TOPICS.length)]

  const prompt = `Write a reading text in English for language learners at level ${context}

Topic: ${topic}

Requirements:
- Natural, engaging English appropriate for the level
- Include a short title
- The text should be interesting and educational
- Use vocabulary appropriate for the level

Return ONLY a JSON object with this exact format, no markdown, no backticks:
{
  "title": "The title here",
  "text": "The full reading text here as a single string with normal punctuation.",
  "level": ${level},
  "topic": "${topic}"
}`

  const response = await fetch('https://api.groq.com/openai/v1/chat/completions', {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${process.env.GROQ_API_KEY}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      model: 'llama-3.3-70b-versatile',
      messages: [
        {
          role: 'system',
          content: 'You are an English language teacher. You write reading texts for language learners. Return ONLY valid JSON, no markdown.',
        },
        { role: 'user', content: prompt },
      ],
      temperature: 0.9,
      max_tokens: 800,
    }),
  })

  if (!response.ok) {
    throw new Error(`Groq API ${response.status}`)
  }

  const data = await response.json()
  const content = data.choices[0].message.content.trim()

  const jsonMatch = content.match(/\{[\s\S]*\}/)
  if (!jsonMatch) throw new Error('No JSON found in response')

  return JSON.parse(jsonMatch[0])
}
