import { useState, useEffect, useCallback } from 'react'
import { supabase } from '../lib/supabase'
import { getLevelFromXP } from '../lib/groq'

const XP_CORRECT = 10
const XP_BONUS_STREAK = 2

export function useProgress(userId) {
  const [profile, setProfile] = useState(null)
  const [loading, setLoading] = useState(true)
  const [recentHistory, setRecentHistory] = useState([])

  // Cargar perfil del usuario
  const fetchProfile = useCallback(async () => {
    if (!userId) return
    setLoading(true)
    const { data, error } = await supabase
      .from('profiles')
      .select('*')
      .eq('id', userId)
      .single()

    if (!error && data) {
      setProfile(data)
    }
    setLoading(false)
  }, [userId])

  // Historial reciente para mostrar estadísticas
  const fetchHistory = useCallback(async () => {
    if (!userId) return
    const { data } = await supabase
      .from('exercise_history')
      .select('*')
      .eq('user_id', userId)
      .order('created_at', { ascending: false })
      .limit(50)
    if (data) setRecentHistory(data)
  }, [userId])

  useEffect(() => {
    fetchProfile()
    fetchHistory()
  }, [fetchProfile, fetchHistory])

  // Registrar resultado de un ejercicio y actualizar perfil
  const recordExercise = useCallback(async ({ mode, correct, wordOrTopic, exerciseType, translation }) => {
    if (!userId || !profile) return null

    // Guardar en historial
    await supabase.from('exercise_history').insert({
      user_id: userId,
      mode,
      level: profile.level,
      correct,
      word_or_topic: wordOrTopic,
      exercise_type: exerciseType,
    })

    // Calcular XP ganado
    let xpGained = correct ? XP_CORRECT : 0
    if (correct && profile.streak > 2) xpGained += XP_BONUS_STREAK

    // Actualizar racha
    const today = new Date().toISOString().split('T')[0]
    const lastDate = profile.last_study_date
    let newStreak = profile.streak

    if (lastDate !== today) {
      const yesterday = new Date()
      yesterday.setDate(yesterday.getDate() - 1)
      const yesterdayStr = yesterday.toISOString().split('T')[0]
      newStreak = lastDate === yesterdayStr ? profile.streak + 1 : 1
    }

    // Calcular nuevo XP y nivel
    const newXP = profile.xp + xpGained
    const newLevel = Math.min(getLevelFromXP(newXP), 5)
    const leveledUp = newLevel > profile.level

    // Actualizar perfil en Supabase
    const updates = {
      xp: newXP,
      level: newLevel,
      streak: newStreak,
      last_study_date: today,
      total_exercises: profile.total_exercises + 1,
      correct_exercises: profile.correct_exercises + (correct ? 1 : 0),
    }

    const { data: updatedProfile } = await supabase
      .from('profiles')
      .update(updates)
      .eq('id', userId)
      .select()
      .single()

    if (updatedProfile) setProfile(updatedProfile)

    // Actualizar maestría de vocabulario con traducción si existe
    if (mode === 'vocabulary' && wordOrTopic) {
      try {
        await supabase.rpc('upsert_vocabulary_mastery', {
          p_user_id:     userId,
          p_word:        wordOrTopic,
          p_correct:     correct,
          p_translation: translation || null,
          p_level:       profile.level,
        })
      } catch (e) {
        // RPC opcional, no crítico
      }
    }

    await fetchHistory()

    return { xpGained, leveledUp, newLevel, newStreak }
  }, [userId, profile, fetchHistory])

  // Estadísticas derivadas
  const stats = profile ? {
    accuracy: profile.total_exercises > 0
      ? Math.round((profile.correct_exercises / profile.total_exercises) * 100)
      : 0,
    todayExercises: recentHistory.filter(h => {
      const today = new Date().toISOString().split('T')[0]
      return h.created_at?.startsWith(today)
    }).length,
    weeklyData: getWeeklyData(recentHistory),
  } : null

  return { profile, loading, stats, recordExercise, refetch: fetchProfile }
}

function getWeeklyData(history) {
  const days = []
  for (let i = 6; i >= 0; i--) {
    const d = new Date()
    d.setDate(d.getDate() - i)
    const dateStr = d.toISOString().split('T')[0]
    const dayHistory = history.filter(h => h.created_at?.startsWith(dateStr))
    const correct = dayHistory.filter(h => h.correct).length
    days.push({
      date: dateStr,
      label: d.toLocaleDateString('es', { weekday: 'short' }),
      total: dayHistory.length,
      correct,
      accuracy: dayHistory.length > 0 ? Math.round((correct / dayHistory.length) * 100) : 0,
    })
  }
  return days
}