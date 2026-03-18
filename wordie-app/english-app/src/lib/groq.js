// Llama al proxy de Netlify para servir ejercicios del banco
// Evita repeticiones por usuario y repone el banco automáticamente

const IS_DEV = import.meta.env.DEV
const BASE = IS_DEV ? 'http://localhost:8888/.netlify/functions' : '/.netlify/functions'

export async function generateExercises({ level, mode, userId }) {
  const response = await fetch(`${BASE}/get-exercises`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ level, mode, userId }),
  })

  if (!response.ok) {
    const err = await response.json().catch(() => ({}))
    throw new Error(err.error || `Error ${response.status} obteniendo ejercicios`)
  }

  const data = await response.json()
  return data.exercises
}

// Niveles de la app
export const LEVELS = {
  1: { name: 'A1', label: 'Principiante', color: '#90B898', emoji: '🌱' },
  2: { name: 'A2', label: 'Elemental',    color: '#7BAED4', emoji: '🌿' },
  3: { name: 'B1', label: 'Intermedio',   color: '#C8956A', emoji: '🌳' },
  4: { name: 'B2', label: 'Avanzado',     color: '#9B7FD4', emoji: '🦅' },
  5: { name: 'C1', label: 'Experto',      color: '#D4956A', emoji: '👑' },
}

// XP necesario para subir de nivel
export const XP_THRESHOLDS = [0, 100, 300, 600, 1000, Infinity]

export function getLevelFromXP(xp) {
  for (let i = XP_THRESHOLDS.length - 2; i >= 0; i--) {
    if (xp >= XP_THRESHOLDS[i]) return i + 1
  }
  return 1
}

export function getXPProgress(xp, level) {
  const current = XP_THRESHOLDS[level - 1]
  const next    = XP_THRESHOLDS[level]
  if (next === Infinity) return 100
  return Math.round(((xp - current) / (next - current)) * 100)
}