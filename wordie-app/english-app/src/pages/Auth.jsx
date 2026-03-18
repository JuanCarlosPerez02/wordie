import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useAuth } from '../hooks/useAuth'

export default function Auth() {
  const [mode, setMode] = useState('login') // 'login' | 'register'
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState(null)
  const [success, setSuccess] = useState(null)

  const { signIn, signUp } = useAuth()
  const navigate = useNavigate()

  const handleSubmit = async (e) => {
    e.preventDefault()
    setError(null)
    setSuccess(null)
    setLoading(true)

    try {
      if (mode === 'login') {
        await signIn(email, password)
        navigate('/')
      } else {
        await signUp(email, password)
        setSuccess('¡Cuenta creada! Revisa tu email para confirmar tu cuenta.')
      }
    } catch (err) {
      const messages = {
        'Invalid login credentials': 'Email o contraseña incorrectos',
        'Email not confirmed': 'Confirma tu email antes de entrar',
        'User already registered': 'Este email ya está registrado',
        'Password should be at least 6 characters': 'La contraseña debe tener al menos 6 caracteres',
      }
      setError(messages[err.message] || err.message)
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="min-h-dvh bg-cream-100 flex flex-col items-center justify-center p-6">
      {/* Logo / Header */}
      <div className="text-center mb-10 animate-slide-up">
        <div className="text-6xl mb-4">📖</div>
        <h1 className="font-display text-4xl font-bold text-ink mb-2">Wordie</h1>
        <p className="text-ink-light font-body">Aprende inglés de forma inteligente</p>
      </div>

      {/* Card */}
      <div className="w-full max-w-sm animate-slide-up" style={{ animationDelay: '0.1s' }}>
        <div className="card">
          {/* Toggle */}
          <div className="flex bg-cream-100 rounded-2xl p-1 mb-6">
            {['login', 'register'].map((m) => (
              <button
                key={m}
                onClick={() => { setMode(m); setError(null); setSuccess(null) }}
                className={`flex-1 py-2.5 rounded-xl text-sm font-bold transition-all duration-200
                  ${mode === m
                    ? 'bg-white text-ink shadow-soft'
                    : 'text-ink-light hover:text-ink'
                  }`}
              >
                {m === 'login' ? 'Entrar' : 'Registrarse'}
              </button>
            ))}
          </div>

          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="block text-sm font-bold text-ink-light mb-1.5">
                Email
              </label>
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="tu@email.com"
                required
                className="w-full px-4 py-3.5 bg-cream-100 rounded-2xl border-2 border-transparent
                           focus:border-warm-400 focus:bg-white outline-none transition-all
                           font-body text-ink placeholder-ink-lighter text-base"
              />
            </div>

            <div>
              <label className="block text-sm font-bold text-ink-light mb-1.5">
                Contraseña
              </label>
              <input
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="••••••••"
                required
                minLength={6}
                className="w-full px-4 py-3.5 bg-cream-100 rounded-2xl border-2 border-transparent
                           focus:border-warm-400 focus:bg-white outline-none transition-all
                           font-body text-ink placeholder-ink-lighter text-base"
              />
            </div>

            {error && (
              <div className="bg-red-50 border border-red-200 rounded-xl p-3 text-sm text-red-600 font-semibold animate-fade-in">
                ⚠️ {error}
              </div>
            )}

            {success && (
              <div className="bg-sage-400/20 border border-sage-500/30 rounded-xl p-3 text-sm text-sage-500 font-semibold animate-fade-in">
                ✅ {success}
              </div>
            )}

            <button
              type="submit"
              disabled={loading}
              className="btn-primary mt-2"
            >
              {loading ? (
                <span className="flex items-center justify-center gap-2">
                  <svg className="animate-spin h-5 w-5" viewBox="0 0 24 24" fill="none">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"/>
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z"/>
                  </svg>
                  Cargando...
                </span>
              ) : (
                mode === 'login' ? 'Entrar →' : 'Crear cuenta →'
              )}
            </button>
          </form>
        </div>

        <p className="text-center text-xs text-ink-lighter mt-6 font-semibold">
          Tu progreso se guarda automáticamente ✨
        </p>
      </div>
    </div>
  )
}
