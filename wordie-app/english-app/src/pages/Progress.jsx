import { useNavigate } from 'react-router-dom'
import { useAuth } from '../hooks/useAuth'
import { useProgress } from '../hooks/useProgress'
import { LEVELS, XP_THRESHOLDS } from '../lib/groq'
import LevelBadge from '../components/LevelBadge'

export default function Progress() {
  const { user } = useAuth()
  const { profile, stats, loading } = useProgress(user?.id)
  const navigate = useNavigate()

  if (loading) {
    return (
      <div className="min-h-dvh flex items-center justify-center bg-cream-100">
        <div className="text-4xl animate-bounce">📊</div>
      </div>
    )
  }

  const currentLevel = profile?.level || 1
  const allLevels = Object.entries(LEVELS)

  return (
    <div className="bg-cream-100 min-h-dvh">
      {/* Header */}
      <div className="bg-white px-5 pt-12 pb-6 shadow-soft">
        <h1 className="font-display text-2xl font-bold text-ink mb-1">Mi progreso</h1>
        <p className="text-ink-light font-semibold text-sm">
          {profile?.total_exercises || 0} ejercicios completados en total
        </p>
      </div>

      <div className="px-5 py-5 space-y-5">
        {/* Estadísticas principales */}
        <div className="grid grid-cols-2 gap-3">
          <BigStat
            emoji="🎯"
            label="Precisión global"
            value={`${stats?.accuracy || 0}%`}
            sub={`${profile?.correct_exercises || 0} correctas`}
            color="text-warm-500"
            bg="bg-amber-50"
          />
          <BigStat
            emoji="🔥"
            label="Racha actual"
            value={`${profile?.streak || 0} días`}
            sub="consecutivos"
            color="text-orange-500"
            bg="bg-orange-50"
          />
        </div>

        {/* Mapa de niveles */}
        <div className="card">
          <h2 className="font-display font-semibold text-lg text-ink mb-4">Camino de niveles</h2>
          <div className="space-y-3">
            {allLevels.map(([lvl, info]) => {
              const lvlNum = Number(lvl)
              const isUnlocked = lvlNum <= currentLevel
              const isCurrent  = lvlNum === currentLevel
              const xpNeeded   = XP_THRESHOLDS[lvlNum - 1]
              const xpHave     = profile?.xp || 0
              const levelProgress = isCurrent
                ? Math.min(((xpHave - XP_THRESHOLDS[lvlNum - 1]) /
                    (XP_THRESHOLDS[lvlNum] - XP_THRESHOLDS[lvlNum - 1])) * 100, 100)
                : isUnlocked ? 100 : 0

              return (
                <div key={lvl}
                  className={`rounded-2xl p-4 border-2 transition-all
                    ${isCurrent
                      ? 'border-warm-400 bg-amber-50'
                      : isUnlocked
                      ? 'border-cream-200 bg-white'
                      : 'border-cream-200 bg-cream-50 opacity-60'
                    }`}
                >
                  <div className="flex items-center gap-3 mb-2">
                    <span className="text-2xl">{info.emoji}</span>
                    <div className="flex-1">
                      <div className="flex items-center gap-2">
                        <span className="font-bold text-ink">{info.name}</span>
                        <span className="text-sm text-ink-light">· {info.label}</span>
                        {isCurrent && (
                          <span className="text-xs bg-warm-500 text-white px-2 py-0.5 rounded-full font-bold">
                            Actual
                          </span>
                        )}
                        {isUnlocked && !isCurrent && (
                          <span className="text-xs text-sage-500 font-bold">✓ Completado</span>
                        )}
                      </div>
                      {lvlNum < 5 && (
                        <span className="text-xs text-ink-lighter font-semibold">
                          {XP_THRESHOLDS[lvlNum - 1]} XP necesarios
                        </span>
                      )}
                    </div>
                  </div>
                  {isCurrent && (
                    <div className="w-full bg-cream-200 rounded-full h-1.5">
                      <div
                        className="h-full bg-warm-500 rounded-full transition-all duration-700"
                        style={{ width: `${levelProgress}%` }}
                      />
                    </div>
                  )}
                </div>
              )
            })}
          </div>
        </div>

        {/* Actividad de la semana */}
        {stats?.weeklyData && (
          <div className="card">
            <h2 className="font-display font-semibold text-lg text-ink mb-4">Actividad semanal</h2>
            <div className="space-y-2">
              {stats.weeklyData.map((day) => {
                const isToday = day.date === new Date().toISOString().split('T')[0]
                return (
                  <div key={day.date} className="flex items-center gap-3">
                    <span className={`text-xs font-bold w-8 ${isToday ? 'text-warm-500' : 'text-ink-lighter'}`}>
                      {day.label}
                    </span>
                    <div className="flex-1 bg-cream-200 rounded-full h-2.5 overflow-hidden">
                      {day.total > 0 && (
                        <div
                          className={`h-full rounded-full transition-all duration-700
                            ${day.accuracy >= 70 ? 'bg-sage-500' : 'bg-warm-400'}`}
                          style={{ width: `${Math.min(day.total / 20 * 100, 100)}%` }}
                        />
                      )}
                    </div>
                    <span className="text-xs font-bold text-ink-light w-12 text-right">
                      {day.total > 0 ? `${day.total} ej.` : '—'}
                    </span>
                  </div>
                )
              })}
            </div>
            <p className="text-xs text-ink-lighter mt-3 font-semibold">
              🟢 ≥70% precisión &nbsp;·&nbsp; 🟠 &lt;70% precisión
            </p>
          </div>
        )}

        {/* CTA estudiar */}
        <button
          onClick={() => navigate('/study')}
          className="btn-primary"
        >
          Seguir estudiando →
        </button>
      </div>
    </div>
  )
}

function BigStat({ emoji, label, value, sub, color, bg }) {
  return (
    <div className={`card ${bg} text-center py-5`}>
      <div className="text-3xl mb-2">{emoji}</div>
      <div className={`text-2xl font-bold ${color} leading-none`}>{value}</div>
      <div className="text-xs text-ink-light font-bold mt-1">{label}</div>
      <div className="text-xs text-ink-lighter font-semibold mt-0.5">{sub}</div>
    </div>
  )
}
