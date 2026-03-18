// netlify/functions/translate-word.js
// Traduce una palabra/frase en contexto del texto de lectura

export const handler = async (event) => {
  if (event.httpMethod === 'OPTIONS') {
    return { statusCode: 200, headers: corsHeaders(), body: '' }
  }
  if (event.httpMethod !== 'POST') {
    return { statusCode: 405, body: 'Method Not Allowed' }
  }

  try {
    const { word, sentence } = JSON.parse(event.body || '{}')
    if (!word) return { statusCode: 400, headers: corsHeaders(), body: JSON.stringify({ error: 'Missing word' }) }

    const translation = await translateWord(word, sentence)
    return {
      statusCode: 200,
      headers: corsHeaders(),
      body: JSON.stringify(translation),
    }
  } catch (error) {
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

async function translateWord(word, sentence) {
  const prompt = `Translate the English word "${word}" to Spanish.
${sentence ? `Context sentence: "${sentence}"` : ''}

Return ONLY a JSON object, no markdown:
{
  "word": "${word}",
  "translation": "traducción principal en español",
  "type": "sustantivo/verbo/adjetivo/adverbio/etc",
  "example": "a short example sentence in English using this word"
}`

  const response = await fetch('https://api.groq.com/openai/v1/chat/completions', {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${process.env.GROQ_API_KEY}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      model: 'llama-3.1-8b-instant', // modelo rápido para traducciones
      messages: [
        {
          role: 'system',
          content: 'You are a translator. Return ONLY valid JSON, no markdown, no extra text.',
        },
        { role: 'user', content: prompt },
      ],
      temperature: 0.1,
      max_tokens: 200,
    }),
  })

  if (!response.ok) throw new Error(`Groq API ${response.status}`)

  const data = await response.json()
  const content = data.choices[0].message.content.trim()
  const jsonMatch = content.match(/\{[\s\S]*\}/)
  if (!jsonMatch) throw new Error('No JSON in response')
  return JSON.parse(jsonMatch[0])
}
