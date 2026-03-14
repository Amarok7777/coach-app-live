import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useAuth } from '../hooks/useAuth'

export default function Login() {
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [mode, setMode] = useState('login')
  const [error, setError] = useState(null)
  const [loading, setLoading] = useState(false)
  const { signIn, signUp } = useAuth()
  const navigate = useNavigate()

  const handleSubmit = async (e) => {
    e.preventDefault()
    setError(null)
    setLoading(true)
    const fn = mode === 'login' ? signIn : signUp
    const { error } = await fn(email, password)
    setLoading(false)
    if (error) setError(error.message)
    else navigate('/')
  }

  return (
    <div className="min-h-screen bg-md-surface flex items-center justify-center p-4">
      <div className="w-full max-w-sm">
        {/* Header */}
        <div className="text-center mb-8">
          <div className="w-16 h-16 rounded-2xl bg-md-primary flex items-center justify-center mx-auto mb-4 shadow-el2">
            <span className="material-symbols-outlined text-white icon-filled" style={{fontSize:'32px'}}>sports_soccer</span>
          </div>
          <h1 className="text-2xl font-medium text-md-on-surface">Coach App</h1>
          <p className="text-sm text-md-on-surface-variant mt-1">Trainer-Management Platform</p>
        </div>

        {/* Card */}
        <div className="card-elevated bg-white p-8">
          <h2 className="text-lg font-medium text-md-on-surface mb-6">
            {mode === 'login' ? 'Anmelden' : 'Registrieren'}
          </h2>

          <form onSubmit={handleSubmit} className="space-y-5">
            <div className="relative">
              <input
                type="email"
                id="email"
                className="md-input pr-10"
                placeholder=" "
                value={email}
                onChange={e => setEmail(e.target.value)}
                required
              />
              <label htmlFor="email" className="md-input-label">E-Mail-Adresse</label>
              <span className="material-symbols-outlined icon-sm absolute right-3 top-3.5 text-md-on-surface-variant">mail</span>
            </div>

            <div className="relative">
              <input
                type="password"
                id="password"
                className="md-input pr-10"
                placeholder=" "
                value={password}
                onChange={e => setPassword(e.target.value)}
                required
              />
              <label htmlFor="password" className="md-input-label">Passwort</label>
              <span className="material-symbols-outlined icon-sm absolute right-3 top-3.5 text-md-on-surface-variant">lock</span>
            </div>

            {error && (
              <div className="flex items-start gap-2 bg-md-error-container text-md-error rounded-lg px-4 py-3">
                <span className="material-symbols-outlined icon-sm mt-0.5">error</span>
                <p className="text-sm">{error}</p>
              </div>
            )}

            <button type="submit" className="btn-filled w-full justify-center" disabled={loading}>
              {loading
                ? <><span className="material-symbols-outlined icon-sm animate-spin">progress_activity</span> Lädt...</>
                : mode === 'login' ? 'Anmelden' : 'Konto erstellen'
              }
            </button>
          </form>

          <div className="divider my-6" />

          <p className="text-sm text-center text-md-on-surface-variant">
            {mode === 'login' ? 'Noch kein Konto?' : 'Bereits registriert?'}
            {' '}
            <button
              onClick={() => setMode(mode === 'login' ? 'signup' : 'login')}
              className="text-md-primary font-medium hover:underline"
            >
              {mode === 'login' ? 'Registrieren' : 'Anmelden'}
            </button>
          </p>
        </div>
      </div>
    </div>
  )
}
