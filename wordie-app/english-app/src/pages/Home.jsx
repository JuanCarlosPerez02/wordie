import { useNavigate } from 'react-router-dom'
import { useAuth } from '../hooks/useAuth'
import { useProgress } from '../hooks/useProgress'
import { LEVELS } from '../lib/groq'
import XPBar from '../components/XPBar'
import LevelBadge from '../components/LevelBadge'

const DAILY_GOAL = 20

export default function Home() {
  const { user, signOut } = useAuth()
  const { profile, stats, loading } = useProgress(user?.id)
  const navigate = useNavigate()

  const levelInfo = LEVELS[profile?.level || 1]
  const todayProgress = Math.min((stats?.todayExercises || 0) / DAILY_GOAL * 100, 100)
  const goalDone = (stats?.todayExercises || 0) >= DAILY_GOAL
  const incorrect = (profile?.total_exercises || 0) - (profile?.correct_exercises || 0)

  if (loading) {
    return (
      <div className="min-h-dvh bg-cream-100 flex items-center justify-center">
        <div className="flex gap-1.5">
          {[0,1,2].map(i => (
            <div key={i} className="w-2.5 h-2.5 bg-warm-400 rounded-full animate-bounce"
              style={{ animationDelay: `${i * 0.15}s` }} />
          ))}
        </div>
      </div>
    )
  }

  return (
    <div className="bg-cream-100 min-h-dvh">
      {/* Header — sin caja blanca, todo sobre beige */}
      <div className="px-5 pt-12 pb-6">
        <div className="flex items-start justify-between mb-5">
          <div>
            <p className="text-ink-lighter text-xs font-bold uppercase tracking-widest mb-1">
              Bienvenido
            </p>
            <h1 className="font-display text-3xl font-bold text-ink leading-tight">
              {profile?.username || user?.email?.split('@')[0]}
            </h1>
          </div>
          <button
            onClick={signOut}
            className="w-9 h-9 flex items-center justify-center rounded-2xl
                       bg-cream-200 hover:bg-cream-300 transition-colors mt-1"
          >
            <IconLogout className="w-4 h-4 text-ink-light" />
          </button>
        </div>

        {/* Level badge + XP — sobre beige directo */}
        <div className="flex items-center gap-3 mb-3">
          <LevelBadge level={profile?.level || 1} size="lg" />
          <span className="text-ink-light font-semibold text-sm">{levelInfo.label}</span>
        </div>
        <XPBar xp={profile?.xp || 0} level={profile?.level || 1} />

        {/* Separador suave */}
        <div className="h-px bg-cream-300 mt-6" />
      </div>

      <div className="px-5 space-y-4 pb-8">
        {/* Stats: correctas / errores */}
        <div className="grid grid-cols-2 gap-3">
          <StatCard
            icon={<IconCheck className="w-5 h-5" />}
            label="Correctas"
            value={profile?.correct_exercises || 0}
            bg="bg-emerald-50"
            iconColor="text-emerald-500"
            valueColor="text-emerald-600"
          />
          <StatCard
            icon={<IconX className="w-5 h-5" />}
            label="Errores"
            value={incorrect}
            bg="bg-red-50"
            iconColor="text-red-400"
            valueColor="text-red-500"
          />
        </div>

        {/* Modos */}
        <div>
          <h2 className="font-display font-semibold text-lg text-ink mb-3">¿Qué practicamos?</h2>
          <div className="space-y-3">
            <ModeCard
              icon={<IconVocab />}
              title="Vocabulary"
              desc="Learn and practise new words"
              gradient="from-amber-400/20 to-orange-300/10"
              border="border-amber-200"
              accent="text-amber-700"
              iconBg="bg-amber-100"
              onClick={() => navigate('/study?mode=vocabulary')}
            />
            <ModeCard
              icon={<IconWords />}
              title="Palabras"
              desc="Traduce palabras del inglés"
              gradient="from-emerald-400/20 to-teal-300/10"
              border="border-emerald-200"
              accent="text-emerald-700"
              iconBg="bg-emerald-100"
              onClick={() => navigate('/study?mode=words')}
            />
            <ModeCard
              icon={<IconGrammar />}
              title="Grammar"
              desc="Master the rules of English"
              gradient="from-blue-400/20 to-indigo-300/10"
              border="border-blue-200"
              accent="text-blue-700"
              iconBg="bg-blue-100"
              onClick={() => navigate('/study?mode=grammar')}
            />
          </div>
        </div>
      </div>
    </div>
  )
}

function StatCard({ icon, label, value, bg, iconColor, valueColor }) {
  return (
    <div className={`rounded-2xl p-4 ${bg} text-center`}
      style={{ boxShadow: '0 2px 12px rgba(44,36,22,0.06)' }}>
      <div className={`flex justify-center mb-2 ${iconColor}`}>{icon}</div>
      <div className={`text-2xl font-bold ${valueColor} leading-none`}>{value}</div>
      <div className="text-xs text-ink-lighter font-semibold mt-1">{label}</div>
    </div>
  )
}

function ModeCard({ icon, title, desc, gradient, border, accent, iconBg, onClick }) {
  return (
    <button
      onClick={onClick}
      className={`w-full text-left p-4 rounded-2xl border-2 ${border}
                  bg-gradient-to-r ${gradient} active:scale-95
                  transition-all duration-150 flex items-center gap-4`}
      style={{ boxShadow: '0 2px 12px rgba(44,36,22,0.06)' }}
    >
      <div className={`w-11 h-11 rounded-2xl ${iconBg} flex items-center justify-center flex-shrink-0`}>
        {icon}
      </div>
      <div className="flex-1">
        <div className={`font-bold text-base ${accent}`}>{title}</div>
        <div className="text-sm text-ink-light font-semibold">{desc}</div>
      </div>
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"
        className={`w-4 h-4 ${accent} opacity-50`}>
        <path strokeLinecap="round" strokeLinejoin="round" d="M9 5l7 7-7 7" />
      </svg>
    </button>
  )
}

function IconLogout({ className }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
      <path strokeLinecap="round" strokeLinejoin="round"
        d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" />
    </svg>
  )
}
function IconCheck({ className }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
      <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
    </svg>
  )
}
function IconX({ className }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
      <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
    </svg>
  )
}
function IconWords() {
  return (
    <svg className="w-6 h-6 text-emerald-600" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8">
      <path strokeLinecap="round" strokeLinejoin="round"
        d="M3 5h12M9 3v2m1.048 9.5A18.022 18.022 0 016.412 9m6.088 9h7M11 21l5-10 5 10M12.751 5C11.783 10.77 8.07 15.61 3 18.129" />
    </svg>
  )
}
function IconVocab() {
  return (
    <svg className="w-6 h-6 text-amber-600" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8">
      <path strokeLinecap="round" strokeLinejoin="round"
        d="M7 7h10M7 11h6M7 15h8M5 3h14a2 2 0 012 2v14a2 2 0 01-2 2H5a2 2 0 01-2-2V5a2 2 0 012-2z" />
    </svg>
  )
}
function IconGrammar() {
  return (
    <svg className="w-6 h-6 text-blue-600" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8">
      <path strokeLinecap="round" strokeLinejoin="round"
        d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
    </svg>
  )
}